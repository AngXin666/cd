/*
# 修复 update_user_email 函数 - 处理 NULL 列

## 问题描述
在插入 auth.users 记录时出现 SQL 扫描错误：
"Scan error on column index 8, name 'email_change': converting NULL to string is unsupported"

## 根本原因
auth.users 表中的某些列不能使用空字符串 ''，必须使用 NULL 值。
特别是以下列：
- confirmation_token
- email_change_token_new
- recovery_token
- email_change
- phone_change

当这些列的值为 NULL 时，如果在 INSERT 语句中显式指定为空字符串 ''，
会导致 SQL 扫描错误。

## 解决方案
修改 update_user_email 函数：
1. 移除不必要的列（confirmation_token, email_change_token_new, recovery_token）
2. 让这些列使用数据库的默认值（NULL）
3. 只插入必需的列
*/

CREATE OR REPLACE FUNCTION update_user_email(
  target_user_id uuid,
  new_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  user_exists boolean;
  user_phone text;
BEGIN
  -- 检查调用者是否为超级管理员
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION '只有超级管理员可以修改用户邮箱';
  END IF;

  -- 检查新邮箱是否已被其他用户使用
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = new_email 
    AND id != target_user_id
  ) THEN
    RAISE EXCEPTION '该邮箱已被其他用户使用';
  END IF;

  -- 检查用户是否在 auth.users 表中存在
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = target_user_id
  ) INTO user_exists;

  IF user_exists THEN
    -- 用户存在，直接更新邮箱
    UPDATE auth.users
    SET 
      email = new_email,
      email_confirmed_at = now(),
      updated_at = now()
    WHERE id = target_user_id;
    
    RAISE NOTICE '✅ 用户邮箱已更新';
  ELSE
    -- 用户不存在，创建新的 auth.users 记录
    -- 从 profiles 表获取用户的手机号
    SELECT phone INTO user_phone
    FROM profiles
    WHERE id = target_user_id;

    -- 插入新的 auth.users 记录，使用 ON CONFLICT 避免冲突
    -- 注意：某些列必须使用 NULL 而不是空字符串，所以我们不显式指定它们
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      phone,
      phone_confirmed_at,
      created_at,
      updated_at,
      aud,
      role,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin
    ) VALUES (
      target_user_id,
      '00000000-0000-0000-0000-000000000000',
      new_email,
      extensions.crypt('temp_password_' || target_user_id::text, extensions.gen_salt('bf')),
      now(),
      user_phone,
      CASE WHEN user_phone IS NOT NULL THEN now() ELSE NULL END,
      now(),
      now(),
      'authenticated',
      'authenticated',
      '{"provider":"email","providers":["email"]}',
      '{}',
      false
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      updated_at = EXCLUDED.updated_at;
    
    RAISE NOTICE '✅ 用户账号已创建，邮箱: %', new_email;
  END IF;
END;
$$;
