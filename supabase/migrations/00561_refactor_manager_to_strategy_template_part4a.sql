-- 第四部分A：创建create_manager()函数

CREATE OR REPLACE FUNCTION create_manager(
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
  -- 1. 检查调用者是否为BOSS
  IF NOT is_admin(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以创建MANAGER';
  END IF;
  
  -- 2. 检查用户是否已有MANAGER角色
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'MANAGER'
  ) THEN
    RAISE EXCEPTION '用户已经是MANAGER';
  END IF;
  
  -- 3. 验证权限级别
  IF p_permission_level NOT IN ('full_control', 'view_only') THEN
    RAISE EXCEPTION '无效的权限级别，必须是 full_control 或 view_only';
  END IF;
  
  -- 4. 确定策略名称
  v_strategy_name := 'manager_' || p_permission_level;
  
  -- 5. 查找策略ID
  SELECT id INTO v_strategy_id
  FROM permission_strategies
  WHERE strategy_name = v_strategy_name
    AND is_active = true;
  
  IF v_strategy_id IS NULL THEN
    RAISE EXCEPTION '策略模板不存在或未激活: %', v_strategy_name;
  END IF;
  
  -- 6. 添加MANAGER角色
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'MANAGER');
  
  -- 7. 创建权限分配记录
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
  
  -- 8. 返回成功信息
  RETURN json_build_object(
    'success', true,
    'message', 'MANAGER创建成功',
    'user_id', p_user_id,
    'permission_level', p_permission_level
  );
END;
$$;