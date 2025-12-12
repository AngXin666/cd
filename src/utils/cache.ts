/**
 * 缓存管理器
 * 提供智能缓存功能，支持TTL和LRU淘汰策略
 */

import {createLogger} from './logger'

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
