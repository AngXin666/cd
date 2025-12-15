/**
 * 缓存管理器
 * 提供统一的缓存读写、失效和清理接口
 * 支持 H5 (localStorage) 和小程序/APP (Taro.storage)
 *
 * @module utils/cacheManager
 * @feature user-list-cache-optimization
 */

import Taro from '@tarojs/taro'

/**
 * 应用版本号（用于缓存版本管理）
 */
const APP_VERSION = '1.0.0'

/**
 * 缓存条目接口
 * 包含数据、时间戳、过期时间和版本号
 */
interface CacheEntry<T> {
  /** 缓存数据 */
  data: T
  /** 创建时间戳 */
  timestamp: number
  /** 过期时间戳 */
  expiresAt: number
  /** 版本号 */
  version: string
}

/**
 * 缓存管理器接口
 * 定义缓存操作的标准方法
 */
export interface CacheManager {
  /**
   * 获取缓存数据
   * @param key - 缓存键
   * @returns 缓存数据，如果不存在或已过期则返回 null
   */
  get<T>(key: string): T | null

  /**
   * 设置缓存数据
   * @param key - 缓存键
   * @param data - 缓存数据
   * @param ttl - 过期时间（毫秒），默认 30 分钟
   */
  set<T>(key: string, data: T, ttl?: number): void

  /**
   * 清除指定缓存
   * @param keys - 缓存键数组
   */
  invalidate(keys: string[]): void

  /**
   * 清除所有缓存
   */
  clear(): void

  /**
   * 检查缓存是否存在且未过期
   * @param key - 缓存键
   */
  has(key: string): boolean
}

/**
 * 缓存管理器实现类
 * 支持 H5 (localStorage) 和小程序/APP (Taro.storage)
 */
class CacheManagerImpl implements CacheManager {
  /** 检测当前运行环境是否为 H5 */
  private isH5 = process.env.TARO_ENV === 'h5'

  /** 默认缓存有效期：30 分钟 */
  private readonly DEFAULT_TTL = 30 * 60 * 1000

  /**
   * 获取缓存数据
   * 如果缓存不存在、已过期或版本不匹配，返回 null
   *
   * @param key - 缓存键
   * @returns 缓存数据或 null
   */
  get<T>(key: string): T | null {
    try {
      // 从存储中读取缓存
      const json = this.isH5 ? localStorage.getItem(key) : Taro.getStorageSync(key)

      if (!json) {
        return null
      }

      // 解析缓存条目
      const entry: CacheEntry<T> = JSON.parse(json)

      // 检查版本是否匹配（版本升级时自动清除旧缓存）
      if (entry.version !== APP_VERSION) {
        console.log(`[CacheManager] 版本不匹配，清除缓存: ${key}`)
        this.invalidate([key])
        return null
      }

      // 检查是否过期
      if (Date.now() > entry.expiresAt) {
        console.log(`[CacheManager] 缓存已过期，清除: ${key}`)
        this.invalidate([key])
        return null
      }

      return entry.data
    } catch (error) {
      console.error(`[CacheManager] 读取缓存失败: ${key}`, error)
      // 缓存数据可能损坏，清除它
      this.invalidate([key])
      return null
    }
  }

  /**
   * 设置缓存数据
   * 如果写入失败，会尝试清理旧缓存后重试
   *
   * @param key - 缓存键
   * @param data - 缓存数据
   * @param ttl - 过期时间（毫秒），默认 30 分钟
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      // 构建缓存条目
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        version: APP_VERSION
      }

      const json = JSON.stringify(entry)

      // 写入存储
      if (this.isH5) {
        localStorage.setItem(key, json)
      } else {
        Taro.setStorageSync(key, json)
      }

      console.log(`[CacheManager] 缓存已写入: ${key}, TTL: ${ttl}ms`)
    } catch (error) {
      console.error(`[CacheManager] 写入缓存失败: ${key}`, error)

      // 尝试清理旧缓存后重试
      this.clearOldCache()

      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
          version: APP_VERSION
        }

        const json = JSON.stringify(entry)

        if (this.isH5) {
          localStorage.setItem(key, json)
        } else {
          Taro.setStorageSync(key, json)
        }

        console.log(`[CacheManager] 重试写入缓存成功: ${key}`)
      } catch (retryError) {
        console.error(`[CacheManager] 重试写入缓存失败: ${key}`, retryError)
        // 写入失败不影响程序运行，只记录错误
      }
    }
  }

  /**
   * 清除指定的缓存键
   *
   * @param keys - 缓存键数组
   */
  invalidate(keys: string[]): void {
    keys.forEach((key) => {
      try {
        if (this.isH5) {
          localStorage.removeItem(key)
        } else {
          Taro.removeStorageSync(key)
        }
        console.log(`[CacheManager] 缓存已清除: ${key}`)
      } catch (error) {
        console.error(`[CacheManager] 清除缓存失败: ${key}`, error)
      }
    })
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    try {
      if (this.isH5) {
        localStorage.clear()
      } else {
        Taro.clearStorageSync()
      }
      console.log('[CacheManager] 所有缓存已清除')
    } catch (error) {
      console.error('[CacheManager] 清除所有缓存失败:', error)
    }
  }

  /**
   * 检查缓存是否存在且未过期
   *
   * @param key - 缓存键
   * @returns 缓存是否有效
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * 清理旧缓存
   * 当存储空间不足时调用，清理最旧的缓存数据
   *
   * @private
   */
  private clearOldCache(): void {
    try {
      console.log('[CacheManager] 开始清理旧缓存...')

      // 获取所有缓存键
      const keys = this.isH5 ? Object.keys(localStorage) : Taro.getStorageInfoSync().keys

      // 收集所有缓存条目及其时间戳
      const entries: Array<{key: string; timestamp: number}> = []

      keys.forEach((key) => {
        try {
          const json = this.isH5 ? localStorage.getItem(key) : Taro.getStorageSync(key)
          if (json) {
            const entry = JSON.parse(json)
            if (entry.timestamp) {
              entries.push({key, timestamp: entry.timestamp})
            }
          }
        } catch (_error) {
          // 忽略解析错误
        }
      })

      // 按时间戳排序，最旧的在前
      entries.sort((a, b) => a.timestamp - b.timestamp)

      // 清理最旧的 20% 缓存
      const clearCount = Math.ceil(entries.length * 0.2)
      const keysToRemove = entries.slice(0, clearCount).map((e) => e.key)

      this.invalidate(keysToRemove)

      console.log(`[CacheManager] 已清理 ${clearCount} 个旧缓存`)
    } catch (error) {
      console.error('[CacheManager] 清理旧缓存失败:', error)
    }
  }
}

/**
 * 缓存管理器单例
 * 全局唯一的缓存管理器实例
 */
export const cacheManager = new CacheManagerImpl()

/**
 * 缓存键常量
 * 定义所有缓存键，避免硬编码
 */
export const CACHE_KEYS = {
  /** 老板端用户列表 */
  SUPER_ADMIN_USERS: 'super_admin_users',
  /** 老板端用户详情 */
  SUPER_ADMIN_USER_DETAILS: 'super_admin_user_details',
  /** 老板端用户仓库 */
  SUPER_ADMIN_USER_WAREHOUSES: 'super_admin_user_warehouses',
  /** 车队长端司机列表 */
  MANAGER_DRIVERS: 'manager_drivers',
  /** 车队长端司机详情 */
  MANAGER_DRIVER_DETAILS: 'manager_driver_details',
  /** 车队长端司机仓库 */
  MANAGER_DRIVER_WAREHOUSES: 'manager_driver_warehouses',
  /** 仓库列表 */
  WAREHOUSES: 'warehouses',
  /** 仓库详情 */
  WAREHOUSE_DETAILS: 'warehouse_details',
  /** 车辆列表 */
  VEHICLES: 'vehicles',
  /** 车辆详情 */
  VEHICLE_DETAILS: 'vehicle_details'
} as const

/**
 * 缓存配置
 * 定义缓存相关的配置常量
 */
export const CACHE_CONFIG = {
  /** 默认缓存有效期（30 分钟） */
  DEFAULT_TTL: 30 * 60 * 1000,
  /** 最大缓存大小（10MB） */
  MAX_CACHE_SIZE: 10 * 1024 * 1024,
  /** Realtime 重连间隔（5 分钟） */
  REALTIME_RECONNECT_INTERVAL: 5 * 60 * 1000
}
