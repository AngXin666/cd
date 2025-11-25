# 修复创建老板账号 406 错误

## 问题描述

创建老板账号时出现 406 (Not Acceptable) 错误：

```
PATCH https://backend.appmiaoda.com/projects/.../rest/v1/profiles?id=eq.xxx&select=* 406 (Not Acceptable)
```

## 根本原因分析

### 问题1：RLS 策略中的 NULL 比较

**SQL 中的 NULL 比较规则**：
- `NULL = NULL` 返回 `UNKNOWN`（不是 `TRUE`）
- `UNKNOWN` 在 WHERE 条件中被视为 `FALSE`
- 这导致 RLS 策略拒绝访问

**具体场景**：
1. 租赁管理员（lease_admin）的 `tenant_id` 是 `NULL`
2. `get_user_tenant_id()` 函数对于 lease_admin 返回 `NULL`
3. 新创建的老板账号的 `tenant_id` 也是 `NULL`
4. 旧策略条件：`tenant_id = get_user_tenant_id()`
5. 实际执行：`NULL = NULL` → `UNKNOWN` → 拒绝访问

### 问题2：多个 RLS 策略的交互

系统中有多个 RLS 策略同时作用于 `profiles` 表：
1. "租赁管理员更新老板账号" - 允许更新 super_admin 记录
2. "租户数据隔离 - profiles" - 控制数据访问范围

即使修复了策略1，策略2 仍然会因为 NULL 比较问题而拒绝访问。

## 解决方案

需要修复四个问题：

### 修复1：租赁管理员更新老板账号策略

**迁移文件**：`038_fix_lease_admin_update_new_tenant.sql`

**旧策略（有问题）**：
```sql
CREATE POLICY "租赁管理员更新老板账号" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_lease_admin_user(auth.uid()) 
    AND role = 'super_admin'::user_role
    AND tenant_id IS NOT NULL  -- 这个条件导致无法更新新记录
  );
```

**新策略（已修复）**：
```sql
CREATE POLICY "租赁管理员更新老板账号" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_lease_admin_user(auth.uid()) 
    AND role = 'super_admin'::user_role
    -- 移除了 tenant_id 的检查，允许更新所有 super_admin 记录
  )
  WITH CHECK (
    role = 'super_admin'::user_role
  );
```

### 修复2：租户数据隔离策略

**迁移文件**：`039_fix_lease_admin_tenant_id_null_comparison.sql`

**旧策略（有问题）**：
```sql
CREATE POLICY "租户数据隔离 - profiles" ON profiles
  FOR ALL
  USING (
    is_lease_admin() 
    OR (id = auth.uid())
    OR (tenant_id = get_user_tenant_id())  -- NULL = NULL 问题
  );
```

**新策略（已修复）**：
```sql
CREATE POLICY "租户数据隔离 - profiles" ON profiles
  FOR ALL
  USING (
    -- lease_admin 可以访问所有数据
    is_lease_admin() 
    OR 
    -- 用户可以访问自己的记录
    (id = auth.uid())
    OR
    -- 用户可以访问同租户的数据（明确处理 NULL）
    (
      tenant_id IS NOT NULL 
      AND get_user_tenant_id() IS NOT NULL 
      AND tenant_id = get_user_tenant_id()
    )
  );
```

**关键改进**：
- 明确检查 `tenant_id IS NOT NULL`
- 明确检查 `get_user_tenant_id() IS NOT NULL`
- 只有两者都不为 NULL 时才进行相等比较
- 避免了 `NULL = NULL` 的问题

### 修复3：is_lease_admin_user 函数类型问题

**迁移文件**：`040_fix_is_lease_admin_user_enum_type.sql`

**问题**：
- 函数检查 `role = 'lease_admin'`（字符串比较）
- 应该使用 `role = 'lease_admin'::user_role`（枚举类型比较）
- 字符串比较可能导致类型不匹配

**旧函数（有问题）**：
```sql
CREATE FUNCTION is_lease_admin_user(user_id uuid DEFAULT NULL)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'lease_admin'  -- 字符串比较
  );
$$;
```

**新函数（已修复）**：
```sql
CREATE OR REPLACE FUNCTION is_lease_admin_user(user_id uuid DEFAULT NULL)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'lease_admin'::user_role  -- 枚举类型比较
  );
$$;
```

**关键改进**：
- 使用正确的枚举类型比较
- 确保类型匹配，避免隐式转换问题

### 修复4：前端代码不再依赖触发器

**问题**：
- 原代码等待触发器创建 profiles 记录
- 触发器只在用户确认邮箱（`confirmed_at` 从 NULL 变为非 NULL）时才执行
- 在开发环境中，用户可能不会立即确认邮箱
- 导致 profiles 记录没有被创建，后续更新操作失败（406 错误）

**旧代码（有问题）**：
```typescript
// 1. 创建认证用户
const {data: authData} = await supabase.auth.signUp({...})

// 2. 等待触发器创建 profiles 记录
await new Promise((resolve) => setTimeout(resolve, 1000))

// 3. 更新 profiles 记录
const {data: profileData} = await supabase
  .from('profiles')
  .update({...})  // 更新一个不存在的记录 -> 406 错误
  .eq('id', authData.user.id)
```

**新代码（已修复）**：
```typescript
// 1. 创建认证用户
const {data: authData} = await supabase.auth.signUp({...})

// 2. 直接插入 profiles 记录（不依赖触发器）
const {data: profileData} = await supabase
  .from('profiles')
  .insert({
    id: authData.user.id,
    name: tenant.name,
    role: 'super_admin' as UserRole,
    tenant_id: authData.user.id,
    // ... 其他字段
  })
```

**关键改进**：
- 不再依赖触发器，直接插入 profiles 记录
- 确保 profiles 记录立即创建，无需等待邮箱确认
- 避免了更新不存在记录的问题

**迁移文件**：`041_cleanup_failed_tenant_creation.sql`
- 清理之前创建失败留下的孤立 auth.users 记录

## 修复步骤

1. **应用数据库迁移**：
   ```bash
   # 四个迁移已自动应用
   supabase/migrations/038_fix_lease_admin_update_new_tenant.sql
   supabase/migrations/039_fix_lease_admin_tenant_id_null_comparison.sql
   supabase/migrations/040_fix_is_lease_admin_user_enum_type.sql
   supabase/migrations/041_cleanup_failed_tenant_creation.sql
   ```

2. **前端代码已更新**：
   - `src/db/api.ts` 中的 `createTenant()` 函数已修改
   - 不再依赖触发器，直接插入 profiles 记录

3. **验证修复**：
   - 使用租赁管理员账号（admin888@fleet.com / hye19911206）登录
   - 尝试创建新的老板账号
   - 填写所有必填信息（姓名、手机、邮箱、密码）
   - 提交后应该成功创建，不再出现 406 错误

## 创建流程说明

### 正确的创建流程

1. **前端提交**：
   ```typescript
   createTenant(
     {
       name: '测试老板',
       phone: '13900000001',
       email: 'boss@example.com',
       role: 'super_admin',
       company_name: '测试公司',
       // ... 其他字段
       tenant_id: null
     },
     'boss@example.com',
     '123456'
   )
   ```

2. **后端处理**：
   ```typescript
   // 步骤1: 创建认证用户
   const {data: authData} = await supabase.auth.signUp({
     email,
     password,
     options: {
       data: {
         name: tenant.name,
         phone: tenant.phone,
         role: 'super_admin'
       }
     }
   })
   
   // 步骤2: 等待触发器创建 profiles 记录
   await new Promise(resolve => setTimeout(resolve, 1000))
   
   // 步骤3: 更新 profiles 记录（现在可以成功）
   const {data: profileData} = await supabase
     .from('profiles')
     .update({
       name: tenant.name,
       phone: tenant.phone,
       email: email,
       company_name: tenant.company_name,
       lease_start_date: tenant.lease_start_date,
       lease_end_date: tenant.lease_end_date,
       monthly_fee: tenant.monthly_fee,
       notes: tenant.notes,
       status: 'active',
       tenant_id: authData.user.id  // 设置为自己的 id
     })
     .eq('id', authData.user.id)
     .select()
     .maybeSingle()
   ```

3. **数据库触发器**：
   - `handle_new_user()` 触发器在 `auth.users` 表插入时触发
   - 自动创建 `profiles` 记录
   - 如果是第一个用户，设置 `role` 为 `admin`
   - 否则根据创建者的角色设置

## 测试验证

### 测试步骤

1. **登录租赁管理员**：
   - 账号：admin888
   - 密码：hye19911206

2. **创建新老板账号**：
   - 姓名：测试老板3
   - 手机：13900000003
   - 邮箱：boss3@fleet.com
   - 密码：123456
   - 公司名称：测试公司3

3. **验证结果**：
   - 创建成功，显示"创建成功"提示
   - 返回老板账号列表
   - 新老板出现在列表中

4. **验证登录**：
   - 退出租赁管理员账号
   - 使用新老板账号登录（boss3@fleet.com / 123456）
   - 成功进入老板工作台

### 数据库验证

```sql
-- 查看新创建的老板账号
SELECT 
  id,
  name,
  email,
  phone,
  role,
  tenant_id,
  company_name,
  status
FROM profiles
WHERE email = 'boss3@fleet.com';

-- 验证 tenant_id 是否正确设置为自己的 id
-- 应该看到 tenant_id = id
```

## 相关文件

- **数据库迁移**：`supabase/migrations/038_fix_lease_admin_update_new_tenant.sql`
- **API 函数**：`src/db/api.ts` - `createTenant()`
- **前端页面**：`src/pages/lease-admin/tenant-form/index.tsx`

## 注意事项

1. **密码要求**：
   - 最少 6 位字符
   - 前端会验证密码长度

2. **邮箱唯一性**：
   - 邮箱必须唯一
   - 如果邮箱已存在，创建会失败

3. **等待时间**：
   - 创建认证用户后等待 1 秒
   - 确保触发器有足够时间创建 profiles 记录

4. **错误处理**：
   - 如果创建失败，会显示"创建失败"提示
   - 检查浏览器控制台查看详细错误信息

## 总结

通过修改 RLS 策略，移除了对 `tenant_id` 的检查，允许租赁管理员更新所有 super_admin 记录，包括刚创建的 `tenant_id` 为 NULL 的记录。这样就解决了 406 错误，使创建老板账号功能正常工作。

## 更新时间

2025-11-25 20:00:00 (UTC+8)
