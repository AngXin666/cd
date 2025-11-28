# 跨 Schema 安全访问指南

## 概述

本文档介绍如何在共享库+独立Schema模式下安全地访问多租户数据。

## 架构说明

### 数据隔离模型

```
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Database                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ public       │  │ tenant_xxx   │  │ tenant_yyy   │      │
│  │ Schema       │  │ Schema       │  │ Schema       │      │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤      │
│  │ profiles     │  │ profiles     │  │ profiles     │      │
│  │ leases       │  │ warehouses   │  │ warehouses   │      │
│  │ ...          │  │ vehicles     │  │ vehicles     │      │
│  │              │  │ ...          │  │ ...          │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  中央管理系统      租户A的数据       租户B的数据              │
│  (超级管理员)      (完全隔离)        (完全隔离)              │
└─────────────────────────────────────────────────────────────┘
```

### 安全代理函数

为了避免直接使用 `auth.uid()` 导致的权限问题，我们创建了安全代理函数：

```sql
-- 获取当前用户ID
public.current_user_id() → uuid

-- 获取当前租户ID
public.current_tenant_id() → uuid

-- 获取当前租户Schema名称
public.get_tenant_schema() → text

-- 设置当前会话的 search_path
public.set_tenant_search_path() → void
```

## 前端使用指南

### 1. 导入工具模块

```typescript
import {
  getCurrentUserId,
  getCurrentTenantId,
  getTenantSchema,
  setTenantSearchPath,
  initTenantContext,
  getTenantContext
} from '@/utils/tenant-context'
```

### 2. 初始化租户上下文

在应用启动时（如 `app.tsx` 的 `useEffect` 中）调用：

```typescript
import { useEffect } from 'react'
import { initTenantContext } from '@/utils/tenant-context'

const App: React.FC = ({ children }) => {
  useEffect(() => {
    // 初始化租户上下文
    initTenantContext().then(context => {
      console.log('租户上下文:', context)
      // context = {
      //   userId: 'xxx-xxx-xxx',
      //   tenantId: 'yyy-yyy-yyy',
      //   schema: 'tenant_yyy_yyy_yyy'
      // }
    })
  }, [])

  return <>{children}</>
}
```

### 3. 获取租户上下文信息

```typescript
// 获取完整的租户上下文
const context = await getTenantContext()
console.log('用户ID:', context.userId)
console.log('租户ID:', context.tenantId)
console.log('Schema:', context.schema)

// 或者单独获取
const userId = await getCurrentUserId()
const tenantId = await getCurrentTenantId()
const schema = await getTenantSchema()
```

### 4. 数据库查询

使用 Supabase 客户端进行查询时，系统会自动使用正确的 Schema：

```typescript
import { supabase } from '@/client/supabase'

// 查询当前租户的仓库列表
const { data: warehouses, error } = await supabase
  .from('warehouses')
  .select('*')
  .order('name')

// 系统会自动：
// 1. 通过 RLS 策略验证用户权限
// 2. 使用 current_tenant_id() 确定租户
// 3. 从正确的 Schema 查询数据
```

### 5. 跨 Schema 访问日志

如果需要记录跨 Schema 访问（用于审计），可以使用：

```typescript
import { logCrossSchemaAccess } from '@/utils/tenant-context'

// 记录访问日志
await logCrossSchemaAccess({
  sourceSchema: 'tenant_xxx',
  targetSchema: 'tenant_yyy',
  operation: 'SELECT',
  tableName: 'warehouses',
  success: true
})
```

### 6. 测试安全性

```typescript
import { testCrossSchemaSecur } from '@/utils/tenant-context'

// 运行安全性测试
const results = await testCrossSchemaSecur()
results.forEach(test => {
  console.log(`${test.test_name}: ${test.result}`)
  console.log(`  详情: ${test.details}`)
})

// 输出示例：
// current_user_id(): PASS
//   详情: User ID: xxx-xxx-xxx
// current_tenant_id(): PASS
//   详情: Tenant ID: yyy-yyy-yyy
// get_tenant_schema(): PASS
//   详情: Schema: tenant_yyy_yyy_yyy
// get_current_user_profile(): PASS
//   详情: Profile retrieved successfully
```

## 数据库层使用指南

### 1. 在 RLS 策略中使用

```sql
-- ❌ 错误：直接使用 auth.uid()
CREATE POLICY "Users can view own data" ON warehouses
  FOR SELECT
  USING (owner_id = auth.uid());

-- ✅ 正确：使用安全代理函数
CREATE POLICY "Users can view own data" ON warehouses
  FOR SELECT
  USING (owner_id = public.current_user_id());
```

### 2. 在存储过程中使用

```sql
CREATE OR REPLACE FUNCTION get_my_warehouses()
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_id_val uuid;
  schema_name text;
BEGIN
  -- 获取当前租户ID
  tenant_id_val := public.current_tenant_id();
  
  -- 获取租户Schema
  schema_name := public.get_tenant_schema();
  
  -- 从正确的Schema查询
  RETURN QUERY EXECUTE format(
    'SELECT id, name FROM %I.warehouses WHERE is_active = true',
    schema_name
  );
END;
$$;
```

### 3. 在触发器中使用

```sql
CREATE OR REPLACE FUNCTION audit_data_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 记录数据变更
  INSERT INTO public.audit_logs (
    user_id,
    tenant_id,
    table_name,
    operation,
    old_data,
    new_data
  ) VALUES (
    public.current_user_id(),
    public.current_tenant_id(),
    TG_TABLE_NAME,
    TG_OP,
    row_to_json(OLD),
    row_to_json(NEW)
  );
  
  RETURN NEW;
END;
$$;
```

## 安全最佳实践

### 1. 权限管理

- ✅ **使用 SECURITY DEFINER**：确保函数以定义者权限执行
- ✅ **回收 PUBLIC 权限**：只授予必要的角色
- ✅ **使用安全代理函数**：避免直接使用 `auth.uid()`
- ❌ **不要暴露 search_path**：防止客户端直接修改

### 2. 数据隔离

- ✅ **启用 RLS**：所有租户表都必须启用 Row Level Security
- ✅ **使用 Schema 隔离**：每个租户有独立的 Schema
- ✅ **验证租户ID**：所有查询都要验证 `current_tenant_id()`
- ❌ **不要跨租户查询**：除非有明确的业务需求和权限验证

### 3. 审计日志

- ✅ **记录关键操作**：使用 `log_cross_schema_access()` 记录跨 Schema 访问
- ✅ **定期审查日志**：检查是否有异常访问
- ✅ **保留日志**：至少保留 90 天的审计日志
- ❌ **不要记录敏感数据**：日志中不要包含密码、密钥等敏感信息

### 4. 错误处理

- ✅ **捕获异常**：所有数据库操作都要有错误处理
- ✅ **记录错误**：将错误记录到审计日志
- ✅ **友好提示**：给用户显示友好的错误信息
- ❌ **不要暴露细节**：错误信息不要暴露数据库结构

## 常见问题

### Q1: 为什么要使用安全代理函数？

**A:** 直接使用 `auth.uid()` 在某些情况下会导致权限链断裂，特别是在使用 `SECURITY DEFINER` 的函数中。安全代理函数确保权限验证始终正确。

### Q2: 如何确保租户数据隔离？

**A:** 通过以下机制：
1. 每个租户有独立的 Schema
2. RLS 策略验证 `current_tenant_id()`
3. 动态 search_path 自动切换到正确的 Schema
4. 审计日志记录所有跨 Schema 访问

### Q3: 超级管理员如何访问所有租户的数据？

**A:** 超级管理员可以：
1. 查看 `public.leases` 表获取所有租户列表
2. 使用 Edge Function 或 RPC 函数访问特定租户的 Schema
3. 所有访问都会被记录到审计日志

### Q4: 如何测试安全性？

**A:** 使用 `test_cross_schema_security()` 函数：

```typescript
import { testCrossSchemaSecur } from '@/utils/tenant-context'

const results = await testCrossSchemaSecur()
console.table(results)
```

### Q5: 如何查看审计日志？

**A:** 只有超级管理员可以查看：

```typescript
import { supabase } from '@/client/supabase'

const { data: logs, error } = await supabase
  .from('cross_schema_access_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100)
```

## 监控与维护

### 1. 定期检查

- 每周审查审计日志，查找异常访问
- 每月检查 RLS 策略，确保权限配置正确
- 每季度进行安全测试，验证数据隔离

### 2. 性能优化

- 为审计日志表创建索引
- 定期清理旧的审计日志（保留 90 天）
- 监控数据库连接数和查询性能

### 3. 故障排查

如果遇到权限问题：

1. 检查用户的 `current_tenant_id()` 是否正确
2. 检查 Schema 是否存在
3. 检查 RLS 策略是否正确
4. 查看审计日志，确认访问路径

## 相关文档

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Schema](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-security-label.html)

## 更新日志

- **2025-11-28**: 初始版本，实现安全的跨 Schema 访问机制
