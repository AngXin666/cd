/*
# 创建测试账号 v2

## 说明
直接在数据库中创建测试账号，包括：
1. 在 auth.users 表中创建认证用户
2. 触发器会自动在 users 和 user_roles 表中创建记录

## 测试账号列表
- admin (13800000000) - BOSS（老板）
- admin1 (13800000001) - DISPATCHER（车队长）
- admin2 (13800000002) - DRIVER（司机）
- admin3 (13800000003) - DISPATCHER（平级账号）

## 密码
所有测试账号的密码都是：admin123
*/

-- 1. 创建测试用户（触发器会自动创建 users 和 user_roles 记录）

-- admin - 老板
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@fleet.local',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '13800000000',
  NOW(),
  '{"name": "admin（老板）"}'::jsonb,
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (phone) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  phone_confirmed_at = EXCLUDED.phone_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- admin1 - 车队长
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin1@fleet.local',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '13800000001',
  NOW(),
  '{"name": "admin1（车队长）"}'::jsonb,
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (phone) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  phone_confirmed_at = EXCLUDED.phone_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- admin2 - 司机
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin2@fleet.local',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '13800000002',
  NOW(),
  '{"name": "admin2（司机）"}'::jsonb,
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (phone) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  phone_confirmed_at = EXCLUDED.phone_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- admin3 - 平级账号
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin3@fleet.local',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '13800000003',
  NOW(),
  '{"name": "admin3（平级账号）"}'::jsonb,
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (phone) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  phone_confirmed_at = EXCLUDED.phone_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- 2. 手动更新角色（因为触发器只在第一次创建时分配角色）
-- 确保 admin 是 BOSS
UPDATE user_roles
SET role = 'BOSS'::user_role
WHERE user_id = (SELECT id FROM auth.users WHERE phone = '13800000000');

-- 确保 admin1 是 DISPATCHER
UPDATE user_roles
SET role = 'DISPATCHER'::user_role
WHERE user_id = (SELECT id FROM auth.users WHERE phone = '13800000001');

-- 确保 admin2 是 DRIVER
UPDATE user_roles
SET role = 'DRIVER'::user_role
WHERE user_id = (SELECT id FROM auth.users WHERE phone = '13800000002');

-- 确保 admin3 是 DISPATCHER
UPDATE user_roles
SET role = 'DISPATCHER'::user_role
WHERE user_id = (SELECT id FROM auth.users WHERE phone = '13800000003');