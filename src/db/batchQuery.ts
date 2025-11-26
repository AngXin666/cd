/**
 * 批量查询工具
 * 用于优化 N+1 查询问题，提升查询性能
 */

import {supabase} from './supabase'
import {getCurrentUserBossId} from './tenant-utils'

/**
 * 批量获取用户信息
 * @param userIds 用户ID数组
 * @returns 用户信息数组
 */
export async function batchGetProfiles(userIds: string[]) {
  if (userIds.length === 0) return []

  const {data, error} = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)
    .eq('boss_id', getCurrentUserBossId())

  if (error) {
    console.error('[批量查询] 获取用户信息失败:', error)
    return []
  }

  return data || []
}

/**
 * 批量获取仓库信息
 * @param warehouseIds 仓库ID数组
 * @returns 仓库信息数组
 */
export async function batchGetWarehouses(warehouseIds: string[]) {
  if (warehouseIds.length === 0) return []

  const {data, error} = await supabase
    .from('warehouses')
    .select('*')
    .in('id', warehouseIds)
    .eq('boss_id', getCurrentUserBossId())

  if (error) {
    console.error('[批量查询] 获取仓库信息失败:', error)
    return []
  }

  return data || []
}

/**
 * 批量获取车辆信息
 * @param vehicleIds 车辆ID数组
 * @returns 车辆信息数组
 */
export async function batchGetVehicles(vehicleIds: string[]) {
  if (vehicleIds.length === 0) return []

  const {data, error} = await supabase
    .from('vehicles')
    .select('*')
    .in('id', vehicleIds)
    .eq('boss_id', getCurrentUserBossId())

  if (error) {
    console.error('[批量查询] 获取车辆信息失败:', error)
    return []
  }

  return data || []
}

/**
 * 获取司机列表（包含仓库信息）
 * 使用 JOIN 查询，避免 N+1 问题
 * @returns 司机列表（包含仓库信息）
 */
export async function getDriversWithWarehouses() {
  const {data, error} = await supabase
    .from('profiles')
    .select(`
      *,
      driver_warehouses(
        warehouse_id,
        warehouses(
          id,
          name,
          address
        )
      )
    `)
    .eq('role', 'driver')
    .eq('boss_id', getCurrentUserBossId())
    .order('created_at', {ascending: false})

  if (error) {
    console.error('[批量查询] 获取司机列表失败:', error)
    return []
  }

  return data || []
}

/**
 * 获取考勤记录（包含用户信息）
 * 使用 JOIN 查询，避免 N+1 问题
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 考勤记录列表（包含用户信息）
 */
export async function getAttendanceWithUsers(startDate: string, endDate: string) {
  const {data, error} = await supabase
    .from('attendance')
    .select(`
      *,
      profiles!user_id(
        id,
        name,
        phone
      )
    `)
    .eq('boss_id', getCurrentUserBossId())
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', {ascending: false})

  if (error) {
    console.error('[批量查询] 获取考勤记录失败:', error)
    return []
  }

  return data || []
}

/**
 * 获取车辆记录（包含车辆和司机信息）
 * 使用 JOIN 查询，避免 N+1 问题
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 车辆记录列表（包含车辆和司机信息）
 */
export async function getVehicleRecordsWithDetails(startDate: string, endDate: string) {
  const {data, error} = await supabase
    .from('vehicle_records')
    .select(`
      *,
      vehicles!vehicle_id(
        id,
        plate_number,
        model
      ),
      profiles!driver_id(
        id,
        name,
        phone
      )
    `)
    .eq('boss_id', getCurrentUserBossId())
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('[批量查询] 获取车辆记录失败:', error)
    return []
  }

  return data || []
}

/**
 * 获取计件记录（包含用户和仓库信息）
 * 使用 JOIN 查询，避免 N+1 问题
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 计件记录列表（包含用户和仓库信息）
 */
export async function getPieceWorkRecordsWithDetails(startDate: string, endDate: string) {
  const {data, error} = await supabase
    .from('piece_work_records')
    .select(`
      *,
      profiles!user_id(
        id,
        name,
        phone
      ),
      warehouses!warehouse_id(
        id,
        name
      )
    `)
    .eq('boss_id', getCurrentUserBossId())
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', {ascending: false})

  if (error) {
    console.error('[批量查询] 获取计件记录失败:', error)
    return []
  }

  return data || []
}

/**
 * 获取请假申请（包含申请人和审批人信息）
 * 使用 JOIN 查询，避免 N+1 问题
 * @param status 状态筛选（可选）
 * @returns 请假申请列表（包含申请人和审批人信息）
 */
export async function getLeaveApplicationsWithUsers(status?: string) {
  let query = supabase
    .from('leave_applications')
    .select(`
      *,
      applicant:profiles!user_id(
        id,
        name,
        phone
      ),
      reviewer:profiles!reviewed_by(
        id,
        name
      )
    `)
    .eq('boss_id', getCurrentUserBossId())
    .order('created_at', {ascending: false})

  if (status) {
    query = query.eq('status', status)
  }

  const {data, error} = await query

  if (error) {
    console.error('[批量查询] 获取请假申请失败:', error)
    return []
  }

  return data || []
}

/**
 * 获取离职申请（包含申请人和审批人信息）
 * 使用 JOIN 查询，避免 N+1 问题
 * @param status 状态筛选（可选）
 * @returns 离职申请列表（包含申请人和审批人信息）
 */
export async function getResignationApplicationsWithUsers(status?: string) {
  let query = supabase
    .from('resignation_applications')
    .select(`
      *,
      applicant:profiles!user_id(
        id,
        name,
        phone
      ),
      reviewer:profiles!reviewed_by(
        id,
        name
      )
    `)
    .eq('boss_id', getCurrentUserBossId())
    .order('created_at', {ascending: false})

  if (status) {
    query = query.eq('status', status)
  }

  const {data, error} = await query

  if (error) {
    console.error('[批量查询] 获取离职申请失败:', error)
    return []
  }

  return data || []
}

/**
 * 获取反馈列表（包含提交人和回复人信息）
 * 使用 JOIN 查询，避免 N+1 问题
 * @param status 状态筛选（可选）
 * @returns 反馈列表（包含提交人和回复人信息）
 */
export async function getFeedbackWithUsers(status?: string) {
  let query = supabase
    .from('feedback')
    .select(`
      *,
      submitter:profiles!user_id(
        id,
        name,
        phone
      ),
      responder:profiles!responded_by(
        id,
        name
      )
    `)
    .eq('boss_id', getCurrentUserBossId())
    .order('created_at', {ascending: false})

  if (status) {
    query = query.eq('status', status)
  }

  const {data, error} = await query

  if (error) {
    console.error('[批量查询] 获取反馈列表失败:', error)
    return []
  }

  return data || []
}
