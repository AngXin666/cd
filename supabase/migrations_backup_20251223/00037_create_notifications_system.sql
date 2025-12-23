/*
# 创建通知系统

## 1. 新建表
- `notifications` - 存储所有通知消息

## 2. 通知类型
- vehicle_review_pending: 车辆待审核
- vehicle_review_approved: 车辆审核通过
- vehicle_review_need_supplement: 车辆需补录

## 3. 字段说明
- id: 通知ID
- user_id: 接收通知的用户ID
- type: 通知类型
- title: 通知标题
- message: 通知内容
- related_id: 关联的记录ID（如 driver_profile_id）
- is_read: 是否已读
- created_at: 创建时间
*/

-- 创建通知类型枚举
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'vehicle_review_pending',
    'vehicle_review_approved',
    'vehicle_review_need_supplement'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- 启用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己的通知
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS 策略：用户可以更新自己的通知（标记为已读）
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS 策略：系统可以插入通知（通过触发器）
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);
