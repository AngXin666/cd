/*
# 创建权限上下文初始化函数

## 功能描述
为每个角色创建专门的权限上下文初始化函数，确保登录后能一次性获取完整的权限信息。

## 函数列表
1. get_driver_permission_context - 获取司机权限上下文
2. get_manager_permission_context - 获取车队长权限上下文
3. get_scheduler_permission_context - 获取调度权限上下文
4. get_admin_permission_context - 获取老板/平级管理员权限上下文
5. get_boss_user - 获取老板用户信息（辅助函数）

## 安全性
- 所有函数使用 SECURITY DEFINER 确保权限检查
- 只返回用户有权访问的数据
- 使用 STABLE 标记提升性能
*/

-- ============================================
-- 辅助函数：获取老板用户信息
-- ============================================

CREATE OR REPLACE FUNCTION get_boss_user()
RETURNS TABLE(
  id uuid,
  name text,
  phone text,
  email text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT u.id, u.name, u.phone, u.email
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  WHERE ur.role = 'BOSS'
  ORDER BY u.created_at ASC
  LIMIT 1;
$$;

-- ============================================
-- 1. 司机权限上下文
-- ============================================

CREATE OR REPLACE FUNCTION get_driver_permission_context(p_driver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_context jsonb;
  v_boss jsonb;
  v_warehouses jsonb;
  v_direct_manager jsonb;
  v_schedulers jsonb;
BEGIN
  -- 验证用户是否为司机
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = p_driver_id AND role = 'DRIVER'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '用户不是司机角色'
    );
  END IF;

  -- 获取老板信息
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'phone', phone,
    'email', email
  ) INTO v_boss
  FROM get_boss_user()
  LIMIT 1;

  -- 获取所属仓库列表
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', w.id,
      'name', w.name,
      'address', w.address
    )
  ) INTO v_warehouses
  FROM warehouse_assignments wa
  JOIN warehouses w ON w.id = wa.warehouse_id
  WHERE wa.user_id = p_driver_id;

  -- 获取直属车队长（管理该司机所在仓库的车队长）
  SELECT jsonb_build_object(
    'id', u.id,
    'name', u.name,
    'phone', u.phone,
    'email', u.email
  ) INTO v_direct_manager
  FROM warehouse_assignments wa
  JOIN user_roles ur ON ur.user_id = wa.user_id
  JOIN users u ON u.id = ur.user_id
  WHERE wa.warehouse_id IN (
    SELECT warehouse_id FROM warehouse_assignments WHERE user_id = p_driver_id
  )
  AND ur.role = 'MANAGER'
  LIMIT 1;

  -- 获取调度账号列表（暂时返回空数组，后续可扩展）
  v_schedulers := '[]'::jsonb;

  -- 构建权限上下文
  v_context := jsonb_build_object(
    'success', true,
    'context', jsonb_build_object(
      'mode', 'own_data_only',
      'level', 'full_control',
      'directManager', COALESCE(v_direct_manager, 'null'::jsonb),
      'schedulers', COALESCE(v_schedulers, '[]'::jsonb),
      'boss', COALESCE(v_boss, 'null'::jsonb),
      'warehouses', COALESCE(v_warehouses, '[]'::jsonb)
    )
  );

  RETURN v_context;
END;
$$;

-- ============================================
-- 2. 车队长权限上下文
-- ============================================

CREATE OR REPLACE FUNCTION get_manager_permission_context(p_manager_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_context jsonb;
  v_boss jsonb;
  v_permission_level text;
  v_managed_warehouses jsonb;
  v_managed_drivers jsonb;
  v_schedulers jsonb;
BEGIN
  -- 验证用户是否为车队长
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = p_manager_id AND role = 'MANAGER'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '用户不是车队长角色'
    );
  END IF;

  -- 获取权限级别
  SELECT 
    CASE 
      WHEN ps.strategy_name = 'manager_full_control' THEN 'full_control'
      WHEN ps.strategy_name = 'manager_view_only' THEN 'view_only'
      ELSE 'full_control'
    END INTO v_permission_level
  FROM user_permission_assignments upa
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  WHERE upa.user_id = p_manager_id
  LIMIT 1;

  -- 如果没有找到权限级别，默认为 full_control
  IF v_permission_level IS NULL THEN
    v_permission_level := 'full_control';
  END IF;

  -- 获取老板信息
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'phone', phone,
    'email', email
  ) INTO v_boss
  FROM get_boss_user()
  LIMIT 1;

  -- 获取管辖仓库列表
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', w.id,
      'name', w.name,
      'address', w.address
    )
  ) INTO v_managed_warehouses
  FROM warehouse_assignments wa
  JOIN warehouses w ON w.id = wa.warehouse_id
  WHERE wa.user_id = p_manager_id;

  -- 获取下属司机列表（管辖仓库内的所有司机）
  SELECT jsonb_agg(DISTINCT
    jsonb_build_object(
      'id', u.id,
      'name', u.name,
      'phone', u.phone,
      'email', u.email
    )
  ) INTO v_managed_drivers
  FROM warehouse_assignments wa
  JOIN user_roles ur ON ur.user_id = wa.user_id
  JOIN users u ON u.id = ur.user_id
  WHERE wa.warehouse_id IN (
    SELECT warehouse_id FROM warehouse_assignments WHERE user_id = p_manager_id
  )
  AND ur.role = 'DRIVER';

  -- 获取调度账号列表（暂时返回空数组，后续可扩展）
  v_schedulers := '[]'::jsonb;

  -- 构建权限上下文
  v_context := jsonb_build_object(
    'success', true,
    'context', jsonb_build_object(
      'mode', 'managed_resources',
      'level', v_permission_level,
      'managedWarehouses', COALESCE(v_managed_warehouses, '[]'::jsonb),
      'managedDrivers', COALESCE(v_managed_drivers, '[]'::jsonb),
      'schedulers', COALESCE(v_schedulers, '[]'::jsonb),
      'boss', COALESCE(v_boss, 'null'::jsonb)
    )
  );

  RETURN v_context;
END;
$$;

-- ============================================
-- 3. 调度权限上下文（预留，暂时返回基础结构）
-- ============================================

CREATE OR REPLACE FUNCTION get_scheduler_permission_context(p_scheduler_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_context jsonb;
  v_boss jsonb;
BEGIN
  -- 验证用户是否为调度
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = p_scheduler_id AND role = 'SCHEDULER'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '用户不是调度角色'
    );
  END IF;

  -- 获取老板信息
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'phone', phone,
    'email', email
  ) INTO v_boss
  FROM get_boss_user()
  LIMIT 1;

  -- 构建权限上下文（暂时返回基础结构）
  v_context := jsonb_build_object(
    'success', true,
    'context', jsonb_build_object(
      'mode', 'scheduled_resources',
      'level', 'full_control',
      'managedWarehouses', '[]'::jsonb,
      'relatedDrivers', '[]'::jsonb,
      'relatedVehicles', '[]'::jsonb,
      'boss', COALESCE(v_boss, 'null'::jsonb)
    )
  );

  RETURN v_context;
END;
$$;

-- ============================================
-- 4. 老板/平级管理员权限上下文
-- ============================================

CREATE OR REPLACE FUNCTION get_admin_permission_context(p_admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_context jsonb;
  v_permission_level text;
  v_total_warehouses int;
  v_total_drivers int;
  v_total_managers int;
  v_total_vehicles int;
BEGIN
  -- 验证用户是否为老板或平级管理员
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = p_admin_id AND role IN ('BOSS', 'PEER_ADMIN')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '用户不是老板或平级管理员角色'
    );
  END IF;

  -- 获取权限级别
  SELECT 
    CASE 
      WHEN ur.role = 'BOSS' THEN 'full_control'
      WHEN ps.strategy_name = 'peer_admin_full_control' THEN 'full_control'
      WHEN ps.strategy_name = 'peer_admin_view_only' THEN 'view_only'
      ELSE 'full_control'
    END INTO v_permission_level
  FROM user_roles ur
  LEFT JOIN user_permission_assignments upa ON upa.user_id = ur.user_id
  LEFT JOIN permission_strategies ps ON ps.id = upa.strategy_id
  WHERE ur.user_id = p_admin_id
  LIMIT 1;

  -- 如果没有找到权限级别，默认为 full_control
  IF v_permission_level IS NULL THEN
    v_permission_level := 'full_control';
  END IF;

  -- 获取系统资源统计
  SELECT COUNT(*) INTO v_total_warehouses FROM warehouses WHERE is_active = true;
  SELECT COUNT(*) INTO v_total_drivers FROM user_roles WHERE role = 'DRIVER';
  SELECT COUNT(*) INTO v_total_managers FROM user_roles WHERE role = 'MANAGER';
  SELECT COUNT(*) INTO v_total_vehicles FROM vehicles WHERE status != 'deleted';

  -- 构建权限上下文
  v_context := jsonb_build_object(
    'success', true,
    'context', jsonb_build_object(
      'mode', 'all_access',
      'level', v_permission_level,
      'systemResources', jsonb_build_object(
        'totalWarehouses', v_total_warehouses,
        'totalDrivers', v_total_drivers,
        'totalManagers', v_total_managers,
        'totalVehicles', v_total_vehicles
      )
    )
  );

  RETURN v_context;
END;
$$;

-- ============================================
-- 5. 统一权限上下文获取函数
-- ============================================

CREATE OR REPLACE FUNCTION get_permission_context(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role text;
  v_context jsonb;
BEGIN
  -- 获取用户角色
  SELECT role INTO v_role
  FROM user_roles
  WHERE user_id = p_user_id
  LIMIT 1;

  -- 根据角色调用对应的权限上下文函数
  CASE v_role
    WHEN 'DRIVER' THEN
      v_context := get_driver_permission_context(p_user_id);
    WHEN 'MANAGER' THEN
      v_context := get_manager_permission_context(p_user_id);
    WHEN 'SCHEDULER' THEN
      v_context := get_scheduler_permission_context(p_user_id);
    WHEN 'BOSS', 'PEER_ADMIN' THEN
      v_context := get_admin_permission_context(p_user_id);
    ELSE
      v_context := jsonb_build_object(
        'success', false,
        'error', '未知的用户角色'
      );
  END CASE;

  RETURN v_context;
END;
$$;