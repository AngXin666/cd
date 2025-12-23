/*
# 添加通知分类功能

## 1. 新增枚举类型
- `notification_category` - 通知分类枚举
  - `leave_resignation`: 请假离职信息
  - `vehicle_approval`: 车辆审批信息
  - `permission`: 权限信息

## 2. 表结构变更
- 在 `notifications` 表中添加 `category` 字段
- 设置默认值和非空约束

## 3. 分类规则
- **请假离职信息**：
  - leave_application_submitted（请假申请提交）
  - leave_approved（请假批准）
  - leave_rejected（请假拒绝）
  - resignation_application_submitted（离职申请提交）
  - resignation_approved（离职批准）
  - resignation_rejected（离职拒绝）

- **车辆审批信息**：
  - vehicle_review_pending（车辆待审核）
  - vehicle_review_approved（车辆审核通过）
  - vehicle_review_need_supplement（车辆需要补录）

- **权限信息**：
  - warehouse_assigned（仓库分配）
  - warehouse_unassigned（仓库取消分配）
  - driver_type_changed（司机类型变更）
  - permission_change（权限变更）

## 4. 索引优化
- 创建 category 字段索引，提升分类查询性能
- 创建复合索引 (user_id, category, is_read)，优化筛选查询

## 5. 数据迁移
- 为现有通知数据设置正确的分类
*/

-- 1. 创建通知分类枚举
DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM (
    'leave_resignation',  -- 请假离职信息
    'vehicle_approval',   -- 车辆审批信息
    'permission'          -- 权限信息
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. 添加 category 字段（先允许为空，用于数据迁移）
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category notification_category;

-- 3. 为现有数据设置分类
-- 请假离职信息
UPDATE notifications
SET category = 'leave_resignation'::notification_category
WHERE type IN (
  'leave_application_submitted',
  'leave_approved',
  'leave_rejected',
  'resignation_application_submitted',
  'resignation_approved',
  'resignation_rejected'
)
AND category IS NULL;

-- 车辆审批信息
UPDATE notifications
SET category = 'vehicle_approval'::notification_category
WHERE type IN (
  'vehicle_review_pending',
  'vehicle_review_approved',
  'vehicle_review_need_supplement'
)
AND category IS NULL;

-- 权限信息
UPDATE notifications
SET category = 'permission'::notification_category
WHERE type IN (
  'warehouse_assigned',
  'warehouse_unassigned',
  'driver_type_changed',
  'permission_change'
)
AND category IS NULL;

-- 4. 设置默认值并添加非空约束
ALTER TABLE notifications ALTER COLUMN category SET DEFAULT 'permission'::notification_category;
ALTER TABLE notifications ALTER COLUMN category SET NOT NULL;

-- 5. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_category_read 
  ON notifications(user_id, category, is_read);

-- 6. 添加注释
COMMENT ON COLUMN notifications.category IS '通知分类：leave_resignation=请假离职信息, vehicle_approval=车辆审批信息, permission=权限信息';
