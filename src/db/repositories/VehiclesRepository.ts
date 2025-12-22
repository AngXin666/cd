/**
 * 车辆数据 Repository
 * 提供车辆数据的缓存管理和统一访问接口
 *
 * 功能包括：
 * - 获取所有车辆（带司机信息）
 * - 根据 ID 获取车辆信息
 * - 根据司机 ID 获取车辆列表
 * - 车辆 CRUD 操作的缓存管理
 * - 自动缓存失效
 *
 * 缓存策略：
 * - TTL: 5 分钟
 * - 在车辆创建/更新/删除时自动清除缓存
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
  VehicleWithDocuments,
  VehicleWithDriver,
  VehicleWithDriverDetails
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
 * // 根据 ID 获取车辆
 * const vehicle = await vehiclesRepository.getById('vehicle-123')
 *
 * // 根据司机 ID 获取车辆列表
 * const driverVehicles = await vehiclesRepository.getByDriverId('driver-123')
 *
 * // 清除缓存
 * vehiclesRepository.invalidateCache()
 * ```
 */
export class VehiclesRepository {
  /**
   * 将 vehicle_documents 中的字段平铺到车辆对象中
   * 这样前端可以直接使用 vehicle.left_front_photo 等字段
   * @param vehicle - 包含 document 关联的车辆数据
   * @returns 平铺后的车辆对象
   */
  private flattenVehicleDocument<T extends Record<string, unknown>>(vehicle: T): Vehicle {
    const docArray = vehicle.document as unknown[] | null
    const doc = (Array.isArray(docArray) ? docArray[0] : docArray) as Record<string, unknown> | null

    // 使用类型断言将结果转换为 Vehicle
    // 这是安全的，因为 vehicle 来自数据库查询，包含所有必需字段
    return {
      ...vehicle,
      // 平铺车辆照片字段
      left_front_photo: doc?.left_front_photo || vehicle.left_front_photo,
      right_front_photo: doc?.right_front_photo || vehicle.right_front_photo,
      left_rear_photo: doc?.left_rear_photo || vehicle.left_rear_photo,
      right_rear_photo: doc?.right_rear_photo || vehicle.right_rear_photo,
      dashboard_photo: doc?.dashboard_photo || vehicle.dashboard_photo,
      rear_door_photo: doc?.rear_door_photo || vehicle.rear_door_photo,
      cargo_box_photo: doc?.cargo_box_photo || vehicle.cargo_box_photo,
      // 平铺行驶证照片字段
      driving_license_main_photo: doc?.driving_license_main_photo || vehicle.driving_license_main_photo,
      driving_license_sub_photo: doc?.driving_license_sub_photo || vehicle.driving_license_sub_photo,
      driving_license_back_photo: doc?.driving_license_back_photo || vehicle.driving_license_back_photo,
      driving_license_sub_back_photo: doc?.driving_license_sub_back_photo || vehicle.driving_license_sub_back_photo,
      // 平铺时间字段
      pickup_time: doc?.pickup_time || vehicle.pickup_time,
      return_time: doc?.return_time || vehicle.return_time,
      // 平铺照片数组字段（使用 ?? 确保空数组不会被回退）
      pickup_photos: doc?.pickup_photos ?? vehicle.pickup_photos ?? null,
      return_photos: doc?.return_photos ?? vehicle.return_photos ?? null,
      registration_photos: doc?.registration_photos ?? vehicle.registration_photos ?? null,
      damage_photos: doc?.damage_photos ?? vehicle.damage_photos ?? null,
      // 平铺审核相关字段（这些字段只存在于 vehicle_documents 表）
      review_notes: doc?.review_notes || null,
      required_photos: doc?.required_photos || null,
      // 平铺行驶证信息字段
      use_character: doc?.use_character || vehicle.use_character,
      register_date: doc?.register_date || vehicle.register_date,
      // 平铺租赁信息字段
      lessor_name: doc?.lessor_name,
      lessor_contact: doc?.lessor_contact,
      lessee_name: doc?.lessee_name,
      lessee_contact: doc?.lessee_contact,
      monthly_rent: doc?.monthly_rent,
      lease_start_date: doc?.lease_start_date,
      lease_end_date: doc?.lease_end_date,
      rent_payment_day: doc?.rent_payment_day,
      // 清除 document 字段避免重复
      document: undefined
    } as unknown as Vehicle
  }
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
   * 根据 ID 获取车辆信息（包含扩展信息）
   * 会将 vehicle_documents 中的字段平铺到车辆对象中
   *
   * 缓存策略：
   * - TTL: 5 分钟
   * - 在车辆更新/删除时自动清除缓存
   *
   * @param vehicleId - 车辆 ID
   * @returns 车辆信息（包含文档），如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const vehicle = await vehiclesRepository.getById('vehicle-123')
   * if (vehicle) {
   *   console.log(vehicle.plate_number)
   * }
   * ```
   */
  async getById(vehicleId: string): Promise<VehicleWithDocuments | null> {
    const cacheKey = `${CACHE_PREFIX}_id_${vehicleId}`

    // 1. 尝试从缓存获取
    const cached = getFromCache<VehicleWithDocuments>(cacheKey)
    if (cached) {
      logger.debug('从缓存获取车辆', { vehicleId })
      return cached
    }

    // 2. 从数据库查询
    logger.db('查询', 'vehicles', { vehicleId })

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`*, document:vehicle_documents(*)`)
        .eq('id', vehicleId)
        .maybeSingle()

      if (error) {
        logger.error('获取车辆信息失败', { error: error.message, vehicleId })
        return null
      }

      if (!data) {
        return null
      }

      // 使用辅助函数平铺字段，并保留 document 对象
      const flattened = this.flattenVehicleDocument(data)
      const docArray = data.document
      const doc = Array.isArray(docArray) ? docArray[0] : docArray

      const result = {
        ...flattened,
        document: doc
      } as VehicleWithDocuments

      // 3. 缓存结果
      setToCache(cacheKey, result, VEHICLES_CACHE_TTL)
      logger.debug('车辆数据已缓存', { vehicleId })

      return result
    } catch (error) {
      logger.error('获取车辆信息异常', { error, vehicleId })
      return null
    }
  }

  /**
   * 根据司机 ID 获取车辆列表
   * 同时查询 driver_id 和 user_id 字段，兼容新旧数据
   *
   * 缓存策略：
   * - TTL: 5 分钟
   * - 在车辆创建/更新/删除时自动清除缓存
   *
   * @param driverId - 司机 ID（可以是 driver_id 或 user_id）
   * @returns 车辆列表（包含图片等扩展信息）
   *
   * @example
   * ```typescript
   * const vehicles = await vehiclesRepository.getByDriverId('driver-123')
   * vehicles.forEach(v => console.log(v.plate_number))
   * ```
   */
  async getByDriverId(driverId: string): Promise<Vehicle[]> {
    const cacheKey = `${CACHE_PREFIX}_driver_${driverId}`

    // 1. 尝试从缓存获取
    const cached = getFromCache<Vehicle[]>(cacheKey)
    if (cached) {
      logger.debug('从缓存获取司机车辆', { driverId, count: cached.length })
      return cached
    }

    // 2. 从数据库查询
    logger.db('查询', 'vehicles', { driverId })

    try {
      // 使用 or 条件同时查询 driver_id 和 user_id（兼容旧数据和新数据）
      const { data, error } = await supabase
        .from('vehicles')
        .select(`*, document:vehicle_documents(*)`)
        .or(`driver_id.eq.${driverId},user_id.eq.${driverId}`)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('获取司机车辆失败', { error: error.message, driverId })
        return []
      }

      // 将 vehicle_documents 中的字段平铺到车辆对象中
      const result = (data || []).map((vehicle) => this.flattenVehicleDocument(vehicle))

      // 3. 缓存结果
      setToCache(cacheKey, result, VEHICLES_CACHE_TTL)
      logger.debug('司机车辆数据已缓存', { driverId, count: result.length })

      return result
    } catch (error) {
      logger.error('获取司机车辆异常', { error, driverId })
      return []
    }
  }

  /**
   * 根据车辆 ID 获取车辆信息（包含司机详细信息）
   *
   * @param vehicleId - 车辆 ID
   * @returns 车辆信息（包含司机详细信息），如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const vehicle = await vehiclesRepository.getWithDriverDetails('vehicle-123')
   * if (vehicle) {
   *   console.log(vehicle.driver_profile?.name)
   * }
   * ```
   */
  async getWithDriverDetails(vehicleId: string): Promise<VehicleWithDriverDetails | null> {
    const cacheKey = `${CACHE_PREFIX}_with_driver_${vehicleId}`

    // 1. 尝试从缓存获取
    const cached = getFromCache<VehicleWithDriverDetails>(cacheKey)
    if (cached) {
      logger.debug('从缓存获取车辆和司机详情', { vehicleId })
      return cached
    }

    // 2. 从数据库查询
    logger.db('查询', 'vehicles with driver details', { vehicleId })

    try {
      // 先获取车辆信息
      const vehicle = await this.getById(vehicleId)
      if (!vehicle) {
        return null
      }

      // 获取司机基本信息
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', vehicle.user_id)
        .maybeSingle()

      if (userError) {
        logger.error('获取司机基本信息失败', { error: userError.message })
      }

      let profile: Profile | null = null
      if (user) {
        const { data: roleData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        profile = {
          ...user,
          role: roleData?.role || 'DRIVER'
        }
      }

      // 获取司机驾驶证信息
      const { data: driverLicense, error: licenseError } = await supabase
        .from('driver_licenses')
        .select('*')
        .eq('driver_id', vehicle.user_id)
        .maybeSingle()

      if (licenseError) {
        logger.error('获取司机证件信息失败', { error: licenseError.message })
      }

      const result: VehicleWithDriverDetails = {
        ...vehicle,
        driver_profile: profile || null,
        driver_license: driverLicense || null
      }

      // 3. 缓存结果
      setToCache(cacheKey, result, VEHICLES_CACHE_TTL)
      logger.debug('车辆和司机详情已缓存', { vehicleId })

      return result
    } catch (error) {
      logger.error('获取车辆和司机详细信息异常', { error, vehicleId })
      return null
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
   * 公开的缓存失效方法（与 BaseRepository 接口一致）
   * 清除该 Repository 的所有缓存
   *
   * 使用场景：
   * - Realtime 事件触发缓存失效
   * - 事件驱动的跨 Repository 缓存失效
   * - 登出时清除所有缓存
   */
  clearAllCache(): void {
    this.invalidateCache()
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
