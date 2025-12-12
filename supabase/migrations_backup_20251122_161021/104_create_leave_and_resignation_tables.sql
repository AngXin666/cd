/*
# 创建请假和离职申请表

## 1. 新建表

### leave_applications（请假申请表）
- `id` (uuid, 主键, 默认: gen_random_uuid())
- `user_id` (uuid, 外键关联 profiles.id) - 申请人ID
- `warehouse_id` (uuid, 外键关联 warehouses.id) - 所属仓库
- `type` (leave_type枚举) - 请假类型（病假、事假、年假、其他）
- `start_date` (date) - 开始日期
- `end_date` (date) - 结束日期
- `reason` (text) - 请假事由
- `attachment_url` (text, 可选) - 附件URL
- `status` (application_status枚举) - 状态（待审批、已通过、已驳回）
- `reviewer_id` (uuid, 可选) - 审批人ID
- `review_comment` (text, 可选) - 审批意见
- `reviewed_at` (timestamptz, 可选) - 审批时间
- `created_at` (timestamptz, 默认: now())

### resignation_applications（离职申请表）
- `id` (uuid, 主键, 默认: gen_random_uuid())
- `user_id` (uuid, 外键关联 profiles.id) - 申请人ID
- `warehouse_id` (uuid, 外键关联 warehouses.id) - 所属仓库
- `expected_date` (date) - 预计离职日期
- `reason` (text) - 离职原因
- `status` (application_status枚举) - 状态（待审批、已通过、已驳回）
- `reviewer_id` (uuid, 可选) - 审批人ID
- `review_comment` (text, 可选) - 审批意见
- `reviewed_at` (timestamptz, 可选) - 审批时间
- `created_at` (timestamptz, 默认: now())

## 2. 安全策略
- 启用 RLS
- 司机可以查看和创建自己的申请
- 管理员可以查看和审批管辖仓库内的申请
- 超级管理员可以查看和审批所有申请

## 3. 枚举类型
- leave_type: 'sick_leave'(病假), 'personal_leave'(事假), 'annual_leave'(年假), 'other'(其他)
- application_status: 'pending'(待审批), 'approved'(已通过), 'rejected'(已驳回)
*/

-- 创建枚举类型
CREATE TYPE leave_type AS ENUM ('sick_leave', 'personal_leave', 'annual_leave', 'other');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

-- 创建请假申请表
CREATE TABLE IF NOT EXISTS leave_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    type leave_type NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    attachment_url text,
    status application_status DEFAULT 'pending'::application_status NOT NULL,
    reviewer_id uuid REFERENCES profiles(id),
    review_comment text,
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 创建离职申请表
CREATE TABLE IF NOT EXISTS resignation_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    expected_date date NOT NULL,
    reason text NOT NULL,
    status application_status DEFAULT 'pending'::application_status NOT NULL,
    reviewer_id uuid REFERENCES profiles(id),
    review_comment text,
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 启用 RLS
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resignation_applications ENABLE ROW LEVEL SECURITY;

-- 请假申请表的安全策略
-- 司机可以查看自己的申请
CREATE POLICY "Drivers can view own leave applications" ON leave_applications
    FOR SELECT USING (auth.uid() = user_id);

-- 司机可以创建自己的申请
CREATE POLICY "Drivers can create own leave applications" ON leave_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理员可以查看管辖仓库内的申请
CREATE POLICY "Managers can view warehouse leave applications" ON leave_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM manager_warehouses mw
            JOIN profiles p ON p.id = auth.uid()
            WHERE mw.manager_id = auth.uid()
            AND mw.warehouse_id = leave_applications.warehouse_id
            AND p.role IN ('manager', 'super_admin')
        )
    );

-- 管理员可以审批管辖仓库内的申请
CREATE POLICY "Managers can update warehouse leave applications" ON leave_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM manager_warehouses mw
            JOIN profiles p ON p.id = auth.uid()
            WHERE mw.manager_id = auth.uid()
            AND mw.warehouse_id = leave_applications.warehouse_id
            AND p.role IN ('manager', 'super_admin')
        )
    );

-- 超级管理员可以查看所有申请
CREATE POLICY "Super admins can view all leave applications" ON leave_applications
    FOR SELECT USING (is_super_admin(auth.uid()));

-- 超级管理员可以审批所有申请
CREATE POLICY "Super admins can update all leave applications" ON leave_applications
    FOR UPDATE USING (is_super_admin(auth.uid()));

-- 离职申请表的安全策略
-- 司机可以查看自己的申请
CREATE POLICY "Drivers can view own resignation applications" ON resignation_applications
    FOR SELECT USING (auth.uid() = user_id);

-- 司机可以创建自己的申请
CREATE POLICY "Drivers can create own resignation applications" ON resignation_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理员可以查看管辖仓库内的申请
CREATE POLICY "Managers can view warehouse resignation applications" ON resignation_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM manager_warehouses mw
            JOIN profiles p ON p.id = auth.uid()
            WHERE mw.manager_id = auth.uid()
            AND mw.warehouse_id = resignation_applications.warehouse_id
            AND p.role IN ('manager', 'super_admin')
        )
    );

-- 管理员可以审批管辖仓库内的申请
CREATE POLICY "Managers can update warehouse resignation applications" ON resignation_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM manager_warehouses mw
            JOIN profiles p ON p.id = auth.uid()
            WHERE mw.manager_id = auth.uid()
            AND mw.warehouse_id = resignation_applications.warehouse_id
            AND p.role IN ('manager', 'super_admin')
        )
    );

-- 超级管理员可以查看所有申请
CREATE POLICY "Super admins can view all resignation applications" ON resignation_applications
    FOR SELECT USING (is_super_admin(auth.uid()));

-- 超级管理员可以审批所有申请
CREATE POLICY "Super admins can update all resignation applications" ON resignation_applications
    FOR UPDATE USING (is_super_admin(auth.uid()));

-- 创建索引以提高查询性能
CREATE INDEX idx_leave_applications_user_id ON leave_applications(user_id);
CREATE INDEX idx_leave_applications_warehouse_id ON leave_applications(warehouse_id);
CREATE INDEX idx_leave_applications_status ON leave_applications(status);
CREATE INDEX idx_resignation_applications_user_id ON resignation_applications(user_id);
CREATE INDEX idx_resignation_applications_warehouse_id ON resignation_applications(warehouse_id);
CREATE INDEX idx_resignation_applications_status ON resignation_applications(status);
