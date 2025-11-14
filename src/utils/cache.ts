import Taro from '@tarojs/taro'

/**
 * 缓存管理工具
 * 提供统一的缓存清除接口
 */

// 缓存键名常量
export const CACHE_KEYS = {
  MANAGER_WAREHOUSES: 'manager_warehouses_cache',
  DASHBOARD_DATA: 'dashboard_data_cache',
  DRIVER_STATS: 'driver_stats_cache',
  SUPER_ADMIN_DASHBOARD: 'super_admin_dashboard_cache'
} as const

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
  // 可以根据需要添加更多缓存清除
  console.log(`[Cache] 已清除管理员 ${managerId} 的所有相关缓存`)
}
