/*
# 创建反馈表

## 说明
创建用户反馈表，用于收集和处理用户的意见和建议。

## 表结构

### feedback（反馈表）
记录用户提交的反馈信息。

**字段说明**：
- id (uuid, PK): 反馈ID
- user_id (uuid, FK): 用户ID，关联 profiles.id
- content (text): 反馈内容
- status (feedback_status): 反馈状态
- response (text): 回复内容
- responded_by (uuid, FK): 回复人ID，关联 profiles.id
- responded_at (timestamptz): 回复时间
- created_at (timestamptz): 创建时间

**约束**：
- content 不能为空

## 安全策略
- 启用 RLS
- 用户只能查看和创建自己的反馈
- 管理员和超级管理员可以查看所有反馈并回复
*/

-- ============================================
-- 创建 feedback 表
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  status feedback_status DEFAULT 'pending'::feedback_status NOT NULL,
  response text,
  responded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 触发器：自动设置回复时间
-- ============================================
CREATE OR REPLACE FUNCTION auto_set_responded_at()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果 response 从空变为非空，自动设置 responded_at
  IF OLD.response IS NULL AND NEW.response IS NOT NULL THEN
    NEW.responded_at := now();
    NEW.status := 'resolved'::feedback_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_set_responded_at ON feedback;
CREATE TRIGGER trigger_auto_set_responded_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_responded_at();
