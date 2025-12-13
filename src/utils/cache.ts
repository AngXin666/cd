/**
 * 缓存管理器
 * 提供智能缓存功能，支持TTL和LRU淘汰策略
 */

import {createLogger} from './logger'
import {enhancedErrorHandler} from './errorHandler'

const logger = createLogger('CacheManager')

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  key: string
  value: T
  expiry: number // 过期时间戳
  accessCount: number // 访问次数
  lastAccess: number // 最后访问时间
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  ttl?: number // 缓存过期时间（毫秒），默认5分钟
  maxSize?: number // 最大缓存数量，默认100
  strategy?: 'LRU' | 'LFU' // 缓存淘汰策略，默认LRU
}

/**
 * 缓存管理器类
 */
export class CacheManager<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly maxSize: number
  private readonly defaultTTL: number
  private readonly strategy: 'LRU' | 'LFU'

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100
    this.defaultTTL = options.ttl || 5 * 60 * 1000 // 默认5分钟
    this.strategy = options.strategy || 'LRU'
  }

  /**
   * 设置缓存
   */
  set(key: string, value: T, ttl?: number): void {
    // 如果缓存已满，执行淘汰策略
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict()
    }

    const now = Date.now()
    const entry: CacheEntry<T> = {
      key,
      value,
      expiry: now + (ttl || this.defaultTTL),
      accessCount: 0,
      lastAccess: now
    }

    this.cache.set(key, entry)
    logger.debug('缓存已设置', {key, ttl: ttl || this.defaultTTL})
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      logger.debug('缓存未命中', {key})
      return null
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      logger.debug('缓存已过期', {key})
      return null
    }

    // 更新访问信息
    entry.accessCount++
    entry.lastAccess = Date.now()

    logger.debug('缓存命中', {key, accessCount: entry.accessCount})
    return entry.value
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      logger.debug('缓存已删除', {key})
    }
    return deleted
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    logger.info('所有缓存已清空')
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiry
  }

  /**
   * 执行缓存淘汰策略
   */
  private evict(): void {
    if (this.cache.size === 0) return

    let keyToEvict: string | null = null

    if (this.strategy === 'LRU') {
      // LRU: 淘汰最久未访问的（lastAccess最小的）
      let oldestAccess = Number.POSITIVE_INFINITY
      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccess < oldestAccess) {
          oldestAccess = entry.lastAccess
          keyToEvict = key
        }
      }
    } else {
      // LFU: 淘汰访问次数最少的（accessCount最小的）
      let leastAccess = Number.POSITIVE_INFINITY
      for (const [key, entry] of this.cache.entries()) {
        if (entry.accessCount < leastAccess) {
          leastAccess = entry.accessCount
          keyToEvict = key
        }
      }
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict)
      logger.debug('缓存已淘汰', {key: keyToEvict, strategy: this.strategy})
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    let count = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
        count++
      }
    }

    if (count > 0) {
      logger.info('清理过期缓存', {count})
    }

    return count
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number
    maxSize: number
    strategy: string
    keys: string[]
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      strategy: this.strategy,
      keys: Array.from(this.cache.keys())
    }
  }
}

/**
 * 创建缓存管理器实例
 */
export function createCache<T = unknown>(options?: CacheOptions): CacheManager<T> {
  return new CacheManager<T>(options)
}

/**
 * 全局缓存实例（用于API缓存）
 */
export const apiCache = createCache({
  ttl: 5 * 60 * 1000, // 5分钟
  maxSize: 100,
  strategy: 'LRU'
})

/**
 * 缓存装饰器
 * 自动缓存函数返回值
 */
export function cached<T>(
  cache: CacheManager<T>,
  keyGenerator: (...args: unknown[]) => string,
  ttl?: number
) {
  return (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const key = keyGenerator(...args)

      // 尝试从缓存获取
      const cachedValue = cache.get(key)
      if (cachedValue !== null) {
        return cachedValue
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args)

      // 缓存结果
      cache.set(key, result, ttl)

      return result
    }

    return descriptor
  }
}

/**
 * 包装异步函数，自动缓存结果
 */
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  cache: CacheManager<Awaited<ReturnType<T>>>,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args)

    // 尝试从缓存获取
    const cachedValue = cache.get(key)
    if (cachedValue !== null) {
      return cachedValue
    }

    // 执行原函数
    const result = await fn(...args)

    // 缓存结果
    cache.set(key, result as Awaited<ReturnType<T>>, ttl)

    return result
  }) as T
}

/**
 * 缓存键常量（兼容旧API）
 */
export const CACHE_KEYS = {
  // 考勤相关
  ATTENDANCE_MONTHLY: 'attendance_monthly',
  ATTENDANCE_ALL_RECORDS: 'attendance_all_records',
  
  // 用户相关
  USER_PROFILE: 'user_profile',
  ALL_USERS: 'all_users',
  
  // 仓库相关
  WAREHOUSE_LIST: 'warehouse_list',
  ALL_WAREHOUSES: 'all_warehouses',
  WAREHOUSE_CATEGORIES: 'warehouse_categories',
  WAREHOUSE_ASSIGNMENTS: 'warehouse_assignments',
  MANAGER_WAREHOUSES: 'manager_warehouses',
  
  // 品类相关
  CATEGORY_LIST: 'category_list',
  
  // 司机相关
  MANAGER_DRIVERS: 'manager_drivers',
  MANAGER_DRIVER_DETAILS: 'manager_driver_details',
  
  // 车辆相关
  ALL_VEHICLES: 'all_vehicles',
  
  // 司机仓库关联
  MANAGER_DRIVER_WAREHOUSES: 'manager_driver_warehouses',
  
  // 超级管理员用户管理
  SUPER_ADMIN_USERS: 'super_admin_users',
  SUPER_ADMIN_USER_DETAILS: 'super_admin_user_details',
  SUPER_ADMIN_USER_WAREHOUSES: 'super_admin_user_warehouses',
  
  // 仪表盘
  DASHBOARD_DATA: 'dashboard_data'
}

/**
 * 清除管理员仓库缓存（兼容旧API）
 */
export function clearManagerWarehousesCache(managerId?: string): void {
  if (managerId) {
    clearCache(`${CACHE_KEYS.MANAGER_WAREHOUSES}_${managerId}`)
    clearCache(`${CACHE_KEYS.MANAGER_DRIVER_WAREHOUSES}_${managerId}`)
  }
  clearCacheByPrefix(CACHE_KEYS.MANAGER_WAREHOUSES)
  clearCacheByPrefix(CACHE_KEYS.MANAGER_DRIVER_WAREHOUSES)
}

/**
 * 简单缓存存储（兼容旧API）
 */
const simpleCache = new Map<string, { value: unknown; expiry: number }>()

/**
 * 设置缓存（兼容旧API）
 */
export function setCache(key: string, value: unknown, ttl: number = 5 * 60 * 1000): void {
  simpleCache.set(key, {
    value,
    expiry: Date.now() + ttl
  })
}

/**
 * 获取缓存（兼容旧API）
 */
export function getCache<T = unknown>(key: string): T | null {
  const entry = simpleCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    simpleCache.delete(key)
    return null
  }
  return entry.value as T
}

/**
 * 清除缓存（兼容旧API）
 */
export function clearCache(key: string): void {
  simpleCache.delete(key)
}

/**
 * 清除所有缓存（兼容旧API）
 */
export function clearAllCache(): void {
  simpleCache.clear()
}

/**
 * 按前缀清除缓存（兼容旧API）
 */
export function clearCacheByPrefix(prefix: string): void {
  for (const key of simpleCache.keys()) {
    if (key.startsWith(prefix)) {
      simpleCache.delete(key)
    }
  }
}

/**
 * 获取带版本的缓存（兼容旧API）
 * 支持两种调用方式：
 * 1. getVersionedCache(key) - 直接获取缓存
 * 2. getVersionedCache(key, version) - 获取带版本的缓存
 */
export function getVersionedCache<T = unknown>(key: string, version?: string): T | null {
  if (version) {
    return getCache<T>(`${key}_v${version}`)
  }
  return getCache<T>(key)
}

/**
 * 设置带版本的缓存（兼容旧API）
 * 支持两种调用方式：
 * 1. setVersionedCache(key, value, ttl?) - 直接设置缓存
 * 2. setVersionedCache(key, version, value, ttl?) - 设置带版本的缓存
 */
export function setVersionedCache(key: string, valueOrVersion: unknown, ttlOrValue?: unknown, ttl?: number): void {
  // 判断调用方式：如果第三个参数是数字或undefined，则是简单模式
  if (typeof ttlOrValue === 'number' || ttlOrValue === undefined) {
    // 简单模式: setVersionedCache(key, value, ttl?)
    setCache(key, valueOrVersion, ttlOrValue as number | undefined)
  } else {
    // 版本模式: setVersionedCache(key, version, value, ttl?)
    const version = valueOrVersion as string
    setCache(`${key}_v${version}`, ttlOrValue, ttl)
  }
}

/**
 * 清除带版本的缓存（兼容旧API）
 */
export function clearVersionedCache(key: string): void {
  // 清除所有以该key开头的缓存
  for (const cacheKey of simpleCache.keys()) {
    if (cacheKey.startsWith(key)) {
      simpleCache.delete(cacheKey)
    }
  }
}

/**
 * 数据更新回调存储
 */
const dataUpdateCallbacks = new Map<string, Set<() => void>>()

/**
 * 数据更新通知（兼容旧API）
 * 支持两种调用方式：
 * 1. onDataUpdated(keys: string[]) - 清除指定keys的缓存
 * 2. onDataUpdated(key: string, callback: () => void) - 注册回调
 */
export function onDataUpdated(keyOrKeys: string | string[], callback?: () => void): (() => void) | void {
  // 如果是数组，清除这些key的缓存
  if (Array.isArray(keyOrKeys)) {
    for (const key of keyOrKeys) {
      clearCache(key)
      clearCacheByPrefix(key)
      notifyDataUpdated(key)
    }
    return
  }
  
  // 如果有callback，注册回调
  if (callback) {
    const key = keyOrKeys
    if (!dataUpdateCallbacks.has(key)) {
      dataUpdateCallbacks.set(key, new Set())
    }
    dataUpdateCallbacks.get(key)!.add(callback)
    
    // 返回取消订阅函数
    return () => {
      dataUpdateCallbacks.get(key)?.delete(callback)
    }
  }
}

/**
 * 触发数据更新回调（兼容旧API）
 */
export function notifyDataUpdated(key: string): void {
  const callbacks = dataUpdateCallbacks.get(key)
  if (callbacks) {
    for (const callback of callbacks) {
      try {
        callback()
      } catch (error) {
        enhancedErrorHandler.handleWithContext(error, {
          showToast: false,
          context: {
            component: 'CacheManager',
            action: 'notifyDataUpdated',
            metadata: {key}
          }
        })
      }
    }
  }
}
