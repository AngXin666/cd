/*
# 第二步安全迁移：先备份角色为文本，再迁移

## 策略
1. 在 profiles 表中添加临时文本列保存角色
2. 删除旧枚举类型
3. 创建新枚举类型
4. 迁移数据
*/

-- 1. 在 profiles 表中添加临时文本列
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_text TEXT;

-- 2. 将角色值复制到文本列
UPDATE profiles SET role_text = role::text WHERE role_text IS NULL;

-- 3. 删除旧的枚举类型
DROP TYPE IF EXISTS user_role CASCADE;

-- 4. 创建新的枚举类型
CREATE TYPE user_role AS ENUM ('BOSS', 'DISPATCHER', 'DRIVER');

-- 5. 重新创建 user_roles 表
DROP TABLE IF EXISTS user_roles CASCADE;

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- 6. 迁移用户数据
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

-- 7. 迁移用户角色（使用 role_text）
INSERT INTO user_roles (user_id, role)
SELECT 
  id,
  CASE 
    WHEN role_text IN ('super_admin', 'fleet_leader', 'boss') THEN 'BOSS'::user_role
    WHEN role_text IN ('peer', 'dispatcher', 'peer_admin', 'manager') THEN 'DISPATCHER'::user_role
    ELSE 'DRIVER'::user_role
  END as mapped_role
FROM profiles
WHERE role_text IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. 迁移仓库数据
INSERT INTO new_warehouses (id, name, created_at, updated_at)
SELECT 
  id,
  name,
  created_at,
  updated_at
FROM warehouses
ON CONFLICT (id) DO NOTHING;

-- 9. 迁移车辆数据
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

-- 10. 迁移考勤数据
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

-- 11. 迁移计件记录
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

-- 12. 迁移请假申请
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

-- 13. 迁移通知数据
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

-- 14. 重新创建索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
