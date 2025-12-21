import {useCallback, useEffect, useRef, useState} from 'react'
import type {WarehouseDataVolume} from '@/db/api/dashboard'
import {getWarehousesDataVolume} from '@/db/api/dashboard'
import type {Warehouse} from '@/db/types'
import {TypeSafeStorage} from '@/utils/storage'

/**
 * 带数据量的仓库信息
 */
export interface WarehouseWithVolume extends Warehouse {
  dataVolume?: WarehouseDataVolume
}

// ==================== 缓存配置 ====================
// 仓库数据量缓存有效期：3分钟
const CACHE_KEY_PREFIX = 'warehouse_sorted_'
const CACHE_EXPIRY_MS = 3 * 60 * 1000

interface CachedSortedData {
  warehouses: WarehouseWithVolume[]
  timestamp: number
  warehouseIds: string[]
}

interface UseWarehousesSortedOptions {
  warehouses: Warehouse[]
  userId?: string // 用户ID，用于统计该用户的数据量
  sortByVolume?: boolean // 是否按数据量排序
  hideEmpty?: boolean // 是否隐藏无数据的仓库
}

/**
 * 仓库排序 Hook
 *
 * 功能：
 * 1. 统计每个仓库的数据量
 * 2. 按数据量降序排列仓库
 * 3. 可选择隐藏无数据的仓库
 * 4. 智能缓存机制，避免重复请求
 */
export function useWarehousesSorted(options: UseWarehousesSortedOptions) {
  const {warehouses, userId, sortByVolume = true, hideEmpty = false} = options

  const [sortedWarehouses, setSortedWarehouses] = useState<WarehouseWithVolume[]>([])
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)

  // 生成缓存键
  const getCacheKey = useCallback(() => {
    const warehouseIds = warehouses.map((w) => w.id).sort().join(',')
    return `${CACHE_KEY_PREFIX}${userId || 'all'}_${warehouseIds}`
  }, [warehouses, userId])

  // 读取缓存
  const readCache = useCallback((): WarehouseWithVolume[] | null => {
    const cacheKey = getCacheKey()
    const cached = TypeSafeStorage.get<CachedSortedData>(cacheKey)
    if (cached?.warehouses) {
      const age = Date.now() - cached.timestamp
      // 检查缓存是否过期
      if (age < CACHE_EXPIRY_MS) {
        // 检查仓库列表是否变化
        const currentIds = warehouses.map((w) => w.id).sort().join(',')
        if (cached.warehouseIds.sort().join(',') === currentIds) {
          return cached.warehouses
        }
      }
    }
    return null
  }, [getCacheKey, warehouses])

  // 写入缓存
  const writeCache = useCallback(
    (data: WarehouseWithVolume[]) => {
      const cacheKey = getCacheKey()
      const cacheData: CachedSortedData = {
        warehouses: data,
        timestamp: Date.now(),
        warehouseIds: warehouses.map((w) => w.id)
      }
      TypeSafeStorage.set(cacheKey, cacheData)
    },
    [getCacheKey, warehouses]
  )

  // 清除缓存
  const clearCache = useCallback(() => {
    const cacheKey = getCacheKey()
    TypeSafeStorage.remove(cacheKey)
  }, [getCacheKey])

  // 加载仓库数据量并排序
  const loadAndSort = useCallback(async (forceRefresh = false) => {
    if (warehouses.length === 0) {
      setSortedWarehouses([])
      return
    }

    // 防止重复加载
    if (loadingRef.current) {
      return
    }

    // 先尝试使用缓存（除非强制刷新）
    if (!forceRefresh) {
      const cachedData = readCache()
      if (cachedData) {
        setSortedWarehouses(cachedData)
        return
      }
    }

    setLoading(true)
    loadingRef.current = true

    try {
      // 获取所有仓库的数据量
      const warehouseIds = warehouses.map((w) => w.id)
      const volumes = await getWarehousesDataVolume(warehouseIds, userId)

      // 创建数据量映射
      const volumeMap = new Map<string, WarehouseDataVolume>()
      for (const volume of volumes) {
        volumeMap.set(volume.warehouseId, volume)
      }

      // 合并仓库信息和数据量
      let warehousesWithVolume: WarehouseWithVolume[] = warehouses.map((warehouse) => ({
        ...warehouse,
        dataVolume: volumeMap.get(warehouse.id)
      }))

      // 过滤无数据的仓库
      if (hideEmpty) {
        warehousesWithVolume = warehousesWithVolume.filter((w) => w.dataVolume?.hasData)
      }

      // 按数据量排序
      if (sortByVolume) {
        warehousesWithVolume.sort((a, b) => {
          const aVolume = a.dataVolume?.totalVolume || 0
          const bVolume = b.dataVolume?.totalVolume || 0
          const aHasData = a.dataVolume?.hasData || false
          const bHasData = b.dataVolume?.hasData || false

          // 有数据的排在前面
          if (aHasData !== bHasData) {
            return aHasData ? -1 : 1
          }

          // 数据量多的排在前面
          if (aVolume !== bVolume) {
            return bVolume - aVolume
          }

          // 数据量相同时按名称排序
          return a.name.localeCompare(b.name, 'zh-CN')
        })
      }

      setSortedWarehouses(warehousesWithVolume)
      // 写入缓存
      writeCache(warehousesWithVolume)
    } catch (error) {
      console.error('加载仓库数据量失败:', error)
      // 出错时返回原始列表
      setSortedWarehouses(warehouses)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [warehouses, userId, sortByVolume, hideEmpty, readCache, writeCache])

  // 刷新数据（清除缓存后重新加载）
  const refresh = useCallback(() => {
    clearCache()
    loadAndSort(true)
  }, [clearCache, loadAndSort])

  // 当仓库列表或选项变化时重新加载
  useEffect(() => {
    loadAndSort()
  }, [loadAndSort])

  return {
    warehouses: sortedWarehouses,
    loading,
    refresh
  }
}
