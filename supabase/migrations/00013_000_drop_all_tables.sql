-- 删除所有旧表和相关对象

-- 删除所有表（按依赖顺序）
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS driver_licenses CASCADE;
DROP TABLE IF EXISTS vehicle_records CASCADE;
DROP TABLE IF EXISTS vehicle_lease_info CASCADE;
DROP TABLE IF EXISTS vehicles_deprecated CASCADE;
DROP TABLE IF EXISTS vehicles_base CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS resignation_applications CASCADE;
DROP TABLE IF EXISTS leave_applications CASCADE;
DROP TABLE IF EXISTS piece_work_records CASCADE;
DROP TABLE IF EXISTS piece_work_categories CASCADE;
DROP TABLE IF EXISTS warehouse_categories CASCADE;
DROP TABLE IF EXISTS category_prices CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_rules CASCADE;
DROP TABLE IF EXISTS manager_permissions CASCADE;
DROP TABLE IF EXISTS manager_warehouses CASCADE;
DROP TABLE IF EXISTS driver_warehouses CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 删除所有函数
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_manager_warehouse_ids(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_manager_of_warehouse(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_driver_of_warehouse(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS calculate_work_hours(timestamptz, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_work_hours() CASCADE;
DROP FUNCTION IF EXISTS determine_attendance_status(uuid, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS calculate_piece_work_amount(integer, numeric, boolean, numeric, boolean, integer, numeric) CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_piece_work_amount() CASCADE;
DROP FUNCTION IF EXISTS calculate_leave_days(date, date) CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_leave_days() CASCADE;
DROP FUNCTION IF EXISTS is_user_on_leave(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS is_license_expired(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS get_license_remaining_days(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS auto_set_responded_at() CASCADE;

-- 删除所有枚举类型
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS driver_type CASCADE;
DROP TYPE IF EXISTS attendance_status CASCADE;
DROP TYPE IF EXISTS leave_type CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS record_type CASCADE;
DROP TYPE IF EXISTS record_status CASCADE;
DROP TYPE IF EXISTS feedback_status CASCADE;
DROP TYPE IF EXISTS review_status CASCADE;