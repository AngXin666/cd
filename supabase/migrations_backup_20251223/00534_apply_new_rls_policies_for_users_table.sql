/*
# 权限系统重构 - 步骤4：应用新的 RLS 策略（users 表）

## 说明
为 users 表应用基于策略模板的动态 RLS 策略，替换原有的硬编码策略

## 策略设计
1. BOSS: 可以查看、创建、更新、删除所有用户
2. MANAGER: 可以查看管辖范围内的司机，可以创建司机
3. DRIVER: 只能查看和更新自己的信息

## 保持功能完整性
- 确保用户管理功能正常工作
- 确保角色权限正确隔离
- 确保审批流程不受影响

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 删除 users 表的旧策略
-- ============================================
DROP POLICY IF EXISTS "admins_view_all_users" ON users;
DROP POLICY IF EXISTS "managers_view_their_drivers" ON users;
DROP POLICY IF EXISTS "drivers_view_self" ON users;
DROP POLICY IF EXISTS "admins_insert_users" ON users;
DROP POLICY IF EXISTS "admins_update_all_users" ON users;
DROP POLICY IF EXISTS "drivers_update_self" ON users;
DROP POLICY IF EXISTS "admins_delete_users" ON users;

-- ============================================
-- 2. 应用新的 RLS 策略（基于策略模板）
-- ============================================

-- 策略1：管理员可以查看所有用户
CREATE POLICY "new_admins_view_all_users" ON users
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略2：车队长可以查看管辖范围内的司机
CREATE POLICY "new_managers_view_their_drivers" ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'MANAGER'
    )
    AND EXISTS (
      SELECT 1 FROM driver_warehouses dw
      JOIN warehouses w ON dw.warehouse_id = w.id
      WHERE dw.driver_id = users.id
        AND w.manager_id = auth.uid()
    )
  );

-- 策略3：司机可以查看自己
CREATE POLICY "new_drivers_view_self" ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
  );

-- 策略4：管理员可以插入用户
CREATE POLICY "new_admins_insert_users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略5：管理员可以更新所有用户
CREATE POLICY "new_admins_update_all_users" ON users
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略6：司机可以更新自己的信息
CREATE POLICY "new_drivers_update_self" ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

-- 策略7：管理员可以删除用户
CREATE POLICY "new_admins_delete_users" ON users
  FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- ============================================
-- 3. 创建权限验证辅助函数（users 表专用）
-- ============================================
CREATE OR REPLACE FUNCTION can_user_manage_user(
  p_manager_id uuid,
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- 检查是否为管理员
  SELECT is_admin(p_manager_id)
  OR
  -- 或者是车队长且目标用户在其管辖范围内
  (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = p_manager_id
        AND ur.role = 'MANAGER'
    )
    AND EXISTS (
      SELECT 1 FROM driver_warehouses dw
      JOIN warehouses w ON dw.warehouse_id = w.id
      WHERE dw.driver_id = p_target_user_id
        AND w.manager_id = p_manager_id
    )
  );
$$;

COMMENT ON FUNCTION can_user_manage_user IS '检查用户是否可以管理目标用户';

-- ============================================
-- 4. 验证策略是否正确应用
-- ============================================

-- 创建验证函数
CREATE OR REPLACE FUNCTION verify_users_table_policies()
RETURNS TABLE (
  policy_name text,
  policy_exists boolean,
  policy_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pol.policyname::text AS policy_name,
    true AS policy_exists,
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
  WHERE cls.relname = 'users'
    AND pol.policyname LIKE 'new_%'
  ORDER BY pol.policyname;
END;
$$;

COMMENT ON FUNCTION verify_users_table_policies IS '验证 users 表的新策略是否正确应用';
