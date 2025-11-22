/*
# 修复所有外键约束：添加 ON UPDATE CASCADE

## 问题描述
当触发器尝试更新 profiles 表的 ID 时，会违反外键约束。

错误信息：
ERROR: update or delete on table "profiles" violates foreign key constraint 
"piece_work_records_user_id_fkey" on table "piece_work_records" (SQLSTATE 23503)

## 原因分析
所有引用 profiles.id 的外键约束的 update_rule 都是 NO ACTION。
当触发器更新 profiles.id 时，相关表的外键不会自动更新，导致约束违反。

## 解决方案
修改所有引用 profiles.id 的外键约束，添加 ON UPDATE CASCADE。

## 受影响的表
1. attendance_records.user_id
2. driver_licenses.driver_id
3. driver_warehouses.driver_id
4. feedback.user_id
5. leave_applications.user_id
6. leave_applications.reviewer_id
7. manager_permissions.manager_id
8. manager_warehouses.manager_id
9. notifications.user_id
10. notifications.related_user_id
11. piece_work_records.user_id
12. resignation_applications.user_id
13. resignation_applications.reviewer_id
14. vehicle_records.driver_id
15. vehicle_records.reviewed_by
16. vehicles_deprecated.user_id
17. vehicles_deprecated.reviewed_by
*/

-- 1. attendance_records
ALTER TABLE attendance_records
DROP CONSTRAINT IF EXISTS attendance_records_user_id_fkey;

ALTER TABLE attendance_records
ADD CONSTRAINT attendance_records_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 2. driver_licenses
ALTER TABLE driver_licenses
DROP CONSTRAINT IF EXISTS driver_licenses_driver_id_fkey;

ALTER TABLE driver_licenses
ADD CONSTRAINT driver_licenses_driver_id_fkey
FOREIGN KEY (driver_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 3. driver_warehouses
ALTER TABLE driver_warehouses
DROP CONSTRAINT IF EXISTS driver_warehouses_driver_id_fkey;

ALTER TABLE driver_warehouses
ADD CONSTRAINT driver_warehouses_driver_id_fkey
FOREIGN KEY (driver_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 4. feedback
ALTER TABLE feedback
DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;

ALTER TABLE feedback
ADD CONSTRAINT feedback_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 5. leave_applications (user_id)
ALTER TABLE leave_applications
DROP CONSTRAINT IF EXISTS leave_applications_user_id_fkey;

ALTER TABLE leave_applications
ADD CONSTRAINT leave_applications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 6. leave_applications (reviewer_id)
ALTER TABLE leave_applications
DROP CONSTRAINT IF EXISTS leave_applications_reviewer_id_fkey;

ALTER TABLE leave_applications
ADD CONSTRAINT leave_applications_reviewer_id_fkey
FOREIGN KEY (reviewer_id) REFERENCES profiles(id)
ON DELETE NO ACTION
ON UPDATE CASCADE;

-- 7. manager_permissions
ALTER TABLE manager_permissions
DROP CONSTRAINT IF EXISTS manager_permissions_manager_id_fkey;

ALTER TABLE manager_permissions
ADD CONSTRAINT manager_permissions_manager_id_fkey
FOREIGN KEY (manager_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 8. manager_warehouses
ALTER TABLE manager_warehouses
DROP CONSTRAINT IF EXISTS manager_warehouses_manager_id_fkey;

ALTER TABLE manager_warehouses
ADD CONSTRAINT manager_warehouses_manager_id_fkey
FOREIGN KEY (manager_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 9. notifications (user_id)
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 10. notifications (related_user_id)
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_related_user_id_fkey;

ALTER TABLE notifications
ADD CONSTRAINT notifications_related_user_id_fkey
FOREIGN KEY (related_user_id) REFERENCES profiles(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 11. piece_work_records
ALTER TABLE piece_work_records
DROP CONSTRAINT IF EXISTS piece_work_records_user_id_fkey;

ALTER TABLE piece_work_records
ADD CONSTRAINT piece_work_records_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 12. resignation_applications (user_id)
ALTER TABLE resignation_applications
DROP CONSTRAINT IF EXISTS resignation_applications_user_id_fkey;

ALTER TABLE resignation_applications
ADD CONSTRAINT resignation_applications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 13. resignation_applications (reviewer_id)
ALTER TABLE resignation_applications
DROP CONSTRAINT IF EXISTS resignation_applications_reviewer_id_fkey;

ALTER TABLE resignation_applications
ADD CONSTRAINT resignation_applications_reviewer_id_fkey
FOREIGN KEY (reviewer_id) REFERENCES profiles(id)
ON DELETE NO ACTION
ON UPDATE CASCADE;

-- 14. vehicle_records (driver_id)
ALTER TABLE vehicle_records
DROP CONSTRAINT IF EXISTS vehicle_records_driver_id_fkey;

ALTER TABLE vehicle_records
ADD CONSTRAINT vehicle_records_driver_id_fkey
FOREIGN KEY (driver_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 15. vehicle_records (reviewed_by)
ALTER TABLE vehicle_records
DROP CONSTRAINT IF EXISTS vehicle_records_reviewed_by_fkey;

ALTER TABLE vehicle_records
ADD CONSTRAINT vehicle_records_reviewed_by_fkey
FOREIGN KEY (reviewed_by) REFERENCES profiles(id)
ON DELETE NO ACTION
ON UPDATE CASCADE;

-- 16. vehicles_deprecated (user_id)
ALTER TABLE vehicles_deprecated
DROP CONSTRAINT IF EXISTS vehicles_user_id_fkey;

ALTER TABLE vehicles_deprecated
ADD CONSTRAINT vehicles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 17. vehicles_deprecated (reviewed_by)
ALTER TABLE vehicles_deprecated
DROP CONSTRAINT IF EXISTS vehicles_reviewed_by_fkey;

ALTER TABLE vehicles_deprecated
ADD CONSTRAINT vehicles_reviewed_by_fkey
FOREIGN KEY (reviewed_by) REFERENCES profiles(id)
ON DELETE NO ACTION
ON UPDATE CASCADE;
