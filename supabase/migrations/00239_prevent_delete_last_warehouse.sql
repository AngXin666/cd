/*
# 防止删除最后一个仓库

## 问题描述
当仓库被删除时，相关的 driver_warehouses 和 manager_warehouses 记录会被级联删除，
导致司机和车队长失去仓库分配。为了确保系统正常运行，每个老板号必须保留至少一个仓库。

## 解决方案
创建一个触发器，在删除仓库前检查：
1. 是否是该租户的最后一个仓库
2. 如果是，则阻止删除操作

## 变更内容
1. 创建 prevent_delete_last_warehouse() 函数
2. 创建 BEFORE DELETE 触发器

## 影响范围
- 防止删除最后一个仓库
- 确保每个租户至少有一个仓库
- 保护司机和车队长的仓库分配
*/

-- 创建函数：防止删除最后一个仓库
CREATE OR REPLACE FUNCTION prevent_delete_last_warehouse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  warehouse_count INT;
BEGIN
  -- 统计该租户的仓库数量
  SELECT COUNT(*) INTO warehouse_count
  FROM warehouses
  WHERE boss_id = OLD.boss_id;

  -- 如果只剩一个仓库，阻止删除
  IF warehouse_count <= 1 THEN
    RAISE EXCEPTION '无法删除：每个老板号必须保留至少一个仓库';
  END IF;

  RETURN OLD;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS check_last_warehouse_before_delete ON warehouses;
CREATE TRIGGER check_last_warehouse_before_delete
  BEFORE DELETE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delete_last_warehouse();