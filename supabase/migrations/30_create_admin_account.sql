/*
# 创建超级管理员账号

## 背景
根据用户需求，创建一个超级管理员账号，用于系统管理。

## 账号信息
- 手机号：admin
- 邮箱：admin@fleet.com
- 密码：admin123
- 角色：super_admin

## 实现方式
由于 Supabase Auth 的密码加密机制，我们使用以下方式创建账号：
1. 使用 Supabase 的 crypt 扩展来加密密码
2. 在 auth.users 表中创建用户记录
3. 在 profiles 表中创建对应的档案记录

## 注意事项
- 密码使用 bcrypt 加密存储
- 账号创建后可以立即使用手机号和密码登录
- 建议首次登录后修改密码
*/

-- ============================================
-- 确保 pgcrypto 扩展已启用
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 创建 auth.users 记录
-- ============================================

-- 插入到 auth.users 表
-- 密码: admin123
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
  crypt('admin123', gen_salt('bf')), -- 使用 bcrypt 加密密码
  NOW(),
  'admin',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"phone","providers":["phone"]}'::jsonb,
  '{}'::jsonb,
  false
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('admin123', gen_salt('bf')),
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  phone_confirmed_at = NOW(),
  email_confirmed_at = NOW(),
  updated_at = NOW();

-- ============================================
-- 创建 profiles 记录
-- ============================================

INSERT INTO profiles (
  id,
  phone,
  email,
  role,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin',
  'admin@fleet.com',
  'super_admin'::user_role,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = NOW();

-- ============================================
-- 验证
-- ============================================

-- 查看创建的账号
-- SELECT id, phone, email, role, created_at 
-- FROM profiles 
-- WHERE phone = 'admin';
