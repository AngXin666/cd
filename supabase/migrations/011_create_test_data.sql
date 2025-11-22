/*
# 创建测试数据

## 说明
创建测试用户和基础数据，用于开发和测试。

## 测试账号

### 1. 超级管理员
- 手机号：13800000001
- 密码：123456
- 角色：super_admin

### 2. 管理员
- 手机号：13800000002
- 密码：123456
- 角色：manager

### 3. 司机（纯司机）
- 手机号：13800000003
- 密码：123456
- 角色：driver
- 类型：pure

### 4. 司机（带车司机）
- 手机号：13800000004
- 密码：123456
- 角色：driver
- 类型：with_vehicle

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
  last_sign_in_at,
  confirmed_at
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
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 管理员
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
  last_sign_in_at,
  confirmed_at
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
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 司机1（纯司机）
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
  last_sign_in_at,
  confirmed_at
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
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 司机2（带车司机）
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
  last_sign_in_at,
  confirmed_at
)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  NULL,
  crypt('123456', gen_salt('bf')),
  now(),
  '13800000004',
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
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 创建测试用户资料（profiles）
-- ============================================

-- 超级管理员
INSERT INTO profiles (id, phone, name, role, login_account, join_date)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '13800000001',
  '超级管理员',
  'super_admin'::user_role,
  'admin',
  CURRENT_DATE
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  login_account = EXCLUDED.login_account;

-- 管理员
INSERT INTO profiles (id, phone, name, role, login_account, join_date)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '13800000002',
  '张经理',
  'manager'::user_role,
  'manager01',
  CURRENT_DATE
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  login_account = EXCLUDED.login_account;

-- 司机1（纯司机）
INSERT INTO profiles (id, phone, name, role, driver_type, login_account, join_date)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '13800000003',
  '李师傅',
  'driver'::user_role,
  'pure'::driver_type,
  'driver01',
  CURRENT_DATE
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  driver_type = EXCLUDED.driver_type,
  login_account = EXCLUDED.login_account;

-- 司机2（带车司机）
INSERT INTO profiles (id, phone, name, role, driver_type, vehicle_plate, login_account, join_date)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  '13800000004',
  '王师傅',
  'driver'::user_role,
  'with_vehicle'::driver_type,
  '京A12345',
  'driver02',
  CURRENT_DATE
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  driver_type = EXCLUDED.driver_type,
  vehicle_plate = EXCLUDED.vehicle_plate,
  login_account = EXCLUDED.login_account;

-- ============================================
-- 创建测试仓库
-- ============================================

INSERT INTO warehouses (id, name, is_active, max_leave_days, resignation_notice_days, daily_target)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '北京仓库', true, 30, 30, 100),
  ('10000000-0000-0000-0000-000000000002', '上海仓库', true, 30, 30, 150)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  max_leave_days = EXCLUDED.max_leave_days,
  resignation_notice_days = EXCLUDED.resignation_notice_days,
  daily_target = EXCLUDED.daily_target;

-- ============================================
-- 创建司机-仓库关联
-- ============================================

INSERT INTO driver_warehouses (driver_id, warehouse_id)
VALUES 
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002')
ON CONFLICT (driver_id, warehouse_id) DO NOTHING;

-- ============================================
-- 创建管理员-仓库关联
-- ============================================

INSERT INTO manager_warehouses (manager_id, warehouse_id)
VALUES 
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (manager_id, warehouse_id) DO NOTHING;

-- ============================================
-- 创建考勤规则
-- ============================================

INSERT INTO attendance_rules (warehouse_id, work_start_time, work_end_time, late_threshold, early_threshold, require_clock_out, is_active)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '08:00:00', '18:00:00', 15, 15, true, true),
  ('10000000-0000-0000-0000-000000000002', '09:00:00', '18:00:00', 15, 15, true, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 创建价格分类
-- ============================================

INSERT INTO category_prices (warehouse_id, category_name, unit_price, upstairs_price, sorting_unit_price, is_active)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '标准件', 1.5, 0.5, 0.3, true),
  ('10000000-0000-0000-0000-000000000001', '大件', 2.5, 1.0, 0.5, true),
  ('10000000-0000-0000-0000-000000000001', '小件', 1.0, 0.3, 0.2, true),
  ('10000000-0000-0000-0000-000000000002', '标准件', 1.8, 0.6, 0.4, true),
  ('10000000-0000-0000-0000-000000000002', '大件', 3.0, 1.2, 0.6, true),
  ('10000000-0000-0000-0000-000000000002', '小件', 1.2, 0.4, 0.3, true)
ON CONFLICT (warehouse_id, category_name) DO UPDATE SET
  unit_price = EXCLUDED.unit_price,
  upstairs_price = EXCLUDED.upstairs_price,
  sorting_unit_price = EXCLUDED.sorting_unit_price,
  is_active = EXCLUDED.is_active;
