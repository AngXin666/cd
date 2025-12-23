/*
# 创建请假相关表

## 说明
创建请假管理相关的表，包括请假申请表和离职申请表。

## 表结构

### 1. leave_applications（请假申请表）
记录用户的请假申请。

**字段说明**：
- id (uuid, PK): 申请ID
- user_id (uuid, FK): 用户ID，关联 profiles.id
- warehouse_id (uuid, FK): 仓库ID，关联 warehouses.id
- leave_type (leave_type): 请假类型
- start_date (date): 开始日期
- end_date (date): 结束日期
- days (numeric): 请假天数
- reason (text): 请假原因
- status (application_status): 申请状态
- reviewed_by (uuid, FK): 审批人ID，关联 profiles.id
- reviewed_at (timestamptz): 审批时间
- review_notes (text): 审批备注
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

**约束**：
- end_date 必须大于等于 start_date
- days 必须为正数

### 2. resignation_applications（离职申请表）
记录用户的离职申请。

**字段说明**：
- id (uuid, PK): 申请ID
- user_id (uuid, FK): 用户ID，关联 profiles.id
- warehouse_id (uuid, FK): 仓库ID，关联 warehouses.id
- resignation_date (date): 离职日期
- reason (text): 离职原因
- status (application_status): 申请状态
- reviewed_by (uuid, FK): 审批人ID，关联 profiles.id
- reviewed_at (timestamptz): 审批时间
- review_notes (text): 审批备注
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

**约束**：
- resignation_date 必须大于当前日期

## 安全策略
- 两个表都启用 RLS
- 用户只能查看和创建自己的申请
- 管理员可以查看和审批自己负责仓库的申请
- 超级管理员可以查看和审批所有申请
*/

-- ============================================
-- 创建 leave_applications 表
-- ============================================
CREATE TABLE IF NOT EXISTS leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric(5,1) NOT NULL,
  reason text NOT NULL,
  status application_status DEFAULT 'pending'::application_status NOT NULL,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT end_date_after_start_date CHECK (end_date >= start_date),
  CONSTRAINT days_positive CHECK (days > 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_leave_applications_user_id ON leave_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_warehouse_id ON leave_applications(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_start_date ON leave_applications(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_applications_end_date ON leave_applications(end_date);

-- 为 leave_applications 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_leave_applications_updated_at ON leave_applications;
CREATE TRIGGER update_leave_applications_updated_at
  BEFORE UPDATE ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 创建 resignation_applications 表
-- ============================================
CREATE TABLE IF NOT EXISTS resignation_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  resignation_date date NOT NULL,
  reason text NOT NULL,
  status application_status DEFAULT 'pending'::application_status NOT NULL,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT resignation_date_future CHECK (resignation_date > CURRENT_DATE)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_resignation_applications_user_id ON resignation_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_warehouse_id ON resignation_applications(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_status ON resignation_applications(status);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_resignation_date ON resignation_applications(resignation_date);

-- 为 resignation_applications 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_resignation_applications_updated_at ON resignation_applications;
CREATE TRIGGER update_resignation_applications_updated_at
  BEFORE UPDATE ON resignation_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resignation_applications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 辅助函数：计算请假天数
-- ============================================
CREATE OR REPLACE FUNCTION calculate_leave_days(
  start_date_param date,
  end_date_param date
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (end_date_param - start_date_param) + 1;
END;
$$;

-- ============================================
-- 触发器：自动计算请假天数
-- ============================================
CREATE OR REPLACE FUNCTION auto_calculate_leave_days()
RETURNS TRIGGER AS $$
BEGIN
  NEW.days := calculate_leave_days(NEW.start_date, NEW.end_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_leave_days ON leave_applications;
CREATE TRIGGER trigger_auto_calculate_leave_days
  BEFORE INSERT OR UPDATE ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_leave_days();

-- ============================================
-- 辅助函数：检查用户是否在请假期间
-- ============================================
CREATE OR REPLACE FUNCTION is_user_on_leave(
  user_id_param uuid,
  check_date date DEFAULT CURRENT_DATE
)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM leave_applications
    WHERE user_id = user_id_param
      AND status = 'approved'::application_status
      AND start_date <= check_date
      AND end_date >= check_date
  );
$$;
