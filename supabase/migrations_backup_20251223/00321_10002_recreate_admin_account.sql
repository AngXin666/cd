/*
# 重新创建中央管理系统管理员账号

## 概述
重新创建系统管理员账号，使用正确的密码哈希格式。

## 账号信息
- 用户名：admin
- 密码：hye19911206
- Email：admin@fleet.com
- 角色：super_admin（超级管理员）

## 说明
- 使用 Supabase Auth 兼容的密码哈希格式
- 使用完整的 email 格式（admin@fleet.com）
- 用于登录中央管理系统
*/

-- 启用 pgcrypto 扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 删除已存在的 admin 账号（如果存在）
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- 查找 admin 用户（尝试两种 email 格式）
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email IN ('admin', 'admin@fleet.com');

  -- 如果找到，删除相关记录
  IF admin_user_id IS NOT NULL THEN
    -- 删除 profiles 记录
    DELETE FROM public.profiles WHERE id = admin_user_id;
    
    -- 删除 auth.users 记录
    DELETE FROM auth.users WHERE id = admin_user_id;
    
    RAISE NOTICE '已删除现有的 admin 账号';
  END IF;
END $$;

-- 创建管理员账号
DO $$
DECLARE
  admin_user_id uuid;
  encrypted_password text;
BEGIN
  -- 生成新的 UUID
  admin_user_id := gen_random_uuid();
  
  -- 使用 Supabase Auth 兼容的密码哈希格式
  encrypted_password := crypt('hye19911206', gen_salt('bf'));
  
  -- 插入到 auth.users 表
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    admin_user_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@fleet.com',
    encrypted_password,
    now(),
    '13800000000',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"系统管理员"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
  
  -- 插入到 public.profiles 表
  INSERT INTO public.profiles (
    id,
    phone,
    role,
    real_name,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    '13800000000',
    'super_admin',
    '系统管理员',
    now(),
    now()
  );
  
  RAISE NOTICE '管理员账号创建成功';
  RAISE NOTICE '用户名：admin';
  RAISE NOTICE '密码：hye19911206';
  RAISE NOTICE 'Email：admin@fleet.com';
  RAISE NOTICE '角色：super_admin';
END $$;

-- 验证账号创建
DO $$
DECLARE
  admin_count int;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE role = 'super_admin' AND real_name = '系统管理员';
  
  IF admin_count > 0 THEN
    RAISE NOTICE '✅ 管理员账号验证成功';
  ELSE
    RAISE EXCEPTION '❌ 管理员账号创建失败';
  END IF;
END $$;