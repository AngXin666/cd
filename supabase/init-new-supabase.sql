/*
# 新Supabase项目初始化SQL
# 
# 使用方法:
# 1. 在Supabase后台 -> SQL Editor -> New query
# 2. 复制本文件全部内容
# 3. 点击 Run 执行
# 
# 执行完成后，系统会自动创建所有必要的表和配置
*/

-- ==========================================
-- 1. 创建枚举类型
-- ==========================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('BOSS', 'MANAGER', 'DRIVER', 'DISPATCHER', 'PEER_ADMIN', 'SCHEDULER');
  END IF;
END $$;

-- ==========================================
-- 2. 创建 users 表 (核心表)
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'DRIVER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==========================================
-- 3. 创建其他核心表
-- ==========================================

-- 仓库表
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 车辆表
CREATE TABLE IF NOT EXISTS vehicles (
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

-- 考勤表
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'normal',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, work_date)
);

-- 请假申请表
CREATE TABLE IF NOT EXISTS leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 计件记录表
CREATE TABLE IF NOT EXISTS piece_work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(10, 2),
  total_amount NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. 创建索引
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_leave_applications_user_id ON leave_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_user_id ON piece_work_records(user_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_date ON piece_work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ==========================================
-- 5. 启用RLS (行级安全)
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE piece_work_records ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. 创建基础RLS策略
-- ==========================================

-- Users表策略：所有认证用户可以查看
CREATE POLICY "users_select_policy" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Users表策略：用户可以更新自己的信息
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Warehouses表策略：所有认证用户可以查看
CREATE POLICY "warehouses_select_policy" ON warehouses
  FOR SELECT
  TO authenticated
  USING (true);

-- Vehicles表策略：所有认证用户可以查看
CREATE POLICY "vehicles_select_policy" ON vehicles
  FOR SELECT
  TO authenticated
  USING (true);

-- Attendance表策略：用户可以查看自己的考勤
CREATE POLICY "attendance_select_own" ON attendance
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Leave Applications表策略：用户可以查看自己的请假
CREATE POLICY "leave_applications_select_own" ON leave_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Notifications表策略：用户只能查看发给自己的通知
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- Piece Work Records表策略：用户可以查看自己的记录
CREATE POLICY "piece_work_records_select_own" ON piece_work_records
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- 7. 创建辅助函数
-- ==========================================

-- 检查用户角色的函数
CREATE OR REPLACE FUNCTION is_boss_v2(uid uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = uid AND role = 'BOSS'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION is_manager_v2(uid uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = uid AND role = 'MANAGER'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION is_driver_v2(uid uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = uid AND role = 'DRIVER'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM users WHERE id = uid;
$$;

-- ==========================================
-- 8. 完成
-- ==========================================
-- 数据库初始化完成
