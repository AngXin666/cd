/*
# 重新创建请假和离职申请表

## 背景
在单用户系统迁移过程中，`leave_applications` 和 `resignation_applications` 表被删除了，
但代码中仍在使用这些表。本迁移文件重新创建这两个表，并适配新的单用户系统架构。

## 变更内容

### 1. 创建 leave_applications 表
- `id` (uuid, primary key)
- `user_id` (uuid, not null) - 申请人ID，引用 users 表
- `warehouse_id` (uuid) - 仓库ID，引用 warehouses 表
- `leave_type` (text, not null) - 请假类型
- `start_date` (date, not null) - 开始日期
- `end_date` (date, not null) - 结束日期
- `reason` (text, not null) - 请假原因
- `status` (text, not null, default 'pending') - 状态：pending/approved/rejected
- `reviewed_by` (uuid) - 审批人ID，引用 users 表
- `reviewed_at` (timestamptz) - 审批时间
- `review_notes` (text) - 审批备注
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### 2. 创建 resignation_applications 表
- `id` (uuid, primary key)
- `user_id` (uuid, not null) - 申请人ID，引用 users 表
- `warehouse_id` (uuid) - 仓库ID，引用 warehouses 表
- `resignation_date` (date, not null) - 离职日期
- `reason` (text, not null) - 离职原因
- `status` (text, not null, default 'pending') - 状态：pending/approved/rejected
- `reviewed_by` (uuid) - 审批人ID，引用 users 表
- `reviewed_at` (timestamptz) - 审批时间
- `review_notes` (text) - 审批备注
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### 3. 创建索引
- 为常用查询字段创建索引，提升查询性能

### 4. 创建触发器
- 自动更新 updated_at 字段

### 5. RLS 策略
- 启用 RLS
- 管理员（boss/manager）可以查看和管理所有申请
- 司机只能查看和管理自己的申请

## 注意事项
- 不使用外键约束引用 users 表，因为在单用户系统中，用户ID直接来自 auth.users
- 数据完整性由应用层验证、认证系统和 RLS 策略保证
- warehouse_id 可以为空，因为某些申请可能不关联特定仓库
*/

-- 1. 创建 leave_applications 表
CREATE TABLE IF NOT EXISTS leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT leave_end_after_start CHECK (end_date >= start_date),
  CONSTRAINT leave_status_valid CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 2. 创建 resignation_applications 表
CREATE TABLE IF NOT EXISTS resignation_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  resignation_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT resignation_status_valid CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 3. 创建索引
-- leave_applications 索引
CREATE INDEX IF NOT EXISTS idx_leave_applications_user_id ON leave_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_warehouse_id ON leave_applications(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_start_date ON leave_applications(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_applications_end_date ON leave_applications(end_date);
CREATE INDEX IF NOT EXISTS idx_leave_applications_reviewed_by ON leave_applications(reviewed_by);

-- resignation_applications 索引
CREATE INDEX IF NOT EXISTS idx_resignation_applications_user_id ON resignation_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_warehouse_id ON resignation_applications(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_status ON resignation_applications(status);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_resignation_date ON resignation_applications(resignation_date);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_reviewed_by ON resignation_applications(reviewed_by);

-- 4. 创建触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 leave_applications 创建触发器
DROP TRIGGER IF EXISTS update_leave_applications_updated_at ON leave_applications;
CREATE TRIGGER update_leave_applications_updated_at
  BEFORE UPDATE ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 resignation_applications 创建触发器
DROP TRIGGER IF EXISTS update_resignation_applications_updated_at ON resignation_applications;
CREATE TRIGGER update_resignation_applications_updated_at
  BEFORE UPDATE ON resignation_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. 启用 RLS
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resignation_applications ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略

-- leave_applications 策略
-- 管理员可以查看所有申请
DROP POLICY IF EXISTS "Managers can view all leave applications" ON leave_applications;
CREATE POLICY "Managers can view all leave applications" ON leave_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 管理员可以更新所有申请
DROP POLICY IF EXISTS "Managers can update all leave applications" ON leave_applications;
CREATE POLICY "Managers can update all leave applications" ON leave_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 管理员可以删除所有申请
DROP POLICY IF EXISTS "Managers can delete all leave applications" ON leave_applications;
CREATE POLICY "Managers can delete all leave applications" ON leave_applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 用户可以查看自己的申请
DROP POLICY IF EXISTS "Users can view own leave applications" ON leave_applications;
CREATE POLICY "Users can view own leave applications" ON leave_applications
  FOR SELECT
  USING (user_id = auth.uid());

-- 用户可以创建自己的申请
DROP POLICY IF EXISTS "Users can create own leave applications" ON leave_applications;
CREATE POLICY "Users can create own leave applications" ON leave_applications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 用户可以更新自己的待审批申请
DROP POLICY IF EXISTS "Users can update own pending leave applications" ON leave_applications;
CREATE POLICY "Users can update own pending leave applications" ON leave_applications
  FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');

-- 用户可以删除自己的待审批申请
DROP POLICY IF EXISTS "Users can delete own pending leave applications" ON leave_applications;
CREATE POLICY "Users can delete own pending leave applications" ON leave_applications
  FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

-- resignation_applications 策略
-- 管理员可以查看所有申请
DROP POLICY IF EXISTS "Managers can view all resignation applications" ON resignation_applications;
CREATE POLICY "Managers can view all resignation applications" ON resignation_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 管理员可以更新所有申请
DROP POLICY IF EXISTS "Managers can update all resignation applications" ON resignation_applications;
CREATE POLICY "Managers can update all resignation applications" ON resignation_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 管理员可以删除所有申请
DROP POLICY IF EXISTS "Managers can delete all resignation applications" ON resignation_applications;
CREATE POLICY "Managers can delete all resignation applications" ON resignation_applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 用户可以查看自己的申请
DROP POLICY IF EXISTS "Users can view own resignation applications" ON resignation_applications;
CREATE POLICY "Users can view own resignation applications" ON resignation_applications
  FOR SELECT
  USING (user_id = auth.uid());

-- 用户可以创建自己的申请
DROP POLICY IF EXISTS "Users can create own resignation applications" ON resignation_applications;
CREATE POLICY "Users can create own resignation applications" ON resignation_applications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 用户可以更新自己的待审批申请
DROP POLICY IF EXISTS "Users can update own pending resignation applications" ON resignation_applications;
CREATE POLICY "Users can update own pending resignation applications" ON resignation_applications
  FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');

-- 用户可以删除自己的待审批申请
DROP POLICY IF EXISTS "Users can delete own pending resignation applications" ON resignation_applications;
CREATE POLICY "Users can delete own pending resignation applications" ON resignation_applications
  FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

-- 7. 添加注释
COMMENT ON TABLE leave_applications IS '请假申请表';
COMMENT ON TABLE resignation_applications IS '离职申请表';

COMMENT ON COLUMN leave_applications.user_id IS '申请人用户ID（来自 auth.users）';
COMMENT ON COLUMN leave_applications.warehouse_id IS '仓库ID（可选）';
COMMENT ON COLUMN leave_applications.leave_type IS '请假类型（如：病假、事假、年假等）';
COMMENT ON COLUMN leave_applications.start_date IS '请假开始日期';
COMMENT ON COLUMN leave_applications.end_date IS '请假结束日期';
COMMENT ON COLUMN leave_applications.reason IS '请假原因';
COMMENT ON COLUMN leave_applications.status IS '申请状态：pending（待审批）、approved（已批准）、rejected（已拒绝）';
COMMENT ON COLUMN leave_applications.reviewed_by IS '审批人用户ID（来自 auth.users）';
COMMENT ON COLUMN leave_applications.reviewed_at IS '审批时间';
COMMENT ON COLUMN leave_applications.review_notes IS '审批备注';

COMMENT ON COLUMN resignation_applications.user_id IS '申请人用户ID（来自 auth.users）';
COMMENT ON COLUMN resignation_applications.warehouse_id IS '仓库ID（可选）';
COMMENT ON COLUMN resignation_applications.resignation_date IS '离职日期';
COMMENT ON COLUMN resignation_applications.reason IS '离职原因';
COMMENT ON COLUMN resignation_applications.status IS '申请状态：pending（待审批）、approved（已批准）、rejected（已拒绝）';
COMMENT ON COLUMN resignation_applications.reviewed_by IS '审批人用户ID（来自 auth.users）';
COMMENT ON COLUMN resignation_applications.reviewed_at IS '审批时间';
COMMENT ON COLUMN resignation_applications.review_notes IS '审批备注';
