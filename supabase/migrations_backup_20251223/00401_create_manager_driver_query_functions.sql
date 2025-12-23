/*
# 创建车队长司机查询辅助函数

## 说明
创建一组辅助函数来支持车队长查询司机和仓库，使用 SECURITY DEFINER 绕过 RLS 策略。
这些函数专门用于司机管理页面，不受 RLS 策略限制。

## 函数列表
1. get_manager_warehouses_for_management(manager_id) - 获取车队长负责的仓库列表
2. get_driver_warehouse_ids_for_management(driver_id) - 获取司机的仓库分配列表
3. get_drivers_by_warehouse_for_management(warehouse_id) - 获取仓库的司机列表

*/

-- ============================================================================
-- 函数 1: 获取车队长负责的仓库列表
-- ============================================================================
CREATE OR REPLACE FUNCTION get_manager_warehouses_for_management(p_manager_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  max_leave_days integer,
  resignation_notice_days integer,
  daily_target integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT w.id, w.name, w.is_active, w.created_at, w.updated_at, 
         w.max_leave_days, w.resignation_notice_days, w.daily_target
  FROM warehouses w
  INNER JOIN manager_warehouses mw ON mw.warehouse_id = w.id
  WHERE mw.manager_id = p_manager_id
    AND w.is_active = true
  ORDER BY w.name ASC;
$$;

COMMENT ON FUNCTION get_manager_warehouses_for_management IS '获取车队长负责的仓库列表，用于司机管理页面，绕过 RLS 策略';

-- ============================================================================
-- 函数 2: 获取司机的仓库分配列表
-- ============================================================================
CREATE OR REPLACE FUNCTION get_driver_warehouse_ids_for_management(p_driver_id uuid)
RETURNS TABLE (
  warehouse_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT warehouse_id
  FROM driver_warehouses
  WHERE driver_id = p_driver_id;
$$;

COMMENT ON FUNCTION get_driver_warehouse_ids_for_management IS '获取司机的仓库分配列表，用于司机管理页面，绕过 RLS 策略';

-- ============================================================================
-- 函数 3: 获取仓库的司机列表
-- ============================================================================
CREATE OR REPLACE FUNCTION get_drivers_by_warehouse_for_management(p_warehouse_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  role user_role,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT p.id, p.name, p.phone, p.role, p.created_at
  FROM profiles p
  INNER JOIN driver_warehouses dw ON dw.driver_id = p.id
  WHERE dw.warehouse_id = p_warehouse_id
    AND p.role = 'driver'
  ORDER BY p.created_at DESC;
$$;

COMMENT ON FUNCTION get_drivers_by_warehouse_for_management IS '获取仓库的司机列表，用于司机管理页面，绕过 RLS 策略';
