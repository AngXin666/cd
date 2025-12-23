/*
# 添加管理员更新通知的权限

## 问题描述
当前 RLS 策略只允许接收者更新自己的通知，不允许管理员更新其他人的通知。
这导致审批后无法更新其他管理员的通知状态。

## 解决方案
添加一个新的 RLS 策略，允许管理员更新所有通知。

## 变更内容
- 添加策略：管理员可以更新所有通知
*/

-- 管理员可以更新所有通知
CREATE POLICY "Admins can update all notifications" ON notifications
  FOR UPDATE
  USING (is_admin(auth.uid()));
