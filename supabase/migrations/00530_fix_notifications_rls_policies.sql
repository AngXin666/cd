/*
# 修复通知表的 RLS 策略

## 问题描述
1. 用户更新通知的策略缺少 WITH CHECK 子句
2. 用户无法删除自己的通知

## 解决方案
1. 为用户更新策略添加 WITH CHECK 子句
2. 添加用户删除自己通知的策略

## 变更内容
1. 删除旧的 "Users can update their own notifications" 策略
2. 重新创建策略，添加 WITH CHECK 子句
3. 添加 "Users can delete their own notifications" 策略
*/

-- 1. 修复用户更新通知的策略
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- 2. 添加用户删除自己通知的策略
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE
  USING (auth.uid() = recipient_id);
