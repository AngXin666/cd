-- =====================================================
-- 创建admin4测试账号
-- =====================================================
-- 账号: admin4
-- 密码: 123456
-- 手机号: 13800000004
-- 角色: DRIVER (司机)
-- =====================================================

-- 删除旧账号（如果存在）
DELETE FROM users WHERE phone = '13800000004';
DELETE FROM auth.users WHERE phone = '13800000004';

-- 1. 创建 auth.users 记录
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
  '13800000004@phone.local',
  crypt('123456', gen_salt('bf')),
  NOW(),
  '13800000004',
  NOW(),
  '{"name": "admin4（司机）"}'::jsonb,
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- 2. 在 users 表中创建用户信息(包含角色)
INSERT INTO users (id, phone, email, name, login_account, role, created_at, updated_at)
SELECT 
  id,
  '13800000004',
  'admin4@fleet.local',
  'admin4（司机）',
  'admin4',
  'DRIVER'::user_role,
  NOW(),
  NOW()
FROM auth.users
WHERE phone = '13800000004';

-- 3. 验证账号创建
SELECT 
  u.id,
  u.phone,
  u.email,
  u.name,
  u.login_account,
  u.role
FROM auth.users au
JOIN users u ON au.id = u.id
WHERE au.phone = '13800000004';
