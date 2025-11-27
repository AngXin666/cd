/**
 * 租户工具函数
 *
 * 提供多租户数据隔离相关的辅助函数
 */

import {supabase} from './supabase'
import type {UserRole} from './types'

/**
 * 获取当前登录用户ID
 *
 * @throws {Error} 如果用户未登录
 * @returns {Promise<string>} 用户ID
 */
export async function getCurrentUserId(): Promise<string> {
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('用户未登录')
  }

  return user.id
}

/**
 * 安全地获取当前用户ID（不抛出异常）
 *
 * @returns {Promise<string | null>} 用户ID，如果未登录则返回 null
 */
export async function getCurrentUserIdSafe(): Promise<string | null> {
  try {
    return await getCurrentUserId()
  } catch {
    return null
  }
}

/**
 * 获取用户角色
 *
 * @param {string} userId - 用户ID
 * @throws {Error} 如果获取失败
 * @returns {Promise<UserRole>} 用户角色
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const {data, error} = await supabase.from('profiles').select('role').eq('id', userId).single()

  if (error || !data) {
    throw new Error('获取用户角色失败')
  }

  return data.role
}

/**
 * 获取用户角色（带缓存）
 *
 * 缓存5分钟，减少数据库查询
 */
const roleCache = new Map<string, {role: UserRole; expireAt: number}>()

export async function getUserRoleCached(userId: string): Promise<UserRole> {
  const cached = roleCache.get(userId)

  // 检查缓存是否有效（5分钟过期）
  if (cached && cached.expireAt > Date.now()) {
    return cached.role
  }

  // 从数据库获取
  const role = await getUserRole(userId)

  // 更新缓存
  roleCache.set(userId, {
    role,
    expireAt: Date.now() + 5 * 60 * 1000 // 5分钟
  })

  return role
}

/**
 * 清除用户角色缓存
 *
 * @param {string} userId - 用户ID
 */
export function clearRoleCache(userId: string): void {
  roleCache.delete(userId)
}

/**
 * 清除所有角色缓存
 */
export function clearAllRoleCache(): void {
  roleCache.clear()
}

/**
 * 检查用户是否为超级管理员
 *
 * @param {string} [userId] - 用户ID，默认为当前用户
 * @returns {Promise<boolean>} 是否为超级管理员
 */
export async function isSuperAdmin(userId?: string): Promise<boolean> {
  const uid = userId || (await getCurrentUserId())
  const role = await getUserRoleCached(uid)
  return role === 'super_admin'
}

/**
 * 检查用户是否为管理员
 *
 * @param {string} [userId] - 用户ID，默认为当前用户
 * @returns {Promise<boolean>} 是否为管理员
 */
export async function isManager(userId?: string): Promise<boolean> {
  const uid = userId || (await getCurrentUserId())
  const role = await getUserRoleCached(uid)
  return role === 'manager'
}

/**
 * 检查用户是否为司机
 *
 * @param {string} [userId] - 用户ID，默认为当前用户
 * @returns {Promise<boolean>} 是否为司机
 */
export async function isDriver(userId?: string): Promise<boolean> {
  const uid = userId || (await getCurrentUserId())
  const role = await getUserRoleCached(uid)
  return role === 'driver'
}

/**
 * 检查用户是否为租赁管理员
 *
 * @param {string} [userId] - 用户ID，默认为当前用户
 * @returns {Promise<boolean>} 是否为租赁管理员
 */
export async function isLeaseAdmin(userId?: string): Promise<boolean> {
  const uid = userId || (await getCurrentUserId())
  const role = await getUserRoleCached(uid)
  return role === 'lease_admin'
}

/**
 * 检查用户是否可以访问指定资源
 *
 * @param {string} resourceUserId - 资源所属用户ID
 * @param {string} [currentUserId] - 当前用户ID，默认为当前登录用户
 * @returns {Promise<boolean>} 是否有权限访问
 */
export async function canAccessResource(resourceUserId: string, currentUserId?: string): Promise<boolean> {
  const userId = currentUserId || (await getCurrentUserId())

  // 如果是自己的资源，直接允许
  if (userId === resourceUserId) {
    return true
  }

  // 获取当前用户角色
  const role = await getUserRoleCached(userId)

  // 超级管理员可以访问所有资源
  if (role === 'super_admin') {
    return true
  }

  // 车队长需要检查是否在同一仓库
  if (role === 'manager') {
    return await isInSameWarehouse(userId, resourceUserId)
  }

  // 司机不能访问其他人的资源
  return false
}

/**
 * 检查两个用户是否在同一仓库
 *
 * @param {string} userId1 - 用户1的ID
 * @param {string} userId2 - 用户2的ID
 * @returns {Promise<boolean>} 是否在同一仓库
 */
async function isInSameWarehouse(userId1: string, userId2: string): Promise<boolean> {
  // 获取用户1管理的仓库
  const {data: warehouses1} = await supabase
    .from('warehouse_assignments')
    .select('warehouse_id')
    .eq('manager_id', userId1)

  // 获取用户2所在的仓库
  const {data: warehouses2} = await supabase
    .from('warehouse_assignments')
    .select('warehouse_id')
    .eq('driver_id', userId2)

  if (!warehouses1 || !warehouses2) {
    return false
  }

  // 检查是否有交集
  const warehouseIds1 = warehouses1.map((w) => w.warehouse_id)
  const warehouseIds2 = warehouses2.map((w) => w.warehouse_id)

  return warehouseIds1.some((id) => warehouseIds2.includes(id))
}

/**
 * 检查用户是否可以访问指定仓库
 *
 * @param {string} warehouseId - 仓库ID
 * @param {string} [userId] - 用户ID，默认为当前用户
 * @returns {Promise<boolean>} 是否有权限访问
 */
export async function canAccessWarehouse(warehouseId: string, userId?: string): Promise<boolean> {
  const uid = userId || (await getCurrentUserId())
  const role = await getUserRoleCached(uid)

  // 超级管理员可以访问所有仓库
  if (role === 'super_admin') {
    return true
  }

  // 管理员检查是否管理该仓库
  if (role === 'manager') {
    const {data} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('manager_id', uid)
      .eq('warehouse_id', warehouseId)
      .single()

    return !!data
  }

  // 司机检查是否分配到该仓库
  if (role === 'driver') {
    const {data} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('driver_id', uid)
      .eq('warehouse_id', warehouseId)
      .single()

    return !!data
  }

  return false
}

/**
 * 为插入操作自动添加 created_by 字段
 *
 * @template T - 数据类型
 * @param {T} data - 要插入的数据
 * @returns {Promise<T & { created_by: string }>} 添加了 created_by 字段的数据
 *
 * @example
 * ```typescript
 * const newWarehouse = await addCreatedBy({
 *   name: '仓库A',
 *   is_active: true
 * })
 * // newWarehouse 现在包含 created_by 字段
 * ```
 */
export async function addCreatedBy<T extends Record<string, any>>(data: T): Promise<T & {created_by: string}> {
  const userId = await getCurrentUserId()
  return {
    ...data,
    created_by: userId
  }
}

/**
 * 批量为插入操作添加 created_by 字段
 *
 * @template T - 数据类型
 * @param {T[]} dataArray - 要插入的数据数组
 * @returns {Promise<Array<T & { created_by: string }>>} 添加了 created_by 字段的数据数组
 *
 * @example
 * ```typescript
 * const newRecords = await addCreatedByBatch([
 *   { name: '记录1' },
 *   { name: '记录2' }
 * ])
 * ```
 */
export async function addCreatedByBatch<T extends Record<string, any>>(
  dataArray: T[]
): Promise<Array<T & {created_by: string}>> {
  const userId = await getCurrentUserId()
  return dataArray.map((data) => ({
    ...data,
    created_by: userId
  }))
}

/**
 * 验证用户是否有权限执行操作
 *
 * @param {string} resourceUserId - 资源所属用户ID
 * @param {'read' | 'write' | 'delete'} action - 操作类型
 * @throws {Error} 如果没有权限
 */
export async function validateAccess(resourceUserId: string, action: 'read' | 'write' | 'delete'): Promise<void> {
  const currentUserId = await getCurrentUserId()
  const hasAccess = await canAccessResource(resourceUserId, currentUserId)

  if (!hasAccess) {
    // 记录越权访问尝试
    console.warn('[安全警告] 越权访问尝试:', {
      currentUserId,
      resourceUserId,
      action,
      timestamp: new Date().toISOString()
    })

    throw new Error('无权访问该资源')
  }
}

/**
 * 获取用户可访问的仓库ID列表
 *
 * @param {string} [userId] - 用户ID，默认为当前用户
 * @returns {Promise<string[]>} 仓库ID列表
 */
export async function getAccessibleWarehouseIds(userId?: string): Promise<string[]> {
  const uid = userId || (await getCurrentUserId())
  const role = await getUserRoleCached(uid)

  // 超级管理员可以访问所有仓库
  if (role === 'super_admin') {
    const {data} = await supabase.from('warehouses').select('id')
    return data?.map((w) => w.id) || []
  }

  // 管理员获取管理的仓库
  if (role === 'manager') {
    const {data} = await supabase.from('warehouse_assignments').select('warehouse_id').eq('manager_id', uid)
    return data?.map((w) => w.warehouse_id) || []
  }

  // 司机获取分配的仓库
  if (role === 'driver') {
    const {data} = await supabase.from('warehouse_assignments').select('warehouse_id').eq('driver_id', uid)
    return data?.map((w) => w.warehouse_id) || []
  }

  return []
}

/**
 * 数据访问日志接口
 */
interface DataAccessLog {
  userId: string
  table: string
  action: 'select' | 'insert' | 'update' | 'delete'
  success: boolean
  duration: number
  error?: string
  timestamp: string
}

/**
 * 记录数据访问日志
 *
 * @param {DataAccessLog} log - 日志信息
 */
export async function logDataAccess(log: DataAccessLog): Promise<void> {
  // 在开发环境打印日志
  if (process.env.NODE_ENV === 'development') {
    console.log('[数据访问]', log)
  }

  // 在生产环境可以将日志发送到日志服务
  // 例如：await sendToLogService(log)
}

/**
 * 数据访问拦截器
 *
 * 在所有数据库操作前后执行检查和日志记录
 */
export class DataAccessInterceptor {
  /**
   * 拦截查询操作
   *
   * @template T - 返回类型
   * @param {() => Promise<T>} operation - 要执行的操作
   * @param {Object} context - 操作上下文
   * @returns {Promise<T>} 操作结果
   */
  static async intercept<T>(
    operation: () => Promise<T>,
    context: {
      table: string
      action: 'select' | 'insert' | 'update' | 'delete'
      userId?: string
    }
  ): Promise<T> {
    const startTime = Date.now()
    const userId = context.userId || (await getCurrentUserIdSafe())

    try {
      // 执行操作
      const result = await operation()

      // 记录访问日志
      if (userId) {
        await logDataAccess({
          userId,
          table: context.table,
          action: context.action,
          success: true,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        })
      }

      return result
    } catch (error) {
      // 记录错误日志
      if (userId) {
        await logDataAccess({
          userId,
          table: context.table,
          action: context.action,
          success: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : '未知错误',
          timestamp: new Date().toISOString()
        })
      }

      throw error
    }
  }
}

/**
 * 获取当前用户的 boss_id
 *
 * @param userId 可选的用户ID，如果不提供则从 supabase.auth.getUser() 获取
 * @returns boss_id 或 null
 */
export async function getCurrentUserBossId(userId?: string): Promise<string | null> {
  try {
    let currentUserId = userId

    // 如果没有提供 userId，则从认证系统获取
    if (!currentUserId) {
      const {
        data: {user}
      } = await supabase.auth.getUser()

      if (!user) {
        console.warn('⚠️ getCurrentUserBossId: 未找到当前用户')
        return null
      }

      currentUserId = user.id
    }

    console.log('🔍 getCurrentUserBossId: 查询用户信息', {userId: currentUserId})

    // 从 profiles 表获取用户的 boss_id 和 role
    const {data, error} = await supabase
      .from('profiles')
      .select('boss_id, role, name')
      .eq('id', currentUserId)
      .maybeSingle()

    if (error) {
      console.error('❌ 获取 boss_id 失败:', error)
      return null
    }

    if (!data) {
      console.warn('⚠️ getCurrentUserBossId: 未找到用户 profile', {userId: currentUserId})
      return null
    }

    console.log('📋 getCurrentUserBossId: 用户信息', {
      userId: currentUserId,
      name: data.name,
      role: data.role,
      boss_id: data.boss_id
    })

    // 如果是老板（super_admin），boss_id 为 NULL，返回自己的 ID
    if (!data.boss_id && data.role === 'super_admin') {
      console.log('✅ getCurrentUserBossId: 当前用户是老板，返回自己的 ID', {bossId: currentUserId})
      return currentUserId
    }

    if (!data.boss_id) {
      console.warn('⚠️ getCurrentUserBossId: 用户的 boss_id 为 NULL，且不是老板', {
        userId: currentUserId,
        role: data.role
      })
      return null
    }

    console.log('✅ getCurrentUserBossId: 返回 boss_id', {bossId: data.boss_id})
    return data.boss_id
  } catch (error) {
    console.error('💥 获取 boss_id 异常:', error)
    return null
  }
}
