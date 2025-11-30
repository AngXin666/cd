/*
# 添加通知表的 INSERT 策略

## 问题
- notifications 表只有 SELECT 和 UPDATE 策略
- 没有 INSERT 策略，导致无法创建通知
- 错误信息：new row violates row-level security policy for table "notifications"

## 修复
1. 添加 INSERT 策略，允许管理员和老板创建通知
2. 确保发送者是当前登录用户

## 安全规则
- 只有管理员（MANAGER）和老板（BOSS）可以创建通知
- 发送者必须是当前登录用户（auth.uid() = sender_id）
- 这样可以防止用户冒充他人发送通知
*/

-- 删除旧的 INSERT 策略（如果存在）
DROP POLICY IF EXISTS "Managers and bosses can create notifications" ON notifications;

-- 创建新的 INSERT 策略
CREATE POLICY "Managers and bosses can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- 发送者必须是当前登录用户
  auth.uid() = sender_id
  AND
  -- 发送者必须是管理员或老板
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('MANAGER', 'BOSS')
  )
);
