/*
# 清理旧的 tenant_id 触发器和函数

## 问题
系统中还存在使用 tenant_id 的旧触发器和函数，这些已经被 boss_id 替代。

## 解决方案
1. 删除所有使用 tenant_id 的触发器
2. 删除所有使用 tenant_id 的函数
3. 确保系统完全使用 boss_id

## 变更内容
- 删除 14 个使用 tenant_id 的触发器
- 删除 4 个使用 tenant_id 的函数
*/

-- ============================================
-- 1. 删除所有使用 tenant_id 的触发器
-- ============================================

-- 1.1 删除 attendance 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON attendance;

-- 1.2 删除 attendance_rules 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON attendance_rules;

-- 1.3 删除 category_prices 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON category_prices;

-- 1.4 删除 driver_licenses 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON driver_licenses;

-- 1.5 删除 driver_warehouses 表的触发器
DROP TRIGGER IF EXISTS set_driver_warehouse_tenant_id_trigger ON driver_warehouses;

-- 1.6 删除 feedback 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON feedback;

-- 1.7 删除 leave_applications 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON leave_applications;

-- 1.8 删除 manager_warehouses 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON manager_warehouses;

-- 1.9 删除 piece_work_records 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON piece_work_records;

-- 1.10 删除 profiles 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON profiles;

-- 1.11 删除 resignation_applications 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON resignation_applications;

-- 1.12 删除 vehicle_records 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON vehicle_records;

-- 1.13 删除 vehicles 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON vehicles;

-- 1.14 删除 warehouses 表的触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON warehouses;

-- ============================================
-- 2. 删除所有使用 tenant_id 的函数
-- ============================================

-- 2.1 删除 auto_set_tenant_id 函数
DROP FUNCTION IF EXISTS auto_set_tenant_id() CASCADE;

-- 2.2 删除 auto_set_tenant_id_for_profile 函数
DROP FUNCTION IF EXISTS auto_set_tenant_id_for_profile() CASCADE;

-- 2.3 删除 get_user_tenant_id 函数
DROP FUNCTION IF EXISTS get_user_tenant_id() CASCADE;

-- 2.4 删除 set_driver_warehouse_tenant_id 函数
DROP FUNCTION IF EXISTS set_driver_warehouse_tenant_id() CASCADE;

-- ============================================
-- 3. 验证清理结果
-- ============================================

-- 验证：检查是否还有使用 tenant_id 的触发器
-- SELECT 
--   t.tgname as trigger_name,
--   c.relname as table_name,
--   p.proname as function_name
-- FROM pg_trigger t
-- JOIN pg_class c ON t.tgrelid = c.oid
-- JOIN pg_proc p ON t.tgfoid = p.oid
-- WHERE pg_get_functiondef(p.oid) LIKE '%tenant_id%';

-- 验证：检查是否还有使用 tenant_id 的函数
-- SELECT 
--   p.proname as function_name
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.prokind = 'f'
--   AND pg_get_functiondef(p.oid) LIKE '%tenant_id%';
