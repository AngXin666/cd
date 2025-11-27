/*
# 直接创建中央管理系统管理员账号

## 账号信息
- 手机号：13800000001
- 密码：hye19911206
- 姓名：中央管理员

## 说明
使用 Supabase 的 auth 扩展函数直接创建用户
*/

-- 使用 Supabase Auth 扩展创建用户
-- 注意：密码需要使用 crypt 函数加密
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
RETURNING id, phone, email;

-- 获取刚创建的用户ID并插入到 system_admins 表
INSERT INTO system_admins (id, name, email, phone, status)
SELECT 
  id,
  '中央管理员',
  'central-admin@system.local',
  '13800000001',
  'active'
FROM auth.users
WHERE phone = '13800000001'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status;
