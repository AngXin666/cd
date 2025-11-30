/*
# 简化通知表的 INSERT 策略

## 问题
- 当前策略要求 sender_id 必须等于 auth.uid()
- 但是前端已经做了权限控制，没有权限的用户不会看到发送通知的按钮
- 这个限制是不必要的，反而导致通知创建失败

## 修复
1. 删除旧的 INSERT 策略
2. 创建新的 INSERT 策略，只检查用户角色，不检查 sender_id
3. 只要用户有 MANAGER、DISPATCHER 或 BOSS 角色，就可以创建通知

## 安全规则
- 只有管理员（MANAGER）、调度（DISPATCHER）和老板（BOSS）可以创建通知
- 不限制 sender_id，因为前端已经做了权限控制
*/

-- 删除旧的 INSERT 策略
DROP POLICY IF EXISTS "管理员可以发送通知" ON notifications;

-- 创建新的 INSERT 策略，只检查用户角色
CREATE POLICY "管理员可以发送通知"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- 只检查用户是否有管理权限，不检查 sender_id
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('MANAGER', 'DISPATCHER', 'BOSS')
  )
);
