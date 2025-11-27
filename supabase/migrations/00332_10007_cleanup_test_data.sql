/*
# 清理测试数据

## 目的
1. 删除所有测试用户，只保留系统账号
2. 修复 admin 账号的 email 字段

## 保留的账号
- admin (d79327e9-69b4-42b7-b1b4-5d13de6e9814) - 系统超级管理员
- admin888 (dd54b311-6e02-4616-9a1b-110f3ad32628) - 租赁管理员

## 删除的数据
- 所有租户内的测试用户
- 所有测试租户数据
*/

-- 1. 修复 admin 账号的 email
UPDATE public.profiles 
SET email = 'admin@fleet.com'
WHERE id = 'd79327e9-69b4-42b7-b1b4-5d13de6e9814';

-- 2. 删除所有租户内的用户（tenant_id 不为 NULL 的用户）
DELETE FROM public.profiles 
WHERE tenant_id IS NOT NULL;

-- 3. 删除 auth.users 中对应的用户
-- 注意：这会级联删除相关的认证数据
DELETE FROM auth.users 
WHERE id IN (
  SELECT id FROM public.profiles WHERE tenant_id IS NOT NULL
);

-- 4. 清理租户相关数据
-- 删除所有租约记录
DELETE FROM public.leases;

-- 删除所有车辆记录
DELETE FROM public.vehicles;

-- 删除所有维修记录
DELETE FROM public.maintenance_records;

-- 删除所有违章记录
DELETE FROM public.violations;

-- 删除所有还车记录
DELETE FROM public.vehicle_returns;

-- 5. 验证清理结果
DO $$
DECLARE
  user_count INTEGER;
  lease_count INTEGER;
  vehicle_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  SELECT COUNT(*) INTO lease_count FROM public.leases;
  SELECT COUNT(*) INTO vehicle_count FROM public.vehicles;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 数据清理完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '剩余用户数: %', user_count;
  RAISE NOTICE '剩余租约数: %', lease_count;
  RAISE NOTICE '剩余车辆数: %', vehicle_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '保留的系统账号：';
  RAISE NOTICE '1. admin (系统超级管理员)';
  RAISE NOTICE '2. admin888 (租赁管理员)';
  RAISE NOTICE '========================================';
END $$;