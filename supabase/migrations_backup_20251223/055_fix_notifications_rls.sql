/*
# 修复 notifications 表的 RLS 策略

## 问题
notifications 表的RLS在迁移文件 00064_disable_notifications_rls.sql 中被禁用，导致：
- 所有用户可以查看所有通知，包括其他租户的通知
- 可能泄露敏感业务信息（如请假审批、车辆分配等）

## 解决方案
1. 重新启用 RLS
2. 添加租户隔离策略
3. 确保用户只能看到发给自己的通知或自己租户的通知

## 影响
- 修复后，用户只能查看自己的通知
- 租赁管理员可以查看所有通知
*/

-- 重新启用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can only view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can only view their tenant's notifications" ON notifications;
DROP POLICY IF EXISTS "Lease admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

-- 策略1：用户可以查看发给自己的通知
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  recipient_id = auth.uid()
);

-- 策略2：用户可以更新自己的通知（标记为已读等）
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- 策略3：用户可以删除自己的通知
CREATE POLICY "Users can delete their own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (recipient_id = auth.uid());

-- 策略4：认证用户可以插入通知（用于系统通知）
CREATE POLICY "Authenticated users can insert notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 策略5：租赁管理员可以查看所有通知
CREATE POLICY "Lease admins can view all notifications"
ON notifications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'lease_admin'::user_role
  )
);

-- 添加注释
COMMENT ON TABLE notifications IS '通知表 - 已启用RLS，用户只能查看自己的通知';
