/*
# 第二步：带外键检查的数据迁移

## 策略
- 只迁移在 users 表中存在的用户的数据
- 使用 INNER JOIN 确保外键约束
*/

-- 1. 在 profiles 表中添加临时文本列
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_text TEXT;

-- 2. 将角色值复制到文本列
UPDATE profiles SET role_text = role::text WHERE role_text IS NULL AND role IS NOT NULL;

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

-- 7. 迁移用户角色
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

-- 9. 迁移车辆数据（只迁移 driver_id 在 users 表中存在的）
INSERT INTO new_vehicles (id, plate_number, vehicle_type, driver_id, status, created_at, updated_at)
SELECT 
  v.id,
  v.plate_number,
  v.vehicle_type,
  v.driver_id,
  COALESCE(v.status, 'available') as status,
  v.created_at,
  v.updated_at
FROM vehicles v
LEFT JOIN users u ON v.driver_id = u.id
WHERE v.plate_number IS NOT NULL 
  AND (v.driver_id IS NULL OR u.id IS NOT NULL)
ON CONFLICT (plate_number) DO NOTHING;

-- 10. 迁移考勤数据（只迁移 user_id 在 users 表中存在的）
INSERT INTO new_attendance (id, user_id, date, clock_in_time, clock_out_time, warehouse_id, status, notes, created_at)
SELECT 
  a.id,
  a.user_id,
  a.work_date as date,
  a.clock_in_time,
  a.clock_out_time,
  a.warehouse_id,
  COALESCE(a.status, 'normal') as status,
  a.notes,
  a.created_at
FROM attendance a
INNER JOIN users u ON a.user_id = u.id
ON CONFLICT (user_id, date) DO NOTHING;

-- 11. 迁移计件记录（只迁移 user_id 在 users 表中存在的）
INSERT INTO piecework_records (id, user_id, date, warehouse_id, category, quantity, unit_price, total_amount, notes, created_at, updated_at)
SELECT 
  p.id,
  p.user_id,
  p.work_date as date,
  p.warehouse_id,
  COALESCE(p.category_id::text, 'default') as category,
  p.quantity,
  p.unit_price,
  p.total_amount,
  p.notes,
  p.created_at,
  p.updated_at
FROM piece_work_records p
INNER JOIN users u ON p.user_id = u.id;

-- 12. 迁移请假申请（只迁移 user_id 在 users 表中存在的）
INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, reason, status, approver_id, approved_at, created_at, updated_at)
SELECT 
  l.id,
  l.user_id,
  l.leave_type,
  l.start_date,
  l.end_date,
  l.reason,
  COALESCE(l.status, 'pending') as status,
  l.reviewed_by as approver_id,
  l.reviewed_at as approved_at,
  l.created_at,
  l.updated_at
FROM leave_applications l
INNER JOIN users u ON l.user_id = u.id;

-- 13. 迁移通知数据（只迁移 recipient_id 在 users 表中存在的）
INSERT INTO new_notifications (id, title, content, type, sender_id, recipient_id, is_read, created_at)
SELECT 
  n.id,
  n.title,
  n.content,
  COALESCE(n.type, 'system') as type,
  n.sender_id,
  n.recipient_id,
  COALESCE(n.is_read, FALSE) as is_read,
  n.created_at
FROM notifications n
INNER JOIN users u ON n.recipient_id = u.id;

-- 14. 重新创建索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
