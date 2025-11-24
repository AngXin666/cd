# RLS 策略调试指南

## 问题描述

普通管理员添加司机时出现 RLS 策略错误：

```
new row violates row-level security policy for table "profiles"
错误代码: 42501
```

## 调试步骤

### 步骤 1：检查当前用户角色

在浏览器控制台执行以下 SQL 查询，确认当前登录用户的角色：

```sql
-- 方法 1：通过 Supabase 客户端查询
SELECT id, name, phone, role FROM profiles WHERE id = auth.uid();
```

或者在浏览器控制台执行：

```javascript
// 获取当前用户信息
const { data: { user } } = await supabase.auth.getUser();
console.log('当前用户 ID:', user?.id);

// 查询用户角色
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user?.id)
  .single();
console.log('用户角色:', profile?.role);
console.log('用户信息:', profile);
```

**预期结果**：
- 角色应该是 `manager`（普通管理员）

**如果角色不是 manager**：
- 使用超级管理员账号登录
- 进入用户管理页面
- 将该用户的角色改为 `manager`

### 步骤 2：测试 is_manager 函数

在数据库中执行以下查询，测试 `is_manager` 函数是否正常工作：

```sql
-- 替换 'your-user-id' 为实际的用户 ID
SELECT is_manager('your-user-id'::uuid) as is_manager_result;

-- 或者使用当前用户 ID
SELECT is_manager(auth.uid()) as is_manager_result;
```

**预期结果**：
- 如果当前用户是 manager，应该返回 `true`
- 如果不是，返回 `false`

**如果返回 false**：
- 检查用户角色是否正确
- 检查 is_manager 函数的定义

### 步骤 3：检查策略定义

```sql
-- 查看 profiles 表的 INSERT 策略
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT'
ORDER BY policyname;
```

**预期结果**：
应该看到两个策略：
1. `Managers can insert driver profiles` - with_check: `(is_manager(uid()) AND (role = 'driver'::user_role))`
2. `Super admins can insert profiles` - with_check: `is_super_admin(uid())`

### 步骤 4：测试策略条件

```sql
-- 测试策略的两个条件
SELECT 
  is_manager(auth.uid()) as condition1_is_manager,
  'driver'::user_role as condition2_role,
  is_manager(auth.uid()) AND ('driver'::user_role = 'driver'::user_role) as both_conditions;
```

**预期结果**：
- `condition1_is_manager`: true
- `condition2_role`: driver
- `both_conditions`: true

### 步骤 5：检查 uid() 函数

```sql
-- 检查 uid() 函数是否存在于 public schema
SELECT 
  n.nspname as schema,
  p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'uid'
ORDER BY n.nspname;
```

**预期结果**：
应该看到两个 uid() 函数：
1. `auth.uid()` - 原始函数
2. `public.uid()` - 别名函数

**如果没有 public.uid()**：
执行 migration：`supabase/migrations/021_create_public_uid_function.sql`

### 步骤 6：测试插入权限

```sql
-- 尝试直接插入一条测试记录（使用超级管理员账号）
-- 注意：这只是测试，不要在生产环境执行

-- 首先创建一个测试 auth.users 记录
SELECT * FROM create_user_auth_account_first(
  '13900139999@fleet.com',
  '13900139999'
);

-- 然后尝试插入 profiles 记录
INSERT INTO profiles (id, phone, name, role, driver_type)
VALUES (
  'test-user-id'::uuid,  -- 替换为实际的 user_id
  '13900139999',
  '测试司机',
  'driver'::user_role,
  '正式司机'
);
```

## 常见问题及解决方案

### 问题 1：is_manager 函数返回 false

**原因**：
- 当前用户角色不是 manager
- is_manager 函数的 search_path 不正确

**解决方案**：

1. 检查用户角色：
```sql
SELECT id, name, role FROM profiles WHERE id = auth.uid();
```

2. 更新 is_manager 函数：
```sql
CREATE OR REPLACE FUNCTION is_manager(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'manager'::user_role
  );
$$;
```

### 问题 2：uid() 函数找不到

**原因**：
- RLS 策略执行时的 search_path 不包含 auth schema
- 策略无法找到 auth.uid() 函数

**解决方案**：

创建 public.uid() 函数别名：
```sql
CREATE OR REPLACE FUNCTION public.uid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.uid() TO authenticated;
```

### 问题 3：策略条件不满足

**原因**：
- 插入的记录角色不是 'driver'
- is_manager(uid()) 返回 false

**解决方案**：

1. 确保插入的记录角色是 'driver'：
```typescript
const profileData = {
  id: userId,
  phone: phone,
  name: name,
  role: 'driver' as const,  // 确保是 'driver'
  driver_type: driverType
}
```

2. 确保当前用户是 manager：
```sql
UPDATE profiles SET role = 'manager' WHERE id = 'your-user-id';
```

### 问题 4：RLS 完全阻止插入

**临时解决方案（仅用于调试）**：

```sql
-- 临时禁用 RLS（仅用于调试，不要在生产环境使用）
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 测试插入
-- ...

-- 重新启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

**永久解决方案**：

添加一个更宽松的策略（仅用于调试）：

```sql
-- 创建调试策略（允许所有 authenticated 用户插入 driver 记录）
CREATE POLICY "Debug: Allow authenticated to insert drivers" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (role = 'driver'::user_role);

-- 测试完成后删除
DROP POLICY "Debug: Allow authenticated to insert drivers" ON profiles;
```

## 完整的调试流程

### 1. 收集信息

```sql
-- 当前用户信息
SELECT 
  auth.uid() as current_user_id,
  p.name,
  p.role,
  is_manager(auth.uid()) as is_manager
FROM profiles p
WHERE p.id = auth.uid();

-- 策略信息
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT';

-- 函数信息
SELECT n.nspname, p.proname, pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('uid', 'is_manager', 'is_super_admin');
```

### 2. 逐步测试

```sql
-- 测试 1：uid() 函数
SELECT auth.uid(), public.uid();

-- 测试 2：is_manager 函数
SELECT is_manager(auth.uid());

-- 测试 3：策略条件
SELECT 
  is_manager(auth.uid()) as cond1,
  'driver'::user_role = 'driver'::user_role as cond2,
  is_manager(auth.uid()) AND ('driver'::user_role = 'driver'::user_role) as result;
```

### 3. 修复问题

根据测试结果，执行相应的修复：

1. 如果 uid() 函数不存在：执行 `021_create_public_uid_function.sql`
2. 如果 is_manager 返回 false：检查用户角色或更新函数
3. 如果策略条件不满足：检查插入数据或策略定义

### 4. 验证修复

```sql
-- 尝试插入测试记录
-- 使用应用代码或直接 SQL
```

## 最终解决方案

如果以上所有步骤都无法解决问题，可以考虑以下方案：

### 方案 1：简化策略

```sql
-- 删除现有策略
DROP POLICY IF EXISTS "Managers can insert driver profiles" ON profiles;

-- 创建简化策略
CREATE POLICY "Managers can insert driver profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'::user_role
    )
    AND role = 'driver'::user_role
  );
```

### 方案 2：使用触发器

```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION check_driver_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- 获取当前用户角色
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- 检查权限
  IF current_user_role = 'manager' AND NEW.role = 'driver' THEN
    RETURN NEW;
  ELSIF current_user_role = 'super_admin' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Permission denied: Only managers can create drivers';
  END IF;
END;
$$;

-- 创建触发器
CREATE TRIGGER check_driver_insert_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_driver_insert();
```

### 方案 3：使用服务端 API

如果 RLS 策略无法正常工作，可以考虑使用 Supabase Edge Functions 或后端 API 来处理用户创建逻辑，绕过 RLS 限制。

## 总结

RLS 策略错误通常由以下原因引起：

1. ✅ 函数查找问题：search_path 不正确
2. ✅ 权限检查失败：is_manager 返回 false
3. ✅ 策略条件不满足：插入数据不符合要求
4. ✅ 用户角色错误：当前用户不是 manager

通过以上调试步骤，应该能够定位并解决问题。如果仍然无法解决，请提供：
- 当前用户 ID 和角色
- is_manager 函数的返回值
- 策略定义
- 完整的错误日志

这样我们可以进一步分析问题。
