/**
 * 通知服务模块
 * 负责处理系统中各类业务操作的通知发送
 */

import {createNotifications} from '@/db/notificationApi'
import {supabase} from '@/db/supabase'
import type {NotificationType} from '@/db/types'
import {logger} from '@/utils/logger'

/**
 * 通知接收对象
 */
interface NotificationRecipient {
  userId: string
  name: string
  role: string
}

/**
 * 通知上下文信息
 */
interface NotificationContext {
  operatorId: string // 操作人ID
  operatorName: string // 操作人姓名
  operatorRole: string // 操作人角色
  targetId?: string // 被操作对象ID
  targetName?: string // 被操作对象姓名
  details?: string // 操作详情
  timestamp?: Date // 操作时间
}

/**
 * 获取当前租户的老板
 */
async function getBoss(bossId: string): Promise<NotificationRecipient | null> {
  try {
    const {data, error} = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('role', 'super_admin')
      .eq('boss_id', bossId)
      .maybeSingle()

    if (error) {
      logger.error('获取老板信息失败', error)
      return null
    }

    if (!data) {
      return null
    }

    return {
      userId: data.id,
      name: data.name || '老板',
      role: data.role
    }
  } catch (error) {
    logger.error('获取老板信息异常', error)
    return null
  }
}

/**
 * 获取所有平级账号
 */
async function getPeerAdmins(bossId: string): Promise<NotificationRecipient[]> {
  try {
    const {data, error} = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('role', 'peer_admin')
      .eq('boss_id', bossId)

    if (error) {
      logger.error('获取平级账号失败', error)
      return []
    }

    return (data || []).map((p) => ({
      userId: p.id,
      name: p.name || '平级账号',
      role: p.role
    }))
  } catch (error) {
    logger.error('获取平级账号异常', error)
    return []
  }
}

/**
 * 获取司机的车队长
 */
async function getDriverManagers(driverId: string, bossId: string): Promise<NotificationRecipient[]> {
  try {
    const {data, error} = await supabase
      .from('driver_warehouses')
      .select(
        `
        warehouse_id,
        manager_warehouses!inner(
          manager_id,
          profiles!inner(id, name, role)
        )
      `
      )
      .eq('driver_id', driverId)
      .eq('boss_id', bossId)

    if (error) {
      logger.error('获取司机的车队长失败', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // 去重
    const managerMap = new Map<string, NotificationRecipient>()
    for (const item of data) {
      const managerWarehouses = item.manager_warehouses as any
      if (Array.isArray(managerWarehouses)) {
        for (const mw of managerWarehouses) {
          const profile = mw.profiles
          if (profile && !managerMap.has(profile.id)) {
            managerMap.set(profile.id, {
              userId: profile.id,
              name: profile.name || '车队长',
              role: profile.role
            })
          }
        }
      }
    }

    return Array.from(managerMap.values())
  } catch (error) {
    logger.error('获取司机的车队长异常', error)
    return []
  }
}

/**
 * 获取仓库的所有车队长
 */
async function getWarehouseManagers(warehouseIds: string[], bossId: string): Promise<NotificationRecipient[]> {
  try {
    if (warehouseIds.length === 0) {
      return []
    }

    const {data, error} = await supabase
      .from('manager_warehouses')
      .select(
        `
        manager_id,
        profiles!inner(id, name, role)
      `
      )
      .in('warehouse_id', warehouseIds)
      .eq('boss_id', bossId)

    if (error) {
      logger.error('获取仓库的车队长失败', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // 去重
    const managerMap = new Map<string, NotificationRecipient>()
    for (const item of data) {
      const profile = (item as any).profiles
      if (profile && !managerMap.has(profile.id)) {
        managerMap.set(profile.id, {
          userId: profile.id,
          name: profile.name || '车队长',
          role: profile.role
        })
      }
    }

    return Array.from(managerMap.values())
  } catch (error) {
    logger.error('获取仓库的车队长异常', error)
    return []
  }
}

/**
 * 去重通知接收对象
 */
function deduplicateRecipients(recipients: NotificationRecipient[]): NotificationRecipient[] {
  const map = new Map<string, NotificationRecipient>()
  for (const recipient of recipients) {
    if (!map.has(recipient.userId)) {
      map.set(recipient.userId, recipient)
    }
  }
  return Array.from(map.values())
}

/**
 * 司机提交申请时的通知
 * 通知对象：老板 + 所有平级账号 + 该司机的车队长
 */
export async function sendDriverSubmissionNotification(params: {
  driverId: string
  driverName: string
  bossId: string
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}): Promise<boolean> {
  try {
    logger.info('发送司机提交申请通知', params)

    const recipients: NotificationRecipient[] = []

    // 1. 获取老板
    const boss = await getBoss(params.bossId)
    if (boss) {
      recipients.push(boss)
    }

    // 2. 获取所有平级账号
    const peerAdmins = await getPeerAdmins(params.bossId)
    recipients.push(...peerAdmins)

    // 3. 获取该司机的车队长
    const managers = await getDriverManagers(params.driverId, params.bossId)
    recipients.push(...managers)

    // 去重
    const uniqueRecipients = deduplicateRecipients(recipients)

    if (uniqueRecipients.length === 0) {
      logger.warn('没有找到通知接收对象', params)
      return false
    }

    // 发送通知
    const notifications = uniqueRecipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    if (success) {
      logger.info(`司机提交申请通知发送成功，共 ${notifications.length} 条`, params)
    } else {
      logger.error('司机提交申请通知发送失败', params)
    }

    return success
  } catch (error) {
    logger.error('发送司机提交申请通知异常', error)
    return false
  }
}

/**
 * 车队长操作时的通知
 * 通知对象：老板 + 所有平级账号 + 被操作的司机
 */
export async function sendManagerActionNotification(params: {
  managerId: string
  managerName: string
  targetDriverId: string
  targetDriverName: string
  bossId: string
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}): Promise<boolean> {
  try {
    logger.info('发送车队长操作通知', params)

    const recipients: NotificationRecipient[] = []

    // 1. 获取老板
    const boss = await getBoss(params.bossId)
    if (boss) {
      recipients.push(boss)
    }

    // 2. 获取所有平级账号
    const peerAdmins = await getPeerAdmins(params.bossId)
    recipients.push(...peerAdmins)

    // 3. 添加被操作的司机
    recipients.push({
      userId: params.targetDriverId,
      name: params.targetDriverName,
      role: 'driver'
    })

    // 去重
    const uniqueRecipients = deduplicateRecipients(recipients)

    if (uniqueRecipients.length === 0) {
      logger.warn('没有找到通知接收对象', params)
      return false
    }

    // 发送通知
    const notifications = uniqueRecipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    if (success) {
      logger.info(`车队长操作通知发送成功，共 ${notifications.length} 条`, params)
    } else {
      logger.error('车队长操作通知发送失败', params)
    }

    return success
  } catch (error) {
    logger.error('发送车队长操作通知异常', error)
    return false
  }
}

/**
 * 老板操作时的通知
 * 通知对象：相关车队长 + 被操作的对象（司机或车队长）
 */
export async function sendBossActionNotification(params: {
  bossId: string
  bossName: string
  targetId: string
  targetName: string
  targetRole: 'driver' | 'manager'
  warehouseIds?: string[] // 相关仓库ID列表
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}): Promise<boolean> {
  try {
    logger.info('发送老板操作通知', params)

    const recipients: NotificationRecipient[] = []

    // 1. 如果有相关仓库，获取这些仓库的车队长
    if (params.warehouseIds && params.warehouseIds.length > 0) {
      const managers = await getWarehouseManagers(params.warehouseIds, params.bossId)
      recipients.push(...managers)
    }

    // 2. 如果操作对象是司机，获取该司机的车队长
    if (params.targetRole === 'driver') {
      const managers = await getDriverManagers(params.targetId, params.bossId)
      recipients.push(...managers)
    }

    // 3. 添加被操作的对象
    recipients.push({
      userId: params.targetId,
      name: params.targetName,
      role: params.targetRole
    })

    // 去重
    const uniqueRecipients = deduplicateRecipients(recipients)

    if (uniqueRecipients.length === 0) {
      logger.warn('没有找到通知接收对象', params)
      return false
    }

    // 发送通知
    const notifications = uniqueRecipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    if (success) {
      logger.info(`老板操作通知发送成功，共 ${notifications.length} 条`, params)
    } else {
      logger.error('老板操作通知发送失败', params)
    }

    return success
  } catch (error) {
    logger.error('发送老板操作通知异常', error)
    return false
  }
}

/**
 * 平级账号操作时的通知
 * 通知对象：老板（必须） + 相关车队长 + 被操作的对象
 */
export async function sendPeerAdminActionNotification(params: {
  peerAdminId: string
  peerAdminName: string
  targetId: string
  targetName: string
  targetRole: 'driver' | 'manager'
  warehouseIds?: string[] // 相关仓库ID列表
  bossId: string
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}): Promise<boolean> {
  try {
    logger.info('发送平级账号操作通知', params)

    const recipients: NotificationRecipient[] = []

    // 1. 获取老板（必须）
    const boss = await getBoss(params.bossId)
    if (boss) {
      recipients.push(boss)
    } else {
      logger.warn('未找到老板，但仍继续发送通知', params)
    }

    // 2. 如果有相关仓库，获取这些仓库的车队长
    if (params.warehouseIds && params.warehouseIds.length > 0) {
      const managers = await getWarehouseManagers(params.warehouseIds, params.bossId)
      recipients.push(...managers)
    }

    // 3. 如果操作对象是司机，获取该司机的车队长
    if (params.targetRole === 'driver') {
      const managers = await getDriverManagers(params.targetId, params.bossId)
      recipients.push(...managers)
    }

    // 4. 添加被操作的对象
    recipients.push({
      userId: params.targetId,
      name: params.targetName,
      role: params.targetRole
    })

    // 去重
    const uniqueRecipients = deduplicateRecipients(recipients)

    if (uniqueRecipients.length === 0) {
      logger.warn('没有找到通知接收对象', params)
      return false
    }

    // 发送通知
    const notifications = uniqueRecipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    if (success) {
      logger.info(`平级账号操作通知发送成功，共 ${notifications.length} 条`, params)
    } else {
      logger.error('平级账号操作通知发送失败', params)
    }

    return success
  } catch (error) {
    logger.error('发送平级账号操作通知异常', error)
    return false
  }
}

/**
 * 审批操作通知
 * 根据审批人角色自动选择通知策略
 */
export async function sendApprovalNotification(params: {
  approverId: string
  approverName: string
  approverRole: 'super_admin' | 'peer_admin' | 'manager'
  applicantId: string
  applicantName: string
  applicantRole: 'driver'
  bossId: string
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}): Promise<boolean> {
  try {
    logger.info('发送审批通知', params)

    if (params.approverRole === 'manager') {
      // 车队长审批：通知老板 + 所有平级账号 + 申请人
      return await sendManagerActionNotification({
        managerId: params.approverId,
        managerName: params.approverName,
        targetDriverId: params.applicantId,
        targetDriverName: params.applicantName,
        bossId: params.bossId,
        type: params.type,
        title: params.title,
        content: params.content,
        relatedId: params.relatedId
      })
    } else if (params.approverRole === 'super_admin') {
      // 老板审批：通知相关车队长 + 申请人
      return await sendBossActionNotification({
        bossId: params.bossId,
        bossName: params.approverName,
        targetId: params.applicantId,
        targetName: params.applicantName,
        targetRole: params.applicantRole,
        type: params.type,
        title: params.title,
        content: params.content,
        relatedId: params.relatedId
      })
    } else if (params.approverRole === 'peer_admin') {
      // 平级账号审批：通知老板 + 相关车队长 + 申请人
      return await sendPeerAdminActionNotification({
        peerAdminId: params.approverId,
        peerAdminName: params.approverName,
        targetId: params.applicantId,
        targetName: params.applicantName,
        targetRole: params.applicantRole,
        bossId: params.bossId,
        type: params.type,
        title: params.title,
        content: params.content,
        relatedId: params.relatedId
      })
    }

    return false
  } catch (error) {
    logger.error('发送审批通知异常', error)
    return false
  }
}
