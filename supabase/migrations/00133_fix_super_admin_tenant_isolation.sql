/*
# 修复超级管理员（老板）的租户数据隔离

## 问题
所有表都有两个冲突的 RLS 策略：
1. "Super admins can manage all ..." - 允许所有 super_admin 访问所有数据
2. "租户数据隔离 - ..." - 限制只能访问自己租户的数据

由于 RLS 策略是 OR 关系，第一个策略让所有 super_admin 都能看到所有数据，
导致不同租户的老板可以看到彼此的数据。

## 解决方案
删除所有 "Super admins can manage all" 策略，只保留租户隔离策略。
租户隔离策略已经允许 super_admin 访问自己租户的所有数据。

## 影响的表
- attendance
- vehicles
- vehicle_records
- warehouses
- profiles
- driver_warehouses
- manager_warehouses
- attendance_rules
- leave_applications
- piece_work_records
- vehicle_leases
- driver_licenses
- category_prices
- feedback
- auto_reminder_rules
- notification_templates
- scheduled_notifications
- notification_send_records
- lease_bills
- resignation_applications
*/

-- attendance 表
DROP POLICY IF EXISTS "Super admins can manage all attendance" ON attendance;
DROP POLICY IF EXISTS "Super admins can view all attendance" ON attendance;

-- vehicles 表
DROP POLICY IF EXISTS "Super admins can manage all vehicles" ON vehicles;

-- vehicle_records 表
DROP POLICY IF EXISTS "Super admins can manage all vehicle records" ON vehicle_records;

-- warehouses 表
DROP POLICY IF EXISTS "Super admins can manage all warehouses" ON warehouses;

-- profiles 表（司机表）
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;

-- driver_warehouses 表
DROP POLICY IF EXISTS "Super admins can manage all driver warehouses" ON driver_warehouses;

-- manager_warehouses 表
DROP POLICY IF EXISTS "Super admins can manage all manager warehouses" ON manager_warehouses;

-- attendance_rules 表
DROP POLICY IF EXISTS "Super admins can manage all attendance rules" ON attendance_rules;

-- leave_applications 表
DROP POLICY IF EXISTS "Super admins can manage all leave applications" ON leave_applications;

-- piece_work_records 表
DROP POLICY IF EXISTS "Super admins can manage all piece work records" ON piece_work_records;

-- vehicle_leases 表
DROP POLICY IF EXISTS "Super admins can manage all vehicle leases" ON vehicle_leases;

-- driver_licenses 表
DROP POLICY IF EXISTS "Super admins can manage all driver licenses" ON driver_licenses;

-- category_prices 表
DROP POLICY IF EXISTS "Super admins can manage all category prices" ON category_prices;

-- feedback 表
DROP POLICY IF EXISTS "Super admins can manage all feedback" ON feedback;

-- auto_reminder_rules 表
DROP POLICY IF EXISTS "Super admins can manage all auto reminder rules" ON auto_reminder_rules;

-- notification_templates 表
DROP POLICY IF EXISTS "Super admins can manage all notification templates" ON notification_templates;

-- scheduled_notifications 表
DROP POLICY IF EXISTS "Super admins can manage all scheduled notifications" ON scheduled_notifications;

-- notification_send_records 表
DROP POLICY IF EXISTS "Super admins can manage all notification send records" ON notification_send_records;

-- lease_bills 表
DROP POLICY IF EXISTS "Super admins can manage all lease bills" ON lease_bills;

-- resignation_applications 表
DROP POLICY IF EXISTS "Super admins can manage all resignation applications" ON resignation_applications;
