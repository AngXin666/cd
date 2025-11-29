/*
# 重构数据库为单用户系统架构 V3

## 概述
将多租户架构重构为单用户系统架构

## 新表结构
- users, user_roles, departments, warehouses, vehicles, attendance, leave_requests, piecework_records, notifications

## RLS 策略
- BOSS 全权限
- DISPATCHER 部分权限
- DRIVER 自己的数据
*/

-- 备份数据
CREATE TEMP TABLE IF NOT EXISTS temp_profiles AS SELECT * FROM profiles;
CREATE TEMP TABLE IF NOT EXISTS temp_vehicles AS SELECT * FROM vehicles;
CREATE TEMP TABLE IF NOT EXISTS temp_warehouses AS SELECT * FROM warehouses;
CREATE TEMP TABLE IF NOT EXISTS temp_attendance AS SELECT * FROM attendance;
CREATE TEMP TABLE IF NOT EXISTS temp_piece_work AS SELECT * FROM piece_work_records;
CREATE TEMP TABLE IF NOT EXISTS temp_leave AS SELECT * FROM leave_applications;
CREATE TEMP TABLE IF NOT EXISTS temp_notif AS SELECT * FROM notifications;

-- 删除 RLS
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 删除旧表
DROP TABLE IF EXISTS tenants, user_credentials, system_admins, user_permissions, notification_config, 
  cross_schema_access_logs, permission_audit_logs, security_audit_log, user_behavior_logs, 
  user_feature_weights, system_performance_metrics, driver_warehouses, manager_warehouses, 
  profiles, vehicles, warehouses, attendance, piece_work_records, leave_applications, 
  resignation_applications, notifications, notification_templates, notification_send_records, 
  scheduled_notifications, auto_reminder_rules, attendance_rules, category_prices, 
  driver_licenses, feedback, lease_bills, leases, vehicle_leases, vehicle_records CASCADE;

DROP TYPE IF EXISTS user_role, driver_type, peer_account_permission CASCADE;

-- 创建枚举
CREATE TYPE user_role AS ENUM ('BOSS', 'DISPATCHER', 'DRIVER');

-- 创建表
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, department_id)
);

CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE warehouse_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, user_id)
);

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

-- 迁移数据
INSERT INTO users (id, phone, email, name, avatar_url, created_at, updated_at)
SELECT id, phone, email, COALESCE(name, phone, email, 'User'), avatar_url, created_at, updated_at
FROM temp_profiles ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT p.id,
  CASE 
    WHEN p.role::text IN ('super_admin', 'fleet_leader') THEN 'BOSS'::user_role
    WHEN p.role::text IN ('peer', 'dispatcher') THEN 'DISPATCHER'::user_role
    ELSE 'DRIVER'::user_role
  END
FROM temp_profiles p ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO warehouses (id, name, address, created_at, updated_at)
SELECT id, name, address, created_at, updated_at FROM temp_warehouses ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (id, plate_number, vehicle_type, driver_id, status, created_at, updated_at)
SELECT id, plate_number, vehicle_type, driver_id, COALESCE(status, 'available'), created_at, updated_at
FROM temp_vehicles WHERE plate_number IS NOT NULL ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO attendance (id, user_id, date, clock_in_time, clock_out_time, warehouse_id, status, notes, created_at)
SELECT id, driver_id, date, clock_in_time, clock_out_time, warehouse_id, COALESCE(status, 'normal'), notes, created_at
FROM temp_attendance WHERE driver_id IS NOT NULL ON CONFLICT (user_id, date) DO NOTHING;

INSERT INTO piecework_records (id, user_id, date, warehouse_id, category, quantity, unit_price, total_amount, notes, created_at, updated_at)
SELECT id, driver_id, date, warehouse_id, category, quantity, unit_price, total_amount, notes, created_at, updated_at
FROM temp_piece_work WHERE driver_id IS NOT NULL;

INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, reason, status, approver_id, approved_at, created_at, updated_at)
SELECT id, driver_id, leave_type, start_date, end_date, reason, COALESCE(status, 'pending'), approver_id, approved_at, created_at, updated_at
FROM temp_leave WHERE driver_id IS NOT NULL;

INSERT INTO notifications (id, title, content, type, sender_id, recipient_id, is_read, created_at)
SELECT id, title, content, COALESCE(type, 'system'), sender_id, recipient_id, COALESCE(is_read, FALSE), created_at
FROM temp_notif;

-- 创建函数
CREATE OR REPLACE FUNCTION get_current_user_roles() RETURNS SETOF user_role LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_boss() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'BOSS');
$$;

CREATE OR REPLACE FUNCTION is_dispatcher() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('BOSS', 'DISPATCHER'));
$$;

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE user_count INTEGER;
BEGIN
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    SELECT COUNT(*) INTO user_count FROM users;
    INSERT INTO users (id, phone, email, name)
    VALUES (NEW.id, NEW.phone, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.phone, NEW.email, 'User'))
    ON CONFLICT (id) DO NOTHING;
    IF user_count = 0 THEN
      INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'BOSS'::user_role) ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'DRIVER'::user_role) ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS 策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BOSS 可以查看所有用户" ON users FOR SELECT TO authenticated USING (is_boss());
CREATE POLICY "DISPATCHER 可以查看所有用户" ON users FOR SELECT TO authenticated USING (is_dispatcher());
CREATE POLICY "用户可以查看自己" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "BOSS 可以更新所有用户" ON users FOR UPDATE TO authenticated USING (is_boss());
CREATE POLICY "用户可以更新自己" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BOSS 可以查看所有角色" ON user_roles FOR SELECT TO authenticated USING (is_boss());
CREATE POLICY "用户可以查看自己的角色" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "BOSS 可以管理角色" ON user_roles FOR ALL TO authenticated USING (is_boss());

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "所有人可以查看部门" ON departments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "BOSS 可以管理部门" ON departments FOR ALL TO authenticated USING (is_boss());

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "所有人可以查看仓库" ON warehouses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "BOSS 可以管理仓库" ON warehouses FOR ALL TO authenticated USING (is_boss());

ALTER TABLE warehouse_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "所有人可以查看仓库分配" ON warehouse_assignments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "BOSS 和 DISPATCHER 可以管理仓库分配" ON warehouse_assignments FOR ALL TO authenticated USING (is_dispatcher());

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "所有人可以查看车辆" ON vehicles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "BOSS 可以管理车辆" ON vehicles FOR ALL TO authenticated USING (is_boss());

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BOSS 和 DISPATCHER 可以查看所有考勤" ON attendance FOR SELECT TO authenticated USING (is_dispatcher());
CREATE POLICY "用户可以查看自己的考勤" ON attendance FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "用户可以创建自己的考勤" ON attendance FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "BOSS 可以管理所有考勤" ON attendance FOR ALL TO authenticated USING (is_boss());

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BOSS 和 DISPATCHER 可以查看所有请假" ON leave_requests FOR SELECT TO authenticated USING (is_dispatcher());
CREATE POLICY "用户可以查看自己的请假" ON leave_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "用户可以创建自己的请假" ON leave_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "BOSS 和 DISPATCHER 可以审批请假" ON leave_requests FOR UPDATE TO authenticated USING (is_dispatcher());

ALTER TABLE piecework_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BOSS 和 DISPATCHER 可以查看所有计件" ON piecework_records FOR SELECT TO authenticated USING (is_dispatcher());
CREATE POLICY "用户可以查看自己的计件" ON piecework_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "用户可以创建自己的计件" ON piecework_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "BOSS 可以管理所有计件" ON piecework_records FOR ALL TO authenticated USING (is_boss());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户可以查看发给自己的通知" ON notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "BOSS 和 DISPATCHER 可以发送通知" ON notifications FOR INSERT TO authenticated WITH CHECK (is_dispatcher());
CREATE POLICY "用户可以更新自己的通知" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

-- 创建索引
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
