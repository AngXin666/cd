/*
# 使用正确的方法修复管理员账号

## 问题
直接插入 auth.users 表可能导致密码验证失败，因为 Supabase Auth 有特殊的密码处理机制。

## 解决方案
1. 删除现有的 admin 账号
2. 使用 Supabase 的方式重新创建，确保所有字段都正确设置
3. 特别注意 confirmed_at 字段的设置
*/

-- 删除现有的 admin 账号
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@fleet.com';

  IF admin_user_id IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = admin_user_id;
    DELETE FROM auth.users WHERE id = admin_user_id;
    RAISE NOTICE '已删除现有的 admin 账号';
  END IF;
END $$;

-- 重新创建管理员账号，使用更完整的字段设置
DO $$
DECLARE
  admin_user_id uuid;
  encrypted_password text;
  now_time timestamptz;
BEGIN
  admin_user_id := gen_random_uuid();
  encrypted_password := crypt('hye19911206', gen_salt('bf'));
  now_time := now();
  
  -- 插入到 auth.users 表，设置所有必要的字段
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    recovery_token,
    is_sso_user,
    is_anonymous
  ) VALUES (
    admin_user_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@fleet.com',
    encrypted_password,
    now_time,
    '13800000000',
    NULL,  -- 不设置 phone_confirmed_at
    now_time,  -- 设置 confirmed_at
    '{"provider":"email","providers":["email"]}',
    '{"name":"系统管理员"}',
    'authenticated',
    'authenticated',
    now_time,
    now_time,
    '',
    '',
    '',
    '',
    '',
    false,
    false
  );
  
  -- 插入到 public.profiles 表
  INSERT INTO public.profiles (
    id,
    phone,
    role,
    name,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    '13800000000',
    'super_admin',
    '系统管理员',
    now_time,
    now_time
  );
  
  RAISE NOTICE '管理员账号创建成功';
  RAISE NOTICE 'Email: admin@fleet.com';
  RAISE NOTICE '密码: hye19911206';
END $$;