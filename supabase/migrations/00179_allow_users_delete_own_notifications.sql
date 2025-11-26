/*
# 允许用户删除自己的通知

## 变更说明
添加 RLS 策略，允许用户删除自己的通知，改善用户体验。

## 变更内容
1. 添加策略：用户可以删除自己的通知
2. 保留原有策略：管理员可以删除所有通知

## 影响范围
- 用户现在可以删除自己的通知
- 不影响数据隔离和安全性
*/

-- 添加策略：用户可以删除自己的通知
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE
  USING (auth.uid() = recipient_id);

-- 添加策略注释
COMMENT ON POLICY "Users can delete their own notifications" ON notifications IS '允许用户删除自己的通知，改善用户体验';
