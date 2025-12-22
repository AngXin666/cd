/**
 * Repository 基类
 * 提供统一的 CRUD 操作和缓存管理功能
 *
 * 该基类实现了 Repository 模式，为所有数据访问层提供：
 * - 统一的 CRUD 操作接口
 * - 内置的缓存管理（支持 TTL 和启用/禁用）
 * - 完整的日志记录
 * - 类型安全的泛型支持
 *
 * @module db/repositories/BaseRepository
 */

import { supabase } from '@/client/supabase'
import { CACHE_KEYS, getCache, setCache, clearCache, clearCacheByPrefix } from '@/utils/cache'
import { createLogger, Logger } from '@/utils/logger'

/**
 * Repository 配置选项
 * 用于初始化 Repository 实例时的配置
 */
export interface RepositoryOptions {
  /** 数据库表名 */
  tableName: string
  /** 缓存键前缀，用于生成唯一的缓存键 */
  cachePrefix: string
  /** 默认缓存 TTL（毫秒），默认 5 分钟 */
  defaultTTL?: number
  /** 是否启用缓存，默认 true */
  enableCache?: boolean
}

/**
 * 基础实体接口
 * 所有数据库实体必须包含 id 字段
 */
export interface BaseEntity {
  /** 实体唯一标识符 */
  id: string
  /** 创建时间 */
  created_at?: string
  /** 更新时间 */
  updated_at?: string
}

/**
 * 查询选项接口
 * 用于自定义查询行为
 */
export interface QueryOptions {
  /** 是否使用缓存，默认 true */
  useCache?: boolean
  /** 自定义缓存 TTL（毫秒） */
  cacheTTL?: number
  /** 排序字段 */
  orderBy?: string
  /** 排序方向 */
  orderDirection?: 'asc' | 'desc'
  /** 查询限制数量 */
  limit?: number
  /** 查询偏移量 */
  offset?: number
}

/**
 * 缓存统计信息接口
 */
export interface CacheStats {
  /** 缓存命中次数 */
  hits: number
  /** 缓存未命中次数 */
  misses: number
  /** 缓存命中率 */
  hitRate: number
}


/**
 * 基础 Repository 抽象类
 * 提供统一的 CRUD 操作和缓存管理
 *
 * @template T - 实体类型，必须继承 BaseEntity
 *
 * @example
 * ```typescript
 * // 创建用户 Repository
 * class UsersRepository extends BaseRepository<User> {
 *   constructor() {
 *     super({
 *       tableName: 'users',
 *       cachePrefix: 'users',
 *       defaultTTL: 5 * 60 * 1000 // 5 分钟
 *     })
 *   }
 *
 *   // 自定义方法
 *   async getAllDrivers(): Promise<User[]> {
 *     return this.getAll({ useCache: true })
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<T extends BaseEntity> {
  /** Supabase 客户端实例 */
  protected readonly supabase = supabase

  /** 日志记录器实例 */
  protected readonly logger: Logger

  /** 数据库表名 */
  protected readonly tableName: string

  /** 缓存键前缀 */
  protected readonly cachePrefix: string

  /** 默认缓存 TTL（毫秒） */
  protected readonly defaultTTL: number

  /** 是否启用缓存 */
  protected readonly enableCache: boolean

  /** 缓存统计信息 */
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0
  }

  /**
   * 创建 Repository 实例
   *
   * @param options - Repository 配置选项
   */
  constructor(options: RepositoryOptions) {
    this.tableName = options.tableName
    this.cachePrefix = options.cachePrefix
    // 默认 5 分钟缓存
    this.defaultTTL = options.defaultTTL ?? 5 * 60 * 1000
    // 默认启用缓存
    this.enableCache = options.enableCache ?? true
    // 创建带模块名的日志记录器
    this.logger = createLogger(`${options.tableName}Repository`)

    this.logger.debug('Repository 初始化完成', {
      tableName: this.tableName,
      cachePrefix: this.cachePrefix,
      defaultTTL: this.defaultTTL,
      enableCache: this.enableCache
    })
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 生成缓存键
   * 将前缀和后缀组合成唯一的缓存键
   *
   * @param suffix - 缓存键后缀
   * @returns 完整的缓存键
   *
   * @example
   * ```typescript
   * const key = this.getCacheKey('all') // 返回 'users_all'
   * const key = this.getCacheKey('id_123') // 返回 'users_id_123'
   * ```
   */
  protected getCacheKey(suffix: string): string {
    return `${this.cachePrefix}_${suffix}`
  }

  /**
   * 从缓存获取数据
   * 如果缓存禁用或数据不存在，返回 null
   *
   * @template R - 返回数据类型
   * @param key - 缓存键
   * @returns 缓存的数据，如果不存在则返回 null
   */
  protected getFromCache<R>(key: string): R | null {
    // 如果缓存禁用，直接返回 null
    if (!this.enableCache) {
      return null
    }

    const cached = getCache<R>(key)

    if (cached !== null) {
      // 更新缓存命中统计
      this.cacheStats.hits++
      this.updateHitRate()
      this.logger.debug('缓存命中', { key })
      return cached
    }

    // 更新缓存未命中统计
    this.cacheStats.misses++
    this.updateHitRate()
    this.logger.debug('缓存未命中', { key })
    return null
  }

  /**
   * 设置缓存数据
   * 如果缓存禁用，此方法不执行任何操作
   *
   * @template R - 数据类型
   * @param key - 缓存键
   * @param value - 要缓存的数据
   * @param ttl - 可选的自定义 TTL（毫秒），默认使用 defaultTTL
   */
  protected setToCache<R>(key: string, value: R, ttl?: number): void {
    // 如果缓存禁用，不执行任何操作
    if (!this.enableCache) {
      return
    }

    const actualTTL = ttl ?? this.defaultTTL
    setCache(key, value, actualTTL)
    this.logger.debug('缓存已设置', { key, ttl: actualTTL })
  }

  /**
   * 清除指定缓存键的数据
   *
   * @param key - 要清除的缓存键
   */
  protected clearCacheKey(key: string): void {
    clearCache(key)
    this.logger.debug('缓存已清除', { key })
  }

  /**
   * 清除所有相关缓存
   * 使用缓存前缀清除该 Repository 的所有缓存
   */
  protected invalidateCache(): void {
    clearCacheByPrefix(this.cachePrefix)
    this.logger.info('所有相关缓存已清除', { prefix: this.cachePrefix })
  }

  // ==================== 公开缓存失效方法（供外部调用） ====================

  /**
   * 公开的缓存失效方法
   * 清除该 Repository 的所有缓存
   *
   * 使用场景：
   * - Realtime 事件触发缓存失效
   * - 事件驱动的跨 Repository 缓存失效
   * - 登出时清除所有缓存
   *
   * @example
   * ```typescript
   * // 在 Realtime 事件处理器中
   * notificationsRepository.clearAllCache()
   * ```
   */
  public clearAllCache(): void {
    this.invalidateCache()
  }

  /**
   * 清除特定 key 的缓存
   *
   * @param keySuffix - 缓存键后缀（不包含前缀）
   *
   * @example
   * ```typescript
   * // 清除特定 ID 的缓存
   * vehiclesRepository.clearCacheByKey('id_vehicle-123')
   * ```
   */
  public clearCacheByKey(keySuffix: string): void {
    const fullKey = this.getCacheKey(keySuffix)
    this.clearCacheKey(fullKey)
  }

  /**
   * 清除特定用户相关的缓存
   *
   * @param userId - 用户 ID
   *
   * @example
   * ```typescript
   * // 清除用户相关的通知缓存
   * notificationsRepository.clearCacheByUser('user-123')
   * ```
   */
  public clearCacheByUser(userId: string): void {
    clearCacheByPrefix(`${this.cachePrefix}_user_${userId}`)
    this.logger.debug('用户相关缓存已清除', { userId, prefix: this.cachePrefix })
  }

  /**
   * 更新缓存命中率
   */
  private updateHitRate(): void {
    const total = this.cacheStats.hits + this.cacheStats.misses
    this.cacheStats.hitRate = total > 0 ? this.cacheStats.hits / total : 0
  }

  /**
   * 获取缓存统计信息
   *
   * @returns 缓存统计信息
   */
  public getCacheStats(): CacheStats {
    return { ...this.cacheStats }
  }

  /**
   * 重置缓存统计信息
   */
  public resetCacheStats(): void {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0
    }
  }


  // ==================== CRUD 操作方法 ====================

  /**
   * 根据 ID 获取单条记录
   * 优先从缓存获取，缓存未命中时从数据库查询
   *
   * @param id - 记录的唯一标识符
   * @param options - 查询选项
   * @returns 记录对象，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const user = await usersRepo.getById('user-123')
   * if (user) {
   *   console.log(user.name)
   * }
   * ```
   */
  async getById(id: string, options: QueryOptions = {}): Promise<T | null> {
    const { useCache = true, cacheTTL } = options
    const cacheKey = this.getCacheKey(`id_${id}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<T>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询记录', { id })
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      this.logger.error('查询记录失败', { id, error: error.message })
      return null
    }

    // 缓存结果
    if (data && useCache) {
      this.setToCache(cacheKey, data, cacheTTL)
    }

    return data as T | null
  }

  /**
   * 获取所有记录
   * 支持缓存、排序、分页等选项
   *
   * @param options - 查询选项
   * @returns 记录数组
   *
   * @example
   * ```typescript
   * // 获取所有记录（使用缓存）
   * const users = await usersRepo.getAll()
   *
   * // 获取所有记录（不使用缓存，按创建时间降序）
   * const users = await usersRepo.getAll({
   *   useCache: false,
   *   orderBy: 'created_at',
   *   orderDirection: 'desc'
   * })
   * ```
   */
  async getAll(options: QueryOptions = {}): Promise<T[]> {
    const {
      useCache = true,
      cacheTTL,
      orderBy = 'created_at',
      orderDirection = 'desc',
      limit,
      offset
    } = options

    // 生成缓存键（包含查询参数）
    const cacheKeySuffix = `all_${orderBy}_${orderDirection}_${limit ?? 'all'}_${offset ?? 0}`
    const cacheKey = this.getCacheKey(cacheKeySuffix)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<T[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 构建查询
    this.logger.debug('从数据库查询所有记录', { orderBy, orderDirection, limit, offset })
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .order(orderBy, { ascending: orderDirection === 'asc' })

    // 应用分页
    if (limit !== undefined) {
      query = query.limit(limit)
    }
    if (offset !== undefined) {
      query = query.range(offset, offset + (limit ?? 100) - 1)
    }

    const { data, error } = await query

    if (error) {
      this.logger.error('查询所有记录失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    this.logger.debug('查询完成', { count: result.length })
    return result as T[]
  }

  /**
   * 创建新记录
   * 创建成功后自动清除相关缓存
   *
   * @param data - 要创建的记录数据（不包含 id）
   * @returns 创建的记录，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const newUser = await usersRepo.create({
   *   name: '张三',
   *   email: 'zhangsan@example.com'
   * })
   * ```
   */
  async create(data: Partial<Omit<T, 'id'>>): Promise<T | null> {
    this.logger.debug('创建新记录', { data })

    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('创建记录失败', { error: error.message })
      return null
    }

    // 清除缓存，确保下次查询获取最新数据
    this.invalidateCache()

    this.logger.info('记录创建成功', { id: (created as T)?.id })
    return created as T | null
  }

  /**
   * 更新记录
   * 更新成功后自动清除相关缓存
   *
   * @param id - 要更新的记录 ID
   * @param data - 要更新的字段数据
   * @returns 更新后的记录，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const updatedUser = await usersRepo.update('user-123', {
   *   name: '李四'
   * })
   * ```
   */
  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<T | null> {
    this.logger.debug('更新记录', { id, data })

    // 添加更新时间
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    }

    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('更新记录失败', { id, error: error.message })
      return null
    }

    // 清除缓存
    this.invalidateCache()

    this.logger.info('记录更新成功', { id })
    return updated as T | null
  }

  /**
   * 删除记录
   * 删除成功后自动清除相关缓存
   *
   * @param id - 要删除的记录 ID
   * @returns 是否删除成功
   *
   * @example
   * ```typescript
   * const success = await usersRepo.delete('user-123')
   * if (success) {
   *   console.log('用户已删除')
   * }
   * ```
   */
  async delete(id: string): Promise<boolean> {
    this.logger.debug('删除记录', { id })

    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)

    if (error) {
      this.logger.error('删除记录失败', { id, error: error.message })
      return false
    }

    // 清除缓存
    this.invalidateCache()

    this.logger.info('记录删除成功', { id })
    return true
  }


  // ==================== 批量操作方法 ====================

  /**
   * 批量创建记录
   * 创建成功后自动清除相关缓存
   *
   * @param items - 要创建的记录数组
   * @returns 创建的记录数组
   *
   * @example
   * ```typescript
   * const newUsers = await usersRepo.createMany([
   *   { name: '张三', email: 'zhangsan@example.com' },
   *   { name: '李四', email: 'lisi@example.com' }
   * ])
   * ```
   */
  async createMany(items: Partial<Omit<T, 'id'>>[]): Promise<T[]> {
    if (items.length === 0) {
      return []
    }

    this.logger.debug('批量创建记录', { count: items.length })

    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert(items)
      .select()

    if (error) {
      this.logger.error('批量创建记录失败', { error: error.message })
      return []
    }

    // 清除缓存
    this.invalidateCache()

    const result = Array.isArray(created) ? created : []
    this.logger.info('批量创建成功', { count: result.length })
    return result as T[]
  }

  /**
   * 批量删除记录
   * 删除成功后自动清除相关缓存
   *
   * @param ids - 要删除的记录 ID 数组
   * @returns 是否全部删除成功
   *
   * @example
   * ```typescript
   * const success = await usersRepo.deleteMany(['user-1', 'user-2', 'user-3'])
   * ```
   */
  async deleteMany(ids: string[]): Promise<boolean> {
    if (ids.length === 0) {
      return true
    }

    this.logger.debug('批量删除记录', { count: ids.length })

    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .in('id', ids)

    if (error) {
      this.logger.error('批量删除记录失败', { error: error.message })
      return false
    }

    // 清除缓存
    this.invalidateCache()

    this.logger.info('批量删除成功', { count: ids.length })
    return true
  }

  // ==================== 条件查询方法 ====================

  /**
   * 根据条件查询记录
   * 支持缓存和自定义查询条件
   *
   * @param conditions - 查询条件对象
   * @param options - 查询选项
   * @returns 符合条件的记录数组
   *
   * @example
   * ```typescript
   * // 查询所有活跃用户
   * const activeUsers = await usersRepo.findBy({ status: 'active' })
   *
   * // 查询指定角色的用户（不使用缓存）
   * const managers = await usersRepo.findBy(
   *   { role: 'manager' },
   *   { useCache: false }
   * )
   * ```
   */
  async findBy(
    conditions: Partial<T>,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const {
      useCache = true,
      cacheTTL,
      orderBy = 'created_at',
      orderDirection = 'desc',
      limit,
      offset
    } = options

    // 生成缓存键（包含查询条件）
    const conditionsKey = JSON.stringify(conditions)
    const cacheKeySuffix = `findBy_${conditionsKey}_${orderBy}_${orderDirection}_${limit ?? 'all'}_${offset ?? 0}`
    const cacheKey = this.getCacheKey(cacheKeySuffix)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<T[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 构建查询
    this.logger.debug('条件查询记录', { conditions, orderBy, orderDirection })
    let query = this.supabase
      .from(this.tableName)
      .select('*')

    // 应用查询条件
    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    }

    // 应用排序
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // 应用分页
    if (limit !== undefined) {
      query = query.limit(limit)
    }
    if (offset !== undefined) {
      query = query.range(offset, offset + (limit ?? 100) - 1)
    }

    const { data, error } = await query

    if (error) {
      this.logger.error('条件查询失败', { conditions, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    this.logger.debug('条件查询完成', { count: result.length })
    return result as T[]
  }

  /**
   * 根据条件查询单条记录
   *
   * @param conditions - 查询条件对象
   * @param options - 查询选项
   * @returns 符合条件的第一条记录，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const user = await usersRepo.findOneBy({ email: 'test@example.com' })
   * ```
   */
  async findOneBy(
    conditions: Partial<T>,
    options: QueryOptions = {}
  ): Promise<T | null> {
    const results = await this.findBy(conditions, { ...options, limit: 1 })
    return results.length > 0 ? results[0] : null
  }

  /**
   * 统计符合条件的记录数量
   *
   * @param conditions - 查询条件对象（可选）
   * @returns 记录数量
   *
   * @example
   * ```typescript
   * // 统计所有记录
   * const total = await usersRepo.count()
   *
   * // 统计活跃用户数量
   * const activeCount = await usersRepo.count({ status: 'active' })
   * ```
   */
  async count(conditions?: Partial<T>): Promise<number> {
    this.logger.debug('统计记录数量', { conditions })

    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    // 应用查询条件
    if (conditions) {
      for (const [key, value] of Object.entries(conditions)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      }
    }

    const { count, error } = await query

    if (error) {
      this.logger.error('统计记录数量失败', { error: error.message })
      return 0
    }

    return count ?? 0
  }

  /**
   * 检查记录是否存在
   *
   * @param id - 记录 ID
   * @returns 是否存在
   *
   * @example
   * ```typescript
   * const exists = await usersRepo.exists('user-123')
   * ```
   */
  async exists(id: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('id', id)

    if (error) {
      this.logger.error('检查记录存在性失败', { id, error: error.message })
      return false
    }

    return (count ?? 0) > 0
  }
}

// 导出缓存键常量，供子类使用
export { CACHE_KEYS }
