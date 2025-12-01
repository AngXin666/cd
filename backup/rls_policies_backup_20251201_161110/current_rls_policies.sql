/*
# 当前 RLS 策略备份
# 备份时间: 2025-12-01 16:11:10
# 说明: 这是重构前的完整 RLS 策略定义
*/

-- ============================================
-- 辅助函数备份
-- ============================================

-- 检查是否为管理员
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid
      AND role IN ('BOSS', 'PEER_ADMIN', 'MANAGER')
  );
$$;

-- 获取用户角色
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_roles
  WHERE user_id = uid
  LIMIT 1;
$$;

-- ============================================
-- users 表 RLS 策略
-- ============================================

-- 管理员可以查看所有用户
CREATE POLICY "admins_view_all_users" ON users
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 车队长可以查看管辖范围内的司机
CREATE POLICY "managers_view_their_drivers" ON users
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

-- 司机只能查看自己
CREATE POLICY "drivers_view_self" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 管理员可以插入用户
CREATE POLICY "admins_insert_users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以更新所有用户
CREATE POLICY "admins_update_all_users" ON users
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 司机可以更新自己的信息
CREATE POLICY "drivers_update_self" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 管理员可以删除用户
CREATE POLICY "admins_delete_users" ON users
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================
-- user_roles 表 RLS 策略
-- ============================================

-- 管理员可以查看所有角色
CREATE POLICY "admins_view_all_roles" ON user_roles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 车队长可以查看管辖范围内的司机角色
CREATE POLICY "managers_view_their_drivers_roles" ON user_roles
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
      WHERE dw.driver_id = user_roles.user_id
        AND w.manager_id = auth.uid()
    )
  );

-- 用户可以查看自己的角色
CREATE POLICY "users_view_own_roles" ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 管理员可以插入角色
CREATE POLICY "admins_insert_roles" ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以更新角色
CREATE POLICY "admins_update_roles" ON user_roles
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以删除角色
CREATE POLICY "admins_delete_roles" ON user_roles
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================
-- warehouses 表 RLS 策略
-- ============================================

-- 管理员可以查看所有仓库
CREATE POLICY "admins_view_all_warehouses" ON warehouses
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 车队长可以查看自己管理的仓库
CREATE POLICY "managers_view_own_warehouses" ON warehouses
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

-- 司机可以查看自己所属的仓库
CREATE POLICY "drivers_view_assigned_warehouses" ON warehouses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_warehouses dw
      WHERE dw.warehouse_id = warehouses.id
        AND dw.driver_id = auth.uid()
    )
  );

-- 管理员可以插入仓库
CREATE POLICY "admins_insert_warehouses" ON warehouses
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以更新所有仓库
CREATE POLICY "admins_update_all_warehouses" ON warehouses
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 车队长可以更新自己管理的仓库
CREATE POLICY "managers_update_own_warehouses" ON warehouses
  FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

-- 管理员可以删除仓库
CREATE POLICY "admins_delete_warehouses" ON warehouses
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================
-- notifications 表 RLS 策略
-- ============================================

-- 用户可以查看自己收到的通知
CREATE POLICY "users_view_own_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- 管理员可以查看所有通知
CREATE POLICY "admins_view_all_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 管理员可以插入通知
CREATE POLICY "admins_insert_notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 车队长可以插入通知
CREATE POLICY "managers_insert_notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'MANAGER'
    )
  );

-- 管理员可以更新所有通知
CREATE POLICY "admins_update_all_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 用户可以更新自己收到的通知
CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- 用户可以删除自己收到的通知
CREATE POLICY "users_delete_own_notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (recipient_id = auth.uid());

-- 管理员可以删除所有通知
CREATE POLICY "admins_delete_all_notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================
-- 其他表的 RLS 策略（简化版）
-- ============================================

-- leave_applications, resignation_applications, vehicles, driver_licenses
-- 等表的策略与上述类似，遵循以下模式：
-- 1. 管理员可以查看/更新/删除所有记录
-- 2. 车队长可以查看管辖范围内的记录
-- 3. 司机可以查看/更新/删除自己的记录
-- 4. 司机只能修改待审批状态的记录

-- ============================================
-- 备份完成
-- ============================================
