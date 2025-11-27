/**
 * 通知服务模块
 * 负责处理系统中各类业务操作的通知发送
 *
 * 物理隔离架构：每个老板拥有独立数据库，不需要 boss_id 过滤
 */

import {createNotifications, type NotificationType} from '@/db/notificationApi'
import {supabase} from '@/db/supabase'
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
 * 获取所有管理员（老板 + 平级账号）
 * 注意：数据库中的 user_role 枚举只包含 'driver', 'manager', 'super_admin'
 * 平级账号通过 main_account_id 字段标识（main_account_id IS NOT NULL）
 */
async function getAdmins(): Promise<NotificationRecipient[]> {
  try {
    logger.info('查询管理员账号')

    // 查询所有 super_admin 角色的用户（包括主账号和平级账号）
    const {data, error} = await supabase.from('profiles').select('id, name, role').eq('role', 'super_admin')

    if (error) {
      logger.error('获取管理员信息失败', error)
      return []
    }

    logger.info('找到管理员账号', {count: data?.length || 0})

    return (data || []).map((p) => ({
      userId: p.id,
      name: p.name || '管理员',
      role: p.role
    }))
  } catch (error) {
    logger.error('获取管理员信息异常', error)
    return []
  }
}

/**
 * 获取司机的车队长
 */
async function getDriverManagers(driverId: string): Promise<NotificationRecipient[]> {
  try {
    logger.info('查询司机的车队长', {driverId})

    // 第一步：获取司机所在的仓库
    const {data: driverWarehouses, error: dwError} = await supabase
      .from('driver_warehouses')
      .select('warehouse_id')
      .eq('driver_id', driverId)

    if (dwError) {
      logger.error('获取司机仓库失败', dwError)
      return []
    }

    if (!driverWarehouses || driverWarehouses.length === 0) {
      logger.warn('司机未分配仓库', {driverId})
      return []
    }

    const warehouseIds = driverWarehouses.map((dw) => dw.warehouse_id)
    logger.info('司机所在仓库', {warehouseIds})

    // 第二步：获取这些仓库的车队长
    const {data: managerWarehouses, error: mwError} = await supabase
      .from('manager_warehouses')
      .select(
        `
        manager_id,
        profiles!manager_warehouses_manager_id_fkey(id, name, role)
      `
      )
      .in('warehouse_id', warehouseIds)

    if (mwError) {
      logger.error('获取车队长失败', mwError)
      return []
    }

    if (!managerWarehouses || managerWarehouses.length === 0) {
      logger.warn('仓库没有车队长', {warehouseIds})
      return []
    }

    // 去重
    const managerMap = new Map<string, NotificationRecipient>()
    for (const mw of managerWarehouses) {
      const profile = mw.profiles as any
      if (profile && !managerMap.has(profile.id)) {
        managerMap.set(profile.id, {
          userId: profile.id,
          name: profile.name || '车队长',
          role: profile.role
        })
      }
    }

    logger.info('找到车队长', {count: managerMap.size})
    return Array.from(managerMap.values())
  } catch (error) {
    logger.error('获取司机的车队长异常', error)
    return []
  }
}

/**
 * 司机提交申请通知参数
 */
export interface DriverSubmissionNotificationParams {
  driverId: string
  driverName: string
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}

/**
 * 发送司机提交申请的通知
 * 通知对象：老板、平级账号、车队长
 */
export async function sendDriverSubmissionNotification(params: DriverSubmissionNotificationParams): Promise<boolean> {
  try {
    logger.info('📬 发送司机提交申请通知', params)

    // 获取所有管理员（老板 + 平级账号）
    const admins = await getAdmins()
    logger.info('找到管理员', {count: admins.length})

    // 获取司机的车队长
    const managers = await getDriverManagers(params.driverId)
    logger.info('找到车队长', {count: managers.length})

    // 合并接收者并去重
    const recipientMap = new Map<string, NotificationRecipient>()
    for (const admin of admins) {
      recipientMap.set(admin.userId, admin)
    }
    for (const manager of managers) {
      recipientMap.set(manager.userId, manager)
    }

    const recipients = Array.from(recipientMap.values())
    logger.info('通知接收者总数', {count: recipients.length})

    if (recipients.length === 0) {
      logger.warn('没有找到通知接收者')
      return false
    }

    // 批量创建通知
    const notifications = recipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    logger.info('通知发送结果', {success, count: notifications.length})

    return success
  } catch (error) {
    logger.error('发送司机提交申请通知异常', error)
    return false
  }
}

/**
 * 管理员审批通知参数
 */
export interface AdminApprovalNotificationParams {
  targetUserId: string
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}

/**
 * 发送管理员审批结果通知
 * 通知对象：目标用户（司机）
 */
export async function sendAdminApprovalNotification(params: AdminApprovalNotificationParams): Promise<boolean> {
  try {
    logger.info('📬 发送管理员审批通知', params)

    const notifications = [
      {
        userId: params.targetUserId,
        type: params.type,
        title: params.title,
        message: params.content,
        relatedId: params.relatedId
      }
    ]

    const success = await createNotifications(notifications)
    logger.info('通知发送结果', {success})

    return success
  } catch (error) {
    logger.error('发送管理员审批通知异常', error)
    return false
  }
}

/**
 * 系统通知参数
 */
export interface SystemNotificationParams {
  recipientIds: string[]
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}

/**
 * 发送系统通知
 * 通知对象：指定的用户列表
 */
export async function sendSystemNotification(params: SystemNotificationParams): Promise<boolean> {
  try {
    logger.info('📬 发送系统通知', params)

    if (params.recipientIds.length === 0) {
      logger.warn('没有指定通知接收者')
      return false
    }

    const notifications = params.recipientIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    logger.info('通知发送结果', {success, count: notifications.length})

    return success
  } catch (error) {
    logger.error('发送系统通知异常', error)
    return false
  }
}
