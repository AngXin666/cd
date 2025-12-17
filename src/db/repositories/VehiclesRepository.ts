/**
 * 车辆数据 Repository
 * 提供车辆数据的缓存管理和统一访问接口
 *
 * 功能包括：
 * - 获取所有车辆（带司机信息）
 * - 车辆 CRUD 操作的缓存管理
 * - 自动缓存失效
 *
 * @module db/repositories/VehiclesRepository
 */

import { supabase } from '@/client/supabase'
import { CACHE_KEYS, clearCache, clearCacheByPrefix } from '@/utils/cache'
import { createLogger } from '@/utils/logger'
import type {
  DriverLicense,
  Profile,
  Vehicle,
  VehicleWithDriver
} from '../types'

// 创建日志记录器
const logger = createLogger('VehiclesRepository')

/**
 * 车辆缓存 TTL 常量
 * 车辆数据变化频率中等，使用 5 分钟缓存
 */
const VEHICLES_CACHE_TTL = 5 * 60 * 1000 // 5 分钟

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = 'vehicles_repo'

/**
 * 缓存存储
 * 使用简单的内存缓存，与 BaseRepository 保持一致
 */
interface CacheEntry<T> {
  value: T
  expiry: number
}

const cache = new Map<string, CacheEntry<unknown>>()

/**
 * 从缓存获取数据
 * @param key - 缓存键
 * @returns 缓存的数据，如果不存在或已过期则返回 null
 */
function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) {
    logger.debug('缓存未命中', { key })
    return null
  }
  if (Date.now() > entry.expiry) {
    cache.delete(key)
    logger.debug('缓存已过期', { key })
    return null
  }
  logger.debug('缓存命中', { key })
  return entry.value as T
}

/**
 * 设置缓存
 * @param key - 缓存键
 * @param value - 缓存值
 * @param ttl - 过期时间（毫秒）
 */
function setToCache<T>(key: string, value: T, ttl: number): void {
  cache.set(key, {
    value,
    expiry: Date.now() + ttl
  })
  logger.debug('缓存已设置', { key, ttl })
}

/**
 * 清除指定前缀的缓存
 * @param prefix - 缓存键前缀
 */
function clearCacheByPrefixLocal(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
  logger.debug('缓存已清除', { prefix })
}

/**
 * 车辆 Repository 类
 * 提供车辆数据的缓存管理和统一访问接口
 *
 * @example
 * ```typescript
 * import { vehiclesRepository } from '@/db/repositories'
 *
 * // 获取所有车辆（带司机信息）
 * const vehicles = await vehiclesRepository.getAllWithDrivers()
 *
 * // 清除缓存
 * vehiclesRepository.invalidateCache()
 * ```
 */
export class VehiclesRepository {
  /**
   * 获取所有车辆信息（包含司机信息）
   * 用于老板查看所有车辆列表
   *
   * 缓存策略：
   * - TTL: 5 分钟
   * - 在车辆创建/更新/删除时自动清除缓存
   *
   * @returns 车辆列表（包含司机信息）
   *
   * @example
   * ```typescript
   * const vehicles = await vehiclesRepository.getAllWithDrivers()
   * vehicles.forEach(v => {
   *   console.log(`${v.plate_number} - ${v.driver_name}`)
   * })
   * ```
   */
  async getAllWithDrivers(): Promise<VehicleWithDriver[]> {
    const cacheKey = `${CACHE_PREFIX}_all_with_drivers`

    // 1. 尝试从缓存获取
    const cached = getFromCache<VehicleWithDriver[]>(cacheKey)
    if (cached) {
      logger.info('从缓存获取所有车辆', { count: cached.length })
      return cached
    }

    // 2. 从数据库查询
    logger.db('查询', 'vehicles', { action: 'getAllWithDrivers' })

    try {
      // 查询所有车辆
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('plate_number', { ascending: true })
        .order('created_at', { ascending: false })

      if (vehiclesError) {
        logger.error('获取所有车辆失败', {
          error: vehiclesError.message,
          code: vehiclesError.code,
          details: vehiclesError.details,
          hint: vehiclesError.hint
        })
        return []
      }

      if (!vehiclesData || vehiclesData.length === 0) {
        // 缓存空结果，避免频繁查询
        setToCache(cacheKey, [], VEHICLES_CACHE_TTL)
        return []
      }

      // 按车牌号去重，保留最新的记录
      const latestVehiclesMap = new Map<string, Vehicle>()
      vehiclesData.forEach((vehicle: Vehicle) => {
        if (!latestVehiclesMap.has(vehicle.plate_number)) {
          latestVehiclesMap.set(vehicle.plate_number, vehicle)
        }
      })
      const latestVehicles = Array.from(latestVehiclesMap.values())

      // 获取所有相关的用户ID
      const userIds = latestVehicles.map((v) => v.user_id).filter(Boolean)

      // 批量查询司机基本信息
      const { data: profilesData, error: profilesError } = await supabase
        .from('users')
        .select('id, name, phone, email')
        .in('id', userIds)

      if (profilesError) {
        logger.error('获取司机信息失败', { error: profilesError.message })
      }

      // 批量查询司机实名信息
      const { data: licensesData, error: licensesError } = await supabase
        .from('driver_licenses')
        .select('driver_id, id_card_name')
        .in('driver_id', userIds)

      if (licensesError) {
        logger.error('获取司机实名信息失败', { error: licensesError.message })
      }

      // 构建查询结果映射
      type ProfileData = Pick<Profile, 'id' | 'name' | 'phone' | 'email'>
      type LicenseData = Pick<DriverLicense, 'driver_id' | 'id_card_name'>

      const profilesMap = new Map<string, ProfileData>()
      if (profilesData) {
        profilesData.forEach((profile: ProfileData) => {
          profilesMap.set(profile.id, profile)
        })
      }

      const licensesMap = new Map<string, LicenseData>()
      if (licensesData) {
        licensesData.forEach((license: LicenseData) => {
          licensesMap.set(license.driver_id, license)
        })
      }

      // 组装车辆和司机信息
      const vehicles: VehicleWithDriver[] = latestVehicles.map((item) => {
        const profile = profilesMap.get(item.user_id)
        const license = licensesMap.get(item.user_id)
        // 优先使用实名信息中的姓名
        const displayName = license?.id_card_name || profile?.name || null

        return {
          ...item,
          driver_id: profile?.id || null,
          driver_name: displayName,
          driver_phone: profile?.phone || null,
          driver_email: profile?.email || null
        }
      })

      // 3. 缓存结果
      setToCache(cacheKey, vehicles, VEHICLES_CACHE_TTL)
      logger.info('车辆数据已缓存', { count: vehicles.length, ttl: VEHICLES_CACHE_TTL })

      return vehicles
    } catch (error) {
      logger.error('获取所有车辆异常', { error })
      return []
    }
  }

  /**
   * 清除所有车辆相关缓存
   * 在车辆创建/更新/删除时调用
   *
   * @example
   * ```typescript
   * // 创建车辆后清除缓存
   * await insertVehicle(vehicleData)
   * vehiclesRepository.invalidateCache()
   * ```
   */
  invalidateCache(): void {
    // 清除本地缓存
    clearCacheByPrefixLocal(CACHE_PREFIX)
    // 清除全局缓存（兼容旧的缓存系统）
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)
    logger.info('车辆缓存已清除')
  }

  /**
   * 获取缓存统计信息
   * 用于调试和监控
   *
   * @returns 缓存统计信息
   */
  getCacheStats(): { size: number; keys: string[] } {
    const keys = Array.from(cache.keys()).filter((k) => k.startsWith(CACHE_PREFIX))
    return {
      size: keys.length,
      keys
    }
  }
}

/**
 * 车辆 Repository 单例实例
 * 推荐使用此实例，避免创建多个实例
 */
export const vehiclesRepository = new VehiclesRepository()
