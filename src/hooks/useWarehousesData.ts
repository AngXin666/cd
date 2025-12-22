/**
 * 仓库列表数据管理 Hook
 *
 * 提供管理员仓库列表的加载和实时更新功能。
 * 缓存由 WarehousesRepository 统一管理，Hook 层不再维护独立缓存。
 *
 * @module hooks/useWarehousesData
 */

import type {RealtimeChannel} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import {getManagerWarehouses} from '@/db/api/warehouses'
import type {Warehouse} from '@/db/types'
// 导入 Repository 用于缓存管理
import {warehousesRepository} from '@/db/repositories/WarehousesRepository'

/**
 * useWarehousesData Hook 配置选项
 */
interface UseWarehousesDataOptions {
  /** 管理员用户 ID */
  managerId: string
  /** 是否启用实时更新，默认 false */
  enableRealtime?: boolean
}

/**
 * 仓库列表数据管理 Hook
 *
 * 功能：
 * 1. 加载管理员的仓库列表
 * 2. 实时订阅仓库分配变化
 * 3. 缓存由 WarehousesRepository 统一管理
 *
 * @param options - Hook 配置选项
 * @returns 仓库列表数据和操作方法
 *
 * @example
 * ```typescript
 * const { warehouses, loading, error, refresh } = useWarehousesData({
 *   managerId: 'manager-123',
 *   enableRealtime: true
 * })
 * ```
 */
export function useWarehousesData(options: UseWarehousesDataOptions) {
  const {managerId, enableRealtime = false} = options

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  /**
   * 清除 Repository 缓存
   */
  const clearRepositoryCache = useCallback(() => {
    warehousesRepository.invalidateCache()
  }, [])

  /**
   * 加载仓库列表
   * 数据通过 API 层获取，缓存由 WarehousesRepository 管理
   */
  const loadWarehouses = useCallback(
    async () => {
      setLoading(true)
      setError(null)

      try {
        // 从 API 层加载数据（缓存由 WarehousesRepository 管理）
        const warehousesData = await getManagerWarehouses(managerId)
        setWarehouses(warehousesData)

        return warehousesData
      } catch (err) {
        console.error('[useWarehousesData] 加载仓库列表失败:', err)
        setError('加载仓库列表失败')
        return []
      } finally {
        setLoading(false)
      }
    },
    [managerId]
  )

  /**
   * 刷新仓库列表（清除缓存后重新加载）
   */
  const refresh = useCallback(() => {
    clearRepositoryCache()
    return loadWarehouses()
  }, [clearRepositoryCache, loadWarehouses])

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
    /** 清除 Repository 缓存 */
    clearCache: clearRepositoryCache
  }
}
