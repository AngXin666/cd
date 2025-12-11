# RLS 完全禁用迁移 - 共识文档

## 明确的需求描述

**任务目标**：完全禁用数据库中所有表的行级安全（RLS）策略，将权限控制完全迁移到应用层实现。

**背景**：
- 项目已实现完整的应用层权限控制系统（PermissionService + permissionMiddleware）
- 但迁移文件 `00627_disable_rls_for_non_critical_tables.sql` 保留了 8 个核心表的 RLS
- 违反了项目规范"禁用所有数据库 RLS 策略"

**核心要求**：
1. 禁用所有表的 RLS（无例外）
2. 删除所有 RLS 策略
3. 验证应用层权限控制完整性
4. 确保数据安全不受影响

## 验收标准

### 功能验收
1. ✅ 数据库层面
   - 所有表的 `rowsecurity` = `false`
   - `pg_policies` 表中无 public schema 策略
   - 可以使用 service_role key 直接访问所有表

2. ✅ 安全验收
   - 匿名访问被阻止（Invalid API key）
   - 登录用户只能访问其权限范围内的数据
   - 应用层中间件正常拦截

3. ✅ 性能验收
   - 查询速度无明显下降
   - 无 RLS 策略检查开销

### 测试验证标准
1. 核心表访问测试（users, notifications, attendance, piece_work_records）
2. 匿名访问拒绝测试
3. 不同角色权限隔离测试（BOSS/MANAGER/DRIVER）

## 技术实现方案

### 技术栈
- PostgreSQL DDL（ALTER TABLE, DROP POLICY）
- Supabase Dashboard SQL Editor
- Supabase JS SDK（验证）

### 技术约束
1. **无法通过 API 自动执行 DDL**
   - Supabase PostgREST 不支持
   - 需要在 Dashboard 手动执行

2. **应用层权限控制依赖**
   - 必须保证 permissionMiddleware 正常工作
   - JWT Token 验证必须有效

### 集成方案

#### 执行流程
```mermaid
graph LR
    A[创建迁移SQL] --> B[Dashboard执行]
    B --> C[验证RLS状态]
    C --> D[测试应用层权限]
    D --> E[清理临时文件]
    E --> F[创建6A文档]
```

#### 数据流
```
用户请求 → JWT验证 → permissionMiddleware → 角色过滤 → 数据库查询
                                    ↓
                            无RLS策略检查（提升性能）
```

### 关键代码实现

#### 1. RLS 禁用脚本
```sql
-- 禁用所有表的 RLS
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
  LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || 
            ' DISABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;

-- 删除所有 RLS 策略
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY ' || quote_ident(r.policyname) || 
            ' ON ' || quote_ident(r.tablename);
  END LOOP;
END $$;
```

#### 2. 验证脚本
```javascript
const { createClient } = require('@supabase/supabase-js');

// 验证 RLS 禁用
const tables = ['users', 'notifications', 'attendance', 'piece_work_records'];
for (const table of tables) {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  console.log(`${table}: ${count} 条记录`);
}
```

## 任务边界限制

### 包含范围
- ✅ 禁用所有表的 RLS
- ✅ 删除所有 RLS 策略
- ✅ 验证应用层权限
- ✅ 创建文档

### 不包含范围
- ❌ 修改应用层代码
- ❌ 调整权限配置
- ❌ 创建新的安全策略
- ❌ 数据迁移

### 风险控制
- 应用层权限控制已完整实现（风险低）
- 可随时通过迁移脚本回滚（可逆）
- 不影响现有业务逻辑（无破坏性）

## 确认所有不确定性已解决

### 技术不确定性
- ✅ 执行方式：Supabase Dashboard SQL Editor
- ✅ 验证方式：Supabase JS SDK 查询
- ✅ 安全保障：应用层权限控制

### 业务不确定性
- ✅ 数据安全：应用层中间件拦截
- ✅ 性能影响：消除 RLS 检查开销
- ✅ 回滚方案：保留迁移脚本可重新启用

### 规范遵循
- ✅ 符合项目规范"禁用所有 RLS"
- ✅ 符合 6A 工作流要求
- ✅ 符合 AI 自主执行要求（提供完整脚本）
