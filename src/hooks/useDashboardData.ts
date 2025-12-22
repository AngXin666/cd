/**
 * 仪表板数据管理 Hook
 *
 * 提供仪表板统计数据的加载和实时更新功能。
 * 缓存由 DashboardRepository 统一管理，Hook 层不再维护独立缓存。
 *
 * @module hooks/useDashboardData
 */

import type {RealtimeChannel} from '@supabase/supabase-js'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import type {DashboardStats} from '@/db/api/dashboard'
import {getWarehouseDashboardStats, invalidateDashboardCache} from '@/db/api/dashboard'

/**
 * useDashboardData Hook 配置选项
 */
interface UseDashboardDataOptions {
  /** 仓库 ID */
  warehouseId: string
  /** 是否启用实时更新，默认 true */
  enableRealtime?: boolean
}

/**
 * 仪表板数据管理 Hook
 *
 * 功能：
 * 1. 加载仓库仪表板统计数据
 * 2. 实时订阅数据变化
 * 3. 缓存由 DashboardRepository 统一管理
 *
 * @param options - Hook 配置选项
 * @returns 仪表板数据和操作方法
 *
 * @example
 * ```typescript
 * const { data, loading, error, refresh } = useDashboardData({
 *   warehouseId: 'warehouse-123',
 *   enableRealtime: true
 * })
 * ```
 */
export function useDashboardData(options: UseDashboardDataOptions) {
  const {warehouseId, enableRealtime = true} = options

  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const loadingRef = useRef(false)

  /**
   * 加载仪表板数据
   * 数据通过 API 层获取，缓存由 DashboardRepository 管理
   */
  const loadData = useCallback(
    async (wid: string) => {
      // 防止重复加载
      if (loadingRef.current) return

      loadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        // 从 API 层加载数据（缓存由 DashboardRepository 管理）
        const stats = await getWarehouseDashboardStats(wid)
        setData(stats)
      } catch (err) {
        console.error('[useDashboardData] 加载仪表板数据失败:', err)
        setError('加载数据失败')
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    []
  )

  // 使用 ref 保存最新的 loadData 函数，避免依赖循环
  const loadDataRef = useRef(loadData)
  useEffect(() => {
    loadDataRef.current = loadData
  }, [loadData])

  /**
   * 清除 Repository 缓存
   */
  const clearRepositoryCache = useCallback(() => {
    invalidateDashboardCache()
  }, [])

  /**
   * 创建稳定的刷新函数
   * 清除 Repository 缓存后重新加载数据
   */
  const refreshStable = useCallback(() => {
    if (warehouseId) {
      clearRepositoryCache()
      loadDataRef.current(warehouseId)
    }
  }, [warehouseId, clearRepositoryCache])

  /**
   * 刷新数据（清除缓存后重新加载）
   * 导出给外部使用
   */
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
          const record = payload.new as Record<string, unknown>
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

  // 使用 useMemo 缓存返回值，避免不必要的重新渲染
  return useMemo(
    () => ({
      data,
      loading,
      error,
      refresh,
      /** 清除 Repository 缓存 */
      clearCache: clearRepositoryCache
    }),
    [data, loading, error, refresh, clearRepositoryCache]
  )
}
