import type {RealtimeChannel} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import type { DashboardStats } from '@/db/api/dashboard'
import { getAllWarehousesDashboardStats, getWarehouseDashboardStats } from '@/db/api/dashboard'

// 环境检测
const isH5 = process.env.TARO_ENV === 'h5'

// 存储兼容工具函数
const getStorageSync = (key: string): any => {
  if (isH5) {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } else {
    return Taro.getStorageSync(key)
  }
}

const setStorageSync = (key: string, data: any): void => {
  if (isH5) {
    localStorage.setItem(key, JSON.stringify(data))
  } else {
    Taro.setStorageSync(key, data)
  }
}

const removeStorageSync = (key: string): void => {
  if (isH5) {
    localStorage.removeItem(key)
  } else {
    Taro.removeStorageSync(key)
  }
}

// 缓存配置
const CACHE_KEY_ALL = 'super_admin_dashboard_all'
const CACHE_KEY_PREFIX = 'super_admin_dashboard_'
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5分钟缓存有效期

interface CachedData {
  data: DashboardStats
  timestamp: number
  warehouseId?: string
}

interface UseSuperAdminDashboardOptions {
  warehouseId?: string // 如果提供，则加载指定仓库；否则加载所有仓库汇总
  enableRealtime?: boolean
  cacheEnabled?: boolean
}

/**
 * 老板仪表板数据管理 Hook
 * 支持查看所有仓库汇总或单个仓库数据
 */
export function useSuperAdminDashboard(options: UseSuperAdminDashboardOptions) {
  const {warehouseId, enableRealtime = true, cacheEnabled = true} = options

  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const loadingRef = useRef(false)

  // 获取缓存键
  const getCacheKey = useCallback((wid?: string) => {
    return wid ? `${CACHE_KEY_PREFIX}${wid}` : CACHE_KEY_ALL
  }, [])

  // 从缓存读取数据
  const loadFromCache = useCallback(
    (wid?: string): DashboardStats | null => {
      if (!cacheEnabled) return null

      try {
        const cacheKey = getCacheKey(wid)
        const cached = getStorageSync(cacheKey) as CachedData | null

        if (cached) {
          const now = Date.now()
          // 检查缓存是否过期
          if (now - cached.timestamp < CACHE_EXPIRY_MS) {
            return cached.data
          }
          // 缓存过期，删除
          removeStorageSync(cacheKey)
        }
      } catch (err) {
        console.error('读取缓存失败:', err)
      }

      return null
    },
    [cacheEnabled, getCacheKey]
  )

  // 保存数据到缓存
  const saveToCache = useCallback(
    (dashboardData: DashboardStats, wid?: string) => {
      if (!cacheEnabled) return

      try {
        const cacheKey = getCacheKey(wid)
        const cacheData: CachedData = {
          data: dashboardData,
          timestamp: Date.now(),
          warehouseId: wid
        }
        setStorageSync(cacheKey, cacheData)
      } catch (err) {
        console.error('保存缓存失败:', err)
      }
    },
    [cacheEnabled, getCacheKey]
  )

  // 清除缓存
  const clearCache = useCallback(
    (wid?: string) => {
      try {
        const cacheKey = getCacheKey(wid)
        removeStorageSync(cacheKey)
      } catch (err) {
        console.error('清除缓存失败:', err)
      }
    },
    [getCacheKey]
  )

  // 加载仪表板数据
  const loadData = useCallback(
    async (wid?: string, forceRefresh = false) => {
      if (loadingRef.current) {
        return
      }

      loadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        if (!forceRefresh) {
          const cachedData = loadFromCache(wid)
          if (cachedData) {
            setData(cachedData)
            setLoading(false)
            loadingRef.current = false
            return
          }
        }

        const stats = wid ? await getWarehouseDashboardStats(wid) : await getAllWarehousesDashboardStats()
        setData(stats)

        saveToCache(stats, wid)
      } catch (err) {
        console.error('[useSuperAdminDashboard] 加载仪表板数据失败:', err)
        setError('加载数据失败')
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [loadFromCache, saveToCache]
  )

  // 使用 ref 保存最新的 loadData 函数，避免依赖循环
  const loadDataRef = useRef(loadData)
  useEffect(() => {
    loadDataRef.current = loadData
  }, [loadData])

  // 创建稳定的刷新函数，不依赖 loadData
  const refreshStable = useCallback(() => {
    clearCache(warehouseId)
    loadDataRef.current(warehouseId, true)
  }, [warehouseId, clearCache])

  // 刷新数据（强制从服务器加载）- 导出给外部使用
  const refresh = useCallback(() => {
    refreshStable()
  }, [refreshStable])

  // 设置实时订阅
  useEffect(() => {
    if (!enableRealtime) return

    // 清理旧的订阅
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // 创建新的订阅通道
    const channelName = warehouseId ? `super_admin_dashboard_${warehouseId}` : 'super_admin_dashboard_all'

    let channel = supabase.channel(channelName)

    // 订阅计件记录变化
    if (warehouseId) {
      // 单个仓库：只订阅该仓库的变化
      channel = channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'piece_work_records',
            filter: `warehouse_id=eq.${warehouseId}`
          },
          () => {
            refreshStable()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance',
            filter: `warehouse_id=eq.${warehouseId}`
          },
          () => {
            refreshStable()
          }
        )
    } else {
      // 所有仓库：订阅所有变化
      channel = channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'piece_work_records'
          },
          () => {
            refreshStable()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance'
          },
          () => {
            refreshStable()
          }
        )
    }

    // 订阅请假申请变化（所有仓库都需要）
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leave_applications'
      },
      () => {
        refreshStable()
      }
    )

    channel.subscribe()
    channelRef.current = channel

    // 清理函数
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [warehouseId, enableRealtime, refreshStable])

  // 初始加载数据
  useEffect(() => {
    loadData(warehouseId)
  }, [warehouseId, loadData])

  return {
    data,
    loading,
    error,
    refresh,
    clearCache: () => clearCache(warehouseId)
  }
}
