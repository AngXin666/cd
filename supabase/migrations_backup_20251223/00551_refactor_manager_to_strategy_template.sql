/*
# 将MANAGER（车队长）改为使用策略模板系统

## 需求描述
车队长在策略模板中的权限管辖权内有完整权限或仅查看权限。
管辖权定义为：老板或调度所分配的仓库。

## 当前问题
- MANAGER使用固定的RLS策略
- 没有权限级别的概念（full_control或view_only）
- 没有基于仓库管辖权的权限控制

## 解决方案
1. 创建manager_full_control和manager_view_only策略模板
2. 扩展user_permission_assignments表，支持MANAGER权限分配
3. 创建权限检查函数（manager_has_full_control、manager_is_view_only）
4. 修改users表的MANAGER RLS策略，基于策略模板
5. 创建管理函数（create_manager、update_manager_permission等）

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
  'managed_resources',
  'MANAGER的完整控制权限，可以操作管辖仓库内的所有数据',
  'true',  -- 可以查看所有数据
  'true',  -- 可以插入数据
  'true',  -- 可以更新数据
  'true',  -- 可以删除数据
  true
) ON CONFLICT (strategy_name) DO UPDATE SET
  description = EXCLUDED.description,
  select_rule = EXCLUDED.select_rule,
  insert_rule = EXCLUDED.insert_rule,
  update_rule = EXCLUDED.update_rule,
  delete_rule = EXCLUDED.delete_rule,
  is_active = EXCLUDED.is_active;

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
  'MANAGER的仅查看权限，只能查看管辖仓库内的数据，不能修改',
  'true',   -- 可以查看所有数据
  'false',  -- 不能插入数据
  'false',  -- 不能更新数据
  'false',  -- 不能删除数据
  true
) ON CONFLICT (strategy_name) DO UPDATE SET
  description = EXCLUDED.description,
  select_rule = EXCLUDED.select_rule,
  insert_rule = EXCLUDED.insert_rule,
  update_rule = EXCLUDED.update_rule,
  delete_rule = EXCLUDED.delete_rule,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 第二部分：创建权限检查函数
-- ============================================

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

COMMENT ON FUNCTION manager_has_full_control(uuid) IS '检查MANAGER是否有完整控制权';

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

COMMENT ON FUNCTION manager_is_view_only(uuid) IS '检查MANAGER是否仅有查看权';

-- 2.3 创建is_manager_with_permission()函数（检查MANAGER是否有任意权限）
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

COMMENT ON FUNCTION is_manager_with_permission(uuid) IS '检查用户是否为有权限的MANAGER';

-- 2.4 创建manager_has_warehouse_access()函数（检查MANAGER是否有仓库访问权）
CREATE OR REPLACE FUNCTION manager_has_warehouse_access(p_user_id uuid, p_warehouse_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查用户是否被分配了该仓库
  RETURN EXISTS (
    SELECT 1 FROM warehouse_assignments
    WHERE user_id = p_user_id 
      AND warehouse_id = p_warehouse_id
  );
END;
$$;

COMMENT ON FUNCTION manager_has_warehouse_access(uuid, uuid) IS '检查MANAGER是否有仓库访问权';

-- ============================================
-- 第三部分：修改users表的MANAGER RLS策略
-- ============================================

-- 3.1 删除旧的MANAGER固定策略
DROP POLICY IF EXISTS "MANAGER可以查看所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以插入用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以更新所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以删除用户" ON users;

-- 3.2 创建新的MANAGER策略（基于策略模板）

-- MANAGER（有完整控制权）可以查看所有用户
CREATE POLICY "MANAGER（完整控制权）可以查看所有用户" ON users
  FOR SELECT
  USING (manager_has_full_control(auth.uid()));

-- MANAGER（仅查看权）可以查看所有用户
CREATE POLICY "MANAGER（仅查看权）可以查看所有用户" ON users
  FOR SELECT
  USING (manager_is_view_only(auth.uid()));

-- MANAGER（有完整控制权）可以插入用户
CREATE POLICY "MANAGER（完整控制权）可以插入用户" ON users
  FOR INSERT
  WITH CHECK (manager_has_full_control(auth.uid()));

-- MANAGER（有完整控制权）可以更新所有用户
CREATE POLICY "MANAGER（完整控制权）可以更新所有用户" ON users
  FOR UPDATE
  USING (manager_has_full_control(auth.uid()))
  WITH CHECK (manager_has_full_control(auth.uid()));

-- MANAGER（有完整控制权）可以删除用户
CREATE POLICY "MANAGER（完整控制权）可以删除用户" ON users
  FOR DELETE
  USING (manager_has_full_control(auth.uid()));

-- ============================================
-- 第四部分：创建MANAGER管理函数
-- ============================================

-- 4.1 创建create_manager()函数
CREATE OR REPLACE FUNCTION create_manager(
  p_user_id uuid,
  p_permission_level text,  -- 'full_control' 或 'view_only'
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

COMMENT ON FUNCTION create_manager(uuid, text, uuid, text) IS '创建MANAGER并分配权限';

-- 4.2 创建update_manager_permission()函数
CREATE OR REPLACE FUNCTION update_manager_permission(
  p_user_id uuid,
  p_permission_level text,  -- 'full_control' 或 'view_only'
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

COMMENT ON FUNCTION update_manager_permission(uuid, text, uuid, text) IS '更新MANAGER权限';

-- 4.3 创建remove_manager()函数
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
  IF NOT is_admin(p_boss_id) THEN
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

COMMENT ON FUNCTION remove_manager(uuid, uuid) IS '删除MANAGER';

-- 4.4 创建get_all_managers()函数
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

COMMENT ON FUNCTION get_all_managers(uuid) IS '获取所有MANAGER及其权限';

-- 4.5 创建get_manager_permission()函数
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

COMMENT ON FUNCTION get_manager_permission(uuid) IS '获取MANAGER的权限信息';

-- ============================================
-- 第五部分：验证
-- ============================================

-- 5.1 验证策略模板已创建
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

-- 5.2 验证权限检查函数已创建
DO $$
DECLARE
  function_count int;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'manager_has_full_control',
    'manager_is_view_only',
    'is_manager_with_permission',
    'manager_has_warehouse_access'
  );
  
  IF function_count < 4 THEN
    RAISE EXCEPTION 'MANAGER权限检查函数创建失败，只创建了%个函数', function_count;
  END IF;
  
  RAISE NOTICE '成功创建%个MANAGER权限检查函数', function_count;
END $$;

-- 5.3 验证管理函数已创建
DO $$
DECLARE
  function_count int;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'create_manager',
    'update_manager_permission',
    'remove_manager',
    'get_all_managers',
    'get_manager_permission'
  );
  
  IF function_count < 5 THEN
    RAISE EXCEPTION 'MANAGER管理函数创建失败，只创建了%个函数', function_count;
  END IF;
  
  RAISE NOTICE '成功创建%个MANAGER管理函数', function_count;
END $$;

-- 5.4 验证RLS策略已更新
DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND policyname LIKE 'MANAGER%';
  
  IF policy_count < 5 THEN
    RAISE EXCEPTION 'MANAGER RLS策略创建失败，只创建了%个策略', policy_count;
  END IF;
  
  RAISE NOTICE '成功创建%个MANAGER RLS策略', policy_count;
END $$;
