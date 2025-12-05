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
 * 单用户架构：返回第一个 BOSS 角色的用户
 */
async function getPrimaryAdmin(): Promise<NotificationRecipient | null> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [通知服务] 步骤 1: 查询主账号（老板）')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    logger.info('查询主账号（老板）')

    // 单用户架构：从 users 和 user_roles 表查询第一个 BOSS
    console.log('  📊 查询条件:')
    console.log('    - 表: user_roles')
    console.log('    - 角色: BOSS')
    console.log('    - 排序: user_id ASC')
    console.log('    - 限制: 1 条')

    const {data: roleData, error: roleError} = await supabase
      .from('users')
      .select('id, role')
      .eq('role', 'BOSS')
      .order('id', {ascending: true})
      .limit(1)
      .maybeSingle()

    if (roleError) {
      console.error('  ❌ 查询角色失败:', roleError)
      logger.warn('未找到主账号', {error: roleError})
      return null
    }

    if (!roleData) {
      console.warn('  ⚠️ 未找到 BOSS 角色用户')
      logger.warn('未找到主账号')
      return null
    }

    console.log('  ✅ 找到 BOSS 角色:')
    console.log('    - 用户ID:', roleData.id)
    console.log('    - 角色:', roleData.role)

    // 获取用户信息
    console.log('  📊 查询用户信息:')
    console.log('    - 表: users')
    console.log('    - 用户ID:', roleData.id)

    const {data: userData, error: userError} = await supabase
      .from('users')
      .select('id, name')
      .eq('id', roleData.id)
      .maybeSingle()

    if (userError) {
      console.error('  ❌ 查询用户信息失败:', userError)
      logger.error('获取主账号用户信息失败', {error: userError})
      return null
    }

    if (!userData) {
      console.warn('  ⚠️ 未找到用户信息')
      logger.error('获取主账号用户信息失败')
      return null
    }

    console.log('  ✅ 找到用户信息:')
    console.log('    - 用户ID:', userData.id)
    console.log('    - 姓名:', userData.name || '(未设置)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ [通知服务] 主账号查询成功')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    logger.info('找到主账号', {userId: userData.id, name: userData.name})
    return {
      userId: userData.id,
      name: userData.name || '老板',
      role: roleData.role
    }
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ [通知服务] 获取主账号异常:', error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    logger.error('获取主账号异常', error)
    return null
  }
}

/**
 * 获取所有平级账号
 * 单用户架构：返回所有 PEER_ADMIN 角色用户
 */
async function getPeerAccounts(): Promise<NotificationRecipient[]> {
  try {
    logger.info('查询平级账号')

    // 单用户架构：从 users 和 user_roles 表查询所有 PEER_ADMIN
    const {data: roles, error: rolesError} = await supabase
      .from('users')
      .select('id, role')
      .eq('role', 'PEER_ADMIN')
      .order('id', {ascending: true})

    if (rolesError || !roles || roles.length === 0) {
      logger.info('未找到平级账号')
      return []
    }

    // 获取用户信息
    const {data: users, error: usersError} = await supabase
      .from('users')
      .select('id, name')
      .in(
        'id',
        roles.map((r) => r.id)
      )

    if (usersError || !users) {
      logger.error('获取平级账号用户信息失败', {error: usersError})
      return []
    }

    logger.info('找到平级账号', {count: users.length})
    return users.map((user) => ({
      userId: user.id,
      name: user.name || '平级账号',
      role: 'PEER_ADMIN'
    }))
  } catch (error) {
    logger.error('获取平级账号异常', error)
    return []
  }
}

/**
 * 获取所有管理员（老板 + 平级账号）
 * 单用户架构：查询所有 BOSS 和 PEER_ADMIN 角色的用户
 */
async function _getAllAdmins(): Promise<NotificationRecipient[]> {
  try {
    logger.info('查询所有管理员账号')

    // 单用户架构：从 users 和 user_roles 表查询所有 BOSS 和 PEER_ADMIN 角色的用户
    const [{data: users, error: usersError}, {data: roles}] = await Promise.all([
      supabase.from('users').select('id, name'),
      supabase.from('users').select('id, role').in('role', ['BOSS', 'PEER_ADMIN'])
    ])

    if (usersError) {
      logger.error('获取管理员信息失败', usersError)
      return []
    }

    // 合并用户和角色数据
    const data = users
      ?.filter((user) => roles?.some((r) => r.id === user.id))
      .map((user) => ({
        ...user,
        role: roles?.find((r) => r.id === user.id)?.role || 'DRIVER'
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [通知服务] 步骤 3: 查询有管辖权的车队长')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  📋 输入参数:')
    console.log('    - 司机ID:', driverId)
    logger.info('查询对司机有管辖权的车队长', {driverId})

    // 参数验证：确保 driverId 是有效的 UUID
    if (!driverId || driverId === 'anon' || driverId.length < 10) {
      console.error('  ❌ 无效的司机ID:', driverId)
      logger.error('❌ 无效的司机ID', {driverId})
      return []
    }

    // 步骤1：获取司机所在的仓库
    console.log('  📊 步骤 3.1: 查询司机所在仓库')
    console.log('    - 表: warehouse_assignments')
    console.log('    - 条件: user_id =', driverId)

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
      console.warn('  ⚠️ 司机未分配仓库')
      logger.info('司机未分配仓库', {driverId})
      return []
    }

    const driverWarehouseIds = driverWarehouses.map((dw) => dw.warehouse_id)
    console.log('  ✅ 找到司机所在仓库:')
    console.log('    - 仓库数量:', driverWarehouseIds.length)
    console.log('    - 仓库ID列表:', driverWarehouseIds)
    logger.info('司机所在仓库', {driverId, warehouseIds: driverWarehouseIds})

    // 步骤2：获取管理这些仓库的车队长
    console.log('  📊 步骤 3.2: 查询管理这些仓库的用户')
    console.log('    - 表: warehouse_assignments')
    console.log('    - 条件: warehouse_id IN', driverWarehouseIds)

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
      console.warn('  ⚠️ 没有用户管理这些仓库')
      logger.info('没有车队长管理这些仓库', {warehouseIds: driverWarehouseIds})
      return []
    }

    const managerIds = [...new Set(managerWarehouses.map((mw) => mw.user_id))]
    console.log('  ✅ 找到管理这些仓库的用户:')
    console.log('    - 用户数量:', managerIds.length)
    console.log('    - 用户ID列表:', managerIds)
    logger.info('找到车队长ID列表', {managerIds})

    // 步骤3：获取车队长的详细信息（单用户架构：从 users 和 user_roles 表查询）
    console.log('  📊 步骤 3.3: 查询用户详细信息和角色')
    console.log('    - 查询 users 表')
    console.log('    - 查询 user_roles 表（筛选 MANAGER 角色）')

    const [{data: users, error: usersError}, {data: roles}] = await Promise.all([
      supabase.from('users').select('id, name').in('id', managerIds),
      supabase.from('users').select('id, role').eq('role', 'MANAGER').in('id', managerIds)
    ])

    if (usersError) {
      console.error('  ❌ 查询用户信息失败:', usersError)
      logger.error('获取车队长信息失败', {error: usersError, managerIds})
      return []
    }

    console.log('  📊 查询结果:')
    console.log('    - 用户数量:', users?.length || 0)
    console.log('    - MANAGER 角色数量:', roles?.length || 0)

    // 合并用户和角色数据
    const managers = users
      ?.filter((user) => roles?.some((r) => r.id === user.id))
      .map((user) => ({
        ...user,
        role: roles?.find((r) => r.id === user.id)?.role || 'DRIVER'
      }))

    if (!managers || managers.length === 0) {
      console.warn('  ⚠️ 未找到车队长（没有用户具有 MANAGER 角色）')
      logger.warn('未找到车队长信息', {managerIds})
      return []
    }

    const result = managers.map((m) => ({
      userId: m.id,
      name: m.name || '车队长',
      role: m.role
    }))

    console.log('  ✅ 找到有管辖权的车队长:')
    result.forEach((m, index) => {
      console.log(`    [${index + 1}] ${m.name} (${m.userId})`)
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ [通知服务] 车队长查询成功，共', result.length, '位')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    logger.info('找到有管辖权的车队长', {count: result.length})
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
    console.log('')
    console.log('╔═══════════════════════════════════════════════════════════════╗')
    console.log('║                   📬 发送司机提交申请通知                      ║')
    console.log('╚═══════════════════════════════════════════════════════════════╝')
    console.log('')
    console.log('📋 通知参数:')
    console.log('  - 司机ID:', params.driverId)
    console.log('  - 司机姓名:', params.driverName)
    console.log('  - 通知类型:', params.type)
    console.log('  - 通知标题:', params.title)
    console.log('  - 通知内容:', params.content)
    console.log('  - 关联ID:', params.relatedId || '(无)')
    console.log('  - 批次ID:', params.batchId || '(无)')
    console.log('  - 审批状态:', params.approvalStatus || '(无)')
    console.log('')
    logger.info('📬 发送司机提交申请通知', params)

    // 参数验证：确保 driverId 是有效的 UUID
    if (!params.driverId || params.driverId === 'anon' || params.driverId.length < 10) {
      console.error('❌ 参数验证失败: 无效的司机ID')
      console.error('  - 司机ID:', params.driverId)
      logger.error('❌ 无效的司机ID，无法发送通知', {driverId: params.driverId})
      return false
    }

    console.log('✅ 参数验证通过')
    console.log('')

    const recipientMap = new Map<string, NotificationRecipient>()

    // 🚀 性能优化：并行执行所有独立查询
    console.log('🚀 开始并行查询通知接收者...')
    console.log('  - 查询 1: 主账号（老板）')
    console.log('  - 查询 2: 平级账号')
    console.log('  - 查询 3: 有管辖权的车队长')
    console.log('')

    const [primaryAdmin, peerAccounts, managers] = await Promise.all([
      getPrimaryAdmin(),
      getPeerAccounts(),
      getManagersWithJurisdiction(params.driverId)
    ])

    console.log('✅ 所有查询完成，开始汇总接收者...')
    console.log('')

    // 1. 处理主账号（老板）
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 汇总结果 - 主账号（老板）')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (primaryAdmin) {
      recipientMap.set(primaryAdmin.userId, primaryAdmin)
      console.log('  ✅ 将通知主账号')
      console.log('    - 用户ID:', primaryAdmin.userId)
      console.log('    - 姓名:', primaryAdmin.name)
      console.log('    - 角色:', primaryAdmin.role)
      logger.info('✅ 将通知主账号（老板）', {userId: primaryAdmin.userId})
    } else {
      console.warn('  ⚠️ 未找到主账号，跳过主账号通知')
      logger.warn('⚠️ 未找到主账号，跳过主账号通知')
    }
    console.log('')

    // 2. 处理平级账号
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 汇总结果 - 平级账号')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (peerAccounts.length > 0) {
      for (const peer of peerAccounts) {
        recipientMap.set(peer.userId, peer)
      }
      console.log('  ✅ 将通知平级账号，共', peerAccounts.length, '位')
      peerAccounts.forEach((peer, index) => {
        console.log(`    [${index + 1}] ${peer.name} (${peer.userId})`)
      })
      logger.info('✅ 将通知平级账号', {count: peerAccounts.length})
    } else {
      console.log('  ℹ️ 不存在平级账号，跳过平级账号通知')
      logger.info('ℹ️ 不存在平级账号，跳过平级账号通知')
    }
    console.log('')

    // 3. 处理有管辖权的车队长
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 汇总结果 - 有管辖权的车队长')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (managers.length > 0) {
      for (const manager of managers) {
        recipientMap.set(manager.userId, manager)
      }
      console.log('  ✅ 将通知有管辖权的车队长，共', managers.length, '位')
      managers.forEach((manager, index) => {
        console.log(`    [${index + 1}] ${manager.name} (${manager.userId})`)
      })
      logger.info('✅ 将通知有管辖权的车队长', {count: managers.length})
    } else {
      console.log('  ℹ️ 没有对该司机有管辖权的车队长，跳过车队长通知')
      logger.info('ℹ️ 没有对该司机有管辖权的车队长，跳过车队长通知')
    }
    console.log('')

    const recipients = Array.from(recipientMap.values())
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 最终接收者统计')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  - 总人数:', recipients.length)
    console.log('  - 接收者列表:')
    recipients.forEach((recipient, index) => {
      console.log(`    [${index + 1}] ${recipient.name} (${recipient.role}) - ${recipient.userId}`)
    })
    console.log('')
    logger.info('📊 通知接收者总数', {count: recipients.length})

    // 如果没有任何接收者，记录警告但不返回失败
    if (recipients.length === 0) {
      console.warn('⚠️ 没有找到任何通知接收者')
      console.warn('  - 可能原因:')
      console.warn('    1. 系统中没有老板账号')
      console.warn('    2. 司机未分配仓库')
      console.warn('    3. 仓库没有分配车队长')
      console.log('')
      logger.warn('⚠️ 没有找到任何通知接收者，通知发送完成（无接收者）')
      return true // 返回 true 表示没有错误，只是没有接收者
    }

    // 批量创建通知
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📮 创建通知记录')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  - 通知数量:', recipients.length)
    console.log('  - 通知类型:', params.type)
    console.log('  - 批次ID:', params.batchId || '(无)')
    console.log('  - 审批状态:', params.approvalStatus || '(无)')
    console.log('')

    const notifications = recipients.map((recipient) => ({
      userId: recipient.userId,
      type: params.type,
      title: params.title,
      message: params.content,
      relatedId: params.relatedId,
      batchId: params.batchId, // 批次ID
      approvalStatus: params.approvalStatus // 审批状态
    }))

    console.log('  📝 准备创建的通知:')
    notifications.forEach((notif, index) => {
      console.log(`    [${index + 1}] 接收者: ${notif.userId}`)
      console.log(`        标题: ${notif.title}`)
      console.log(`        类型: ${notif.type}`)
      console.log(`        关联ID: ${notif.relatedId || '(无)'}`)
      console.log(`        批次ID: ${notif.batchId || '(无)'}`)
      console.log(`        审批状态: ${notif.approvalStatus || '(无)'}`)
    })
    console.log('')

    const success = await createNotifications(notifications)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (success) {
      console.log('✅ 通知发送成功')
      console.log('  - 成功创建', notifications.length, '条通知')
    } else {
      console.error('❌ 通知发送失败')
      console.error('  - 请检查数据库连接和 RLS 策略')
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    logger.info('📮 通知发送结果', {success, count: notifications.length})

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
