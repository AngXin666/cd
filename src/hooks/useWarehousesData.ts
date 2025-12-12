import type {RealtimeChannel} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import { getManagerWarehouses } from '@/db/api/warehouses'
import type {Warehouse} from '@/db/types'

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
      const cached = getStorageSync(WAREHOUSES_CACHE_KEY) as CachedWarehouses | null

      if (cached && cached.managerId === managerId) {
        const now = Date.now()
        // 检查缓存是否过期
        if (now - cached.timestamp < CACHE_EXPIRY_MS) {
          return cached.data
        }
        // 缓存过期，删除
        removeStorageSync(WAREHOUSES_CACHE_KEY)
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
        setStorageSync(WAREHOUSES_CACHE_KEY, cacheData)
      } catch (err) {
        console.error('保存仓库缓存失败:', err)
      }
    },
    [managerId, cacheEnabled]
  )

  // 清除缓存
  const clearCache = useCallback(() => {
    try {
      removeStorageSync(WAREHOUSES_CACHE_KEY)
    } catch (err) {
      console.error('清除仓库缓存失败:', err)
    }
  }, [])

  // 加载仓库列表
  const loadWarehouses = useCallback(
    async (forceRefresh = false) => {
      setLoading(true)
      setError(null)

      try {
        // 如果不是强制刷新，先尝试从缓存读取
        if (!forceRefresh) {
          const cachedData = loadFromCache()
          if (cachedData) {
            setWarehouses(cachedData)
            setLoading(false)
            return cachedData
          }
        }

        // 从服务器加载数据
        const warehousesData = await getManagerWarehouses(managerId)
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

    // 创建实时频道
    const channel = supabase
      .channel(`warehouse_assignments_${managerId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件（INSERT, UPDATE, DELETE）
          schema: 'public',
          table: 'warehouse_assignments',
          filter: `user_id=eq.${managerId}` // 只监听当前管理员的变化
        },
        (_payload) => {
          // 显示提示信息
          Taro.showToast({
            title: '仓库分配已更新',
            icon: 'success',
            duration: 2000
          })

          // 自动刷新数据
          setTimeout(() => {
            refresh()
          }, 500) // 延迟500ms，确保数据库操作完成
        }
      )
      .subscribe((_status) => {})

    channelRef.current = channel

    // 清理函数
    return () => {
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
