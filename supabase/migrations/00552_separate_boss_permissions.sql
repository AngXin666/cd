/*
# 将BOSS权限从策略模板中分离

## 需求描述
将老板的权限从策略模板中单独转移出来，用单独的策略表。
老板拥有系统最高操作权，不受任何限制。

## 当前问题
- BOSS和PEER_ADMIN共用is_admin()函数
- BOSS使用"管理员可以XXX"的RLS策略
- BOSS和PEER_ADMIN权限检查混在一起
- 存在boss_full_access策略模板，但BOSS不应该使用策略模板

## 解决方案
1. 创建is_boss()函数，只检查BOSS角色
2. 修改is_admin()函数，只检查PEER_ADMIN（有完整控制权）
3. 为users表创建独立的BOSS RLS策略
4. 删除boss_full_access策略模板（BOSS不使用策略模板）
5. 确保BOSS有最高权限，不受任何限制

## 执行时间
2025-12-01
*/

-- ============================================
-- 第一部分：创建is_boss()函数
-- ============================================

-- 1.1 创建is_boss()函数
CREATE OR REPLACE FUNCTION is_boss(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 只检查BOSS角色
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'BOSS'
  );
END;
$$;

COMMENT ON FUNCTION is_boss(uuid) IS '检查用户是否为BOSS（老板）';

-- ============================================
-- 第二部分：修改is_admin()函数
-- ============================================

-- 2.1 修改is_admin()函数，只检查PEER_ADMIN
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 只检查PEER_ADMIN（有完整控制权）
  -- BOSS不再通过is_admin()检查，使用独立的is_boss()
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN user_permission_assignments upa ON upa.user_id = ur.user_id
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE ur.user_id = uid 
      AND ur.role = 'PEER_ADMIN'
      AND ps.strategy_name = 'peer_admin_full_control'
      AND ps.is_active = true
  );
END;
$$;

COMMENT ON FUNCTION is_admin(uuid) IS '检查用户是否为PEER_ADMIN（有完整控制权）';

-- ============================================
-- 第三部分：为users表创建独立的BOSS RLS策略
-- ============================================

-- 3.1 删除旧的"管理员"策略（如果存在）
DROP POLICY IF EXISTS "管理员可以查看所有用户" ON users;
DROP POLICY IF EXISTS "管理员可以插入用户" ON users;
DROP POLICY IF EXISTS "管理员可以更新所有用户" ON users;
DROP POLICY IF EXISTS "管理员可以删除所有用户" ON users;

-- 3.2 创建BOSS独立策略

-- BOSS可以查看所有用户
CREATE POLICY "BOSS可以查看所有用户" ON users
  FOR SELECT
  USING (is_boss(auth.uid()));

-- BOSS可以插入用户
CREATE POLICY "BOSS可以插入用户" ON users
  FOR INSERT
  WITH CHECK (is_boss(auth.uid()));

-- BOSS可以更新所有用户
CREATE POLICY "BOSS可以更新所有用户" ON users
  FOR UPDATE
  USING (is_boss(auth.uid()))
  WITH CHECK (is_boss(auth.uid()));

-- BOSS可以删除所有用户
CREATE POLICY "BOSS可以删除所有用户" ON users
  FOR DELETE
  USING (is_boss(auth.uid()));

-- 3.3 创建PEER_ADMIN策略

-- PEER_ADMIN（完整控制权）可以查看所有用户
CREATE POLICY "PEER_ADMIN（完整控制权）可以查看所有用户" ON users
  FOR SELECT
  USING (peer_admin_has_full_control(auth.uid()));

-- PEER_ADMIN（完整控制权）可以插入用户
CREATE POLICY "PEER_ADMIN（完整控制权）可以插入用户" ON users
  FOR INSERT
  WITH CHECK (peer_admin_has_full_control(auth.uid()));

-- PEER_ADMIN（完整控制权）可以更新所有用户
CREATE POLICY "PEER_ADMIN（完整控制权）可以更新所有用户" ON users
  FOR UPDATE
  USING (peer_admin_has_full_control(auth.uid()))
  WITH CHECK (peer_admin_has_full_control(auth.uid()));

-- PEER_ADMIN（完整控制权）可以删除所有用户
CREATE POLICY "PEER_ADMIN（完整控制权）可以删除所有用户" ON users
  FOR DELETE
  USING (peer_admin_has_full_control(auth.uid()));

-- ============================================
-- 第四部分：删除boss_full_access策略模板
-- ============================================

-- 4.1 删除boss_full_access策略模板（BOSS不使用策略模板）
DELETE FROM permission_strategies
WHERE strategy_name = 'boss_full_access';

-- ============================================
-- 第五部分：更新其他权限管理函数
-- ============================================

-- 5.1 更新create_peer_admin()函数，使用is_boss()检查
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
  -- 1. 检查调用者是否为BOSS
  IF NOT is_boss(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以创建PEER_ADMIN';
  END IF;
  
  -- 2. 检查用户是否已有PEER_ADMIN角色
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'PEER_ADMIN'
  ) THEN
    RAISE EXCEPTION '用户已经是PEER_ADMIN';
  END IF;
  
  -- 3. 验证权限级别
  IF p_permission_level NOT IN ('full_control', 'view_only') THEN
    RAISE EXCEPTION '无效的权限级别，必须是 full_control 或 view_only';
  END IF;
  
  -- 4. 确定策略名称
  v_strategy_name := 'peer_admin_' || p_permission_level;
  
  -- 5. 查找策略ID
  SELECT id INTO v_strategy_id
  FROM permission_strategies
  WHERE strategy_name = v_strategy_name
    AND is_active = true;
  
  IF v_strategy_id IS NULL THEN
    RAISE EXCEPTION '策略模板不存在或未激活: %', v_strategy_name;
  END IF;
  
  -- 6. 添加PEER_ADMIN角色
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'PEER_ADMIN');
  
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
    'message', 'PEER_ADMIN创建成功',
    'user_id', p_user_id,
    'permission_level', p_permission_level
  );
END;
$$;

-- 5.2 更新update_peer_admin_permission()函数
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
  -- 1. 检查调用者是否为BOSS
  IF NOT is_boss(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以更新PEER_ADMIN权限';
  END IF;
  
  -- 2. 检查用户是否为PEER_ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'PEER_ADMIN'
  ) THEN
    RAISE EXCEPTION '用户不是PEER_ADMIN';
  END IF;
  
  -- 3. 验证权限级别
  IF p_permission_level NOT IN ('full_control', 'view_only') THEN
    RAISE EXCEPTION '无效的权限级别，必须是 full_control 或 view_only';
  END IF;
  
  -- 4. 确定新策略名称
  v_new_strategy_name := 'peer_admin_' || p_permission_level;
  
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
    AND ps.strategy_name IN ('peer_admin_full_control', 'peer_admin_view_only');
  
  -- 7. 如果策略相同，只更新备注
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
    'message', 'PEER_ADMIN权限已更新',
    'user_id', p_user_id,
    'permission_level', p_permission_level
  );
END;
$$;

-- 5.3 更新remove_peer_admin()函数
CREATE OR REPLACE FUNCTION remove_peer_admin(
  p_user_id uuid,
  p_boss_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. 检查调用者是否为BOSS
  IF NOT is_boss(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以删除PEER_ADMIN';
  END IF;
  
  -- 2. 检查用户是否为PEER_ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'PEER_ADMIN'
  ) THEN
    RAISE EXCEPTION '用户不是PEER_ADMIN';
  END IF;
  
  -- 3. 删除权限分配记录
  DELETE FROM user_permission_assignments upa
  USING permission_strategies ps
  WHERE upa.user_id = p_user_id
    AND upa.strategy_id = ps.id
    AND ps.strategy_name IN ('peer_admin_full_control', 'peer_admin_view_only');
  
  -- 4. 删除PEER_ADMIN角色
  DELETE FROM user_roles
  WHERE user_id = p_user_id AND role = 'PEER_ADMIN';
  
  -- 5. 返回成功信息
  RETURN json_build_object(
    'success', true,
    'message', 'PEER_ADMIN已删除',
    'user_id', p_user_id
  );
END;
$$;

-- 5.4 更新get_all_peer_admins()函数
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
  -- 检查调用者是否为BOSS
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

-- 5.5 更新create_manager()函数
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
  IF NOT is_boss(p_boss_id) THEN
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

-- 5.6 更新update_manager_permission()函数
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
  IF NOT is_boss(p_boss_id) THEN
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

-- 5.7 更新remove_manager()函数
CREATE OR REPLACE FUNCTION remove_manager(
  p_user_id uuid,
  p_boss_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. 检查调用者是否为BOSS
  IF NOT is_boss(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以删除MANAGER';
  END IF;
  
  -- 2. 检查用户是否为MANAGER
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'MANAGER'
  ) THEN
    RAISE EXCEPTION '用户不是MANAGER';
  END IF;
  
  -- 3. 删除权限分配记录
  DELETE FROM user_permission_assignments upa
  USING permission_strategies ps
  WHERE upa.user_id = p_user_id
    AND upa.strategy_id = ps.id
    AND ps.strategy_name IN ('manager_full_control', 'manager_view_only');
  
  -- 4. 删除MANAGER角色
  DELETE FROM user_roles
  WHERE user_id = p_user_id AND role = 'MANAGER';
  
  -- 5. 返回成功信息
  RETURN json_build_object(
    'success', true,
    'message', 'MANAGER已删除',
    'user_id', p_user_id
  );
END;
$$;

-- 5.8 更新get_all_managers()函数
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
  -- 检查调用者是否为BOSS
  IF NOT is_boss(p_boss_id) THEN
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

-- ============================================
-- 第六部分：验证
-- ============================================

-- 6.1 验证is_boss()函数已创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_boss'
  ) THEN
    RAISE EXCEPTION 'is_boss()函数创建失败';
  END IF;
  
  RAISE NOTICE 'is_boss()函数创建成功';
END $$;

-- 6.2 验证BOSS RLS策略已创建
DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND policyname LIKE 'BOSS%';
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'BOSS RLS策略创建失败，只创建了%个策略', policy_count;
  END IF;
  
  RAISE NOTICE '成功创建%个BOSS RLS策略', policy_count;
END $$;

-- 6.3 验证boss_full_access策略模板已删除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM permission_strategies
    WHERE strategy_name = 'boss_full_access'
  ) THEN
    RAISE EXCEPTION 'boss_full_access策略模板删除失败';
  END IF;
  
  RAISE NOTICE 'boss_full_access策略模板已删除';
END $$;
