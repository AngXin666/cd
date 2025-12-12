// 完全替换文件内容
/**
 * 考勤管理 API
 *
 * 功能包括：
 * - 考勤打卡（上班/下班）
 * - 考勤记录查询
 * - 考勤规则管理
 */

import {supabase} from '@/client/supabase'
import {CACHE_KEYS, clearCache, getCache, setCache} from '@/utils/cache'
import type {
  AttendanceRecord,
  AttendanceRecordInput,
  AttendanceRecordUpdate,
  AttendanceRule,
  AttendanceRuleInput,
  AttendanceRuleUpdate
} from '../types'

/**
 * 获取本地日期字符串（YYYY-MM-DD格式）
 */
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 创建上班打卡记录
 */
export async function createClockIn(input: AttendanceRecordInput): Promise<AttendanceRecord | null> {
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('创建打卡记录失败: 用户未登录')
    return null
  }

  if (!input.user_id || !input.work_date || !input.status) {
    console.error('创建打卡记录失败: 必填字段缺失')
    return null
  }

  const {data: existingRecord} = await supabase
    .from('attendance')
    .select('id')
    .eq('user_id', input.user_id)
    .eq('work_date', input.work_date)
    .maybeSingle()

  if (existingRecord) {
    const {data, error} = await supabase
      .from('attendance')
      .update(input)
      .eq('id', existingRecord.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('更新打卡记录失败:', error)
      return null
    }

    if (data) {
      const date = new Date(data.work_date)
      clearCache(`${CACHE_KEYS.ATTENDANCE_MONTHLY}_${data.user_id}_${date.getFullYear()}_${date.getMonth() + 1}`)
      clearCache(`${CACHE_KEYS.ATTENDANCE_ALL_RECORDS}_${date.getFullYear()}_${date.getMonth() + 1}`)
    }
    return data
  }

  const {data, error} = await supabase.from('attendance').insert({...input}).select().maybeSingle()

  if (error) {
    console.error('创建打卡记录失败:', error)
    return null
  }

  if (data) {
    const date = new Date(data.work_date)
    clearCache(`${CACHE_KEYS.ATTENDANCE_MONTHLY}_${data.user_id}_${date.getFullYear()}_${date.getMonth() + 1}`)
    clearCache(`${CACHE_KEYS.ATTENDANCE_ALL_RECORDS}_${date.getFullYear()}_${date.getMonth() + 1}`)
  }
  return data
}

/**
 * 更新下班打卡记录
 */
export async function updateClockOut(id: string, update: AttendanceRecordUpdate): Promise<boolean> {
  const {error} = await supabase.from('attendance').update(update).eq('id', id)
  if (error) {
    console.error('更新下班打卡失败:', error)
    return false
  }

  const {data: record} = await supabase.from('attendance').select('user_id, work_date').eq('id', id).maybeSingle()
  if (record) {
    const date = new Date(record.work_date)
    clearCache(`${CACHE_KEYS.ATTENDANCE_MONTHLY}_${record.user_id}_${date.getFullYear()}_${date.getMonth() + 1}`)
    clearCache(`${CACHE_KEYS.ATTENDANCE_ALL_RECORDS}_${date.getFullYear()}_${date.getMonth() + 1}`)
  }
  return true
}

/**
 * 获取今日打卡记录
 */
export async function getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
  const today = getLocalDateString()
  const {data, error} = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .eq('work_date', today)
    .maybeSingle()

  if (error) {
    console.error('获取今日打卡记录失败:', error)
    return null
  }
  return data
}

/**
 * 获取当月考勤记录
 */
export async function getMonthlyAttendance(userId: string, year: number, month: number): Promise<AttendanceRecord[]> {
  const cacheKey = `${CACHE_KEYS.ATTENDANCE_MONTHLY}_${userId}_${year}_${month}`
  const cached = getCache<AttendanceRecord[]>(cacheKey)
  if (cached) return cached

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = getLocalDateString(new Date(year, month, 0))

  const {data, error} = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', {ascending: false})

  if (error) {
    console.error('获取当月考勤记录失败:', error)
    return []
  }

  const result = Array.isArray(data) ? data : []
  setCache(cacheKey, result, 30 * 60 * 1000)
  return result
}

/**
 * 获取所有用户的考勤记录（管理员使用）
 */
export async function getAllAttendanceRecords(year?: number, month?: number): Promise<AttendanceRecord[]> {
  const {
    data: {user: authUser},
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    console.error('获取当前用户失败:', authError)
    return []
  }

  const {data: currentUser, error: userError} = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle()

  if (userError || !currentUser) {
    console.error('获取当前用户角色失败:', userError)
    return []
  }

  const cacheKey = `${CACHE_KEYS.ATTENDANCE_ALL_RECORDS}_${currentUser.role}_${authUser.id}_${year || 'all'}_${month || 'all'}`
  const cached = getCache<AttendanceRecord[]>(cacheKey)
  if (cached) return cached

  let query = supabase.from('attendance').select('*')

  if (currentUser.role === 'MANAGER') {
    const {data: managerWarehouses, error: warehouseError} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('user_id', authUser.id)

    if (warehouseError) {
      console.error('获取车队长管辖仓库失败:', warehouseError)
      return []
    }

    const warehouseIds = managerWarehouses.map((w) => w.warehouse_id)
    if (warehouseIds.length > 0) {
      const {data: driverAssignments, error: driverError} = await supabase
        .from('warehouse_assignments')
        .select('user_id')
        .in('warehouse_id', warehouseIds)

      if (driverError) {
        console.error('获取司机分配信息失败:', driverError)
        return []
      }

      const uniqueDriverIds = [...new Set(driverAssignments.map((d) => d.user_id))]
      if (uniqueDriverIds.length > 0) {
        query = query.in('user_id', uniqueDriverIds)
      } else {
        return []
      }
    } else {
      return []
    }
  }

  if (year && month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = getLocalDateString(new Date(year, month, 0))
    query = query.gte('work_date', startDate).lte('work_date', endDate)
  }

  const {data, error} = await query.order('work_date', {ascending: false})
  if (error) {
    console.error('获取所有考勤记录失败:', error)
    return []
  }

  const result = Array.isArray(data) ? data : []
  setCache(cacheKey, result, 30 * 60 * 1000)
  return result
}

/**
 * 获取用户在指定仓库的考勤记录
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
    .eq('id', userId)
    .eq('warehouse_id', warehouseId)
    .order('work_date', {ascending: false})

  if (startDate) query = query.gte('work_date', startDate)
  if (endDate) query = query.lte('work_date', endDate)

  const {data, error} = await query
  if (error) {
    console.error('获取用户仓库考勤记录失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 获取指定仓库的考勤记录
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
    .order('work_date', {ascending: false})

  if (startDate) query = query.gte('work_date', startDate)
  if (endDate) query = query.lte('work_date', endDate)

  const {data, error} = await query
  if (error) {
    console.error('获取仓库考勤记录失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

// ==================== 考勤规则管理 ====================

/**
 * 获取仓库的考勤规则
 */
export async function getAttendanceRuleByWarehouseId(warehouseId: string): Promise<AttendanceRule | null> {
  let {data, error} = await supabase
    .from('attendance_rules')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)
    .order('created_at', {ascending: false})
    .limit(1)

  if ((!data || data.length === 0) && !error) {
    const result = await supabase
      .from('attendance_rules')
      .select('*')
      .is('warehouse_id', null)
      .eq('is_active', true)
      .order('created_at', {ascending: false})
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
 */
export async function getAllAttendanceRules(): Promise<AttendanceRule[]> {
  const {data, error} = await supabase.from('attendance_rules').select('*').order('created_at', {ascending: true})
  if (error) {
    console.error('获取所有考勤规则失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 创建考勤规则
 */
export async function createAttendanceRule(input: AttendanceRuleInput): Promise<AttendanceRule | null> {
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('创建考勤规则失败: 用户未登录')
    throw new Error('用户未登录')
  }

  const {data, error} = await supabase
    .from('attendance_rules')
    .insert({
      warehouse_id: input.warehouse_id,
      clock_in_time: input.clock_in_time,
      clock_out_time: input.clock_out_time,
      work_start_time: input.work_start_time,
      work_end_time: input.work_end_time,
      late_threshold: input.late_threshold || 15,
      early_threshold: input.early_threshold || 15,
      require_clock_out: input.require_clock_out !== undefined ? input.require_clock_out : true,
      is_active: input.is_active !== undefined ? input.is_active : true
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('创建考勤规则失败:', error)
    throw new Error('创建考勤规则失败，请稀后重试')
  }
  return data
}

/**
 * 更新考勤规则
 */
export async function updateAttendanceRule(id: string, update: AttendanceRuleUpdate): Promise<boolean> {
  const {error} = await supabase.from('attendance_rules').update(update).eq('id', id)
  if (error) {
    console.error('更新考勤规则失败:', error)
    return false
  }
  return true
}

/**
 * 删除考勤规则
 */
export async function deleteAttendanceRule(id: string): Promise<boolean> {
  const {error} = await supabase.from('attendance_rules').delete().eq('id', id)
  if (error) {
    console.error('删除考勤规则失败:', error)
    return false
  }
  return true
}

// 注意：getBatchDriverAttendanceStats 和 getDriverAttendanceStats 已迁移到 dashboard.ts
