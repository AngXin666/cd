/**
 * 请假/离职申请 Repository
 * 提供请假申请和离职申请的数据访问层，带有缓存支持
 *
 * 功能包括：
 * - 获取所有请假申请（带缓存，TTL 2 分钟）
 * - 获取所有离职申请（带缓存，TTL 2 分钟）
 * - 在申请创建/审批时自动清除缓存
 *
 * @module db/repositories/LeaveRepository
 */

import { BaseRepository, type BaseEntity, type QueryOptions } from './BaseRepository'
import type { LeaveApplication, ResignationApplication } from '../types'

// ==================== 缓存配置常量 ====================

/**
 * 请假/离职申请缓存 TTL：2 分钟
 * 申请数据更新频率较高，使用较短的缓存时间
 */
const LEAVE_CACHE_TTL = 2 * 60 * 1000

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = {
  /** 请假申请缓存前缀 */
  LEAVE: 'leave_applications',
  /** 离职申请缓存前缀 */
  RESIGNATION: 'resignation_applications'
}

// ==================== 类型定义 ====================

/**
 * 请假申请实体接口
 * 使用 Omit 排除冲突的字段，然后重新定义
 */
interface LeaveApplicationEntity extends Omit<LeaveApplication, 'created_at' | 'updated_at'>, BaseEntity {}

/**
 * 离职申请实体接口
 * 使用 Omit 排除冲突的字段，然后重新定义
 */
interface ResignationApplicationEntity extends Omit<ResignationApplication, 'created_at' | 'updated_at'>, BaseEntity {}

// ==================== LeaveRepository 类 ====================

/**
 * 请假/离职申请 Repository
 * 提供请假申请和离职申请的数据访问，带有缓存支持
 *
 * @example
 * ```typescript
 * import { leaveRepository } from '@/db/repositories'
 *
 * // 获取所有请假申请（带缓存）
 * const leaveApplications = await leaveRepository.getAllLeaveApplications()
 *
 * // 获取所有离职申请（带缓存）
 * const resignationApplications = await leaveRepository.getAllResignationApplications()
 *
 * // 清除所有缓存（在创建/审批申请后调用）
 * leaveRepository.invalidateAllCache()
 * ```
 */
export class LeaveRepository extends BaseRepository<LeaveApplicationEntity> {
  /**
   * 创建 LeaveRepository 实例
   * 配置请假申请表和缓存设置
   */
  constructor() {
    super({
      tableName: 'leave_applications',
      cachePrefix: CACHE_PREFIX.LEAVE,
      defaultTTL: LEAVE_CACHE_TTL,
      enableCache: true
    })
  }

  // ==================== 请假申请方法 ====================

  /**
   * 获取所有请假申请
   * 带缓存支持，TTL 2 分钟
   *
   * @param options - 查询选项
   * @returns 请假申请列表
   *
   * @example
   * ```typescript
   * // 获取所有请假申请（使用缓存）
   * const applications = await leaveRepository.getAllLeaveApplications()
   *
   * // 获取所有请假申请（不使用缓存）
   * const applications = await leaveRepository.getAllLeaveApplications({ useCache: false })
   * ```
   */
  async getAllLeaveApplications(options: QueryOptions = {}): Promise<LeaveApplication[]> {
    const { useCache = true, cacheTTL = LEAVE_CACHE_TTL } = options
    const cacheKey = this.getCacheKey('all')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<LeaveApplication[]>(cacheKey)
      if (cached) {
        this.logger.debug('请假申请缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询所有请假申请')
    const { data, error } = await this.supabase
      .from('leave_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取所有请假申请失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('请假申请已缓存', { count: result.length, ttl: cacheTTL })
    }

    return result as LeaveApplication[]
  }

  /**
   * 根据用户 ID 获取请假申请
   *
   * @param userId - 用户 ID
   * @param options - 查询选项
   * @returns 用户的请假申请列表
   */
  async getLeaveApplicationsByUser(userId: string, options: QueryOptions = {}): Promise<LeaveApplication[]> {
    const { useCache = true, cacheTTL = LEAVE_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`user_${userId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<LeaveApplication[]>(cacheKey)
      if (cached) {
        this.logger.debug('用户请假申请缓存命中', { userId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询用户请假申请', { userId })
    const { data, error } = await this.supabase
      .from('leave_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取用户请假申请失败', { userId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as LeaveApplication[]
  }

  /**
   * 根据仓库 ID 获取请假申请
   *
   * @param warehouseId - 仓库 ID
   * @param options - 查询选项
   * @returns 仓库的请假申请列表
   */
  async getLeaveApplicationsByWarehouse(warehouseId: string, options: QueryOptions = {}): Promise<LeaveApplication[]> {
    const { useCache = true, cacheTTL = LEAVE_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`warehouse_${warehouseId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<LeaveApplication[]>(cacheKey)
      if (cached) {
        this.logger.debug('仓库请假申请缓存命中', { warehouseId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询仓库请假申请', { warehouseId })
    const { data, error } = await this.supabase
      .from('leave_applications')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取仓库请假申请失败', { warehouseId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as LeaveApplication[]
  }

  // ==================== 离职申请方法 ====================

  /**
   * 获取所有离职申请
   * 带缓存支持，TTL 2 分钟
   *
   * @param options - 查询选项
   * @returns 离职申请列表
   *
   * @example
   * ```typescript
   * // 获取所有离职申请（使用缓存）
   * const applications = await leaveRepository.getAllResignationApplications()
   *
   * // 获取所有离职申请（不使用缓存）
   * const applications = await leaveRepository.getAllResignationApplications({ useCache: false })
   * ```
   */
  async getAllResignationApplications(options: QueryOptions = {}): Promise<ResignationApplication[]> {
    const { useCache = true, cacheTTL = LEAVE_CACHE_TTL } = options
    // 使用离职申请专用的缓存键前缀
    const cacheKey = `${CACHE_PREFIX.RESIGNATION}_all`

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<ResignationApplication[]>(cacheKey)
      if (cached) {
        this.logger.debug('离职申请缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询所有离职申请')
    const { data, error } = await this.supabase
      .from('resignation_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取所有离职申请失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('离职申请已缓存', { count: result.length, ttl: cacheTTL })
    }

    return result as ResignationApplication[]
  }

  /**
   * 根据用户 ID 获取离职申请
   *
   * @param userId - 用户 ID
   * @param options - 查询选项
   * @returns 用户的离职申请列表
   */
  async getResignationApplicationsByUser(userId: string, options: QueryOptions = {}): Promise<ResignationApplication[]> {
    const { useCache = true, cacheTTL = LEAVE_CACHE_TTL } = options
    const cacheKey = `${CACHE_PREFIX.RESIGNATION}_user_${userId}`

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<ResignationApplication[]>(cacheKey)
      if (cached) {
        this.logger.debug('用户离职申请缓存命中', { userId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询用户离职申请', { userId })
    const { data, error } = await this.supabase
      .from('resignation_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取用户离职申请失败', { userId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as ResignationApplication[]
  }

  /**
   * 根据仓库 ID 获取离职申请
   *
   * @param warehouseId - 仓库 ID
   * @param options - 查询选项
   * @returns 仓库的离职申请列表
   */
  async getResignationApplicationsByWarehouse(warehouseId: string, options: QueryOptions = {}): Promise<ResignationApplication[]> {
    const { useCache = true, cacheTTL = LEAVE_CACHE_TTL } = options
    const cacheKey = `${CACHE_PREFIX.RESIGNATION}_warehouse_${warehouseId}`

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<ResignationApplication[]>(cacheKey)
      if (cached) {
        this.logger.debug('仓库离职申请缓存命中', { warehouseId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询仓库离职申请', { warehouseId })
    const { data, error } = await this.supabase
      .from('resignation_applications')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取仓库离职申请失败', { warehouseId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as ResignationApplication[]
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 清除所有请假申请缓存
   * 在创建/更新/删除请假申请后调用
   */
  invalidateLeaveCache(): void {
    this.invalidateCache()
    this.logger.info('请假申请缓存已清除')
  }

  /**
   * 清除所有离职申请缓存
   * 在创建/更新/删除离职申请后调用
   */
  invalidateResignationCache(): void {
    // 清除离职申请相关的缓存
    // 由于离职申请使用不同的缓存前缀，需要单独清除
    const { clearCacheByPrefix } = require('@/utils/cache')
    clearCacheByPrefix(CACHE_PREFIX.RESIGNATION)
    this.logger.info('离职申请缓存已清除')
  }

  /**
   * 清除所有缓存（请假申请和离职申请）
   * 在需要完全刷新数据时调用
   */
  invalidateAllCache(): void {
    this.invalidateLeaveCache()
    this.invalidateResignationCache()
    this.logger.info('所有申请缓存已清除')
  }
}

// ==================== 单例导出 ====================

/**
 * LeaveRepository 单例实例
 * 推荐使用此实例而非创建新实例
 */
export const leaveRepository = new LeaveRepository()
