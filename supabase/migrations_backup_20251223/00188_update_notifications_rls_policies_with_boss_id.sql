/*
# 更新 notifications 表的 RLS 策略以使用 boss_id

## 问题
当前的 RLS 策略中有些使用了 boss_id，有些没有使用，导致数据隔离不完整。

## 解决方案
1. 删除所有旧的 RLS 策略
2. 创建新的基于 boss_id 的 RLS 策略
3. 确保所有操作都包含 boss_id 过滤

## 变更内容
- 删除旧的 RLS 策略
- 创建新的基于 boss_id 的 RLS 策略
- 确保数据隔离完整
*/

-- 删除所有旧的 RLS 策略
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

-- 创建新的基于 boss_id 的 RLS 策略

-- 1. 超级管理员可以查看同租户的所有通知
CREATE POLICY "Super admins can view tenant notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND is_super_admin(auth.uid())
);

-- 2. 超级管理员可以创建同租户的通知
CREATE POLICY "Super admins can create tenant notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_super_admin(auth.uid())
);

-- 3. 超级管理员可以更新同租户的通知
CREATE POLICY "Super admins can update tenant notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND is_super_admin(auth.uid())
);

-- 4. 超级管理员可以删除同租户的通知
CREATE POLICY "Super admins can delete tenant notifications"
ON notifications FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND is_super_admin(auth.uid())
);

-- 5. 管理员可以查看同租户的所有通知
CREATE POLICY "Admins can view tenant notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND is_admin(auth.uid())
);

-- 6. 管理员可以创建同租户的通知
CREATE POLICY "Admins can create tenant notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_admin(auth.uid())
);

-- 7. 用户可以查看自己的通知（同租户）
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
);

-- 8. 用户可以更新自己的通知（同租户）
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
);

-- 9. 用户可以删除自己的通知（同租户）
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
);