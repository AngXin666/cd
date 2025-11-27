/*
# 彻底移除 RLS 策略中的 boss_id 隔离条件

## 核心理解
每个租户（老板）的数据库都是独立的，不需要通过 boss_id 来隔离数据。
RLS 策略的作用是明确不同角色的权限，而不是数据隔离。

## 角色权限
- 老板（super_admin）：可以查看和管理所有数据
- 平级账号（peer_admin）：与老板相同的权限
- 车队长（manager）：可以查看所有司机，管理管辖仓库的数据
- 司机（driver）：只能查看自己的数据 + 管理员信息

## 优化内容
删除所有 RLS 策略中的 boss_id 过滤条件，只保留角色权限判断
*/

-- ============================================================================
-- 第一部分：删除所有旧的 RLS 策略
-- ============================================================================

-- profiles 表
DROP POLICY IF EXISTS "Boss and peer admin can view all tenant users" ON profiles;
DROP POLICY IF EXISTS "Manager can view all tenant users" ON profiles;
DROP POLICY IF EXISTS "Driver can view own profile" ON profiles;
DROP POLICY IF EXISTS "Driver can view admins" ON profiles;
DROP POLICY IF EXISTS "Drivers can view same tenant admins" ON profiles;
DROP POLICY IF EXISTS "Boss and peer admin can manage all tenant users" ON profiles;
DROP POLICY IF EXISTS "Manager can manage drivers" ON profiles;
DROP POLICY IF EXISTS "User can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Super admin and peer admin can manage tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Lease admins can view all boss accounts" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以删除老板账号" ON profiles;

-- notifications 表
DROP POLICY IF EXISTS "Boss and peer admin can view all tenant notifications" ON notifications;
DROP POLICY IF EXISTS "Manager can view notifications to self" ON notifications;
DROP POLICY IF EXISTS "Driver can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Boss and peer admin can create notifications" ON notifications;
DROP POLICY IF EXISTS "Manager can create notifications to drivers" ON notifications;
DROP POLICY IF EXISTS "Driver can create notifications to admins" ON notifications;
DROP POLICY IF EXISTS "Boss and peer admin can manage all notifications" ON notifications;
DROP POLICY IF EXISTS "User can update own received notifications" ON notifications;
DROP POLICY IF EXISTS "User can delete own received notifications" ON notifications;
DROP POLICY IF EXISTS "Super admin and peer admin can manage tenant notifications" ON notifications;

-- leave_applications 表
DROP POLICY IF EXISTS "Boss and peer admin can manage all leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Manager can manage warehouse drivers leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Driver can manage own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Super admin and peer admin can manage tenant leave applications" ON leave_applications;

-- resignation_applications 表
DROP POLICY IF EXISTS "Boss and peer admin can manage all resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Manager can manage warehouse drivers resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Driver can manage own resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Super admin and peer admin can manage tenant resignation applic" ON resignation_applications;

-- ============================================================================
-- 第二部分：创建简化的 RLS 策略（不使用 boss_id）
-- ============================================================================

/*
## profiles 表的新策略
只关注角色权限，不关注 boss_id
*/

-- 策略 1: 老板和平级账号可以查看所有用户
CREATE POLICY "Boss and peer admin can view all users"
ON profiles
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin can view all users" ON profiles 
IS '老板和平级账号可以查看所有用户';

-- 策略 2: 车队长可以查看所有用户
CREATE POLICY "Manager can view all users"
ON profiles
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
);

COMMENT ON POLICY "Manager can view all users" ON profiles 
IS '车队长可以查看所有用户';

-- 策略 3: 司机可以查看自己
CREATE POLICY "Driver can view self"
ON profiles
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND id = auth.uid()
);

COMMENT ON POLICY "Driver can view self" ON profiles 
IS '司机可以查看自己';

-- 策略 4: 司机可以查看管理员
CREATE POLICY "Driver can view all admins"
ON profiles
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND role IN ('super_admin', 'peer_admin', 'manager')
);

COMMENT ON POLICY "Driver can view all admins" ON profiles 
IS '司机可以查看所有管理员（老板、平级账号、车队长）';

-- 策略 5: 老板和平级账号可以管理所有用户
CREATE POLICY "Boss and peer admin can manage all users"
ON profiles
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin can manage all users" ON profiles 
IS '老板和平级账号可以管理所有用户';

-- 策略 6: 车队长可以创建和管理司机
CREATE POLICY "Manager can manage all drivers"
ON profiles
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND role = 'driver'
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND role = 'driver'
);

COMMENT ON POLICY "Manager can manage all drivers" ON profiles 
IS '车队长可以创建和管理所有司机';

-- 策略 7: 用户可以管理自己的信息
CREATE POLICY "User can manage self"
ON profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

COMMENT ON POLICY "User can manage self" ON profiles 
IS '用户可以管理自己的信息';

-- 策略 8: 租赁管理员可以查看所有老板账号
CREATE POLICY "Lease admin can view all boss accounts"
ON profiles
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'lease_admin'
  AND role = 'super_admin'
);

COMMENT ON POLICY "Lease admin can view all boss accounts" ON profiles 
IS '租赁管理员可以查看所有老板账号';

-- 策略 9: 租赁管理员可以删除老板账号
CREATE POLICY "Lease admin can delete boss accounts"
ON profiles
FOR DELETE
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'lease_admin'
  AND role = 'super_admin'
);

COMMENT ON POLICY "Lease admin can delete boss accounts" ON profiles 
IS '租赁管理员可以删除老板账号';

/*
## notifications 表的新策略
*/

-- 策略 1: 老板和平级账号可以查看所有通知
CREATE POLICY "Boss and peer admin can view all notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin can view all notifications" ON notifications 
IS '老板和平级账号可以查看所有通知';

-- 策略 2: 车队长可以查看自己的通知
CREATE POLICY "Manager can view own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND (recipient_id = auth.uid() OR sender_id = auth.uid())
);

COMMENT ON POLICY "Manager can view own notifications" ON notifications 
IS '车队长可以查看自己的通知';

-- 策略 3: 司机可以查看自己的通知
CREATE POLICY "Driver can view own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND (recipient_id = auth.uid() OR sender_id = auth.uid())
);

COMMENT ON POLICY "Driver can view own notifications" ON notifications 
IS '司机可以查看自己的通知';

-- 策略 4: 老板和平级账号可以创建通知
CREATE POLICY "Boss and peer admin can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND sender_id = auth.uid()
);

COMMENT ON POLICY "Boss and peer admin can create notifications" ON notifications 
IS '老板和平级账号可以创建通知';

-- 策略 5: 车队长可以创建通知
CREATE POLICY "Manager can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND sender_id = auth.uid()
);

COMMENT ON POLICY "Manager can create notifications" ON notifications 
IS '车队长可以创建通知';

-- 策略 6: 司机可以创建通知
CREATE POLICY "Driver can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND sender_id = auth.uid()
);

COMMENT ON POLICY "Driver can create notifications" ON notifications 
IS '司机可以创建通知';

-- 策略 7: 老板和平级账号可以管理所有通知
CREATE POLICY "Boss and peer admin can manage notifications"
ON notifications
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

COMMENT ON POLICY "Boss and peer admin can manage notifications" ON notifications 
IS '老板和平级账号可以管理所有通知';

-- 策略 8: 用户可以更新自己接收的通知
CREATE POLICY "User can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

COMMENT ON POLICY "User can update own notifications" ON notifications 
IS '用户可以更新自己接收的通知';

-- 策略 9: 用户可以删除自己接收的通知
CREATE POLICY "User can delete own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (recipient_id = auth.uid());

COMMENT ON POLICY "User can delete own notifications" ON notifications 
IS '用户可以删除自己接收的通知';

/*
## leave_applications 表的新策略
*/

-- 策略 1: 老板和平级账号可以管理所有请假申请
CREATE POLICY "Boss and peer admin can manage all leaves"
ON leave_applications
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin can manage all leaves" ON leave_applications 
IS '老板和平级账号可以管理所有请假申请';

-- 策略 2: 车队长可以管理所有司机的请假申请
CREATE POLICY "Manager can manage all driver leaves"
ON leave_applications
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
);

COMMENT ON POLICY "Manager can manage all driver leaves" ON leave_applications 
IS '车队长可以管理所有司机的请假申请';

-- 策略 3: 司机可以管理自己的请假申请
CREATE POLICY "Driver can manage own leaves"
ON leave_applications
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "Driver can manage own leaves" ON leave_applications 
IS '司机可以管理自己的请假申请';

/*
## resignation_applications 表的新策略
*/

-- 策略 1: 老板和平级账号可以管理所有离职申请
CREATE POLICY "Boss and peer admin can manage all resignations"
ON resignation_applications
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin can manage all resignations" ON resignation_applications 
IS '老板和平级账号可以管理所有离职申请';

-- 策略 2: 车队长可以管理所有司机的离职申请
CREATE POLICY "Manager can manage all driver resignations"
ON resignation_applications
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
);

COMMENT ON POLICY "Manager can manage all driver resignations" ON resignation_applications 
IS '车队长可以管理所有司机的离职申请';

-- 策略 3: 司机可以管理自己的离职申请
CREATE POLICY "Driver can manage own resignations"
ON resignation_applications
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "Driver can manage own resignations" ON resignation_applications 
IS '司机可以管理自己的离职申请';
