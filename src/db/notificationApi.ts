/**
 * 通知系统 API
 * 提供通知的查询、标记已读、删除等功能
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
 */

import {supabase} from '@/client/supabase'
import {createLogger} from '@/utils/logger'
import {getCurrentUserRoleAndTenant} from './api'

const logger = createLogger('NotificationAPI')

// 通知类型 - 与数据库 notification_type 枚举保持一致
export type NotificationType =
  | 'permission_change' // 权限变更
  | 'driver_info_update' // 司机信息更新
  | 'driver_created' // 司机创建
  | 'leave_application_submitted' // 请假申请提交（管理员收到）
  | 'leave_submitted' // 请假申请已提交（司机提交后通知）
  | 'leave_approved' // 请假批准（司机收到）
  | 'leave_rejected' // 请假拒绝（司机收到）
  | 'resignation_application_submitted' // 离职申请提交（管理员收到）
  | 'resignation_submitted' // 离职申请已提交（司机提交后通知）
  | 'resignation_approved' // 离职批准（司机收到）
  | 'resignation_rejected' // 离职拒绝（司机收到）
  | 'warehouse_assigned' // 仓库分配
  | 'warehouse_unassigned' // 仓库取消分配
  | 'system_notice' // 系统通知
  | 'driver_type_changed' // 司机类型变更
  | 'vehicle_review_pending' // 车辆待审核
  | 'vehicle_review_approved' // 车辆审核通过
  | 'vehicle_review_need_supplement' // 车辆需要补录
  | 'verification_reminder' // 验证提醒

// 通知分类 - 与数据库 notification_category 枚举保持一致
export type NotificationCategory =
  | 'leave_resignation' // 请假离职信息
  | 'vehicle_approval' // 车辆审批信息
  | 'permission' // 权限信息

// 通知处理状态
export type NotificationProcessStatus = 'pending' | 'processed' | 'info_only'

// 审批状态
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

// 通知接口
export interface Notification {
  id: string
  recipient_id: string // 改为recipient_id以匹配新表结构
  sender_id: string // 新增
  sender_name: string // 新增
  // sender_role: string // 临时移除：数据库字段不存在
  type: NotificationType | string // 支持字符串类型
  category: NotificationCategory
  title: string
  content: string // 改为content以匹配新表结构
  action_url: string | null // 新增
  related_id: string | null
  approval_status: ApprovalStatus | null // 新增：审批状态
  is_read: boolean
  created_at: string
  updated_at?: string // 新增
}

/**
 * 判断通知是否为待处理状态
 * 待处理状态：需要管理员进行操作的申请类通知
 */
export function isNotificationPending(type: NotificationType | string): boolean {
  const pendingTypes: string[] = [
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
export function isNotificationProcessed(type: NotificationType | string): boolean {
  const processedTypes: string[] = [
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
 * 优先使用 approval_status 字段，如果不存在则根据 type 判断
 */
export function getNotificationProcessStatus(
  type: NotificationType | string,
  approvalStatus?: ApprovalStatus | null
): NotificationProcessStatus {
  // 优先使用 approval_status 字段
  if (approvalStatus) {
    if (approvalStatus === 'pending') {
      return 'pending'
    }
    if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
      return 'processed'
    }
  }

  // 如果没有 approval_status，则根据 type 判断
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
 * 优先使用 approval_status 字段，如果不存在则根据 type 判断
 */
export function getNotificationStatusLabel(
  type: NotificationType | string,
  approvalStatus?: ApprovalStatus | null
): string {
  // 优先使用 approval_status 字段
  if (approvalStatus) {
    switch (approvalStatus) {
      case 'pending':
        return '待审批'
      case 'approved':
        return '已批准'
      case 'rejected':
        return '已拒绝'
    }
  }

  // 如果没有 approval_status，则根据 type 判断
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
 * 优先使用 approval_status 字段，如果不存在则根据 type 判断
 */
export function getNotificationStatusColor(
  type: NotificationType | string,
  approvalStatus?: ApprovalStatus | null
): string {
  // 优先使用 approval_status 字段
  if (approvalStatus) {
    switch (approvalStatus) {
      case 'pending':
        return 'text-warning' // 待审批：警告色（橙色）
      case 'approved':
        return 'text-success' // 已批准：成功色（绿色）
      case 'rejected':
        return 'text-destructive' // 已拒绝：错误色（红色）
    }
  }

  // 如果没有 approval_status，则根据 type 判断
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
      .eq('recipient_id', userId)
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
      .eq('recipient_id', userId)
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
      .eq('recipient_id', userId)
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
 * 更新通知
 * @param notificationId 通知ID
 * @param updates 更新的字段
 * @returns 是否成功
 */
export async function updateNotification(
  notificationId: string,
  updates: {
    type?: NotificationType
    title?: string
    message?: string
    is_read?: boolean
  }
): Promise<boolean> {
  try {
    logger.db('更新通知', 'notifications', {notificationId, updates})

    const {error} = await supabase.from('notifications').update(updates).eq('id', notificationId)

    if (error) {
      logger.error('更新通知失败', error)
      return false
    }

    return true
  } catch (error) {
    logger.error('更新通知异常', error)
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

    const {error} = await supabase.from('notifications').delete().eq('recipient_id', userId).eq('is_read', true)

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
export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: Notification) => void,
  onUpdate?: (notification: Notification) => void
) {
  logger.info('订阅通知更新', {userId})

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      },
      (payload) => {
        logger.info('收到新通知', payload)
        onInsert(payload.new as Notification)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      },
      (payload) => {
        logger.info('通知已更新', payload)
        if (onUpdate) {
          onUpdate(payload.new as Notification)
        }
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
export function getNotificationCategory(type: NotificationType | string): NotificationCategory {
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

    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()
    if (!user) {
      logger.error('创建通知失败：无法获取当前用户信息')
      return false
    }

    // 获取发送者的角色信息
    const {role: senderRole} = await getCurrentUserRoleAndTenant()

    const mappedSenderRole = senderRole || 'BOSS'

    // 获取发送者的姓名
    let senderName = '系统'

    // 单用户架构：从 users 表中获取姓名
    const {data: userData} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
    senderName = userData?.name || '系统'

    // 自动确定分类
    // const category = getNotificationCategory(type) // 临时移除

    logger.db('创建通知', 'notifications', {userId, type, title, message, relatedId})

    // 直接INSERT（RLS已放开）
    const {error} = await supabase.from('notifications').insert({
      recipient_id: userId,
      sender_id: user.id,
      sender_name: senderName,
      type,
      title,
      content: message,
      action_url: null,
      related_id: relatedId || null,
      is_read: false
    })

    if (error) {
      logger.error('创建通知失败', error)
      return false
    }

    logger.info('通知创建成功', {userId, type, title})
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
    batchId?: string // 批次ID，同一批次的通知共享此ID
    approvalStatus?: 'pending' | 'approved' | 'rejected' | null // 审批状态
  }>
): Promise<boolean> {
  try {
    logger.db('📬 批量创建通知', 'notifications', {count: notifications.length})

    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()
    if (!user) {
      logger.error('❌ 批量创建通知失败：无法获取当前用户信息')
      return false
    }

    logger.info('📝 当前用户信息', {userId: user.id})

    // 获取发送者的角色信息
    const {role: senderRole} = await getCurrentUserRoleAndTenant()

    const mappedSenderRole = senderRole || 'BOSS'

    // 获取发送者的姓名
    let senderName = '系统'

    // 单用户架构：从 users 表中获取姓名
    const {data: userData} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
    senderName = userData?.name || '系统'

    logger.info('👤 发送者信息', {senderName, senderRole: mappedSenderRole})

    const notificationData = notifications.map((n) => ({
      recipient_id: n.userId,
      sender_id: user.id,
      sender_name: senderName,
      type: n.type,
      title: n.title,
      content: n.message,
      action_url: null,
      related_id: n.relatedId || null,
      batch_id: n.batchId || null,
      approval_status: n.approvalStatus || null,
      is_read: false
    }))

    logger.info('📤 准备插入通知数据', {count: notificationData.length})

    // 直接INSERT（RLS已放开）
    const {error} = await supabase.from('notifications').insert(notificationData)

    if (error) {
      logger.error('❌ 批量创建通知失败', error)
      return false
    }

    logger.info('✅ 批量通知创建成功', {count: notifications.length})
    return true
  } catch (error) {
    logger.error('💥 批量创建通知异常', error)
    return false
  }
}

/**
 * 创建或更新审批类通知
 * 如果已存在相同 related_id 的待审批通知，则更新状态；否则创建新通知
 * @param recipientId 接收通知的用户ID
 * @param type 通知类型
 * @param title 通知标题
 * @param message 通知内容
 * @param relatedId 关联的记录ID（必填）
 * @param approvalStatus 审批状态（'pending', 'approved', 'rejected'）
 * @returns 是否成功
 */
export async function createOrUpdateApprovalNotification(
  recipientId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId: string,
  approvalStatus: ApprovalStatus = 'pending'
): Promise<boolean> {
  try {
    // 定义审批类型的通知
    const approvalTypes: NotificationType[] = [
      'leave_application_submitted',
      'resignation_application_submitted',
      'vehicle_review_pending'
    ]

    // 检查是否为审批类型
    if (!approvalTypes.includes(type)) {
      console.warn(`⚠️ 通知类型 ${type} 不是审批类型，不应使用 createOrUpdateApprovalNotification`)
      logger.warn('尝试为非审批类型创建审批通知', {type, title})
      // 对于非审批类型，使用普通的通知创建方式
      return false
    }

    // 参数验证
    console.log('🔔 createOrUpdateApprovalNotification 调用参数:', {
      recipientId,
      type,
      title,
      message,
      relatedId,
      approvalStatus
    })

    if (!recipientId) {
      console.error('❌ createOrUpdateApprovalNotification: recipientId 参数为空')
      logger.error('创建或更新审批通知失败：recipientId 为空', {type, title})
      return false
    }

    if (!relatedId) {
      console.error('❌ createOrUpdateApprovalNotification: relatedId 参数为空')
      logger.error('创建或更新审批通知失败：relatedId 为空', {type, title})
      return false
    }

    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()
    if (!user) {
      logger.error('创建或更新审批通知失败：无法获取当前用户信息')
      return false
    }

    // 获取发送者的角色信息
    const {role: senderRole} = await getCurrentUserRoleAndTenant()

    const mappedSenderRole = senderRole || 'BOSS'

    // 获取发送者的姓名
    let senderName = '系统'
    const {data: userData} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
    senderName = userData?.name || '系统'

    // 自动确定分类
    // const category = getNotificationCategory(type) // 临时移除

    // 1. 查找是否已存在相同 related_id 的通知
    const {data: existingNotifications, error: queryError} = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('related_id', relatedId)
      .order('created_at', {ascending: false})
      .limit(1)

    if (queryError) {
      logger.error('查询现有通知失败', queryError)
      // 如果查询失败，继续创建新通知
    }

    // 2. 如果存在通知，则更新状态
    if (existingNotifications && existingNotifications.length > 0) {
      const existingNotification = existingNotifications[0]
      logger.info('找到现有通知，更新状态', {
        notificationId: existingNotification.id,
        oldStatus: existingNotification.approval_status,
        newStatus: approvalStatus
      })

      const {error: updateError} = await supabase
        .from('notifications')
        .update({
          type,
          title,
          content: message,
          approval_status: approvalStatus,
          is_read: false, // 重置为未读，提醒用户查看审批结果
          updated_at: new Date().toISOString()
        })
        .eq('id', existingNotification.id)

      if (updateError) {
        logger.error('更新通知失败', updateError)
        return false
      }

      logger.info('通知更新成功', {notificationId: existingNotification.id, approvalStatus})
      return true
    }

    // 3. 如果不存在通知，则创建新通知
    logger.db('创建新的审批通知', 'notifications', {
      recipientId,
      type,
      title,
      message,
      relatedId,
      approvalStatus
    })

    // 直接INSERT（RLS已放开）
    const {error: insertError} = await supabase.from('notifications').insert({
      recipient_id: recipientId,
      sender_id: user.id,
      sender_name: senderName,
      type,
      title,
      content: message,
      action_url: null,
      related_id: relatedId,
      approval_status: approvalStatus,
      is_read: false
    })

    if (insertError) {
      logger.error('创建审批通知失败', insertError)
      return false
    }

    logger.info('审批通知创建成功', {recipientId, type, title, approvalStatus})
    return true
  } catch (error) {
    logger.error('创建或更新审批通知异常', error)
    return false
  }
}

/**
 * 更新审批通知状态
 * 根据 related_id 查找通知并更新审批状态
 * 
 * ❗️ 审批类通知特别要求：
 * 1. 必须具有原始信息唯一标识 (related_id)
 * 2. 审批后直接在这条信息进行状态更新
 * 3. 不会创建新的通知，只更新现有通知的 approval_status 字段
 * 
 * 注意：此函数只应用于审批类型的通知（请假、离职、车辆审核等）
 * 
 * @param relatedId 关联的记录ID（审批申请的ID）
 * @param approvalStatus 审批状态（'approved', 'rejected'）
 * @param newTitle 新的标题（可选）
 * @param newMessage 新的消息内容（可选）
 * @returns 是否成功
 * 
 * @example
 * // 审批通过请假申请后更新通知
 * await updateApprovalNotificationStatus(
 *   leaveApplicationId,
 *   'approved',
 *   '请假申请已批准',
 *   '您的请假申请已经老板批准'
 * )
 */
export async function updateApprovalNotificationStatus(
  relatedId: string,
  approvalStatus: 'approved' | 'rejected',
  newTitle?: string,
  newMessage?: string
): Promise<boolean> {
  try {
    console.log('🔄 updateApprovalNotificationStatus 调用参数:', {
      relatedId,
      approvalStatus,
      newTitle,
      newMessage
    })

    if (!relatedId) {
      console.error('❌ updateApprovalNotificationStatus: relatedId 参数为空')
      logger.error('更新审批通知状态失败：relatedId 为空')
      return false
    }

    // 查找所有相关的通知
    const {data: notifications, error: queryError} = await supabase
      .from('notifications')
      .select('*')
      .eq('related_id', relatedId)

    if (queryError) {
      logger.error('查询相关通知失败', queryError)
      return false
    }

    if (!notifications || notifications.length === 0) {
      logger.warn('未找到相关通知', {relatedId})
      return false
    }

    // 检查通知类型是否为审批类型
    const approvalTypes = ['leave_application_submitted', 'resignation_application_submitted', 'vehicle_review_pending']
    const hasNonApprovalType = notifications.some((n) => !approvalTypes.includes(n.type))
    if (hasNonApprovalType) {
      logger.warn('发现非审批类型的通知，跳过更新', {relatedId})
      console.warn('⚠️ 发现非审批类型的通知，不应使用 updateApprovalNotificationStatus')
    }

    // 更新所有相关通知的状态
    const updateData: any = {
      approval_status: approvalStatus,
      is_read: false, // 重置为未读，提醒用户查看审批结果
      updated_at: new Date().toISOString()
    }

    if (newTitle) {
      updateData.title = newTitle
    }

    if (newMessage) {
      updateData.content = newMessage
    }

    const {error: updateError} = await supabase.from('notifications').update(updateData).eq('related_id', relatedId)

    if (updateError) {
      logger.error('更新审批通知状态失败', updateError)
      return false
    }

    logger.info('审批通知状态更新成功', {
      relatedId,
      approvalStatus,
      count: notifications.length
    })
    return true
  } catch (error) {
    logger.error('更新审批通知状态异常', error)
    return false
  }
}

/**
 * 根据 batch_id 批量更新通知状态
 * @param batchId 批次ID
 * @param approvalStatus 审批状态
 * @param content 可选的新内容
 * @returns 是否成功
 */
export async function updateNotificationsByBatchId(
  batchId: string,
  approvalStatus: 'pending' | 'approved' | 'rejected',
  content?: string
): Promise<boolean> {
  try {
    logger.info('📝 根据 batch_id 批量更新通知状态', {batchId, approvalStatus, content})

    if (!batchId) {
      logger.error('❌ batch_id 参数为空')
      return false
    }

    // 构建更新数据
    const updateData: any = {
      approval_status: approvalStatus,
      updated_at: new Date().toISOString()
    }

    if (content) {
      updateData.content = content
    }

    // 更新通知
    const {data, error} = await supabase.from('notifications').update(updateData).eq('batch_id', batchId).select('id')

    if (error) {
      logger.error('❌ 批量更新通知失败', error)
      return false
    }

    logger.info('✅ 批量更新通知成功', {
      batchId,
      approvalStatus,
      count: data?.length || 0
    })

    return true
  } catch (error) {
    logger.error('💥 批量更新通知异常', error)
    return false
  }
}

/**
 * 根据 related_id 和 type 批量更新通知状态（兼容旧代码）
 * @param relatedId 关联的记录ID
 * @param type 通知类型
 * @param approvalStatus 审批状态
 * @param content 可选的新内容
 * @returns 是否成功
 */
export async function updateNotificationsByRelatedId(
  relatedId: string,
  type: NotificationType,
  approvalStatus: 'pending' | 'approved' | 'rejected',
  content?: string
): Promise<boolean> {
  try {
    logger.info('📝 根据 related_id 和 type 批量更新通知状态', {relatedId, type, approvalStatus, content})

    if (!relatedId) {
      logger.error('❌ related_id 参数为空')
      return false
    }

    // 构建更新数据
    const updateData: any = {
      approval_status: approvalStatus,
      updated_at: new Date().toISOString()
    }

    if (content) {
      updateData.content = content
    }

    // 更新通知
    const {data, error} = await supabase
      .from('notifications')
      .update(updateData)
      .eq('related_id', relatedId)
      .eq('type', type)
      .select('id')

    if (error) {
      logger.error('❌ 批量更新通知失败', error)
      return false
    }

    logger.info('✅ 批量更新通知成功', {
      relatedId,
      type,
      approvalStatus,
      count: data?.length || 0
    })

    return true
  } catch (error) {
    logger.error('💥 批量更新通知异常', error)
    return false
  }
}
