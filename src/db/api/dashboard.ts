/**
 * 仪表盘统计 API
 *
 * 功能包括：
 * - 仓库统计数据（带缓存，TTL 2 分钟）
 * - 全局统计数据（带缓存，TTL 2 分钟）
 * - 驾驶员统计
 * - 考勤统计
 * - 请假统计
 *
 * 注意：getWarehouseDashboardStats 和 getAllWarehousesDashboardStats
 * 已迁移到 DashboardRepository，内部调用 Repository 方法实现缓存
 *
 * @module db/api/dashboard
 */

import {supabase} from '@/client/supabase'
import type {DashboardStats, LeaveApplication, WarehouseDataVolume} from '../types'
// 从统一工具模块导入日期函数，避免重复定义
import {getLocalDateString} from '@/utils/date'
// 导入 DashboardRepository 实现缓存功能
import {dashboardRepository} from '../repositories/DashboardRepository'

// 重新导出类型供外部使用
export type {DashboardStats, WarehouseDataVolume}

/**
 * 获取用户今日已批准的请假申请
 * @param userId 用户ID
 * @returns 请假申请或null
 */
export async function getApprovedLeaveForToday(userId: string): Promise<LeaveApplication | null> {
  try {
    const today = getLocalDateString()

    // 注意：使用 user_id 而不是 id，id 是请假申请的主键，user_id 才是申请人
    const {data, error} = await supabase
      .from('leave_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[getApprovedLeaveForToday] 查询失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('[getApprovedLeaveForToday] 未预期的错误:', error)
    return null
  }
}

/**
 * 获取仓库仪表盘统计数据（带缓存，TTL 2 分钟）
 *
 * 内部调用 DashboardRepository 实现缓存功能，
 * 保持原有函数签名不变，确保向后兼容。
 *
 * @param warehouseId 仓库ID
 * @returns 仪表盘统计数据
 */
export async function getWarehouseDashboardStats(warehouseId: string): Promise<DashboardStats> {
  // 委托给 DashboardRepository 处理（带缓存）
  return dashboardRepository.getWarehouseStats(warehouseId)
}

/**
 * 获取所有仓库的汇总统计数据（老板使用，带缓存，TTL 2 分钟）
 *
 * 内部调用 DashboardRepository 实现缓存功能，
 * 保持原有函数签名不变，确保向后兼容。
 *
 * @returns 汇总统计数据
 */
export async function getAllWarehousesDashboardStats(): Promise<DashboardStats> {
  // 委托给 DashboardRepository 处理（带缓存）
  return dashboardRepository.getAllWarehousesStats()
}

/**
 * 清除仪表盘缓存
 *
 * 在以下场景调用此函数确保数据实时性：
 * - 考勤打卡后
 * - 计件记录提交后
 * - 请假/离职申请状态变更后
 * - 车辆审核状态变更后
 */
export function invalidateDashboardCache(): void {
  dashboardRepository.invalidateCache()
}

/**
 * 获取仓库的数据量统计
 * @param warehouseId 仓库ID
 * @param userId 用户ID（可选）
 * @returns 数据量统计
 */
export async function getWarehouseDataVolume(
  warehouseId: string,
  userId?: string
): Promise<WarehouseDataVolume | null> {
  try {
    const {data: warehouse, error: warehouseError} = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('id', warehouseId)
      .maybeSingle()

    if (warehouseError || !warehouse) {
      console.error('获取仓库信息失败:', warehouseError)
      return null
    }

    const today = getLocalDateString()
    const now = new Date()
    const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    let todayPieceQuery = supabase
      .from('piece_work_records')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .eq('work_date', today)

    // 注意：使用 user_id 而不是 id，id 是记录的主键，user_id 才是用户ID
    if (userId) {
      todayPieceQuery = todayPieceQuery.eq('user_id', userId)
    }
    const {count: todayPieceCount} = await todayPieceQuery

    let monthPieceQuery = supabase
      .from('piece_work_records')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .gte('work_date', firstDayOfMonth)

    if (userId) {
      monthPieceQuery = monthPieceQuery.eq('user_id', userId)
    }
    const {count: monthPieceCount} = await monthPieceQuery

    let todayAttendanceQuery = supabase
      .from('attendance')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .eq('work_date', today)

    if (userId) {
      todayAttendanceQuery = todayAttendanceQuery.eq('user_id', userId)
    }
    const {count: todayAttendanceCount} = await todayAttendanceQuery

    let monthAttendanceQuery = supabase
      .from('attendance')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .gte('work_date', firstDayOfMonth)

    if (userId) {
      monthAttendanceQuery = monthAttendanceQuery.eq('user_id', userId)
    }
    const {count: monthAttendanceCount} = await monthAttendanceQuery

    const totalVolume =
      (todayPieceCount || 0) + (monthPieceCount || 0) + (todayAttendanceCount || 0) + (monthAttendanceCount || 0)
    const hasData = (todayPieceCount || 0) > 0 || (monthPieceCount || 0) > 0 || (todayAttendanceCount || 0) > 0

    return {
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      todayPieceCount: todayPieceCount || 0,
      monthPieceCount: monthPieceCount || 0,
      todayAttendanceCount: todayAttendanceCount || 0,
      monthAttendanceCount: monthAttendanceCount || 0,
      totalVolume,
      hasData
    }
  } catch (error) {
    console.error('获取仓库数据量失败:', error)
    return null
  }
}

/**
 * 批量获取多个仓库的数据量统计
 * @param warehouseIds 仓库ID列表
 * @param userId 用户ID（可选）
 * @returns 数据量统计列表
 */
export async function getWarehousesDataVolume(warehouseIds: string[], userId?: string): Promise<WarehouseDataVolume[]> {
  try {
    const results = await Promise.all(warehouseIds.map((id) => getWarehouseDataVolume(id, userId)))
    return results.filter((r) => r !== null) as WarehouseDataVolume[]
  } catch (error) {
    console.error('批量获取仓库数据量失败:', error)
    return []
  }
}

/**
 * 获取用户当月已申请的请假天数（仅统计已通过的申请）
 * @param userId 用户ID
 * @param year 年份
 * @param month 月份（1-12）
 * @returns 请假天数
 */
export async function getMonthlyLeaveCount(userId: string, year: number, month: number): Promise<number> {
  // 构造月份的开始和结束日期
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = getLocalDateString(new Date(year, month, 0)) // 月份最后一天

  // 注意：使用 user_id 而不是 id，id 是请假申请的主键，user_id 才是申请人
  const {data, error} = await supabase
    .from('leave_applications')
    .select('start_date, end_date')
    .eq('user_id', userId)
    .eq('status', 'approved') // 只统计已通过的申请
    .gte('start_date', startDate)
    .lte('start_date', endDate)

  if (error) {
    console.error('获取月度请假天数失败:', error)
    return 0
  }

  if (!data || data.length === 0) {
    return 0
  }

  // 计算总天数
  let totalDays = 0
  for (const record of data) {
    const start = new Date(record.start_date)
    const end = new Date(record.end_date)
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    totalDays += days
  }

  return totalDays
}

/**
 * 获取用户当月待审批的请假天数
 * @param userId 用户ID
 * @param year 年份
 * @param month 月份（1-12）
 * @returns 待审批请假天数
 */
export async function getMonthlyPendingLeaveCount(userId: string, year: number, month: number): Promise<number> {
  // 构造月份的开始和结束日期
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = getLocalDateString(new Date(year, month, 0))

  // 注意：使用 user_id 而不是 id，id 是请假申请的主键，user_id 才是申请人
  const {data, error} = await supabase
    .from('leave_applications')
    .select('start_date, end_date')
    .eq('user_id', userId)
    .eq('status', 'pending') // 只统计待审批的申请
    .gte('start_date', startDate)
    .lte('start_date', endDate)

  if (error) {
    console.error('获取月度待审批请假天数失败:', error)
    return 0
  }

  if (!data || data.length === 0) {
    return 0
  }

  // 计算总天数
  let totalDays = 0
  for (const record of data) {
    const start = new Date(record.start_date)
    const end = new Date(record.end_date)
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    totalDays += days
  }

  return totalDays
}

/**
 * 获取司机在指定日期范围内的考勤统计
 * @param userId 用户ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 考勤统计数据
 */
export async function getDriverAttendanceStats(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  attendanceDays: number
  lateDays: number
  leaveDays: number
}> {
  // 获取考勤记录
  // 注意：使用 user_id 而不是 id，id 是考勤记录的主键，user_id 才是用户ID
  const {data: attendanceData, error: attendanceError} = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)

  if (attendanceError) {
    console.error('获取考勤记录失败:', attendanceError)
    return {attendanceDays: 0, lateDays: 0, leaveDays: 0}
  }

  // 统计出勤天数和迟到天数
  const attendanceDays = attendanceData?.length || 0
  const lateDays = attendanceData?.filter((record) => record.status === 'late').length || 0

  // 获取已批准的请假记录（修正查询条件，确保覆盖所有相关请假）
  // 注意：使用 user_id 而不是 id，id 是请假申请的主键，user_id 才是申请人
  const {data: leaveData, error: leaveError} = await supabase
    .from('leave_applications')
    .select('start_date, end_date')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)

  if (leaveError) {
    console.error('获取请假记录失败:', leaveError)
    return {attendanceDays, lateDays, leaveDays: 0}
  }

  // 计算请假天数（只计算在指定日期范围内的天数）
  let leaveDays = 0
  if (leaveData && leaveData.length > 0) {
    for (const record of leaveData) {
      const leaveStart = new Date(record.start_date)
      const leaveEnd = new Date(record.end_date)
      const rangeStart = new Date(startDate)
      const rangeEnd = new Date(endDate)

      // 计算请假记录与查询范围的交集
      const overlapStart = new Date(Math.max(leaveStart.getTime(), rangeStart.getTime()))
      const overlapEnd = new Date(Math.min(leaveEnd.getTime(), rangeEnd.getTime()))

      // 如果有交集，计算天数
      if (overlapStart <= overlapEnd) {
        const days = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        if (days > 0) {
          leaveDays += days
        }
      }
    }
  }

  return {
    attendanceDays,
    lateDays,
    leaveDays
  }
}

/**
 * 批量获取多个司机的考勤统计数据（优化性能）
 * @param userIds 司机ID数组
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 司机ID到考勤统计的映射
 */
export async function getBatchDriverAttendanceStats(
  userIds: string[],
  startDate: string,
  endDate: string
): Promise<
  Map<
    string,
    {
      attendanceDays: number
      lateDays: number
      leaveDays: number
    }
  >
> {
  const resultMap = new Map<
    string,
    {
      attendanceDays: number
      lateDays: number
      leaveDays: number
    }
  >()

  // 初始化所有司机的统计数据
  userIds.forEach((userId) => {
    resultMap.set(userId, {attendanceDays: 0, lateDays: 0, leaveDays: 0})
  })

  if (userIds.length === 0) {
    return resultMap
  }

  try {
    // 批量获取所有司机的考勤记录
    const {data: attendanceData, error: attendanceError} = await supabase
      .from('attendance')
      .select('*')
      .in('user_id', userIds)
      .gte('work_date', startDate)
      .lte('work_date', endDate)

    if (attendanceError) {
      console.error('批量获取考勤记录失败:', attendanceError)
      return resultMap
    }

    // 统计每个司机的出勤天数和迟到天数
    attendanceData?.forEach((record) => {
      const stats = resultMap.get(record.user_id)
      if (stats) {
        stats.attendanceDays += 1
        if (record.status === 'late') {
          stats.lateDays += 1
        }
      }
    })

    // 批量获取所有司机的已批准请假记录
    const {data: leaveData, error: leaveError} = await supabase
      .from('leave_applications')
      .select('user_id, start_date, end_date')
      .in('user_id', userIds)
      .eq('status', 'approved')
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)

    if (leaveError) {
      console.error('批量获取请假记录失败:', leaveError)
      return resultMap
    }

    // 计算每个司机的请假天数
    leaveData?.forEach((record) => {
      const stats = resultMap.get(record.user_id)
      if (stats) {
        const leaveStart = new Date(record.start_date)
        const leaveEnd = new Date(record.end_date)
        const rangeStart = new Date(startDate)
        const rangeEnd = new Date(endDate)

        // 计算请假记录与查询范围的交集
        const overlapStart = new Date(Math.max(leaveStart.getTime(), rangeStart.getTime()))
        const overlapEnd = new Date(Math.min(leaveEnd.getTime(), rangeEnd.getTime()))

        // 如果有交集，计算天数
        if (overlapStart <= overlapEnd) {
          const days = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
          if (days > 0) {
            stats.leaveDays += days
          }
        }
      }
    })

    return resultMap
  } catch (error) {
    console.error('批量获取考勤统计失败:', error)
    return resultMap
  }
}
