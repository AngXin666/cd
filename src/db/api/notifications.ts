/**
 * 通知系统 API
 *
 * 功能包括：
 * - 通知模板管理
 * - 通知发送记录
 * - 定时通知
 * - 自动提醒规则
 * - 通知统计
 */

import {supabase} from '@/client/supabase'
import {logger} from '@/utils/logger'
import type {
  AutoReminderRule,
  AutoReminderRuleWithWarehouse,
  CreateNotificationInput,
  Notification,
  NotificationSendRecord,
  NotificationSendRecordWithSender,
  NotificationTemplate,
  ScheduledNotification,
  SenderRole
} from '../types'

// ==================== 通知创建和发送 ====================

/**
 * 创建通知
 * @param notification 通知信息
 * @returns 创建的通知ID，失败返回null
 */
export async function createNotification(notification: {
  user_id: string
  type: string
  title: string
  message: string
  related_id?: string
}): Promise<string | null> {
  try {
    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const senderId = user?.id || null
    let senderName = '系统'
    let _senderRole = 'BOSS'

    // 如果有当前用户，获取其信息 - 单用户架构：查询 users + user_roles
    if (user?.id) {
      const {data: senderUser} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
      const {data: roleData} = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()

      if (senderUser) {
        senderName = senderUser.name || '系统'
        _senderRole = roleData?.role || 'BOSS'
      }
    }

    const notificationPayload = {
      user_id: notification.user_id,
      sender_id: senderId,
      sender_name: senderName,
      // sender_role: senderRole, // 临时移除
      type: notification.type,
      title: notification.title,
      message: notification.message,
      related_id: notification.related_id || null,
      is_read: false
    }

    // 使用 create_notifications_batch 函数来创建通知，传递完整的发送者信息
    const {error} = await supabase.rpc('create_notifications_batch', {
      notifications: [notificationPayload]
    })

    if (error) {
      logger.error('创建通知失败', error)
      return null
    }

    // 查询刚创建的通知ID
    const {data: createdNotification, error: queryError} = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', notification.user_id)
      .eq('type', notification.type)
      .eq('title', notification.title)
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle()

    if (queryError) {
      logger.error('查询通知ID失败', queryError)
      return null
    }

    return createdNotification?.id || null
  } catch (error) {
    logger.error('创建通知异常', error)
    return null
  }
}

/**
 * 为所有管理员创建通知
 * @param notification 通知信息（不包含user_id）
 * @returns 成功创建的通知数量
 */
export async function createNotificationForAllManagers(notification: {
  type: string
  title: string
  message: string
  related_id?: string
}): Promise<number> {
  try {
    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const senderId = user?.id || null
    let senderName = '系统'
    let _senderRole = 'BOSS'

    // 如果有当前用户，获取其信息 - 单用户架构：查询 users + user_roles
    if (user?.id) {
      const {data: senderUser} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
      const {data: roleData} = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()

      if (senderUser) {
        senderName = senderUser.name || '系统'
        _senderRole = roleData?.role || 'BOSS'
      }
    }

    // 获取所有车队长、老板和调度 - 单用户架构：查询 user_roles 表

    const {data: managers, error: managersError} = await supabase
      .from('users')
      .select('id')
      .in('role', ['MANAGER', 'BOSS', 'DISPATCHER'])

    if (managersError) {
      logger.error('获取管理员列表失败', managersError)
      return 0
    }

    if (!managers || managers.length === 0) {
      return 0
    }

    // 为每个管理员创建通知
    const notifications = managers.map((manager) => ({
      user_id: manager.id,
      sender_id: senderId,
      sender_name: senderName,
      // sender_role: senderRole, // 临时移除
      type: notification.type,
      title: notification.title,
      message: notification.message,
      related_id: notification.related_id || null,
      is_read: false
    }))

    // 使用 SECURITY DEFINER 函数批量创建通知，绕过 RLS 限制
    const {data, error} = await supabase.rpc('create_notifications_batch', {
      notifications: notifications
    })

    if (error) {
      logger.error('批量创建通知失败', {error, errorMessage: error.message, errorDetails: error.details})
      return 0
    }

    const count = data || 0
    return count
  } catch (error) {
    logger.error('批量创建通知异常', error)
    return 0
  }
}

/**
 * 为所有老板创建通知
 * @param notification 通知信息（不包含user_id）
 * @returns 成功创建的通知数量
 */
export async function createNotificationForAllSuperAdmins(notification: {
  type: string
  title: string
  message: string
  related_id?: string
}): Promise<number> {
  try {
    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const senderId = user?.id || null
    let senderName = '系统'
    let _senderRole = 'BOSS'

    // 如果有当前用户，获取其信息 - 单用户架构：查询 users + user_roles
    if (user?.id) {
      const {data: senderUser} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
      const {data: roleData} = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()

      if (senderUser) {
        senderName = senderUser.name || '系统'
        _senderRole = roleData?.role || 'BOSS'
      }
    }

    // 获取所有老板 - 单用户架构：查询 users 表
    const {data: superAdmins, error: superAdminsError} = await supabase.from('users').select('id').eq('role', 'BOSS')

    if (superAdminsError) {
      logger.error('获取老板列表失败', superAdminsError)
      return 0
    }

    if (!superAdmins || superAdmins.length === 0) {
      return 0
    }

    // 为每个老板创建通知
    const notifications = superAdmins.map((admin) => ({
      user_id: admin.id,
      sender_id: senderId,
      sender_name: senderName,
      // sender_role: senderRole, // 临时移除
      type: notification.type,
      title: notification.title,
      message: notification.message,
      related_id: notification.related_id || null,
      is_read: false
    }))

    // 使用 SECURITY DEFINER 函数批量创建通知，绕过 RLS 限制
    const {data, error} = await supabase.rpc('create_notifications_batch', {
      notifications: notifications
    })

    if (error) {
      logger.error('批量创建通知失败', error)
      return 0
    }

    const count = data || 0
    return count
  } catch (error) {
    logger.error('批量创建通知异常', error)
    return 0
  }
}

/**
 * 创建通知记录（新版通知系统）
 * @param input 通知输入数据
 * @returns 创建的通知，失败返回null
 */
export async function createNotificationRecord(input: CreateNotificationInput): Promise<Notification | null> {
  try {
    // 1. 获取当前用户
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('创建通知失败: 用户未登录')
      return null
    }

    // 2. 只使用数据库表中存在的字段
    const {data, error} = await supabase
      .from('notifications')
      .insert({
        recipient_id: input.recipient_id,
        sender_id: input.sender_id || user.id,
        type: input.type || 'system',
        title: input.title,
        content: input.content
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error('创建通知失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('创建通知异常:', error)
    return null
  }
}

/**
 * 创建通知发送记录
 * @param record 发送记录数据
 * @returns 创建的发送记录，失败返回null
 */
export async function createNotificationSendRecord(
  record: Omit<NotificationSendRecord, 'id' | 'sent_at'>
): Promise<NotificationSendRecord | null> {
  try {
    const {data, error} = await supabase.from('notification_send_records').insert(record).select().maybeSingle()

    if (error) {
      console.error('创建通知发送记录失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('创建通知发送记录异常:', error)
    return null
  }
}

/**
 * 发送通知给司机
 * @param driverIds 司机ID列表
 * @param title 通知标题
 * @param content 通知内容
 * @returns 是否成功
 */
export async function sendNotificationToDrivers(driverIds: string[], title: string, content: string): Promise<boolean> {
  try {
    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const senderId = user?.id || null
    let senderName = '系统'

    if (user?.id) {
      const {data: userData} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
      senderName = userData?.name || '系统'
    }

    // 为每个司机创建通知记录
    const notifications = driverIds.map((driverId) => ({
      recipient_id: driverId, // 使用recipient_id
      sender_id: senderId,
      sender_name: senderName,
      title,
      content,
      type: 'system',
      // category: 'system', // 临时移除：数据库字段不存在
      action_url: null,
      related_id: null,
      is_read: false
    }))

    const {error} = await supabase.from('notifications').insert(notifications)

    if (error) {
      console.error('发送通知失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('发送通知异常:', error)
    return false
  }
}

/**
 * 发送实名提醒通知
 * @param recipientId 接收者ID
 * @param senderId 发送者ID
 * @param senderName 发送者名称
 * @param _senderRole 发送者角色（暂未使用）
 * @returns 是否成功
 */
export async function sendVerificationReminder(
  recipientId: string,
  senderId: string,
  senderName: string,
  _senderRole: SenderRole
): Promise<boolean> {
  try {
    const notification = await createNotificationRecord({
      recipient_id: recipientId,
      sender_id: senderId,
      sender_name: senderName,
      // sender_role: senderRole, // 临时移除
      type: 'verification_reminder',
      title: '实名提醒',
      content: `${senderName}要求您尽快完成实名和车辆录入`,
      action_url: '/pages/driver/vehicle-list/index'
    })

    return notification !== null
  } catch (error) {
    console.error('发送实名提醒通知异常:', error)
    return false
  }
}

// ==================== 通知查询 ====================

/**
 * 获取用户的通知列表
 * 单用户架构：直接查询 public.notifications 表
 * @param userId 用户ID
 * @param limit 返回数量限制，默认50
 * @returns 通知列表
 */
export async function getNotifications(userId: string, limit = 50): Promise<Notification[]> {
  try {
    // 单用户架构：直接查询 public.notifications
    const {data, error} = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', {ascending: false})
      .limit(limit)

    if (error) {
      console.error('❌ 获取通知失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('❌ 获取通知异常:', error)
    return []
  }
}

/**
 * 获取未读通知数量
 * 单用户架构：直接查询 public.notifications 表
 * @param userId 用户ID
 * @returns 未读通知数量
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const {count, error} = await supabase
      .from('notifications')
      .select('*', {count: 'exact', head: true})
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('获取未读通知数量失败:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('获取未读通知数量异常:', error)
    return 0
  }
}

/**
 * 获取通知发送记录
 * @returns 发送记录列表（包含发送者信息）
 */
export async function getNotificationSendRecords(): Promise<NotificationSendRecordWithSender[]> {
  try {
    const {data, error} = await supabase
      .from('notification_send_records')
      .select(
        `
        *,
        sender:profiles!notification_send_records_sent_by_fkey(id, name, role)
      `
      )
      .order('sent_at', {ascending: false})

    if (error) {
      console.error('获取通知发送记录失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取通知发送记录异常:', error)
    return []
  }
}

// ==================== 通知操作 ====================

/**
 * 标记通知为已读
 * @param notificationId 通知ID
 * @returns 是否成功
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const {error} = await supabase.from('notifications').update({is_read: true}).eq('id', notificationId)

    if (error) {
      console.error('标记通知为已读失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('标记通知为已读异常:', error)
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
    const {error} = await supabase
      .from('notifications')
      .update({is_read: true})
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('标记所有通知为已读失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('标记所有通知为已读异常:', error)
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
    const {error} = await supabase.from('notifications').delete().eq('id', notificationId)

    if (error) {
      console.error('删除通知失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('删除通知异常:', error)
    return false
  }
}

// ==================== 通知模板管理 ====================

/**
 * 获取所有通知模板
 * @returns 通知模板列表
 */
export async function getNotificationTemplates(): Promise<NotificationTemplate[]> {
  try {
    const {data, error} = await supabase
      .from('notification_templates')
      .select('*')
      .order('is_favorite', {ascending: false})
      .order('created_at', {ascending: false})

    if (error) {
      console.error('获取通知模板失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取通知模板异常:', error)
    return []
  }
}

/**
 * 创建通知模板
 * @param template 模板数据（不包含id和时间戳）
 * @returns 创建的模板，失败返回null
 */
export async function createNotificationTemplate(
  template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<NotificationTemplate | null> {
  try {
    const {data, error} = await supabase.from('notification_templates').insert(template).select().maybeSingle()

    if (error) {
      console.error('创建通知模板失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('创建通知模板异常:', error)
    return null
  }
}

/**
 * 更新通知模板
 * @param id 模板ID
 * @param updates 更新数据
 * @returns 是否成功
 */
export async function updateNotificationTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<boolean> {
  try {
    const {error} = await supabase.from('notification_templates').update(updates).eq('id', id)

    if (error) {
      console.error('更新通知模板失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('更新通知模板异常:', error)
    return false
  }
}

/**
 * 删除通知模板
 * @param id 模板ID
 * @returns 是否成功
 */
export async function deleteNotificationTemplate(id: string): Promise<boolean> {
  try {
    const {error} = await supabase.from('notification_templates').delete().eq('id', id)

    if (error) {
      console.error('删除通知模板失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('删除通知模板异常:', error)
    return false
  }
}

// ==================== 定时通知管理 ====================

/**
 * 获取所有定时通知
 * @returns 定时通知列表
 */
export async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  try {
    const {data, error} = await supabase
      .from('scheduled_notifications')
      .select('*')
      .order('send_time', {ascending: true})

    if (error) {
      console.error('获取定时通知失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取定时通知异常:', error)
    return []
  }
}

/**
 * 创建定时通知
 * @param notification 定时通知数据（不包含id、时间戳和状态）
 * @returns 创建的定时通知，失败返回null
 */
export async function createScheduledNotification(
  notification: Omit<ScheduledNotification, 'id' | 'created_at' | 'sent_at' | 'status'>
): Promise<ScheduledNotification | null> {
  try {
    const {data, error} = await supabase
      .from('scheduled_notifications')
      .insert({...notification, status: 'pending'})
      .select()
      .maybeSingle()

    if (error) {
      console.error('创建定时通知失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('创建定时通知异常:', error)
    return null
  }
}

/**
 * 更新定时通知状态
 * @param id 定时通知ID
 * @param status 新状态
 * @returns 是否成功
 */
export async function updateScheduledNotificationStatus(
  id: string,
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
): Promise<boolean> {
  try {
    const updates: {status: 'pending' | 'sent' | 'cancelled' | 'failed'; sent_at?: string} = {status}
    if (status === 'sent') {
      updates.sent_at = new Date().toISOString()
    }

    const {error} = await supabase.from('scheduled_notifications').update(updates).eq('id', id)

    if (error) {
      console.error('更新定时通知状态失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('更新定时通知状态异常:', error)
    return false
  }
}

// ==================== 自动提醒规则管理 ====================

/**
 * 获取所有自动提醒规则
 * @returns 自动提醒规则列表（包含仓库信息）
 */
export async function getAutoReminderRules(): Promise<AutoReminderRuleWithWarehouse[]> {
  try {
    const {data, error} = await supabase
      .from('auto_reminder_rules')
      .select(
        `
        *,
        warehouse:warehouses(id, name)
      `
      )
      .order('created_at', {ascending: false})

    if (error) {
      console.error('获取自动提醒规则失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取自动提醒规则异常:', error)
    return []
  }
}

/**
 * 创建自动提醒规则
 * @param rule 规则数据（不包含id和时间戳）
 * @returns 创建的规则，失败返回null
 */
export async function createAutoReminderRule(
  rule: Omit<AutoReminderRule, 'id' | 'created_at' | 'updated_at'>
): Promise<AutoReminderRule | null> {
  try {
    const {data, error} = await supabase.from('auto_reminder_rules').insert(rule).select().maybeSingle()

    if (error) {
      console.error('创建自动提醒规则失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('创建自动提醒规则异常:', error)
    return null
  }
}

/**
 * 更新自动提醒规则
 * @param id 规则ID
 * @param updates 更新数据
 * @returns 是否成功
 */
export async function updateAutoReminderRule(id: string, updates: Partial<AutoReminderRule>): Promise<boolean> {
  try {
    const {error} = await supabase.from('auto_reminder_rules').update(updates).eq('id', id)

    if (error) {
      console.error('更新自动提醒规则失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('更新自动提醒规则异常:', error)
    return false
  }
}

/**
 * 删除自动提醒规则
 * @param id 规则ID
 * @returns 是否成功
 */
export async function deleteAutoReminderRule(id: string): Promise<boolean> {
  try {
    const {error} = await supabase.from('auto_reminder_rules').delete().eq('id', id)

    if (error) {
      console.error('删除自动提醒规则失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('删除自动提醒规则异常:', error)
    return false
  }
}
