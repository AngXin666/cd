/**
 * 通知系统 API
 * 提供通知的查询、标记已读、删除等功能
 */

import {supabase} from '@/client/supabase'
import {createLogger} from '@/utils/logger'

const logger = createLogger('NotificationAPI')

// 通知类型 - 与数据库 notification_type 枚举保持一致
export type NotificationType =
  | 'permission_change' // 权限变更
  | 'driver_info_update' // 司机信息更新
  | 'driver_created' // 司机创建
  | 'leave_application_submitted' // 请假申请提交（管理员收到）
  | 'leave_approved' // 请假批准（司机收到）
  | 'leave_rejected' // 请假拒绝（司机收到）
  | 'resignation_application_submitted' // 离职申请提交（管理员收到）
  | 'resignation_approved' // 离职批准（司机收到）
  | 'resignation_rejected' // 离职拒绝（司机收到）
  | 'warehouse_assigned' // 仓库分配
  | 'warehouse_unassigned' // 仓库取消分配
  | 'system_notice' // 系统通知
  | 'driver_type_changed' // 司机类型变更
  | 'vehicle_review_pending' // 车辆待审核
  | 'vehicle_review_approved' // 车辆审核通过
  | 'vehicle_review_need_supplement' // 车辆需要补录

// 通知分类 - 与数据库 notification_category 枚举保持一致
export type NotificationCategory =
  | 'leave_resignation' // 请假离职信息
  | 'vehicle_approval' // 车辆审批信息
  | 'permission' // 权限信息

// 通知处理状态
export type NotificationProcessStatus = 'pending' | 'processed' | 'info_only'

// 通知接口
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  related_id: string | null
  is_read: boolean
  created_at: string
}

/**
 * 判断通知是否为待处理状态
 * 待处理状态：需要管理员进行操作的申请类通知
 */
export function isNotificationPending(type: NotificationType): boolean {
  const pendingTypes: NotificationType[] = [
    'leave_application_submitted', // 请假申请提交
    'resignation_application_submitted', // 离职申请提交
    'vehicle_review_pending' // 车辆待审核
  ]
  return pendingTypes.includes(type)
}

/**
 * 判断通知是否为已处理状态
 * 已处理状态：申请已被审批或拒绝的通知
 */
export function isNotificationProcessed(type: NotificationType): boolean {
  const processedTypes: NotificationType[] = [
    'leave_approved', // 请假批准
    'leave_rejected', // 请假拒绝
    'resignation_approved', // 离职批准
    'resignation_rejected', // 离职拒绝
    'vehicle_review_approved', // 车辆审核通过
    'vehicle_review_need_supplement' // 车辆需要补录
  ]
  return processedTypes.includes(type)
}

/**
 * 获取通知的处理状态
 */
export function getNotificationProcessStatus(type: NotificationType): NotificationProcessStatus {
  if (isNotificationPending(type)) {
    return 'pending'
  }
  if (isNotificationProcessed(type)) {
    return 'processed'
  }
  return 'info_only'
}

/**
 * 获取通知状态标签
 */
export function getNotificationStatusLabel(type: NotificationType): string {
  switch (type) {
    case 'leave_application_submitted':
      return '待审批'
    case 'resignation_application_submitted':
      return '待审批'
    case 'vehicle_review_pending':
      return '待审核'
    case 'leave_approved':
      return '已批准'
    case 'leave_rejected':
      return '已拒绝'
    case 'resignation_approved':
      return '已批准'
    case 'resignation_rejected':
      return '已拒绝'
    case 'vehicle_review_approved':
      return '已通过'
    case 'vehicle_review_need_supplement':
      return '需补录'
    default:
      return '通知'
  }
}

/**
 * 获取通知状态颜色
 */
export function getNotificationStatusColor(type: NotificationType): string {
  const status = getNotificationProcessStatus(type)
  switch (status) {
    case 'pending':
      return 'text-warning' // 待处理：警告色（橙色）
    case 'processed':
      if (type.includes('approved')) {
        return 'text-success' // 已批准：成功色（绿色）
      }
      if (type.includes('rejected')) {
        return 'text-destructive' // 已拒绝：错误色（红色）
      }
      return 'text-muted-foreground' // 其他已处理：灰色
    default:
      return 'text-muted-foreground' // 仅通知：灰色
  }
}

/**
 * 获取当前用户的所有通知
 * @param userId 用户ID
 * @param limit 限制数量，默认50
 * @returns 通知列表
 */
export async function getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
  try {
    logger.db('查询用户通知', 'notifications', {userId, limit})

    const {data, error} = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', {ascending: false})
      .limit(limit)

    if (error) {
      logger.error('查询用户通知失败', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error('查询用户通知异常', error)
    return []
  }
}

/**
 * 获取当前用户的未读通知数量
 * @param userId 用户ID
 * @returns 未读通知数量
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    logger.db('查询未读通知数量', 'notifications', {userId})

    const {count, error} = await supabase
      .from('notifications')
      .select('*', {count: 'exact', head: true})
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      logger.error('查询未读通知数量失败', error)
      return 0
    }

    return count || 0
  } catch (error) {
    logger.error('查询未读通知数量异常', error)
    return 0
  }
}

/**
 * 标记通知为已读
 * @param notificationId 通知ID
 * @returns 是否成功
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    logger.db('标记通知为已读', 'notifications', {notificationId})

    const {error} = await supabase.from('notifications').update({is_read: true}).eq('id', notificationId)

    if (error) {
      logger.error('标记通知为已读失败', error)
      return false
    }

    return true
  } catch (error) {
    logger.error('标记通知为已读异常', error)
    return false
  }
}

/**
 * 标记所有通知为已读
 * @param userId 用户ID
 * @returns 是否成功
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    logger.db('标记所有通知为已读', 'notifications', {userId})

    const {error} = await supabase
      .from('notifications')
      .update({is_read: true})
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      logger.error('标记所有通知为已读失败', error)
      return false
    }

    return true
  } catch (error) {
    logger.error('标记所有通知为已读异常', error)
    return false
  }
}

/**
 * 删除通知
 * @param notificationId 通知ID
 * @returns 是否成功
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    logger.db('删除通知', 'notifications', {notificationId})

    const {error} = await supabase.from('notifications').delete().eq('id', notificationId)

    if (error) {
      logger.error('删除通知失败', error)
      return false
    }

    return true
  } catch (error) {
    logger.error('删除通知异常', error)
    return false
  }
}

/**
 * 删除所有已读通知
 * @param userId 用户ID
 * @returns 是否成功
 */
export async function deleteReadNotifications(userId: string): Promise<boolean> {
  try {
    logger.db('删除所有已读通知', 'notifications', {userId})

    const {error} = await supabase.from('notifications').delete().eq('user_id', userId).eq('is_read', true)

    if (error) {
      logger.error('删除所有已读通知失败', error)
      return false
    }

    return true
  } catch (error) {
    logger.error('删除所有已读通知异常', error)
    return false
  }
}

/**
 * 订阅通知更新（实时）
 * @param userId 用户ID
 * @param callback 回调函数
 * @returns 取消订阅函数
 */
export function subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
  logger.info('订阅通知更新', {userId})

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        logger.info('收到新通知', payload)
        callback(payload.new as Notification)
      }
    )
    .subscribe()

  // 返回取消订阅函数
  return () => {
    logger.info('取消订阅通知更新', {userId})
    channel.unsubscribe()
  }
}

/**
 * 根据通知类型自动确定分类
 * @param type 通知类型
 * @returns 通知分类
 */
export function getNotificationCategory(type: NotificationType): NotificationCategory {
  // 请假离职信息
  if (
    type === 'leave_application_submitted' ||
    type === 'leave_approved' ||
    type === 'leave_rejected' ||
    type === 'resignation_application_submitted' ||
    type === 'resignation_approved' ||
    type === 'resignation_rejected'
  ) {
    return 'leave_resignation'
  }

  // 车辆审批信息
  if (
    type === 'vehicle_review_pending' ||
    type === 'vehicle_review_approved' ||
    type === 'vehicle_review_need_supplement'
  ) {
    return 'vehicle_approval'
  }

  // 权限信息（默认分类）
  return 'permission'
}

/**
 * 创建通知
 * @param userId 接收通知的用户ID
 * @param type 通知类型
 * @param title 通知标题
 * @param message 通知内容
 * @param relatedId 关联的记录ID（可选）
 * @returns 是否成功
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId?: string
): Promise<boolean> {
  try {
    // 参数验证
    console.log('🔔 createNotification 调用参数:', {
      userId,
      type,
      title,
      message,
      relatedId
    })

    if (!userId) {
      console.error('❌ createNotification: userId 参数为空')
      logger.error('创建通知失败：userId 为空', {type, title})
      return false
    }

    // 自动确定分类
    const category = getNotificationCategory(type)

    logger.db('创建通知', 'notifications', {userId, type, category, title, message, relatedId})

    const {error} = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      category,
      title,
      message,
      related_id: relatedId || null,
      is_read: false
    })

    if (error) {
      logger.error('创建通知失败', error)
      return false
    }

    logger.info('通知创建成功', {userId, type, category, title})
    return true
  } catch (error) {
    logger.error('创建通知异常', error)
    return false
  }
}

/**
 * 批量创建通知
 * @param notifications 通知列表
 * @returns 是否成功
 */
export async function createNotifications(
  notifications: Array<{
    userId: string
    type: NotificationType
    title: string
    message: string
    relatedId?: string
  }>
): Promise<boolean> {
  try {
    logger.db('批量创建通知', 'notifications', {count: notifications.length})

    const notificationData = notifications.map((n) => ({
      user_id: n.userId,
      type: n.type,
      category: getNotificationCategory(n.type), // 自动确定分类
      title: n.title,
      message: n.message,
      related_id: n.relatedId || null,
      is_read: false
    }))

    const {error} = await supabase.from('notifications').insert(notificationData)

    if (error) {
      logger.error('批量创建通知失败', error)
      return false
    }

    logger.info('批量通知创建成功', {count: notifications.length})
    return true
  } catch (error) {
    logger.error('批量创建通知异常', error)
    return false
  }
}
