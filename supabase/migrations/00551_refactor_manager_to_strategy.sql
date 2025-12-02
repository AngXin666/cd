/*
# 将MANAGER（车队长）权限迁移到策略模板系统

## 问题描述
当前MANAGER使用固定的RLS策略，所有MANAGER都有相同的权限。
需要像PEER_ADMIN一样，支持两种权限级别：
- full_control（完整控制权）
- view_only（仅查看权）

## 解决方案
1. 创建MANAGER的策略模板
2. 修改MANAGER的RLS策略，使用策略模板
3. 创建MANAGER权限管理函数
4. 创建权限检查函数

## 执行时间
2025-12-01
*/

-- ============================================
-- 第一部分：创建MANAGER策略模板
-- ============================================

-- 1.1 创建manager_full_control策略模板
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule,
  is_active
) VALUES (
  'manager_full_control',
  'all_access',
  'MANAGER的完整控制权限，可以操作所有数据',
  'true',
  'true',
  'true',
  'true',
  true
) ON CONFLICT (strategy_name) DO NOTHING;

-- 1.2 创建manager_view_only策略模板
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule,
  is_active
) VALUES (
  'manager_view_only',
  'view_only',
  'MANAGER的仅查看权限，只能查看所有数据，不能修改',
  'true',
  'false',
  'false',
  'false',
  true
) ON CONFLICT (strategy_name) DO NOTHING;

-- ============================================
-- 第二部分：为现有MANAGER分配默认权限
-- ============================================

-- 2.1 为所有现有的MANAGER分配full_control权限
INSERT INTO user_permission_assignments (
  user_id,
  strategy_id,
  permission_level,
  granted_by,
  granted_at,
  updated_at,
  notes
)
SELECT 
  ur.user_id,
  ps.id AS strategy_id,
  'full_control' AS permission_level,
  ur.user_id AS granted_by,  -- 自己授予自己（系统迁移）
  now() AS granted_at,
  now() AS updated_at,
  '系统自动迁移：将现有MANAGER分配完整控制权' AS notes
FROM user_roles ur
JOIN permission_strategies ps ON ps.strategy_name = 'manager_full_control'
WHERE ur.role = 'MANAGER'
ON CONFLICT (user_id, strategy_id) DO NOTHING;

-- ============================================
-- 第三部分：创建MANAGER权限检查函数
-- ============================================

-- 3.1 检查MANAGER是否有完整控制权
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

COMMENT ON FUNCTION manager_has_full_control(uuid) IS '检查MANAGER是否有完整控制权';

-- 3.2 检查MANAGER是否仅有查看权
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

COMMENT ON FUNCTION manager_is_view_only(uuid) IS '检查MANAGER是否仅有查看权';

-- 3.3 检查MANAGER是否有任何权限（full_control或view_only）
CREATE OR REPLACE FUNCTION is_manager_with_permission(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为MANAGER角色
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND role = 'MANAGER'
  ) THEN
    RETURN false;
  END IF;
  
  -- 检查是否有任何MANAGER权限（full_control或view_only）
  RETURN EXISTS (
    SELECT 1 FROM user_permission_assignments upa
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE upa.user_id = uid 
      AND ps.strategy_name IN ('manager_full_control', 'manager_view_only')
      AND ps.is_active = true
  );
END;
$$;

COMMENT ON FUNCTION is_manager_with_permission(uuid) IS '检查MANAGER是否有任何权限（full_control或view_only）';

-- ============================================
-- 第四部分：删除旧的MANAGER RLS策略
-- ============================================

-- 4.1 删除旧的MANAGER策略
DROP POLICY IF EXISTS "MANAGER可以查看所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以插入用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以更新所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以删除用户" ON users;

-- ============================================
-- 第五部分：创建新的MANAGER RLS策略
-- ============================================

-- 5.1 MANAGER（有任何权限）可以查看所有用户
CREATE POLICY "MANAGER可以查看所有用户" ON users
  FOR SELECT
  USING (is_manager_with_permission(auth.uid()));

-- 5.2 MANAGER（有完整控制权）可以插入用户
CREATE POLICY "MANAGER可以插入用户" ON users
  FOR INSERT
  WITH CHECK (manager_has_full_control(auth.uid()));

-- 5.3 MANAGER（有完整控制权）可以更新所有用户
CREATE POLICY "MANAGER可以更新所有用户" ON users
  FOR UPDATE
  USING (manager_has_full_control(auth.uid()))
  WITH CHECK (manager_has_full_control(auth.uid()));

-- 5.4 MANAGER（有完整控制权）可以删除用户
CREATE POLICY "MANAGER可以删除用户" ON users
  FOR DELETE
  USING (manager_has_full_control(auth.uid()));

-- ============================================
-- 第六部分：创建MANAGER权限管理函数
-- ============================================

-- 6.1 创建MANAGER权限
CREATE OR REPLACE FUNCTION create_manager_permission(
  p_user_id uuid,
  p_permission_level text,  -- 'full_control' 或 'view_only'
  p_boss_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_strategy_id uuid;
  v_strategy_name text;
BEGIN
  -- 检查是否为BOSS
  IF NOT is_admin(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以分配MANAGER权限';
  END IF;
  
  -- 检查用户是否为MANAGER
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'MANAGER'
  ) THEN
    RAISE EXCEPTION '用户不是MANAGER角色';
  END IF;
  
  -- 检查权限级别是否有效
  IF p_permission_level NOT IN ('full_control', 'view_only') THEN
    RAISE EXCEPTION '无效的权限级别: %。必须是 full_control 或 view_only', p_permission_level;
  END IF;
  
  -- 确定策略名称
  v_strategy_name := 'manager_' || p_permission_level;
  
  -- 查找策略ID
  SELECT id INTO v_strategy_id
  FROM permission_strategies
  WHERE strategy_name = v_strategy_name
    AND is_active = true;
  
  IF v_strategy_id IS NULL THEN
    RAISE EXCEPTION '找不到策略模板: %', v_strategy_name;
  END IF;
  
  -- 删除该用户的所有MANAGER权限（确保只有一个权限级别）
  DELETE FROM user_permission_assignments
  WHERE user_id = p_user_id
    AND strategy_id IN (
      SELECT id FROM permission_strategies
      WHERE strategy_name IN ('manager_full_control', 'manager_view_only')
    );
  
  -- 创建新的权限分配
  INSERT INTO user_permission_assignments (
    user_id,
    strategy_id,
    permission_level,
    granted_by,
    granted_at,
    updated_at,
    notes
  ) VALUES (
    p_user_id,
    v_strategy_id,
    p_permission_level,
    p_boss_id,
    now(),
    now(),
    p_notes
  );
  
  -- 记录日志
  PERFORM log_permission_change(
    'manager_permission_created',
    p_user_id,
    p_boss_id,
    jsonb_build_object(
      'permission_level', p_permission_level,
      'strategy_name', v_strategy_name,
      'notes', p_notes
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'permission_level', p_permission_level,
    'strategy_name', v_strategy_name
  );
END;
$$;

COMMENT ON FUNCTION create_manager_permission(uuid, text, uuid, text) IS '为MANAGER分配权限（full_control或view_only）';

-- 6.2 更新MANAGER权限
CREATE OR REPLACE FUNCTION update_manager_permission(
  p_user_id uuid,
  p_permission_level text,  -- 'full_control' 或 'view_only'
  p_boss_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_permission_level text;
  v_strategy_id uuid;
  v_strategy_name text;
BEGIN
  -- 检查是否为BOSS
  IF NOT is_admin(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以更新MANAGER权限';
  END IF;
  
  -- 检查用户是否为MANAGER
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'MANAGER'
  ) THEN
    RAISE EXCEPTION '用户不是MANAGER角色';
  END IF;
  
  -- 检查权限级别是否有效
  IF p_permission_level NOT IN ('full_control', 'view_only') THEN
    RAISE EXCEPTION '无效的权限级别: %。必须是 full_control 或 view_only', p_permission_level;
  END IF;
  
  -- 获取当前权限级别
  SELECT upa.permission_level INTO v_old_permission_level
  FROM user_permission_assignments upa
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  WHERE upa.user_id = p_user_id
    AND ps.strategy_name IN ('manager_full_control', 'manager_view_only')
  LIMIT 1;
  
  IF v_old_permission_level IS NULL THEN
    RAISE EXCEPTION 'MANAGER没有权限分配，请先创建权限';
  END IF;
  
  -- 如果权限级别相同，只更新备注
  IF v_old_permission_level = p_permission_level THEN
    UPDATE user_permission_assignments
    SET notes = p_notes,
        updated_at = now()
    WHERE user_id = p_user_id
      AND strategy_id IN (
        SELECT id FROM permission_strategies
        WHERE strategy_name IN ('manager_full_control', 'manager_view_only')
      );
    
    RETURN jsonb_build_object(
      'success', true,
      'user_id', p_user_id,
      'permission_level', p_permission_level,
      'message', '权限级别未变，已更新备注'
    );
  END IF;
  
  -- 确定新的策略名称
  v_strategy_name := 'manager_' || p_permission_level;
  
  -- 查找新的策略ID
  SELECT id INTO v_strategy_id
  FROM permission_strategies
  WHERE strategy_name = v_strategy_name
    AND is_active = true;
  
  IF v_strategy_id IS NULL THEN
    RAISE EXCEPTION '找不到策略模板: %', v_strategy_name;
  END IF;
  
  -- 删除旧的权限分配
  DELETE FROM user_permission_assignments
  WHERE user_id = p_user_id
    AND strategy_id IN (
      SELECT id FROM permission_strategies
      WHERE strategy_name IN ('manager_full_control', 'manager_view_only')
    );
  
  -- 创建新的权限分配
  INSERT INTO user_permission_assignments (
    user_id,
    strategy_id,
    permission_level,
    granted_by,
    granted_at,
    updated_at,
    notes
  ) VALUES (
    p_user_id,
    v_strategy_id,
    p_permission_level,
    p_boss_id,
    now(),
    now(),
    p_notes
  );
  
  -- 记录日志
  PERFORM log_permission_change(
    'manager_permission_changed',
    p_user_id,
    p_boss_id,
    jsonb_build_object(
      'old_permission_level', v_old_permission_level,
      'new_permission_level', p_permission_level,
      'strategy_name', v_strategy_name,
      'notes', p_notes
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_permission_level', v_old_permission_level,
    'new_permission_level', p_permission_level,
    'strategy_name', v_strategy_name
  );
END;
$$;

COMMENT ON FUNCTION update_manager_permission(uuid, text, uuid, text) IS '更新MANAGER权限级别';

-- 6.3 删除MANAGER权限
CREATE OR REPLACE FUNCTION remove_manager_permission(
  p_user_id uuid,
  p_boss_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_permission_level text;
BEGIN
  -- 检查是否为BOSS
  IF NOT is_admin(p_boss_id) THEN
    RAISE EXCEPTION '只有BOSS可以删除MANAGER权限';
  END IF;
  
  -- 获取当前权限级别
  SELECT upa.permission_level INTO v_permission_level
  FROM user_permission_assignments upa
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  WHERE upa.user_id = p_user_id
    AND ps.strategy_name IN ('manager_full_control', 'manager_view_only')
  LIMIT 1;
  
  IF v_permission_level IS NULL THEN
    RAISE EXCEPTION 'MANAGER没有权限分配';
  END IF;
  
  -- 删除权限分配
  DELETE FROM user_permission_assignments
  WHERE user_id = p_user_id
    AND strategy_id IN (
      SELECT id FROM permission_strategies
      WHERE strategy_name IN ('manager_full_control', 'manager_view_only')
    );
  
  -- 记录日志
  PERFORM log_permission_change(
    'manager_permission_removed',
    p_user_id,
    p_boss_id,
    jsonb_build_object(
      'permission_level', v_permission_level
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'removed_permission_level', v_permission_level
  );
END;
$$;

COMMENT ON FUNCTION remove_manager_permission(uuid, uuid) IS '删除MANAGER权限';

-- 6.4 获取所有MANAGER的权限
CREATE OR REPLACE FUNCTION get_all_managers(p_boss_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_phone text,
  permission_level text,
  strategy_name text,
  granted_at timestamptz,
  granted_by_name text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为BOSS
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
    granter.name AS granted_by_name,
    upa.notes
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN user_permission_assignments upa ON upa.user_id = u.id
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  LEFT JOIN users granter ON granter.id = upa.granted_by
  WHERE ur.role = 'MANAGER'
    AND ps.strategy_name IN ('manager_full_control', 'manager_view_only')
  ORDER BY u.name;
END;
$$;

COMMENT ON FUNCTION get_all_managers(uuid) IS '获取所有MANAGER的权限信息';

-- 6.5 获取单个MANAGER的权限
CREATE OR REPLACE FUNCTION get_manager_permission(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_phone text,
  permission_level text,
  strategy_name text,
  granted_at timestamptz,
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
    u.phone AS user_phone,
    upa.permission_level,
    ps.strategy_name,
    upa.granted_at,
    granter.name AS granted_by_name,
    upa.notes
  FROM users u
  JOIN user_permission_assignments upa ON upa.user_id = u.id
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  LEFT JOIN users granter ON granter.id = upa.granted_by
  WHERE u.id = p_user_id
    AND ps.strategy_name IN ('manager_full_control', 'manager_view_only')
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_manager_permission(uuid) IS '获取单个MANAGER的权限信息';

-- ============================================
-- 第七部分：验证迁移结果
-- ============================================

-- 7.1 验证策略模板已创建
DO $$
DECLARE
  strategy_count int;
BEGIN
  SELECT COUNT(*) INTO strategy_count
  FROM permission_strategies
  WHERE strategy_name IN ('manager_full_control', 'manager_view_only');
  
  IF strategy_count < 2 THEN
    RAISE EXCEPTION 'MANAGER策略模板创建失败，只创建了%个策略', strategy_count;
  END IF;
  
  RAISE NOTICE '成功创建%个MANAGER策略模板', strategy_count;
END $$;

-- 7.2 验证权限检查函数已创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'manager_has_full_control'
  ) THEN
    RAISE EXCEPTION 'manager_has_full_control函数创建失败';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'manager_is_view_only'
  ) THEN
    RAISE EXCEPTION 'manager_is_view_only函数创建失败';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_manager_with_permission'
  ) THEN
    RAISE EXCEPTION 'is_manager_with_permission函数创建失败';
  END IF;
  
  RAISE NOTICE '所有MANAGER权限检查函数创建成功';
END $$;

-- 7.3 验证RLS策略已更新
DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND policyname IN (
      'MANAGER可以查看所有用户',
      'MANAGER可以插入用户',
      'MANAGER可以更新所有用户',
      'MANAGER可以删除用户'
    );
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'MANAGER RLS策略创建失败，只创建了%个策略', policy_count;
  END IF;
  
  RAISE NOTICE '成功创建%个MANAGER RLS策略', policy_count;
END $$;

-- 7.4 验证现有MANAGER已分配权限
DO $$
DECLARE
  manager_count int;
  assigned_count int;
BEGIN
  SELECT COUNT(*) INTO manager_count
  FROM user_roles
  WHERE role = 'MANAGER';
  
  SELECT COUNT(*) INTO assigned_count
  FROM user_permission_assignments upa
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  WHERE ps.strategy_name IN ('manager_full_control', 'manager_view_only');
  
  IF assigned_count < manager_count THEN
    RAISE WARNING '有%个MANAGER，但只有%个被分配了权限', manager_count, assigned_count;
  ELSE
    RAISE NOTICE '所有%个MANAGER都已分配权限', manager_count;
  END IF;
END $$;
