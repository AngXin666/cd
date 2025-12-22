/**
 * 用户数据 Repository
 * 提供用户列表的查询和缓存管理
 *
 * 功能包括：
 * - 获取所有司机列表（带缓存，TTL 5 分钟）
 * - 获取所有管理员列表（带缓存，TTL 5 分钟）
 * - 获取单个用户信息（带缓存）
 * - 获取多个用户信息（带缓存）
 * - 根据角色获取用户列表（带缓存）
 * - 在用户创建/更新/删除时自动清除缓存
 *
 * @module db/repositories/UsersRepository
 */

import { supabase } from '@/client/supabase'
import { getCache, setCache, clearCacheByPrefix, CACHE_KEYS } from '@/utils/cache'
import { createLogger, Logger } from '@/utils/logger'
import type { Profile, UserRole, UserWithRole } from '../types'
import { PermissionAction, checkCurrentUserPermission } from '@/services/permission-service'
import { warehouseAssignmentsRepository } from './WarehouseAssignmentsRepository'

// 重新导出 UserWithRole 类型，保持向后兼容
// 注意：UserWithRole 的主定义在 src/db/types.ts 中
export type { UserWithRole }

/**
 * 将 UserWithRole 转换为 Profile 格式（向后兼容）
 *
 * 该函数将数据库查询返回的用户数据转换为 Profile 接口格式，
 * 确保所有字段都被正确映射。
 *
 * @param user 用户数据（从数据库查询返回）
 * @returns Profile 对象（包含所有必要字段）
 */
export function convertUserToProfile(user: UserWithRole): Profile {
  return {
    // 基本信息
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    // 角色信息
    role: user.role || 'DRIVER',
    driver_type: user.driver_type || null,
    // 权限信息
    manager_permissions_enabled: user.manager_permissions_enabled,
    main_account_id: user.main_account_id,
    peer_account_permission: user.peer_account_permission,
    // 扩展信息
    nickname: user.nickname || null,
    join_date: user.join_date || null,
    company_name: user.company_name || null,
    vehicle_plate: user.vehicle_plate || null,
    login_account: user.login_account || null,
    status: user.status || null,
    is_active: user.is_active,
    // 地址信息
    address_province: user.address_province || null,
    address_city: user.address_city || null,
    address_district: user.address_district || null,
    address_detail: user.address_detail || null,
    // 紧急联系人
    emergency_contact_name: user.emergency_contact_name || null,
    emergency_contact_phone: user.emergency_contact_phone || null,
    emergency_contact_relationship: user.emergency_contact_relationship || null,
    // 租赁信息
    lease_start_date: user.lease_start_date || null,
    lease_end_date: user.lease_end_date || null,
    monthly_fee: user.monthly_fee || null,
    notes: user.notes || null,
    // 会话信息
    session_token: user.session_token || null,
    // 时间戳
    created_at: user.created_at,
    updated_at: user.updated_at
  }
}

/**
 * 批量转换用户数据为 Profile 格式
 *
 * @param users 用户数据数组
 * @returns Profile 对象数组
 */
export function convertUsersToProfiles(users: UserWithRole[]): Profile[] {
  return users.map(convertUserToProfile)
}

/**
 * 用户缓存配置
 */
const USERS_CACHE_CONFIG = {
  /** 缓存键前缀 */
  PREFIX: 'users_repo',
  /** 缓存 TTL：5 分钟（用户数据变化频率适中） */
  TTL: 5 * 60 * 1000
}

/**
 * 用户数据 Repository 类
 *
 * 提供用户列表的查询功能，内置缓存管理。
 * 缓存 TTL 为 5 分钟，适合用户列表的更新频率。
 *
 * @example
 * ```typescript
 * const usersRepo = new UsersRepository()
 *
 * // 获取所有司机列表
 * const drivers = await usersRepo.getAllDrivers()
 *
 * // 获取所有管理员列表
 * const managers = await usersRepo.getAllManagers()
 *
 * // 获取单个用户信息
 * const user = await usersRepo.getById('user-id')
 *
 * // 清除缓存（数据变更后调用）
 * usersRepo.invalidateCache()
 * ```
 */
export class UsersRepository {
  /** 日志记录器实例 */
  private readonly logger: Logger

  /** 是否启用缓存 */
  private readonly enableCache: boolean

  /**
   * 创建 UsersRepository 实例
   *
   * @param enableCache - 是否启用缓存，默认 true
   */
  constructor(enableCache: boolean = true) {
    this.enableCache = enableCache
    this.logger = createLogger('UsersRepository')
    this.logger.debug('UsersRepository 初始化完成', { enableCache })
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 生成缓存键
   *
   * @param suffix - 缓存键后缀
   * @returns 完整的缓存键
   */
  private getCacheKey(suffix: string): string {
    return `${USERS_CACHE_CONFIG.PREFIX}_${suffix}`
  }

  /**
   * 从缓存获取数据
   *
   * @template R - 返回数据类型
   * @param key - 缓存键
   * @returns 缓存的数据，如果不存在则返回 null
   */
  private getFromCache<R>(key: string): R | null {
    if (!this.enableCache) {
      return null
    }

    const cached = getCache<R>(key)
    if (cached !== null) {
      this.logger.debug('缓存命中', { key })
      return cached
    }

    this.logger.debug('缓存未命中', { key })
    return null
  }

  /**
   * 设置缓存数据
   *
   * @template R - 数据类型
   * @param key - 缓存键
   * @param value - 要缓存的数据
   */
  private setToCache<R>(key: string, value: R): void {
    if (!this.enableCache) {
      return
    }

    setCache(key, value, USERS_CACHE_CONFIG.TTL)
    this.logger.debug('缓存已设置', { key, ttl: USERS_CACHE_CONFIG.TTL })
  }

  /**
   * 清除所有用户相关缓存
   * 在用户创建/更新/删除时调用此方法确保下次查询获取最新数据
   */
  public invalidateCache(): void {
    clearCacheByPrefix(USERS_CACHE_CONFIG.PREFIX)
    // 同时清除旧的缓存键（兼容）
    clearCacheByPrefix(CACHE_KEYS.ALL_USERS)
    clearCacheByPrefix(CACHE_KEYS.MANAGER_DRIVERS)
    this.logger.info('用户缓存已清除')
  }

  /**
   * 公开的缓存失效方法（与 BaseRepository 接口一致）
   * 清除该 Repository 的所有缓存
   *
   * 使用场景：
   * - Realtime 事件触发缓存失效
   * - 事件驱动的跨 Repository 缓存失效
   * - 登出时清除所有缓存
   */
  public clearAllCache(): void {
    this.invalidateCache()
  }

  // ==================== 核心数据查询方法 ====================

  /**
   * 根据 ID 获取单个用户信息（带缓存）
   *
   * @param userId - 用户 ID
   * @returns 用户信息，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const user = await usersRepo.getById('user-123')
   * if (user) {
   *   console.log(`用户名: ${user.name}`)
   * }
   * ```
   */
  async getById(userId: string): Promise<UserWithRole | null> {
    // 1. 尝试从缓存获取
    const cacheKey = this.getCacheKey(`user_${userId}`)
    const cached = this.getFromCache<UserWithRole>(cacheKey)
    if (cached) {
      return cached
    }

    // 2. 从数据库查询
    this.logger.debug('从数据库查询用户', { userId })
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      this.logger.error('查询用户失败', { userId, error })
      throw new Error(`查询用户失败: ${error.message}`)
    }

    // 3. 缓存结果
    if (user) {
      this.setToCache(cacheKey, user)
    }

    return user
  }

  /**
   * 根据 ID 列表获取多个用户信息（带缓存）
   *
   * @param userIds - 用户 ID 数组（可选，不传则查询所有用户）
   * @returns 用户信息数组
   *
   * @example
   * ```typescript
   * // 获取指定用户
   * const users = await usersRepo.getByIds(['user-1', 'user-2'])
   *
   * // 获取所有用户
   * const allUsers = await usersRepo.getByIds()
   * ```
   */
  async getByIds(userIds?: string[]): Promise<UserWithRole[]> {
    // 生成缓存键
    const cacheKey = userIds && userIds.length > 0
      ? this.getCacheKey(`users_${userIds.sort().join('_')}`)
      : this.getCacheKey('all_users_with_role')

    // 1. 尝试从缓存获取
    const cached = this.getFromCache<UserWithRole[]>(cacheKey)
    if (cached) {
      return cached
    }

    // 2. 从数据库查询
    this.logger.debug('从数据库查询用户列表', { userIds })

    let query = supabase.from('users').select('*')

    if (userIds && userIds.length > 0) {
      query = query.in('id', userIds)
    }

    const { data: users, error } = await query

    if (error) {
      this.logger.error('查询用户列表失败', { userIds, error })
      throw new Error(`查询用户失败: ${error.message}`)
    }

    const result = users || []

    // 3. 缓存结果
    this.setToCache(cacheKey, result)

    return result
  }

  /**
   * 根据角色获取用户列表（带缓存）
   *
   * @param role - 用户角色
   * @returns 用户信息数组
   *
   * @example
   * ```typescript
   * const drivers = await usersRepo.getByRole('DRIVER')
   * const managers = await usersRepo.getByRole('MANAGER')
   * ```
   */
  async getByRole(role: UserRole): Promise<UserWithRole[]> {
    // 1. 尝试从缓存获取
    const cacheKey = this.getCacheKey(`role_${role}`)
    const cached = this.getFromCache<UserWithRole[]>(cacheKey)
    if (cached) {
      return cached
    }

    // 2. 从数据库查询
    this.logger.debug('从数据库查询角色用户列表', { role })

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)

    if (error) {
      this.logger.error('查询角色用户列表失败', { role, error })
      throw new Error(`查询用户失败: ${error.message}`)
    }

    const result = users || []

    // 3. 缓存结果
    this.setToCache(cacheKey, result)

    return result
  }

  /**
   * 获取用户角色（带缓存）
   *
   * @param userId - 用户 ID
   * @returns 用户角色，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const role = await usersRepo.getRole('user-123')
   * if (role === 'DRIVER') {
   *   console.log('这是一个司机')
   * }
   * ```
   */
  async getRole(userId: string): Promise<UserRole | null> {
    // 1. 尝试从缓存获取
    const cacheKey = this.getCacheKey(`role_of_${userId}`)
    const cached = this.getFromCache<UserRole | null>(cacheKey)
    if (cached !== null) {
      return cached
    }

    // 2. 从数据库查询
    this.logger.debug('从数据库查询用户角色', { userId })

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      this.logger.error('查询用户角色失败', { userId, error })
      return null
    }

    const role = data?.role || null

    // 3. 缓存结果
    if (role) {
      this.setToCache(cacheKey, role)
    }

    return role
  }

  /**
   * 检查用户是否具有指定角色（带缓存）
   *
   * @param userId - 用户 ID
   * @param role - 要检查的角色
   * @returns 是否具有该角色
   *
   * @example
   * ```typescript
   * const isDriver = await usersRepo.hasRole('user-123', 'DRIVER')
   * if (isDriver) {
   *   console.log('用户是司机')
   * }
   * ```
   */
  async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const userRole = await this.getRole(userId)
    return userRole === role
  }

  /**
   * 获取所有司机列表（带缓存）
   *
   * 根据当前用户的角色和权限，返回可见的司机列表。
   * - 老板可以看到所有司机
   * - 管理员只能看到自己管辖仓库的司机
   *
   * @returns 司机档案列表
   *
   * @example
   * ```typescript
   * const drivers = await usersRepo.getAllDrivers()
   * console.log(`共有 ${drivers.length} 名司机`)
   * ```
   */
  async getAllDrivers(): Promise<Profile[]> {
    // 1. 获取当前用户信息用于生成缓存键
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      this.logger.warn('用户未登录，无法获取司机列表')
      return []
    }

    // 2. 尝试从缓存获取
    const cacheKey = this.getCacheKey(`drivers_${user.id}`)
    const cached = this.getFromCache<Profile[]>(cacheKey)
    if (cached) {
      return cached
    }

    // 3. 从数据库查询
    this.logger.debug('从数据库查询司机列表', { userId: user.id })
    const result = await this.fetchAllDrivers(user.id)

    // 4. 缓存结果
    this.setToCache(cacheKey, result)

    return result
  }

  /**
   * 获取所有管理员列表（带缓存）
   *
   * 根据当前用户的角色和权限，返回可见的管理员列表。
   * - 老板可以看到所有管理员
   * - 管理员只能看到同级别的管理员
   *
   * @returns 管理员档案列表
   *
   * @example
   * ```typescript
   * const managers = await usersRepo.getAllManagers()
   * console.log(`共有 ${managers.length} 名管理员`)
   * ```
   */
  async getAllManagers(): Promise<Profile[]> {
    // 1. 获取当前用户信息用于生成缓存键
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      this.logger.warn('用户未登录，无法获取管理员列表')
      return []
    }

    // 2. 尝试从缓存获取
    const cacheKey = this.getCacheKey(`managers_${user.id}`)
    const cached = this.getFromCache<Profile[]>(cacheKey)
    if (cached) {
      return cached
    }

    // 3. 从数据库查询
    this.logger.debug('从数据库查询管理员列表', { userId: user.id })
    const result = await this.fetchAllManagers(user.id)

    // 4. 缓存结果
    this.setToCache(cacheKey, result)

    return result
  }

  /**
   * 获取所有用户列表（带缓存）
   *
   * 返回系统中所有用户的列表。
   *
   * @returns 用户档案列表
   *
   * @example
   * ```typescript
   * const users = await usersRepo.getAllUsers()
   * console.log(`共有 ${users.length} 名用户`)
   * ```
   */
  async getAllUsers(): Promise<Profile[]> {
    // 1. 尝试从缓存获取
    const cacheKey = this.getCacheKey('all_users')
    const cached = this.getFromCache<Profile[]>(cacheKey)
    if (cached) {
      return cached
    }

    // 2. 从数据库查询
    this.logger.debug('从数据库查询所有用户列表')
    const result = await this.fetchAllUsers()

    // 3. 缓存结果
    this.setToCache(cacheKey, result)

    return result
  }

  // ==================== 私有查询方法 ====================

  /**
   * 从数据库获取所有司机列表
   *
   * @param currentUserId - 当前用户ID
   * @returns 司机档案列表
   */
  private async fetchAllDrivers(currentUserId: string): Promise<Profile[]> {
    try {
      // 获取当前用户的角色信息
      const userWithRole = await this.getById(currentUserId)
      if (!userWithRole) {
        this.logger.warn('无法获取当前用户信息', { currentUserId })
        return []
      }

      // 根据当前用户角色获取可见的司机列表
      const drivers = await this.getByRoleWithPermission('DRIVER', userWithRole)

      if (!drivers || drivers.length === 0) {
        this.logger.debug('未找到司机', { currentUserId })
        return []
      }

      // 转换为 Profile 格式
      const profiles = convertUsersToProfiles(drivers)

      this.logger.debug('司机列表查询完成', {
        currentUserId,
        driverCount: profiles.length
      })

      return profiles
    } catch (error) {
      this.logger.error('获取司机列表失败', { currentUserId, error })
      return []
    }
  }

  /**
   * 从数据库获取所有管理员列表
   *
   * @param currentUserId - 当前用户ID
   * @returns 管理员档案列表
   */
  private async fetchAllManagers(currentUserId: string): Promise<Profile[]> {
    try {
      // 获取当前用户的角色信息
      const userWithRole = await this.getById(currentUserId)
      if (!userWithRole) {
        this.logger.warn('无法获取当前用户信息', { currentUserId })
        return []
      }

      // 根据当前用户角色获取可见的管理员列表
      const managers = await this.getByRoleWithPermission('MANAGER', userWithRole)

      if (!managers || managers.length === 0) {
        this.logger.debug('未找到管理员', { currentUserId })
        return []
      }

      // 转换为 Profile 格式
      const profiles = convertUsersToProfiles(managers)

      this.logger.debug('管理员列表查询完成', {
        currentUserId,
        managerCount: profiles.length
      })

      return profiles
    } catch (error) {
      this.logger.error('获取管理员列表失败', { currentUserId, error })
      return []
    }
  }

  /**
   * 从数据库获取所有用户列表
   *
   * @returns 用户档案列表
   */
  private async fetchAllUsers(): Promise<Profile[]> {
    try {
      const users = await this.getByIds()

      if (!users || users.length === 0) {
        this.logger.debug('未找到用户')
        return []
      }

      // 转换为 Profile 格式
      const profiles = convertUsersToProfiles(users)

      this.logger.debug('用户列表查询完成', {
        userCount: profiles.length
      })

      return profiles
    } catch (error) {
      this.logger.error('获取用户列表失败', { error })
      return []
    }
  }

  /**
   * 根据角色获取用户列表（带权限过滤）
   *
   * 根据当前用户的角色和权限，返回可见的用户列表。
   * - 老板可以看到所有用户
   * - 管理员只能看到自己管辖仓库的用户
   *
   * @param role - 要查询的角色
   * @param currentUser - 当前用户信息
   * @returns 用户信息数组
   */
  async getByRoleWithPermission(
    role: UserRole,
    currentUser?: { id: string; role?: string | null } | null
  ): Promise<UserWithRole[]> {
    try {
      if (!currentUser) {
        this.logger.error('用户未登录')
        throw new Error('用户未登录')
      }

      // 权限检查
      const permissionResult = checkCurrentUserPermission('users', PermissionAction.SELECT, {
        id: currentUser.id,
        role: currentUser.role || undefined
      })
      if (!permissionResult.hasPermission) {
        this.logger.error('查询用户权限不足', { error: permissionResult.error })
        throw new Error('查询用户权限不足')
      }

      let query = supabase.from('users').select('*').eq('role', role)

      // 应用数据过滤
      if (permissionResult.filter) {
        // 对于车队长角色，需要特殊处理：查看管辖仓库下的司机
        if (currentUser.role === 'MANAGER' && role === 'DRIVER') {
          // 获取车队长管理的所有仓库
          const managerAssignments = await warehouseAssignmentsRepository.getByUser(currentUser.id)
          const warehouseIds = managerAssignments.map((a) => a.warehouse_id)

          if (warehouseIds.length > 0) {
            // 获取这些仓库下的所有用户ID
            const allUserIds: string[] = []
            for (const warehouseId of warehouseIds) {
              const warehouseAssignments = await warehouseAssignmentsRepository.getByWarehouse(warehouseId)
              const userIds = warehouseAssignments.map((a) => a.user_id)
              allUserIds.push(...userIds)
            }

            // 去重并添加到查询中
            const uniqueUserIds = [...new Set(allUserIds)]
            if (uniqueUserIds.length > 0) {
              query = query.in('id', uniqueUserIds)
            } else {
              // 如果没有管辖的司机，返回空数组
              return []
            }
          } else {
            // 如果没有管辖的仓库，返回空数组
            return []
          }
        } else {
          // 其他情况应用普通过滤
          Object.entries(permissionResult.filter).forEach(([key, value]) => {
            query = query.eq(key, value)
          })
        }
      }

      const { data: userData, error } = await query

      if (error) {
        this.logger.error('查询用户失败', { role, error })
        throw new Error(`查询用户失败: ${error.message}`)
      }

      return userData || []
    } catch (error) {
      this.logger.error('查询用户异常', { role, error })
      throw error
    }
  }
}

/**
 * 默认的 UsersRepository 单例实例
 * 用于全局共享，避免重复创建实例
 */
export const usersRepository = new UsersRepository()
