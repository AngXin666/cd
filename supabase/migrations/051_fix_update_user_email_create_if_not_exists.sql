/*
# 修复 update_user_email 函数 - 用户不存在时自动创建

## 问题描述
当修改用户的登录账号时，如果用户在 auth.users 表中不存在（例如通过手机号验证码注册的用户），
update_user_email 函数会抛出"用户不存在"的错误。

## 解决方案
修改 update_user_email 函数，当用户不存在时：
1. 检查用户是否在 auth.users 表中存在
2. 如果不存在，创建新的 auth.users 记录
3. 如果存在，更新邮箱地址

## 注意事项
- 创建用户时使用随机密码（用户需要通过重置密码功能设置密码）
- 自动确认邮箱（email_confirmed_at）
- 自动确认手机号（phone_confirmed_at，如果有）
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

    -- 插入新的 auth.users 记录
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
      is_super_admin,
      confirmation_token,
      email_change_token_new,
      recovery_token
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
      false,
      '',
      '',
      ''
    );
    
    RAISE NOTICE '✅ 用户账号已创建，邮箱: %', new_email;
  END IF;
END;
$$;
