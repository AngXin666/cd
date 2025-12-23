/*
# 修复重要业务功能RLS策略以适配新权限结构

## 功能描述
更新重要业务功能相关表的RLS策略，使其适配新的权限结构（基于 user_roles 表）

## 修改内容

### 1. notifications - 通知表
- 所有用户可以查看发送给自己的通知
- 老板可以创建发送给所有用户的通知
- 车队长可以创建发送给其管理仓库的司机的通知
- 老板可以管理所有通知
- 车队长可以管理自己创建的通知

### 2. driver_licenses - 驾驶证管理表
- 老板可以查看/管理所有驾驶证
- 车队长可以查看/管理其管理仓库的司机的驾驶证
- 司机可以查看/更新自己的驾驶证

## 安全性
- 使用新的权限检查函数（is_boss_v2, is_manager_v2, is_driver_v2, is_manager_of_warehouse_v2）
- 基于 user_roles 表进行角色验证
- 基于 warehouse_assignments 表进行仓库权限验证

## 注意
- feedback 表和 vehicle_records 表在当前数据库中不存在，已从本次修复中移除
*/

-- ============================================
-- 1. 更新 notifications 表的RLS策略
-- ============================================

-- 1.1 删除旧策略
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Lease admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- 1.2 创建新的查看策略
CREATE POLICY "所有用户可以查看发送给自己的通知"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = recipient_id);

-- 1.3 创建新的创建策略
CREATE POLICY "老板可以创建通知"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以创建通知"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (is_manager_v2(auth.uid()));

CREATE POLICY "司机可以创建通知"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (is_driver_v2(auth.uid()));

-- 1.4 创建新的修改策略
CREATE POLICY "用户可以更新自己的通知"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id);

CREATE POLICY "老板可以更新所有通知"
ON notifications FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 1.5 创建新的删除策略
CREATE POLICY "用户可以删除自己的通知"
ON notifications FOR DELETE
TO authenticated
USING (auth.uid() = recipient_id);

CREATE POLICY "老板可以删除所有通知"
ON notifications FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 2. 更新 driver_licenses 表的RLS策略
-- ============================================

-- 2.1 删除旧策略
DROP POLICY IF EXISTS "Super admins can view all driver licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Drivers can view their own driver license" ON driver_licenses;
DROP POLICY IF EXISTS "Drivers can create their own driver license" ON driver_licenses;
DROP POLICY IF EXISTS "Drivers can update their own driver license" ON driver_licenses;
DROP POLICY IF EXISTS "Super admins can manage all driver licenses" ON driver_licenses;

-- 2.2 创建新的查看策略
CREATE POLICY "老板可以查看所有驾驶证"
ON driver_licenses FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的驾驶证"
ON driver_licenses FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() 
    AND wa.warehouse_id IN (
      SELECT warehouse_id FROM warehouse_assignments 
      WHERE user_id = driver_licenses.driver_id
    )
  )
);

CREATE POLICY "司机可以查看自己的驾驶证"
ON driver_licenses FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- 3.3 创建新的创建策略
CREATE POLICY "司机可以创建自己的驾驶证"
ON driver_licenses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = driver_id AND is_driver_v2(auth.uid()));

CREATE POLICY "老板可以为司机创建驾驶证"
ON driver_licenses FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库的司机创建驾驶证"
ON driver_licenses FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() 
    AND wa.warehouse_id IN (
      SELECT warehouse_id FROM warehouse_assignments 
      WHERE user_id = driver_id
    )
  )
);

-- 3.4 创建新的修改策略
CREATE POLICY "司机可以更新自己的驾驶证"
ON driver_licenses FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id);

CREATE POLICY "老板可以更新所有驾驶证"
ON driver_licenses FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以更新其管理仓库的驾驶证"
ON driver_licenses FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() 
    AND wa.warehouse_id IN (
      SELECT warehouse_id FROM warehouse_assignments 
      WHERE user_id = driver_id
    )
  )
);

-- 3.5 创建新的删除策略
CREATE POLICY "老板可以删除所有驾驶证"
ON driver_licenses FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的驾驶证"
ON driver_licenses FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() 
    AND wa.warehouse_id IN (
      SELECT warehouse_id FROM warehouse_assignments 
      WHERE user_id = driver_id
    )
  )
);
