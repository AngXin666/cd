/*
# 为通知表添加审批状态字段

## 变更说明
为通知表添加 `approval_status` 字段，用于标记审批类通知的状态。
当审批完成后，直接更新原通知的状态，而不是创建新的通知。

## 变更内容
1. 添加 `approval_status` 字段（可选，text 类型）
   - 'pending': 待审批
   - 'approved': 已批准
   - 'rejected': 已拒绝
   - null: 非审批类通知
2. 添加 `updated_at` 字段，记录通知更新时间
3. 为 `approval_status` 创建索引，提高查询效率

## 影响范围
- 通知表增加两个可选字段
- 不影响现有数据和功能
- 支持审批状态的更新而不是创建新通知
*/

-- 添加 approval_status 字段
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS approval_status text CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- 添加 updated_at 字段
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 为 approval_status 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_approval_status ON notifications(approval_status);

-- 添加字段注释
COMMENT ON COLUMN notifications.approval_status IS '审批状态：pending=待审批, approved=已批准, rejected=已拒绝, null=非审批类通知';
COMMENT ON COLUMN notifications.updated_at IS '通知更新时间';

-- 创建触发器，自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();
