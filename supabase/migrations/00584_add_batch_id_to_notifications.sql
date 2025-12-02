/*
# 添加 batch_id 字段到 notifications 表

## 说明
- 批量创建通知时需要使用 batch_id 来标识同一批次的通知
- 这样可以方便地批量更新或查询同一批次的通知

## 变更内容
1. 添加 batch_id 字段（UUID 类型，可为空）
2. 添加索引以提高查询性能

## 注意事项
- batch_id 是可选字段，用于批量操作
- 同一批次的通知共享相同的 batch_id
*/

-- 添加 batch_id 字段
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS batch_id uuid;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_notifications_batch_id 
ON notifications(batch_id) 
WHERE batch_id IS NOT NULL;