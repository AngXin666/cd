/*
# 第二步修正：删除旧枚举，创建新枚举，迁移数据

## 策略
1. 删除旧的 user_role 枚举类型
2. 创建新的 user_role 枚举类型（BOSS/DISPATCHER/DRIVER）
3. 迁移数据
*/

-- 1. 删除旧的枚举类型（CASCADE 会删除依赖它的列）
DROP TYPE IF EXISTS user_role CASCADE;

-- 2. 创建新的枚举类型
CREATE TYPE user_role AS ENUM ('BOSS', 'DISPATCHER', 'DRIVER');

-- 3. 重新创建 user_roles 表（因为被 CASCADE 删除了）
DROP TABLE IF EXISTS user_roles CASCADE;

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- 4. 迁移用户数据
INSERT INTO users (id, phone, email, name, avatar_url, created_at, updated_at)
SELECT 
  id,
  phone,
  email,
  COALESCE(name, phone, email, 'User') as name,
  avatar_url,
  created_at,
  updated_at
FROM profiles
ON CONFLICT (id) DO NOTHING;

-- 5. 迁移用户角色
INSERT INTO user_roles (user_id, role)
SELECT 
  id,
  CASE 
    WHEN role::text IN ('super_admin', 'fleet_leader', 'boss') THEN 'BOSS'::user_role
    WHEN role::text IN ('peer', 'dispatcher', 'peer_admin', 'manager') THEN 'DISPATCHER'::user_role
    ELSE 'DRIVER'::user_role
  END as mapped_role
FROM profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. 迁移仓库数据
INSERT INTO new_warehouses (id, name, created_at, updated_at)
SELECT 
  id,
  name,
  created_at,
  updated_at
FROM warehouses
ON CONFLICT (id) DO NOTHING;

-- 7. 迁移车辆数据
INSERT INTO new_vehicles (id, plate_number, vehicle_type, driver_id, status, created_at, updated_at)
SELECT 
  id,
  plate_number,
  vehicle_type,
  driver_id,
  COALESCE(status, 'available') as status,
  created_at,
  updated_at
FROM vehicles
WHERE plate_number IS NOT NULL
ON CONFLICT (plate_number) DO NOTHING;

-- 8. 迁移考勤数据（work_date → date）
INSERT INTO new_attendance (id, user_id, date, clock_in_time, clock_out_time, warehouse_id, status, notes, created_at)
SELECT 
  id,
  user_id,
  work_date as date,
  clock_in_time,
  clock_out_time,
  warehouse_id,
  COALESCE(status, 'normal') as status,
  notes,
  created_at
FROM attendance
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, date) DO NOTHING;

-- 9. 迁移计件记录（driver_id → user_id）
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
FROM piece_work_records
WHERE driver_id IS NOT NULL;

-- 10. 迁移请假申请（driver_id → user_id）
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
FROM leave_applications
WHERE driver_id IS NOT NULL;

-- 11. 迁移通知数据
INSERT INTO new_notifications (id, title, content, type, sender_id, recipient_id, is_read, created_at)
SELECT 
  id,
  title,
  content,
  COALESCE(type, 'system') as type,
  sender_id,
  recipient_id,
  COALESCE(is_read, FALSE) as is_read,
  created_at
FROM notifications;

-- 12. 重新创建索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
