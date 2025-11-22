/*
# 修复已还车但状态未更新的车辆数据

## 问题描述
在修复还车逻辑之前，司机还车时只更新了 return_time 和 return_photos 字段，
没有更新 status 字段，导致已还车的车辆状态仍然显示为其他值（如 'picked_up' 或 'active'）。

## 修复方案
将所有 return_time 不为 NULL 但 status 不是 'inactive' 的车辆状态更新为 'inactive'。

## 执行时间
2025-11-05

## 影响范围
- 修复历史数据中已还车但状态未更新的车辆
- 确保超级管理员端可以正确看到已停用的车辆
- 确保"查看历史记录"按钮正常显示

## 注意事项
- 此迁移是一次性数据修复，不影响未来的还车操作
- 未来的还车操作会通过 returnVehicle 函数正确更新 status 字段
*/

-- 修复已还车但状态未更新的车辆
UPDATE vehicles
SET status = 'inactive'
WHERE return_time IS NOT NULL 
  AND status != 'inactive';

-- 验证修复结果
-- 此查询应该返回空结果，表示所有已还车的车辆状态都已正确更新
DO $$
DECLARE
  unfixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unfixed_count
  FROM vehicles
  WHERE return_time IS NOT NULL 
    AND status != 'inactive';
  
  IF unfixed_count > 0 THEN
    RAISE EXCEPTION '还有 % 辆车的状态未正确更新', unfixed_count;
  ELSE
    RAISE NOTICE '✅ 所有已还车的车辆状态都已正确更新为 inactive';
  END IF;
END $$;
