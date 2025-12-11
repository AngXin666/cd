import type {RealtimeChannel} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import {getDriverAttendanceStats, getDriverWarehouses, getPieceWorkRecordsByUser} from '@/db/api'
import type {Warehouse} from '@/db/types'

// 司机仪表板统计数据
export interface DriverDashboardStats {
  todayPieceCount: number
  todayIncome: number
  monthPieceCount: number
  monthIncome: number
  attendanceDays: number
  leaveDays: number
}

// 缓存配置
const CACHE_KEY_PREFIX = 'driver_dashboard_'
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5分钟

interface CachedData {
  data: DriverDashboardStats
  timestamp: number
  warehouseId: string
}

interface UseDriverDashboardOptions {
  userId: string
  warehouseId?: string // 可选，如果提供则只统计该仓库的数据
  enableRealtime?: boolean // 是否启用实时更新
  cacheEnabled?: boolean // 是否启用缓存
}

/**
 * 司机仪表板数据管理 Hook
 *
 * 功能：
 * 1. 加载司机的统计数据（今日/本月计件、考勤）
 * 2. 支持按仓库筛选数据
 * 3. 实时订阅数据变化
 * 4. 智能缓存机制
 */
export function useDriverDashboard(options: UseDriverDashboardOptions) {
  const {userId, warehouseId, enableRealtime = true, cacheEnabled = true} = options

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

  // 生成缓存键（包含 userId 避免不同用户缓存冲突）
  const getCacheKey = useCallback(() => {
    return `${CACHE_KEY_PREFIX}${userId}_${warehouseId || 'all'}`
  }, [userId, warehouseId])

  // 读取缓存
  const readCache = useCallback((): DriverDashboardStats | null => {
    if (!cacheEnabled) return null

    try {
      const cacheKey = getCacheKey()
      const cached = Taro.getStorageSync<CachedData>(cacheKey)
      if (cached?.data) {
        const age = Date.now() - cached.timestamp
        if (age < CACHE_EXPIRY_MS) {
          return cached.data
        }
      }
    } catch (err) {
      console.error('[useDriverDashboard] 读取缓存失败:', err)
    }
    return null
  }, [cacheEnabled, getCacheKey])

  // 写入缓存
  const writeCache = useCallback(
    (stats: DriverDashboardStats) => {
      if (!cacheEnabled) return

      try {
        const cacheKey = getCacheKey()
        const cacheData: CachedData = {
          data: stats,
          timestamp: Date.now(),
          warehouseId: warehouseId || 'all'
        }
        Taro.setStorageSync(cacheKey, cacheData)
      } catch (err) {
        console.error('[useDriverDashboard] 写入缓存失败:', err)
      }
    },
    [cacheEnabled, getCacheKey, warehouseId]
  )

  // 清除缓存
  const clearCache = useCallback(() => {
    try {
      const cacheKey = getCacheKey()
      Taro.removeStorageSync(cacheKey)
    } catch (err) {
      console.error('[useDriverDashboard] 清除缓存失败:', err)
    }
  }, [getCacheKey])

  // 加载统计数据
  const loadStats = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    // 防止重复加载
    if (loadingRef.current) {
      return
    }

    // 先尝试使用缓存
    const cachedData = readCache()
    if (cachedData) {
      setData(cachedData)
      setLoading(false)
      setError(null)
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

      // 加载计件记录
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

      // 加载考勤统计
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
      writeCache(stats)
    } catch (err) {
      console.error('[useDriverDashboard] 加载统计数据失败:', err)
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [userId, warehouseId, readCache, writeCache])

  // 使用 ref 保存最新的 loadStats 函数，避免依赖循环
  const loadStatsRef = useRef(loadStats)
  useEffect(() => {
    loadStatsRef.current = loadStats
  }, [loadStats])

  // 创建稳定的刷新函数，不依赖 loadStats
  const refreshStable = useCallback(() => {
    clearCache()
    // 使用 ref 中的最新函数，避免依赖循环
    loadStatsRef.current()
  }, [clearCache])

  // 刷新数据（清除缓存后重新加载）- 导出给外部使用
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

  return {
    data,
    loading,
    error,
    refresh,
    clearCache
  }
}

/**
 * 司机仓库列表管理 Hook
 *
 * 功能：
 * 1. 加载司机的仓库列表
 * 2. 智能缓存机制
 */
export function useDriverWarehouses(userId: string, cacheEnabled = true) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadingRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const CACHE_KEY = `driver_warehouses_${userId}`
  const CACHE_EXPIRY_MS = 1 * 60 * 1000 // 1分钟（从10分钟缩短到1分钟以满足实时同步需求）

  // 读取缓存
  const readCache = useCallback((): Warehouse[] | null => {
    if (!cacheEnabled) return null

    try {
      const cached = Taro.getStorageSync<{data: Warehouse[]; timestamp: number}>(CACHE_KEY)
      if (cached?.data) {
        const age = Date.now() - cached.timestamp
        if (age < CACHE_EXPIRY_MS) {
          return cached.data
        }
      }
    } catch (err) {
      console.error('[useDriverWarehouses] 读取缓存失败:', err)
    }
    return null
  }, [cacheEnabled, CACHE_KEY])

  // 写入缓存
  const writeCache = useCallback(
    (data: Warehouse[]) => {
      if (!cacheEnabled) return

      try {
        Taro.setStorageSync(CACHE_KEY, {
          data,
          timestamp: Date.now()
        })
      } catch (err) {
        console.error('[useDriverWarehouses] 写入缓存失败:', err)
      }
    },
    [cacheEnabled, CACHE_KEY]
  )

  // 清除缓存
  const clearCache = useCallback(() => {
    try {
      Taro.removeStorageSync(CACHE_KEY)
    } catch (err) {
      console.error('[useDriverWarehouses] 清除缓存失败:', err)
    }
  }, [CACHE_KEY])

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    // 防止重复加载
    if (loadingRef.current) {
      return
    }

    // 先尝试使用缓存
    const cachedData = readCache()
    if (cachedData) {
      setWarehouses(cachedData)
      setLoading(false)
      setError(null)
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      const data = await getDriverWarehouses(userId)

      setWarehouses(data)
      writeCache(data)
    } catch (err) {
      console.error('[useDriverWarehouses] 加载仓库列表失败:', err)
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [userId, readCache, writeCache])

  // 刷新数据
  const refresh = useCallback(() => {
    clearCache()
    loadWarehouses()
  }, [clearCache, loadWarehouses])

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
          // 清除缓存并重新加载数据
          clearCache()
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
  }, [userId, clearCache, loadWarehouses])

  return {
    warehouses,
    loading,
    error,
    refresh,
    clearCache
  }
}
