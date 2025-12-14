/**
 * 通用数据缓存 Hook
 * 提供任何数据类型的加载、缓存和实时更新功能
 * 这是一个全局的缓存解决方案，适用于所有数据加载场景
 *
 * @module hooks/useDataCache
 * @feature user-list-cache-optimization
 */

import {useCallback, useEffect, useRef, useState} from 'react'
import {CACHE_CONFIG, cacheManager} from '@/utils/cacheManager'
import {RealtimeListener} from '@/utils/realtimeListener'

/**
 * Hook 配置选项
 */
export interface UseDataCacheOptions<T> {
  /** 缓存键 */
  cacheKey: string
  /** 数据加载函数 */
  loadData: () => Promise<T>
  /** 是否启用缓存，默认 true */
  cacheEnabled?: boolean
  /** 缓存有效期（毫秒），默认 30 分钟 */
  cacheTTL?: number
  /** 是否启用实时更新，默认 true */
  realtimeEnabled?: boolean
  /** 监听的表名数组（用于实时更新） */
  realtimeTables?: string[]
  /** 是否启用轮询降级，默认 true */
  enablePolling?: boolean
  /** 轮询间隔（毫秒），默认 30 秒 */
  pollingInterval?: number
  /** 依赖项数组（当依赖变化时重新加载） */
  dependencies?: any[]
}

/**
 * Hook 返回值
 */
export interface UseDataCacheReturn<T> {
  /** 数据 */
  data: T | null
  /** 加载状态 */
  loading: boolean
  /** 错误信息 */
  error: Error | null
  /** 是否来自缓存 */
  fromCache: boolean
  /** 刷新数据（强制重新加载） */
  refresh: () => Promise<void>
  /** 清除缓存 */
  clearCache: () => void
  /** 更新数据（不触发加载） */
  setData: (data: T) => void
}

/**
 * 通用数据缓存 Hook
 * 提供缓存、加载和实时更新功能
 *
 * @example
 * ```typescript
 * // 使用示例：缓存用户列表
 * const {data: users, loading, refresh, clearCache} = useDataCache({
 *   cacheKey: 'users_list',
 *   loadData: async () => await UsersAPI.getAllUsers(),
 *   realtimeTables: ['users', 'warehouse_assignments']
 * })
 *
 * // 数据变更后清除缓存并刷新
 * const handleAddUser = async () => {
 *   await UsersAPI.createUser(...)
 *   clearCache()
 *   await refresh()
 * }
 * ```
 *
 * @param options - Hook 配置选项
 * @returns Hook 返回值
 */
export function useDataCache<T>(options: UseDataCacheOptions<T>): UseDataCacheReturn<T> {
  const {
    cacheKey,
    loadData,
    cacheEnabled = true,
    cacheTTL = CACHE_CONFIG.DEFAULT_TTL,
    realtimeEnabled = true,
    realtimeTables = [],
    enablePolling = true,
    pollingInterval = CACHE_CONFIG.POLLING_INTERVAL,
    dependencies = []
  } = options

  // 状态管理
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [fromCache, setFromCache] = useState(false)

  // Realtime 监听器引用
  const realtimeRef = useRef<RealtimeListener | null>(null)
  // 加载函数引用（避免重复创建）
  const loadDataRef = useRef(loadData)
  loadDataRef.current = loadData

  /**
   * 加载数据
   * @param forceRefresh - 是否强制刷新（忽略缓存）
   */
  const load = useCallback(
    async (forceRefresh: boolean = false) => {
      try {
        setLoading(true)
        setError(null)

        // 尝试从缓存加载
        if (cacheEnabled && !forceRefresh) {
          const cached = cacheManager.get<T>(cacheKey)

          if (cached) {
            console.log(`[useDataCache] 从缓存加载: ${cacheKey}`)
            setData(cached)
            setFromCache(true)
            setLoading(false)
            return
          }
        }

        // 从数据源加载
        console.log(`[useDataCache] 从数据源加载: ${cacheKey}`)
        setFromCache(false)

        const result = await loadDataRef.current()
        setData(result)

        // 写入缓存
        if (cacheEnabled) {
          cacheManager.set(cacheKey, result, cacheTTL)
          console.log(`[useDataCache] 数据已缓存: ${cacheKey}`)
        }

        setLoading(false)
      } catch (err) {
        console.error(`[useDataCache] 加载失败: ${cacheKey}`, err)
        setError(err as Error)
        setLoading(false)

        // 如果有缓存，显示缓存数据（离线模式）
        if (cacheEnabled) {
          const cached = cacheManager.get<T>(cacheKey)
          if (cached) {
            console.log(`[useDataCache] 加载失败，使用缓存数据: ${cacheKey}`)
            setData(cached)
            setFromCache(true)
          }
        }
      }
    },
    [cacheKey, cacheEnabled, cacheTTL]
  )

  /**
   * 刷新数据（强制重新加载）
   */
  const refresh = useCallback(async () => {
    await load(true)
  }, [load])

  /**
   * 清除缓存
   */
  const clearCache = useCallback(() => {
    console.log(`[useDataCache] 清除缓存: ${cacheKey}`)
    cacheManager.invalidate([cacheKey])
  }, [cacheKey])

  // 初始加载（依赖项变化时重新加载）
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...dependencies])

  // 实时更新监听
  useEffect(() => {
    if (!realtimeEnabled || realtimeTables.length === 0) {
      return
    }

    console.log(`[useDataCache] 启动实时更新监听: ${cacheKey}`, realtimeTables)

    const listener = new RealtimeListener({
      tables: realtimeTables,
      onChange: (event) => {
        console.log(`[useDataCache] 数据变更: ${cacheKey}`, event.type, event.table)
        // 清除缓存并重新加载
        clearCache()
        load(true)
      },
      onError: (err) => {
        console.error(`[useDataCache] Realtime 错误: ${cacheKey}`, err)
      },
      enablePolling,
      pollingInterval
    })

    listener.start()
    realtimeRef.current = listener

    return () => {
      console.log(`[useDataCache] 停止实时更新监听: ${cacheKey}`)
      listener.stop()
      realtimeRef.current = null
    }
  }, [realtimeEnabled, realtimeTables, enablePolling, pollingInterval, cacheKey, clearCache, load])

  return {
    data,
    loading,
    error,
    fromCache,
    refresh,
    clearCache,
    setData
  }
}
