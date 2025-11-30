/*
# 修复通知表的 INSERT 策略 - 允许车队长发送通知

## 问题
- notifications 表的 INSERT 策略使用 is_dispatcher() 函数
- is_dispatcher() 只检查 BOSS 和 DISPATCHER 角色，不包括 MANAGER
- 导致车队长（MANAGER）无法创建通知
- 错误信息：new row violates row-level security policy for table "notifications"

## 修复
1. 删除旧的 INSERT 策略
2. 创建新的 INSERT 策略，允许 MANAGER、DISPATCHER 和 BOSS 创建通知
3. 确保发送者是当前登录用户

## 安全规则
- 只有管理员（MANAGER）、调度（DISPATCHER）和老板（BOSS）可以创建通知
- 发送者必须是当前登录用户（auth.uid() = sender_id）
- 这样可以防止用户冒充他人发送通知
*/

-- 删除所有旧的 INSERT 策略
DROP POLICY IF EXISTS "BOSS 和 DISPATCHER 可以发送通知" ON notifications;
DROP POLICY IF EXISTS "Managers and bosses can create notifications" ON notifications;
DROP POLICY IF EXISTS "管理员可以发送通知" ON notifications;

-- 创建新的 INSERT 策略，允许 MANAGER、DISPATCHER 和 BOSS 创建通知
CREATE POLICY "管理员可以发送通知"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- 发送者必须是当前登录用户
  auth.uid() = sender_id
  AND
  -- 发送者必须是管理员、调度或老板
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('MANAGER', 'DISPATCHER', 'BOSS')
  )
);
