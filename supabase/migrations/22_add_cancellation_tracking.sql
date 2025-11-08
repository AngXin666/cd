/*
# 添加撤销操作追踪字段

## 1. 变更说明
为请假申请表和离职申请表添加撤销操作追踪字段，用于记录撤销操作的详细信息。

## 2. 新增字段

### leave_applications（请假申请表）
- `cancelled_by` (uuid, 可选) - 撤销操作人ID，外键关联 profiles.id
- `cancelled_at` (timestamptz, 可选) - 撤销时间

### resignation_applications（离职申请表）
- `cancelled_by` (uuid, 可选) - 撤销操作人ID，外键关联 profiles.id
- `cancelled_at` (timestamptz, 可选) - 撤销时间

## 3. 业务规则
- 当申请状态变更为 'cancelled' 时，应同时记录 cancelled_by 和 cancelled_at
- cancelled_by 记录执行撤销操作的用户ID（司机本人或管理员）
- cancelled_at 记录撤销操作的时间戳
- 这些字段用于审计和历史追溯

## 4. 使用场景
- 司机主动撤销：cancelled_by = 司机自己的 user_id
- 管理员撤销：cancelled_by = 管理员的 user_id
- 系统日志：通过这些字段可以追溯所有撤销操作的历史
*/

-- 为请假申请表添加撤销追踪字段
ALTER TABLE leave_applications
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- 为离职申请表添加撤销追踪字段
ALTER TABLE resignation_applications
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- 添加注释说明
COMMENT ON COLUMN leave_applications.cancelled_by IS '撤销操作人ID';
COMMENT ON COLUMN leave_applications.cancelled_at IS '撤销时间';
COMMENT ON COLUMN resignation_applications.cancelled_by IS '撤销操作人ID';
COMMENT ON COLUMN resignation_applications.cancelled_at IS '撤销时间';
