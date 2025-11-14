import Taro from '@tarojs/taro'

/**
 * 缓存管理工具
 * 提供统一的缓存清除接口和智能缓存功能
 */

// 缓存键名常量
export const CACHE_KEYS = {
  MANAGER_WAREHOUSES: 'manager_warehouses_cache',
  DASHBOARD_DATA: 'dashboard_data_cache',
  DRIVER_STATS: 'driver_stats_cache',
  SUPER_ADMIN_DASHBOARD: 'super_admin_dashboard_cache',
  // 新增：司机和用户管理缓存
  MANAGER_DRIVERS: 'manager_drivers_cache',
  MANAGER_DRIVER_DETAILS: 'manager_driver_details_cache',
  SUPER_ADMIN_USERS: 'super_admin_users_cache',
  SUPER_ADMIN_USER_DETAILS: 'super_admin_user_details_cache'
} as const

// 缓存数据结构
interface CacheData<T> {
  data: T
  timestamp: number // 缓存时间戳
  ttl: number // 有效期（毫秒）
}

/**
 * 设置缓存
 * @param key 缓存键名
 * @param data 要缓存的数据
 * @param ttl 有效期（毫秒），默认5分钟
 */
export function setCache<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
      ttl
    }
    Taro.setStorageSync(key, cacheData)
    console.log(`✅ [缓存] 已设置缓存: ${key}, TTL: ${ttl / 1000}秒`)
  } catch (error) {
    console.error(`❌ [缓存] 设置缓存失败: ${key}`, error)
  }
}

/**
 * 获取缓存
 * @param key 缓存键名
 * @returns 缓存的数据，如果缓存不存在或已过期则返回 null
 */
export function getCache<T>(key: string): T | null {
  try {
    const cacheData = Taro.getStorageSync(key) as CacheData<T> | undefined
    if (!cacheData) {
      console.log(`ℹ️ [缓存] 缓存不存在: ${key}`)
      return null
    }

    const now = Date.now()
    const age = now - cacheData.timestamp

    // 检查缓存是否过期
    if (age > cacheData.ttl) {
      console.log(`⏰ [缓存] 缓存已过期: ${key} (已存在 ${Math.round(age / 1000)}秒)`)
      // 删除过期缓存
      Taro.removeStorageSync(key)
      return null
    }

    console.log(`✅ [缓存] 使用缓存: ${key} (已存在 ${Math.round(age / 1000)}秒)`)
    return cacheData.data
  } catch (error) {
    console.error(`❌ [缓存] 获取缓存失败: ${key}`, error)
    return null
  }
}

/**
 * 清除缓存
 * @param key 缓存键名
 */
export function clearCache(key: string): void {
  try {
    Taro.removeStorageSync(key)
    console.log(`🗑️ [缓存] 已清除缓存: ${key}`)
  } catch (error) {
    console.error(`❌ [缓存] 清除缓存失败: ${key}`, error)
  }
}

/**
 * 检查缓存是否存在且有效
 * @param key 缓存键名
 * @returns 缓存是否有效
 */
export function isCacheValid(key: string): boolean {
  try {
    const cacheData = Taro.getStorageSync(key) as CacheData<any> | undefined
    if (!cacheData) {
      return false
    }

    const now = Date.now()
    const age = now - cacheData.timestamp

    return age <= cacheData.ttl
  } catch (_error) {
    return false
  }
}

/**
 * 清除指定管理员的仓库缓存
 * @param managerId 管理员ID（可选，如果不提供则清除所有）
 */
export function clearManagerWarehousesCache(managerId?: string) {
  try {
    if (managerId) {
      // 清除特定管理员的缓存
      const cached = Taro.getStorageSync(CACHE_KEYS.MANAGER_WAREHOUSES)
      if (cached && cached.managerId === managerId) {
        Taro.removeStorageSync(CACHE_KEYS.MANAGER_WAREHOUSES)
        console.log(`[Cache] 已清除管理员 ${managerId} 的仓库缓存`)
      }
    } else {
      // 清除所有仓库缓存
      Taro.removeStorageSync(CACHE_KEYS.MANAGER_WAREHOUSES)
      console.log('[Cache] 已清除所有仓库缓存')
    }
  } catch (err) {
    console.error('[Cache] 清除仓库缓存失败:', err)
  }
}

/**
 * 清除仪表板数据缓存
 * @param warehouseId 仓库ID（可选，如果不提供则清除所有）
 */
export function clearDashboardCache(warehouseId?: string) {
  try {
    if (warehouseId) {
      // 清除特定仓库的缓存
      const cached = Taro.getStorageSync(CACHE_KEYS.DASHBOARD_DATA)
      if (cached && cached.warehouseId === warehouseId) {
        Taro.removeStorageSync(CACHE_KEYS.DASHBOARD_DATA)
        console.log(`[Cache] 已清除仓库 ${warehouseId} 的仪表板缓存`)
      }
    } else {
      // 清除所有仪表板缓存
      Taro.removeStorageSync(CACHE_KEYS.DASHBOARD_DATA)
      console.log('[Cache] 已清除所有仪表板缓存')
    }
  } catch (err) {
    console.error('[Cache] 清除仪表板缓存失败:', err)
  }
}

/**
 * 清除司机统计数据缓存
 * @param warehouseId 仓库ID（可选，如果不提供则清除所有）
 */
export function clearDriverStatsCache(warehouseId?: string) {
  try {
    if (warehouseId) {
      // 清除特定仓库的缓存
      const cached = Taro.getStorageSync(CACHE_KEYS.DRIVER_STATS)
      if (cached && cached.warehouseId === warehouseId) {
        Taro.removeStorageSync(CACHE_KEYS.DRIVER_STATS)
        console.log(`[Cache] 已清除仓库 ${warehouseId} 的司机统计缓存`)
      }
    } else {
      // 清除所有司机统计缓存
      Taro.removeStorageSync(CACHE_KEYS.DRIVER_STATS)
      console.log('[Cache] 已清除所有司机统计缓存')
    }
  } catch (err) {
    console.error('[Cache] 清除司机统计缓存失败:', err)
  }
}

/**
 * 清除超级管理员仪表板缓存
 */
export function clearSuperAdminDashboardCache() {
  try {
    Taro.removeStorageSync(CACHE_KEYS.SUPER_ADMIN_DASHBOARD)
    console.log('[Cache] 已清除超级管理员仪表板缓存')
  } catch (err) {
    console.error('[Cache] 清除超级管理员仪表板缓存失败:', err)
  }
}

/**
 * 清除管理员端司机列表缓存
 */
export function clearManagerDriversCache() {
  try {
    clearCache(CACHE_KEYS.MANAGER_DRIVERS)
    clearCache(CACHE_KEYS.MANAGER_DRIVER_DETAILS)
    console.log('[Cache] 已清除管理员端司机缓存')
  } catch (err) {
    console.error('[Cache] 清除管理员端司机缓存失败:', err)
  }
}

/**
 * 清除超级管理员端用户列表缓存
 */
export function clearSuperAdminUsersCache() {
  try {
    clearCache(CACHE_KEYS.SUPER_ADMIN_USERS)
    clearCache(CACHE_KEYS.SUPER_ADMIN_USER_DETAILS)
    console.log('[Cache] 已清除超级管理员端用户缓存')
  } catch (err) {
    console.error('[Cache] 清除超级管理员端用户缓存失败:', err)
  }
}

/**
 * 清除所有缓存
 */
export function clearAllCache() {
  try {
    Object.values(CACHE_KEYS).forEach((key) => {
      Taro.removeStorageSync(key)
    })
    console.log('[Cache] 已清除所有缓存')
  } catch (err) {
    console.error('[Cache] 清除所有缓存失败:', err)
  }
}

/**
 * 清除指定管理员的所有相关缓存
 * @param managerId 管理员ID
 */
export function clearManagerAllCache(managerId: string) {
  clearManagerWarehousesCache(managerId)
  clearManagerDriversCache()
  // 可以根据需要添加更多缓存清除
  console.log(`[Cache] 已清除管理员 ${managerId} 的所有相关缓存`)
}
