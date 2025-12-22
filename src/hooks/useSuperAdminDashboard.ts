/**
 * 老板仪表板数据管理 Hook
 *
 * 提供老板（超级管理员）仪表板统计数据的加载和实时更新功能。
 * 支持查看所有仓库汇总或单个仓库数据。
 * 缓存由 DashboardRepository 统一管理，Hook 层不再维护独立缓存。
 *
 * @module hooks/useSuperAdminDashboard
 */

import type {RealtimeChannel} from '@supabase/supabase-js'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import type {DashboardStats} from '@/db/api/dashboard'
import {getAllWarehousesDashboardStats, getWarehouseDashboardStats, invalidateDashboardCache} from '@/db/api/dashboard'

/**
 * useSuperAdminDashboard Hook 配置选项
 */
interface UseSuperAdminDashboardOptions {
  /** 仓库 ID（可选，如果提供则加载指定仓库；否则加载所有仓库汇总） */
  warehouseId?: string
  /** 是否启用实时更新，默认 true */
  enableRealtime?: boolean
}

/**
 * 老板仪表板数据管理 Hook
 *
 * 功能：
 * 1. 加载所有仓库汇总或单个仓库的统计数据
 * 2. 实时订阅数据变化
 * 3. 缓存由 DashboardRepository 统一管理
 *
 * @param options - Hook 配置选项
 * @returns 仪表板数据和操作方法
 *
 * @example
 * ```typescript
 * // 加载所有仓库汇总
 * const { data, loading, error, refresh } = useSuperAdminDashboard({
 *   enableRealtime: true
 * })
 *
 * // 加载指定仓库
 * const { data, loading, error, refresh } = useSuperAdminDashboard({
 *   warehouseId: 'warehouse-123',
 *   enableRealtime: true
 * })
 * ```
 */
export function useSuperAdminDashboard(options: UseSuperAdminDashboardOptions) {
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
    async (wid?: string) => {
      if (loadingRef.current) {
        return
      }

      loadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        // 从 API 层加载数据（缓存由 DashboardRepository 管理）
        const stats = wid ? await getWarehouseDashboardStats(wid) : await getAllWarehousesDashboardStats()
        setData(stats)
      } catch (err) {
        console.error('[useSuperAdminDashboard] 加载仪表板数据失败:', err)
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
    clearRepositoryCache()
    loadDataRef.current(warehouseId)
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
