/**
 * 品类价格 Repository
 * 提供品类价格的数据访问层，带有缓存支持
 *
 * 功能包括：
 * - 获取仓库品类价格（带缓存，TTL 5 分钟）
 * - 获取品类价格（带缓存，TTL 5 分钟）
 * - 创建/更新/删除品类价格时自动清除缓存
 *
 * @module db/repositories/CategoryPricesRepository
 */

import { BaseRepository, type BaseEntity, type QueryOptions } from './BaseRepository'
import type { CategoryPrice, CategoryPriceInput } from '../types'

// ==================== 缓存配置常量 ====================

/**
 * 品类价格缓存 TTL：5 分钟
 * 品类价格数据变化频率较低，使用中等的缓存时间
 */
const CATEGORY_PRICES_CACHE_TTL = 5 * 60 * 1000

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = 'category_prices'

// ==================== 类型定义 ====================

/**
 * 品类价格实体接口
 * 继承 BaseEntity 以支持 BaseRepository 的泛型约束
 */
interface CategoryPriceEntity extends Omit<CategoryPrice, 'created_at'>, BaseEntity {}

/**
 * 品类价格更新接口
 */
export interface CategoryPriceUpdate {
  /** 价格 */
  price?: number
  /** 纯司机单价 */
  driver_only_price?: number
  /** 带车司机单价 */
  driver_with_vehicle_price?: number
  /** 上楼价格 */
  upstairs_price?: number
  /** 分拣单价 */
  sorting_unit_price?: number
  /** 生效日期 */
  effective_date?: string
}

// ==================== CategoryPricesRepository 类 ====================

/**
 * 品类价格 Repository
 * 提供品类价格的数据访问，带有缓存支持
 *
 * @example
 * ```typescript
 * import { categoryPricesRepository } from '@/db/repositories'
 *
 * // 获取仓库品类价格
 * const prices = await categoryPricesRepository.getByWarehouse(warehouseId)
 *
 * // 获取品类价格
 * const categoryPrices = await categoryPricesRepository.getByCategory(categoryId)
 *
 * // 更新或插入品类价格
 * await categoryPricesRepository.upsertPrice({
 *   category_id: categoryId,
 *   warehouse_id: warehouseId,
 *   driver_only_price: 1.5,
 *   driver_with_vehicle_price: 2.0
 * })
 * ```
 */
export class CategoryPricesRepository extends BaseRepository<CategoryPriceEntity> {
  /**
   * 创建 CategoryPricesRepository 实例
   * 配置品类价格表和缓存设置
   */
  constructor() {
    super({
      tableName: 'category_prices',
      cachePrefix: CACHE_PREFIX,
      defaultTTL: CATEGORY_PRICES_CACHE_TTL,
      enableCache: true
    })
  }

  // ==================== 查询方法 ====================

  /**
   * 根据仓库 ID 获取品类价格
   * 带缓存支持，TTL 5 分钟
   *
   * @param warehouseId - 仓库 ID
   * @param options - 查询选项
   * @returns 仓库的品类价格列表
   *
   * @example
   * ```typescript
   * const prices = await categoryPricesRepository.getByWarehouse('warehouse-123')
   * console.log(`仓库有 ${prices.length} 个品类价格配置`)
   * ```
   */
  async getByWarehouse(warehouseId: string, options: QueryOptions = {}): Promise<CategoryPrice[]> {
    const { useCache = true, cacheTTL = CATEGORY_PRICES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`warehouse_${warehouseId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<CategoryPrice[]>(cacheKey)
      if (cached) {
        this.logger.debug('仓库品类价格缓存命中', { warehouseId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询仓库品类价格', { warehouseId })
    const { data, error } = await this.supabase
      .from('category_prices')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取仓库品类价格失败', { warehouseId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('仓库品类价格已缓存', { warehouseId, count: result.length })
    }

    return result as CategoryPrice[]
  }

  /**
   * 根据品类 ID 获取价格
   * 带缓存支持，TTL 5 分钟
   *
   * @param categoryId - 品类 ID
   * @param options - 查询选项
   * @returns 品类的价格列表（不同仓库可能有不同价格）
   *
   * @example
   * ```typescript
   * const prices = await categoryPricesRepository.getByCategory('category-123')
   * console.log(`品类在 ${prices.length} 个仓库有价格配置`)
   * ```
   */
  async getByCategory(categoryId: string, options: QueryOptions = {}): Promise<CategoryPrice[]> {
    const { useCache = true, cacheTTL = CATEGORY_PRICES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`category_${categoryId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<CategoryPrice[]>(cacheKey)
      if (cached) {
        this.logger.debug('品类价格缓存命中', { categoryId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询品类价格', { categoryId })
    const { data, error } = await this.supabase
      .from('category_prices')
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取品类价格失败', { categoryId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('品类价格已缓存', { categoryId, count: result.length })
    }

    return result as CategoryPrice[]
  }

  /**
   * 获取特定仓库和品类的价格
   *
   * @param warehouseId - 仓库 ID
   * @param categoryId - 品类 ID
   * @param options - 查询选项
   * @returns 品类价格，如果不存在则返回 null
   */
  async getPrice(
    warehouseId: string,
    categoryId: string,
    options: QueryOptions = {}
  ): Promise<CategoryPrice | null> {
    const { useCache = true, cacheTTL = CATEGORY_PRICES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`warehouse_${warehouseId}_category_${categoryId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<CategoryPrice>(cacheKey)
      if (cached) {
        this.logger.debug('品类价格缓存命中', { warehouseId, categoryId })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询品类价格', { warehouseId, categoryId })
    const { data, error } = await this.supabase
      .from('category_prices')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .eq('category_id', categoryId)
      .maybeSingle()

    if (error) {
      this.logger.error('获取品类价格失败', { warehouseId, categoryId, error: error.message })
      return null
    }

    // 缓存结果
    if (useCache && data) {
      this.setToCache(cacheKey, data, cacheTTL)
    }

    return data as CategoryPrice | null
  }

  /**
   * 获取所有品类价格
   *
   * @param options - 查询选项
   * @returns 所有品类价格列表
   */
  async getAllPrices(options: QueryOptions = {}): Promise<CategoryPrice[]> {
    const { useCache = true, cacheTTL = CATEGORY_PRICES_CACHE_TTL, limit = 1000 } = options
    const cacheKey = this.getCacheKey('all')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<CategoryPrice[]>(cacheKey)
      if (cached) {
        this.logger.debug('所有品类价格缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询所有品类价格')
    const { data, error } = await this.supabase
      .from('category_prices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error('获取所有品类价格失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as CategoryPrice[]
  }

  /**
   * 根据司机类型获取品类价格
   *
   * @param warehouseId - 仓库 ID
   * @param categoryId - 品类 ID
   * @param driverType - 司机类型（'pure' 或 'with_vehicle'）
   * @param options - 查询选项
   * @returns 对应司机类型的单价
   */
  async getPriceForDriverType(
    warehouseId: string,
    categoryId: string,
    driverType: 'pure' | 'with_vehicle',
    options: QueryOptions = {}
  ): Promise<number | null> {
    const price = await this.getPrice(warehouseId, categoryId, options)
    
    if (!price) {
      return null
    }

    // 根据司机类型返回对应价格
    if (driverType === 'pure') {
      return price.driver_only_price ?? price.price ?? null
    } else {
      return price.driver_with_vehicle_price ?? price.price ?? null
    }
  }

  // ==================== 写操作方法 ====================

  /**
   * 更新或插入品类价格（Upsert）
   * 如果价格已存在则更新，否则创建新价格
   * 操作成功后自动清除相关缓存
   *
   * @param input - 品类价格输入数据
   * @returns 更新或创建的品类价格，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const price = await categoryPricesRepository.upsertPrice({
   *   category_id: 'category-123',
   *   warehouse_id: 'warehouse-456',
   *   driver_only_price: 1.5,
   *   driver_with_vehicle_price: 2.0
   * })
   * ```
   */
  async upsertPrice(input: CategoryPriceInput): Promise<CategoryPrice | null> {
    this.logger.debug('Upsert 品类价格', { categoryId: input.category_id, warehouseId: input.warehouse_id })

    const { data, error } = await this.supabase
      .from('category_prices')
      .upsert(
        {
          category_id: input.category_id,
          warehouse_id: input.warehouse_id,
          price: input.price ?? input.driver_only_price ?? 0,
          driver_only_price: input.driver_only_price,
          driver_with_vehicle_price: input.driver_with_vehicle_price,
          driver_type: input.driver_type,
          effective_date: input.effective_date || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'category_id,warehouse_id'
        }
      )
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('Upsert 品类价格失败', { input, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('品类价格 Upsert 成功', { id: (data as CategoryPrice)?.id })
    return data as CategoryPrice | null
  }

  /**
   * 批量更新或插入品类价格
   * 操作成功后自动清除相关缓存
   *
   * @param inputs - 品类价格输入数据数组
   * @returns 更新或创建的品类价格数组
   *
   * @example
   * ```typescript
   * const prices = await categoryPricesRepository.batchUpsertPrices([
   *   { category_id: 'cat-1', warehouse_id: 'wh-1', driver_only_price: 1.5, driver_with_vehicle_price: 2.0 },
   *   { category_id: 'cat-2', warehouse_id: 'wh-1', driver_only_price: 2.0, driver_with_vehicle_price: 2.5 }
   * ])
   * ```
   */
  async batchUpsertPrices(inputs: CategoryPriceInput[]): Promise<CategoryPrice[]> {
    if (inputs.length === 0) {
      return []
    }

    this.logger.debug('批量 Upsert 品类价格', { count: inputs.length })

    const prices = inputs.map(input => ({
      category_id: input.category_id,
      warehouse_id: input.warehouse_id,
      price: input.price ?? input.driver_only_price ?? 0,
      driver_only_price: input.driver_only_price,
      driver_with_vehicle_price: input.driver_with_vehicle_price,
      driver_type: input.driver_type,
      effective_date: input.effective_date || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    }))

    const { data, error } = await this.supabase
      .from('category_prices')
      .upsert(prices, {
        onConflict: 'category_id,warehouse_id'
      })
      .select()

    if (error) {
      this.logger.error('批量 Upsert 品类价格失败', { error: error.message })
      return []
    }

    // 清除相关缓存
    this.invalidateCache()

    const result = Array.isArray(data) ? data : []
    this.logger.info('批量 Upsert 品类价格成功', { count: result.length })
    return result as CategoryPrice[]
  }

  /**
   * 删除品类价格
   * 删除成功后自动清除相关缓存
   *
   * @param id - 品类价格 ID
   * @returns 是否删除成功
   *
   * @example
   * ```typescript
   * const success = await categoryPricesRepository.deletePrice('price-123')
   * ```
   */
  async deletePrice(id: string): Promise<boolean> {
    this.logger.debug('删除品类价格', { id })

    const { error } = await this.supabase
      .from('category_prices')
      .delete()
      .eq('id', id)

    if (error) {
      this.logger.error('删除品类价格失败', { id, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('品类价格删除成功', { id })
    return true
  }

  /**
   * 删除仓库的所有品类价格
   * 删除成功后自动清除相关缓存
   *
   * @param warehouseId - 仓库 ID
   * @returns 是否删除成功
   */
  async deleteByWarehouse(warehouseId: string): Promise<boolean> {
    this.logger.debug('删除仓库所有品类价格', { warehouseId })

    const { error } = await this.supabase
      .from('category_prices')
      .delete()
      .eq('warehouse_id', warehouseId)

    if (error) {
      this.logger.error('删除仓库品类价格失败', { warehouseId, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('仓库品类价格删除成功', { warehouseId })
    return true
  }

  /**
   * 删除品类的所有价格
   * 删除成功后自动清除相关缓存
   *
   * @param categoryId - 品类 ID
   * @returns 是否删除成功
   */
  async deleteByCategory(categoryId: string): Promise<boolean> {
    this.logger.debug('删除品类所有价格', { categoryId })

    const { error } = await this.supabase
      .from('category_prices')
      .delete()
      .eq('category_id', categoryId)

    if (error) {
      this.logger.error('删除品类价格失败', { categoryId, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('品类价格删除成功', { categoryId })
    return true
  }

  /**
   * 更新品类价格
   * 更新成功后自动清除相关缓存
   *
   * @param id - 品类价格 ID
   * @param update - 更新数据
   * @returns 更新后的品类价格，如果失败则返回 null
   */
  async updatePrice(id: string, update: CategoryPriceUpdate): Promise<CategoryPrice | null> {
    this.logger.debug('更新品类价格', { id, update })

    const { data, error } = await this.supabase
      .from('category_prices')
      .update({
        ...update,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('更新品类价格失败', { id, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('品类价格更新成功', { id })
    return data as CategoryPrice | null
  }
}

// ==================== 单例导出 ====================

/**
 * CategoryPricesRepository 单例实例
 * 推荐使用此实例而非创建新实例
 */
export const categoryPricesRepository = new CategoryPricesRepository()
