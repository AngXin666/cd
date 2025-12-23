/*
# 权限系统重构 - 步骤6：应用新的 RLS 策略（warehouse_assignments 表）

## 说明
为 warehouse_assignments 表应用基于策略模板的动态 RLS 策略

## 策略设计
1. BOSS/MANAGER: 可以查看、创建、更新、删除所有仓库分配
2. DRIVER: 可以查看自己的仓库分配

## 业务逻辑
- 仓库分配由管理员管理
- 司机只能查看自己的分配记录
- 司机不能修改或删除分配记录

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 检查并启用 warehouse_assignments 表的 RLS
-- ============================================
ALTER TABLE warehouse_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 删除 warehouse_assignments 表的所有旧策略（如果存在）
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    JOIN pg_class ON pg_policy.polrelid = pg_class.oid
    WHERE pg_class.relname = 'warehouse_assignments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON warehouse_assignments', pol.polname);
  END LOOP;
END $$;

-- ============================================
-- 3. 应用新的 RLS 策略
-- ============================================

-- 策略1：管理员可以查看所有仓库分配
CREATE POLICY "new_admins_view_all_warehouse_assignments" ON warehouse_assignments
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略2：用户可以查看自己的仓库分配
CREATE POLICY "new_users_view_own_warehouse_assignments" ON warehouse_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- 策略3：管理员可以插入仓库分配
CREATE POLICY "new_admins_insert_warehouse_assignments" ON warehouse_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略4：管理员可以更新所有仓库分配
CREATE POLICY "new_admins_update_all_warehouse_assignments" ON warehouse_assignments
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略5：管理员可以删除仓库分配
CREATE POLICY "new_admins_delete_warehouse_assignments" ON warehouse_assignments
  FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- ============================================
-- 4. 更新资源权限配置
-- ============================================
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'warehouse_assignments',
  'user_id',
  NULL,
  false,
  NULL
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- ============================================
-- 5. 创建验证函数
-- ============================================
CREATE OR REPLACE FUNCTION verify_warehouse_assignments_table_policies()
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
  WHERE cls.relname = 'warehouse_assignments'
  ORDER BY pol.polname;
END;
$$;

COMMENT ON FUNCTION verify_warehouse_assignments_table_policies IS '验证 warehouse_assignments 表的策略是否正确应用';

-- ============================================
-- 6. 创建仓库分配管理辅助函数
-- ============================================

-- 为用户分配仓库
CREATE OR REPLACE FUNCTION assign_user_to_warehouse(
  p_user_id uuid,
  p_warehouse_id uuid,
  p_assigned_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  -- 检查分配者是否为管理员
  IF NOT is_admin(p_assigned_by) THEN
    RAISE EXCEPTION '只有管理员可以分配仓库';
  END IF;
  
  -- 检查用户是否存在
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION '用户不存在';
  END IF;
  
  -- 检查仓库是否存在
  IF NOT EXISTS (SELECT 1 FROM warehouses WHERE id = p_warehouse_id) THEN
    RAISE EXCEPTION '仓库不存在';
  END IF;
  
  -- 检查是否已经分配
  IF EXISTS (
    SELECT 1 FROM warehouse_assignments 
    WHERE user_id = p_user_id AND warehouse_id = p_warehouse_id
  ) THEN
    RAISE EXCEPTION '用户已经被分配到该仓库';
  END IF;
  
  -- 创建分配记录
  INSERT INTO warehouse_assignments (user_id, warehouse_id, assigned_by)
  VALUES (p_user_id, p_warehouse_id, p_assigned_by)
  RETURNING id INTO v_assignment_id;
  
  RETURN v_assignment_id;
END;
$$;

COMMENT ON FUNCTION assign_user_to_warehouse IS '为用户分配仓库';

-- 取消用户的仓库分配
CREATE OR REPLACE FUNCTION unassign_user_from_warehouse(
  p_user_id uuid,
  p_warehouse_id uuid,
  p_unassigned_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查取消分配者是否为管理员
  IF NOT is_admin(p_unassigned_by) THEN
    RAISE EXCEPTION '只有管理员可以取消仓库分配';
  END IF;
  
  -- 删除分配记录
  DELETE FROM warehouse_assignments
  WHERE user_id = p_user_id AND warehouse_id = p_warehouse_id;
  
  -- 检查是否删除成功
  IF NOT FOUND THEN
    RAISE EXCEPTION '分配记录不存在';
  END IF;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION unassign_user_from_warehouse IS '取消用户的仓库分配';

-- 批量分配用户到仓库
CREATE OR REPLACE FUNCTION batch_assign_users_to_warehouse(
  p_user_ids uuid[],
  p_warehouse_id uuid,
  p_assigned_by uuid
)
RETURNS TABLE (
  user_id uuid,
  success boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 检查分配者是否为管理员
  IF NOT is_admin(p_assigned_by) THEN
    RAISE EXCEPTION '只有管理员可以分配仓库';
  END IF;
  
  -- 检查仓库是否存在
  IF NOT EXISTS (SELECT 1 FROM warehouses WHERE id = p_warehouse_id) THEN
    RAISE EXCEPTION '仓库不存在';
  END IF;
  
  -- 遍历用户列表
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    BEGIN
      -- 尝试分配
      PERFORM assign_user_to_warehouse(v_user_id, p_warehouse_id, p_assigned_by);
      
      -- 返回成功结果
      RETURN QUERY SELECT v_user_id, true, NULL::text;
    EXCEPTION WHEN OTHERS THEN
      -- 返回失败结果
      RETURN QUERY SELECT v_user_id, false, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION batch_assign_users_to_warehouse IS '批量分配用户到仓库';
