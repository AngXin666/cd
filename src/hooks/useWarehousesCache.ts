/**
 * 仓库列表缓存 Hook
 * 基于通用缓存 Hook 实现仓库数据的缓存和实时更新
 *
 * 注意：缓存由 Repository 层统一管理（WarehousesRepository，TTL: 10分钟）
 * 此 Hook 主要负责实时更新监听和状态管理
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
 * 缓存策略：
 * - Repository 层（WarehousesRepository）：TTL 10 分钟
 * - Hooks 层：禁用缓存，由 Repository 统一管理
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
    cacheEnabled: false, // 禁用 Hooks 层缓存，由 Repository 层统一管理
    cacheTTL: 30 * 60 * 1000 // 30 分钟（仅作为备用，实际不使用）
  })
}
