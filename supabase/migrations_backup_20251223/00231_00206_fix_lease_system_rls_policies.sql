/*
# 修复租赁系统的 RLS 策略，避免无限递归

## 问题
租赁系统的 RLS 策略使用了 EXISTS (SELECT FROM profiles)，会导致无限递归

## 解决方案
使用 get_user_role_and_boss 函数来避免递归

## 影响的表
1. leases
2. lease_bills
3. vehicle_leases

*/

-- ============================================
-- 1. 修复 leases 表的策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Lease admins have full access to leases" ON leases;
DROP POLICY IF EXISTS "Related accounts can view their boss leases" ON leases;
DROP POLICY IF EXISTS "Tenants can view their own leases" ON leases;

-- 策略 1：租赁管理员可以查看所有租赁
CREATE POLICY "Lease admins have full access to leases" ON leases
  FOR ALL TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) = 'lease_admin'
  );

-- 策略 2：租户可以查看自己的租赁
CREATE POLICY "Tenants can view their own leases" ON leases
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

-- 策略 3：车队长可以查看同租户的租赁
CREATE POLICY "Managers can view tenant leases" ON leases
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) = 'manager'
    AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = leases.tenant_id
        AND p.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(auth.uid()) b)
    )
  );

-- 策略 4：超级管理员可以查看关联账户的租赁
CREATE POLICY "Super admins can view related leases" ON leases
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) = 'super_admin'
    AND
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.main_account_id = p2.id
      WHERE p1.id = auth.uid()
        AND p1.main_account_id IS NOT NULL
        AND p2.tenant_id = leases.tenant_id
    )
  );

-- ============================================
-- 2. 修复 lease_bills 表的策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "租赁管理员查看所有账单" ON lease_bills;
DROP POLICY IF EXISTS "租赁管理员创建账单" ON lease_bills;
DROP POLICY IF EXISTS "租赁管理员更新账单" ON lease_bills;
DROP POLICY IF EXISTS "租赁管理员删除账单" ON lease_bills;

-- 检查 is_lease_admin_user 函数是否存在
DROP FUNCTION IF EXISTS is_lease_admin_user(uuid);

-- 创建辅助函数
CREATE OR REPLACE FUNCTION is_lease_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (SELECT r.role FROM get_user_role_and_boss(user_id) r) = 'lease_admin';
$$;

-- 策略 1：租赁管理员可以查看所有账单
CREATE POLICY "租赁管理员查看所有账单" ON lease_bills
  FOR SELECT TO authenticated
  USING (is_lease_admin_user(auth.uid()));

-- 策略 2：租赁管理员可以创建账单
CREATE POLICY "租赁管理员创建账单" ON lease_bills
  FOR INSERT TO authenticated
  WITH CHECK (is_lease_admin_user(auth.uid()));

-- 策略 3：租赁管理员可以更新账单
CREATE POLICY "租赁管理员更新账单" ON lease_bills
  FOR UPDATE TO authenticated
  USING (is_lease_admin_user(auth.uid()));

-- 策略 4：租赁管理员可以删除账单
CREATE POLICY "租赁管理员删除账单" ON lease_bills
  FOR DELETE TO authenticated
  USING (is_lease_admin_user(auth.uid()));

-- ============================================
-- 3. 修复 vehicle_leases 表的策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "管理员查看所有租赁" ON vehicle_leases;
DROP POLICY IF EXISTS "管理员创建租赁记录" ON vehicle_leases;
DROP POLICY IF EXISTS "管理员更新租赁记录" ON vehicle_leases;
DROP POLICY IF EXISTS "管理员删除租赁记录" ON vehicle_leases;
DROP POLICY IF EXISTS "司机查看自己的租赁" ON vehicle_leases;

-- 策略 1：管理员可以查看所有租赁
CREATE POLICY "管理员查看所有租赁" ON vehicle_leases
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) IN ('manager', 'super_admin', 'lease_admin')
  );

-- 策略 2：管理员可以创建租赁记录
CREATE POLICY "管理员创建租赁记录" ON vehicle_leases
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) IN ('manager', 'super_admin', 'lease_admin')
  );

-- 策略 3：管理员可以更新租赁记录
CREATE POLICY "管理员更新租赁记录" ON vehicle_leases
  FOR UPDATE TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) IN ('manager', 'super_admin', 'lease_admin')
  );

-- 策略 4：管理员可以删除租赁记录
CREATE POLICY "管理员删除租赁记录" ON vehicle_leases
  FOR DELETE TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) IN ('manager', 'super_admin', 'lease_admin')
  );

-- 策略 5：司机可以查看自己的租赁
CREATE POLICY "司机查看自己的租赁" ON vehicle_leases
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    AND
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) = 'driver'
  );

-- 添加注释
COMMENT ON POLICY "Lease admins have full access to leases" ON leases IS '租赁管理员可以查看所有租赁';
COMMENT ON POLICY "Tenants can view their own leases" ON leases IS '租户可以查看自己的租赁';
COMMENT ON POLICY "Managers can view tenant leases" ON leases IS '车队长可以查看同租户的租赁';
COMMENT ON POLICY "Super admins can view related leases" ON leases IS '超级管理员可以查看关联账户的租赁';

COMMENT ON FUNCTION is_lease_admin_user IS '检查用户是否为租赁管理员';

COMMENT ON POLICY "租赁管理员查看所有账单" ON lease_bills IS '租赁管理员可以查看所有账单';
COMMENT ON POLICY "租赁管理员创建账单" ON lease_bills IS '租赁管理员可以创建账单';
COMMENT ON POLICY "租赁管理员更新账单" ON lease_bills IS '租赁管理员可以更新账单';
COMMENT ON POLICY "租赁管理员删除账单" ON lease_bills IS '租赁管理员可以删除账单';

COMMENT ON POLICY "管理员查看所有租赁" ON vehicle_leases IS '管理员可以查看所有租赁';
COMMENT ON POLICY "管理员创建租赁记录" ON vehicle_leases IS '管理员可以创建租赁记录';
COMMENT ON POLICY "管理员更新租赁记录" ON vehicle_leases IS '管理员可以更新租赁记录';
COMMENT ON POLICY "管理员删除租赁记录" ON vehicle_leases IS '管理员可以删除租赁记录';
COMMENT ON POLICY "司机查看自己的租赁" ON vehicle_leases IS '司机可以查看自己的租赁';
