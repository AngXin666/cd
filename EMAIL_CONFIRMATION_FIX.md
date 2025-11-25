# 邮箱确认问题修复总结

## 问题描述

新创建的老板账号无法登录，显示 "Email not confirmed"（邮箱未确认）。

## 根本原因

Supabase 默认要求用户确认邮箱后才能登录。新创建的用户 `email_confirmed_at` 为 NULL，导致无法登录。

在开发环境中，用户无法收到确认邮件，因此需要自动确认邮箱。

## 完整修复方案

### 修复1：创建自动确认邮箱的函数

**文件**：`supabase/migrations/042_add_confirm_user_email_function.sql`

创建一个数据库函数，允许在创建用户后自动确认邮箱：

```sql
CREATE OR REPLACE FUNCTION confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = user_id
    AND email_confirmed_at IS NULL;
END;
$$;
```

**注意**：`confirmed_at` 是生成列（GENERATED ALWAYS），会自动根据 `email_confirmed_at` 生成，因此只需要更新 `email_confirmed_at`。

### 修复2：修复函数（处理生成列问题）

**文件**：`supabase/migrations/043_fix_confirm_user_email_function.sql`

修复第一版函数中尝试更新生成列的问题：

```sql
-- confirmed_at 是生成列，不能直接更新
-- 只更新 email_confirmed_at，confirmed_at 会自动生成
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = user_id
  AND email_confirmed_at IS NULL;
```

### 修复3：修复触发器（避免重复插入）

**文件**：`supabase/migrations/044_fix_handle_new_user_trigger_duplicate.sql`

修复 `handle_new_user` 触发器，避免在确认邮箱时尝试插入已存在的 profiles 记录：

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count int;
  profile_exists boolean;
BEGIN
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    -- 检查 profiles 记录是否已存在
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;
    
    -- 如果记录不存在，才插入
    IF NOT profile_exists THEN
      SELECT COUNT(*) INTO user_count FROM profiles;
      INSERT INTO profiles (id, phone, email, role)
      VALUES (
        NEW.id,
        NEW.phone,
        NEW.email,
        CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
```

### 修复4：前端代码调用确认函数

**文件**：`src/db/api.ts`

在 `createTenant` 函数中，创建用户后立即调用确认函数：

```typescript
export async function createTenant(...) {
  // 1. 创建认证用户
  const {data: authData} = await supabase.auth.signUp({...})
  
  // 2. 自动确认用户邮箱
  const {error: confirmError} = await supabase.rpc('confirm_user_email', {
    user_id: authData.user.id
  })
  
  if (confirmError) {
    console.error('确认用户邮箱失败:', confirmError)
    // 不返回 null，继续创建 profiles 记录
  }
  
  // 3. 直接插入 profiles 记录
  const {data: profileData} = await supabase
    .from('profiles')
    .insert({...})
}
```

## 技术细节

### Supabase 邮箱确认机制

1. **email_confirmed_at**：用户确认邮箱的时间戳（可更新）
2. **confirmed_at**：生成列（GENERATED ALWAYS），根据 `email_confirmed_at` 自动生成
3. **登录要求**：默认情况下，`confirmed_at` 必须不为 NULL 才能登录

### 生成列的限制

```sql
-- ❌ 错误：不能直接更新生成列
UPDATE auth.users
SET confirmed_at = NOW()
WHERE id = user_id;

-- ✅ 正确：更新源列，生成列会自动更新
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = user_id;
```

### 触发器与直接插入的冲突

**问题场景**：
1. 前端代码直接插入 profiles 记录（不依赖触发器）
2. 后续确认邮箱时，触发器尝试再次插入 profiles 记录
3. 导致主键冲突错误

**解决方案**：
在触发器中检查记录是否已存在，如果存在则跳过插入。

## 测试验证

### 1. 手动确认之前创建的用户

```sql
-- 确认用户 13700000001@163.com
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = '29659703-7b22-40c3-b9c0-b56b05060fa0'
  AND email_confirmed_at IS NULL;

-- 验证结果
SELECT id, email, confirmed_at, email_confirmed_at
FROM auth.users
WHERE id = '29659703-7b22-40c3-b9c0-b56b05060fa0';
```

**结果**：
- ✅ `email_confirmed_at` 已设置
- ✅ `confirmed_at` 自动生成
- ✅ 用户现在可以登录

### 2. 测试新创建的老板账号

1. **创建新老板账号**
   - 使用租赁管理员账号（admin888@fleet.com）登录
   - 创建新老板账号（例如：boss4@fleet.com）
   - 系统自动调用 `confirm_user_email` 函数

2. **验证邮箱已确认**
   ```sql
   SELECT id, email, confirmed_at, email_confirmed_at
   FROM auth.users
   WHERE email = 'boss4@fleet.com';
   ```
   - ✅ `confirmed_at` 不为 NULL
   - ✅ `email_confirmed_at` 不为 NULL

3. **测试登录**
   - 使用新老板账号登录
   - ✅ 成功登录，不再显示 "Email not confirmed"

## 相关文档

- [多租户功能 406 错误修复](./MULTI_TENANT_FIX_406_COMPLETE.md)
- [快速测试指南](./QUICK_TEST_CREATE_TENANT.md)
- [多租户功能使用说明](./MULTI_TENANT_USAGE.md)

## 更新时间

2025-11-25 21:30:00 (UTC+8)
