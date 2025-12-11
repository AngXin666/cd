import Taro from '@tarojs/taro'

/**
 * 缓存管理工具
 * 提供统一的缓存清除接口和智能缓存功能
 */

// 检测当前运行环境
const isH5 = process.env.TARO_ENV === 'h5'

// 存储工具函数，兼容H5和小程序
function setStorageSync(key: string, data: any): void {
  if (isH5) {
    localStorage.setItem(key, JSON.stringify(data))
  } else {
    Taro.setStorageSync(key, data)
  }
}

function getStorageSync(key: string): any {
  if (isH5) {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : undefined
  } else {
    return Taro.getStorageSync(key)
  }
}

function removeStorageSync(key: string): void {
  if (isH5) {
    localStorage.removeItem(key)
  } else {
    Taro.removeStorageSync(key)
  }
}

function getStorageInfoSync(): {keys: string[]} {
  if (isH5) {
    return {keys: Object.keys(localStorage)}
  } else {
    return Taro.getStorageInfoSync()
  }
}

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
  MANAGER_DRIVER_WAREHOUSES: 'manager_driver_warehouses_cache',
  SUPER_ADMIN_USERS: 'super_admin_users_cache',
  SUPER_ADMIN_USER_DETAILS: 'super_admin_user_details_cache',
  SUPER_ADMIN_USER_WAREHOUSES: 'super_admin_user_warehouses_cache',

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
    setStorageSync(key, cacheData)
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
    const cacheData = getStorageSync(key) as CacheData<T> | undefined
    if (!cacheData) {
      return null
    }

    const now = Date.now()
    const age = now - cacheData.timestamp

    // 检查缓存是否过期
    if (age > cacheData.ttl) {
      removeStorageSync(key)
      return null
    }

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
    removeStorageSync(key)
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
    const info = getStorageInfoSync()
    const keys = info.keys || []
    let _clearedCount = 0

    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        removeStorageSync(key)
        _clearedCount++
      }
    })
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
    const cacheData = getStorageSync(key) as CacheData<any> | undefined
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
      const cached = getStorageSync(CACHE_KEYS.MANAGER_WAREHOUSES)
      if (cached && cached.managerId === managerId) {
        removeStorageSync(CACHE_KEYS.MANAGER_WAREHOUSES)
      }
    } else {
      // 清除所有仓库缓存
      removeStorageSync(CACHE_KEYS.MANAGER_WAREHOUSES)
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
      const cached = getStorageSync(CACHE_KEYS.DASHBOARD_DATA)
      if (cached && cached.warehouseId === warehouseId) {
        removeStorageSync(CACHE_KEYS.DASHBOARD_DATA)
      }
    } else {
      // 清除所有仪表板缓存
      removeStorageSync(CACHE_KEYS.DASHBOARD_DATA)
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
      const cached = getStorageSync(CACHE_KEYS.DRIVER_STATS)
      if (cached && cached.warehouseId === warehouseId) {
        removeStorageSync(CACHE_KEYS.DRIVER_STATS)
      }
    } else {
      // 清除所有司机统计缓存
      removeStorageSync(CACHE_KEYS.DRIVER_STATS)
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
    removeStorageSync(CACHE_KEYS.SUPER_ADMIN_DASHBOARD)
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
    clearCache(CACHE_KEYS.MANAGER_DRIVER_WAREHOUSES)
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
    clearCache(CACHE_KEYS.SUPER_ADMIN_USER_WAREHOUSES)
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
      removeStorageSync(key)
    })
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
}

/**
 * 清除仓库相关缓存
 */
export function clearWarehouseCache() {
  try {
    clearCache(CACHE_KEYS.ALL_WAREHOUSES)
    clearCache(CACHE_KEYS.WAREHOUSE_CATEGORIES)
    clearCache(CACHE_KEYS.WAREHOUSE_ASSIGNMENTS)
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
  } catch (err) {
    console.error('[Cache] 清除计件工作缓存失败:', err)
  }
}

/**
 * 清除司机端缓存
 * @param driverId 司机ID（可选）
 */
export function clearDriverCache(_driverId?: string) {
  try {
    clearCache(CACHE_KEYS.DRIVER_PROFILE)
    clearCache(CACHE_KEYS.DRIVER_VEHICLES)
    clearCache(CACHE_KEYS.DRIVER_ATTENDANCE)
    clearCache(CACHE_KEYS.DRIVER_LEAVE)
    clearCache(CACHE_KEYS.DRIVER_PIECE_WORK)
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
    const versionData = getStorageSync(CACHE_KEYS.DATA_VERSION) as DataVersion | undefined
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
    setStorageSync(CACHE_KEYS.DATA_VERSION, newVersion)
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
    setStorageSync(key, cacheData)
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
    const cacheData = getStorageSync(key) as VersionedCacheData<T> | undefined
    if (!cacheData) {
      return null
    }

    const now = Date.now()
    const age = now - cacheData.timestamp

    // 检查缓存是否过期
    if (age > cacheData.ttl) {
      removeStorageSync(key)
      return null
    }

    // 检查版本号是否匹配
    const currentVersion = getDataVersion()
    if (cacheData.version !== currentVersion) {
      removeStorageSync(key)
      return null
    }

    return cacheData.data
  } catch (error) {
    console.error(`❌ [缓存] 获取带版本号的缓存失败: ${key}`, error)
    return null
  }
}

/**
 * 清除带版本号的缓存
 * @param key 缓存键名
 */
export function clearVersionedCache(key: string): void {
  clearCache(key)
}

/**
 * 清除所有缓存并重置版本号
 */
export function clearAllCacheAndResetVersion() {
  clearAllCache()
  try {
    removeStorageSync(CACHE_KEYS.DATA_VERSION)
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
  } else {
    clearAllCache()
  }
}
