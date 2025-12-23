/*
# 创建测试账号

## 说明
直接在数据库中创建测试账号，包括：
1. 在 auth.users 表中创建认证用户
2. 在 users 表中创建用户信息
3. 在 user_roles 表中分配角色

## 测试账号列表
- admin (13800000000) - BOSS（老板）
- admin1 (13800000001) - DISPATCHER（车队长）
- admin2 (13800000002) - DRIVER（司机）
- admin3 (13800000003) - DISPATCHER（平级账号）

## 密码
所有测试账号的密码都是：admin123
密码哈希使用 bcrypt 算法
*/

-- 1. 在 auth.users 表中创建测试用户
-- 注意：密码哈希是 'admin123' 的 bcrypt 哈希值
-- 使用 crypt('admin123', gen_salt('bf')) 生成

-- admin - 老板
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
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (phone) DO NOTHING;

-- admin1 - 车队长
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
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (phone) DO NOTHING;

-- admin2 - 司机
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
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (phone) DO NOTHING;

-- admin3 - 平级账号
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
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (phone) DO NOTHING;

-- 2. 在 users 表中创建用户信息
-- 使用 auth.users 的 id

-- admin - 老板
INSERT INTO users (id, phone, email, name, created_at, updated_at)
SELECT 
  id,
  '13800000000',
  'admin@fleet.local',
  'admin（老板）',
  NOW(),
  NOW()
FROM auth.users
WHERE phone = '13800000000'
ON CONFLICT (id) DO NOTHING;

-- admin1 - 车队长
INSERT INTO users (id, phone, email, name, created_at, updated_at)
SELECT 
  id,
  '13800000001',
  'admin1@fleet.local',
  'admin1（车队长）',
  NOW(),
  NOW()
FROM auth.users
WHERE phone = '13800000001'
ON CONFLICT (id) DO NOTHING;

-- admin2 - 司机
INSERT INTO users (id, phone, email, name, created_at, updated_at)
SELECT 
  id,
  '13800000002',
  'admin2@fleet.local',
  'admin2（司机）',
  NOW(),
  NOW()
FROM auth.users
WHERE phone = '13800000002'
ON CONFLICT (id) DO NOTHING;

-- admin3 - 平级账号
INSERT INTO users (id, phone, email, name, created_at, updated_at)
SELECT 
  id,
  '13800000003',
  'admin3@fleet.local',
  'admin3（平级账号）',
  NOW(),
  NOW()
FROM auth.users
WHERE phone = '13800000003'
ON CONFLICT (id) DO NOTHING;

-- 3. 在 user_roles 表中分配角色

-- admin - BOSS
INSERT INTO user_roles (user_id, role, created_at)
SELECT 
  id,
  'BOSS'::user_role,
  NOW()
FROM auth.users
WHERE phone = '13800000000'
ON CONFLICT (user_id, role) DO NOTHING;

-- admin1 - DISPATCHER
INSERT INTO user_roles (user_id, role, created_at)
SELECT 
  id,
  'DISPATCHER'::user_role,
  NOW()
FROM auth.users
WHERE phone = '13800000001'
ON CONFLICT (user_id, role) DO NOTHING;

-- admin2 - DRIVER
INSERT INTO user_roles (user_id, role, created_at)
SELECT 
  id,
  'DRIVER'::user_role,
  NOW()
FROM auth.users
WHERE phone = '13800000002'
ON CONFLICT (user_id, role) DO NOTHING;

-- admin3 - DISPATCHER
INSERT INTO user_roles (user_id, role, created_at)
SELECT 
  id,
  'DISPATCHER'::user_role,
  NOW()
FROM auth.users
WHERE phone = '13800000003'
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. 验证创建结果
-- 查询所有测试账号
SELECT 
  u.phone,
  u.name,
  ur.role,
  u.created_at
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.phone IN ('13800000000', '13800000001', '13800000002', '13800000003')
ORDER BY u.phone;