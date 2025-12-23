/*
# 物理隔离架构 - 步骤1：删除 boss_id 字段和旧函数
*/

-- 删除所有表中的 boss_id 字段
ALTER TABLE attendance DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE attendance_rules DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE category_prices DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE driver_licenses DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE driver_warehouses DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE feedback DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE leases DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE leave_applications DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE manager_warehouses DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE notification_config DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE notifications DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE piece_work_records DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE resignation_applications DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE system_performance_metrics DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE user_behavior_logs DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE user_feature_weights DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE user_permissions DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE vehicle_records DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE vehicles DROP COLUMN IF EXISTS boss_id CASCADE;
ALTER TABLE warehouses DROP COLUMN IF EXISTS boss_id CASCADE;

-- 删除所有旧函数
DROP FUNCTION IF EXISTS get_current_user_boss_id() CASCADE;
DROP FUNCTION IF EXISTS get_user_role_and_boss(uuid) CASCADE;
DROP FUNCTION IF EXISTS auto_set_boss_id() CASCADE;
DROP FUNCTION IF EXISTS auto_init_user_permissions() CASCADE;
DROP FUNCTION IF EXISTS get_notification_recipients(text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_manager(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_driver(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
