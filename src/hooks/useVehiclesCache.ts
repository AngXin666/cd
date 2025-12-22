/**
 * 车辆列表缓存 Hook
 * 基于通用缓存 Hook 实现车辆数据的缓存和实时更新
 *
 * 注意：缓存由 Repository 层统一管理（VehiclesRepository，TTL: 5分钟）
 * 此 Hook 主要负责实时更新监听和状态管理
 *
 * @module hooks/useVehiclesCache
 * @feature user-list-cache-optimization
 */

import * as VehiclesAPI from '@/db/api/vehicles'
import {CACHE_KEYS} from '@/utils/cacheManager'
import {useDataCache} from './useDataCache'

/**
 * 车辆列表缓存 Hook
 * 提供车辆列表的加载、缓存和实时更新功能
 *
 * 缓存策略：
 * - Repository 层（VehiclesRepository）：TTL 5 分钟
 * - Hooks 层：禁用缓存，由 Repository 统一管理
 *
 * @param driverId - 可选的司机 ID，用于过滤特定司机的车辆
 *
 * @example
 * ```typescript
 * // 获取所有车辆（带司机信息）
 * const {data: vehicles, loading, refresh} = useVehiclesCache()
 *
 * // 获取特定司机的车辆
 * const {data: driverVehicles, loading} = useVehiclesCache('driver-id-123')
 * ```
 */
export function useVehiclesCache(driverId?: string) {
  const cacheKey = driverId ? `${CACHE_KEYS.VEHICLES}_${driverId}` : CACHE_KEYS.VEHICLES

  return useDataCache({
    cacheKey,
    loadData: async () => {
      if (driverId) {
        // 获取特定司机的车辆
        return await VehiclesAPI.getVehiclesByDriverId(driverId)
      }
      // 获取所有车辆（带司机信息）
      return await VehiclesAPI.getAllVehiclesWithDrivers()
    },
    realtimeTables: ['vehicles'],
    cacheEnabled: false, // 禁用 Hooks 层缓存，由 Repository 层统一管理
    cacheTTL: 30 * 60 * 1000, // 30 分钟（仅作为备用，实际不使用）
    dependencies: [driverId] // 当 driverId 变化时重新加载
  })
}
