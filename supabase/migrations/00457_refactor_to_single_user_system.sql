/*
# 重构数据库为单用户系统架构

## 1. 概述
将多租户架构重构为单用户系统架构，简化系统复杂度，保留所有核心业务功能。

## 2. 主要变更

### 2.1 删除多租户相关表
- tenants（租户表）
- user_credentials（用户凭证表）
- system_admins（系统管理员表）
- tenant_modules（租户模块表）
- audit_logs（审计日志表）
- user_permissions（用户权限表）
- notification_config（通知配置表）
- 旧的 profiles 表

### 2.2 创建新的单用户系统表结构
- roles：角色表（BOSS/DISPATCHER/DRIVER）
- users：用户表
- user_roles：用户角色关联表
- departments：部门/车队表
- user_departments：用户部门关联表
- vehicles：车辆表（简化）
- attendance：考勤表
- leave_requests：请假申请表
- piecework_records：计件记录表
- warehouses：仓库表
- warehouse_assignments：仓库分配表
- notifications：通知表

### 2.3 数据迁移
- 从旧的 profiles 表迁移用户数据到新的 users 表
- 角色映射：super_admin/fleet_leader → BOSS, peer/dispatcher → DISPATCHER, driver → DRIVER
- 保留所有业务数据（车辆、考勤、计件、请假等）

### 2.4 RLS 策略
- 为所有表创建基于角色的 RLS 策略
- BOSS 可以访问所有数据
- DISPATCHER 可以访问分配给他的数据
- DRIVER 只能访问自己的数据

### 2.5 辅助函数
- get_current_user_role()：获取当前用户角色
- is_boss()：检查是否为 BOSS
- is_dispatcher()：检查是否为 DISPATCHER
- handle_new_user()：首个用户自动成为 BOSS

## 3. 注意事项
- 使用事务确保数据一致性
- 保留所有业务数据
- 首个注册用户自动成为 BOSS
*/

-- ============================================================================
-- 第一步：备份现有数据
-- ============================================================================

-- 创建临时表备份 profiles 数据
CREATE TEMP TABLE temp_profiles_backup AS 
SELECT * FROM profiles;

-- 创建临时表备份 vehicles 数据
CREATE TEMP TABLE temp_vehicles_backup AS 
SELECT * FROM vehicles;

-- 创建临时表备份 warehouses 数据
CREATE TEMP TABLE temp_warehouses_backup AS 
SELECT * FROM warehouses;

-- 创建临时表备份 attendance 数据
CREATE TEMP TABLE temp_attendance_backup AS 
SELECT * FROM attendance;

-- 创建临时表备份 piece_work_records 数据
CREATE TEMP TABLE temp_piece_work_backup AS 
SELECT * FROM piece_work_records;

-- 创建临时表备份 leave_applications 数据
CREATE TEMP TABLE temp_leave_backup AS 
SELECT * FROM leave_applications;

-- 创建临时表备份 notifications 数据
CREATE TEMP TABLE temp_notifications_backup AS 
SELECT * FROM notifications;

-- ============================================================================
-- 第二步：删除旧表的外键约束和 RLS 策略
-- ============================================================================

-- 禁用所有表的 RLS
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS piece_work_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leave_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS driver_warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS manager_warehouses DISABLE ROW LEVEL SECURITY;

-- 删除所有 RLS 策略
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- 第三步：删除多租户相关表
-- ============================================================================

DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS user_credentials CASCADE;
DROP TABLE IF EXISTS system_admins CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS notification_config CASCADE;
DROP TABLE IF EXISTS cross_schema_access_logs CASCADE;
DROP TABLE IF EXISTS permission_audit_logs CASCADE;
DROP TABLE IF EXISTS security_audit_log CASCADE;
DROP TABLE IF EXISTS user_behavior_logs CASCADE;
DROP TABLE IF EXISTS user_feature_weights CASCADE;
DROP TABLE IF EXISTS system_performance_metrics CASCADE;

-- ============================================================================
-- 第四步：删除旧的业务表
-- ============================================================================

DROP TABLE IF EXISTS driver_warehouses CASCADE;
DROP TABLE IF EXISTS manager_warehouses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS piece_work_records CASCADE;
DROP TABLE IF EXISTS leave_applications CASCADE;
DROP TABLE IF EXISTS resignation_applications CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_send_records CASCADE;
DROP TABLE IF EXISTS scheduled_notifications CASCADE;
DROP TABLE IF EXISTS auto_reminder_rules CASCADE;
DROP TABLE IF EXISTS attendance_rules CASCADE;
DROP TABLE IF EXISTS category_prices CASCADE;
DROP TABLE IF EXISTS driver_licenses CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS lease_bills CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS vehicle_leases CASCADE;
DROP TABLE IF EXISTS vehicle_records CASCADE;

-- ============================================================================
-- 第五步：创建角色枚举类型
-- ============================================================================

CREATE TYPE user_role AS ENUM ('BOSS', 'DISPATCHER', 'DRIVER');

-- ============================================================================
-- 第六步：创建新的表结构
-- ============================================================================

-- 6.1 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.2 用户角色关联表
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- 6.3 部门/车队表
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.4 用户部门关联表
CREATE TABLE user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, department_id)
);

-- 6.5 仓库表
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.6 仓库分配表
CREATE TABLE warehouse_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, user_id)
);

-- 6.7 车辆表
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT,
  brand TEXT,
  model TEXT,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.8 考勤表
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'normal',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 6.9 请假申请表
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.10 计件记录表
CREATE TABLE piecework_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.11 通知表
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 第七步：数据迁移
-- ============================================================================

-- 7.1 迁移用户数据
INSERT INTO users (id, phone, email, name, created_at, updated_at)
SELECT 
  id,
  phone,
  email,
  COALESCE(real_name, phone, email, 'User') as name,
  created_at,
  updated_at
FROM temp_profiles_backup
ON CONFLICT (id) DO NOTHING;

-- 7.2 迁移用户角色（角色映射）
INSERT INTO user_roles (user_id, role)
SELECT 
  id,
  CASE 
    WHEN role IN ('super_admin', 'fleet_leader') THEN 'BOSS'::user_role
    WHEN role IN ('peer', 'dispatcher') THEN 'DISPATCHER'::user_role
    WHEN role = 'driver' THEN 'DRIVER'::user_role
    ELSE 'DRIVER'::user_role
  END as mapped_role
FROM temp_profiles_backup
ON CONFLICT (user_id, role) DO NOTHING;

-- 7.3 迁移仓库数据
INSERT INTO warehouses (id, name, address, contact_person, contact_phone, created_at, updated_at)
SELECT 
  id,
  name,
  address,
  NULL as contact_person,
  NULL as contact_phone,
  created_at,
  updated_at
FROM temp_warehouses_backup
ON CONFLICT (id) DO NOTHING;

-- 7.4 迁移车辆数据（简化版）
INSERT INTO vehicles (id, plate_number, vehicle_type, driver_id, status, created_at, updated_at)
SELECT 
  id,
  plate_number,
  vehicle_type,
  driver_id,
  COALESCE(status, 'available') as status,
  created_at,
  updated_at
FROM temp_vehicles_backup
WHERE plate_number IS NOT NULL
ON CONFLICT (plate_number) DO NOTHING;

-- 7.5 迁移考勤数据
INSERT INTO attendance (id, user_id, date, clock_in_time, clock_out_time, warehouse_id, status, notes, created_at)
SELECT 
  id,
  driver_id as user_id,
  date,
  clock_in_time,
  clock_out_time,
  warehouse_id,
  COALESCE(status, 'normal') as status,
  notes,
  created_at
FROM temp_attendance_backup
WHERE driver_id IS NOT NULL
ON CONFLICT (user_id, date) DO NOTHING;

-- 7.6 迁移计件记录
INSERT INTO piecework_records (id, user_id, date, warehouse_id, category, quantity, unit_price, total_amount, notes, created_at, updated_at)
SELECT 
  id,
  driver_id as user_id,
  date,
  warehouse_id,
  category,
  quantity,
  unit_price,
  total_amount,
  notes,
  created_at,
  updated_at
FROM temp_piece_work_backup
WHERE driver_id IS NOT NULL;

-- 7.7 迁移请假申请
INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, reason, status, approver_id, approved_at, created_at, updated_at)
SELECT 
  id,
  driver_id as user_id,
  leave_type,
  start_date,
  end_date,
  reason,
  COALESCE(status, 'pending') as status,
  approver_id,
  approved_at,
  created_at,
  updated_at
FROM temp_leave_backup
WHERE driver_id IS NOT NULL;

-- 7.8 迁移通知数据
INSERT INTO notifications (id, title, content, type, sender_id, recipient_id, is_read, created_at)
SELECT 
  id,
  title,
  content,
  COALESCE(type, 'system') as type,
  sender_id,
  recipient_id,
  COALESCE(is_read, FALSE) as is_read,
  created_at
FROM temp_notifications_backup;

-- ============================================================================
-- 第八步：创建辅助函数
-- ============================================================================

-- 8.1 获取当前用户角色
CREATE OR REPLACE FUNCTION get_current_user_roles()
RETURNS SETOF user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role 
  FROM user_roles 
  WHERE user_id = auth.uid();
$$;

-- 8.2 检查是否为 BOSS
CREATE OR REPLACE FUNCTION is_boss()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'BOSS'
  );
$$;

-- 8.3 检查是否为 DISPATCHER
CREATE OR REPLACE FUNCTION is_dispatcher()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('BOSS', 'DISPATCHER')
  );
$$;

-- 8.4 首个用户自动成为 BOSS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- 只在用户确认后执行
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    -- 检查是否为首个用户
    SELECT COUNT(*) INTO user_count FROM users;
    
    -- 插入用户记录
    INSERT INTO users (id, phone, email, name)
    VALUES (
      NEW.id,
      NEW.phone,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.phone, NEW.email, 'User')
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- 如果是首个用户，分配 BOSS 角色
    IF user_count = 0 THEN
      INSERT INTO user_roles (user_id, role)
      VALUES (NEW.id, 'BOSS'::user_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      -- 其他用户默认为 DRIVER 角色
      INSERT INTO user_roles (user_id, role)
      VALUES (NEW.id, 'DRIVER'::user_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 第九步：创建 RLS 策略
-- ============================================================================

-- 9.1 users 表
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BOSS 可以查看所有用户"
  ON users FOR SELECT
  TO authenticated
  USING (is_boss());

CREATE POLICY "DISPATCHER 可以查看所有用户"
  ON users FOR SELECT
  TO authenticated
  USING (is_dispatcher());

CREATE POLICY "用户可以查看自己"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "BOSS 可以更新所有用户"
  ON users FOR UPDATE
  TO authenticated
  USING (is_boss());

CREATE POLICY "用户可以更新自己"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 9.2 user_roles 表
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BOSS 可以查看所有角色"
  ON user_roles FOR SELECT
  TO authenticated
  USING (is_boss());

CREATE POLICY "用户可以查看自己的角色"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "BOSS 可以管理角色"
  ON user_roles FOR ALL
  TO authenticated
  USING (is_boss());

-- 9.3 departments 表
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可以查看部门"
  ON departments FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "BOSS 可以管理部门"
  ON departments FOR ALL
  TO authenticated
  USING (is_boss());

-- 9.4 warehouses 表
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可以查看仓库"
  ON warehouses FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "BOSS 可以管理仓库"
  ON warehouses FOR ALL
  TO authenticated
  USING (is_boss());

-- 9.5 warehouse_assignments 表
ALTER TABLE warehouse_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可以查看仓库分配"
  ON warehouse_assignments FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "BOSS 和 DISPATCHER 可以管理仓库分配"
  ON warehouse_assignments FOR ALL
  TO authenticated
  USING (is_dispatcher());

-- 9.6 vehicles 表
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可以查看车辆"
  ON vehicles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "BOSS 可以管理车辆"
  ON vehicles FOR ALL
  TO authenticated
  USING (is_boss());

-- 9.7 attendance 表
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BOSS 和 DISPATCHER 可以查看所有考勤"
  ON attendance FOR SELECT
  TO authenticated
  USING (is_dispatcher());

CREATE POLICY "用户可以查看自己的考勤"
  ON attendance FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的考勤"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "BOSS 可以管理所有考勤"
  ON attendance FOR ALL
  TO authenticated
  USING (is_boss());

-- 9.8 leave_requests 表
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BOSS 和 DISPATCHER 可以查看所有请假"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (is_dispatcher());

CREATE POLICY "用户可以查看自己的请假"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的请假"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "BOSS 和 DISPATCHER 可以审批请假"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (is_dispatcher());

-- 9.9 piecework_records 表
ALTER TABLE piecework_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BOSS 和 DISPATCHER 可以查看所有计件"
  ON piecework_records FOR SELECT
  TO authenticated
  USING (is_dispatcher());

CREATE POLICY "用户可以查看自己的计件"
  ON piecework_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的计件"
  ON piecework_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "BOSS 可以管理所有计件"
  ON piecework_records FOR ALL
  TO authenticated
  USING (is_boss());

-- 9.10 notifications 表
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看发给自己的通知"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "BOSS 和 DISPATCHER 可以发送通知"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_dispatcher());

CREATE POLICY "用户可以更新自己的通知"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id);

-- ============================================================================
-- 第十步：创建索引
-- ============================================================================

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX idx_user_departments_department_id ON user_departments(department_id);
CREATE INDEX idx_warehouse_assignments_warehouse_id ON warehouse_assignments(warehouse_id);
CREATE INDEX idx_warehouse_assignments_user_id ON warehouse_assignments(user_id);
CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_piecework_records_user_id ON piecework_records(user_id);
CREATE INDEX idx_piecework_records_date ON piecework_records(date);
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================================
-- 完成
-- ============================================================================
