/*
# 清理旧的多租户表

## 概述
删除所有旧的多租户相关表，只保留新的单用户系统表

## 要删除的表
- tenants（租户表）
- user_credentials（用户凭证表）
- system_admins（系统管理员表）
- profiles（旧的用户配置表）
- 其他多租户相关表
*/

-- 删除旧的多租户表
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS user_credentials CASCADE;
DROP TABLE IF EXISTS system_admins CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS notification_config CASCADE;
DROP TABLE IF EXISTS cross_schema_access_logs CASCADE;
DROP TABLE IF EXISTS permission_audit_logs CASCADE;
DROP TABLE IF EXISTS security_audit_log CASCADE;
DROP TABLE IF EXISTS user_behavior_logs CASCADE;
DROP TABLE IF EXISTS user_feature_weights CASCADE;
DROP TABLE IF EXISTS system_performance_metrics CASCADE;
DROP TABLE IF EXISTS driver_warehouses CASCADE;
DROP TABLE IF EXISTS manager_warehouses CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_send_records CASCADE;
DROP TABLE IF EXISTS scheduled_notifications CASCADE;
DROP TABLE IF EXISTS auto_reminder_rules CASCADE;
DROP TABLE IF EXISTS attendance_rules CASCADE;
DROP TABLE IF EXISTS category_prices CASCADE;
DROP TABLE IF EXISTS driver_licenses CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS lease_bills CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS vehicle_leases CASCADE;
DROP TABLE IF EXISTS vehicle_records CASCADE;
DROP TABLE IF EXISTS resignation_applications CASCADE;

-- 删除旧的枚举类型（如果还存在）
DROP TYPE IF EXISTS driver_type CASCADE;
DROP TYPE IF EXISTS peer_account_permission CASCADE;
