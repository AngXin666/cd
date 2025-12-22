/**
 * 仓库数据 Repository
 * 提供仓库信息的数据访问层，带有缓存支持
 *
 * 功能包括：
 * - 获取所有仓库（带缓存，TTL 10 分钟）
 * - 获取司机/管理员的仓库列表（带缓存，TTL 10 分钟）
 * - 创建/更新/删除仓库时自动清除缓存
 *
 * @module db/repositories/WarehousesRepository
 */

import { BaseRepository, type BaseEntity, type QueryOptions } from './BaseRepository'
import type { Warehouse, WarehouseInput, WarehouseUpdate } from '../types'

// ==================== 缓存配置常量 ====================

/**
 * 仓库缓存 TTL：10 分钟
 * 仓库数据变化频率较低，使用较长的缓存时间
 */
const WAREHOUSES_CACHE_TTL = 10 * 60 * 1000

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = 'warehouses'

// ==================== 类型定义 ====================

/**
 * 仓库实体接口
 * 继承 BaseEntity 以支持 BaseRepository 的泛型约束
 */
interface WarehouseEntity extends Omit<Warehouse, 'created_at' | 'updated_at'>, BaseEntity {}

// ==================== WarehousesRepository 类 ====================

/**
 * 仓库数据 Repository
 * 提供仓库信息的数据访问，带有缓存支持
 *
 * @example
 * ```typescript
 * import { warehousesRepository } from '@/db/repositories'
 *
 * // 获取所有仓库
 * const warehouses = await warehousesRepository.getAllWarehouses()
 *
 * // 获取司机的仓库列表
 * const driverWarehouses = await warehousesRepository.getDriverWarehouses(driverId)
 *
 * // 获取管理员的仓库列表
 * const managerWarehouses = await warehousesRepository.getManagerWarehouses(managerId)
 *
 * // 更新仓库设置
 * await warehousesRepository.updateSettings(warehouseId, { max_leave_days: 5 })
 * ```
 */
export class WarehousesRepository extends BaseRepository<WarehouseEntity> {
  /**
   * 创建 WarehousesRepository 实例
   * 配置仓库表和缓存设置
   */
  constructor() {
    super({
      tableName: 'warehouses',
      cachePrefix: CACHE_PREFIX,
      defaultTTL: WAREHOUSES_CACHE_TTL,
      enableCache: true
    })
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 清除所有仓库相关缓存
   * 在仓库创建/更新/删除时调用此方法确保下次查询获取最新数据
   *
   * @example
   * ```typescript
   * // 数据变更后清除缓存
   * warehousesRepository.invalidateCache()
   * ```
   */
  public invalidateCache(): void {
    super.invalidateCache()
  }

  // ==================== 查询方法 ====================

  /**
   * 获取所有仓库
   * 带缓存支持，TTL 10 分钟
   *
   * @param options - 查询选项
   * @returns 所有仓库列表
   *
   * @example
   * ```typescript
   * const warehouses = await warehousesRepository.getAllWarehouses()
   * console.log(`共有 ${warehouses.length} 个仓库`)
   * ```
   */
  async getAllWarehouses(options: QueryOptions = {}): Promise<Warehouse[]> {
    const { useCache = true, cacheTTL = WAREHOUSES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey('all')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<Warehouse[]>(cacheKey)
      if (cached) {
        this.logger.debug('所有仓库缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询所有仓库')
    const { data, error } = await this.supabase
      .from('warehouses')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      this.logger.error('获取所有仓库失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('所有仓库已缓存', { count: result.length })
    }

    return result as Warehouse[]
  }

  /**
   * 根据 ID 获取仓库
   * 带缓存支持，TTL 10 分钟
   *
   * @param id - 仓库 ID
   * @param options - 查询选项
   * @returns 仓库信息，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const warehouse = await warehousesRepository.getWarehouseById('warehouse-123')
   * if (warehouse) {
   *   console.log('仓库名称:', warehouse.name)
   * }
   * ```
   */
  async getWarehouseById(id: string, options: QueryOptions = {}): Promise<Warehouse | null> {
    const { useCache = true, cacheTTL = WAREHOUSES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`id_${id}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<Warehouse>(cacheKey)
      if (cached) {
        this.logger.debug('仓库缓存命中', { id })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询仓库', { id })
    const { data, error } = await this.supabase
      .from('warehouses')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      this.logger.error('获取仓库失败', { id, error: error.message })
      return null
    }

    // 缓存结果
    if (useCache && data) {
      this.setToCache(cacheKey, data, cacheTTL)
      this.logger.debug('仓库已缓存', { id })
    }

    return data as Warehouse | null
  }

  /**
   * 获取司机的仓库列表
   * 通过 warehouse_assignments 表关联查询
   * 带缓存支持，TTL 10 分钟
   *
   * @param driverId - 司机用户 ID
   * @param options - 查询选项
   * @returns 司机关联的仓库列表
   *
   * @example
   * ```typescript
   * const warehouses = await warehousesRepository.getDriverWarehouses('driver-123')
   * console.log(`司机关联 ${warehouses.length} 个仓库`)
   * ```
   */
  async getDriverWarehouses(driverId: string, options: QueryOptions = {}): Promise<Warehouse[]> {
    const { useCache = true, cacheTTL = WAREHOUSES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`driver_${driverId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<Warehouse[]>(cacheKey)
      if (cached) {
        this.logger.debug('司机仓库缓存命中', { driverId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询（通过 warehouse_assignments 关联）
    this.logger.debug('从数据库查询司机仓库', { driverId })
    const { data, error } = await this.supabase
      .from('warehouse_assignments')
      .select('warehouse_id, warehouses(*)')
      .eq('user_id', driverId)

    if (error) {
      this.logger.error('获取司机仓库失败', { driverId, error: error.message })
      return []
    }

    // 提取仓库数据（Supabase 返回的关联数据可能是对象或数组）
    const warehouses: Warehouse[] = []
    for (const item of data || []) {
      const warehouseData = item.warehouses
      if (warehouseData) {
        // 如果是数组，取第一个元素；如果是对象，直接使用
        const warehouse = Array.isArray(warehouseData) ? warehouseData[0] : warehouseData
        if (warehouse) {
          warehouses.push(warehouse as Warehouse)
        }
      }
    }

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, warehouses, cacheTTL)
      this.logger.debug('司机仓库已缓存', { driverId, count: warehouses.length })
    }

    return warehouses
  }

  /**
   * 获取管理员的仓库列表
   * 通过 warehouse_assignments 表关联查询
   * 带缓存支持，TTL 10 分钟
   *
   * @param managerId - 管理员用户 ID
   * @param options - 查询选项
   * @returns 管理员关联的仓库列表
   *
   * @example
   * ```typescript
   * const warehouses = await warehousesRepository.getManagerWarehouses('manager-123')
   * console.log(`管理员管理 ${warehouses.length} 个仓库`)
   * ```
   */
  async getManagerWarehouses(managerId: string, options: QueryOptions = {}): Promise<Warehouse[]> {
    const { useCache = true, cacheTTL = WAREHOUSES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`manager_${managerId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<Warehouse[]>(cacheKey)
      if (cached) {
        this.logger.debug('管理员仓库缓存命中', { managerId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询（通过 warehouse_assignments 关联）
    this.logger.debug('从数据库查询管理员仓库', { managerId })
    const { data, error } = await this.supabase
      .from('warehouse_assignments')
      .select('warehouse_id, warehouses(*)')
      .eq('user_id', managerId)

    if (error) {
      this.logger.error('获取管理员仓库失败', { managerId, error: error.message })
      return []
    }

    // 提取仓库数据（Supabase 返回的关联数据可能是对象或数组）
    const warehouses: Warehouse[] = []
    for (const item of data || []) {
      const warehouseData = item.warehouses
      if (warehouseData) {
        // 如果是数组，取第一个元素；如果是对象，直接使用
        const warehouse = Array.isArray(warehouseData) ? warehouseData[0] : warehouseData
        if (warehouse) {
          warehouses.push(warehouse as Warehouse)
        }
      }
    }

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, warehouses, cacheTTL)
      this.logger.debug('管理员仓库已缓存', { managerId, count: warehouses.length })
    }

    return warehouses
  }

  /**
   * 获取仓库的分类列表
   *
   * @param warehouseId - 仓库 ID
   * @param options - 查询选项
   * @returns 仓库的分类 ID 列表
   */
  async getWarehouseCategories(warehouseId: string, options: QueryOptions = {}): Promise<string[]> {
    const { useCache = true, cacheTTL = WAREHOUSES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`categories_${warehouseId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<string[]>(cacheKey)
      if (cached) {
        this.logger.debug('仓库分类缓存命中', { warehouseId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询（通过 category_prices 表获取仓库关联的分类）
    this.logger.debug('从数据库查询仓库分类', { warehouseId })
    const { data, error } = await this.supabase
      .from('category_prices')
      .select('category_id')
      .eq('warehouse_id', warehouseId)

    if (error) {
      this.logger.error('获取仓库分类失败', { warehouseId, error: error.message })
      return []
    }

    // 提取分类 ID 并去重
    const categoryIds = [...new Set((data || []).map((item: { category_id: string }) => item.category_id))]

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, categoryIds, cacheTTL)
    }

    return categoryIds
  }

  /**
   * 获取仓库的司机 ID 列表
   *
   * @param warehouseId - 仓库 ID
   * @param options - 查询选项
   * @returns 仓库关联的司机 ID 列表
   */
  async getDriverIdsByWarehouse(warehouseId: string, options: QueryOptions = {}): Promise<string[]> {
    const { useCache = true, cacheTTL = WAREHOUSES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`drivers_${warehouseId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<string[]>(cacheKey)
      if (cached) {
        this.logger.debug('仓库司机缓存命中', { warehouseId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询仓库司机', { warehouseId })
    const { data, error } = await this.supabase
      .from('warehouse_assignments')
      .select('user_id')
      .eq('warehouse_id', warehouseId)

    if (error) {
      this.logger.error('获取仓库司机失败', { warehouseId, error: error.message })
      return []
    }

    const driverIds = (data || []).map((item: { user_id: string }) => item.user_id)

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, driverIds, cacheTTL)
    }

    return driverIds
  }

  // ==================== 写操作方法 ====================

  /**
   * 创建仓库
   * 创建成功后自动清除相关缓存
   *
   * @param input - 仓库输入数据
   * @returns 创建的仓库，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const warehouse = await warehousesRepository.createWarehouse({
   *   name: '新仓库',
   *   address: '北京市朝阳区'
   * })
   * ```
   */
  async createWarehouse(input: WarehouseInput): Promise<Warehouse | null> {
    this.logger.debug('创建仓库', { name: input.name })

    const { data, error } = await this.supabase
      .from('warehouses')
      .insert({
        name: input.name,
        address: input.address,
        contact_person: input.contact_person,
        contact_phone: input.contact_phone,
        is_active: input.is_active ?? true
      })
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('创建仓库失败', { input, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('仓库创建成功', { id: (data as Warehouse)?.id, name: input.name })
    return data as Warehouse | null
  }

  /**
   * 更新仓库
   * 更新成功后自动清除相关缓存
   *
   * @param id - 仓库 ID
   * @param update - 更新数据
   * @returns 更新后的仓库，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const updated = await warehousesRepository.updateWarehouse('warehouse-123', {
   *   name: '更新后的仓库名称'
   * })
   * ```
   */
  async updateWarehouse(id: string, update: WarehouseUpdate): Promise<Warehouse | null> {
    this.logger.debug('更新仓库', { id, update })

    const { data, error } = await this.supabase
      .from('warehouses')
      .update({
        ...update,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('更新仓库失败', { id, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('仓库更新成功', { id })
    return data as Warehouse | null
  }

  /**
   * 删除仓库
   * 删除成功后自动清除相关缓存
   *
   * @param id - 仓库 ID
   * @returns 是否删除成功
   *
   * @example
   * ```typescript
   * const success = await warehousesRepository.deleteWarehouse('warehouse-123')
   * ```
   */
  async deleteWarehouse(id: string): Promise<boolean> {
    this.logger.debug('删除仓库', { id })

    const { error } = await this.supabase
      .from('warehouses')
      .delete()
      .eq('id', id)

    if (error) {
      this.logger.error('删除仓库失败', { id, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('仓库删除成功', { id })
    return true
  }

  /**
   * 更新仓库设置
   * 更新成功后自动清除相关缓存
   *
   * @param id - 仓库 ID
   * @param settings - 设置数据
   * @returns 更新后的仓库，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const updated = await warehousesRepository.updateSettings('warehouse-123', {
   *   max_leave_days: 5,
   *   resignation_notice_days: 30,
   *   daily_target: 100
   * })
   * ```
   */
  async updateSettings(
    id: string,
    settings: Pick<WarehouseUpdate, 'max_leave_days' | 'resignation_notice_days' | 'daily_target'>
  ): Promise<Warehouse | null> {
    this.logger.debug('更新仓库设置', { id, settings })

    return this.updateWarehouse(id, settings)
  }
}

// ==================== 单例导出 ====================

/**
 * WarehousesRepository 单例实例
 * 推荐使用此实例而非创建新实例
 */
export const warehousesRepository = new WarehousesRepository()
