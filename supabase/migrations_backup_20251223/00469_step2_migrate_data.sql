/*
# 第二步：迁移数据（使用正确的列名映射）

## 列名映射
- profiles.role → users + user_roles
- attendance.user_id → new_attendance.user_id（保持不变）
- attendance.work_date → new_attendance.date
- piece_work_records.driver_id → piecework_records.user_id
- leave_applications.driver_id → leave_requests.user_id

## 角色映射
- super_admin → BOSS
- fleet_leader → BOSS
- peer → DISPATCHER
- dispatcher → DISPATCHER
- driver → DRIVER
*/

-- 1. 迁移用户数据
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

-- 2. 迁移用户角色
INSERT INTO user_roles (user_id, role)
SELECT 
  id,
  CASE 
    WHEN role::text IN ('super_admin', 'fleet_leader') THEN 'BOSS'::user_role
    WHEN role::text IN ('peer', 'dispatcher') THEN 'DISPATCHER'::user_role
    ELSE 'DRIVER'::user_role
  END as mapped_role
FROM profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. 迁移仓库数据
INSERT INTO new_warehouses (id, name, created_at, updated_at)
SELECT 
  id,
  name,
  created_at,
  updated_at
FROM warehouses
ON CONFLICT (id) DO NOTHING;

-- 4. 迁移车辆数据
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

-- 5. 迁移考勤数据（注意列名映射：work_date → date）
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

-- 6. 迁移计件记录（注意列名映射：driver_id → user_id）
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

-- 7. 迁移请假申请（注意列名映射：driver_id → user_id）
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

-- 8. 迁移通知数据
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
