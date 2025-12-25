/**
 * 通知系统 API
 * 提供通知的查询、标记已读、删除等功能
 *
 * 迁移说明：
 * - 查询函数已迁移到 NotificationsRepository，本文件函数作为兼容层
 * - 写操作保留直接 Supabase 调用，但会清除缓存
 * - 新代码应直接使用 notificationsRepository 的方法
 *
 * 审批类型通知说明：
 * - 审批类型的通知包括：请假申请、离职申请、车辆审核等需要管理员审批的通知
 * - 审批类型的通知使用 approval_status 字段标记状态（pending/approved/rejected）
 * - 审批完成后，直接更新原通知的状态，而不是创建新通知
 * - 非审批类型的通知不使用 approval_status 字段
 *
 * 审批类型通知列表：
 * - leave_application_submitted: 请假申请提交
 * - resignation_application_submitted: 离职申请提交
 * - vehicle_review_pending: 车辆待审核
 *
 * @module db/notificationApi
 */

import {createNotification as createNotificationFromApi} from './api/notifications'

// ==================== 类型定义 ====================

/** 通知类型 - 与数据库 notification_type 枚举保持一致 */
export type NotificationType =
  | 'permission_change'
  | 'driver_info_update'
  | 'driver_created'
  | 'leave_application_submitted'
  | 'leave_submitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'resignation_application_submitted'
  | 'resignation_submitted'
  | 'resignation_approved'
  | 'resignation_rejected'
  | 'warehouse_assigned'
  | 'warehouse_unassigned'
  | 'system_notice'
  | 'driver_type_changed'
  | 'vehicle_review_pending'
  | 'vehicle_review_approved'
  | 'vehicle_review_need_supplement'
  | 'verification_reminder'

// ==================== 兼容函数 ====================

/**
 * 创建通知（兼容旧的 4 参数调用方式）
 * @param userId - 接收通知的用户 ID
 * @param type - 通知类型
 * @param title - 通知标题
 * @param message - 通知内容
 * @returns 创建的通知 ID，失败返回 null
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string
): Promise<string | null> {
  return createNotificationFromApi({
    user_id: userId,
    type,
    title,
    message
  })
}
