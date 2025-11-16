import Taro from '@tarojs/taro'

/**
 * 缓存管理工具
 * 提供统一的缓存清除接口和智能缓存功能
 */

// 缓存键名常量
export const CACHE_KEYS = {
  // 仪表板缓存
  MANAGER_WAREHOUSES: 'manager_warehouses_cache',
  DASHBOARD_DATA: 'dashboard_data_cache',
  DRIVER_STATS: 'driver_stats_cache',
  SUPER_ADMIN_DASHBOARD: 'super_admin_dashboard_cache',

  // 用户管理缓存
  MANAGER_DRIVERS: 'manager_drivers_cache',
  MANAGER_DRIVER_DETAILS: 'manager_driver_details_cache',
  SUPER_ADMIN_USERS: 'super_admin_users_cache',
  SUPER_ADMIN_USER_DETAILS: 'super_admin_user_details_cache',

  // 仓库管理缓存
  ALL_WAREHOUSES: 'all_warehouses_cache',
  WAREHOUSE_CATEGORIES: 'warehouse_categories_cache',
  WAREHOUSE_ASSIGNMENTS: 'warehouse_assignments_cache',

  // 请假审批缓存
  LEAVE_APPLICATIONS: 'leave_applications_cache',
  LEAVE_DETAILS: 'leave_details_cache',

  // 计件工作缓存
  PIECE_WORK_REPORTS: 'piece_work_reports_cache',
  PIECE_WORK_DETAILS: 'piece_work_details_cache',

  // 司机端缓存
  DRIVER_PROFILE: 'driver_profile_cache',
  DRIVER_VEHICLES: 'driver_vehicles_cache',
  DRIVER_ATTENDANCE: 'driver_attendance_cache',
  DRIVER_LEAVE: 'driver_leave_cache',
  DRIVER_PIECE_WORK: 'driver_piece_work_cache',

  // 车辆管理缓存
  ALL_VEHICLES: 'all_vehicles_cache',

  // 考勤管理缓存（长期缓存）
  ATTENDANCE_MONTHLY: 'attendance_monthly_cache',
  ATTENDANCE_ALL_RECORDS: 'attendance_all_records_cache',

  // 数据版本号（用于检测数据更新）
  DATA_VERSION: 'data_version_cache'
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
 * 清除所有匹配前缀的缓存
 * @param prefix 缓存键前缀
 */
export function clearCacheByPrefix(prefix: string): void {
  try {
    const info = Taro.getStorageInfoSync()
    const keys = info.keys || []
    let clearedCount = 0

    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        Taro.removeStorageSync(key)
        clearedCount++
      }
    })

    console.log(`🗑️ [缓存] 已清除 ${clearedCount} 个前缀为 "${prefix}" 的缓存`)
  } catch (error) {
    console.error(`❌ [缓存] 清除前缀缓存失败: ${prefix}`, error)
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

/**
 * 清除仓库相关缓存
 */
export function clearWarehouseCache() {
  try {
    clearCache(CACHE_KEYS.ALL_WAREHOUSES)
    clearCache(CACHE_KEYS.WAREHOUSE_CATEGORIES)
    clearCache(CACHE_KEYS.WAREHOUSE_ASSIGNMENTS)
    console.log('[Cache] 已清除仓库相关缓存')
  } catch (err) {
    console.error('[Cache] 清除仓库缓存失败:', err)
  }
}

/**
 * 清除请假审批缓存
 */
export function clearLeaveCache() {
  try {
    clearCache(CACHE_KEYS.LEAVE_APPLICATIONS)
    clearCache(CACHE_KEYS.LEAVE_DETAILS)
    console.log('[Cache] 已清除请假审批缓存')
  } catch (err) {
    console.error('[Cache] 清除请假审批缓存失败:', err)
  }
}

/**
 * 清除计件工作缓存
 */
export function clearPieceWorkCache() {
  try {
    clearCache(CACHE_KEYS.PIECE_WORK_REPORTS)
    clearCache(CACHE_KEYS.PIECE_WORK_DETAILS)
    console.log('[Cache] 已清除计件工作缓存')
  } catch (err) {
    console.error('[Cache] 清除计件工作缓存失败:', err)
  }
}

/**
 * 清除司机端缓存
 * @param driverId 司机ID（可选）
 */
export function clearDriverCache(driverId?: string) {
  try {
    clearCache(CACHE_KEYS.DRIVER_PROFILE)
    clearCache(CACHE_KEYS.DRIVER_VEHICLES)
    clearCache(CACHE_KEYS.DRIVER_ATTENDANCE)
    clearCache(CACHE_KEYS.DRIVER_LEAVE)
    clearCache(CACHE_KEYS.DRIVER_PIECE_WORK)
    console.log(`[Cache] 已清除司机端缓存${driverId ? ` (司机ID: ${driverId})` : ''}`)
  } catch (err) {
    console.error('[Cache] 清除司机端缓存失败:', err)
  }
}

/**
 * 清除考勤管理缓存
 */
export function clearAttendanceCache() {
  try {
    clearCache(CACHE_KEYS.ATTENDANCE_MONTHLY)
    clearCache(CACHE_KEYS.ATTENDANCE_ALL_RECORDS)
    console.log('[Cache] 已清除考勤管理缓存')
  } catch (err) {
    console.error('[Cache] 清除考勤管理缓存失败:', err)
  }
}

/**
 * 数据版本管理
 */
interface DataVersion {
  version: number
  timestamp: number
}

/**
 * 获取当前数据版本号
 */
export function getDataVersion(): number {
  try {
    const versionData = Taro.getStorageSync(CACHE_KEYS.DATA_VERSION) as DataVersion | undefined
    return versionData?.version || 0
  } catch (error) {
    console.error('[Cache] 获取数据版本号失败:', error)
    return 0
  }
}

/**
 * 增加数据版本号（当数据更新时调用）
 */
export function incrementDataVersion(): void {
  try {
    const currentVersion = getDataVersion()
    const newVersion: DataVersion = {
      version: currentVersion + 1,
      timestamp: Date.now()
    }
    Taro.setStorageSync(CACHE_KEYS.DATA_VERSION, newVersion)
    console.log(`📈 [缓存] 数据版本号已更新: ${currentVersion} → ${newVersion.version}`)
  } catch (error) {
    console.error('[Cache] 更新数据版本号失败:', error)
  }
}

/**
 * 检查缓存版本是否有效
 * @param cachedVersion 缓存的版本号
 * @returns 是否有效
 */
export function isCacheVersionValid(cachedVersion: number): boolean {
  const currentVersion = getDataVersion()
  return cachedVersion === currentVersion
}

/**
 * 带版本号的缓存数据结构
 */
interface VersionedCacheData<T> extends CacheData<T> {
  version: number
}

/**
 * 设置带版本号的缓存
 * @param key 缓存键名
 * @param data 要缓存的数据
 * @param ttl 有效期（毫秒），默认5分钟
 */
export function setVersionedCache<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
  try {
    const cacheData: VersionedCacheData<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: getDataVersion()
    }
    Taro.setStorageSync(key, cacheData)
    console.log(`✅ [缓存] 已设置带版本号的缓存: ${key}, 版本: ${cacheData.version}, TTL: ${ttl / 1000}秒`)
  } catch (error) {
    console.error(`❌ [缓存] 设置带版本号的缓存失败: ${key}`, error)
  }
}

/**
 * 获取带版本号的缓存
 * @param key 缓存键名
 * @returns 缓存的数据，如果缓存不存在、已过期或版本不匹配则返回 null
 */
export function getVersionedCache<T>(key: string): T | null {
  try {
    const cacheData = Taro.getStorageSync(key) as VersionedCacheData<T> | undefined
    if (!cacheData) {
      console.log(`ℹ️ [缓存] 缓存不存在: ${key}`)
      return null
    }

    const now = Date.now()
    const age = now - cacheData.timestamp

    // 检查缓存是否过期
    if (age > cacheData.ttl) {
      console.log(`⏰ [缓存] 缓存已过期: ${key} (已存在 ${Math.round(age / 1000)}秒)`)
      Taro.removeStorageSync(key)
      return null
    }

    // 检查版本号是否匹配
    const currentVersion = getDataVersion()
    if (cacheData.version !== currentVersion) {
      console.log(`🔄 [缓存] 缓存版本不匹配: ${key} (缓存版本: ${cacheData.version}, 当前版本: ${currentVersion})`)
      Taro.removeStorageSync(key)
      return null
    }

    console.log(`✅ [缓存] 使用带版本号的缓存: ${key} (版本: ${cacheData.version}, 已存在 ${Math.round(age / 1000)}秒)`)
    return cacheData.data
  } catch (error) {
    console.error(`❌ [缓存] 获取带版本号的缓存失败: ${key}`, error)
    return null
  }
}

/**
 * 清除所有缓存并重置版本号
 */
export function clearAllCacheAndResetVersion() {
  clearAllCache()
  try {
    Taro.removeStorageSync(CACHE_KEYS.DATA_VERSION)
    console.log('[Cache] 已重置数据版本号')
  } catch (err) {
    console.error('[Cache] 重置数据版本号失败:', err)
  }
}

/**
 * 当数据更新时调用此函数，会增加版本号并清除相关缓存
 * @param cacheKeys 需要清除的缓存键数组（可选，如果不提供则清除所有缓存）
 */
export function onDataUpdated(cacheKeys?: string[]) {
  incrementDataVersion()
  if (cacheKeys && cacheKeys.length > 0) {
    for (const key of cacheKeys) {
      clearCache(key)
    }
    console.log(`🔄 [缓存] 数据更新，已清除 ${cacheKeys.length} 个相关缓存`)
  } else {
    clearAllCache()
    console.log('🔄 [缓存] 数据更新，已清除所有缓存')
  }
}
