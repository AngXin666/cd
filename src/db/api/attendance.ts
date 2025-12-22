/**
 * 考勤管理 API
 *
 * 功能包括：
 * - 考勤打卡（上班/下班）
 * - 考勤记录查询
 * - 考勤规则管理
 *
 * 注意：此文件是 AttendanceRepository 的包装器
 * 所有数据访问都通过 Repository 层进行，确保缓存一致性
 *
 * @module db/api/attendance
 */

import { supabase } from '@/client/supabase'
import { attendanceRepository, type AttendanceStats } from '@/db/repositories'
import { publish } from '@/utils/eventBus'
import type {
  AttendanceRecord,
  AttendanceRecordInput,
  AttendanceRecordUpdate,
  AttendanceRule,
  AttendanceRuleInput,
  AttendanceRuleUpdate
} from '../types'

// ==================== 考勤记录管理 ====================

/**
 * 创建上班打卡记录
 * 如果当天已有记录则更新，否则创建新记录
 *
 * @param input - 考勤记录输入数据
 * @returns 创建或更新的考勤记录，失败返回 null
 */
export async function createClockIn(input: AttendanceRecordInput): Promise<AttendanceRecord | null> {
  // 验证用户登录状态
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('创建打卡记录失败: 用户未登录')
    return null
  }

  // 验证必填字段
  if (!input.user_id || !input.work_date || !input.status) {
    console.error('创建打卡记录失败: 必填字段缺失')
    return null
  }

  // 检查当天是否已有记录
  const existingRecord = await attendanceRepository.getTodayAttendance(input.user_id, { useCache: false })

  if (existingRecord) {
    // 已有记录，更新打卡信息
    const updated = await attendanceRepository.updateAttendance(existingRecord.id, input as AttendanceRecordUpdate)

    if (updated) {
      // 发布事件通知其他组件刷新数据
      publish('attendance:updated', { id: updated.id, userId: updated.user_id })
    }

    return updated
  }

  // 创建新记录
  const data = await attendanceRepository.createAttendance(input)

  if (data) {
    // 发布事件通知其他组件刷新数据
    publish('attendance:created', { id: data.id, userId: data.user_id })
  }

  return data
}

/**
 * 更新下班打卡记录
 *
 * @param id - 考勤记录 ID
 * @param update - 更新数据
 * @returns 是否更新成功
 */
export async function updateClockOut(id: string, update: AttendanceRecordUpdate): Promise<boolean> {
  const result = await attendanceRepository.updateAttendance(id, update)

  if (result) {
    // 发布事件通知其他组件刷新数据
    publish('attendance:updated', { id: result.id, userId: result.user_id })
    return true
  }

  return false
}

/**
 * 获取今日打卡记录
 *
 * @param userId - 用户 ID
 * @returns 今日考勤记录，不存在返回 null
 */
export async function getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
  return attendanceRepository.getTodayAttendance(userId)
}

/**
 * 获取当月考勤记录
 *
 * @param userId - 用户 ID
 * @param year - 年份
 * @param month - 月份（1-12）
 * @returns 当月考勤记录列表
 */
export async function getMonthlyAttendance(userId: string, year: number, month: number): Promise<AttendanceRecord[]> {
  return attendanceRepository.getMonthlyAttendance(userId, year, month)
}

/**
 * 获取所有用户的考勤记录（管理员使用）
 * 根据用户角色过滤数据：
 * - MANAGER：只能查看管辖仓库的司机考勤
 * - SUPER_ADMIN：可以查看所有考勤
 *
 * @param year - 年份（可选）
 * @param month - 月份（可选）
 * @returns 考勤记录列表
 */
export async function getAllAttendanceRecords(year?: number, month?: number): Promise<AttendanceRecord[]> {
  // 获取当前用户信息
  const {
    data: { user: authUser },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    console.error('获取当前用户失败:', authError)
    return []
  }

  // 获取用户角色
  const { data: currentUser, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle()

  if (userError || !currentUser) {
    console.error('获取当前用户角色失败:', userError)
    return []
  }

  // 如果是 MANAGER，需要过滤只显示管辖仓库的司机考勤
  if (currentUser.role === 'MANAGER') {
    // 获取车队长管辖的仓库
    const { data: managerWarehouses, error: warehouseError } = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('user_id', authUser.id)

    if (warehouseError) {
      console.error('获取车队长管辖仓库失败:', warehouseError)
      return []
    }

    const warehouseIds = managerWarehouses.map((w) => w.warehouse_id)
    if (warehouseIds.length === 0) {
      return []
    }

    // 获取这些仓库的司机
    const { data: driverAssignments, error: driverError } = await supabase
      .from('warehouse_assignments')
      .select('user_id')
      .in('warehouse_id', warehouseIds)

    if (driverError) {
      console.error('获取司机分配信息失败:', driverError)
      return []
    }

    const uniqueDriverIds = [...new Set(driverAssignments.map((d) => d.user_id))]
    if (uniqueDriverIds.length === 0) {
      return []
    }

    // 构建查询
    let query = supabase.from('attendance').select('*').in('user_id', uniqueDriverIds)

    // 添加日期过滤
    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      query = query.gte('work_date', startDate).lte('work_date', endDate)
    }

    const { data, error } = await query.order('work_date', { ascending: false })

    if (error) {
      console.error('获取考勤记录失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  }

  // 超级管理员：获取所有考勤记录
  return attendanceRepository.getAllAttendanceRecords({ limit: 1000 })
}

/**
 * 获取用户在指定仓库的考勤记录
 *
 * @param userId - 用户 ID
 * @param warehouseId - 仓库 ID
 * @param startDate - 开始日期（可选）
 * @param endDate - 结束日期（可选）
 * @returns 考勤记录列表
 */
export async function getAttendanceRecordsByUserAndWarehouse(
  userId: string,
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceRecord[]> {
  let query = supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .eq('warehouse_id', warehouseId)
    .order('work_date', { ascending: false })

  if (startDate) query = query.gte('work_date', startDate)
  if (endDate) query = query.lte('work_date', endDate)

  const { data, error } = await query

  if (error) {
    console.error('获取用户仓库考勤记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取指定仓库的考勤记录
 *
 * @param warehouseId - 仓库 ID
 * @param startDate - 开始日期（可选）
 * @param endDate - 结束日期（可选）
 * @returns 考勤记录列表
 */
export async function getAttendanceRecordsByWarehouse(
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceRecord[]> {
  let query = supabase
    .from('attendance')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('work_date', { ascending: false })

  if (startDate) query = query.gte('work_date', startDate)
  if (endDate) query = query.lte('work_date', endDate)

  const { data, error } = await query

  if (error) {
    console.error('获取仓库考勤记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取考勤统计数据
 *
 * @param userId - 用户 ID
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 考勤统计数据
 */
export async function getAttendanceStats(
  userId: string,
  startDate: string,
  endDate: string
): Promise<AttendanceStats> {
  return attendanceRepository.getAttendanceStats(userId, startDate, endDate)
}

// ==================== 考勤规则管理 ====================
// 注意：考勤规则暂未迁移到 Repository，因为使用频率较低

/**
 * 获取仓库的考勤规则
 * 如果仓库没有专属规则，则返回全局默认规则
 *
 * @param warehouseId - 仓库 ID
 * @returns 考勤规则，不存在返回 null
 */
export async function getAttendanceRuleByWarehouseId(warehouseId: string): Promise<AttendanceRule | null> {
  // 先查询仓库专属规则
  let { data, error } = await supabase
    .from('attendance_rules')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  // 如果没有仓库专属规则，查询全局默认规则
  if ((!data || data.length === 0) && !error) {
    const result = await supabase
      .from('attendance_rules')
      .select('*')
      .is('warehouse_id', null)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
    data = result.data
    error = result.error
  }

  if (error) {
    console.error('获取考勤规则失败:', error)
    return null
  }

  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

/**
 * 获取所有考勤规则
 *
 * @returns 考勤规则列表
 */
export async function getAllAttendanceRules(): Promise<AttendanceRule[]> {
  const { data, error } = await supabase
    .from('attendance_rules')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('获取所有考勤规则失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 创建考勤规则
 *
 * 注意：数据库中使用 work_start_time 和 work_end_time 字段
 * clock_in_time 和 clock_out_time 会自动映射到这些字段
 *
 * @param input - 考勤规则输入数据
 * @returns 创建的考勤规则对象，失败抛出错误
 * @throws {Error} 用户未登录或创建失败时抛出错误
 */
export async function createAttendanceRule(input: AttendanceRuleInput): Promise<AttendanceRule | null> {
  // 验证用户登录状态
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('创建考勤规则失败: 用户未登录')
    throw new Error('用户未登录')
  }

  // 将 clock_in_time/clock_out_time 映射到 work_start_time/work_end_time
  const workStartTime = input.work_start_time || input.clock_in_time
  const workEndTime = input.work_end_time || input.clock_out_time

  const { data, error } = await supabase
    .from('attendance_rules')
    .insert({
      warehouse_id: input.warehouse_id,
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      late_threshold: input.late_threshold || 15, // 默认迟到阈值 15 分钟
      early_threshold: input.early_threshold || 15, // 默认早退阈值 15 分钟
      require_clock_out: input.require_clock_out !== undefined ? input.require_clock_out : true,
      is_active: input.is_active !== undefined ? input.is_active : true
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('创建考勤规则失败:', error)
    throw new Error('创建考勤规则失败，请稍后重试')
  }

  // 发布考勤规则创建事件
  if (data) {
    publish('attendance_rule:created', {
      id: data.id,
      warehouse_id: data.warehouse_id,
      is_active: data.is_active
    })
  }

  return data
}

/**
 * 更新考勤规则
 *
 * 注意：数据库中使用 work_start_time 和 work_end_time 字段
 * clock_in_time 和 clock_out_time 会自动映射到这些字段
 *
 * @param id - 考勤规则 ID
 * @param update - 更新数据
 * @returns 是否更新成功
 */
export async function updateAttendanceRule(id: string, update: AttendanceRuleUpdate): Promise<boolean> {
  // 构建数据库更新对象，映射字段名
  const dbUpdate: Record<string, unknown> = {}

  // 映射时间字段
  if (update.clock_in_time || update.work_start_time) {
    dbUpdate.work_start_time = update.work_start_time || update.clock_in_time
  }
  if (update.clock_out_time || update.work_end_time) {
    dbUpdate.work_end_time = update.work_end_time || update.clock_out_time
  }

  // 复制其他字段
  if (update.late_threshold !== undefined) dbUpdate.late_threshold = update.late_threshold
  if (update.early_threshold !== undefined) dbUpdate.early_threshold = update.early_threshold
  if (update.require_clock_out !== undefined) dbUpdate.require_clock_out = update.require_clock_out
  if (update.is_active !== undefined) dbUpdate.is_active = update.is_active

  const { error } = await supabase.from('attendance_rules').update(dbUpdate).eq('id', id)

  if (error) {
    console.error('更新考勤规则失败:', error)
    return false
  }

  // 发布考勤规则更新事件
  publish('attendance_rule:updated', { id, ...dbUpdate })

  return true
}

/**
 * 删除考勤规则
 *
 * @param id - 考勤规则 ID
 * @returns 是否删除成功
 */
export async function deleteAttendanceRule(id: string): Promise<boolean> {
  const { error } = await supabase.from('attendance_rules').delete().eq('id', id)

  if (error) {
    console.error('删除考勤规则失败:', error)
    return false
  }

  // 发布考勤规则删除事件
  publish('attendance_rule:deleted', { id })

  return true
}

// 注意：getBatchDriverAttendanceStats 和 getDriverAttendanceStats 已迁移到 dashboard.ts
