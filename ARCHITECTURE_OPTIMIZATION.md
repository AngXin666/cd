# 权限系统架构优化总结

## 📋 优化前后对比

### ❌ 优化前的问题
```
┌─ 混合权限架构 ─────────────┐
│ RLS (数据库层)              │  → 调试困难
│ +                           │  → 职责不清
│ 应用层权限 (部分)           │  → 逻辑分散
└─────────────────────────────┘
```

### ✅ 优化后的架构
```
┌─ 纯应用层权限架构 ─────────────────────────────┐
│                                                 │
│  createPermissionQuery()                        │
│  职责:"我是谁" - 解析Token并生成权限上下文     │
│  ↓                                              │
│  validateSensitiveDataAccess()                  │
│  职责:"我能做什么操作" - 功能权限(硬编码403)   │
│  ↓                                              │
│  applyRoleFilter()                              │
│  职责:"我能看什么数据" - 数据范围(WHERE条件)   │
│  ↓                                              │
│  PostgreSQL (无RLS,纯存储)                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🎯 三大核心优化

### 1. 职责清晰分离 (高内聚低耦合)

| 函数 | 职责 | 输入 | 输出 |
|------|------|------|------|
| `buildPermissionContext()` | "我是谁" | userId, role | PermissionContext |
| `validateSensitiveDataAccess()` | "我能做什么操作" | table, context, operation | throw/pass |
| `applyRoleFilter()` | "我能看什么数据" | query, context | filtered query |

**代码位置**: [`/src/utils/permissionFilter.ts`](file:///Users/angxin/Downloads/app-7cdqf07mbu9t/src/utils/permissionFilter.ts)

---

### 2. 策略模式实现

#### 2.1 角色过滤策略
```typescript
const ROLE_FILTER_STRATEGIES: Record<UserRole, RoleFilterStrategy> = {
  BOSS: (query, context) => query,  // 无限制
  
  PEER_ADMIN: (query, context) => {
    // 根据 permission_level 决定
    // view_only 模式下,写操作会被 validateSensitiveDataAccess 拦截
    return query
  },
  
  MANAGER: (query, context) => {
    // 限制管辖仓库范围
    if (context.warehouseIds && context.warehouseIds.length > 0) {
      return query.in('warehouse_id', context.warehouseIds)
    }
    return query.eq('id', '00000000-0000-0000-0000-000000000000')
  },
  
  DRIVER: (query, context) => {
    // 只能看自己的数据
    return query.eq('user_id', context.userId)
  }
}
```

**优势**:
- ✅ 易于扩展 (新增角色只需添加策略)
- ✅ 易于测试 (每个策略独立测试)
- ✅ 避免大量 if-else

---

#### 2.2 敏感表访问策略
```typescript
const SENSITIVE_TABLE_RULES: Record<string, SensitiveTableRule> = {
  // 特级敏感: 只允许BOSS
  salary_records: {
    bossOnly: true
  },
  users: {
    bossOnly: true
  },
  
  // 一般敏感: 考勤数据
  attendance: {
    readLevel: 'view_only',      // MANAGER可以读取本部门考勤
    writeLevel: 'full_control',  // 写入需要完整控制权
    allowedRoles: ['BOSS', 'PEER_ADMIN', 'MANAGER', 'DRIVER']
  },
  
  // ... 更多配置
}
```

**规则类型**:
- `bossOnly`: BOSS专属表
- `readLevel`: 读取所需最低权限等级
- `writeLevel`: 写入所需最低权限等级
- `allowedRoles`: 允许访问的角色列表

---

### 3. 细粒度权限控制

#### 操作级别的权限判断

| 操作 | 表类型 | 权限要求 |
|------|--------|----------|
| **SELECT** | `salary_records` | ❌ 拒绝 (BOSS专属) |
| **SELECT** | `attendance` | ✅ 允许 (MANAGER可读本部门) |
| **INSERT** | `attendance` | ✅ 允许 (DRIVER可创建打卡) |
| **UPDATE** | `attendance` | ⚠️ 需要 `full_control` |
| **DELETE** | `attendance` | ⚠️ 需要 `full_control` |

#### 权限等级控制矩阵

| 角色 | permission_level | 数据范围 | 敏感表读 | 敏感表写 |
|------|-----------------|----------|----------|----------|
| BOSS | - | 全部数据 | ✅ 全部 | ✅ 全部 |
| PEER_ADMIN | `full_control` | 全部数据 | ✅ (除薪资/用户) | ✅ |
| PEER_ADMIN | `view_only` | 全部数据 | ✅ (除薪资/用户) | ❌ 403 |
| MANAGER | `full_control` | 管辖仓库 | ✅ 本仓库 | ✅ 本仓库 |
| MANAGER | `view_only` | 管辖仓库 | ✅ 本仓库 | ❌ 403 |
| DRIVER | - | 仅本人 | ✅ 本人 | ⚠️ 部分 |

**注**: DRIVER可以创建打卡/请假,但不能修改已提交的记录

---

## 🛡️ 双重保护机制

### 第一层: 硬编码校验 (403拦截)
```typescript
// 在所有操作前强制校验
validateSensitiveDataAccess(table, context, operation)

// 效果等同于 RLS 的强制访问控制
if (table === 'salary_records' && role !== 'BOSS') {
  throw new Error('权限不足: 表 salary_records 只允许BOSS访问')
}
```

### 第二层: WHERE条件过滤
```typescript
// SELECT查询自动添加WHERE条件
query = applyRoleFilter(query, context)

// 效果:
// MANAGER → WHERE warehouse_id IN (...)
// DRIVER  → WHERE user_id = 'xxx'
```

### 双重保护示例
```typescript
// MANAGER访问考勤表
await permissionQuery.select('attendance')

// 执行流程:
// 1. validateSensitiveDataAccess('attendance', {role:'MANAGER', permissionLevel:'full_control'}, 'select')
//    → ✅ PASS (在 allowedRoles 中)
//
// 2. applyRoleFilter(query, {role:'MANAGER', warehouseIds:['w1','w2']})
//    → query.in('warehouse_id', ['w1', 'w2'])
//
// 3. 最终SQL: SELECT * FROM attendance WHERE warehouse_id IN ('w1', 'w2')
```

---

## 🔐 数据库用户权限限制 (最后一道防线)

### 为什么需要?
即使应用层代码被SQL注入,黑客也无法删库跑路。

### 实施方案
**文件**: [`/supabase/migrations/99998_create_app_user_with_limited_permissions.sql`](file:///Users/angxin/Downloads/app-7cdqf07mbu9t/supabase/migrations/99998_create_app_user_with_limited_permissions.sql)

```sql
-- 创建限制权限的数据库用户
CREATE USER app_user WITH PASSWORD 'strong_password_here';

-- ✅ 授予的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES TO app_user;

-- ❌ 禁止的权限
-- DROP TABLE (不授予)
-- ALTER TABLE (不授予)
-- TRUNCATE (不授予)
-- CREATE TABLE (不授予)
```

### 权限对比

| 操作 | postgres用户 | app_user |
|------|-------------|----------|
| SELECT/INSERT/UPDATE/DELETE | ✅ | ✅ |
| DROP TABLE | ✅ | ❌ |
| ALTER TABLE | ✅ | ❌ |
| TRUNCATE | ✅ | ❌ |
| CREATE TABLE | ✅ | ❌ |

**执行步骤**:
1. 在 Supabase Dashboard 执行 SQL 创建用户
2. 修改应用连接字符串,使用 `app_user` 替代 `postgres`
3. 测试功能正常

---

## 📊 完整防护层级

```
┌─────────────────────────────────────────────────────────────┐
│ 第1层: 网络层防护 (Supabase API Key)                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 第2层: 应用层硬编码校验 (validateSensitiveDataAccess)      │
│        - 敏感表403拦截                                      │
│        - permission_level检查                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 第3层: 应用层数据范围过滤 (applyRoleFilter)                │
│        - WHERE条件动态拼接                                  │
│        - 管辖范围限制                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 第4层: 数据库用户权限限制 (app_user)                       │
│        - 禁止DROP/ALTER等危险操作                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎁 优势总结

### ✅ 相比 RLS 的优势

1. **调试便利**
   - 所有逻辑在应用代码中
   - 可以打断点/日志
   - 不用查看数据库策略

2. **灵活性强**
   - 老板可动态调整 `permission_level`
   - 代码比SQL更易读
   - 支持复杂业务逻辑

3. **性能更优**
   - 减少数据库策略执行开销
   - 403拦截在应用层完成,不走数据库
   - WHERE条件在应用层优化

4. **易于维护**
   - 策略模式清晰
   - 高内聚低耦合
   - 单元测试友好

### ⚡ 性能对比

| 场景 | RLS模式 | 纯应用层 |
|------|---------|----------|
| 访问薪资表(非BOSS) | DB执行策略后拒绝 | 应用层立即403 ⚡ |
| MANAGER查询考勤 | DB拼接策略WHERE | 应用层拼接WHERE ⚡ |
| BOSS全量查询 | DB无策略开销 | 应用层无校验开销 ✅ |

---

## 📝 已修改的文件

1. **[`/src/utils/permissionFilter.ts`](file:///Users/angxin/Downloads/app-7cdqf07mbu9t/src/utils/permissionFilter.ts)**
   - 新增 `SENSITIVE_TABLE_RULES` 配置
   - 新增 `ROLE_FILTER_STRATEGIES` 策略映射
   - 重构 `validateSensitiveDataAccess()` 支持细粒度权限
   - 重构 `applyRoleFilter()` 使用策略模式

2. **[`/src/db/middleware/permissionMiddleware.ts`](file:///Users/angxin/Downloads/app-7cdqf07mbu9t/src/db/middleware/permissionMiddleware.ts)**
   - 更新注释,说明架构流程
   - 标注每个方法的防护层级

3. **[`/supabase/migrations/99998_create_app_user_with_limited_permissions.sql`](file:///Users/angxin/Downloads/app-7cdqf07mbu9t/supabase/migrations/99998_create_app_user_with_limited_permissions.sql)** (新建)
   - 创建限制权限的数据库用户
   - 软防线: 防止代码注入导致删库

---

## ⚙️ 下一步操作

### 必须执行 (安全加固)
1. 在 [Supabase Dashboard](https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql/new) 执行:
   ```sql
   -- 执行文件: 99998_create_app_user_with_limited_permissions.sql
   ```

2. 修改应用数据库连接配置:
   ```typescript
   // 从
   createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
   
   // 改为 (需要获取 app_user 的连接字符串)
   createClient(SUPABASE_URL, APP_USER_KEY)
   ```

3. 修改 `app_user` 密码为强密码:
   ```sql
   ALTER USER app_user WITH PASSWORD 'your_strong_password_here';
   ```

### 可选 (进一步优化)
1. 为每个敏感表补全访问规则
2. 添加操作审计日志
3. 实现权限配置热更新

---

## 🧪 测试建议

### 单元测试重点
```typescript
describe('权限系统', () => {
  test('BOSS专属表拦截', async () => {
    const context = { userId: 'xxx', role: 'MANAGER', permissionLevel: 'full_control' }
    expect(() => {
      validateSensitiveDataAccess('salary_records', context, 'select')
    }).toThrow('权限不足')
  })
  
  test('MANAGER数据范围限制', async () => {
    const context = { userId: 'xxx', role: 'MANAGER', warehouseIds: ['w1'] }
    const query = applyRoleFilter(mockQuery, context)
    expect(query.filters).toContain('warehouse_id=in.(w1)')
  })
  
  test('PEER_ADMIN view_only模式拦截写操作', async () => {
    const context = { userId: 'xxx', role: 'PEER_ADMIN', permissionLevel: 'view_only' }
    expect(() => {
      validateSensitiveDataAccess('attendance', context, 'update')
    }).toThrow('需要完整控制权')
  })
})
```

### 集成测试场景
1. MANAGER查询管辖仓库的考勤记录
2. DRIVER创建打卡记录
3. PEER_ADMIN (view_only) 尝试修改数据 → 403
4. 非BOSS访问薪资表 → 403

---

## 🎉 总结

### 核心思想
> **职责分离 + 策略模式 + 双重保护 + 数据库软防线**

### 关键改进
- ✅ 高内聚低耦合 (每个函数职责单一)
- ✅ 老板控制权 (permission_level灵活配置)
- ✅ 敏感数据安全 (硬编码403 + WHERE过滤)
- ✅ 代码易维护 (策略模式扩展方便)
- ✅ 防止删库跑路 (数据库用户权限限制)

---

**架构设计者**: AI Assistant  
**优化日期**: 2025-12-07  
**项目**: 物流车队管理系统
