/*
# 权限系统重构 - 步骤5：应用新的 RLS 策略（warehouses 表）

## 说明
为 warehouses 表应用基于策略模板的动态 RLS 策略

## 策略设计
1. BOSS/MANAGER: 可以查看、创建、更新、删除所有仓库
2. DRIVER: 可以查看自己所属的仓库（通过 warehouse_assignments 表关联）

## 业务逻辑
- 仓库是公共资源，管理员可以完全管理
- 司机只能查看自己被分配到的仓库
- 仓库的创建、更新、删除只能由管理员执行

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 启用 warehouses 表的 RLS
-- ============================================
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 删除 warehouses 表的所有旧策略（如果存在）
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    JOIN pg_class ON pg_policy.polrelid = pg_class.oid
    WHERE pg_class.relname = 'warehouses'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON warehouses', pol.polname);
  END LOOP;
END $$;

-- ============================================
-- 3. 应用新的 RLS 策略
-- ============================================

-- 策略1：管理员可以查看所有仓库
CREATE POLICY "new_admins_view_all_warehouses" ON warehouses
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略2：司机可以查看自己所属的仓库
CREATE POLICY "new_drivers_view_assigned_warehouses" ON warehouses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warehouse_assignments wa
      WHERE wa.warehouse_id = warehouses.id
        AND wa.user_id = auth.uid()
    )
  );

-- 策略3：管理员可以插入仓库
CREATE POLICY "new_admins_insert_warehouses" ON warehouses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略4：管理员可以更新所有仓库
CREATE POLICY "new_admins_update_all_warehouses" ON warehouses
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略5：管理员可以删除仓库
CREATE POLICY "new_admins_delete_warehouses" ON warehouses
  FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- ============================================
-- 4. 更新资源权限配置
-- ============================================
UPDATE resource_permissions
SET
  owner_field = NULL,
  manager_field = NULL,
  require_approval_status = false,
  approval_status_field = NULL,
  custom_rules = jsonb_build_object(
    'driver_view_rule', 'EXISTS (SELECT 1 FROM warehouse_assignments wa WHERE wa.warehouse_id = warehouses.id AND wa.user_id = auth.uid())'
  ),
  updated_at = now()
WHERE table_name = 'warehouses';

-- ============================================
-- 5. 创建验证函数
-- ============================================
CREATE OR REPLACE FUNCTION verify_warehouses_table_policies()
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
  WHERE cls.relname = 'warehouses'
  ORDER BY pol.polname;
END;
$$;

COMMENT ON FUNCTION verify_warehouses_table_policies IS '验证 warehouses 表的策略是否正确应用';

-- ============================================
-- 6. 创建仓库管理辅助函数
-- ============================================

-- 检查用户是否可以访问某个仓库
CREATE OR REPLACE FUNCTION can_user_access_warehouse(
  p_user_id uuid,
  p_warehouse_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- 检查是否为管理员
  SELECT is_admin(p_user_id)
  OR
  -- 或者用户被分配到该仓库
  EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.warehouse_id = p_warehouse_id
      AND wa.user_id = p_user_id
  );
$$;

COMMENT ON FUNCTION can_user_access_warehouse IS '检查用户是否可以访问某个仓库';

-- 获取用户可访问的仓库列表
CREATE OR REPLACE FUNCTION get_user_accessible_warehouses(p_user_id uuid)
RETURNS TABLE (
  warehouse_id uuid,
  warehouse_name text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 如果是管理员，返回所有仓库
  IF is_admin(p_user_id) THEN
    RETURN QUERY
    SELECT 
      w.id AS warehouse_id,
      w.name AS warehouse_name,
      w.is_active
    FROM warehouses w
    ORDER BY w.name;
  ELSE
    -- 否则只返回用户被分配到的仓库
    RETURN QUERY
    SELECT 
      w.id AS warehouse_id,
      w.name AS warehouse_name,
      w.is_active
    FROM warehouses w
    JOIN warehouse_assignments wa ON w.id = wa.warehouse_id
    WHERE wa.user_id = p_user_id
    ORDER BY w.name;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_user_accessible_warehouses IS '获取用户可访问的仓库列表';

-- 获取仓库的用户列表
CREATE OR REPLACE FUNCTION get_warehouse_users(p_warehouse_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_email text,
  assigned_at timestamptz
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
    u.email AS user_email,
    wa.created_at AS assigned_at
  FROM users u
  JOIN warehouse_assignments wa ON u.id = wa.user_id
  WHERE wa.warehouse_id = p_warehouse_id
  ORDER BY wa.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_warehouse_users IS '获取仓库的用户列表';
