/*
# 使用正确的方法修复管理员账号 v2

## 问题
1. 直接插入 auth.users 表可能导致密码验证失败
2. confirmed_at 是一个生成列，不能手动设置
3. phone_confirmed_at 设置可能导致验证问题

## 解决方案
1. 删除现有的 admin 账号
2. 使用正确的字段重新创建
3. 移除 confirmed_at（让数据库自动生成）
4. 移除 phone_confirmed_at（保持为 NULL）
5. 在 auth.users 中将 phone 设置为 NULL

## 账号信息
- 用户名：admin
- 密码：hye19911206
- Email：admin@fleet.com
- 角色：super_admin（超级管理员）
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

-- 重新创建管理员账号
DO $$
DECLARE
  admin_user_id uuid;
  encrypted_password text;
  now_time timestamptz;
BEGIN
  admin_user_id := gen_random_uuid();
  encrypted_password := crypt('hye19911206', gen_salt('bf'));
  now_time := now();
  
  -- 插入到 auth.users 表
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
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
    NULL,  -- phone 设置为 NULL
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
  RAISE NOTICE '角色: super_admin';
END $$;

-- 验证账号创建
DO $$
DECLARE
  admin_count int;
  password_valid boolean;
BEGIN
  -- 检查账号是否存在
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE role = 'super_admin' AND name = '系统管理员';
  
  IF admin_count = 0 THEN
    RAISE EXCEPTION '❌ 管理员账号创建失败：profiles 表中未找到记录';
  END IF;
  
  -- 验证密码哈希
  SELECT encrypted_password = crypt('hye19911206', encrypted_password) INTO password_valid
  FROM auth.users
  WHERE email = 'admin@fleet.com';
  
  IF NOT password_valid THEN
    RAISE EXCEPTION '❌ 密码哈希验证失败';
  END IF;
  
  RAISE NOTICE '✅ 管理员账号验证成功';
  RAISE NOTICE '✅ 密码哈希验证通过';
END $$;
