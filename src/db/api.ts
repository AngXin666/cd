import {supabase} from '@/client/supabase'
import type {
  AttendanceRecord,
  AttendanceRecordInput,
  AttendanceRecordUpdate,
  AttendanceRule,
  AttendanceRuleInput,
  AttendanceRuleUpdate,
  Profile,
  ProfileUpdate,
  Warehouse,
  WarehouseInput,
  WarehouseUpdate,
  WarehouseWithRule
} from './types'

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const {
    data: {user}
  } = await supabase.auth.getUser()
  if (!user) return null

  const {data, error} = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  if (error) {
    console.error('获取用户档案失败:', error)
    return null
  }

  return data
}

export async function getAllProfiles(): Promise<Profile[]> {
  const {data, error} = await supabase.from('profiles').select('*').order('created_at', {ascending: false})

  if (error) {
    console.error('获取所有用户档案失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

export async function updateProfile(id: string, updates: ProfileUpdate): Promise<boolean> {
  const {error} = await supabase.from('profiles').update(updates).eq('id', id)

  if (error) {
    console.error('更新用户档案失败:', error)
    return false
  }

  return true
}

export async function updateUserRole(id: string, role: 'driver' | 'manager' | 'super_admin'): Promise<boolean> {
  const {error} = await supabase.from('profiles').update({role}).eq('id', id)

  if (error) {
    console.error('更新用户角色失败:', error)
    return false
  }

  return true
}

export async function getDriverProfiles(): Promise<Profile[]> {
  const {data, error} = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'driver')
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取司机档案失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

export async function getManagerProfiles(): Promise<Profile[]> {
  const {data, error} = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['manager', 'super_admin'])
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取管理员档案失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// ==================== 考勤打卡相关API ====================

/**
 * 创建上班打卡记录
 */
export async function createClockIn(input: AttendanceRecordInput): Promise<AttendanceRecord | null> {
  const {data, error} = await supabase.from('attendance_records').insert(input).select().maybeSingle()

  if (error) {
    console.error('创建打卡记录失败:', error)
    return null
  }

  return data
}

/**
 * 更新下班打卡记录
 */
export async function updateClockOut(id: string, update: AttendanceRecordUpdate): Promise<boolean> {
  const {error} = await supabase.from('attendance_records').update(update).eq('id', id)

  if (error) {
    console.error('更新下班打卡失败:', error)
    return false
  }

  return true
}

/**
 * 获取今日打卡记录
 */
export async function getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
  const today = new Date().toISOString().split('T')[0]

  const {data, error} = await supabase
    .from('attendance_records')
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
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const {data, error} = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', {ascending: false})

  if (error) {
    console.error('获取当月考勤记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取所有用户的考勤记录（管理员使用）
 */
export async function getAllAttendanceRecords(year?: number, month?: number): Promise<AttendanceRecord[]> {
  let query = supabase.from('attendance_records').select('*')

  if (year && month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]
    query = query.gte('work_date', startDate).lte('work_date', endDate)
  }

  const {data, error} = await query.order('work_date', {ascending: false})

  if (error) {
    console.error('获取所有考勤记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// ==================== 仓库管理 ====================

/**
 * 获取所有启用的仓库
 */
export async function getActiveWarehouses(): Promise<Warehouse[]> {
  const {data, error} = await supabase
    .from('warehouses')
    .select('*')
    .eq('is_active', true)
    .order('created_at', {ascending: true})

  if (error) {
    console.error('获取仓库列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取所有仓库（管理员使用）
 */
export async function getAllWarehouses(): Promise<Warehouse[]> {
  const {data, error} = await supabase.from('warehouses').select('*').order('created_at', {ascending: true})

  if (error) {
    console.error('获取所有仓库失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取仓库详情
 */
export async function getWarehouseById(id: string): Promise<Warehouse | null> {
  const {data, error} = await supabase.from('warehouses').select('*').eq('id', id).maybeSingle()

  if (error) {
    console.error('获取仓库详情失败:', error)
    return null
  }

  return data
}

/**
 * 创建仓库
 */
export async function createWarehouse(input: WarehouseInput): Promise<Warehouse | null> {
  const {data, error} = await supabase
    .from('warehouses')
    .insert({
      name: input.name,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      radius: input.radius || 500,
      is_active: input.is_active !== undefined ? input.is_active : true
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('创建仓库失败:', error)
    return null
  }

  return data
}

/**
 * 更新仓库
 */
export async function updateWarehouse(id: string, update: WarehouseUpdate): Promise<boolean> {
  const {error} = await supabase.from('warehouses').update(update).eq('id', id)

  if (error) {
    console.error('更新仓库失败:', error)
    return false
  }

  return true
}

/**
 * 删除仓库
 */
export async function deleteWarehouse(id: string): Promise<boolean> {
  const {error} = await supabase.from('warehouses').delete().eq('id', id)

  if (error) {
    console.error('删除仓库失败:', error)
    return false
  }

  return true
}

// ==================== 考勤规则管理 ====================

/**
 * 获取仓库的考勤规则
 */
export async function getAttendanceRuleByWarehouseId(warehouseId: string): Promise<AttendanceRule | null> {
  const {data, error} = await supabase
    .from('attendance_rules')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('获取考勤规则失败:', error)
    return null
  }

  return data
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
  const {data, error} = await supabase
    .from('attendance_rules')
    .insert({
      warehouse_id: input.warehouse_id,
      work_start_time: input.work_start_time,
      work_end_time: input.work_end_time,
      late_threshold: input.late_threshold || 15,
      early_threshold: input.early_threshold || 15,
      is_active: input.is_active !== undefined ? input.is_active : true
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('创建考勤规则失败:', error)
    return null
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

/**
 * 获取仓库及其规则（组合查询）
 */
export async function getWarehousesWithRules(): Promise<WarehouseWithRule[]> {
  const warehouses = await getActiveWarehouses()
  const rules = await getAllAttendanceRules()

  return warehouses.map((warehouse) => ({
    ...warehouse,
    rule: rules.find((rule) => rule.warehouse_id === warehouse.id && rule.is_active)
  }))
}

/**
 * 计算两点之间的距离（米）
 * 使用Haversine公式
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // 地球半径（米）
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // 返回距离（米）
}

/**
 * 检查位置是否在仓库范围内
 */
export function isWithinWarehouseRange(userLat: number, userLon: number, warehouse: Warehouse): boolean {
  const distance = calculateDistance(userLat, userLon, warehouse.latitude, warehouse.longitude)
  return distance <= warehouse.radius
}

/**
 * 查找用户当前位置最近的仓库
 */
export async function findNearestWarehouse(
  userLat: number,
  userLon: number
): Promise<{warehouse: Warehouse; distance: number} | null> {
  const warehouses = await getActiveWarehouses()

  if (warehouses.length === 0) {
    return null
  }

  let nearest: {warehouse: Warehouse; distance: number} | null = null

  for (const warehouse of warehouses) {
    const distance = calculateDistance(userLat, userLon, warehouse.latitude, warehouse.longitude)

    if (!nearest || distance < nearest.distance) {
      nearest = {warehouse, distance}
    }
  }

  return nearest
}
