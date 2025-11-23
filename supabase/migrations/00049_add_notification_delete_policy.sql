/*
# 添加通知删除策略

## 问题
用户无法删除自己的通知，因为缺少 DELETE 策略

## 解决方案
添加 RLS 策略，允许用户删除自己的通知

## 安全性
- 用户只能删除自己的通知（auth.uid() = user_id）
- 不能删除其他用户的通知
*/

-- RLS 策略：用户可以删除自己的通知
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
