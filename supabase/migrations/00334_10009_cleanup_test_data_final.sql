/*
# 清理测试数据（最终版）

## 目的
1. 删除所有测试用户，只保留系统账号
2. 修复 admin 账号的 email 字段
3. 清理所有业务数据

## 保留的账号
- admin (d79327e9-69b4-42b7-b1b4-5d13de6e9814) - 系统超级管理员
- admin888 (dd54b311-6e02-4616-9a1b-110f3ad32628) - 租赁管理员
*/

-- 1. 修复 admin 账号的 email
UPDATE public.profiles 
SET email = 'admin@fleet.com'
WHERE id = 'd79327e9-69b4-42b7-b1b4-5d13de6e9814';

-- 2. 临时禁用所有触发器
SET session_replication_role = replica;

-- 3. 清理业务数据（按照外键依赖顺序）
DELETE FROM public.piece_work_records WHERE TRUE;
DELETE FROM public.leave_applications WHERE TRUE;
DELETE FROM public.resignation_applications WHERE TRUE;
DELETE FROM public.attendance WHERE TRUE;
DELETE FROM public.attendance_rules WHERE TRUE;
DELETE FROM public.vehicle_records WHERE TRUE;
DELETE FROM public.vehicle_leases WHERE TRUE;
DELETE FROM public.vehicles WHERE TRUE;
DELETE FROM public.lease_bills WHERE TRUE;
DELETE FROM public.leases WHERE TRUE;
DELETE FROM public.driver_licenses WHERE TRUE;
DELETE FROM public.driver_warehouses WHERE TRUE;
DELETE FROM public.manager_warehouses WHERE TRUE;
DELETE FROM public.warehouses WHERE TRUE;
DELETE FROM public.feedback WHERE TRUE;
DELETE FROM public.notifications WHERE TRUE;
DELETE FROM public.scheduled_notifications WHERE TRUE;
DELETE FROM public.notification_send_records WHERE TRUE;
DELETE FROM public.auto_reminder_rules WHERE TRUE;
DELETE FROM public.category_prices WHERE TRUE;
DELETE FROM public.user_permissions WHERE TRUE;
DELETE FROM public.permission_audit_logs WHERE TRUE;
DELETE FROM public.security_audit_log WHERE TRUE;
DELETE FROM public.user_behavior_logs WHERE TRUE;
DELETE FROM public.user_feature_weights WHERE TRUE;
DELETE FROM public.system_performance_metrics WHERE TRUE;

-- 4. 删除所有租户内的用户（tenant_id 不为 NULL 的用户）
-- 先记录要删除的用户 ID
CREATE TEMP TABLE users_to_delete AS
SELECT id FROM public.profiles WHERE tenant_id IS NOT NULL;

-- 从 profiles 表删除
DELETE FROM public.profiles WHERE tenant_id IS NOT NULL;

-- 从 auth.users 表删除
DELETE FROM auth.users WHERE id IN (SELECT id FROM users_to_delete);

-- 清理临时表
DROP TABLE users_to_delete;

-- 5. 重新启用触发器
SET session_replication_role = DEFAULT;

-- 6. 验证清理结果
DO $$
DECLARE
  user_count INTEGER;
  lease_count INTEGER;
  vehicle_count INTEGER;
  warehouse_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  SELECT COUNT(*) INTO lease_count FROM public.leases;
  SELECT COUNT(*) INTO vehicle_count FROM public.vehicles;
  SELECT COUNT(*) INTO warehouse_count FROM public.warehouses;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 数据清理完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '剩余用户数: %', user_count;
  RAISE NOTICE '剩余租约数: %', lease_count;
  RAISE NOTICE '剩余车辆数: %', vehicle_count;
  RAISE NOTICE '剩余仓库数: %', warehouse_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '保留的系统账号：';
  RAISE NOTICE '1. admin (系统超级管理员) - email: admin@fleet.com';
  RAISE NOTICE '2. admin888 (租赁管理员) - email: admin888@fleet.com';
  RAISE NOTICE '========================================';
END $$;