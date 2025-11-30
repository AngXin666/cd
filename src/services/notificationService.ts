/**
 * 通知服务模块
 * 负责处理系统中各类业务操作的通知发送
 *
 * 单用户架构：直接查询 users 和 user_roles 表
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
 * 获取主账号（老板）
 * 注意：主账号的 main_account_id 为 NULL
 * 单用户架构：直接查询 users 和 user_roles 表
 */
async function getPrimaryAdmin(): Promise<NotificationRecipient | null> {
  try {
    logger.info('查询主账号（老板）')

    // 单用户架构：从 users 和 user_roles 表查询
    const [{data: userData, error: userError}, {data: roleData}] = await Promise.all([
      supabase.from('users').select('id, name').is('main_account_id', null).maybeSingle(),
      supabase.from('user_roles').select('user_id, role').eq('role', 'SUPER_ADMIN').maybeSingle()
    ])

    if (userError) {
      logger.error('获取主账号失败', {error: userError})
      return null
    }

    // 合并用户和角色数据
    const data = userData && roleData && userData.id === roleData.user_id ? {...userData, role: roleData.role} : null

    if (!data) {
      logger.warn('未找到主账号')
      return null
    }

    logger.info('找到主账号', {userId: data.id, name: data.name})
    return {
      userId: data.id,
      name: data.name || '老板',
      role: data.role
    }
  } catch (error) {
    logger.error('获取主账号异常', error)
    return null
  }
}

/**
 * 获取所有平级账号
 * 注意：平级账号的 main_account_id 不为 NULL
 * 单用户架构：直接查询 users 和 user_roles 表
 */
async function getPeerAccounts(): Promise<NotificationRecipient[]> {
  try {
    logger.info('查询平级账号')

    // 单用户架构：从 users 和 user_roles 表查询
    const [{data: users, error: usersError}, {data: roles}] = await Promise.all([
      supabase.from('users').select('id, name').not('main_account_id', 'is', null),
      supabase.from('user_roles').select('user_id, role').eq('role', 'SUPER_ADMIN')
    ])

    if (usersError) {
      logger.error('获取平级账号失败', {error: usersError})
      return []
    }

    // 合并用户和角色数据
    const data = users
      ?.filter((user) => roles?.some((r) => r.user_id === user.id))
      .map((user) => ({
        ...user,
        role: roles?.find((r) => r.user_id === user.id)?.role || 'DRIVER'
      }))

    if (!data || data.length === 0) {
      logger.info('未找到平级账号')
      return []
    }

    logger.info('找到平级账号', {count: data.length})
    return data.map((p) => ({
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
 * 获取所有管理员（老板 + 平级账号）
 * 注意：数据库中的 user_role 枚举只包含 'driver', 'manager', 'super_admin'
 * 平级账号通过 main_account_id 字段标识（main_account_id IS NOT NULL）
 * 单用户架构：直接查询 users 和 user_roles 表
 */
async function _getAllAdmins(): Promise<NotificationRecipient[]> {
  try {
    logger.info('查询所有管理员账号')

    // 单用户架构：从 users 和 user_roles 表查询所有 SUPER_ADMIN 角色的用户
    const [{data: users, error: usersError}, {data: roles}] = await Promise.all([
      supabase.from('users').select('id, name'),
      supabase.from('user_roles').select('user_id, role').eq('role', 'SUPER_ADMIN')
    ])

    if (usersError) {
      logger.error('获取管理员信息失败', usersError)
      return []
    }

    // 合并用户和角色数据
    const data = users
      ?.filter((user) => roles?.some((r) => r.user_id === user.id))
      .map((user) => ({
        ...user,
        role: roles?.find((r) => r.user_id === user.id)?.role || 'DRIVER'
      }))

    if (!data || data.length === 0) {
      logger.warn('未找到任何管理员')
      return []
    }

    logger.info('找到管理员账号', {count: data.length})

    return data.map((p) => ({
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
 * 检查车队长是否对司机有管辖权
 * @param managerId 车队长ID
 * @param driverId 司机ID
 * @returns 是否有管辖权
 */
async function _checkManagerHasJurisdiction(managerId: string, driverId: string): Promise<boolean> {
  try {
    logger.info('检查车队长管辖权', {managerId, driverId})

    // 获取司机所在的仓库
    const {data: driverWarehouses, error: dwError} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('user_id', driverId)

    if (dwError || !driverWarehouses || driverWarehouses.length === 0) {
      logger.warn('司机未分配仓库', {driverId})
      return false
    }

    const driverWarehouseIds = driverWarehouses.map((dw) => dw.warehouse_id)

    // 获取车队长管理的仓库
    const {data: managerWarehouses, error: mwError} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('user_id', managerId)

    if (mwError || !managerWarehouses || managerWarehouses.length === 0) {
      logger.warn('车队长未管理任何仓库', {managerId})
      return false
    }

    const managerWarehouseIds = managerWarehouses.map((mw) => mw.warehouse_id)

    // 检查是否有交集
    const hasJurisdiction = driverWarehouseIds.some((id) => managerWarehouseIds.includes(id))

    logger.info('管辖权检查结果', {managerId, driverId, hasJurisdiction})
    return hasJurisdiction
  } catch (error) {
    logger.error('检查车队长管辖权异常', error)
    return false
  }
}

/**
 * 获取对司机有管辖权的车队长
 * @param driverId 司机ID
 * @returns 有管辖权的车队长列表
 * 单用户架构：直接查询 warehouse_assignments + users + user_roles
 */
async function getManagersWithJurisdiction(driverId: string): Promise<NotificationRecipient[]> {
  try {
    logger.info('查询对司机有管辖权的车队长', {driverId})

    // 参数验证：确保 driverId 是有效的 UUID
    if (!driverId || driverId === 'anon' || driverId.length < 10) {
      logger.error('❌ 无效的司机ID', {driverId})
      return []
    }

    // 步骤1：获取司机所在的仓库
    const {data: driverWarehouses, error: dwError} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('user_id', driverId)

    if (dwError) {
      logger.error('获取司机仓库失败', {error: dwError, driverId})
      return []
    }

    if (!driverWarehouses || driverWarehouses.length === 0) {
      logger.info('司机未分配仓库', {driverId})
      return []
    }

    const driverWarehouseIds = driverWarehouses.map((dw) => dw.warehouse_id)
    logger.info('司机所在仓库', {driverId, warehouseIds: driverWarehouseIds})

    // 步骤2：获取管理这些仓库的车队长
    const {data: managerWarehouses, error: mwError} = await supabase
      .from('warehouse_assignments')
      .select('user_id')
      .in('warehouse_id', driverWarehouseIds)

    if (mwError) {
      logger.error('获取仓库车队长失败', {error: mwError, warehouseIds: driverWarehouseIds})
      return []
    }

    if (!managerWarehouses || managerWarehouses.length === 0) {
      logger.info('没有车队长管理这些仓库', {warehouseIds: driverWarehouseIds})
      return []
    }

    const managerIds = [...new Set(managerWarehouses.map((mw) => mw.user_id))]
    logger.info('找到车队长ID列表', {managerIds})

    // 步骤3：获取车队长的详细信息（单用户架构：从 users 和 user_roles 表查询）
    const [{data: users, error: usersError}, {data: roles}] = await Promise.all([
      supabase.from('users').select('id, name').in('id', managerIds),
      supabase.from('user_roles').select('user_id, role').eq('role', 'MANAGER').in('user_id', managerIds)
    ])

    if (usersError) {
      logger.error('获取车队长信息失败', {error: usersError, managerIds})
      return []
    }

    // 合并用户和角色数据
    const managers = users
      ?.filter((user) => roles?.some((r) => r.user_id === user.id))
      .map((user) => ({
        ...user,
        role: roles?.find((r) => r.user_id === user.id)?.role || 'DRIVER'
      }))

    if (!managers || managers.length === 0) {
      logger.warn('未找到车队长信息', {managerIds})
      return []
    }

    const result = managers.map((m) => ({
      userId: m.id,
      name: m.name || '车队长',
      role: m.role
    }))

    logger.info('找到有管辖权的车队长', {count: result.length})
    return result
  } catch (error) {
    logger.error('获取有管辖权的车队长异常', error)
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
 * 通知对象：
 * 1. 主账号（老板）- 始终通知
 * 2. 平级账号 - 如果存在则通知
 * 3. 有管辖权的车队长 - 只通知对该司机有管辖权的车队长
 */
export async function sendDriverSubmissionNotification(params: DriverSubmissionNotificationParams): Promise<boolean> {
  try {
    logger.info('📬 发送司机提交申请通知', params)

    // 参数验证：确保 driverId 是有效的 UUID
    if (!params.driverId || params.driverId === 'anon' || params.driverId.length < 10) {
      logger.error('❌ 无效的司机ID，无法发送通知', {driverId: params.driverId})
      return false
    }

    const recipientMap = new Map<string, NotificationRecipient>()

    // 1. 获取主账号（老板）- 始终通知
    const primaryAdmin = await getPrimaryAdmin()
    if (primaryAdmin) {
      recipientMap.set(primaryAdmin.userId, primaryAdmin)
      logger.info('✅ 将通知主账号（老板）', {userId: primaryAdmin.userId})
    } else {
      logger.warn('⚠️ 未找到主账号，跳过主账号通知')
    }

    // 2. 获取平级账号 - 如果存在则通知
    const peerAccounts = await getPeerAccounts()
    if (peerAccounts.length > 0) {
      for (const peer of peerAccounts) {
        recipientMap.set(peer.userId, peer)
      }
      logger.info('✅ 将通知平级账号', {count: peerAccounts.length})
    } else {
      logger.info('ℹ️ 不存在平级账号，跳过平级账号通知')
    }

    // 3. 获取有管辖权的车队长 - 只通知对该司机有管辖权的车队长
    const managers = await getManagersWithJurisdiction(params.driverId)
    if (managers.length > 0) {
      for (const manager of managers) {
        recipientMap.set(manager.userId, manager)
      }
      logger.info('✅ 将通知有管辖权的车队长', {count: managers.length})
    } else {
      logger.info('ℹ️ 没有对该司机有管辖权的车队长，跳过车队长通知')
    }

    const recipients = Array.from(recipientMap.values())
    logger.info('📊 通知接收者总数', {count: recipients.length})

    // 如果没有任何接收者，记录警告但不返回失败
    if (recipients.length === 0) {
      logger.warn('⚠️ 没有找到任何通知接收者，通知发送完成（无接收者）')
      return true // 返回 true 表示没有错误，只是没有接收者
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
    logger.info('📮 通知发送结果', {success, count: notifications.length})

    return success
  } catch (error) {
    logger.error('❌ 发送司机提交申请通知异常', error)
    return false
  }
}

/**
 * 车队长操作通知参数
 */
export interface ManagerActionNotificationParams {
  managerId: string
  managerName: string
  targetUserId: string
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}

/**
 * 发送车队长操作通知
 * 通知对象：
 * 1. 目标用户（司机）- 始终通知
 * 2. 平级账号 - 如果存在则通知
 */
export async function sendManagerActionNotification(params: ManagerActionNotificationParams): Promise<boolean> {
  try {
    logger.info('📬 发送车队长操作通知', params)

    const recipientMap = new Map<string, NotificationRecipient>()

    // 1. 添加目标用户（司机）
    recipientMap.set(params.targetUserId, {
      userId: params.targetUserId,
      name: '司机',
      role: 'driver'
    })
    logger.info('✅ 将通知目标用户（司机）', {userId: params.targetUserId})

    // 2. 获取平级账号 - 如果存在则通知
    const peerAccounts = await getPeerAccounts()
    if (peerAccounts.length > 0) {
      for (const peer of peerAccounts) {
        recipientMap.set(peer.userId, peer)
      }
      logger.info('✅ 将通知平级账号', {count: peerAccounts.length})
    } else {
      logger.info('ℹ️ 不存在平级账号，跳过平级账号通知')
    }

    const recipients = Array.from(recipientMap.values())
    logger.info('📊 通知接收者总数', {count: recipients.length})

    // 批量创建通知
    const notifications = recipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    logger.info('📮 通知发送结果', {success, count: notifications.length})

    return success
  } catch (error) {
    logger.error('❌ 发送车队长操作通知异常', error)
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
    logger.info('📮 通知发送结果', {success})

    return success
  } catch (error) {
    logger.error('❌ 发送管理员审批通知异常', error)
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
      logger.warn('⚠️ 没有指定通知接收者')
      return true // 返回 true 表示没有错误，只是没有接收者
    }

    const notifications = params.recipientIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    logger.info('📮 通知发送结果', {success, count: notifications.length})

    return success
  } catch (error) {
    logger.error('❌ 发送系统通知异常', error)
    return false
  }
}
