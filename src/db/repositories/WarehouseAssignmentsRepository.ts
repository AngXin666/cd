/**
 * 仓库分配 Repository
 * 提供仓库分配关系的数据访问层，带有缓存支持
 *
 * 功能包括：
 * - 获取用户的仓库分配（带缓存，TTL 5 分钟）
 * - 获取仓库的用户分配（带缓存，TTL 5 分钟）
 * - 创建/删除/更新仓库分配时自动清除缓存
 *
 * @module db/repositories/WarehouseAssignmentsRepository
 */

import { BaseRepository, type BaseEntity, type QueryOptions } from './BaseRepository'
import type { WarehouseAssignment, WarehouseAssignmentInput, PermissionLevel } from '../types'

// ==================== 缓存配置常量 ====================

/**
 * 仓库分配缓存 TTL：5 分钟
 * 分配关系变化频率适中，使用中等的缓存时间
 */
const WAREHOUSE_ASSIGNMENTS_CACHE_TTL = 5 * 60 * 1000

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = 'warehouse_assignments'

// ==================== 类型定义 ====================

/**
 * 仓库分配实体接口
 * 继承 BaseEntity 以支持 BaseRepository 的泛型约束
 */
interface WarehouseAssignmentEntity extends Omit<WarehouseAssignment, 'created_at'>, BaseEntity {}

// ==================== WarehouseAssignmentsRepository 类 ====================

/**
 * 仓库分配 Repository
 * 提供仓库分配关系的数据访问，带有缓存支持
 *
 * @example
 * ```typescript
 * import { warehouseAssignmentsRepository } from '@/db/repositories'
 *
 * // 获取用户的仓库分配
 * const assignments = await warehouseAssignmentsRepository.getByUser(userId)
 *
 * // 获取仓库的用户分配
 * const warehouseAssignments = await warehouseAssignmentsRepository.getByWarehouse(warehouseId)
 *
 * // 创建仓库分配
 * await warehouseAssignmentsRepository.create({
 *   user_id: userId,
 *   warehouse_id: warehouseId,
 *   permission_level: 'full_control'
 * })
 * ```
 */
export class WarehouseAssignmentsRepository extends BaseRepository<WarehouseAssignmentEntity> {
  /**
   * 创建 WarehouseAssignmentsRepository 实例
   * 配置仓库分配表和缓存设置
   */
  constructor() {
    super({
      tableName: 'warehouse_assignments',
      cachePrefix: CACHE_PREFIX,
      defaultTTL: WAREHOUSE_ASSIGNMENTS_CACHE_TTL,
      enableCache: true
    })
  }

  // ==================== 查询方法 ====================

  /**
   * 根据用户 ID 获取仓库分配
   * 带缓存支持，TTL 5 分钟
   *
   * @param userId - 用户 ID
   * @param options - 查询选项
   * @returns 用户的仓库分配列表
   *
   * @example
   * ```typescript
   * const assignments = await warehouseAssignmentsRepository.getByUser('user-123')
   * console.log(`用户关联 ${assignments.length} 个仓库`)
   * ```
   */
  async getByUser(userId: string, options: QueryOptions = {}): Promise<WarehouseAssignment[]> {
    const { useCache = true, cacheTTL = WAREHOUSE_ASSIGNMENTS_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`user_${userId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<WarehouseAssignment[]>(cacheKey)
      if (cached) {
        this.logger.debug('用户仓库分配缓存命中', { userId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询用户仓库分配', { userId })
    const { data, error } = await this.supabase
      .from('warehouse_assignments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取用户仓库分配失败', { userId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('用户仓库分配已缓存', { userId, count: result.length })
    }

    return result as WarehouseAssignment[]
  }

  /**
   * 根据仓库 ID 获取用户分配
   * 带缓存支持，TTL 5 分钟
   *
   * @param warehouseId - 仓库 ID
   * @param options - 查询选项
   * @returns 仓库的用户分配列表
   *
   * @example
   * ```typescript
   * const assignments = await warehouseAssignmentsRepository.getByWarehouse('warehouse-123')
   * console.log(`仓库关联 ${assignments.length} 个用户`)
   * ```
   */
  async getByWarehouse(warehouseId: string, options: QueryOptions = {}): Promise<WarehouseAssignment[]> {
    const { useCache = true, cacheTTL = WAREHOUSE_ASSIGNMENTS_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`warehouse_${warehouseId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<WarehouseAssignment[]>(cacheKey)
      if (cached) {
        this.logger.debug('仓库用户分配缓存命中', { warehouseId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询仓库用户分配', { warehouseId })
    const { data, error } = await this.supabase
      .from('warehouse_assignments')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取仓库用户分配失败', { warehouseId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('仓库用户分配已缓存', { warehouseId, count: result.length })
    }

    return result as WarehouseAssignment[]
  }

  /**
   * 获取所有仓库分配
   * 带缓存支持，TTL 5 分钟
   *
   * @param options - 查询选项
   * @returns 所有仓库分配列表
   *
   * @example
   * ```typescript
   * const allAssignments = await warehouseAssignmentsRepository.getAllAssignments()
   * ```
   */
  async getAllAssignments(options: QueryOptions = {}): Promise<WarehouseAssignment[]> {
    const { useCache = true, cacheTTL = WAREHOUSE_ASSIGNMENTS_CACHE_TTL, limit = 1000 } = options
    const cacheKey = this.getCacheKey('all')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<WarehouseAssignment[]>(cacheKey)
      if (cached) {
        this.logger.debug('所有仓库分配缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询所有仓库分配')
    const { data, error } = await this.supabase
      .from('warehouse_assignments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error('获取所有仓库分配失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('所有仓库分配已缓存', { count: result.length })
    }

    return result as WarehouseAssignment[]
  }

  /**
   * 获取用户的仓库 ID 列表
   *
   * @param userId - 用户 ID
   * @param options - 查询选项
   * @returns 用户关联的仓库 ID 列表
   */
  async getWarehouseIdsByUser(userId: string, options: QueryOptions = {}): Promise<string[]> {
    const assignments = await this.getByUser(userId, options)
    return assignments.map(a => a.warehouse_id)
  }

  /**
   * 获取仓库的用户 ID 列表
   *
   * @param warehouseId - 仓库 ID
   * @param options - 查询选项
   * @returns 仓库关联的用户 ID 列表
   */
  async getUserIdsByWarehouse(warehouseId: string, options: QueryOptions = {}): Promise<string[]> {
    const assignments = await this.getByWarehouse(warehouseId, options)
    return assignments.map(a => a.user_id)
  }

  // ==================== 写操作方法 ====================

  /**
   * 创建仓库分配
   * 创建成功后自动清除相关缓存
   *
   * @param input - 仓库分配输入数据
   * @returns 创建的仓库分配，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const assignment = await warehouseAssignmentsRepository.createAssignment({
   *   user_id: 'user-123',
   *   warehouse_id: 'warehouse-456',
   *   permission_level: 'full_control'
   * })
   * ```
   */
  async createAssignment(input: WarehouseAssignmentInput): Promise<WarehouseAssignment | null> {
    this.logger.debug('创建仓库分配', { userId: input.user_id, warehouseId: input.warehouse_id })

    const { data, error } = await this.supabase
      .from('warehouse_assignments')
      .insert({
        user_id: input.user_id,
        warehouse_id: input.warehouse_id,
        assigned_by: input.assigned_by,
        permission_level: input.permission_level
      })
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('创建仓库分配失败', { input, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('仓库分配创建成功', { id: (data as WarehouseAssignment)?.id })
    return data as WarehouseAssignment | null
  }

  /**
   * 删除仓库分配
   * 删除成功后自动清除相关缓存
   *
   * @param id - 仓库分配 ID
   * @returns 是否删除成功
   *
   * @example
   * ```typescript
   * const success = await warehouseAssignmentsRepository.deleteAssignment('assignment-123')
   * ```
   */
  async deleteAssignment(id: string): Promise<boolean> {
    this.logger.debug('删除仓库分配', { id })

    const { error } = await this.supabase
      .from('warehouse_assignments')
      .delete()
      .eq('id', id)

    if (error) {
      this.logger.error('删除仓库分配失败', { id, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('仓库分配删除成功', { id })
    return true
  }

  /**
   * 删除用户的所有仓库分配
   * 删除成功后自动清除相关缓存
   *
   * @param userId - 用户 ID
   * @returns 是否删除成功
   *
   * @example
   * ```typescript
   * const success = await warehouseAssignmentsRepository.deleteByUser('user-123')
   * ```
   */
  async deleteByUser(userId: string): Promise<boolean> {
    this.logger.debug('删除用户所有仓库分配', { userId })

    const { error } = await this.supabase
      .from('warehouse_assignments')
      .delete()
      .eq('user_id', userId)

    if (error) {
      this.logger.error('删除用户仓库分配失败', { userId, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('用户仓库分配删除成功', { userId })
    return true
  }

  /**
   * 删除仓库的所有用户分配
   * 删除成功后自动清除相关缓存
   *
   * @param warehouseId - 仓库 ID
   * @returns 是否删除成功
   */
  async deleteByWarehouse(warehouseId: string): Promise<boolean> {
    this.logger.debug('删除仓库所有用户分配', { warehouseId })

    const { error } = await this.supabase
      .from('warehouse_assignments')
      .delete()
      .eq('warehouse_id', warehouseId)

    if (error) {
      this.logger.error('删除仓库用户分配失败', { warehouseId, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('仓库用户分配删除成功', { warehouseId })
    return true
  }

  /**
   * 更新或插入仓库分配（Upsert）
   * 如果分配已存在则更新，否则创建新分配
   * 操作成功后自动清除相关缓存
   *
   * @param input - 仓库分配输入数据
   * @returns 更新或创建的仓库分配，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const assignment = await warehouseAssignmentsRepository.upsertAssignment({
   *   user_id: 'user-123',
   *   warehouse_id: 'warehouse-456',
   *   permission_level: 'view_only'
   * })
   * ```
   */
  async upsertAssignment(input: WarehouseAssignmentInput): Promise<WarehouseAssignment | null> {
    this.logger.debug('Upsert 仓库分配', { userId: input.user_id, warehouseId: input.warehouse_id })

    const { data, error } = await this.supabase
      .from('warehouse_assignments')
      .upsert(
        {
          user_id: input.user_id,
          warehouse_id: input.warehouse_id,
          assigned_by: input.assigned_by,
          permission_level: input.permission_level
        },
        {
          onConflict: 'user_id,warehouse_id'
        }
      )
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('Upsert 仓库分配失败', { input, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('仓库分配 Upsert 成功', { id: (data as WarehouseAssignment)?.id })
    return data as WarehouseAssignment | null
  }

  /**
   * 批量设置用户的仓库分配
   * 先删除用户现有的所有分配，然后创建新的分配
   *
   * @param userId - 用户 ID
   * @param warehouseIds - 仓库 ID 列表
   * @param assignedBy - 分配者 ID（可选）
   * @param permissionLevel - 权限级别（可选）
   * @returns 是否设置成功
   */
  async setUserWarehouses(
    userId: string,
    warehouseIds: string[],
    assignedBy?: string,
    permissionLevel?: PermissionLevel
  ): Promise<boolean> {
    this.logger.debug('设置用户仓库分配', { userId, warehouseIds })

    // 先删除用户现有的所有分配
    const deleteSuccess = await this.deleteByUser(userId)
    if (!deleteSuccess) {
      return false
    }

    // 如果没有新的仓库分配，直接返回成功
    if (warehouseIds.length === 0) {
      return true
    }

    // 创建新的分配
    const assignments = warehouseIds.map(warehouseId => ({
      user_id: userId,
      warehouse_id: warehouseId,
      assigned_by: assignedBy,
      permission_level: permissionLevel
    }))

    const { error } = await this.supabase
      .from('warehouse_assignments')
      .insert(assignments)

    if (error) {
      this.logger.error('批量创建仓库分配失败', { userId, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('用户仓库分配设置成功', { userId, count: warehouseIds.length })
    return true
  }

  /**
   * 批量设置仓库的用户分配
   * 先删除仓库现有的所有分配，然后创建新的分配
   *
   * @param warehouseId - 仓库 ID
   * @param userIds - 用户 ID 列表
   * @param assignedBy - 分配者 ID（可选）
   * @param permissionLevel - 权限级别（可选）
   * @returns 是否设置成功
   */
  async setWarehouseUsers(
    warehouseId: string,
    userIds: string[],
    assignedBy?: string,
    permissionLevel?: PermissionLevel
  ): Promise<boolean> {
    this.logger.debug('设置仓库用户分配', { warehouseId, userIds })

    // 先删除仓库现有的所有分配
    const deleteSuccess = await this.deleteByWarehouse(warehouseId)
    if (!deleteSuccess) {
      return false
    }

    // 如果没有新的用户分配，直接返回成功
    if (userIds.length === 0) {
      return true
    }

    // 创建新的分配
    const assignments = userIds.map(userId => ({
      user_id: userId,
      warehouse_id: warehouseId,
      assigned_by: assignedBy,
      permission_level: permissionLevel
    }))

    const { error } = await this.supabase
      .from('warehouse_assignments')
      .insert(assignments)

    if (error) {
      this.logger.error('批量创建用户分配失败', { warehouseId, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('仓库用户分配设置成功', { warehouseId, count: userIds.length })
    return true
  }
}

// ==================== 单例导出 ====================

/**
 * WarehouseAssignmentsRepository 单例实例
 * 推荐使用此实例而非创建新实例
 */
export const warehouseAssignmentsRepository = new WarehouseAssignmentsRepository()
