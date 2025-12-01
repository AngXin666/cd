/*
# 权限系统重构 - 步骤4：应用简化的 RLS 策略（users 表）

## 说明
为 users 表应用简化的 RLS 策略，确保用户管理功能正常工作

## 策略设计
1. BOSS/MANAGER: 可以查看、创建、更新、删除所有用户
2. DRIVER: 只能查看和更新自己的信息

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 删除 users 表的所有旧策略
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policy
    JOIN pg_class ON pg_policy.polrelid = pg_class.oid
    WHERE pg_class.relname = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END $$;

-- ============================================
-- 2. 应用新的简化 RLS 策略
-- ============================================

-- 策略1：管理员可以查看所有用户
CREATE POLICY "new_admins_view_all_users" ON users
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- 策略2：司机可以查看自己
CREATE POLICY "new_drivers_view_self" ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
  );

-- 策略3：管理员可以插入用户
CREATE POLICY "new_admins_insert_users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略4：管理员可以更新所有用户
CREATE POLICY "new_admins_update_all_users" ON users
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- 策略5：司机可以更新自己的信息
CREATE POLICY "new_drivers_update_self" ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

-- 策略6：管理员可以删除用户
CREATE POLICY "new_admins_delete_users" ON users
  FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- ============================================
-- 3. 验证策略是否正确应用
-- ============================================

-- 创建验证函数
CREATE OR REPLACE FUNCTION verify_users_table_policies()
RETURNS TABLE (
  policy_name text,
  policy_type text,
  policy_command text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pol.policyname::text AS policy_name,
    CASE
      WHEN pol.polcmd = 'r' THEN 'SELECT'
      WHEN pol.polcmd = 'a' THEN 'INSERT'
      WHEN pol.polcmd = 'w' THEN 'UPDATE'
      WHEN pol.polcmd = 'd' THEN 'DELETE'
      WHEN pol.polcmd = '*' THEN 'ALL'
      ELSE 'UNKNOWN'
    END AS policy_type,
    pol.polcmd::text AS policy_command
  FROM pg_policy pol
  JOIN pg_class cls ON pol.polrelid = cls.oid
  WHERE cls.relname = 'users'
  ORDER BY pol.policyname;
END;
$$;

COMMENT ON FUNCTION verify_users_table_policies IS '验证 users 表的策略是否正确应用';