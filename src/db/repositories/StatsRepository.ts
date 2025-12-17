/**
 * 统计数据 Repository
 * 提供系统统计和用户个人统计数据的查询和缓存管理
 *
 * 功能包括：
 * - 获取系统总体统计数据（带缓存，TTL 5 分钟）
 * - 获取用户个人统计数据（带缓存，TTL 2 分钟）
 * - 自动缓存管理和失效
 *
 * @module db/repositories/StatsRepository
 */

import { supabase } from '@/client/supabase'
import { getCache, setCache, clearCacheByPrefix } from '@/utils/cache'
import { createLogger, Logger } from '@/utils/logger'
import type { SystemStats, UserPersonalStats } from '../api/stats'

/**
 * 统计数据缓存配置
 */
const STATS_CACHE_CONFIG = {
  /** 缓存键前缀 */
  PREFIX: 'stats',
  /** 系统统计缓存 TTL：5 分钟（系统统计数据变化较慢） */
  SYSTEM_TTL: 5 * 60 * 1000,
  /** 用户个人统计缓存 TTL：2 分钟（个人数据更新频率较高） */
  USER_TTL: 2 * 60 * 1000
}

/**
 * 统计数据 Repository 类
 *
 * 提供系统统计和用户个人统计数据的查询功能，内置缓存管理。
 * - 系统统计缓存 TTL 为 5 分钟
 * - 用户个人统计缓存 TTL 为 2 分钟
 *
 * @example
 * ```typescript
 * const statsRepo = new StatsRepository()
 *
 * // 获取系统统计数据（仅管理员）
 * const systemStats = await statsRepo.getSystemStats('admin-user-id')
 *
 * // 获取用户个人统计数据
 * const personalStats = await statsRepo.getUserPersonalStats('user-id')
 *
 * // 清除缓存（数据变更后调用）
 * statsRepo.invalidateCache()
 * ```
 */
export class StatsRepository {
  /** 日志记录器实例 */
  private readonly logger: Logger

  /** 是否启用缓存 */
  private readonly enableCache: boolean

  /**
   * 创建 StatsRepository 实例
   *
   * @param enableCache - 是否启用缓存，默认 true
   */
  constructor(enableCache: boolean = true) {
    this.enableCache = enableCache
    this.logger = createLogger('StatsRepository')
    this.logger.debug('StatsRepository 初始化完成', { enableCache })
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 生成缓存键
   *
   * @param suffix - 缓存键后缀
   * @returns 完整的缓存键
   */
  private getCacheKey(suffix: string): string {
    return `${STATS_CACHE_CONFIG.PREFIX}_${suffix}`
  }

  /**
   * 从缓存获取数据
   *
   * @template R - 返回数据类型
   * @param key - 缓存键
   * @returns 缓存的数据，如果不存在则返回 null
   */
  private getFromCache<R>(key: string): R | null {
    // 如果缓存禁用，直接返回 null
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
   * @param ttl - 缓存 TTL（毫秒）
   */
  private setToCache<R>(key: string, value: R, ttl: number): void {
    // 如果缓存禁用，不执行任何操作
    if (!this.enableCache) {
      return
    }

    setCache(key, value, ttl)
    this.logger.debug('缓存已设置', { key, ttl })
  }

  /**
   * 清除所有统计相关缓存
   * 在数据变更时调用此方法确保下次查询获取最新数据
   */
  public invalidateCache(): void {
    clearCacheByPrefix(STATS_CACHE_CONFIG.PREFIX)
    this.logger.info('统计数据缓存已清除')
  }

  /**
   * 清除指定用户的个人统计缓存
   *
   * @param userId - 用户ID
   */
  public invalidateUserCache(userId: string): void {
    const cacheKey = this.getCacheKey(`user_personal_${userId}`)
    // 使用前缀清除，确保清除该用户的所有相关缓存
    clearCacheByPrefix(cacheKey)
    this.logger.debug('用户个人统计缓存已清除', { userId })
  }

  // ==================== 数据查询方法 ====================

  /**
   * 获取系统总体统计数据（带缓存，TTL 5 分钟）
   *
   * 仅管理员可调用，统计内容包括：
   * - 总用户数、司机数、管理员数
   * - 总仓库数、车辆数、活跃车辆数
   * - 今日出勤数
   * - 待审批请假数、离职数
   * - 未读通知数
   *
   * @param userId - 请求用户ID（用于权限验证）
   * @returns 系统统计数据，如果查询失败或无权限则返回 null
   *
   * @example
   * ```typescript
   * const systemStats = await statsRepo.getSystemStats('admin-user-id')
   * if (systemStats) {
   *   console.log(`总用户数: ${systemStats.total_users}`)
   *   console.log(`总司机数: ${systemStats.total_drivers}`)
   * }
   * ```
   */
  async getSystemStats(userId: string): Promise<SystemStats | null> {
    // 1. 尝试从缓存获取
    const cacheKey = this.getCacheKey(`system_${userId}`)
    const cached = this.getFromCache<SystemStats>(cacheKey)
    if (cached) {
      return cached
    }

    // 2. 从数据库查询
    this.logger.debug('从数据库查询系统统计数据', { userId })

    try {
      const { data, error } = await supabase.rpc('get_system_stats', {
        p_user_id: userId
      })

      if (error) {
        this.logger.error('获取系统统计失败', { userId, error: error.message })
        return null
      }

      // RPC 返回的是数组，取第一个元素
      if (!data || data.length === 0) {
        this.logger.warn('系统统计数据为空', { userId })
        return null
      }

      const result = data[0] as SystemStats

      // 3. 缓存结果
      this.setToCache(cacheKey, result, STATS_CACHE_CONFIG.SYSTEM_TTL)

      this.logger.debug('系统统计数据查询完成', {
        userId,
        totalUsers: result.total_users,
        totalDrivers: result.total_drivers
      })

      return result
    } catch (error) {
      this.logger.error('获取系统统计时发生未预期的错误', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  /**
   * 获取用户个人统计数据（带缓存，TTL 2 分钟）
   *
   * 统计内容包括：
   * - 我的考勤次数
   * - 我的请假次数（总数、待审批、已批准、已拒绝）
   * - 我的车辆数
   * - 我的通知数（未读、总数）
   *
   * @param userId - 用户ID
   * @returns 用户个人统计数据，如果查询失败则返回 null
   *
   * @example
   * ```typescript
   * const personalStats = await statsRepo.getUserPersonalStats('user-123')
   * if (personalStats) {
   *   console.log(`我的考勤次数: ${personalStats.my_attendance_count}`)
   *   console.log(`待审批请假: ${personalStats.my_pending_leave_count}`)
   * }
   * ```
   */
  async getUserPersonalStats(userId: string): Promise<UserPersonalStats | null> {
    // 1. 尝试从缓存获取
    const cacheKey = this.getCacheKey(`user_personal_${userId}`)
    const cached = this.getFromCache<UserPersonalStats>(cacheKey)
    if (cached) {
      return cached
    }

    // 2. 从数据库查询
    this.logger.debug('从数据库查询用户个人统计数据', { userId })

    try {
      const { data, error } = await supabase.rpc('get_user_personal_stats', {
        p_user_id: userId
      })

      if (error) {
        this.logger.error('获取用户个人统计失败', { userId, error: error.message })
        return null
      }

      // RPC 返回的是数组，取第一个元素
      if (!data || data.length === 0) {
        this.logger.warn('用户个人统计数据为空', { userId })
        return null
      }

      const result = data[0] as UserPersonalStats

      // 3. 缓存结果
      this.setToCache(cacheKey, result, STATS_CACHE_CONFIG.USER_TTL)

      this.logger.debug('用户个人统计数据查询完成', {
        userId,
        attendanceCount: result.my_attendance_count,
        leaveCount: result.my_leave_count
      })

      return result
    } catch (error) {
      this.logger.error('获取用户个人统计时发生未预期的错误', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }
}

/**
 * 默认的 StatsRepository 单例实例
 * 用于全局共享，避免重复创建实例
 */
export const statsRepository = new StatsRepository()
