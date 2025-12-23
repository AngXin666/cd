/*
# 修复仓库 boss_id 不匹配问题

## 问题分析
1. 所有仓库的 boss_id 都是 BOSS_1764145957063_60740476
2. 但主要租户的 boss_id 是 BOSS_1764145957063_29235549
3. 导致车队长和老板无法查看仓库

## 解决方案
将所有仓库的 boss_id 更新为主要租户的 boss_id

## 注意事项
这是一个数据修复迁移，只执行一次

*/

-- 更新所有仓库的 boss_id 为主要租户的 boss_id
UPDATE warehouses
SET boss_id = 'BOSS_1764145957063_29235549'
WHERE boss_id = 'BOSS_1764145957063_60740476';

-- 更新 manager_warehouses 表的 boss_id
UPDATE manager_warehouses
SET boss_id = 'BOSS_1764145957063_29235549'
WHERE boss_id = 'BOSS_1764145957063_60740476';

-- 更新 driver_warehouses 表的 boss_id
UPDATE driver_warehouses
SET boss_id = 'BOSS_1764145957063_29235549'
WHERE boss_id = 'BOSS_1764145957063_60740476';

-- 验证更新结果
DO $$
DECLARE
  warehouse_count int;
  manager_warehouse_count int;
  driver_warehouse_count int;
BEGIN
  SELECT COUNT(*) INTO warehouse_count
  FROM warehouses
  WHERE boss_id = 'BOSS_1764145957063_29235549';
  
  SELECT COUNT(*) INTO manager_warehouse_count
  FROM manager_warehouses
  WHERE boss_id = 'BOSS_1764145957063_29235549';
  
  SELECT COUNT(*) INTO driver_warehouse_count
  FROM driver_warehouses
  WHERE boss_id = 'BOSS_1764145957063_29235549';
  
  RAISE NOTICE '更新完成：';
  RAISE NOTICE '- warehouses 表：% 条记录', warehouse_count;
  RAISE NOTICE '- manager_warehouses 表：% 条记录', manager_warehouse_count;
  RAISE NOTICE '- driver_warehouses 表：% 条记录', driver_warehouse_count;
END $$;
