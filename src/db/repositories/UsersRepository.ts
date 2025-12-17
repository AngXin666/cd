/**
 * 用户数据 Repository
 * 提供用户列表的查询和缓存管理
 *
 * 功能包括：
 * - 获取所有司机列表（带缓存，TTL 5 分钟）
 * - 获取所有管理员列表（带缓存，TTL 5 分钟）
 * - 在用户创建/更新/删除时自动清除缓存
 *
 * @module db/repositories/UsersRepository
 */

import { supabase } from '@/client/supabase'
import { getCache, setCache, clearCacheByPrefix, CACHE_KEYS } from '@/utils/cache'
import { createLogger, Logger } from '@/utils/logger'
import { convertUsersToProfiles, getUsersByRole, getUsersWithRole, getUserWithRole } from '../helpers'
import type { Profile } from '../types'

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

  // ==================== 数据查询方法 ====================

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
      const userWithRole = await getUserWithRole(currentUserId)
      
      // 根据当前用户角色获取可见的司机列表
      const drivers = await getUsersByRole('DRIVER', userWithRole)

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
      const userWithRole = await getUserWithRole(currentUserId)
      
      // 根据当前用户角色获取可见的管理员列表
      const managers = await getUsersByRole('MANAGER', userWithRole)

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
      const users = await getUsersWithRole()

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
}

/**
 * 默认的 UsersRepository 单例实例
 * 用于全局共享，避免重复创建实例
 */
export const usersRepository = new UsersRepository()
