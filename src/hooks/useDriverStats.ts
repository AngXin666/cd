/**
 * 司机统计数据 Hook
 *
 * 提供司机统计数据的获取和管理功能，包括：
 * - 总司机数
 * - 在线司机数（今日已打卡）
 * - 已计件司机数（今日有计件记录）
 * - 未计件司机数
 *
 * 支持按仓库过滤、实时更新和缓存
 *
 * @module hooks/useDriverStats
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/client/supabase'
import {
  usersRepository,
  warehouseAssignmentsRepository,
  attendanceRepository,
  pieceWorkRepository
} from '@/db/repositories'

/**
 * 司机统计数据接口
 */
export interface DriverStats {
  /** 总司机数 */
  totalDrivers: number
  /** 在线司机数（今日已打卡） */
  onlineDrivers: number
  /** 已计件司机数（今日有计件记录） */
  busyDrivers: number
  /** 未计件司机数 */
  idleDrivers: number
}

/**
 * Hook 配置选项
 */
interface UseDriverStatsOptions {
  /** 仓库ID，不传则统计所有仓库 */
  warehouseId?: string
  /** 是否启用实时更新 */
  enableRealtime?: boolean
}

/**
 * 缓存管理
 * 使用 Map 存储缓存数据和时间戳
 */
const cache = new Map<string, { data: DriverStats; timestamp: number }>()

/**
 * 缓存有效期：30 秒
 */
const CACHE_DURATION = 30000

/**
 * 获取缓存键
 *
 * @param warehouseId - 仓库 ID（可选）
 * @returns 缓存键字符串
 */
const getCacheKey = (warehouseId?: string): string => {
  return warehouseId ? `driver-stats-${warehouseId}` : 'driver-stats-all'
}

/**
 * 司机统计数据管理 Hook
 *
 * 支持按仓库过滤、实时更新和缓存。
 * 使用 Repository 模式访问数据，享受统一的缓存管理。
 *
 * @param options - Hook 配置选项
 * @returns 司机统计数据、加载状态、错误信息和刷新函数
 *
 * @example
 * ```typescript
 * // 获取所有仓库的司机统计
 * const { data, loading, error, refresh } = useDriverStats()
 *
 * // 获取指定仓库的司机统计
 * const { data } = useDriverStats({ warehouseId: 'warehouse-123' })
 *
 * // 启用实时更新
 * const { data } = useDriverStats({ enableRealtime: true })
 * ```
 */
export const useDriverStats = (options: UseDriverStatsOptions = {}) => {
  const { warehouseId, enableRealtime = false } = options

  const [data, setData] = useState<DriverStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * 获取司机统计数据
   *
   * 使用 Repository 模式访问数据：
   * - 通过 warehouseAssignmentsRepository 获取仓库分配
   * - 通过 usersRepository 获取司机角色
   * - 通过 attendanceRepository 获取考勤记录
   * - 通过 pieceWorkRepository 获取计件记录
   *
   * @returns 司机统计数据，如果失败则返回 null
   */
  const fetchDriverStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 检查本地缓存（聚合查询的短期缓存，30秒）
      const cacheKey = getCacheKey(warehouseId)
      const cached = cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data)
        setLoading(false)
        return cached.data
      }

      // 获取今日日期
      const today = new Date().toISOString().split('T')[0]

      // 1. 获取司机 ID 列表
      let driverIds: string[] = []

      if (warehouseId) {
        // 如果指定了仓库，通过 warehouseAssignmentsRepository 获取仓库分配的用户
        const assignedUsers = await warehouseAssignmentsRepository.getByWarehouse(warehouseId)

        if (assignedUsers && assignedUsers.length > 0) {
          const userIds = assignedUsers.map((a) => a.user_id)

          // 通过 usersRepository 获取这些用户中角色为 DRIVER 的用户
          const drivers = await usersRepository.getByRole('DRIVER')
          const driverIdSet = new Set(drivers.map((d) => d.id))

          // 过滤出既在仓库分配中又是司机角色的用户
          driverIds = userIds.filter((id) => driverIdSet.has(id))
        }

        // 如果该仓库没有分配司机，返回空统计
        if (driverIds.length === 0) {
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
      } else {
        // 获取所有司机 ID（通过 usersRepository）
        const allDrivers = await usersRepository.getByRole('DRIVER')
        driverIds = allDrivers.map((d) => d.id)
      }

      const totalDrivers = driverIds.length

      // 2. 获取今日已打卡的司机数（在线司机）
      // 注意：attendanceRepository 的查询方法不支持按用户 ID 列表过滤
      // 需要直接查询数据库，但使用 Repository 的缓存失效机制
      let onlineDriversQuery = supabase
        .from('attendance')
        .select('user_id', { count: 'exact', head: false })
        .gte('clock_in_time', `${today}T00:00:00`)
        .lte('clock_in_time', `${today}T23:59:59`)
        .in('user_id', driverIds)

      if (warehouseId) {
        onlineDriversQuery = onlineDriversQuery.eq('warehouse_id', warehouseId)
      }

      const { data: onlineDriversData, error: onlineError } = await onlineDriversQuery
      if (onlineError) throw onlineError

      // 去重统计在线司机数
      const uniqueOnlineDrivers = new Set(onlineDriversData?.map((r) => r.user_id) || [])
      const onlineDrivers = uniqueOnlineDrivers.size

      // 3. 获取今日有计件记录的司机数（已计件司机）
      let busyDriversQuery = supabase
        .from('piece_work_records')
        .select('user_id', { count: 'exact', head: false })
        .gte('work_date', today)
        .lte('work_date', today)
        .in('user_id', driverIds)

      if (warehouseId) {
        busyDriversQuery = busyDriversQuery.eq('warehouse_id', warehouseId)
      }

      const { data: busyDriversData, error: busyError } = await busyDriversQuery
      if (busyError) throw busyError

      // 去重统计已计件司机数
      const uniqueBusyDrivers = new Set(busyDriversData?.map((r) => r.user_id) || [])
      const busyDrivers = uniqueBusyDrivers.size

      // 4. 计算未计件司机数（在线但没有计件记录）
      const idleDrivers = Math.max(0, onlineDrivers - busyDrivers)

      const stats: DriverStats = {
        totalDrivers,
        onlineDrivers,
        busyDrivers,
        idleDrivers
      }

      // 更新本地缓存（聚合查询的短期缓存）
      // 注意：cacheKey 已在函数开头声明，这里直接使用
      cache.set(cacheKey, { data: stats, timestamp: Date.now() })

      setData(stats)
      setLoading(false)
      return stats
    } catch (err) {
      console.error('[useDriverStats] 获取司机统计数据失败:', err)
      setError(err instanceof Error ? err.message : '获取数据失败')
      setLoading(false)
      return null
    }
  }, [warehouseId])

  /**
   * 刷新数据（强制重新获取，忽略缓存）
   *
   * @returns 刷新后的司机统计数据
   */
  const refresh = useCallback(async () => {
    // 清除本地缓存
    const cacheKey = getCacheKey(warehouseId)
    cache.delete(cacheKey)
    return await fetchDriverStats()
  }, [fetchDriverStats, warehouseId])

  /**
   * 初始加载数据
   */
  useEffect(() => {
    fetchDriverStats()
  }, [fetchDriverStats])

  /**
   * 实时更新监听
   *
   * 监听以下表的变更：
   * - attendance：考勤记录变化
   * - piece_work_records：计件记录变化
   * - warehouse_assignments：仓库分配变化
   * - users：用户角色变化
   */
  useEffect(() => {
    if (!enableRealtime) return

    // 监听考勤记录变化
    const attendanceChannel = supabase
      .channel('driver-stats-attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance'
        },
        (_payload) => {
          // 清除本地缓存并重新获取数据
          cache.clear()
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
        (_payload) => {
          cache.clear()
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
          table: 'warehouse_assignments'
        },
        (_payload) => {
          cache.clear()
          fetchDriverStats()
        }
      )
      .subscribe()

    // 监听用户角色变化
    const roleChannel = supabase
      .channel('driver-stats-role')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        (_payload) => {
          cache.clear()
          fetchDriverStats()
        }
      )
      .subscribe()

    // 清理订阅
    return () => {
      supabase.removeChannel(attendanceChannel)
      supabase.removeChannel(pieceWorkChannel)
      supabase.removeChannel(assignmentChannel)
      supabase.removeChannel(roleChannel)
    }
  }, [enableRealtime, fetchDriverStats])

  // 性能优化：使用 useMemo 缓存返回值，避免每次渲染创建新对象
  return useMemo(
    () => ({
      data,
      loading,
      error,
      refresh
    }),
    [data, loading, error, refresh]
  )
}
