# 多租户功能 406 错误完整修复报告

## 问题描述

在创建老板账号时，前端显示"创建失败"，浏览器控制台出现 406 (Not Acceptable) 错误：

```
PATCH https://backend.appmiaoda.com/projects/supabase244341780043055104/rest/v1/profiles?id=eq.164817bd-7baf-4561-b410-46124886194d&select=* 406 (Not Acceptable)
```

## 根本原因

经过深入分析，发现问题由以下四个因素共同导致：

### 1. RLS 策略过于严格
"租赁管理员更新老板账号"策略要求 `tenant_id = auth.uid()`，但新创建的老板账号 `tenant_id` 为 NULL，导致策略拒绝访问。

### 2. NULL 比较问题
"租户数据隔离"策略中的 `tenant_id = get_user_tenant_id()` 在两者都为 NULL 时返回 NULL（而不是 true），导致策略失效。

### 3. 函数类型不匹配
`is_lease_admin_user()` 函数使用字符串比较 `role = 'lease_admin'` 而不是枚举类型比较 `role = 'lease_admin'::user_role`，可能导致类型不匹配。

### 4. 前端代码依赖触发器（最关键）
前端代码等待触发器创建 profiles 记录，但触发器只在用户确认邮箱（`confirmed_at` 从 NULL 变为非 NULL）时才执行。在开发环境中，用户不会立即确认邮箱，导致：
- auth.users 记录被创建
- profiles 记录没有被创建
- 前端尝试更新一个不存在的 profiles 记录
- 返回 406 错误

## 完整修复方案

### 修复1：放宽租赁管理员更新策略

**文件**：`supabase/migrations/038_fix_lease_admin_update_new_tenant.sql`

**修改**：
```sql
-- 旧策略
CREATE POLICY "租赁管理员更新老板账号" ON profiles
  FOR UPDATE
  USING (is_lease_admin_user(auth.uid()) AND role = 'super_admin'::user_role)
  WITH CHECK (role = 'super_admin'::user_role AND tenant_id = auth.uid());

-- 新策略
CREATE POLICY "租赁管理员更新老板账号" ON profiles
  FOR UPDATE
  USING (is_lease_admin_user(auth.uid()) AND role = 'super_admin'::user_role)
  WITH CHECK (role = 'super_admin'::user_role);
```

**效果**：移除 `tenant_id = auth.uid()` 检查，允许租赁管理员更新新创建的老板账号（tenant_id 为 NULL）。

### 修复2：修复 NULL 比较问题

**文件**：`supabase/migrations/039_fix_lease_admin_tenant_id_null_comparison.sql`

**修改**：
```sql
-- 旧策略
CREATE POLICY "租户数据隔离 - profiles" ON profiles
  USING (
    is_lease_admin() 
    OR id = auth.uid() 
    OR tenant_id = get_user_tenant_id()  -- NULL = NULL 返回 NULL
  );

-- 新策略
CREATE POLICY "租户数据隔离 - profiles" ON profiles
  USING (
    is_lease_admin() 
    OR id = auth.uid() 
    OR (
      tenant_id IS NOT NULL 
      AND get_user_tenant_id() IS NOT NULL 
      AND tenant_id = get_user_tenant_id()
    )
  );
```

**效果**：明确检查 NULL 值，避免 `NULL = NULL` 返回 NULL 的问题。

### 修复3：修复函数类型问题

**文件**：`supabase/migrations/040_fix_is_lease_admin_user_enum_type.sql`

**修改**：
```sql
-- 旧函数
CREATE FUNCTION is_lease_admin_user(user_id uuid DEFAULT NULL)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'lease_admin'  -- 字符串比较
  );
$$;

-- 新函数
CREATE OR REPLACE FUNCTION is_lease_admin_user(user_id uuid DEFAULT NULL)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'lease_admin'::user_role  -- 枚举类型比较
  );
$$;
```

**效果**：使用正确的枚举类型比较，确保类型匹配。

### 修复4：前端代码直接插入 profiles 记录

**文件**：`src/db/api.ts`

**修改**：
```typescript
// 旧代码
export async function createTenant(...) {
  // 1. 创建认证用户
  const {data: authData} = await supabase.auth.signUp({...})
  
  // 2. 等待触发器创建 profiles 记录
  await new Promise((resolve) => setTimeout(resolve, 1000))
  
  // 3. 更新 profiles 记录
  const {data: profileData} = await supabase
    .from('profiles')
    .update({...})  // 更新不存在的记录 -> 406 错误
    .eq('id', authData.user.id)
}

// 新代码
export async function createTenant(...) {
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
}
```

**效果**：
- 不再依赖触发器
- 立即创建 profiles 记录
- 避免更新不存在记录的问题

**清理迁移**：`supabase/migrations/041_cleanup_failed_tenant_creation.sql`
- 删除之前创建失败留下的孤立 auth.users 记录

## 测试验证

### 测试步骤

1. **登录租赁管理员**
   - 邮箱：`admin888@fleet.com`
   - 密码：`hye19911206`

2. **创建新老板账号**
   - 进入"租赁端" → "老板账号列表"
   - 点击"新增老板账号"
   - 填写信息：
     - 姓名：测试老板3
     - 手机号：13900000003
     - 邮箱：boss3@fleet.com
     - 密码：123456
     - 公司名称：测试公司3
     - 月租费用：1000
   - 点击"提交"

3. **验证结果**
   - ✅ 显示"创建成功"提示
   - ✅ 自动返回老板账号列表
   - ✅ 新老板出现在列表中
   - ✅ 浏览器控制台没有 406 错误

4. **验证新老板登录**
   - 退出租赁管理员账号
   - 使用新老板账号登录（boss3@fleet.com / 123456）
   - ✅ 成功登录并进入老板工作台

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
  status,
  created_at
FROM profiles
WHERE email = 'boss3@fleet.com';

-- 验证 tenant_id 是否正确设置为自己的 id
-- 应该看到 tenant_id = id
```

## 技术总结

### 关键发现

1. **触发器的局限性**
   - 触发器只在特定条件下执行（如邮箱确认）
   - 不应依赖触发器来创建关键数据
   - 应该在应用层直接创建必要的记录

2. **NULL 比较的陷阱**
   - SQL 中 `NULL = NULL` 返回 NULL（不是 true）
   - 在 RLS 策略中必须明确检查 NULL 值
   - 使用 `IS NULL` 和 `IS NOT NULL` 进行判断

3. **类型匹配的重要性**
   - 枚举类型必须使用 `::type_name` 进行显式转换
   - 字符串比较可能导致隐式转换问题
   - 始终使用正确的类型比较

4. **RLS 策略的设计原则**
   - 策略应该考虑数据的生命周期
   - 新创建的记录可能处于"中间状态"
   - 策略不应过于严格，阻止正常的数据创建流程

### 最佳实践

1. **用户创建流程**
   ```typescript
   // ✅ 推荐：直接创建所有必要的记录
   const {data: authData} = await supabase.auth.signUp({...})
   const {data: profileData} = await supabase.from('profiles').insert({...})
   
   // ❌ 不推荐：依赖触发器
   const {data: authData} = await supabase.auth.signUp({...})
   await new Promise(resolve => setTimeout(resolve, 1000))
   const {data: profileData} = await supabase.from('profiles').update({...})
   ```

2. **RLS 策略设计**
   ```sql
   -- ✅ 推荐：明确处理 NULL 值
   CREATE POLICY "policy_name" ON table_name
     USING (
       condition1 
       OR (field IS NOT NULL AND field = value)
     );
   
   -- ❌ 不推荐：直接比较可能为 NULL 的字段
   CREATE POLICY "policy_name" ON table_name
     USING (condition1 OR field = value);
   ```

3. **类型使用**
   ```sql
   -- ✅ 推荐：使用枚举类型
   WHERE role = 'admin'::user_role
   
   -- ❌ 不推荐：字符串比较
   WHERE role = 'admin'
   ```

## 相关文档

- [多租户功能实现完成](./MULTI_TENANT_IMPLEMENTATION_COMPLETE.md)
- [修复 406 错误详细说明](./MULTI_TENANT_FIX_406_ERROR.md)
- [快速测试指南](./QUICK_TEST_CREATE_TENANT.md)
- [多租户功能使用说明](./MULTI_TENANT_USAGE.md)

## 更新时间

2025-11-25 21:00:00 (UTC+8)
