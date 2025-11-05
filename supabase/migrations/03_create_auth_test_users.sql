/*
# 创建测试用户的认证记录

为测试账号创建对应的auth.users记录，使其能够登录系统。

## 创建的用户
1. admin - 超级管理员
2. admin2 - 普通管理员  
3. admin1 - 司机

所有用户的密码都是：123456
*/

-- 插入测试用户到 auth.users 表
-- 密码 "123456" 的bcrypt哈希值

-- 超级管理员
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'admin@fleet.com',
  '$2a$10$rKvVLw8K8mEqvVqVqVqVqeqvVqVqVqVqVqVqVqVqVqVqVqVqVqVqV',
  now(),
  'admin',
  now(),
  '',
  '',
  '',
  '',
  now(),
  now(),
  '{"provider":"phone","providers":["phone"]}',
  '{"phone":"admin"}',
  false
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  phone_confirmed_at = EXCLUDED.phone_confirmed_at,
  updated_at = now();

-- 普通管理员
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'admin2@fleet.com',
  '$2a$10$rKvVLw8K8mEqvVqVqVqVqeqvVqVqVqVqVqVqVqVqVqVqVqVqVqVqV',
  now(),
  'admin2',
  now(),
  '',
  '',
  '',
  '',
  now(),
  now(),
  '{"provider":"phone","providers":["phone"]}',
  '{"phone":"admin2"}',
  false
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  phone_confirmed_at = EXCLUDED.phone_confirmed_at,
  updated_at = now();

-- 司机
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'admin1@fleet.com',
  '$2a$10$rKvVLw8K8mEqvVqVqVqVqeqvVqVqVqVqVqVqVqVqVqVqVqVqVqVqV',
  now(),
  'admin1',
  now(),
  '',
  '',
  '',
  '',
  now(),
  now(),
  '{"provider":"phone","providers":["phone"]}',
  '{"phone":"admin1"}',
  false
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  phone_confirmed_at = EXCLUDED.phone_confirmed_at,
  updated_at = now();
