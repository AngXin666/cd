/*
# 创建普通管理员账号 admin2

## 账号信息
- 用户ID: 00000000-0000-0000-0000-000000000002
- 手机号: admin2
- 邮箱: admin2@fleet.com
- 密码: admin123
- 角色: manager（普通管理员）

## 用途
用于测试普通管理员的权限和功能：
- 仓库管理
- 司机管理
- 考勤管理
- 请假审批
- 计件管理

## 权限范围
普通管理员的权限由以下因素决定：
1. manager_warehouses 表：分配的仓库
2. manager_permissions 表：具体的权限设置
3. RLS 策略：只能访问管辖范围内的数据

## 注意事项
- 创建账号后需要在 manager_warehouses 表中分配仓库
- 创建账号后需要在 manager_permissions 表中设置权限
- 默认没有任何仓库和权限，需要超级管理员分配
*/

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
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'admin2@fleet.com',
  crypt('admin123', gen_salt('bf')), -- 使用 bcrypt 加密密码
  NOW(),
  'admin2',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"phone","providers":["phone"]}'::jsonb,
  '{}'::jsonb,
  false,
  '', -- confirmation_token 设置为空字符串，避免 NULL 转换错误
  '', -- recovery_token 设置为空字符串
  '', -- email_change_token_new 设置为空字符串
  ''  -- email_change 设置为空字符串
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('admin123', gen_salt('bf')),
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  phone_confirmed_at = NOW(),
  email_confirmed_at = NOW(),
  updated_at = NOW(),
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '';

-- ============================================
-- 创建 profiles 记录
-- ============================================

-- 插入到 profiles 表
INSERT INTO profiles (
  id,
  phone,
  email,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'admin2',
  'admin2@fleet.com',
  '普通管理员',
  'manager'::user_role,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- ============================================
-- 创建管理员权限记录（默认所有权限）
-- ============================================

-- 插入到 manager_permissions 表
-- 默认给予所有权限，后续可以由超级管理员调整
INSERT INTO manager_permissions (
  manager_id,
  can_edit_user_info,
  can_edit_piece_work,
  can_manage_attendance_rules,
  can_manage_categories,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  true,  -- 可以编辑用户信息
  true,  -- 可以编辑计件
  true,  -- 可以管理考勤规则
  true,  -- 可以管理品类
  NOW(),
  NOW()
) ON CONFLICT (manager_id) DO UPDATE SET
  can_edit_user_info = EXCLUDED.can_edit_user_info,
  can_edit_piece_work = EXCLUDED.can_edit_piece_work,
  can_manage_attendance_rules = EXCLUDED.can_manage_attendance_rules,
  can_manage_categories = EXCLUDED.can_manage_categories,
  updated_at = NOW();

-- ============================================
-- 验证
-- ============================================

-- 查看创建的账号信息
-- SELECT 
--   p.id,
--   p.phone,
--   p.email,
--   p.name,
--   p.role,
--   mp.can_edit_user_info,
--   mp.can_edit_piece_work,
--   mp.can_manage_attendance_rules,
--   mp.can_manage_categories
-- FROM profiles p
-- LEFT JOIN manager_permissions mp ON p.id = mp.manager_id
-- WHERE p.id = '00000000-0000-0000-0000-000000000002';

-- 预期结果：
-- id: 00000000-0000-0000-0000-000000000002
-- phone: admin2
-- email: admin2@fleet.com
-- name: 普通管理员
-- role: manager
-- 所有权限字段: true
