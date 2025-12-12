/**
 * 通知服务模块
 * 负责处理系统中各类业务操作的通知发送
 *
 * 单用户架构：直接查询 users 和 user_roles 表
 */

import {createNotifications, type NotificationType} from '@/db/notificationApi'
import {supabase} from '@/db/supabase'
import type {UserRole} from '@/db/types'
import {logger} from '@/utils/logger'

/**
 * 通知接收对象
 */
interface NotificationRecipient {
  userId: string
  name: string
  role: UserRole
}

/**
 * 获取主账号（老板）
 * 单用户架构：返回第一个 BOSS 角色的用户
 */
async function getPrimaryAdmin(): Promise<NotificationRecipient | null> {
  try {
    // 单用户架构：从 users 表查询第一个 BOSS 角色的用户
    const {data: bossUser, error: bossUserError} = await supabase
      .from('users')
      .select('id, name, role')
      .eq('role', 'BOSS')
      .limit(1)
      .maybeSingle()

    if (bossUserError) {
      logger.error('获取主管理员角色信息失败', bossUserError)
      return null
    }

    if (!bossUser) {
      logger.error('未找到主管理员角色')
      return null
    }

    return {
      userId: bossUser.id,
      name: bossUser.name || '老板',
      role: bossUser.role || 'BOSS' // 确保role不为null
    }
  } catch (error) {
    logger.error('获取主管理员信息异常', error)
    return null
  }
}

/**
 * 获取所有平级账号
 * 单用户架构：返回所有 PEER_ADMIN 角色用户
 */
async function getPeerAccounts(): Promise<NotificationRecipient[]> {
  try {
    // 单用户架构：从 users 表直接查询所有 PEER_ADMIN 角色的用户
    const {data: users, error: usersError} = await supabase
      .from('users')
      .select('id, name, role')
      .eq('role', 'PEER_ADMIN')
      .order('id', {ascending: true})

    if (usersError || !users || users.length === 0) {
      return []
    }

    // 生成消息接收者列表
    return users.map((user) => ({
      userId: user.id,
      name: user.name || '平级管理员',
      role: user.role || 'PEER_ADMIN'
    }))
  } catch (error) {
    logger.error('获取平级账号异常', error)
    return []
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
    // 参数验证：确保 driverId 是有效的 UUID
    if (!driverId || driverId === 'anon' || driverId.length < 10) {
      console.error('  ❌ 无效的司机ID:', driverId)
      logger.error('❌ 无效的司机ID', {driverId})
      return []
    }

    // 步骤1：获取司机所在的仓库

    const {data: driverWarehouses, error: dwError} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('user_id', driverId)

    if (dwError) {
      console.error('  ❌ 查询司机仓库失败:', dwError)
      logger.error('获取司机仓库失败', {error: dwError, driverId})
      return []
    }

    if (!driverWarehouses || driverWarehouses.length === 0) {
      return []
    }

    const driverWarehouseIds = driverWarehouses.map((dw) => dw.warehouse_id)

    // 步骤2：获取管理这些仓库的车队长

    const {data: managerWarehouses, error: mwError} = await supabase
      .from('warehouse_assignments')
      .select('user_id')
      .in('warehouse_id', driverWarehouseIds)

    if (mwError) {
      console.error('  ❌ 查询仓库管理者失败:', mwError)
      logger.error('获取仓库车队长失败', {error: mwError, warehouseIds: driverWarehouseIds})
      return []
    }

    if (!managerWarehouses || managerWarehouses.length === 0) {
      return []
    }

    const managerIds = [...new Set(managerWarehouses.map((mw) => mw.user_id))]

    // 步骤3：获取车队长的详细信息（单用户架构：从 users 表查询）

    const {data: users, error: usersError} = await supabase
      .from('users')
      .select('id, name, role')
      .eq('role', 'MANAGER')
      .in('id', managerIds)

    if (usersError) {
      console.error('  ❌ 查询用户信息失败:', usersError)
      logger.error('获取车队长信息失败', {error: usersError, managerIds})
      return []
    }

    if (!users || users.length === 0) {
      return []
    }

    const result = users.map((user) => ({
      userId: user.id,
      name: user.name || '车队长',
      role: user.role || 'MANAGER'
    }))

    result.forEach((_m, _index) => {})

    return result
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ [通知服务] 获取车队长异常:', error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
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
  batchId?: string // 批次ID，用于后续更新通知状态
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null // 审批状态
}

/**
 * 发送司机提交申请的通知
 * 通知对象：
 * 1. 主账号（老板）- 始终通知
 * 2. 平级账号 - 如果存在则通知
 * 3. 有管辖权的车队长 - 只通知对该司机有管辖权的车队长
 *
 * 性能优化：使用 Promise.all 并行执行独立查询
 */
export async function sendDriverSubmissionNotification(params: DriverSubmissionNotificationParams): Promise<boolean> {
  try {
    // 参数验证：确保 driverId 是有效的 UUID
    if (!params.driverId || params.driverId === 'anon' || params.driverId.length < 10) {
      console.error('❌ 参数验证失败: 无效的司机ID')
      console.error('  - 司机ID:', params.driverId)
      logger.error('❌ 无效的司机ID，无法发送通知', {driverId: params.driverId})
      return false
    }

    const recipientMap = new Map<string, NotificationRecipient>()

    // 🚀 性能优化：并行执行所有独立查询

    const [primaryAdmin, peerAccounts, managers] = await Promise.all([
      getPrimaryAdmin(),
      getPeerAccounts(),
      getManagersWithJurisdiction(params.driverId)
    ])

    // 1. 处理主账号（老板）
    if (primaryAdmin) {
      recipientMap.set(primaryAdmin.userId, primaryAdmin)
    } else {
    }

    // 2. 处理平级账号
    if (peerAccounts.length > 0) {
      for (const peer of peerAccounts) {
        recipientMap.set(peer.userId, peer)
      }
      peerAccounts.forEach((_peer, _index) => {})
    } else {
    }

    // 3. 处理有管辖权的车队长
    if (managers.length > 0) {
      for (const manager of managers) {
        recipientMap.set(manager.userId, manager)
      }
      managers.forEach((_manager, _index) => {})
    } else {
    }

    const recipients = Array.from(recipientMap.values())
    recipients.forEach((_recipient, _index) => {})

    // 如果没有任何接收者，记录警告但不返回失败
    if (recipients.length === 0) {
      return true // 返回 true 表示没有错误，只是没有接收者
    }

    // 批量创建通知

    const notifications = recipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId,
      batchId: params.batchId, // 批次ID
      approvalStatus: params.approvalStatus // 审批状态
    }))

    notifications.forEach((_notif, _index) => {})

    const success = await createNotifications(notifications)

    if (success) {
    } else {
      console.error('❌ 通知发送失败')
      console.error('  - 请检查数据库连接和 RLS 策略')
    }

    return success
  } catch (error) {
    console.error('╔═══════════════════════════════════════════════════════════════╗')
    console.error('║                   ❌ 通知发送异常                              ║')
    console.error('╚═══════════════════════════════════════════════════════════════╝')
    console.error('')
    console.error('错误详情:', error)
    console.error('')
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
 * 2. 调度(PEER_ADMIN) - 如果存在则通知
 * 3. 老板(BOSS) - 始终通知
 */
export async function sendManagerActionNotification(params: ManagerActionNotificationParams): Promise<boolean> {
  try {
    const recipientMap = new Map<string, NotificationRecipient>()

    // 1. 添加目标用户（司机）
    recipientMap.set(params.targetUserId, {
      userId: params.targetUserId,
      name: '司机',
      role: 'DRIVER'
    })

    // 2. 获取调度 - 并行执行
    const [peerAccounts, primaryAdmin] = await Promise.all([getPeerAccounts(), getPrimaryAdmin()])

    // 添加调度
    if (peerAccounts.length > 0) {
      for (const peer of peerAccounts) {
        recipientMap.set(peer.userId, peer)
      }
    } else {
    }

    // 3. 添加老板
    if (primaryAdmin) {
      recipientMap.set(primaryAdmin.userId, primaryAdmin)
    } else {
    }

    const recipients = Array.from(recipientMap.values())
    recipients.forEach((_recipient, _index) => {})

    // 批量创建通知
    const notifications = recipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    if (success) {
    } else {
      console.error('❌ 通知发送失败')
    }

    return success
  } catch (error) {
    console.error('╭───────────────────────────────────────────────────────────────╮')
    console.error('│       ❌ 通知发送异常                                            │')
    console.error('╰───────────────────────────────────────────────────────────────╯')
    console.error('错误详情:', error)
    console.error('')
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

    return success
  } catch (error) {
    logger.error('❌ 发送管理员审批通知异常', error)
    return false
  }
}

/**
 * 调度操作通知参数
 */
export interface PeerAdminActionNotificationParams {
  peerAdminId: string
  peerAdminName: string
  targetUserId: string
  targetUserRole: 'DRIVER' | 'MANAGER'
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}

/**
 * 发送调度操作通知
 * 通知对象：
 * 1. 老板(BOSS) - 始终通知
 * 2. 目标用户（司机或车队长）- 始终通知
 */
export async function sendPeerAdminActionNotification(params: PeerAdminActionNotificationParams): Promise<boolean> {
  try {
    const recipientMap = new Map<string, NotificationRecipient>()

    // 1. 添加老板 - 并行执行
    const primaryAdmin = await getPrimaryAdmin()
    if (primaryAdmin) {
      recipientMap.set(primaryAdmin.userId, primaryAdmin)
    } else {
    }

    // 2. 添加目标用户
    recipientMap.set(params.targetUserId, {
      userId: params.targetUserId,
      name: params.targetUserRole === 'DRIVER' ? '司机' : '车队长',
      role: params.targetUserRole
    })

    const recipients = Array.from(recipientMap.values())

    // 批量创建通知
    const notifications = recipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    if (success) {
    } else {
      console.error('❌ 通知发送失败')
    }

    return success
  } catch (error) {
    console.error('❌ 调度操作通知发送异常:', error)
    logger.error('❌ 发送调度操作通知异常', error)
    return false
  }
}

/**
 * 老板操作通知参数
 */
export interface BossActionNotificationParams {
  bossId: string
  bossName: string
  targetUserId: string
  targetUserRole: 'DRIVER' | 'MANAGER' | 'PEER_ADMIN'
  type: NotificationType
  title: string
  content: string
  relatedId?: string
}

/**
 * 发送老板操作通知
 * 通知对象根据目标用户角色不同：
 * - 对DRIVER操作：通知PEER_ADMIN、DRIVER和管辖MANAGER
 * - 对MANAGER操作：通知MANAGER和PEER_ADMIN
 * - 对PEER_ADMIN操作：仅通知本人
 */
export async function sendBossActionNotification(params: BossActionNotificationParams): Promise<boolean> {
  try {
    const recipientMap = new Map<string, NotificationRecipient>()

    // 总是添加目标用户
    const targetRoleLabel =
      params.targetUserRole === 'DRIVER' ? '司机' : params.targetUserRole === 'MANAGER' ? '车队长' : '调度'
    recipientMap.set(params.targetUserId, {
      userId: params.targetUserId,
      name: targetRoleLabel,
      role: params.targetUserRole
    })

    // 根据目标用户角色决定额外接收者
    if (params.targetUserRole === 'DRIVER') {
      // 对司机操作: 通知调度和管辖车队长
      const [peerAccounts, managers] = await Promise.all([
        getPeerAccounts(),
        getManagersWithJurisdiction(params.targetUserId)
      ])

      // 添加调度
      if (peerAccounts.length > 0) {
        for (const peer of peerAccounts) {
          recipientMap.set(peer.userId, peer)
        }
      }

      // 添加管辖车队长
      if (managers.length > 0) {
        for (const manager of managers) {
          recipientMap.set(manager.userId, manager)
        }
      }
    } else if (params.targetUserRole === 'MANAGER') {
      // 对车队长操作: 通知调度
      const peerAccounts = await getPeerAccounts()
      if (peerAccounts.length > 0) {
        for (const peer of peerAccounts) {
          recipientMap.set(peer.userId, peer)
        }
      }
    }
    // 对调度操作: 仅通知本人，不需要添加额外接收者

    const recipients = Array.from(recipientMap.values())
    recipients.forEach((_recipient, _index) => {})

    // 批量创建通知
    const notifications = recipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId
    }))

    const success = await createNotifications(notifications)
    if (success) {
    } else {
      console.error('❌ 通知发送失败')
    }

    return success
  } catch (error) {
    console.error('❌ 老板操作通知发送异常:', error)
    logger.error('❌ 发送老板操作通知异常', error)
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
    if (params.recipientIds.length === 0) {
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

    return success
  } catch (error) {
    logger.error('❌ 发送系统通知异常', error)
    return false
  }
}
