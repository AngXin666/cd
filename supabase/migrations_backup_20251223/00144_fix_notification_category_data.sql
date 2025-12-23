
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
