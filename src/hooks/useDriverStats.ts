import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'

/**
 * 司机统计数据接口
 */
export interface DriverStats {
  totalDrivers: number // 总司机数
  onlineDrivers: number // 在线司机数（今日已打卡）
  busyDrivers: number // 已计件司机数（今日有计件记录）
  idleDrivers: number // 未计件司机数
}

/**
 * Hook 配置选项
 */
interface UseDriverStatsOptions {
  warehouseId?: string // 仓库ID，不传则统计所有仓库
  enableRealtime?: boolean // 是否启用实时更新
  cacheEnabled?: boolean // 是否启用缓存
}

/**
 * 缓存管理
 */
const cache = new Map<string, {data: DriverStats; timestamp: number}>()
const CACHE_DURATION = 30000 // 缓存30秒

/**
 * 获取缓存键
 */
const getCacheKey = (warehouseId?: string): string => {
  return warehouseId ? `driver-stats-${warehouseId}` : 'driver-stats-all'
}

/**
 * 司机统计数据管理 Hook
 * 支持按仓库过滤、实时更新和缓存
 */
export const useDriverStats = (options: UseDriverStatsOptions = {}) => {
  const {warehouseId, enableRealtime = false, cacheEnabled = true} = options

  const [data, setData] = useState<DriverStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * 获取司机统计数据
   */
  const fetchDriverStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 检查缓存
      if (cacheEnabled) {
        const cacheKey = getCacheKey(warehouseId)
        const cached = cache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log('[useDriverStats] 使用缓存数据:', cacheKey)
          setData(cached.data)
          setLoading(false)
          return cached.data
        }
      }

      const today = new Date().toISOString().split('T')[0]

      // 1. 获取总司机数（按仓库过滤）
      let totalDriversQuery = supabase.from('profiles').select('id', {count: 'exact', head: true}).eq('role', 'driver')

      if (warehouseId) {
        // 如果指定了仓库，需要通过 driver_warehouses 表过滤
        const {data: assignedDrivers} = await supabase
          .from('driver_warehouses')
          .select('driver_id')
          .eq('warehouse_id', warehouseId)

        const driverIds = assignedDrivers?.map((a) => a.driver_id) || []
        if (driverIds.length === 0) {
          // 该仓库没有分配司机
          const emptyStats: DriverStats = {
            totalDrivers: 0,
            onlineDrivers: 0,
            busyDrivers: 0,
            idleDrivers: 0
          }
          setData(emptyStats)
          setLoading(false)
          return emptyStats
        }
        totalDriversQuery = totalDriversQuery.in('id', driverIds)
      }

      const {count: totalDrivers, error: totalError} = await totalDriversQuery
      if (totalError) throw totalError

      // 2. 获取今日已打卡的司机数（在线司机）
      let onlineDriversQuery = supabase
        .from('attendance_records')
        .select('user_id', {count: 'exact', head: false})
        .gte('clock_in_time', `${today}T00:00:00`)
        .lte('clock_in_time', `${today}T23:59:59`)

      if (warehouseId) {
        onlineDriversQuery = onlineDriversQuery.eq('warehouse_id', warehouseId)
      }

      const {data: onlineDriversData, error: onlineError} = await onlineDriversQuery
      if (onlineError) throw onlineError

      // 去重统计在线司机数
      const uniqueOnlineDrivers = new Set(onlineDriversData?.map((r) => r.user_id) || [])
      const onlineDrivers = uniqueOnlineDrivers.size

      // 3. 获取今日有计件记录的司机数（已计件司机）
      let busyDriversQuery = supabase
        .from('piece_work_records')
        .select('driver_id', {count: 'exact', head: false})
        .gte('work_date', today)
        .lte('work_date', today)

      if (warehouseId) {
        busyDriversQuery = busyDriversQuery.eq('warehouse_id', warehouseId)
      }

      const {data: busyDriversData, error: busyError} = await busyDriversQuery
      if (busyError) throw busyError

      // 去重统计已计件司机数
      const uniqueBusyDrivers = new Set(busyDriversData?.map((r) => r.driver_id) || [])
      const busyDrivers = uniqueBusyDrivers.size

      // 4. 计算未计件司机数（在线但没有计件记录）
      const idleDrivers = Math.max(0, onlineDrivers - busyDrivers)

      const stats: DriverStats = {
        totalDrivers: totalDrivers || 0,
        onlineDrivers,
        busyDrivers,
        idleDrivers
      }

      // 更新缓存
      if (cacheEnabled) {
        const cacheKey = getCacheKey(warehouseId)
        cache.set(cacheKey, {data: stats, timestamp: Date.now()})
        console.log('[useDriverStats] 更新缓存:', cacheKey, stats)
      }

      setData(stats)
      setLoading(false)
      return stats
    } catch (err) {
      console.error('[useDriverStats] 获取司机统计数据失败:', err)
      setError(err instanceof Error ? err.message : '获取数据失败')
      setLoading(false)
      return null
    }
  }, [warehouseId, cacheEnabled])

  /**
   * 刷新数据（强制重新获取，忽略缓存）
   */
  const refresh = useCallback(async () => {
    // 清除缓存
    if (cacheEnabled) {
      const cacheKey = getCacheKey(warehouseId)
      cache.delete(cacheKey)
      console.log('[useDriverStats] 清除缓存:', cacheKey)
    }
    return await fetchDriverStats()
  }, [fetchDriverStats, warehouseId, cacheEnabled])

  /**
   * 初始加载数据
   */
  useEffect(() => {
    fetchDriverStats()
  }, [fetchDriverStats])

  /**
   * 实时更新监听
   */
  useEffect(() => {
    if (!enableRealtime) return

    console.log('[useDriverStats] 启用实时更新监听')

    // 监听考勤记录变化
    const attendanceChannel = supabase
      .channel('driver-stats-attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records'
        },
        (payload) => {
          console.log('[useDriverStats] 考勤记录变化:', payload)
          // 清除缓存并重新获取数据
          if (cacheEnabled) {
            cache.clear()
          }
          fetchDriverStats()
        }
      )
      .subscribe()

    // 监听计件记录变化
    const pieceWorkChannel = supabase
      .channel('driver-stats-piece-work')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'piece_work_records'
        },
        (payload) => {
          console.log('[useDriverStats] 计件记录变化:', payload)
          // 清除缓存并重新获取数据
          if (cacheEnabled) {
            cache.clear()
          }
          fetchDriverStats()
        }
      )
      .subscribe()

    // 监听司机分配变化
    const assignmentChannel = supabase
      .channel('driver-stats-assignment')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_warehouses'
        },
        (payload) => {
          console.log('[useDriverStats] 司机分配变化:', payload)
          // 清除缓存并重新获取数据
          if (cacheEnabled) {
            cache.clear()
          }
          fetchDriverStats()
        }
      )
      .subscribe()

    // 监听用户角色变化
    const profileChannel = supabase
      .channel('driver-stats-profile')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.driver'
        },
        (payload) => {
          console.log('[useDriverStats] 司机信息变化:', payload)
          // 清除缓存并重新获取数据
          if (cacheEnabled) {
            cache.clear()
          }
          fetchDriverStats()
        }
      )
      .subscribe()

    return () => {
      console.log('[useDriverStats] 取消实时更新监听')
      supabase.removeChannel(attendanceChannel)
      supabase.removeChannel(pieceWorkChannel)
      supabase.removeChannel(assignmentChannel)
      supabase.removeChannel(profileChannel)
    }
  }, [enableRealtime, fetchDriverStats, cacheEnabled])

  return {
    data,
    loading,
    error,
    refresh
  }
}
