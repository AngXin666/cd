/*
# 创建司机通知系统

## 说明
创建司机通知功能所需的表结构，包括通知模板、定时通知、自动提醒规则和发送记录。

## 表结构

### 1. notification_templates（通知模板表）
存储可重复使用的通知模板。

**字段说明**：
- id (uuid, PK): 模板ID
- title (text): 模板标题
- content (text): 模板内容
- category (text): 模板分类（general/attendance/piece_work/vehicle/leave）
- is_favorite (boolean): 是否为常用模板
- created_by (uuid, FK): 创建者ID
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

### 2. scheduled_notifications（定时通知表）
存储预定的定时通知。

**字段说明**：
- id (uuid, PK): 通知ID
- title (text): 通知标题
- content (text): 通知内容
- send_time (timestamptz): 发送时间
- target_type (text): 目标类型（all/warehouse/specific）
- target_ids (uuid[]): 目标ID列表（仓库ID或司机ID）
- status (text): 状态（pending/sent/cancelled/failed）
- created_by (uuid, FK): 创建者ID
- created_at (timestamptz): 创建时间
- sent_at (timestamptz): 实际发送时间

### 3. auto_reminder_rules（自动提醒规则表）
存储自动提醒规则配置。

**字段说明**：
- id (uuid, PK): 规则ID
- rule_type (text): 规则类型（attendance/piece_work）
- rule_name (text): 规则名称
- check_time (time): 检查时间
- reminder_content (text): 提醒内容
- warehouse_id (uuid, FK): 仓库ID（null表示全局规则）
- is_active (boolean): 是否启用
- created_by (uuid, FK): 创建者ID
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

### 4. notification_send_records（通知发送记录表）
记录每次通知发送的详细信息。

**字段说明**：
- id (uuid, PK): 记录ID
- notification_type (text): 通知类型（manual/scheduled/auto）
- title (text): 通知标题
- content (text): 通知内容
- recipient_count (int): 接收人数
- target_type (text): 目标类型
- target_ids (uuid[]): 目标ID列表
- sent_by (uuid, FK): 发送者ID
- sent_at (timestamptz): 发送时间
- related_notification_id (uuid): 关联的定时通知ID

## 安全策略
- 所有表启用 RLS
- 老板可以查看和管理所有通知
- 车队长可以查看和管理自己负责仓库的通知
*/

-- ============================================
-- 创建 notification_templates 表
-- ============================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general'::text,
  is_favorite boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_created_by ON notification_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_favorite ON notification_templates(is_favorite);

-- ============================================
-- 创建 scheduled_notifications 表
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  send_time timestamptz NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('all', 'warehouse', 'specific')),
  target_ids uuid[] DEFAULT ARRAY[]::uuid[],
  status text DEFAULT 'pending'::text CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_send_time ON scheduled_notifications(send_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_created_by ON scheduled_notifications(created_by);

-- ============================================
-- 创建 auto_reminder_rules 表
-- ============================================
CREATE TABLE IF NOT EXISTS auto_reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL CHECK (rule_type IN ('attendance', 'piece_work')),
  rule_name text NOT NULL,
  check_time time NOT NULL,
  reminder_content text NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_reminder_rules_rule_type ON auto_reminder_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_auto_reminder_rules_warehouse_id ON auto_reminder_rules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_auto_reminder_rules_is_active ON auto_reminder_rules(is_active);

-- ============================================
-- 创建 notification_send_records 表
-- ============================================
CREATE TABLE IF NOT EXISTS notification_send_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL CHECK (notification_type IN ('manual', 'scheduled', 'auto')),
  title text NOT NULL,
  content text NOT NULL,
  recipient_count int DEFAULT 0,
  target_type text NOT NULL,
  target_ids uuid[] DEFAULT ARRAY[]::uuid[],
  sent_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at timestamptz DEFAULT now() NOT NULL,
  related_notification_id uuid
);

CREATE INDEX IF NOT EXISTS idx_notification_send_records_sent_by ON notification_send_records(sent_by);
CREATE INDEX IF NOT EXISTS idx_notification_send_records_sent_at ON notification_send_records(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_send_records_notification_type ON notification_send_records(notification_type);

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_send_records ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 策略：notification_templates
-- ============================================

-- 老板可以查看所有模板
CREATE POLICY "老板可以查看所有通知模板" ON notification_templates
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- 车队长可以查看自己创建的模板
CREATE POLICY "车队长可以查看自己的通知模板" ON notification_templates
  FOR SELECT TO authenticated
  USING (is_manager(auth.uid()) AND created_by = auth.uid());

-- 老板和车队长可以创建模板
CREATE POLICY "老板和车队长可以创建通知模板" ON notification_templates
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR is_manager(auth.uid()));

-- 只能更新自己创建的模板
CREATE POLICY "只能更新自己创建的通知模板" ON notification_templates
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- 只能删除自己创建的模板
CREATE POLICY "只能删除自己创建的通知模板" ON notification_templates
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- RLS 策略：scheduled_notifications
-- ============================================

-- 老板可以查看所有定时通知
CREATE POLICY "老板可以查看所有定时通知" ON scheduled_notifications
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- 车队长可以查看自己创建的定时通知
CREATE POLICY "车队长可以查看自己的定时通知" ON scheduled_notifications
  FOR SELECT TO authenticated
  USING (is_manager(auth.uid()) AND created_by = auth.uid());

-- 老板和车队长可以创建定时通知
CREATE POLICY "老板和车队长可以创建定时通知" ON scheduled_notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR is_manager(auth.uid()));

-- 只能更新自己创建的定时通知
CREATE POLICY "只能更新自己创建的定时通知" ON scheduled_notifications
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- RLS 策略：auto_reminder_rules
-- ============================================

-- 老板可以查看所有自动提醒规则
CREATE POLICY "老板可以查看所有自动提醒规则" ON auto_reminder_rules
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- 车队长可以查看自己负责仓库的规则
CREATE POLICY "车队长可以查看自己仓库的自动提醒规则" ON auto_reminder_rules
  FOR SELECT TO authenticated
  USING (
    is_manager(auth.uid()) AND (
      warehouse_id IS NULL OR
      is_manager_of_warehouse(auth.uid(), warehouse_id)
    )
  );

-- 老板和车队长可以创建规则
CREATE POLICY "老板和车队长可以创建自动提醒规则" ON auto_reminder_rules
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR is_manager(auth.uid()));

-- 只能更新自己创建的规则
CREATE POLICY "只能更新自己创建的自动提醒规则" ON auto_reminder_rules
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- 只能删除自己创建的规则
CREATE POLICY "只能删除自己创建的自动提醒规则" ON auto_reminder_rules
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- RLS 策略：notification_send_records
-- ============================================

-- 老板可以查看所有发送记录
CREATE POLICY "老板可以查看所有通知发送记录" ON notification_send_records
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- 车队长可以查看自己发送的记录
CREATE POLICY "车队长可以查看自己的通知发送记录" ON notification_send_records
  FOR SELECT TO authenticated
  USING (is_manager(auth.uid()) AND sent_by = auth.uid());

-- 老板和车队长可以创建发送记录
CREATE POLICY "老板和车队长可以创建通知发送记录" ON notification_send_records
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR is_manager(auth.uid()));

-- ============================================
-- 更新时间触发器
-- ============================================

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 notification_templates 添加触发器
DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 auto_reminder_rules 添加触发器
DROP TRIGGER IF EXISTS update_auto_reminder_rules_updated_at ON auto_reminder_rules;
CREATE TRIGGER update_auto_reminder_rules_updated_at
  BEFORE UPDATE ON auto_reminder_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
