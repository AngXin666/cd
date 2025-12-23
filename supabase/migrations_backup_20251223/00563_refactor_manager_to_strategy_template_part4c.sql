-- 第四部分C：创建remove_manager()、get_all_managers()、get_manager_permission()函数

CREATE OR REPLACE FUNCTION remove_manager(
  p_user_id uuid,
  p_boss_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以删除MANAGER';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'MANAGER'
  ) THEN
    RAISE EXCEPTION '用户不是MANAGER';
  END IF;
  
  DELETE FROM user_permission_assignments upa
  USING permission_strategies ps
  WHERE upa.user_id = p_user_id
    AND upa.strategy_id = ps.id
    AND ps.strategy_name IN ('manager_full_control', 'manager_view_only');
  
  DELETE FROM user_roles
  WHERE user_id = p_user_id AND role = 'MANAGER';
  
  RETURN json_build_object(
    'success', true,
    'message', 'MANAGER已删除',
    'user_id', p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_all_managers(p_boss_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_phone text,
  permission_level text,
  strategy_name text,
  granted_at timestamptz,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF NOT is_admin(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以查看所有MANAGER';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.phone AS user_phone,
    upa.permission_level,
    ps.strategy_name,
    upa.granted_at,
    upa.notes
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN user_permission_assignments upa ON upa.user_id = u.id
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  WHERE ur.role = 'MANAGER'
    AND ps.strategy_name IN ('manager_full_control', 'manager_view_only')
  ORDER BY u.name;
END;
$$;

CREATE OR REPLACE FUNCTION get_manager_permission(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  permission_level text,
  strategy_name text,
  granted_at timestamptz,
  granted_by_id uuid,
  granted_by_name text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.name AS user_name,
    upa.permission_level,
    ps.strategy_name,
    upa.granted_at,
    granter.id AS granted_by_id,
    granter.name AS granted_by_name,
    upa.notes
  FROM users u
  JOIN user_permission_assignments upa ON upa.user_id = u.id
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  JOIN users granter ON granter.id = upa.granted_by
  WHERE u.id = p_user_id
    AND ps.strategy_name IN ('manager_full_control', 'manager_view_only')
  LIMIT 1;
END;
$$;