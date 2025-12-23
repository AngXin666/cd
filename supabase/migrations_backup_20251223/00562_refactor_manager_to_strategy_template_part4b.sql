-- 第四部分B：创建update_manager_permission()函数

CREATE OR REPLACE FUNCTION update_manager_permission(
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
  -- 1. 检查调用者是否为BOSS
  IF NOT is_admin(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以更新MANAGER权限';
  END IF;
  
  -- 2. 检查用户是否为MANAGER
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'MANAGER'
  ) THEN
    RAISE EXCEPTION '用户不是MANAGER';
  END IF;
  
  -- 3. 验证权限级别
  IF p_permission_level NOT IN ('full_control', 'view_only') THEN
    RAISE EXCEPTION '无效的权限级别，必须是 full_control 或 view_only';
  END IF;
  
  -- 4. 确定新策略名称
  v_new_strategy_name := 'manager_' || p_permission_level;
  
  -- 5. 查找新策略ID
  SELECT id INTO v_new_strategy_id
  FROM permission_strategies
  WHERE strategy_name = v_new_strategy_name
    AND is_active = true;
  
  IF v_new_strategy_id IS NULL THEN
    RAISE EXCEPTION '策略模板不存在或未激活: %', v_new_strategy_name;
  END IF;
  
  -- 6. 查找旧策略ID
  SELECT upa.strategy_id INTO v_old_strategy_id
  FROM user_permission_assignments upa
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  WHERE upa.user_id = p_user_id
    AND ps.strategy_name IN ('manager_full_control', 'manager_view_only');
  
  -- 7. 如果策略相同，只更新备注
  IF v_old_strategy_id = v_new_strategy_id THEN
    UPDATE user_permission_assignments
    SET notes = p_notes,
        updated_at = now()
    WHERE user_id = p_user_id
      AND strategy_id = v_old_strategy_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'MANAGER权限备注已更新',
      'user_id', p_user_id,
      'permission_level', p_permission_level
    );
  END IF;
  
  -- 8. 删除旧的权限分配
  DELETE FROM user_permission_assignments
  WHERE user_id = p_user_id
    AND strategy_id = v_old_strategy_id;
  
  -- 9. 创建新的权限分配
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
  
  -- 10. 返回成功信息
  RETURN json_build_object(
    'success', true,
    'message', 'MANAGER权限已更新',
    'user_id', p_user_id,
    'permission_level', p_permission_level
  );
END;
$$;