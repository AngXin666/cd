-- 第二部分：创建权限检查函数

-- 2.1 创建manager_has_full_control()函数
CREATE OR REPLACE FUNCTION manager_has_full_control(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permission_assignments upa
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE upa.user_id = p_user_id 
      AND ps.strategy_name = 'manager_full_control'
      AND ps.is_active = true
  );
END;
$$;

-- 2.2 创建manager_is_view_only()函数
CREATE OR REPLACE FUNCTION manager_is_view_only(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permission_assignments upa
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE upa.user_id = p_user_id 
      AND ps.strategy_name = 'manager_view_only'
      AND ps.is_active = true
  );
END;
$$;

-- 2.3 创建is_manager_with_permission()函数
CREATE OR REPLACE FUNCTION is_manager_with_permission(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN user_permission_assignments upa ON upa.user_id = ur.user_id
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE ur.user_id = p_user_id 
      AND ur.role = 'MANAGER'
      AND ps.strategy_name IN ('manager_full_control', 'manager_view_only')
      AND ps.is_active = true
  );
END;
$$;

-- 2.4 创建manager_has_warehouse_access()函数
CREATE OR REPLACE FUNCTION manager_has_warehouse_access(p_user_id uuid, p_warehouse_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM warehouse_assignments
    WHERE user_id = p_user_id 
      AND warehouse_id = p_warehouse_id
  );
END;
$$;