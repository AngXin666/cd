/**
 * 通知系统 API
 * 提供通知的查询、标记已读、删除等功能
 *
 * 迁移说明：
 * - 查询函数已迁移到 NotificationsRepository，本文件函数作为兼容层
 * - 写操作保留直接 Supabase 调用，但会清除缓存
 * - 新代码应直接使用 notificationsRepository 的方法
 *
 * @module db/notificationApi
 */

import {supabase} from '@/client/supabase'
import {checkCurrentUserPermission, PermissionAction} from '@/services/permission-service'
import {createLogger} from '@/utils/logger'
import {getCurrentUserRoleAndTenant} from './api/users'
import {notificationsRepository} from './repositories/NotificationsRepository'

const logger = createLogger('NotificationAPI')

// ==================== 类型定义 ====================

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

export type NotificationCategory =
  | 'leave_resignation'
  | 'vehicle_approval'
  | 'permission'

export type NotificationProcessStatus = 'pending' | 'processed' | 'info_only'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Notification {
  id: string
  recipient_id: string
  sender_id: string
  sender_name: string
  type: NotificationType | string
  category: NotificationCategory
  title: string
  content: string
  action_url: string | null
  related_id: string | null
  approval_status: ApprovalStatus | null
  is_read: boolean
  created_at: string
  updated_at?: string
}

// ==================== 工具函数 ====================

export function isNotificationPending(type: NotificationType | string): boolean {
  const pendingTypes: string[] = [
    'leave_application_submitted',
    'resignation_application_submitted',
    'vehicle_review_pending'
  ]
  return pendingTypes.includes(type)
}

export function isNotificationProcessed(type: NotificationType | string): boolean {
  const processedTypes: string[] = [
    'leave_approved',
    'leave_rejected',
    'resignation_approved',
    'resignation_rejected',
    'vehicle_review_approved',
    'vehicle_review_need_supplement'
  ]
  return processedTypes.includes(type)
}

export function getNotificationProcessStatus(
  type: NotificationType | string,
  approvalStatus?: ApprovalStatus | null
): NotificationProcessStatus {
  if (approvalStatus) {
    if (approvalStatus === 'pending') return 'pending'
    if (approvalStatus === 'approved' || approvalStatus === 'rejected') return 'processed'
  }
  if (isNotificationPending(type)) return 'pending'
  if (isNotificationProcessed(type)) return 'processed'
  return 'info_only'
}

export function getNotificationStatusLabel(
  type: NotificationType | string,
  approvalStatus?: ApprovalStatus | null
): string {
  if (approvalStatus) {
    switch (approvalStatus) {
      case 'pending': return '待审批'
      case 'approved': return '已批准'
      case 'rejected': return '已拒绝'
    }
  }
  switch (type) {
    case 'leave_application_submitted': return '待审批'
    case 'resignation_application_submitted': return '待审批'
    case 'vehicle_review_pending': return '待审批'
    case 'leave_approved': return '已批准'
    case 'leave_rejected': return '已拒绝'
    case 'resignation_approved': return '已批准'
    case 'resignation_rejected': return '已拒绝'
    case 'vehicle_review_approved': return '已通过'
    case 'vehicle_review_need_supplement': return '需补录'
    default: return '通知'
  }
}

export function getNotificationStatusColor(
  type: NotificationType | string,
  approvalStatus?: ApprovalStatus | null
): string {
  if (approvalStatus) {
    switch (approvalStatus) {
      case 'pending': return 'text-warning'
      case 'approved': return 'text-success'
      case 'rejected': return 'text-destructive'
    }
  }
  const status = getNotificationProcessStatus(type)
  switch (status) {
    case 'pending': return 'text-warning'
    case 'processed':
      if (type.includes('approved')) return 'text-success'
      if (type.includes('rejected')) return 'text-destructive'
      return 'text-muted-foreground'
    default: return 'text-muted-foreground'
  }
}

export function getNotificationCategory(type: NotificationType | string): NotificationCategory {
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
  if (
    type === 'vehicle_review_pending' ||
    type === 'vehicle_review_approved' ||
    type === 'vehicle_review_need_supplement'
  ) {
    return 'vehicle_approval'
  }
  return 'permission'
}

// ==================== 查询函数（使用 Repository） ====================

export async function getUserNotifications(
  userId: string,
  user: {id: string; role?: string} | null,
  limit = 50
): Promise<Notification[]> {
  try {
    logger.db('查询用户通知', 'notifications', {userId, limit})
    const permissionResult = checkCurrentUserPermission('notifications', PermissionAction.SELECT, user)
    if (!permissionResult.hasPermission) return []
    return notificationsRepository.getByUser(userId, limit) as unknown as Notification[]
  } catch (error) {
    logger.error('查询用户通知异常', error)
    return []
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    logger.db('查询未读通知数量', 'notifications', {userId})
    return notificationsRepository.getUnreadCount(userId)
  } catch (error) {
    logger.error('查询未读通知数量异常', error)
    return 0
  }
}

// ==================== 写操作函数 ====================

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    logger.db('标记通知为已读', 'notifications', {notificationId})
    return notificationsRepository.markAsRead(notificationId)
  } catch (error) {
    logger.error('标记通知为已读异常', error)
    return false
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    logger.db('标记所有通知为已读', 'notifications', {userId})
    return notificationsRepository.markAllAsRead(userId)
  } catch (error) {
    logger.error('标记所有通知为已读异常', error)
    return false
  }
}

export async function updateNotification(
  notificationId: string,
  updates: {type?: NotificationType; title?: string; message?: string; is_read?: boolean},
  user: {id: string; role?: string} | null
): Promise<boolean> {
  try {
    logger.db('更新通知', 'notifications', {notificationId, updates})
    const permissionResult = checkCurrentUserPermission('notifications', PermissionAction.UPDATE, user)
    if (!permissionResult.hasPermission) return false
    let query = supabase.from('notifications').update(updates).eq('id', notificationId)
    if (permissionResult.filter) {
      Object.entries(permissionResult.filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    const {error} = await query
    if (error) {
      logger.error('更新通知失败', error)
      return false
    }
    notificationsRepository.clearAllCache()
    return true
  } catch (error) {
    logger.error('更新通知异常', error)
    return false
  }
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    logger.db('删除通知', 'notifications', {notificationId})
    return notificationsRepository.deleteNotification(notificationId)
  } catch (error) {
    logger.error('删除通知异常', error)
    return false
  }
}

export async function deleteReadNotifications(userId: string): Promise<boolean> {
  try {
    logger.db('删除所有已读通知', 'notifications', {userId})
    const {error} = await supabase.from('notifications').delete().eq('recipient_id', userId).eq('is_read', true)
    if (error) {
      logger.error('删除所有已读通知失败', error)
      return false
    }
    notificationsRepository.clearAllCache()
    return true
  } catch (error) {
    logger.error('删除所有已读通知异常', error)
    return false
  }
}

// ==================== 订阅函数 ====================

export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: Notification) => void,
  onUpdate?: (notification: Notification) => void,
  channelSuffix?: string
) {
  const channelName = channelSuffix
    ? `notifications:${userId}:${channelSuffix}`
    : `notifications:${userId}:${Date.now()}`

  logger.info('📡 创建通知订阅', {userId, channelName})
  console.log('📡 [NotificationAPI] 创建通知订阅', {userId, channelName})

  let retryCount = 0
  const maxRetries = 3

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}`},
      (payload) => {
        logger.info('📬 收到新通知 INSERT', {type: (payload.new as Notification).type})
        console.log('📬 [NotificationAPI] 收到新通知 INSERT', payload.new)
        onInsert(payload.new as Notification)
      }
    )
    .on(
      'postgres_changes',
      {event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}`},
      (payload) => {
        logger.info('📝 收到通知 UPDATE', {type: (payload.new as Notification).type})
        console.log('📝 [NotificationAPI] 收到通知 UPDATE', payload.new)
        if (onUpdate) onUpdate(payload.new as Notification)
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logger.info('✅ 通知订阅成功', {userId, channelName})
        console.log('✅ [NotificationAPI] 通知订阅成功', {userId, channelName})
        retryCount = 0
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('❌ 通知订阅错误', {userId, error: err})
        console.error('❌ [NotificationAPI] 通知订阅错误', {userId, error: err})
      } else if (status === 'TIMED_OUT') {
        logger.warn('⏰ 通知订阅超时', {userId, retryCount})
        console.warn('⏰ [NotificationAPI] 通知订阅超时', {userId, retryCount})
        if (retryCount < maxRetries) {
          retryCount++
          console.log(`🔄 [NotificationAPI] 尝试重新订阅 (${retryCount}/${maxRetries})`)
          setTimeout(() => channel.subscribe(), 2000 * retryCount)
        } else {
          console.error('❌ [NotificationAPI] 订阅失败，已达到最大重试次数')
        }
      } else if (status === 'CLOSED') {
        logger.info('🔒 通知订阅已关闭', {userId})
        console.log('🔒 [NotificationAPI] 通知订阅已关闭', {userId})
      } else {
        logger.debug('📡 通知订阅状态', {userId, status})
        console.log('📡 [NotificationAPI] 通知订阅状态', {userId, status})
      }
    })

  return () => {
    logger.info('🔕 取消通知订阅', {userId})
    console.log('🔕 [NotificationAPI] 取消通知订阅', {userId})
    channel.unsubscribe()
  }
}

// ==================== 创建通知函数 ====================

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId?: string
): Promise<boolean> {
  try {
    if (!userId) {
      console.error('❌ createNotification: userId 参数为空')
      logger.error('创建通知失败：userId 为空', {type, title})
      return false
    }
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) {
      logger.error('创建通知失败：无法获取当前用户信息')
      return false
    }
    const {role: senderRole} = await getCurrentUserRoleAndTenant()
    const _mappedSenderRole = senderRole || 'BOSS'
    let senderName = '系统'
    const {data: userData} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
    senderName = userData?.name || '系统'
    logger.db('创建通知', 'notifications', {userId, type, title, message, relatedId})
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
    notificationsRepository.clearAllCache()
    return true
  } catch (error) {
    logger.error('创建通知异常', error)
    return false
  }
}

export async function createNotifications(
  notifications: Array<{
    userId: string
    type: NotificationType
    title: string
    message: string
    relatedId?: string
    batchId?: string
    approvalStatus?: 'pending' | 'approved' | 'rejected' | null
  }>
): Promise<boolean> {
  try {
    logger.db('📬 批量创建通知', 'notifications', {count: notifications.length})
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) {
      logger.error('❌ 批量创建通知失败：无法获取当前用户信息')
      return false
    }
    const {role: senderRole} = await getCurrentUserRoleAndTenant()
    const _mappedSenderRole = senderRole || 'BOSS'
    let senderName = '系统'
    const {data: userData} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
    senderName = userData?.name || '系统'
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
    const {error} = await supabase.from('notifications').insert(notificationData)
    if (error) {
      logger.error('❌ 批量创建通知失败', error)
      return false
    }
    notificationsRepository.clearAllCache()
    return true
  } catch (error) {
    logger.error('💥 批量创建通知异常', error)
    return false
  }
}

// ==================== 审批通知函数 ====================

export async function createOrUpdateApprovalNotification(
  recipientId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId: string,
  approvalStatus: ApprovalStatus = 'pending'
): Promise<boolean> {
  try {
    const approvalTypes: NotificationType[] = [
      'leave_application_submitted',
      'resignation_application_submitted',
      'vehicle_review_pending'
    ]
    if (!approvalTypes.includes(type)) return false
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
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) {
      logger.error('创建或更新审批通知失败：无法获取当前用户信息')
      return false
    }
    const {role: senderRole} = await getCurrentUserRoleAndTenant()
    const _mappedSenderRole = senderRole || 'BOSS'
    let senderName = '系统'
    const {data: userData} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
    senderName = userData?.name || '系统'
    const {data: existingNotifications, error: queryError} = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('related_id', relatedId)
      .order('created_at', {ascending: false})
      .limit(1)
    if (queryError) logger.error('查询现有通知失败', queryError)
    if (existingNotifications && existingNotifications.length > 0) {
      const existingNotification = existingNotifications[0]
      const {error: updateError} = await supabase
        .from('notifications')
        .update({type, title, content: message, approval_status: approvalStatus, is_read: false})
        .eq('id', existingNotification.id)
      if (updateError) {
        logger.error('更新通知失败', updateError)
        return false
      }
      notificationsRepository.clearAllCache()
      return true
    }
    logger.db('创建新的审批通知', 'notifications', {recipientId, type, title, message, relatedId, approvalStatus})
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
    notificationsRepository.clearAllCache()
    return true
  } catch (error) {
    logger.error('创建或更新审批通知异常', error)
    return false
  }
}

export async function updateApprovalNotificationStatus(
  relatedId: string,
  approvalStatus: 'approved' | 'rejected',
  newTitle?: string,
  newMessage?: string
): Promise<boolean> {
  try {
    if (!relatedId) {
      console.error('❌ updateApprovalNotificationStatus: relatedId 参数为空')
      logger.error('更新审批通知状态失败：relatedId 为空')
      return false
    }
    const {data: notifications, error: queryError} = await supabase
      .from('notifications')
      .select('*')
      .eq('related_id', relatedId)
    if (queryError) {
      logger.error('查询相关通知失败', queryError)
      return false
    }
    if (!notifications || notifications.length === 0) return false
    const updateData: {approval_status: 'pending' | 'approved' | 'rejected'; is_read: boolean; title?: string; content?: string} = {
      approval_status: approvalStatus,
      is_read: false
    }
    if (newTitle) updateData.title = newTitle
    if (newMessage) updateData.content = newMessage
    const {error: updateError} = await supabase.from('notifications').update(updateData).eq('related_id', relatedId)
    if (updateError) {
      logger.error('更新审批通知状态失败', updateError)
      return false
    }
    notificationsRepository.clearAllCache()
    return true
  } catch (error) {
    logger.error('更新审批通知状态异常', error)
    return false
  }
}

export async function updateNotificationsByBatchId(
  batchId: string,
  approvalStatus: 'pending' | 'approved' | 'rejected',
  content?: string
): Promise<boolean> {
  try {
    if (!batchId) {
      logger.error('❌ batch_id 参数为空')
      return false
    }
    const updateData: {approval_status: 'pending' | 'approved' | 'rejected'; content?: string} = {approval_status: approvalStatus}
    if (content) updateData.content = content
    const {error} = await supabase.from('notifications').update(updateData).eq('batch_id', batchId).select('id')
    if (error) {
      logger.error('❌ 批量更新通知失败', error)
      return false
    }
    notificationsRepository.clearAllCache()
    return true
  } catch (error) {
    logger.error('💥 批量更新通知异常', error)
    return false
  }
}
