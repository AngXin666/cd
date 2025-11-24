/*
# 修复通知分类数据

## 问题描述
部分通知的 category 字段值不正确，导致通知中心的分类筛选功能无法正常工作。

## 修复内容
1. 将所有请假离职相关的通知分类更新为 'leave_resignation'
2. 将所有车辆审批相关的通知分类更新为 'vehicle_approval'
3. 将所有权限相关的通知分类更新为 'permission'

## 影响范围
- 修复现有通知数据的分类
- 不影响新创建的通知（代码中已正确设置）

## 执行时间
2025-11-24
*/

-- 修复请假离职信息的分类
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
AND category != 'leave_resignation'::notification_category;

-- 修复车辆审批信息的分类
UPDATE notifications
SET category = 'vehicle_approval'::notification_category
WHERE type IN (
  'vehicle_review_pending',
  'vehicle_review_approved',
  'vehicle_review_need_supplement'
)
AND category != 'vehicle_approval'::notification_category;

-- 修复权限信息的分类
UPDATE notifications
SET category = 'permission'::notification_category
WHERE type IN (
  'warehouse_assigned',
  'warehouse_unassigned',
  'driver_type_changed',
  'permission_change',
  'driver_info_update',
  'driver_created',
  'system_notice'
)
AND category != 'permission'::notification_category;

-- 验证修复结果
-- 查询每种类型的通知数量和分类
-- SELECT type, category, COUNT(*) as count
-- FROM notifications
-- GROUP BY type, category
-- ORDER BY type, category;
