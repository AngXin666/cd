/*
# 为请假和离职申请表添加草稿字段

## 1. 修改内容
- 在 `leave_applications` 表添加 `is_draft` 字段
- 在 `resignation_applications` 表添加 `is_draft` 字段

## 2. 字段说明
- `is_draft` (boolean, 默认: false) - 是否为草稿状态
  - true: 草稿状态，用户可以继续编辑
  - false: 正式申请，已提交审批

## 3. 业务规则
- 草稿状态的申请不参与审批流程
- 草稿只能由创建者查看和编辑
- 草稿提交时需要验证所有必填字段
- 草稿可以被删除

## 4. 索引优化
- 为 `is_draft` 字段创建索引，提高查询性能
*/

-- 为请假申请表添加草稿字段
ALTER TABLE leave_applications 
ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false NOT NULL;

-- 为离职申请表添加草稿字段
ALTER TABLE resignation_applications 
ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false NOT NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_leave_applications_is_draft ON leave_applications(is_draft);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_is_draft ON resignation_applications(is_draft);

-- 更新现有数据，确保所有现有申请都标记为非草稿
UPDATE leave_applications SET is_draft = false WHERE is_draft IS NULL;
UPDATE resignation_applications SET is_draft = false WHERE is_draft IS NULL;
