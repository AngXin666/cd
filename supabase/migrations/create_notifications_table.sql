/*
# 创建通知表

## 1. 新增表
- `notifications` - 通知记录表
  - `id` (uuid, 主键) - 通知ID
  - `recipient_id` (uuid, 外键) - 接收者ID（司机ID）
  - `sender_id` (uuid, 外键) - 发送者ID（操作人ID）
  - `sender_name` (text) - 发送者姓名
  - `sender_role` (text) - 发送者角色（manager/super_admin/driver）
  - `type` (text) - 通知类型（verification_reminder/system/announcement等）
  - `title` (text) - 通知标题
  - `content` (text) - 通知内容
  - `action_url` (text, 可选) - 跳转链接
  - `is_read` (boolean) - 是否已读
  - `created_at` (timestamptz) - 创建时间

## 2. 安全策略
- 启用RLS
- 接收者可以查看自己的通知
- 接收者可以更新自己的通知（标记已读）
- 发送者可以创建通知
- 管理员可以查看所有通知

## 3. 索引
- 为recipient_id创建索引，提高查询效率
- 为created_at创建索引，支持按时间排序
*/

-- 删除已存在的表（如果存在）
DROP TABLE IF EXISTS notifications CASCADE;

-- 创建通知表
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('manager', 'super_admin', 'driver')),
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  content text NOT NULL,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 创建索引
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- 接收者可以查看自己的通知
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

-- 接收者可以更新自己的通知（标记已读）
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- 发送者可以创建通知
CREATE POLICY "Users can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- 管理员可以查看所有通知
CREATE POLICY "Admins can view all notifications" ON notifications
  FOR SELECT
  USING (is_admin(auth.uid()));

-- 管理员可以删除通知
CREATE POLICY "Admins can delete notifications" ON notifications
  FOR DELETE
  USING (is_admin(auth.uid()));
