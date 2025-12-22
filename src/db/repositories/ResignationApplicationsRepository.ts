/**
 * 离职申请 Repository
 * 提供离职申请的数据访问层，带有缓存支持
 *
 * 功能包括：
 * - 获取用户离职申请（带缓存，TTL 2 分钟）
 * - 获取所有离职申请（带缓存，TTL 2 分钟）
 * - 获取待审批离职申请（带缓存，TTL 2 分钟）
 * - 创建/更新/审批离职申请时自动清除缓存
 *
 * @module db/repositories/ResignationApplicationsRepository
 */

import { BaseRepository, type BaseEntity, type QueryOptions } from './BaseRepository'
import type { ResignationApplication, ResignationApplicationInput } from '../types'

// ==================== 缓存配置常量 ====================

/**
 * 离职申请缓存 TTL：2 分钟
 * 离职申请数据更新频率较高，使用较短的缓存时间
 */
const RESIGNATION_CACHE_TTL = 2 * 60 * 1000

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = 'resignation'

// ==================== 类型定义 ====================

/**
 * 离职申请实体接口
 * 继承 BaseEntity 以支持 BaseRepository 的泛型约束
 */
interface ResignationApplicationEntity extends Omit<ResignationApplication, 'created_at' | 'updated_at'>, BaseEntity {}

/**
 * 离职申请更新接口
 */
export interface ResignationApplicationUpdate {
  /** 离职原因 */
  reason?: string
  /** 离职日期 */
  resignation_date?: string
  /** 状态 */
  status?: string
  /** 审批人 ID */
  approver_id?: string
  /** 审批时间 */
  approved_at?: string
  /** 审核备注 */
  review_notes?: string
  /** 审核人 ID */
  reviewed_by?: string
  /** 审核时间 */
  reviewed_at?: string
}

// ==================== ResignationApplicationsRepository 类 ====================

/**
 * 离职申请 Repository
 * 提供离职申请的数据访问，带有缓存支持
 *
 * @example
 * ```typescript
 * import { resignationApplicationsRepository } from '@/db/repositories'
 *
 * // 获取用户离职申请
 * const applications = await resignationApplicationsRepository.getByUser(userId)
 *
 * // 获取所有离职申请
 * const allApplications = await resignationApplicationsRepository.getAll()
 *
 * // 获取待审批离职申请
 * const pendingApplications = await resignationApplicationsRepository.getPending()
 *
 * // 审批离职申请
 * await resignationApplicationsRepository.approve(applicationId, approverId, '同意离职')
 * ```
 */
export class ResignationApplicationsRepository extends BaseRepository<ResignationApplicationEntity> {
  /**
   * 创建 ResignationApplicationsRepository 实例
   * 配置离职申请表和缓存设置
   */
  constructor() {
    super({
      tableName: 'resignation_applications',
      cachePrefix: CACHE_PREFIX,
      defaultTTL: RESIGNATION_CACHE_TTL,
      enableCache: true
    })
  }

  // ==================== 查询方法 ====================

  /**
   * 根据用户 ID 获取离职申请
   * 带缓存支持，TTL 2 分钟
   *
   * @param userId - 用户 ID
   * @param options - 查询选项
   * @returns 用户的离职申请列表
   *
   * @example
   * ```typescript
   * const applications = await resignationApplicationsRepository.getByUser('user-123')
   * console.log(`用户有 ${applications.length} 条离职申请`)
   * ```
   */
  async getByUser(userId: string, options: QueryOptions = {}): Promise<ResignationApplication[]> {
    const { useCache = true, cacheTTL = RESIGNATION_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`user_${userId}`)

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
      this.logger.debug('用户离职申请已缓存', { userId, count: result.length })
    }

    return result as ResignationApplication[]
  }

  /**
   * 获取所有离职申请
   * 带缓存支持，TTL 2 分钟
   *
   * @param options - 查询选项
   * @returns 所有离职申请列表
   *
   * @example
   * ```typescript
   * const applications = await resignationApplicationsRepository.getAll()
   * console.log(`共有 ${applications.length} 条离职申请`)
   * ```
   */
  async getAll(options: QueryOptions = {}): Promise<ResignationApplication[]> {
    const { useCache = true, cacheTTL = RESIGNATION_CACHE_TTL, limit = 500 } = options
    const cacheKey = this.getCacheKey('all')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<ResignationApplication[]>(cacheKey)
      if (cached) {
        this.logger.debug('所有离职申请缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询所有离职申请')
    const { data, error } = await this.supabase
      .from('resignation_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error('获取所有离职申请失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('所有离职申请已缓存', { count: result.length })
    }

    return result as ResignationApplication[]
  }

  /**
   * 获取待审批离职申请
   * 带缓存支持，TTL 2 分钟
   *
   * @param options - 查询选项
   * @returns 待审批离职申请列表
   *
   * @example
   * ```typescript
   * const pendingApplications = await resignationApplicationsRepository.getPending()
   * console.log(`有 ${pendingApplications.length} 条待审批离职申请`)
   * ```
   */
  async getPending(options: QueryOptions = {}): Promise<ResignationApplication[]> {
    const { useCache = true, cacheTTL = RESIGNATION_CACHE_TTL } = options
    const cacheKey = this.getCacheKey('pending')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<ResignationApplication[]>(cacheKey)
      if (cached) {
        this.logger.debug('待审批离职申请缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询待审批离职申请')
    const { data, error } = await this.supabase
      .from('resignation_applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取待审批离职申请失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('待审批离职申请已缓存', { count: result.length })
    }

    return result as ResignationApplication[]
  }

  /**
   * 根据 ID 获取离职申请
   *
   * @param id - 离职申请 ID
   * @param options - 查询选项
   * @returns 离职申请，如果不存在则返回 null
   */
  async getApplicationById(id: string, options: QueryOptions = {}): Promise<ResignationApplication | null> {
    const { useCache = true, cacheTTL = RESIGNATION_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`id_${id}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<ResignationApplication>(cacheKey)
      if (cached) {
        this.logger.debug('离职申请缓存命中', { id })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询离职申请', { id })
    const { data, error } = await this.supabase
      .from('resignation_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      this.logger.error('获取离职申请失败', { id, error: error.message })
      return null
    }

    // 缓存结果
    if (useCache && data) {
      this.setToCache(cacheKey, data, cacheTTL)
    }

    return data as ResignationApplication | null
  }

  /**
   * 根据仓库 ID 获取离职申请
   *
   * @param warehouseId - 仓库 ID
   * @param options - 查询选项
   * @returns 仓库的离职申请列表
   */
  async getByWarehouse(warehouseId: string, options: QueryOptions = {}): Promise<ResignationApplication[]> {
    const { useCache = true, cacheTTL = RESIGNATION_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`warehouse_${warehouseId}`)

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

  // ==================== 写操作方法 ====================

  /**
   * 创建离职申请
   * 创建成功后自动清除相关缓存
   *
   * @param input - 离职申请输入数据
   * @returns 创建的离职申请，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const application = await resignationApplicationsRepository.createApplication({
   *   user_id: 'user-123',
   *   reason: '个人原因',
   *   resignation_date: '2024-12-31'
   * })
   * ```
   */
  async createApplication(input: ResignationApplicationInput): Promise<ResignationApplication | null> {
    this.logger.debug('创建离职申请', { userId: input.user_id })

    const { data, error } = await this.supabase
      .from('resignation_applications')
      .insert({
        user_id: input.user_id,
        reason: input.reason,
        resignation_date: input.resignation_date,
        warehouse_id: input.warehouse_id,
        status: 'pending'
      })
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('创建离职申请失败', { input, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('离职申请创建成功', { id: (data as ResignationApplication)?.id })
    return data as ResignationApplication | null
  }

  /**
   * 更新离职申请
   * 更新成功后自动清除相关缓存
   *
   * @param id - 离职申请 ID
   * @param update - 更新数据
   * @returns 更新后的离职申请，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const updated = await resignationApplicationsRepository.updateApplication('app-123', {
   *   reason: '更新后的离职原因'
   * })
   * ```
   */
  async updateApplication(id: string, update: ResignationApplicationUpdate): Promise<ResignationApplication | null> {
    this.logger.debug('更新离职申请', { id, update })

    const { data, error } = await this.supabase
      .from('resignation_applications')
      .update({
        ...update,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('更新离职申请失败', { id, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('离职申请更新成功', { id })
    return data as ResignationApplication | null
  }

  /**
   * 审批通过离职申请
   * 审批成功后自动清除相关缓存
   *
   * @param id - 离职申请 ID
   * @param approverId - 审批人 ID
   * @param reviewNotes - 审核备注（可选）
   * @returns 审批后的离职申请，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const approved = await resignationApplicationsRepository.approve('app-123', 'manager-456', '同意离职')
   * ```
   */
  async approve(id: string, approverId: string, reviewNotes?: string): Promise<ResignationApplication | null> {
    this.logger.debug('审批通过离职申请', { id, approverId })

    const now = new Date().toISOString()

    const { data, error } = await this.supabase
      .from('resignation_applications')
      .update({
        status: 'approved',
        approver_id: approverId,
        approved_at: now,
        reviewed_by: approverId,
        reviewed_at: now,
        review_notes: reviewNotes,
        updated_at: now
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('审批通过离职申请失败', { id, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('离职申请审批通过', { id, approverId })
    return data as ResignationApplication | null
  }

  /**
   * 拒绝离职申请
   * 拒绝成功后自动清除相关缓存
   *
   * @param id - 离职申请 ID
   * @param approverId - 审批人 ID
   * @param reviewNotes - 拒绝原因（可选）
   * @returns 拒绝后的离职申请，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const rejected = await resignationApplicationsRepository.reject('app-123', 'manager-456', '暂不批准')
   * ```
   */
  async reject(id: string, approverId: string, reviewNotes?: string): Promise<ResignationApplication | null> {
    this.logger.debug('拒绝离职申请', { id, approverId })

    const now = new Date().toISOString()

    const { data, error } = await this.supabase
      .from('resignation_applications')
      .update({
        status: 'rejected',
        approver_id: approverId,
        approved_at: now,
        reviewed_by: approverId,
        reviewed_at: now,
        review_notes: reviewNotes,
        updated_at: now
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('拒绝离职申请失败', { id, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('离职申请已拒绝', { id, approverId })
    return data as ResignationApplication | null
  }

  /**
   * 删除离职申请
   * 删除成功后自动清除相关缓存
   *
   * @param id - 离职申请 ID
   * @returns 是否删除成功
   */
  async deleteApplication(id: string): Promise<boolean> {
    this.logger.debug('删除离职申请', { id })

    const { error } = await this.supabase
      .from('resignation_applications')
      .delete()
      .eq('id', id)

    if (error) {
      this.logger.error('删除离职申请失败', { id, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('离职申请删除成功', { id })
    return true
  }

  /**
   * 获取待审批离职申请数量
   *
   * @param options - 查询选项
   * @returns 待审批数量
   */
  async getPendingCount(options: QueryOptions = {}): Promise<number> {
    const { useCache = true, cacheTTL = RESIGNATION_CACHE_TTL } = options
    const cacheKey = this.getCacheKey('pending_count')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<number>(cacheKey)
      if (cached !== null) {
        this.logger.debug('待审批离职申请数量缓存命中', { count: cached })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询待审批离职申请数量')
    const { count, error } = await this.supabase
      .from('resignation_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      this.logger.error('获取待审批离职申请数量失败', { error: error.message })
      return 0
    }

    const result = count ?? 0

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result
  }
}

// ==================== 单例导出 ====================

/**
 * ResignationApplicationsRepository 单例实例
 * 推荐使用此实例而非创建新实例
 */
export const resignationApplicationsRepository = new ResignationApplicationsRepository()
