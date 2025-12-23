-- 第五部分A：更新PEER_ADMIN管理函数

CREATE OR REPLACE FUNCTION create_peer_admin(
  p_user_id uuid,
  p_permission_level text,
  p_boss_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_strategy_id uuid;
  v_strategy_name text;
BEGIN
  IF NOT is_boss(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以创建PEER_ADMIN';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'PEER_ADMIN'
  ) THEN
    RAISE EXCEPTION '用户已经是PEER_ADMIN';
  END IF;
  
  IF p_permission_level NOT IN ('full_control', 'view_only') THEN
    RAISE EXCEPTION '无效的权限级别，必须是 full_control 或 view_only';
  END IF;
  
  v_strategy_name := 'peer_admin_' || p_permission_level;
  
  SELECT id INTO v_strategy_id
  FROM permission_strategies
  WHERE strategy_name = v_strategy_name
    AND is_active = true;
  
  IF v_strategy_id IS NULL THEN
    RAISE EXCEPTION '策略模板不存在或未激活: %', v_strategy_name;
  END IF;
  
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'PEER_ADMIN');
  
  INSERT INTO user_permission_assignments (
    user_id,
    strategy_id,
    permission_level,
    granted_by,
    notes
  ) VALUES (
    p_user_id,
    v_strategy_id,
    p_permission_level,
    p_boss_id,
    p_notes
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'PEER_ADMIN创建成功',
    'user_id', p_user_id,
    'permission_level', p_permission_level
  );
END;
$$;

CREATE OR REPLACE FUNCTION update_peer_admin_permission(
  p_user_id uuid,
  p_permission_level text,
  p_boss_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_strategy_id uuid;
  v_new_strategy_id uuid;
  v_new_strategy_name text;
BEGIN
  IF NOT is_boss(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以更新PEER_ADMIN权限';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'PEER_ADMIN'
  ) THEN
    RAISE EXCEPTION '用户不是PEER_ADMIN';
  END IF;
  
  IF p_permission_level NOT IN ('full_control', 'view_only') THEN
    RAISE EXCEPTION '无效的权限级别，必须是 full_control 或 view_only';
  END IF;
  
  v_new_strategy_name := 'peer_admin_' || p_permission_level;
  
  SELECT id INTO v_new_strategy_id
  FROM permission_strategies
  WHERE strategy_name = v_new_strategy_name
    AND is_active = true;
  
  IF v_new_strategy_id IS NULL THEN
    RAISE EXCEPTION '策略模板不存在或未激活: %', v_new_strategy_name;
  END IF;
  
  SELECT upa.strategy_id INTO v_old_strategy_id
  FROM user_permission_assignments upa
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  WHERE upa.user_id = p_user_id
    AND ps.strategy_name IN ('peer_admin_full_control', 'peer_admin_view_only');
  
  IF v_old_strategy_id = v_new_strategy_id THEN
    UPDATE user_permission_assignments
    SET notes = p_notes,
        updated_at = now()
    WHERE user_id = p_user_id
      AND strategy_id = v_old_strategy_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'PEER_ADMIN权限备注已更新',
      'user_id', p_user_id,
      'permission_level', p_permission_level
    );
  END IF;
  
  DELETE FROM user_permission_assignments
  WHERE user_id = p_user_id
    AND strategy_id = v_old_strategy_id;
  
  INSERT INTO user_permission_assignments (
    user_id,
    strategy_id,
    permission_level,
    granted_by,
    notes
  ) VALUES (
    p_user_id,
    v_new_strategy_id,
    p_permission_level,
    p_boss_id,
    p_notes
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'PEER_ADMIN权限已更新',
    'user_id', p_user_id,
    'permission_level', p_permission_level
  );
END;
$$;

CREATE OR REPLACE FUNCTION remove_peer_admin(
  p_user_id uuid,
  p_boss_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_boss(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以删除PEER_ADMIN';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'PEER_ADMIN'
  ) THEN
    RAISE EXCEPTION '用户不是PEER_ADMIN';
  END IF;
  
  DELETE FROM user_permission_assignments upa
  USING permission_strategies ps
  WHERE upa.user_id = p_user_id
    AND upa.strategy_id = ps.id
    AND ps.strategy_name IN ('peer_admin_full_control', 'peer_admin_view_only');
  
  DELETE FROM user_roles
  WHERE user_id = p_user_id AND role = 'PEER_ADMIN';
  
  RETURN json_build_object(
    'success', true,
    'message', 'PEER_ADMIN已删除',
    'user_id', p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_all_peer_admins(p_boss_id uuid)
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
  IF NOT is_boss(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以查看所有PEER_ADMIN';
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
  WHERE ur.role = 'PEER_ADMIN'
    AND ps.strategy_name IN ('peer_admin_full_control', 'peer_admin_view_only')
  ORDER BY u.name;
END;
$$;