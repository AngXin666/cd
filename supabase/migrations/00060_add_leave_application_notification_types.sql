/*
# 添加请假申请相关的通知类型

## 1. 新增通知类型
- leave_application_submitted: 请假申请已提交（管理员收到）
- resignation_application_submitted: 离职申请已提交（管理员收到）
- resignation_approved: 离职申请已通过
- resignation_rejected: 离职申请已驳回

## 2. 说明
这些通知类型用于请假和离职申请的通知系统。
当司机提交申请时，所有管理员都会收到通知。
*/

-- 添加新的通知类型
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'leave_application_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'resignation_application_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'resignation_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'resignation_rejected';