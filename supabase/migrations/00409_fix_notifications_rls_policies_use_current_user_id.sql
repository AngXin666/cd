/*
# 修复 notifications 表的 RLS 策略，使用 current_user_id()

## 说明
1. 将所有使用 auth.uid() 的策略更新为使用 current_user_id()
2. 确保车队长和老板可以正常接收通知
3. 保持安全性和权限控制

## 核心原则
- 统一使用 current_user_id() 替代 auth.uid()
- 保持原有的权限逻辑不变
- 确保通知功能正常工作

*/

-- ============================================================================
-- 删除旧的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "User can update own notifications" ON notifications;
DROP POLICY IF EXISTS "User can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以查看通知" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以更新通知" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以删除通知" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以创建通知" ON notifications;

-- ============================================================================
-- 创建新的 RLS 策略（使用 current_user_id()）
-- ============================================================================

-- 用户可以查看自己的通知
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (recipient_id = public.current_user_id());

-- 管理员可以查看所有通知
CREATE POLICY "Admins can view all notifications"
ON notifications FOR SELECT
USING (is_admin(public.current_user_id()));

-- 用户可以更新自己的通知（标记为已读等）
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (recipient_id = public.current_user_id());

-- 用户可以删除自己的通知
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (recipient_id = public.current_user_id());

-- 系统可以插入通知（通过 SECURITY DEFINER 函数）
CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- 租赁管理员可以查看通知
CREATE POLICY "租赁管理员可以查看通知"
ON notifications FOR SELECT
USING (is_lease_admin_user(public.current_user_id()));

-- 租赁管理员可以更新通知
CREATE POLICY "租赁管理员可以更新通知"
ON notifications FOR UPDATE
USING (is_lease_admin_user(public.current_user_id()));

-- 租赁管理员可以删除通知
CREATE POLICY "租赁管理员可以删除通知"
ON notifications FOR DELETE
USING (is_lease_admin_user(public.current_user_id()));

-- 租赁管理员可以创建通知
CREATE POLICY "租赁管理员可以创建通知"
ON notifications FOR INSERT
WITH CHECK (is_lease_admin_user(public.current_user_id()));

COMMENT ON POLICY "Users can view own notifications" ON notifications 
IS '用户可以查看自己的通知，使用 current_user_id()';

COMMENT ON POLICY "Admins can view all notifications" ON notifications 
IS '管理员可以查看所有通知，使用 current_user_id()';

COMMENT ON POLICY "Users can update own notifications" ON notifications 
IS '用户可以更新自己的通知，使用 current_user_id()';

COMMENT ON POLICY "Users can delete own notifications" ON notifications 
IS '用户可以删除自己的通知，使用 current_user_id()';
