import type {RealtimeChannel} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import {getManagerWarehouses} from '@/db/api'
import type {Warehouse} from '@/db/types'

// 缓存配置
const WAREHOUSES_CACHE_KEY = 'manager_warehouses_cache'
const CACHE_EXPIRY_MS = 10 * 60 * 1000 // 10分钟缓存有效期

interface CachedWarehouses {
  data: Warehouse[]
  timestamp: number
  managerId: string
}

interface UseWarehousesDataOptions {
  managerId: string
  cacheEnabled?: boolean
  enableRealtime?: boolean // 是否启用实时更新
}

/**
 * 仓库列表数据管理 Hook
 * 提供仓库列表加载、缓存、实时更新功能
 */
export function useWarehousesData(options: UseWarehousesDataOptions) {
  const {managerId, cacheEnabled = true, enableRealtime = false} = options

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // 从缓存读取仓库列表
  const loadFromCache = useCallback((): Warehouse[] | null => {
    if (!cacheEnabled) return null

    try {
      const cached = Taro.getStorageSync(WAREHOUSES_CACHE_KEY) as CachedWarehouses | null

      if (cached && cached.managerId === managerId) {
        const now = Date.now()
        // 检查缓存是否过期
        if (now - cached.timestamp < CACHE_EXPIRY_MS) {
          return cached.data
        }
        // 缓存过期，删除
        Taro.removeStorageSync(WAREHOUSES_CACHE_KEY)
      }
    } catch (err) {
      console.error('读取仓库缓存失败:', err)
    }

    return null
  }, [managerId, cacheEnabled])

  // 保存仓库列表到缓存
  const saveToCache = useCallback(
    (warehousesData: Warehouse[]) => {
      if (!cacheEnabled) return

      try {
        const cacheData: CachedWarehouses = {
          data: warehousesData,
          timestamp: Date.now(),
          managerId
        }
        Taro.setStorageSync(WAREHOUSES_CACHE_KEY, cacheData)
      } catch (err) {
        console.error('保存仓库缓存失败:', err)
      }
    },
    [managerId, cacheEnabled]
  )

  // 清除缓存
  const clearCache = useCallback(() => {
    try {
      Taro.removeStorageSync(WAREHOUSES_CACHE_KEY)
    } catch (err) {
      console.error('清除仓库缓存失败:', err)
    }
  }, [])

  // 加载仓库列表
  const loadWarehouses = useCallback(
    async (forceRefresh = false) => {
      console.log('[useWarehousesData] 开始加载仓库列表，managerId:', managerId, 'forceRefresh:', forceRefresh)
      setLoading(true)
      setError(null)

      try {
        // 如果不是强制刷新，先尝试从缓存读取
        if (!forceRefresh) {
          const cachedData = loadFromCache()
          if (cachedData) {
            console.log('[useWarehousesData] 从缓存加载，仓库数量:', cachedData.length)
            setWarehouses(cachedData)
            setLoading(false)
            return cachedData
          }
        }

        console.log('[useWarehousesData] 从服务器加载数据...')
        // 从服务器加载数据
        const warehousesData = await getManagerWarehouses(managerId)
        console.log('[useWarehousesData] 服务器返回仓库数量:', warehousesData.length)
        setWarehouses(warehousesData)

        // 保存到缓存
        saveToCache(warehousesData)

        return warehousesData
      } catch (err) {
        console.error('[useWarehousesData] 加载仓库列表失败:', err)
        setError('加载仓库列表失败')
        return []
      } finally {
        setLoading(false)
      }
    },
    [managerId, loadFromCache, saveToCache]
  )

  // 刷新仓库列表（强制从服务器加载）
  const refresh = useCallback(() => {
    clearCache()
    return loadWarehouses(true)
  }, [clearCache, loadWarehouses])

  // 初始加载
  useEffect(() => {
    if (managerId) {
      loadWarehouses()
    }
  }, [managerId, loadWarehouses])

  // 设置实时订阅
  useEffect(() => {
    if (!enableRealtime || !managerId) {
      return
    }

    console.log('[useWarehousesData] 启用实时订阅，管理员ID:', managerId)

    // 创建实时频道
    const channel = supabase
      .channel(`manager_warehouses_${managerId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件（INSERT, UPDATE, DELETE）
          schema: 'public',
          table: 'manager_warehouses',
          filter: `manager_id=eq.${managerId}` // 只监听当前管理员的变化
        },
        (payload) => {
          console.log('[useWarehousesData] 检测到仓库分配变化:', payload)

          // 显示提示信息
          Taro.showToast({
            title: '仓库分配已更新',
            icon: 'success',
            duration: 2000
          })

          // 自动刷新数据
          setTimeout(() => {
            console.log('[useWarehousesData] 自动刷新仓库列表')
            refresh()
          }, 500) // 延迟500ms，确保数据库操作完成
        }
      )
      .subscribe((status) => {
        console.log('[useWarehousesData] 订阅状态:', status)
      })

    channelRef.current = channel

    // 清理函数
    return () => {
      console.log('[useWarehousesData] 清理实时订阅')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enableRealtime, managerId, refresh])

  return {
    warehouses,
    loading,
    error,
    refresh,
    clearCache
  }
}
