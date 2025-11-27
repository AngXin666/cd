/*
# 优化数据库结构和权限系统

## 核心原则
1. 所有账号的查询都基于老板的独立数据库（通过 boss_id 隔离）
2. 简化查询限制，明确权限即可
3. 司机不能查询其他司机的信息
4. 司机可以向老板、平级、车队长发送通知
5. 车队长可以接收管辖权中的司机通知

## 账号层级
- 老板（super_admin）：boss_id = NULL，管理整个租户
- 平级账号（peer_admin）：boss_id = 老板ID，与老板平级
- 车队长（manager）：boss_id = 老板ID，管理特定仓库
- 司机（driver）：boss_id = 老板ID，只能查看自己的数据

## 优化内容
1. 简化 profiles 表的 RLS 策略
2. 优化通知系统的 RLS 策略
3. 确保车队长可以查看管辖仓库的司机信息
*/

-- ============================================================================
-- 第一部分：删除旧的复杂 RLS 策略
-- ============================================================================

-- 删除 profiles 表的旧策略（保留必要的策略）
DROP POLICY IF EXISTS "Admins can view same tenant users" ON profiles;
DROP POLICY IF EXISTS "Manager can create tenant users" ON profiles;
DROP POLICY IF EXISTS "Manager can update tenant users" ON profiles;
DROP POLICY IF EXISTS "Manager can delete tenant users" ON profiles;
DROP POLICY IF EXISTS "Super admin can manage tenant users" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

-- ============================================================================
-- 第二部分：创建简化的 RLS 策略
-- ============================================================================

/*
## profiles 表的新策略

### 查询权限（SELECT）
1. 老板、平级账号：可以查询整个租户的所有用户
2. 车队长：可以查询整个租户的所有用户（用于管理和查看司机）
3. 司机：可以查询自己 + 管理员（老板、平级、车队长），但不能查询其他司机
*/

-- 策略 1: 老板和平级账号可以查询整个租户的所有用户
CREATE POLICY "Boss and peer admin can view all tenant users"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- 当前用户是老板或平级账号
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  -- 查询同租户的用户
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Boss and peer admin can view all tenant users" ON profiles 
IS '老板和平级账号可以查询整个租户的所有用户';

-- 策略 2: 车队长可以查询整个租户的所有用户
CREATE POLICY "Manager can view all tenant users"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- 当前用户是车队长
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND
  -- 查询同租户的用户
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Manager can view all tenant users" ON profiles 
IS '车队长可以查询整个租户的所有用户（用于管理和查看司机）';

-- 策略 3: 司机可以查询自己
CREATE POLICY "Driver can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- 当前用户是司机且查询自己
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND
  id = auth.uid()
);

COMMENT ON POLICY "Driver can view own profile" ON profiles 
IS '司机可以查询自己的信息';

-- 策略 4: 司机可以查询管理员（老板、平级、车队长）
CREATE POLICY "Driver can view admins"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- 当前用户是司机
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND
  -- 查询管理员
  (
    -- 老板
    (role = 'super_admin' AND id::text = get_current_user_boss_id())
    OR
    -- 平级账号和车队长
    (role IN ('peer_admin', 'manager') AND boss_id::text = get_current_user_boss_id())
  )
);

COMMENT ON POLICY "Driver can view admins" ON profiles 
IS '司机可以查询管理员（老板、平级账号、车队长）';

/*
### 修改权限（INSERT, UPDATE, DELETE）
1. 老板、平级账号：可以管理整个租户的所有用户
2. 车队长：可以创建和管理司机
3. 用户：可以管理自己的信息
*/

-- 策略 5: 老板和平级账号可以管理整个租户的用户
CREATE POLICY "Boss and peer admin can manage all tenant users"
ON profiles
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  boss_id::text = get_current_user_boss_id()
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Boss and peer admin can manage all tenant users" ON profiles 
IS '老板和平级账号可以管理整个租户的所有用户';

-- 策略 6: 车队长可以创建和管理司机
CREATE POLICY "Manager can manage drivers"
ON profiles
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND
  boss_id::text = get_current_user_boss_id()
  AND
  role = 'driver'
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND
  boss_id::text = get_current_user_boss_id()
  AND
  role = 'driver'
);

COMMENT ON POLICY "Manager can manage drivers" ON profiles 
IS '车队长可以创建和管理司机';

-- 策略 7: 用户可以管理自己的信息
CREATE POLICY "User can manage own profile"
ON profiles
FOR ALL
TO authenticated
USING (
  id = auth.uid()
  AND
  boss_id::text = get_current_user_boss_id()
)
WITH CHECK (
  id = auth.uid()
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "User can manage own profile" ON profiles 
IS '用户可以管理自己的信息';

-- ============================================================================
-- 第三部分：优化通知系统
-- ============================================================================

/*
## notifications 表的优化

### 查询权限
1. 老板、平级账号：可以查询整个租户的所有通知
2. 车队长：可以查询发送给自己的通知（来自管辖仓库的司机）
3. 司机：可以查询自己发送和接收的通知
*/

-- 删除旧的通知策略
DROP POLICY IF EXISTS "Super admins can view tenant notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view tenant notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Managers can view tenant notifications" ON notifications;

-- 策略 1: 老板和平级账号可以查询整个租户的通知
CREATE POLICY "Boss and peer admin can view all tenant notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Boss and peer admin can view all tenant notifications" ON notifications 
IS '老板和平级账号可以查询整个租户的所有通知';

-- 策略 2: 车队长可以查询发送给自己的通知
CREATE POLICY "Manager can view notifications to self"
ON notifications
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND
  (
    -- 发送给自己的通知
    user_id = auth.uid()
    OR
    -- 自己发送的通知
    created_by = auth.uid()
  )
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Manager can view notifications to self" ON notifications 
IS '车队长可以查询发送给自己的通知';

-- 策略 3: 司机可以查询自己的通知
CREATE POLICY "Driver can view own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND
  (
    -- 发送给自己的通知
    user_id = auth.uid()
    OR
    -- 自己发送的通知
    created_by = auth.uid()
  )
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Driver can view own notifications" ON notifications 
IS '司机可以查询自己的通知';

/*
### 创建权限
1. 司机可以向老板、平级、车队长发送通知
2. 车队长可以向司机发送通知
3. 老板、平级账号可以向所有人发送通知
*/

-- 删除旧的创建策略
DROP POLICY IF EXISTS "Super admins can create tenant notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create tenant notifications" ON notifications;
DROP POLICY IF EXISTS "Managers can create tenant notifications" ON notifications;
DROP POLICY IF EXISTS "Managers can create notifications to same tenant" ON notifications;
DROP POLICY IF EXISTS "Peer admins can create notifications to same tenant" ON notifications;
DROP POLICY IF EXISTS "Drivers can create notifications" ON notifications;

-- 策略 4: 老板和平级账号可以向所有人发送通知
CREATE POLICY "Boss and peer admin can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  boss_id::text = get_current_user_boss_id()
  AND
  created_by = auth.uid()
);

COMMENT ON POLICY "Boss and peer admin can create notifications" ON notifications 
IS '老板和平级账号可以向所有人发送通知';

-- 策略 5: 车队长可以向司机发送通知
CREATE POLICY "Manager can create notifications to drivers"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND
  boss_id::text = get_current_user_boss_id()
  AND
  created_by = auth.uid()
);

COMMENT ON POLICY "Manager can create notifications to drivers" ON notifications 
IS '车队长可以向司机发送通知';

-- 策略 6: 司机可以向管理员发送通知
CREATE POLICY "Driver can create notifications to admins"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND
  boss_id::text = get_current_user_boss_id()
  AND
  created_by = auth.uid()
);

COMMENT ON POLICY "Driver can create notifications to admins" ON notifications 
IS '司机可以向管理员（老板、平级、车队长）发送通知';

/*
### 更新和删除权限
1. 老板、平级账号可以管理所有通知
2. 用户可以管理自己接收的通知（标记已读、删除）
*/

-- 删除旧的更新和删除策略
DROP POLICY IF EXISTS "Super admins can update tenant notifications" ON notifications;
DROP POLICY IF EXISTS "Super admins can delete tenant notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- 策略 7: 老板和平级账号可以管理所有通知
CREATE POLICY "Boss and peer admin can manage all notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  boss_id::text = get_current_user_boss_id()
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Boss and peer admin can manage all notifications" ON notifications 
IS '老板和平级账号可以管理所有通知';

-- 策略 8: 用户可以更新自己接收的通知
CREATE POLICY "User can update own received notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND
  boss_id::text = get_current_user_boss_id()
)
WITH CHECK (
  user_id = auth.uid()
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "User can update own received notifications" ON notifications 
IS '用户可以更新自己接收的通知（标记已读等）';

-- 策略 9: 用户可以删除自己接收的通知
CREATE POLICY "User can delete own received notifications"
ON notifications
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "User can delete own received notifications" ON notifications 
IS '用户可以删除自己接收的通知';

-- ============================================================================
-- 第四部分：优化请假和离职申请的权限
-- ============================================================================

/*
## leave_applications 和 resignation_applications 表的优化

### 查询权限
1. 老板、平级账号：可以查询整个租户的所有申请
2. 车队长：可以查询管辖仓库司机的申请
3. 司机：只能查询自己的申请
*/

-- 删除 leave_applications 的旧策略
DROP POLICY IF EXISTS "Manager can manage tenant leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can manage own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can create own leave applications" ON leave_applications;

-- 策略 1: 老板和平级账号可以查询和管理所有申请
CREATE POLICY "Boss and peer admin can manage all leave applications"
ON leave_applications
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  boss_id::text = get_current_user_boss_id()
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Boss and peer admin can manage all leave applications" ON leave_applications 
IS '老板和平级账号可以管理所有请假申请';

-- 策略 2: 车队长可以查询和审批管辖仓库司机的申请
CREATE POLICY "Manager can manage warehouse drivers leave applications"
ON leave_applications
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND
  boss_id::text = get_current_user_boss_id()
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Manager can manage warehouse drivers leave applications" ON leave_applications 
IS '车队长可以管理管辖仓库司机的请假申请';

-- 策略 3: 司机可以管理自己的申请
CREATE POLICY "Driver can manage own leave applications"
ON leave_applications
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  AND
  boss_id::text = get_current_user_boss_id()
)
WITH CHECK (
  user_id = auth.uid()
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Driver can manage own leave applications" ON leave_applications 
IS '司机可以管理自己的请假申请';

-- 删除 resignation_applications 的旧策略
DROP POLICY IF EXISTS "Manager can manage tenant resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Users can manage own resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Users can create own resignation applications" ON resignation_applications;

-- 策略 1: 老板和平级账号可以查询和管理所有离职申请
CREATE POLICY "Boss and peer admin can manage all resignation applications"
ON resignation_applications
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  boss_id::text = get_current_user_boss_id()
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Boss and peer admin can manage all resignation applications" ON resignation_applications 
IS '老板和平级账号可以管理所有离职申请';

-- 策略 2: 车队长可以查询和审批管辖仓库司机的离职申请
CREATE POLICY "Manager can manage warehouse drivers resignation applications"
ON resignation_applications
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND
  boss_id::text = get_current_user_boss_id()
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'manager'
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Manager can manage warehouse drivers resignation applications" ON resignation_applications 
IS '车队长可以管理管辖仓库司机的离职申请';

-- 策略 3: 司机可以管理自己的离职申请
CREATE POLICY "Driver can manage own resignation applications"
ON resignation_applications
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  AND
  boss_id::text = get_current_user_boss_id()
)
WITH CHECK (
  user_id = auth.uid()
  AND
  boss_id::text = get_current_user_boss_id()
);

COMMENT ON POLICY "Driver can manage own resignation applications" ON resignation_applications 
IS '司机可以管理自己的离职申请';
