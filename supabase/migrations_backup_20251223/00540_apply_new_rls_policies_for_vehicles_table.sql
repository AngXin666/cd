/*
# 权限系统重构 - 步骤11：应用新的 RLS 策略（vehicles 表）

## 说明
为 vehicles 表应用基于策略模板的动态 RLS 策略

## 策略设计
1. BOSS/MANAGER: 可以查看、创建、更新、删除所有车辆
2. DRIVER: 可以查看分配给自己的车辆，可以创建和更新自己的车辆

## 业务逻辑
- 车辆由管理员或司机创建
- 司机只能查看分配给自己的车辆（driver_id 或 current_driver_id）
- 司机可以创建和更新自己的车辆（user_id）
- 管理员可以查看和管理所有车辆
- 管理员可以分配车辆给司机

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 删除 vehicles 表的所有旧策略
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    JOIN pg_class ON pg_policy.polrelid = pg_class.oid
    WHERE pg_class.relname = 'vehicles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON vehicles', pol.polname);
  END LOOP;
END $$;

-- ============================================
-- 2. 应用新的 RLS 策略
-- ============================================

-- 策略1：管理员可以查看所有车辆
CREATE POLICY "new_admins_view_all_vehicles" ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略2：司机可以查看分配给自己的车辆
CREATE POLICY "new_drivers_view_assigned_vehicles" ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid() OR current_driver_id = auth.uid() OR user_id = auth.uid()
  );

-- 策略3：管理员可以插入车辆
CREATE POLICY "new_admins_insert_vehicles" ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略4：司机可以创建自己的车辆
CREATE POLICY "new_drivers_insert_own_vehicles" ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- 策略5：管理员可以更新所有车辆
CREATE POLICY "new_admins_update_all_vehicles" ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略6：司机可以更新自己的车辆
CREATE POLICY "new_drivers_update_own_vehicles" ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- 策略7：管理员可以删除车辆
CREATE POLICY "new_admins_delete_vehicles" ON vehicles
  FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- ============================================
-- 3. 更新资源权限配置
-- ============================================
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field,
  custom_rules
) VALUES (
  'vehicles',
  'user_id',
  'warehouse_id',
  false,
  NULL,
  jsonb_build_object(
    'driver_view_rule', 'driver_id = auth.uid() OR current_driver_id = auth.uid() OR user_id = auth.uid()',
    'driver_update_rule', 'user_id = auth.uid()'
  )
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  custom_rules = EXCLUDED.custom_rules,
  updated_at = now();

-- ============================================
-- 4. 创建验证函数
-- ============================================
CREATE OR REPLACE FUNCTION verify_vehicles_table_policies()
RETURNS TABLE (
  policy_name text,
  policy_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pol.polname::text AS policy_name,
    CASE
      WHEN pol.polcmd = 'r' THEN 'SELECT'
      WHEN pol.polcmd = 'a' THEN 'INSERT'
      WHEN pol.polcmd = 'w' THEN 'UPDATE'
      WHEN pol.polcmd = 'd' THEN 'DELETE'
      WHEN pol.polcmd = '*' THEN 'ALL'
      ELSE 'UNKNOWN'
    END AS policy_type
  FROM pg_policy pol
  JOIN pg_class cls ON pol.polrelid = cls.oid
  WHERE cls.relname = 'vehicles'
  ORDER BY pol.polname;
END;
$$;

COMMENT ON FUNCTION verify_vehicles_table_policies IS '验证 vehicles 表的策略是否正确应用';

-- ============================================
-- 5. 创建车辆管理辅助函数
-- ============================================

-- 创建车辆
CREATE OR REPLACE FUNCTION create_vehicle(
  p_user_id uuid,
  p_plate_number text,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_vin text DEFAULT NULL,
  p_vehicle_type text DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vehicle_id uuid;
BEGIN
  -- 验证车牌号
  IF p_plate_number IS NULL OR p_plate_number = '' THEN
    RAISE EXCEPTION '车牌号不能为空';
  END IF;
  
  -- 检查车牌号是否已存在
  IF EXISTS (
    SELECT 1 FROM vehicles 
    WHERE plate_number = p_plate_number AND is_active = true
  ) THEN
    RAISE EXCEPTION '车牌号已存在';
  END IF;
  
  -- 创建车辆
  INSERT INTO vehicles (
    user_id,
    plate_number,
    brand,
    model,
    color,
    vin,
    vehicle_type,
    warehouse_id,
    notes,
    is_active,
    status
  ) VALUES (
    p_user_id,
    p_plate_number,
    p_brand,
    p_model,
    p_color,
    p_vin,
    p_vehicle_type,
    p_warehouse_id,
    p_notes,
    true,
    'active'
  )
  RETURNING id INTO v_vehicle_id;
  
  RETURN v_vehicle_id;
END;
$$;

COMMENT ON FUNCTION create_vehicle IS '创建车辆';

-- 分配车辆给司机
CREATE OR REPLACE FUNCTION assign_vehicle_to_driver(
  p_vehicle_id uuid,
  p_driver_id uuid,
  p_assigned_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_assigned_by) THEN
    RAISE EXCEPTION '只有管理员可以分配车辆';
  END IF;
  
  -- 检查车辆是否存在
  IF NOT EXISTS (
    SELECT 1 FROM vehicles 
    WHERE id = p_vehicle_id
  ) THEN
    RAISE EXCEPTION '车辆不存在';
  END IF;
  
  -- 检查司机是否存在
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_driver_id
  ) THEN
    RAISE EXCEPTION '司机不存在';
  END IF;
  
  -- 分配车辆
  UPDATE vehicles
  SET 
    driver_id = p_driver_id,
    current_driver_id = p_driver_id,
    updated_at = NOW()
  WHERE id = p_vehicle_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION assign_vehicle_to_driver IS '分配车辆给司机';

-- 取消车辆分配
CREATE OR REPLACE FUNCTION unassign_vehicle_from_driver(
  p_vehicle_id uuid,
  p_unassigned_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_unassigned_by) THEN
    RAISE EXCEPTION '只有管理员可以取消车辆分配';
  END IF;
  
  -- 检查车辆是否存在
  IF NOT EXISTS (
    SELECT 1 FROM vehicles 
    WHERE id = p_vehicle_id
  ) THEN
    RAISE EXCEPTION '车辆不存在';
  END IF;
  
  -- 取消分配
  UPDATE vehicles
  SET 
    driver_id = NULL,
    current_driver_id = NULL,
    updated_at = NOW()
  WHERE id = p_vehicle_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION unassign_vehicle_from_driver IS '取消车辆分配';

-- 获取用户的车辆
CREATE OR REPLACE FUNCTION get_user_vehicles(
  p_user_id uuid,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  plate_number text,
  brand text,
  model text,
  color text,
  vin text,
  vehicle_type text,
  warehouse_id uuid,
  driver_id uuid,
  current_driver_id uuid,
  status text,
  is_active boolean,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.plate_number,
    v.brand,
    v.model,
    v.color,
    v.vin,
    v.vehicle_type,
    v.warehouse_id,
    v.driver_id,
    v.current_driver_id,
    v.status,
    v.is_active,
    v.notes,
    v.created_at,
    v.updated_at
  FROM vehicles v
  WHERE (v.driver_id = p_user_id OR v.current_driver_id = p_user_id OR v.user_id = p_user_id)
    AND (p_status IS NULL OR v.status = p_status)
    AND v.is_active = true
  ORDER BY v.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_user_vehicles IS '获取用户的车辆';

-- 管理员获取所有车辆
CREATE OR REPLACE FUNCTION get_all_vehicles(
  p_admin_id uuid,
  p_status text DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  plate_number text,
  brand text,
  model text,
  color text,
  vin text,
  vehicle_type text,
  warehouse_id uuid,
  warehouse_name text,
  driver_id uuid,
  driver_name text,
  current_driver_id uuid,
  current_driver_name text,
  status text,
  is_active boolean,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION '只有管理员可以查看所有车辆';
  END IF;
  
  RETURN QUERY
  SELECT 
    v.id,
    v.plate_number,
    v.brand,
    v.model,
    v.color,
    v.vin,
    v.vehicle_type,
    v.warehouse_id,
    w.name AS warehouse_name,
    v.driver_id,
    d.name AS driver_name,
    v.current_driver_id,
    cd.name AS current_driver_name,
    v.status,
    v.is_active,
    v.notes,
    v.created_at
  FROM vehicles v
  LEFT JOIN warehouses w ON v.warehouse_id = w.id
  LEFT JOIN users d ON v.driver_id = d.id
  LEFT JOIN users cd ON v.current_driver_id = cd.id
  WHERE (p_status IS NULL OR v.status = p_status)
    AND (p_warehouse_id IS NULL OR v.warehouse_id = p_warehouse_id)
    AND v.is_active = true
  ORDER BY v.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_all_vehicles IS '管理员获取所有车辆';

-- 获取车辆详情
CREATE OR REPLACE FUNCTION get_vehicle_details(
  p_vehicle_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  plate_number text,
  brand text,
  model text,
  color text,
  vin text,
  vehicle_type text,
  warehouse_id uuid,
  warehouse_name text,
  driver_id uuid,
  driver_name text,
  current_driver_id uuid,
  current_driver_name text,
  owner_name text,
  use_character text,
  register_date date,
  issue_date date,
  engine_number text,
  status text,
  is_active boolean,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查权限：管理员或车辆相关用户
  IF NOT (
    is_admin(p_user_id) OR
    EXISTS (
      SELECT 1 FROM vehicles 
      WHERE id = p_vehicle_id 
        AND (driver_id = p_user_id OR current_driver_id = p_user_id OR user_id = p_user_id)
    )
  ) THEN
    RAISE EXCEPTION '没有权限查看该车辆';
  END IF;
  
  RETURN QUERY
  SELECT 
    v.id,
    v.plate_number,
    v.brand,
    v.model,
    v.color,
    v.vin,
    v.vehicle_type,
    v.warehouse_id,
    w.name AS warehouse_name,
    v.driver_id,
    d.name AS driver_name,
    v.current_driver_id,
    cd.name AS current_driver_name,
    v.owner_name,
    v.use_character,
    v.register_date,
    v.issue_date,
    v.engine_number,
    v.status,
    v.is_active,
    v.notes,
    v.created_at,
    v.updated_at
  FROM vehicles v
  LEFT JOIN warehouses w ON v.warehouse_id = w.id
  LEFT JOIN users d ON v.driver_id = d.id
  LEFT JOIN users cd ON v.current_driver_id = cd.id
  WHERE v.id = p_vehicle_id;
END;
$$;

COMMENT ON FUNCTION get_vehicle_details IS '获取车辆详情';

-- 更新车辆状态
CREATE OR REPLACE FUNCTION update_vehicle_status(
  p_vehicle_id uuid,
  p_status text,
  p_updated_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_updated_by) THEN
    RAISE EXCEPTION '只有管理员可以更新车辆状态';
  END IF;
  
  -- 检查车辆是否存在
  IF NOT EXISTS (
    SELECT 1 FROM vehicles 
    WHERE id = p_vehicle_id
  ) THEN
    RAISE EXCEPTION '车辆不存在';
  END IF;
  
  -- 验证状态
  IF p_status NOT IN ('active', 'maintenance', 'inactive', 'retired') THEN
    RAISE EXCEPTION '无效的车辆状态';
  END IF;
  
  -- 更新状态
  UPDATE vehicles
  SET 
    status = p_status,
    updated_at = NOW()
  WHERE id = p_vehicle_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION update_vehicle_status IS '更新车辆状态';

-- 获取车辆统计
CREATE OR REPLACE FUNCTION get_vehicle_statistics(p_admin_id uuid)
RETURNS TABLE (
  total_vehicles integer,
  active_vehicles integer,
  maintenance_vehicles integer,
  inactive_vehicles integer,
  assigned_vehicles integer,
  unassigned_vehicles integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为管理员
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION '只有管理员可以查看车辆统计';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::integer AS total_vehicles,
    COUNT(*) FILTER (WHERE status = 'active')::integer AS active_vehicles,
    COUNT(*) FILTER (WHERE status = 'maintenance')::integer AS maintenance_vehicles,
    COUNT(*) FILTER (WHERE status = 'inactive')::integer AS inactive_vehicles,
    COUNT(*) FILTER (WHERE driver_id IS NOT NULL OR current_driver_id IS NOT NULL)::integer AS assigned_vehicles,
    COUNT(*) FILTER (WHERE driver_id IS NULL AND current_driver_id IS NULL)::integer AS unassigned_vehicles
  FROM vehicles
  WHERE is_active = true;
END;
$$;

COMMENT ON FUNCTION get_vehicle_statistics IS '获取车辆统计';