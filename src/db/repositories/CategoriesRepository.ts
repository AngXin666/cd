/**
 * 品类 Repository
 * 提供计件品类数据的访问和缓存管理
 *
 * 功能包括：
 * - 获取所有启用的品类（带缓存，TTL 10 分钟）
 * - 获取所有品类（带缓存，TTL 10 分钟）
 * - 品类的 CRUD 操作
 * - 自动缓存失效管理
 *
 * @module db/repositories/CategoriesRepository
 */

import { BaseRepository, type BaseEntity, type QueryOptions } from './BaseRepository'
import type { PieceWorkCategory, PieceWorkCategoryInput } from '../types'
import { publish } from '@/utils/eventBus'

/**
 * 品类缓存键前缀
 * 用于生成唯一的缓存键
 */
const CATEGORIES_CACHE_PREFIX = 'categories'

/**
 * 品类缓存 TTL：10 分钟
 * 品类数据不常变化，使用较长的缓存时间
 */
const CATEGORIES_CACHE_TTL = 10 * 60 * 1000

/**
 * 品类实体接口
 * 继承 BaseEntity，添加品类特有字段
 */
interface CategoryEntity extends BaseEntity {
  /** 品类名称 */
  name: string
  /** 品类描述 */
  description: string | null
}

/**
 * 品类 Repository 类
 * 继承 BaseRepository，提供品类特有的数据访问方法
 *
 * @example
 * ```typescript
 * // 获取所有启用的品类
 * const categories = await categoriesRepository.getActiveCategories()
 *
 * // 获取所有品类
 * const allCategories = await categoriesRepository.getAllCategories()
 *
 * // 创建新品类（自动清除缓存）
 * const newCategory = await categoriesRepository.createCategory({
 *   name: '新品类',
 *   description: '品类描述'
 * })
 * ```
 */
export class CategoriesRepository extends BaseRepository<CategoryEntity> {
  constructor() {
    super({
      tableName: 'piece_work_categories',
      cachePrefix: CATEGORIES_CACHE_PREFIX,
      defaultTTL: CATEGORIES_CACHE_TTL,
      enableCache: true
    })
  }

  /**
   * 获取所有启用的品类
   * 带缓存，TTL 10 分钟
   *
   * @param options - 查询选项
   * @returns 启用的品类数组
   *
   * @example
   * ```typescript
   * const activeCategories = await categoriesRepository.getActiveCategories()
   * console.log('启用品类数量:', activeCategories.length)
   * ```
   */
  async getActiveCategories(options: QueryOptions = {}): Promise<PieceWorkCategory[]> {
    const { useCache = true, cacheTTL } = options
    const cacheKey = this.getCacheKey('active')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<PieceWorkCategory[]>(cacheKey)
      if (cached) {
        this.logger.debug('获取启用品类 - 缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('获取启用品类 - 从数据库查询')
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id, name, description, created_at, updated_at')
        .order('name', { ascending: true })

      if (error) {
        this.logger.error('获取启用品类失败', { error: error.message })
        return []
      }

      // 转换为 PieceWorkCategory 格式
      const result: PieceWorkCategory[] = Array.isArray(data)
        ? data.map((item) => ({
            id: item.id,
            name: item.name,
            category_name: item.name,
            description: item.description,
            is_active: true,
            created_at: item.created_at,
            updated_at: item.updated_at
          }))
        : []

      // 缓存结果
      if (useCache) {
        this.setToCache(cacheKey, result, cacheTTL ?? CATEGORIES_CACHE_TTL)
      }

      this.logger.debug('获取启用品类完成', { count: result.length })
      return result
    } catch (error) {
      this.logger.error('获取启用品类异常', { error: String(error) })
      return []
    }
  }

  /**
   * 获取所有品类
   * 带缓存，TTL 10 分钟
   *
   * @param options - 查询选项
   * @returns 所有品类数组
   *
   * @example
   * ```typescript
   * const allCategories = await categoriesRepository.getAllCategories()
   * console.log('品类总数:', allCategories.length)
   * ```
   */
  async getAllCategories(options: QueryOptions = {}): Promise<PieceWorkCategory[]> {
    const { useCache = true, cacheTTL } = options
    const cacheKey = this.getCacheKey('all_categories')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<PieceWorkCategory[]>(cacheKey)
      if (cached) {
        this.logger.debug('获取所有品类 - 缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('获取所有品类 - 从数据库查询')
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id, name, description, created_at, updated_at')
        .order('name', { ascending: true })

      if (error) {
        this.logger.error('获取所有品类失败', { error: error.message })
        return []
      }

      // 转换为 PieceWorkCategory 格式
      const result: PieceWorkCategory[] = Array.isArray(data)
        ? data.map((item) => ({
            id: item.id,
            name: item.name,
            category_name: item.name,
            description: item.description,
            is_active: true,
            created_at: item.created_at,
            updated_at: item.updated_at
          }))
        : []

      // 缓存结果
      if (useCache) {
        this.setToCache(cacheKey, result, cacheTTL ?? CATEGORIES_CACHE_TTL)
      }

      this.logger.debug('获取所有品类完成', { count: result.length })
      return result
    } catch (error) {
      this.logger.error('获取所有品类异常', { error: String(error) })
      return []
    }
  }

  /**
   * 创建品类
   * 创建成功后自动清除缓存并发布事件
   *
   * @param input - 品类输入数据
   * @returns 创建的品类对象，失败返回 null
   *
   * @example
   * ```typescript
   * const newCategory = await categoriesRepository.createCategory({
   *   name: '新品类',
   *   description: '品类描述'
   * })
   * if (newCategory) {
   *   console.log('品类创建成功:', newCategory.id)
   * }
   * ```
   */
  async createCategory(input: PieceWorkCategoryInput): Promise<PieceWorkCategory | null> {
    this.logger.debug('创建品类', { name: input.name })

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert({
          name: input.name,
          description: input.description
        })
        .select()
        .maybeSingle()

      if (error) {
        this.logger.error('创建品类失败', { error: error.message })
        return null
      }

      if (data) {
        // 转换为 PieceWorkCategory 格式
        const result: PieceWorkCategory = {
          id: data.id,
          name: data.name,
          description: data.description,
          is_active: true,
          created_at: data.created_at,
          updated_at: data.updated_at
        }

        // 清除缓存
        this.invalidateCache()

        // 发布品类创建事件，通知相关页面刷新
        publish('category:created', {
          id: result.id,
          name: result.name,
          description: result.description
        })

        this.logger.info('品类创建成功', { id: result.id, name: result.name })
        return result
      }

      return null
    } catch (error) {
      this.logger.error('创建品类异常', { error: String(error) })
      return null
    }
  }

  /**
   * 更新品类
   * 更新成功后自动清除缓存并发布事件
   *
   * @param id - 品类 ID
   * @param updates - 更新数据
   * @returns 是否更新成功
   *
   * @example
   * ```typescript
   * const success = await categoriesRepository.updateCategory('category-id', {
   *   name: '更新后的名称'
   * })
   * ```
   */
  async updateCategory(id: string, updates: Partial<PieceWorkCategoryInput>): Promise<boolean> {
    this.logger.debug('更新品类', { id, updates })

    try {
      // 构建更新数据
      const mappedUpdates: Partial<{ name: string; description: string; updated_at: string }> = {
        updated_at: new Date().toISOString()
      }
      if (updates.name !== undefined) mappedUpdates.name = updates.name
      if (updates.description !== undefined) mappedUpdates.description = updates.description

      const { error } = await this.supabase
        .from(this.tableName)
        .update(mappedUpdates)
        .eq('id', id)

      if (error) {
        this.logger.error('更新品类失败', { id, error: error.message })
        return false
      }

      // 清除缓存
      this.invalidateCache()

      // 发布品类更新事件，通知相关页面刷新
      publish('category:updated', {
        id,
        ...updates
      })

      this.logger.info('品类更新成功', { id })
      return true
    } catch (error) {
      this.logger.error('更新品类异常', { id, error: String(error) })
      return false
    }
  }

  /**
   * 删除品类
   * 删除成功后自动清除缓存并发布事件
   * 注意：会先删除关联的价格记录
   *
   * @param id - 品类 ID
   * @returns 是否删除成功
   *
   * @example
   * ```typescript
   * const success = await categoriesRepository.deleteCategory('category-id')
   * if (success) {
   *   console.log('品类已删除')
   * }
   * ```
   */
  async deleteCategory(id: string): Promise<boolean> {
    this.logger.debug('删除品类', { id })

    try {
      // 1. 先删除关联的价格记录
      const { error: priceError } = await this.supabase
        .from('category_prices')
        .delete()
        .eq('category_id', id)

      if (priceError) {
        this.logger.error('删除关联价格记录失败', { id, error: priceError.message })
        return false
      }

      // 2. 删除品类
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) {
        this.logger.error('删除品类失败', { id, error: error.message })
        return false
      }

      // 3. 清除缓存
      this.invalidateCache()

      // 4. 发布品类删除事件，通知相关页面刷新
      publish('category:deleted', { id })

      this.logger.info('品类删除成功', { id })
      return true
    } catch (error) {
      this.logger.error('删除品类异常', { id, error: String(error) })
      return false
    }
  }

  /**
   * 根据 ID 获取品类
   *
   * @param id - 品类 ID
   * @param options - 查询选项
   * @returns 品类对象，不存在返回 null
   */
  async getCategoryById(id: string, options: QueryOptions = {}): Promise<PieceWorkCategory | null> {
    const { useCache = true, cacheTTL } = options
    const cacheKey = this.getCacheKey(`id_${id}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<PieceWorkCategory>(cacheKey)
      if (cached) {
        this.logger.debug('获取品类 - 缓存命中', { id })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('获取品类 - 从数据库查询', { id })
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id, name, description, created_at, updated_at')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        this.logger.error('获取品类失败', { id, error: error.message })
        return null
      }

      if (!data) {
        return null
      }

      // 转换为 PieceWorkCategory 格式
      const result: PieceWorkCategory = {
        id: data.id,
        name: data.name,
        category_name: data.name,
        description: data.description,
        is_active: true,
        created_at: data.created_at,
        updated_at: data.updated_at
      }

      // 缓存结果
      if (useCache) {
        this.setToCache(cacheKey, result, cacheTTL ?? CATEGORIES_CACHE_TTL)
      }

      return result
    } catch (error) {
      this.logger.error('获取品类异常', { id, error: String(error) })
      return null
    }
  }
}

/**
 * 品类 Repository 单例实例
 * 推荐使用此实例进行品类数据访问
 *
 * @example
 * ```typescript
 * import { categoriesRepository } from '@/db/repositories'
 *
 * // 获取所有启用的品类
 * const categories = await categoriesRepository.getActiveCategories()
 * ```
 */
export const categoriesRepository = new CategoriesRepository()
