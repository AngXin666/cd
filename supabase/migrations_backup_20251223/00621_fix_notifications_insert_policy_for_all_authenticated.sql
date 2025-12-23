/*
# 修复通知表INSERT权限 - 允许所有认证用户创建通知

## 问题
调度（PEER_ADMIN）和车队长（MANAGER）角色创建通知时遇到42501错误（RLS策略阻止）

## 解决方案
删除旧的限制性INSERT策略，创建新策略允许所有认证用户插入通知

## 变更内容
1. 删除旧的 "BOSS 和 DISPATCHER 可以发送通知" 策略
2. 创建新策略允许所有认证用户INSERT
*/

-- 删除旧的限制性INSERT策略
DROP POLICY IF EXISTS "BOSS 和 DISPATCHER 可以发送通知" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications for others" ON notifications;

-- 创建新策略：所有认证用户都可以创建通知
CREATE POLICY "所有认证用户可以创建通知" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY "所有认证用户可以创建通知" ON notifications IS 
'允许所有认证用户（BOSS、PEER_ADMIN、MANAGER、DRIVER）创建通知，通知系统本身就应该支持任意角色间的消息传递';
