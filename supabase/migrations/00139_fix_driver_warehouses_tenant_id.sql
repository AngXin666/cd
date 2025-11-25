/*
# 修复 driver_warehouses 表的 tenant_id 设置问题

## 问题
当老板 A 给司机分配仓库时，driver_warehouses 表的 tenant_id 被设置为老板 A 的 ID。
但如果老板 B 也尝试分配这个司机（跨租户操作），tenant_id 会被设置为老板 B 的 ID。
这导致司机无法正确查看自己的仓库分配。

## 根本原因
auto_set_tenant_id() 触发器使用当前操作用户的 tenant_id，
但对于 driver_warehouses 表，tenant_id 应该是司机的 tenant_id。

## 解决方案
1. 创建专门的触发器函数 set_driver_warehouse_tenant_id()
2. 从 driver_id 获取司机的 tenant_id
3. 替换 driver_warehouses 表的触发器

## 影响
- driver_warehouses.tenant_id 将始终等于司机的 tenant_id
- 确保司机可以查看自己的仓库分配
- 防止跨租户的错误分配
*/

-- 1. 创建专门的触发器函数
CREATE OR REPLACE FUNCTION set_driver_warehouse_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  driver_tenant_id uuid;
BEGIN
  -- 如果已经设置了 tenant_id，则不修改
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 从 profiles 表获取司机的 tenant_id
  SELECT tenant_id INTO driver_tenant_id
  FROM profiles
  WHERE id = NEW.driver_id;

  -- 如果司机不存在或没有 tenant_id，使用当前用户的 tenant_id
  IF driver_tenant_id IS NULL THEN
    driver_tenant_id := get_user_tenant_id();
  END IF;

  -- 设置 tenant_id
  NEW.tenant_id := driver_tenant_id;
  
  RETURN NEW;
END;
$$;

-- 2. 删除旧触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON driver_warehouses;

-- 3. 创建新触发器
CREATE TRIGGER set_driver_warehouse_tenant_id_trigger
  BEFORE INSERT ON driver_warehouses
  FOR EACH ROW
  EXECUTE FUNCTION set_driver_warehouse_tenant_id();

-- 4. 修复现有数据：更新错误的 tenant_id
UPDATE driver_warehouses dw
SET tenant_id = p.tenant_id
FROM profiles p
WHERE dw.driver_id = p.id
  AND dw.tenant_id != p.tenant_id;

-- 5. 验证修复
-- 所有 driver_warehouses 记录的 tenant_id 应该等于司机的 tenant_id
DO $$
DECLARE
  mismatch_count int;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM driver_warehouses dw
  JOIN profiles p ON p.id = dw.driver_id
  WHERE dw.tenant_id != p.tenant_id;
  
  IF mismatch_count > 0 THEN
    RAISE WARNING 'Found % driver_warehouses records with mismatched tenant_id', mismatch_count;
  ELSE
    RAISE NOTICE 'All driver_warehouses records have correct tenant_id';
  END IF;
END $$;
