/**
 * 仓库列表缓存 Hook
 * 基于通用缓存 Hook 实现仓库数据的缓存和实时更新
 *
 * @module hooks/useWarehousesCache
 * @feature user-list-cache-optimization
 */

import * as WarehousesAPI from '@/db/api/warehouses'
import type {Warehouse} from '@/db/types'
import {CACHE_KEYS} from '@/utils/cacheManager'
import {useDataCache} from './useDataCache'

/**
 * 仓库列表缓存 Hook
 * 提供仓库列表的加载、缓存和实时更新功能
 *
 * @example
 * ```typescript
 * const {data: warehouses, loading, refresh, clearCache} = useWarehousesCache()
 *
 * // 添加仓库后刷新
 * const handleAddWarehouse = async () => {
 *   await WarehousesAPI.createWarehouse(...)
 *   clearCache()
 *   await refresh()
 * }
 * ```
 */
export function useWarehousesCache() {
  return useDataCache<Warehouse[]>({
    cacheKey: CACHE_KEYS.WAREHOUSES,
    loadData: async () => await WarehousesAPI.getAllWarehouses(),
    realtimeTables: ['warehouses'],
    cacheEnabled: true,
    cacheTTL: 30 * 60 * 1000 // 30 分钟
  })
}
