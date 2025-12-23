/*
# 更新 profiles 表的 RLS 策略 - 严格的司机权限隔离

## 核心原则
1. 司机只能查看自己的信息
2. 司机可以查看管理员信息（用于提交申请）
3. **司机不能查看其他司机的任何数据**
4. 车队长根据权限配置查看和管理司机
5. 老板和平级账号可以查看和管理所有数据

## 优化内容
删除旧的 RLS 策略，创建新的基于权限配置的策略
*/

-- ============================================================================
-- 第一部分：删除旧的 RLS 策略
-- ============================================================================

DROP POLICY IF EXISTS "Boss and peer admin can view all users" ON profiles;
DROP POLICY IF EXISTS "Manager can view all users" ON profiles;
DROP POLICY IF EXISTS "Manager can view users based on permissions" ON profiles;
DROP POLICY IF EXISTS "Driver can view self" ON profiles;
DROP POLICY IF EXISTS "Driver can view admins" ON profiles;
DROP POLICY IF EXISTS "Driver can view all admins" ON profiles;
DROP POLICY IF EXISTS "Boss and peer admin can manage all users" ON profiles;
DROP POLICY IF EXISTS "Manager can manage all drivers" ON profiles;
DROP POLICY IF EXISTS "Manager can manage drivers based on permissions" ON profiles;
DROP POLICY IF EXISTS "User can manage self" ON profiles;
DROP POLICY IF EXISTS "Lease admin can view all boss accounts" ON profiles;
DROP POLICY IF EXISTS "Lease admin can delete boss accounts" ON profiles;

-- ============================================================================
-- 第二部分：创建新的 RLS 策略
-- ============================================================================

/*
## 查看权限策略
*/

-- 策略 1: 老板和平级账号可以查看所有用户
CREATE POLICY "Boss and peer admin view all"
ON profiles
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin view all" ON profiles 
IS '老板和平级账号可以查看所有用户';

-- 策略 2: 车队长可以查看所有用户（包括所有司机）
CREATE POLICY "Manager view all users"
ON profiles
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
);

COMMENT ON POLICY "Manager view all users" ON profiles 
IS '车队长可以查看所有用户（包括所有司机和管理员）';

-- 策略 3: 司机可以查看自己
CREATE POLICY "Driver view self"
ON profiles
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND id = auth.uid()
);

COMMENT ON POLICY "Driver view self" ON profiles 
IS '司机可以查看自己的信息';

-- 策略 4: 司机可以查看管理员（用于提交申请）
CREATE POLICY "Driver view admins only"
ON profiles
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND role IN ('super_admin', 'peer_admin', 'manager')
);

COMMENT ON POLICY "Driver view admins only" ON profiles 
IS '司机可以查看管理员（老板、平级账号、车队长），用于提交申请';

-- 策略 5: 租赁管理员可以查看所有老板账号
CREATE POLICY "Lease admin view boss accounts"
ON profiles
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'lease_admin'
  AND role = 'super_admin'
);

COMMENT ON POLICY "Lease admin view boss accounts" ON profiles 
IS '租赁管理员可以查看所有老板账号';

/*
## 插入权限策略
*/

-- 策略 6: 老板和平级账号可以创建所有类型的账号
CREATE POLICY "Boss and peer admin insert all"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin insert all" ON profiles 
IS '老板和平级账号可以创建所有类型的账号';

-- 策略 7: 车队长可以创建司机账号（如果有权限）
CREATE POLICY "Manager insert drivers with permission"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND role = 'driver'
  AND EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
    AND up.can_add_driver = true
  )
);

COMMENT ON POLICY "Manager insert drivers with permission" ON profiles 
IS '车队长可以创建司机账号（需要 can_add_driver 权限）';

/*
## 更新权限策略
*/

-- 策略 8: 老板和平级账号可以更新所有用户
CREATE POLICY "Boss and peer admin update all"
ON profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin update all" ON profiles 
IS '老板和平级账号可以更新所有用户';

-- 策略 9: 车队长可以更新司机（如果有权限）
CREATE POLICY "Manager update drivers with permission"
ON profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND role = 'driver'
  AND EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
    AND up.can_edit_driver = true
  )
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND role = 'driver'
  AND EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
    AND up.can_edit_driver = true
  )
);

COMMENT ON POLICY "Manager update drivers with permission" ON profiles 
IS '车队长可以更新司机信息（需要 can_edit_driver 权限）';

-- 策略 10: 用户可以更新自己的信息
CREATE POLICY "User update self"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

COMMENT ON POLICY "User update self" ON profiles 
IS '用户可以更新自己的信息';

/*
## 删除权限策略
*/

-- 策略 11: 老板和平级账号可以删除所有用户
CREATE POLICY "Boss and peer admin delete all"
ON profiles
FOR DELETE
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin delete all" ON profiles 
IS '老板和平级账号可以删除所有用户';

-- 策略 12: 车队长可以删除司机（如果有权限）
CREATE POLICY "Manager delete drivers with permission"
ON profiles
FOR DELETE
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND role = 'driver'
  AND EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
    AND up.can_delete_driver = true
  )
);

COMMENT ON POLICY "Manager delete drivers with permission" ON profiles 
IS '车队长可以删除司机账号（需要 can_delete_driver 权限）';

-- 策略 13: 租赁管理员可以删除老板账号
CREATE POLICY "Lease admin delete boss accounts"
ON profiles
FOR DELETE
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'lease_admin'
  AND role = 'super_admin'
);

COMMENT ON POLICY "Lease admin delete boss accounts" ON profiles 
IS '租赁管理员可以删除老板账号';
