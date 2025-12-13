/**
 * API缓存辅助模块
 * 为API调用提供统一的缓存支持
 */

import {createCache, withCache, type CacheManager} from './cache'
import {createLogger} from './logger'

const logger = createLogger('APICache')

/**
 * API缓存实例
 * 使用 any 类型以支持多种返回类型的API
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiCache = createCache<any>({
  ttl: 5 * 60 * 1000, // 5分钟
  maxSize: 200,
  strategy: 'LRU'
})

/**
 * 用户数据缓存（较短TTL，因为用户数据可能频繁变化）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const userCache = createCache<any>({
  ttl: 3 * 60 * 1000, // 3分钟
  maxSize: 100,
  strategy: 'LRU'
})

/**
 * 仓库数据缓存（中等TTL）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const warehouseCache = createCache<any>({
  ttl: 5 * 60 * 1000, // 5分钟
  maxSize: 50,
  strategy: 'LRU'
})

/**
 * 字典数据缓存（长TTL，因为字典数据很少变化）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dictionaryCache = createCache<any>({
  ttl: 30 * 60 * 1000, // 30分钟
  maxSize: 100,
  strategy: 'LRU'
})

/**
 * 配置数据缓存（很长TTL）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const configCache = createCache<any>({
  ttl: 60 * 60 * 1000, // 1小时
  maxSize: 50,
  strategy: 'LRU'
})

/**
 * 缓存键生成器
 */
export const CacheKeys = {
  // 用户相关
  currentUser: () => 'user:current',
  userById: (id: string) => `user:${id}`,
  userList: (role?: string) => (role ? `users:role:${role}` : 'users:all'),
  userRoles: (id: string) => `user:${id}:roles`,

  // 仓库相关
  warehouseList: (active?: boolean) => (active ? 'warehouses:active' : 'warehouses:all'),
  warehouseById: (id: string) => `warehouse:${id}`,
  warehouseWithRule: (id: string) => `warehouse:${id}:rule`,
  warehouseDrivers: (id: string) => `warehouse:${id}:drivers`,
  warehouseManagers: (id: string) => `warehouse:${id}:managers`,

  // 司机仓库关联
  driverWarehouses: (driverId: string) => `driver:${driverId}:warehouses`,
  driverWarehouseIds: (driverId: string) => `driver:${driverId}:warehouse-ids`,

  // 管理员仓库关联
  managerWarehouses: (managerId: string) => `manager:${managerId}:warehouses`,
  managerWarehouseIds: (managerId: string) => `manager:${managerId}:warehouse-ids`,

  // 权限相关
  managerPermission: (managerId: string) => `manager:${managerId}:permission`,

  // 字典数据
  categories: (warehouseId: string) => `warehouse:${warehouseId}:categories`,
  attendanceRules: () => 'attendance:rules:all'
}

/**
 * 清除用户相关缓存
 */
export function clearUserCache(userId?: string): void {
  if (userId) {
    userCache.delete(CacheKeys.userById(userId))
    userCache.delete(CacheKeys.userRoles(userId))
    logger.info('清除用户缓存', {userId})
  } else {
    userCache.clear()
    logger.info('清除所有用户缓存')
  }
}

/**
 * 清除仓库相关缓存
 */
export function clearWarehouseCache(warehouseId?: string): void {
  if (warehouseId) {
    warehouseCache.delete(CacheKeys.warehouseById(warehouseId))
    warehouseCache.delete(CacheKeys.warehouseWithRule(warehouseId))
    warehouseCache.delete(CacheKeys.warehouseDrivers(warehouseId))
    warehouseCache.delete(CacheKeys.warehouseManagers(warehouseId))
    logger.info('清除仓库缓存', {warehouseId})
  } else {
    warehouseCache.clear()
    logger.info('清除所有仓库缓存')
  }
}

/**
 * 清除司机仓库关联缓存
 */
export function clearDriverWarehouseCache(driverId: string): void {
  warehouseCache.delete(CacheKeys.driverWarehouses(driverId))
  warehouseCache.delete(CacheKeys.driverWarehouseIds(driverId))
  logger.info('清除司机仓库关联缓存', {driverId})
}

/**
 * 清除管理员仓库关联缓存
 */
export function clearManagerWarehouseCache(managerId: string): void {
  warehouseCache.delete(CacheKeys.managerWarehouses(managerId))
  warehouseCache.delete(CacheKeys.managerWarehouseIds(managerId))
  logger.info('清除管理员仓库关联缓存', {managerId})
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  apiCache.clear()
  userCache.clear()
  warehouseCache.clear()
  dictionaryCache.clear()
  configCache.clear()
  logger.info('清除所有API缓存')
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  api: ReturnType<CacheManager['getStats']>
  user: ReturnType<CacheManager['getStats']>
  warehouse: ReturnType<CacheManager['getStats']>
  dictionary: ReturnType<CacheManager['getStats']>
  config: ReturnType<CacheManager['getStats']>
} {
  return {
    api: apiCache.getStats(),
    user: userCache.getStats(),
    warehouse: warehouseCache.getStats(),
    dictionary: dictionaryCache.getStats(),
    config: configCache.getStats()
  }
}

/**
 * 定期清理过期缓存
 */
export function startCacheCleanup(interval: number = 5 * 60 * 1000): () => void {
  const timer = setInterval(() => {
    const counts = {
      api: apiCache.cleanup(),
      user: userCache.cleanup(),
      warehouse: warehouseCache.cleanup(),
      dictionary: dictionaryCache.cleanup(),
      config: configCache.cleanup()
    }

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    if (total > 0) {
      logger.info('定期清理过期缓存', counts)
    }
  }, interval)

  // 返回停止函数
  return () => clearInterval(timer)
}

/**
 * 包装API函数，自动添加缓存
 */
export function cachedAPI<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  cache: CacheManager<Awaited<ReturnType<T>>>,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return withCache(fn, cache, keyGenerator, ttl)
}
