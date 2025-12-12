/**
 * 仪表盘统计 API
 *
 * 功能包括：
 * - 仓库统计数据
 * - 全局统计数据
 * - 驾驶员统计
 * - 考勤统计
 * - 请假统计
 */

import {supabase} from '@/client/supabase'
import type {DashboardStats, LeaveApplication, WarehouseDataVolume} from '../types'

// 重新导出类型供外部使用
export type {DashboardStats, WarehouseDataVolume}

/**
 * 获取本地日期字符串（YYYY-MM-DD格式）
 * @param date 日期对象，默认为当前日期
 * @returns 本地日期字符串
 */
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取用户今日已批准的请假申请
 * @param userId 用户ID
 * @returns 请假申请或null
 */
export async function getApprovedLeaveForToday(userId: string): Promise<LeaveApplication | null> {
  try {
    const today = getLocalDateString()

    const {data, error} = await supabase
      .from('leave_applications')
      .select('*')
      .eq('id', userId)
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
 * 获取仓库仪表盘统计数据
 * @param warehouseId 仓库ID
 * @returns 仪表盘统计数据
 */
export async function getWarehouseDashboardStats(warehouseId: string): Promise<DashboardStats> {
  const today = getLocalDateString()
  const firstDayOfMonth = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  // 1. 获取该仓库的所有用户ID
  const {data: warehouseAssignments} = await supabase
    .from('warehouse_assignments')
    .select('user_id')
    .eq('warehouse_id', warehouseId)

  const allUserIds = warehouseAssignments?.map((wa) => wa.user_id) || []

  // 2. 过滤出司机ID（排除车队长和老板）
  let driverIds: string[] = []
  if (allUserIds.length > 0) {
    const {data: userRoles} = await supabase.from('users').select('id, role').in('id', allUserIds).eq('role', 'DRIVER')
    driverIds = userRoles?.map((ur) => ur.id) || []
  }

  // 3. 并行执行所有统计查询
  const [
    todayAttendanceResult,
    todayPieceResult,
    pendingLeaveResult,
    monthlyPieceResult,
    driversResult,
    allTodayAttendanceResult,
    allTodayPieceResult
  ] = await Promise.all([
    supabase.from('attendance').select('user_id').eq('warehouse_id', warehouseId).eq('work_date', today),
    supabase.from('piece_work_records').select('quantity').eq('warehouse_id', warehouseId).eq('work_date', today),
    supabase.from('leave_applications').select('id').eq('warehouse_id', warehouseId).eq('status', 'pending'),
    supabase.from('piece_work_records').select('quantity').eq('warehouse_id', warehouseId).gte('work_date', firstDayOfMonth),
    driverIds.length > 0
      ? supabase.from('users').select('id, name, phone').in('id', driverIds)
      : Promise.resolve({data: null}),
    driverIds.length > 0
      ? supabase.from('attendance').select('user_id').in('user_id', driverIds).eq('work_date', today)
      : Promise.resolve({data: null}),
    driverIds.length > 0
      ? supabase.from('piece_work_records').select('user_id, quantity').in('user_id', driverIds).eq('work_date', today)
      : Promise.resolve({data: null})
  ])

  // 4. 处理统计数据
  const todayAttendance = todayAttendanceResult.data?.length || 0
  const todayPieceCount = todayPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0
  const pendingLeaveCount = pendingLeaveResult.data?.length || 0
  const monthlyPieceCount = monthlyPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0

  // 5. 构建司机列表
  const driverList: DashboardStats['driverList'] = []

  if (driversResult.data && driversResult.data.length > 0) {
    const attendanceMap = new Set(allTodayAttendanceResult.data?.map((record) => record.user_id) || [])
    const pieceCountMap = new Map<string, number>()
    allTodayPieceResult.data?.forEach((record) => {
      const currentCount = pieceCountMap.get(record.user_id) || 0
      pieceCountMap.set(record.user_id, currentCount + (record.quantity || 0))
    })

    for (const driver of driversResult.data) {
      driverList.push({
        id: driver.id,
        name: driver.name || driver.phone || '未命名',
        phone: driver.phone || '',
        todayAttendance: attendanceMap.has(driver.id),
        todayPieceCount: pieceCountMap.get(driver.id) || 0
      })
    }
  }

  return {
    todayAttendance,
    todayPieceCount,
    pendingLeaveCount,
    monthlyPieceCount,
    driverList
  }
}

/**
 * 获取所有仓库的汇总统计数据（老板使用）
 * @returns 汇总统计数据
 */
export async function getAllWarehousesDashboardStats(): Promise<DashboardStats> {
  const today = getLocalDateString()
  const firstDayOfMonth = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const [
    allDriversResult,
    todayAttendanceResult,
    todayPieceResult,
    pendingLeaveResult,
    monthlyPieceResult,
    allTodayAttendanceResult,
    allTodayPieceResult
  ] = await Promise.all([
    (async () => {
      const {data, error} = await supabase.from('users').select('id, name, phone').eq('role', 'DRIVER')
      return {data, error}
    })(),
    supabase.from('attendance').select('user_id').eq('work_date', today),
    supabase.from('piece_work_records').select('quantity').eq('work_date', today),
    supabase.from('leave_applications').select('id').eq('status', 'pending'),
    supabase.from('piece_work_records').select('quantity').gte('work_date', firstDayOfMonth),
    supabase.from('attendance').select('user_id').eq('work_date', today),
    supabase.from('piece_work_records').select('user_id, quantity').eq('work_date', today)
  ])

  const todayAttendance = todayAttendanceResult.data?.length || 0
  const todayPieceCount = todayPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0
  const pendingLeaveCount = pendingLeaveResult.data?.length || 0
  const monthlyPieceCount = monthlyPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0

  const driverList: DashboardStats['driverList'] = []

  if (allDriversResult.data && allDriversResult.data.length > 0) {
    const attendanceMap = new Set(allTodayAttendanceResult.data?.map((record) => record.user_id) || [])
    const pieceCountMap = new Map<string, number>()
    allTodayPieceResult.data?.forEach((record) => {
      const currentCount = pieceCountMap.get(record.user_id) || 0
      pieceCountMap.set(record.user_id, currentCount + (record.quantity || 0))
    })

    for (const driver of allDriversResult.data) {
      driverList.push({
        id: driver.id,
        name: driver.name || driver.phone || '未命名',
        phone: driver.phone || '',
        todayAttendance: attendanceMap.has(driver.id),
        todayPieceCount: pieceCountMap.get(driver.id) || 0
      })
    }
  }

  return {
    todayAttendance,
    todayPieceCount,
    pendingLeaveCount,
    monthlyPieceCount,
    driverList
  }
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

    if (userId) {
      todayPieceQuery = todayPieceQuery.eq('id', userId)
    }
    const {count: todayPieceCount} = await todayPieceQuery

    let monthPieceQuery = supabase
      .from('piece_work_records')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .gte('work_date', firstDayOfMonth)

    if (userId) {
      monthPieceQuery = monthPieceQuery.eq('id', userId)
    }
    const {count: monthPieceCount} = await monthPieceQuery

    let todayAttendanceQuery = supabase
      .from('attendance')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .eq('work_date', today)

    if (userId) {
      todayAttendanceQuery = todayAttendanceQuery.eq('id', userId)
    }
    const {count: todayAttendanceCount} = await todayAttendanceQuery

    let monthAttendanceQuery = supabase
      .from('attendance')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .gte('work_date', firstDayOfMonth)

    if (userId) {
      monthAttendanceQuery = monthAttendanceQuery.eq('id', userId)
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

  const {data, error} = await supabase
    .from('leave_applications')
    .select('start_date, end_date')
    .eq('id', userId)
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

  const {data, error} = await supabase
    .from('leave_applications')
    .select('start_date, end_date')
    .eq('id', userId)
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
  const {data: attendanceData, error: attendanceError} = await supabase
    .from('attendance')
    .select('*')
    .eq('id', userId)
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
  const {data: leaveData, error: leaveError} = await supabase
    .from('leave_applications')
    .select('start_date, end_date')
    .eq('id', userId)
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
