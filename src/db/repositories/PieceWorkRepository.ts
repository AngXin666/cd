/**
 * 计件记录 Repository
 * 提供计件记录的数据访问层，带有缓存支持
 *
 * 功能包括：
 * - 获取用户计件记录（带缓存，TTL 2 分钟）
 * - 获取仓库计件记录（带缓存，TTL 2 分钟）
 * - 创建/更新/删除计件记录时自动清除缓存
 *
 * @module db/repositories/PieceWorkRepository
 */

import { BaseRepository, type BaseEntity, type QueryOptions } from './BaseRepository'
import type {
  PieceWorkRecord,
  PieceWorkRecordInput,
  PieceWorkRecordUpdate,
  PieceWorkStats
} from '../types'

// ==================== 缓存配置常量 ====================

/**
 * 计件记录缓存 TTL：2 分钟
 * 计件数据更新频率较高，使用较短的缓存时间
 */
const PIECE_WORK_CACHE_TTL = 2 * 60 * 1000

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = 'piece_work'

// ==================== 类型定义 ====================

/**
 * 计件记录实体接口
 * 继承 BaseEntity 以支持 BaseRepository 的泛型约束
 */
interface PieceWorkEntity extends Omit<PieceWorkRecord, 'created_at' | 'updated_at'>, BaseEntity {}

// ==================== PieceWorkRepository 类 ====================

/**
 * 计件记录 Repository
 * 提供计件记录的数据访问，带有缓存支持
 *
 * @example
 * ```typescript
 * import { pieceWorkRepository } from '@/db/repositories'
 *
 * // 获取用户计件记录
 * const records = await pieceWorkRepository.getByUser(userId, '2024-12-01', '2024-12-31')
 *
 * // 获取仓库计件记录
 * const warehouseRecords = await pieceWorkRepository.getByWarehouse(warehouseId)
 *
 * // 创建计件记录
 * const record = await pieceWorkRepository.create({
 *   user_id: userId,
 *   warehouse_id: warehouseId,
 *   work_date: '2024-12-21',
 *   quantity: 100,
 *   unit_price: 1.5,
 *   total_amount: 150
 * })
 * ```
 */
export class PieceWorkRepository extends BaseRepository<PieceWorkEntity> {
  /**
   * 创建 PieceWorkRepository 实例
   * 配置计件记录表和缓存设置
   */
  constructor() {
    super({
      tableName: 'piece_work_records',
      cachePrefix: CACHE_PREFIX,
      defaultTTL: PIECE_WORK_CACHE_TTL,
      enableCache: true
    })
  }

  // ==================== 查询方法 ====================

  /**
   * 根据用户 ID 获取计件记录
   * 带缓存支持，TTL 2 分钟
   *
   * @param userId - 用户 ID
   * @param startDate - 开始日期（可选，格式：YYYY-MM-DD）
   * @param endDate - 结束日期（可选，格式：YYYY-MM-DD）
   * @param options - 查询选项
   * @returns 用户的计件记录列表
   *
   * @example
   * ```typescript
   * // 获取用户所有计件记录
   * const records = await pieceWorkRepository.getByUser('user-123')
   *
   * // 获取用户指定日期范围的计件记录
   * const records = await pieceWorkRepository.getByUser('user-123', '2024-12-01', '2024-12-31')
   * ```
   */
  async getByUser(
    userId: string,
    startDate?: string,
    endDate?: string,
    options: QueryOptions = {}
  ): Promise<PieceWorkRecord[]> {
    const { useCache = true, cacheTTL = PIECE_WORK_CACHE_TTL, limit = 500 } = options
    
    // 生成缓存键（包含日期范围）
    const dateRange = startDate && endDate ? `_${startDate}_${endDate}` : ''
    const cacheKey = this.getCacheKey(`user_${userId}${dateRange}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<PieceWorkRecord[]>(cacheKey)
      if (cached) {
        this.logger.debug('用户计件记录缓存命中', { userId, count: cached.length })
        return cached
      }
    }

    // 构建查询
    this.logger.debug('从数据库查询用户计件记录', { userId, startDate, endDate })
    let query = this.supabase
      .from('piece_work_records')
      .select('*')
      .eq('user_id', userId)
      .order('work_date', { ascending: false })
      .limit(limit)

    // 添加日期范围过滤
    if (startDate) {
      query = query.gte('work_date', startDate)
    }
    if (endDate) {
      query = query.lte('work_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      this.logger.error('获取用户计件记录失败', { userId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('用户计件记录已缓存', { userId, count: result.length })
    }

    return result as PieceWorkRecord[]
  }

  /**
   * 根据仓库 ID 获取计件记录
   * 带缓存支持，TTL 2 分钟
   *
   * @param warehouseId - 仓库 ID
   * @param startDate - 开始日期（可选，格式：YYYY-MM-DD）
   * @param endDate - 结束日期（可选，格式：YYYY-MM-DD）
   * @param options - 查询选项
   * @returns 仓库的计件记录列表
   *
   * @example
   * ```typescript
   * // 获取仓库所有计件记录
   * const records = await pieceWorkRepository.getByWarehouse('warehouse-123')
   *
   * // 获取仓库指定日期范围的计件记录
   * const records = await pieceWorkRepository.getByWarehouse('warehouse-123', '2024-12-01', '2024-12-31')
   * ```
   */
  async getByWarehouse(
    warehouseId: string,
    startDate?: string,
    endDate?: string,
    options: QueryOptions = {}
  ): Promise<PieceWorkRecord[]> {
    const { useCache = true, cacheTTL = PIECE_WORK_CACHE_TTL, limit = 1000 } = options
    
    // 生成缓存键（包含日期范围）
    const dateRange = startDate && endDate ? `_${startDate}_${endDate}` : ''
    const cacheKey = this.getCacheKey(`warehouse_${warehouseId}${dateRange}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<PieceWorkRecord[]>(cacheKey)
      if (cached) {
        this.logger.debug('仓库计件记录缓存命中', { warehouseId, count: cached.length })
        return cached
      }
    }

    // 构建查询
    this.logger.debug('从数据库查询仓库计件记录', { warehouseId, startDate, endDate })
    let query = this.supabase
      .from('piece_work_records')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('work_date', { ascending: false })
      .limit(limit)

    // 添加日期范围过滤
    if (startDate) {
      query = query.gte('work_date', startDate)
    }
    if (endDate) {
      query = query.lte('work_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      this.logger.error('获取仓库计件记录失败', { warehouseId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('仓库计件记录已缓存', { warehouseId, count: result.length })
    }

    return result as PieceWorkRecord[]
  }

  /**
   * 根据用户和仓库获取计件记录
   *
   * @param userId - 用户 ID
   * @param warehouseId - 仓库 ID
   * @param startDate - 开始日期（可选）
   * @param endDate - 结束日期（可选）
   * @param options - 查询选项
   * @returns 计件记录列表
   */
  async getByUserAndWarehouse(
    userId: string,
    warehouseId: string,
    startDate?: string,
    endDate?: string,
    options: QueryOptions = {}
  ): Promise<PieceWorkRecord[]> {
    const { useCache = true, cacheTTL = PIECE_WORK_CACHE_TTL, limit = 500 } = options
    
    const dateRange = startDate && endDate ? `_${startDate}_${endDate}` : ''
    const cacheKey = this.getCacheKey(`user_${userId}_warehouse_${warehouseId}${dateRange}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<PieceWorkRecord[]>(cacheKey)
      if (cached) {
        this.logger.debug('用户仓库计件记录缓存命中', { userId, warehouseId, count: cached.length })
        return cached
      }
    }

    // 构建查询
    this.logger.debug('从数据库查询用户仓库计件记录', { userId, warehouseId })
    let query = this.supabase
      .from('piece_work_records')
      .select('*')
      .eq('user_id', userId)
      .eq('warehouse_id', warehouseId)
      .order('work_date', { ascending: false })
      .limit(limit)

    if (startDate) {
      query = query.gte('work_date', startDate)
    }
    if (endDate) {
      query = query.lte('work_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      this.logger.error('获取用户仓库计件记录失败', { userId, warehouseId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as PieceWorkRecord[]
  }

  /**
   * 获取所有计件记录
   *
   * @param options - 查询选项
   * @returns 所有计件记录列表
   */
  async getAllRecords(options: QueryOptions = {}): Promise<PieceWorkRecord[]> {
    const { useCache = true, cacheTTL = PIECE_WORK_CACHE_TTL, limit = 1000 } = options
    const cacheKey = this.getCacheKey('all')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<PieceWorkRecord[]>(cacheKey)
      if (cached) {
        this.logger.debug('所有计件记录缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询所有计件记录')
    const { data, error } = await this.supabase
      .from('piece_work_records')
      .select('*')
      .order('work_date', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error('获取所有计件记录失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as PieceWorkRecord[]
  }

  /**
   * 获取用户计件统计
   *
   * @param userId - 用户 ID
   * @param startDate - 开始日期
   * @param endDate - 结束日期
   * @param options - 查询选项
   * @returns 计件统计数据
   */
  async getUserStats(
    userId: string,
    startDate: string,
    endDate: string,
    options: QueryOptions = {}
  ): Promise<PieceWorkStats> {
    const { useCache = true, cacheTTL = PIECE_WORK_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`stats_user_${userId}_${startDate}_${endDate}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<PieceWorkStats>(cacheKey)
      if (cached) {
        this.logger.debug('用户计件统计缓存命中', { userId })
        return cached
      }
    }

    // 获取用户计件记录
    const records = await this.getByUser(userId, startDate, endDate, { useCache: false })

    // 计算统计数据
    const stats = this.calculateStats(records)

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, stats, cacheTTL)
    }

    return stats
  }

  // ==================== 写操作方法 ====================

  /**
   * 创建计件记录
   * 创建成功后自动清除相关缓存
   *
   * @param input - 计件记录输入数据
   * @returns 创建的计件记录，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const record = await pieceWorkRepository.create({
   *   user_id: 'user-123',
   *   warehouse_id: 'warehouse-456',
   *   work_date: '2024-12-21',
   *   quantity: 100,
   *   unit_price: 1.5,
   *   total_amount: 150
   * })
   * ```
   */
  async createRecord(input: PieceWorkRecordInput): Promise<PieceWorkRecord | null> {
    this.logger.debug('创建计件记录', { userId: input.user_id, date: input.work_date })

    const { data, error } = await this.supabase
      .from('piece_work_records')
      .insert({
        user_id: input.user_id,
        warehouse_id: input.warehouse_id,
        work_date: input.work_date,
        category_id: input.category_id,
        quantity: input.quantity,
        unit_price: input.unit_price,
        total_amount: input.total_amount,
        need_upstairs: input.need_upstairs,
        upstairs_price: input.upstairs_price,
        need_sorting: input.need_sorting,
        sorting_quantity: input.sorting_quantity,
        sorting_unit_price: input.sorting_unit_price,
        notes: input.notes
      })
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('创建计件记录失败', { input, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('计件记录创建成功', { id: (data as PieceWorkRecord)?.id })
    return data as PieceWorkRecord | null
  }

  /**
   * 更新计件记录
   * 更新成功后自动清除相关缓存
   *
   * @param id - 计件记录 ID
   * @param update - 更新数据
   * @returns 更新后的计件记录，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const updated = await pieceWorkRepository.updateRecord('record-123', {
   *   quantity: 120,
   *   total_amount: 180
   * })
   * ```
   */
  async updateRecord(id: string, update: PieceWorkRecordUpdate): Promise<PieceWorkRecord | null> {
    this.logger.debug('更新计件记录', { id, update })

    const { data, error } = await this.supabase
      .from('piece_work_records')
      .update({
        ...update,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('更新计件记录失败', { id, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('计件记录更新成功', { id })
    return data as PieceWorkRecord | null
  }

  /**
   * 删除计件记录
   * 删除成功后自动清除相关缓存
   *
   * @param id - 计件记录 ID
   * @returns 是否删除成功
   *
   * @example
   * ```typescript
   * const success = await pieceWorkRepository.deleteRecord('record-123')
   * ```
   */
  async deleteRecord(id: string): Promise<boolean> {
    this.logger.debug('删除计件记录', { id })

    const { error } = await this.supabase
      .from('piece_work_records')
      .delete()
      .eq('id', id)

    if (error) {
      this.logger.error('删除计件记录失败', { id, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('计件记录删除成功', { id })
    return true
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 计算计件统计数据
   *
   * @param records - 计件记录列表
   * @returns 计件统计数据
   */
  private calculateStats(records: PieceWorkRecord[]): PieceWorkStats {
    let totalQuantity = 0
    let totalAmount = 0
    const categoryMap = new Map<string, { quantity: number; amount: number; name: string }>()

    for (const record of records) {
      totalQuantity += record.quantity || 0
      totalAmount += record.total_amount || 0

      // 按分类统计
      if (record.category_id) {
        const existing = categoryMap.get(record.category_id) || { quantity: 0, amount: 0, name: record.category || '' }
        existing.quantity += record.quantity || 0
        existing.amount += record.total_amount || 0
        categoryMap.set(record.category_id, existing)
      }
    }

    // 转换分类统计为数组
    const byCategory = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      category_id: categoryId,
      category_name: data.name,
      quantity: data.quantity,
      amount: data.amount
    }))

    return {
      total_quantity: totalQuantity,
      total_amount: totalAmount,
      record_count: records.length,
      by_category: byCategory
    }
  }
}

// ==================== 单例导出 ====================

/**
 * PieceWorkRepository 单例实例
 * 推荐使用此实例而非创建新实例
 */
export const pieceWorkRepository = new PieceWorkRepository()
