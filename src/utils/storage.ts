/**
 * 类型安全的存储工具
 * 提供跨平台(H5/小程序)的统一存储接口
 */

import Taro from '@tarojs/taro'
import {createLogger} from './logger'
import type {StorageValue} from '@/types/utils'

const logger = createLogger('Storage')

// 判断是否为 H5 环境或测试环境
const isH5 = process.env.TARO_ENV === 'h5' || process.env.NODE_ENV === 'test'

/**
 * 类型安全的存储工具类
 */
export class TypeSafeStorage {
  /**
   * 获取存储值(带类型推断)
   * @param key 存储键
   * @param defaultValue 默认值
   * @returns 存储的值或默认值
   */
  static get<T = StorageValue>(key: string, defaultValue?: T): T | null {
    try {
      if (isH5) {
        const value = localStorage.getItem(key)
        if (value === null) {
          return defaultValue ?? null
        }
        try {
          return JSON.parse(value) as T
        } catch {
          // 如果解析失败,返回原始字符串
          return value as T
        }
      }

      const value = Taro.getStorageSync<T>(key)
      if (value === undefined || value === null || value === '') {
        return defaultValue ?? null
      }
      return value
    } catch (error) {
      logger.error('获取存储失败', {key, error})
      return defaultValue ?? null
    }
  }

  /**
   * 设置存储值
   * @param key 存储键
   * @param data 要存储的数据
   * @returns 是否成功
   */
  static set<T = StorageValue>(key: string, data: T): boolean {
    try {
      if (isH5) {
        localStorage.setItem(key, JSON.stringify(data))
      } else {
        Taro.setStorageSync(key, data)
      }
      return true
    } catch (error) {
      logger.error('设置存储失败', {key, error})
      return false
    }
  }

  /**
   * 移除存储值
   * @param key 存储键
   * @returns 是否成功
   */
  static remove(key: string): boolean {
    try {
      if (isH5) {
        localStorage.removeItem(key)
      } else {
        Taro.removeStorageSync(key)
      }
      return true
    } catch (error) {
      logger.error('移除存储失败', {key, error})
      return false
    }
  }

  /**
   * 清空所有存储
   * @returns 是否成功
   */
  static clear(): boolean {
    try {
      if (isH5) {
        localStorage.clear()
      } else {
        Taro.clearStorageSync()
      }
      return true
    } catch (error) {
      logger.error('清空存储失败', error)
      return false
    }
  }

  /**
   * 检查键是否存在
   * @param key 存储键
   * @returns 是否存在
   */
  static has(key: string): boolean {
    try {
      if (isH5) {
        return localStorage.getItem(key) !== null
      }
      const value = Taro.getStorageSync(key)
      return value !== undefined && value !== null && value !== ''
    } catch (error) {
      logger.error('检查存储键失败', {key, error})
      return false
    }
  }

  /**
   * 获取所有存储键
   * @returns 存储键数组
   */
  static keys(): string[] {
    try {
      if (isH5) {
        return Object.keys(localStorage)
      }
      const info = Taro.getStorageInfoSync()
      return info.keys || []
    } catch (error) {
      logger.error('获取存储键列表失败', error)
      return []
    }
  }

  /**
   * 获取存储信息
   * @returns 存储信息
   */
  static getInfo(): {keys: string[]; currentSize: number; limitSize: number} {
    try {
      if (isH5) {
        const keys = Object.keys(localStorage)
        // H5 环境估算大小(字节)
        let currentSize = 0
        for (const key of keys) {
          const value = localStorage.getItem(key)
          if (value) {
            currentSize += key.length + value.length
          }
        }
        return {
          keys,
          currentSize: Math.round(currentSize / 1024), // 转换为 KB
          limitSize: 5120 // 假设 5MB 限制
        }
      }

      const info = Taro.getStorageInfoSync()
      return {
        keys: info.keys || [],
        currentSize: info.currentSize || 0,
        limitSize: info.limitSize || 10240
      }
    } catch (error) {
      logger.error('获取存储信息失败', error)
      return {
        keys: [],
        currentSize: 0,
        limitSize: 0
      }
    }
  }

  /**
   * 批量获取存储值
   * @param keys 存储键数组
   * @returns 键值对对象
   */
  static getMultiple<T = StorageValue>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {}
    for (const key of keys) {
      result[key] = this.get<T>(key)
    }
    return result
  }

  /**
   * 批量设置存储值
   * @param data 键值对对象
   * @returns 是否全部成功
   */
  static setMultiple<T = StorageValue>(data: Record<string, T>): boolean {
    let allSuccess = true
    for (const [key, value] of Object.entries(data)) {
      if (!this.set(key, value)) {
        allSuccess = false
      }
    }
    return allSuccess
  }

  /**
   * 批量移除存储值
   * @param keys 存储键数组
   * @returns 是否全部成功
   */
  static removeMultiple(keys: string[]): boolean {
    let allSuccess = true
    for (const key of keys) {
      if (!this.remove(key)) {
        allSuccess = false
      }
    }
    return allSuccess
  }
}

/**
 * 便捷函数: 获取存储值
 */
export function getStorage<T = StorageValue>(key: string, defaultValue?: T): T | null {
  return TypeSafeStorage.get<T>(key, defaultValue)
}

/**
 * 便捷函数: 设置存储值
 */
export function setStorage<T = StorageValue>(key: string, data: T): boolean {
  return TypeSafeStorage.set<T>(key, data)
}

/**
 * 便捷函数: 移除存储值
 */
export function removeStorage(key: string): boolean {
  return TypeSafeStorage.remove(key)
}

/**
 * 便捷函数: 清空所有存储
 */
export function clearStorage(): boolean {
  return TypeSafeStorage.clear()
}
