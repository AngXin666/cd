/*
# 修复外键约束：添加 ON UPDATE CASCADE

## 问题描述
当触发器尝试更新 profiles 表的 ID 时，会违反外键约束。

错误信息：
ERROR: update or delete on table "profiles" violates foreign key constraint 
"piece_work_records_user_id_fkey" on table "piece_work_records" (SQLSTATE 23503)

## 原因分析
1. piece_work_records 表有外键约束：user_id -> profiles.id
2. 外键的 update_rule 是 NO ACTION
3. 当触发器更新 profiles.id 时，piece_work_records.user_id 不会自动更新
4. 导致外键约束违反

## 场景
- 用户 A 在 profiles 表中（ID: xxx, phone: 15766121960）
- 用户 A 有 4 条计件记录，user_id = xxx
- auth.users 中有用户 B（ID: yyy, phone: 15766121960）
- 用户 B 登录时，触发器尝试将 profiles.id 从 xxx 更新为 yyy
- 但 piece_work_records 中的 user_id 仍然是 xxx
- 违反外键约束

## 解决方案
修改所有引用 profiles.id 的外键约束，添加 ON UPDATE CASCADE：
1. piece_work_records.user_id
2. attendance_records.user_id
3. leave_requests.user_id
4. vehicles.current_driver_id
5. vehicle_assignments.driver_id
6. 其他所有引用 profiles.id 的外键

这样当 profiles.id 更新时，所有相关表的外键也会自动更新。

## 修改内容
重新创建外键约束，添加 ON UPDATE CASCADE
*/

-- 1. 修复 piece_work_records 表的外键约束
ALTER TABLE piece_work_records
DROP CONSTRAINT IF EXISTS piece_work_records_user_id_fkey;

ALTER TABLE piece_work_records
ADD CONSTRAINT piece_work_records_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 2. 修复 attendance_records 表的外键约束
ALTER TABLE attendance_records
DROP CONSTRAINT IF EXISTS attendance_records_user_id_fkey;

ALTER TABLE attendance_records
ADD CONSTRAINT attendance_records_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 3. 修复 leave_requests 表的外键约束
ALTER TABLE leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey;

ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 4. 修复 vehicles 表的外键约束
ALTER TABLE vehicles
DROP CONSTRAINT IF EXISTS vehicles_current_driver_id_fkey;

ALTER TABLE vehicles
ADD CONSTRAINT vehicles_current_driver_id_fkey
FOREIGN KEY (current_driver_id) REFERENCES profiles(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 5. 修复 vehicle_assignments 表的外键约束
ALTER TABLE vehicle_assignments
DROP CONSTRAINT IF EXISTS vehicle_assignments_driver_id_fkey;

ALTER TABLE vehicle_assignments
ADD CONSTRAINT vehicle_assignments_driver_id_fkey
FOREIGN KEY (driver_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 6. 修复 manager_warehouses 表的外键约束
ALTER TABLE manager_warehouses
DROP CONSTRAINT IF EXISTS manager_warehouses_manager_id_fkey;

ALTER TABLE manager_warehouses
ADD CONSTRAINT manager_warehouses_manager_id_fkey
FOREIGN KEY (manager_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

COMMENT ON CONSTRAINT piece_work_records_user_id_fkey ON piece_work_records IS '用户外键约束，支持 ID 级联更新';
COMMENT ON CONSTRAINT attendance_records_user_id_fkey ON attendance_records IS '用户外键约束，支持 ID 级联更新';
COMMENT ON CONSTRAINT leave_requests_user_id_fkey ON leave_requests IS '用户外键约束，支持 ID 级联更新';
COMMENT ON CONSTRAINT vehicles_current_driver_id_fkey ON vehicles IS '司机外键约束，支持 ID 级联更新';
COMMENT ON CONSTRAINT vehicle_assignments_driver_id_fkey ON vehicle_assignments IS '司机外键约束，支持 ID 级联更新';
COMMENT ON CONSTRAINT manager_warehouses_manager_id_fkey ON manager_warehouses IS '管理员外键约束，支持 ID 级联更新';
