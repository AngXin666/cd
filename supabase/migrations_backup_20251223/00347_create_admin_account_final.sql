/*
# 创建中央管理系统管理员账号

## 账号信息
- 手机号：13800000001
- 密码：hye19911206
- 姓名：中央管理员

## 说明
直接在 auth.users 表中创建用户，密码使用 bcrypt 加密
*/

-- 1. 创建 auth.users 记录
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'central-admin@system.local',
  crypt('hye19911206', gen_salt('bf')),
  NOW(),
  '13800000001',
  NOW(),
  '{"provider":"phone","providers":["phone"]}',
  '{"name":"中央管理员","role":"central_admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (phone) DO NOTHING
RETURNING id, phone, email;
