/**
 * 司机仪表板数据管理 Hook
 *
 * 该 Hook 提供司机仪表板的统计数据加载和实时更新功能。
 * 缓存由 Repository 层统一管理，Hook 层不再维护独立缓存。
 *
 * @module hooks/useDriverDashboard
 */

import type {RealtimeChannel} from '@supabase/supabase-js'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import {getDriverAttendanceStats} from '@/db/api/dashboard'
import {getPieceWorkRecordsByUser} from '@/db/api/piecework'
import {getDriverWarehouses} from '@/db/api/warehouses'
import type {Warehouse} from '@/db/types'
// 导入 Repository 用于清除缓存
import {pieceWorkRepository} from '@/db/repositories/PieceWorkRepository'
import {attendanceRepository} from '@/db/repositories/AttendanceRepository'
import {warehousesRepository} from '@/db/repositories/WarehousesRepository'

/**
 * 司机仪表板统计数据接口
 */
export interface DriverDashboardStats {
  /** 今日计件数量 */
  todayPieceCount: number
  /** 今日收入 */
  todayIncome: number
  /** 本月计件数量 */
  monthPieceCount: number
  /** 本月收入 */
  monthIncome: number
  /** 出勤天数 */
  attendanceDays: number
  /** 请假天数 */
  leaveDays: number
}

/**
 * useDriverDashboard Hook 配置选项
 */
interface UseDriverDashboardOptions {
  /** 用户 ID */
  userId: string
  /** 仓库 ID（可选，如果提供则只统计该仓库的数据） */
  warehouseId?: string
  /** 是否启用实时更新，默认 true */
  enableRealtime?: boolean
}

/**
 * 司机仪表板数据管理 Hook
 *
 * 功能：
 * 1. 加载司机的统计数据（今日/本月计件、考勤）
 * 2. 支持按仓库筛选数据
 * 3. 实时订阅数据变化
 * 4. 缓存由 Repository 层统一管理
 *
 * @param options - Hook 配置选项
 * @returns 仪表板数据和操作方法
 *
 * @example
 * ```typescript
 * const { data, loading, error, refresh } = useDriverDashboard({
 *   userId: 'user-123',
 *   warehouseId: 'warehouse-456',
 *   enableRealtime: true
 * })
 * ```
 */
export function useDriverDashboard(options: UseDriverDashboardOptions) {
  const {userId, warehouseId, enableRealtime = true} = options

  const [data, setData] = useState<DriverDashboardStats>({
    todayPieceCount: 0,
    todayIncome: 0,
    monthPieceCount: 0,
    monthIncome: 0,
    attendanceDays: 0,
    leaveDays: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const loadingRef = useRef(false)

  /**
   * 清除相关 Repository 缓存
   * 在刷新数据前调用，确保获取最新数据
   */
  const clearRepositoryCache = useCallback(() => {
    // 清除计件记录缓存（使用公开方法）
    pieceWorkRepository.clearAllCache()
    // 清除考勤记录缓存（使用公开方法）
    attendanceRepository.clearAllCache()
  }, [])

  /**
   * 加载统计数据
   * 数据通过 API 层获取，缓存由 Repository 层统一管理
   */
  const loadStats = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    // 防止重复加载
    if (loadingRef.current) {
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      const today = new Date()
      const year = today.getFullYear()
      const month = today.getMonth() + 1
      const day = today.getDate()

      // 加载计件记录（通过 API 层，缓存由 Repository 管理）
      const pieceWorkRecords = await getPieceWorkRecordsByUser(userId)

      // 过滤仓库（如果指定了仓库ID）
      const filteredRecords = warehouseId
        ? pieceWorkRecords.filter((r) => r.warehouse_id === warehouseId)
        : pieceWorkRecords

      // 计算今日数据
      const todayRecords = filteredRecords.filter((record) => {
        const recordDate = new Date(record.work_date)
        return recordDate.getFullYear() === year && recordDate.getMonth() + 1 === month && recordDate.getDate() === day
      })

      const todayPieceCount = todayRecords.reduce((sum, record) => sum + (record.quantity || 0), 0)
      const todayIncome = todayRecords.reduce((sum, record) => {
        const baseAmount = (record.quantity || 0) * (record.unit_price || 0)
        const upstairsAmount = record.need_upstairs ? (record.quantity || 0) * (record.upstairs_price || 0) : 0
        const sortingAmount = record.need_sorting
          ? (record.sorting_quantity || 0) * (record.sorting_unit_price || 0)
          : 0
        return sum + baseAmount + upstairsAmount + sortingAmount
      }, 0)

      // 计算本月数据
      const monthRecords = filteredRecords.filter((record) => {
        const recordDate = new Date(record.work_date)
        return recordDate.getFullYear() === year && recordDate.getMonth() + 1 === month
      })

      const monthPieceCount = monthRecords.reduce((sum, record) => sum + (record.quantity || 0), 0)
      const monthIncome = monthRecords.reduce((sum, record) => {
        const baseAmount = (record.quantity || 0) * (record.unit_price || 0)
        const upstairsAmount = record.need_upstairs ? (record.quantity || 0) * (record.upstairs_price || 0) : 0
        const sortingAmount = record.need_sorting
          ? (record.sorting_quantity || 0) * (record.sorting_unit_price || 0)
          : 0
        return sum + baseAmount + upstairsAmount + sortingAmount
      }, 0)

      // 计算本月的开始和结束日期
      const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0)
      const lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`

      // 加载考勤统计（通过 API 层，缓存由 Repository 管理）
      const attendanceStats = await getDriverAttendanceStats(userId, firstDay, lastDayStr)

      const stats: DriverDashboardStats = {
        todayPieceCount,
        todayIncome,
        monthPieceCount,
        monthIncome,
        attendanceDays: attendanceStats.attendanceDays,
        leaveDays: attendanceStats.leaveDays
      }

      setData(stats)
    } catch (err) {
      console.error('[useDriverDashboard] 加载统计数据失败:', err)
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [userId, warehouseId])

  // 使用 ref 保存最新的 loadStats 函数，避免依赖循环
  const loadStatsRef = useRef(loadStats)
  useEffect(() => {
    loadStatsRef.current = loadStats
  }, [loadStats])

  /**
   * 创建稳定的刷新函数
   * 清除 Repository 缓存后重新加载数据
   */
  const refreshStable = useCallback(() => {
    clearRepositoryCache()
    // 使用 ref 中的最新函数，避免依赖循环
    loadStatsRef.current()
  }, [clearRepositoryCache])

  /**
   * 刷新数据（清除缓存后重新加载）
   * 导出给外部使用
   */
  const refresh = useCallback(() => {
    refreshStable()
  }, [refreshStable])

  // 初始加载
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // 设置实时订阅
  useEffect(() => {
    if (!enableRealtime || !userId) return

    // 创建订阅频道
    const channel = supabase.channel(`driver_dashboard_${userId}_${warehouseId || 'all'}`)

    // 订阅计件记录变化
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'piece_work_records',
        filter: `user_id=eq.${userId}`
      },
      (_payload) => {
        refreshStable()
      }
    )

    // 订阅考勤记录变化
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance',
        filter: `user_id=eq.${userId}`
      },
      (_payload) => {
        refreshStable()
      }
    )

    // 订阅请假申请变化
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leave_applications',
        filter: `user_id=eq.${userId}`
      },
      (_payload) => {
        refreshStable()
      }
    )

    channel.subscribe()
    channelRef.current = channel

    // 清理订阅
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enableRealtime, userId, warehouseId, refreshStable])

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

/**
 * useDriverWarehouses Hook 配置选项
 */
interface UseDriverWarehousesOptions {
  /** 用户 ID */
  userId: string
}

/**
 * 司机仓库列表管理 Hook
 *
 * 功能：
 * 1. 加载司机的仓库列表
 * 2. 缓存由 Repository 层统一管理
 * 3. 实时订阅仓库分配变化
 *
 * @param userId - 用户 ID
 * @returns 仓库列表数据和操作方法
 *
 * @example
 * ```typescript
 * const { warehouses, loading, error, refresh } = useDriverWarehouses('user-123')
 * ```
 */
export function useDriverWarehouses(userId: string) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadingRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  /**
   * 清除仓库相关 Repository 缓存
   */
  const clearRepositoryCache = useCallback(() => {
    warehousesRepository.invalidateCache()
  }, [])

  /**
   * 加载仓库列表
   * 数据通过 API 层获取，缓存由 Repository 层统一管理
   */
  const loadWarehouses = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    // 防止重复加载
    if (loadingRef.current) {
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      // 通过 API 层获取数据（缓存由 Repository 管理）
      const data = await getDriverWarehouses(userId)

      setWarehouses(data)
    } catch (err) {
      console.error('[useDriverWarehouses] 加载仓库列表失败:', err)
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [userId])

  /**
   * 刷新数据（清除缓存后重新加载）
   */
  const refresh = useCallback(() => {
    clearRepositoryCache()
    loadWarehouses()
  }, [clearRepositoryCache, loadWarehouses])

  // 初始加载
  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  // 实时订阅仓库分配变化
  useEffect(() => {
    if (!userId) return

    // 创建实时订阅频道
    const channel = supabase
      .channel(`warehouse_assignments_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件（INSERT, UPDATE, DELETE）
          schema: 'public',
          table: 'warehouse_assignments',
          filter: `user_id=eq.${userId}`
        },
        (_payload) => {
          // 清除 Repository 缓存并重新加载数据
          clearRepositoryCache()
          loadWarehouses()
        }
      )
      .subscribe((_status) => {})

    channelRef.current = channel

    // 清理函数：取消订阅
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, clearRepositoryCache, loadWarehouses])

  return {
    warehouses,
    loading,
    error,
    refresh,
    /** 清除 Repository 缓存 */
    clearCache: clearRepositoryCache
  }
}
