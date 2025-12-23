/*
# 创建测试数据

## 说明
创建测试用户和基础数据，用于开发和测试。

## 测试账号

### 1. 超级管理员
- 手机号：13800000001
- 密码：123456
- 登录账号：admin
- 角色：super_admin

### 2. 普通管理员
- 手机号：13800000002
- 密码：123456
- 登录账号：admin1
- 角色：manager

### 3. 司机
- 手机号：13800000003
- 密码：123456
- 登录账号：admin2
- 角色：driver
- 类型：pure（纯司机）

## 测试数据
- 2个仓库
- 司机-仓库关联
- 管理员-仓库关联
- 考勤规则
- 价格分类
*/

-- ============================================
-- 创建测试用户（auth.users）
-- ============================================

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
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  last_sign_in_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  NULL,
  crypt('123456', gen_salt('bf')),
  now(),
  '13800000001',
  now(),
  '',
  '',
  '',
  '',
  '{}',
  '{}',
  false,
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

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
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  last_sign_in_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  NULL,
  crypt('123456', gen_salt('bf')),
  now(),
  '13800000002',
  now(),
  '',
  '',
  '',
  '',
  '{}',
  '{}',
  false,
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

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
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  last_sign_in_at
)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  NULL,
  crypt('123456', gen_salt('bf')),
  now(),
  '13800000003',
  now(),
  '',
  '',
  '',
  '',
  '{}',
  '{}',
  false,
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 创建用户配置文件（profiles）
-- ============================================

INSERT INTO profiles (id, phone, email, name, role, driver_type, login_account, created_at, updated_at)
VALUES
  -- 超级管理员
  ('00000000-0000-0000-0000-000000000001', '13800000001', 'admin@example.com', '管理员', 'super_admin', NULL, 'admin', NOW(), NOW()),
  -- 普通管理员
  ('00000000-0000-0000-0000-000000000002', '13800000002', 'admin1@example.com', '管理员1', 'manager', NULL, 'admin1', NOW(), NOW()),
  -- 司机
  ('00000000-0000-0000-0000-000000000003', '13800000003', 'admin2@example.com', '司机', 'driver', 'pure', 'admin2', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 创建测试仓库
-- ============================================

INSERT INTO warehouses (id, name, is_active, max_leave_days, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '北京仓库', true, 10, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000002', '上海仓库', true, 10, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 创建司机-仓库关联
-- ============================================

INSERT INTO driver_warehouses (driver_id, warehouse_id, created_at)
VALUES
  -- 司机关联到北京仓库
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (driver_id, warehouse_id) DO NOTHING;

-- ============================================
-- 创建管理员-仓库关联
-- ============================================

INSERT INTO manager_warehouses (manager_id, warehouse_id, created_at)
VALUES
  -- 管理员1关联到北京仓库
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (manager_id, warehouse_id) DO NOTHING;

-- ============================================
-- 创建考勤规则
-- ============================================

INSERT INTO attendance_rules (id, warehouse_id, work_start_time, work_end_time, late_threshold, early_threshold, require_clock_out, is_active, created_at, updated_at)
VALUES
  -- 北京仓库考勤规则
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '09:00:00', '18:00:00', 15, 15, true, true, NOW(), NOW()),
  -- 上海仓库考勤规则
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '08:30:00', '17:30:00', 10, 10, true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 创建品类价格
-- ============================================

INSERT INTO category_prices (id, warehouse_id, category_name, unit_price, upstairs_price, sorting_unit_price, is_active, created_at, updated_at)
VALUES
  -- 北京仓库品类
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '家电', 50.00, 10.00, 5.00, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '家具', 80.00, 20.00, 8.00, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '日用品', 30.00, 5.00, 3.00, true, NOW(), NOW()),
  -- 上海仓库品类
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '家电', 55.00, 12.00, 6.00, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '家具', 85.00, 22.00, 9.00, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '日用品', 35.00, 6.00, 4.00, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
