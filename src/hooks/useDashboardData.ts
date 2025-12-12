import type {RealtimeChannel} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import type { DashboardStats } from '@/db/api/dashboard'
import { getWarehouseDashboardStats } from '@/db/api/dashboard'

// 检测当前运行环境
const isH5 = process.env.TARO_ENV === 'h5'

// 存储工具函数，兼容H5和小程序
function getStorageSync(key: string): any {
  if (isH5) {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } else {
    return Taro.getStorageSync(key)
  }
}

function setStorageSync(key: string, data: any): void {
  if (isH5) {
    localStorage.setItem(key, JSON.stringify(data))
  } else {
    Taro.setStorageSync(key, data)
  }
}

function removeStorageSync(key: string): void {
  if (isH5) {
    localStorage.removeItem(key)
  } else {
    Taro.removeStorageSync(key)
  }
}

// 缓存配置
const CACHE_KEY_PREFIX = 'dashboard_cache_'
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5分钟缓存有效期

interface CachedData {
  data: DashboardStats
  timestamp: number
  warehouseId: string
}

interface UseDashboardDataOptions {
  warehouseId: string
  enableRealtime?: boolean // 是否启用实时更新
  cacheEnabled?: boolean // 是否启用缓存
}

/**
 * 仪表板数据管理 Hook
 * 提供数据加载、缓存、实时更新功能
 */
export function useDashboardData(options: UseDashboardDataOptions) {
  const {warehouseId, enableRealtime = true, cacheEnabled = true} = options

  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const loadingRef = useRef(false)

  // 获取缓存键
  const getCacheKey = useCallback((wid: string) => {
    return `${CACHE_KEY_PREFIX}${wid}`
  }, [])

  // 从缓存读取数据
  const loadFromCache = useCallback(
    (wid: string): DashboardStats | null => {
      if (!cacheEnabled) return null

      try {
        const cacheKey = getCacheKey(wid)
        const cached = getStorageSync(cacheKey) as CachedData | null

        if (cached && cached.warehouseId === wid) {
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
    (wid: string, dashboardData: DashboardStats) => {
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

  // 清除指定仓库的缓存
  const clearCache = useCallback(
    (wid: string) => {
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
    async (wid: string, forceRefresh = false) => {
      // 防止重复加载
      if (loadingRef.current) return

      loadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        // 如果不是强制刷新，先尝试从缓存读取
        if (!forceRefresh) {
          const cachedData = loadFromCache(wid)
          if (cachedData) {
            setData(cachedData)
            setLoading(false)
            loadingRef.current = false
            return
          }
        }

        // 从服务器加载数据
        const stats = await getWarehouseDashboardStats(wid)
        setData(stats)

        // 保存到缓存
        saveToCache(wid, stats)
      } catch (err) {
        console.error('加载仪表板数据失败:', err)
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
    if (warehouseId) {
      clearCache(warehouseId)
      loadDataRef.current(warehouseId, true)
    }
  }, [warehouseId, clearCache])

  // 刷新数据（强制从服务器加载）- 导出给外部使用
  const refresh = useCallback(() => {
    refreshStable()
  }, [refreshStable])

  // 设置实时订阅
  useEffect(() => {
    if (!enableRealtime || !warehouseId) return

    // 清理旧的订阅
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // 创建新的订阅通道
    const channel = supabase
      .channel(`dashboard_${warehouseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'piece_work_records',
          filter: `warehouse_id=eq.${warehouseId}`
        },
        () => {
          // 计件记录变化时刷新数据
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
          // 考勤记录变化时刷新数据
          refreshStable()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_applications'
        },
        (payload) => {
          // 请假申请变化时，检查是否属于当前仓库
          const record = payload.new as any
          if (record && record.warehouse_id === warehouseId) {
            refreshStable()
          }
        }
      )
      .subscribe()

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
    if (warehouseId) {
      loadData(warehouseId)
    }
  }, [warehouseId, loadData])

  return {
    data,
    loading,
    error,
    refresh,
    clearCache: () => clearCache(warehouseId)
  }
}
