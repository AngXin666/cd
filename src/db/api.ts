import {supabase} from '@/client/supabase'
import type {
  AttendanceRecord,
  AttendanceRecordInput,
  AttendanceRecordUpdate,
  AttendanceRule,
  AttendanceRuleInput,
  AttendanceRuleUpdate,
  DriverWarehouse,
  DriverWarehouseInput,
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
 * 获取司机的仓库列表
 */
export async function getDriverWarehouses(driverId: string): Promise<Warehouse[]> {
  const {data, error} = await supabase
    .from('driver_warehouses')
    .select('warehouse_id, warehouses(*)')
    .eq('driver_id', driverId)

  if (error) {
    console.error('获取司机仓库失败:', error)
    return []
  }

  if (!data) return []

  // 提取仓库信息
  return data.map((item: any) => item.warehouses).filter(Boolean)
}

/**
 * 获取司机的仓库ID列表
 */
export async function getDriverWarehouseIds(driverId: string): Promise<string[]> {
  const {data, error} = await supabase.from('driver_warehouses').select('warehouse_id').eq('driver_id', driverId)

  if (error) {
    console.error('获取司机仓库ID失败:', error)
    return []
  }

  return data?.map((item) => item.warehouse_id) || []
}

/**
 * 为司机分配仓库
 */
export async function assignWarehouseToDriver(input: DriverWarehouseInput): Promise<boolean> {
  const {error} = await supabase.from('driver_warehouses').insert(input)

  if (error) {
    console.error('分配仓库失败:', error)
    return false
  }

  return true
}

/**
 * 取消司机的仓库分配
 */
export async function removeWarehouseFromDriver(driverId: string, warehouseId: string): Promise<boolean> {
  const {error} = await supabase
    .from('driver_warehouses')
    .delete()
    .eq('driver_id', driverId)
    .eq('warehouse_id', warehouseId)

  if (error) {
    console.error('取消仓库分配失败:', error)
    return false
  }

  return true
}

/**
 * 获取所有司机仓库关联
 */
export async function getAllDriverWarehouses(): Promise<DriverWarehouse[]> {
  const {data, error} = await supabase.from('driver_warehouses').select('*').order('created_at', {ascending: false})

  if (error) {
    console.error('获取司机仓库关联失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 批量设置司机的仓库
 */
export async function setDriverWarehouses(driverId: string, warehouseIds: string[]): Promise<boolean> {
  try {
    // 先删除该司机的所有仓库分配
    const {error: deleteError} = await supabase.from('driver_warehouses').delete().eq('driver_id', driverId)

    if (deleteError) {
      console.error('删除旧仓库分配失败:', deleteError)
      return false
    }

    // 如果没有新的仓库分配，直接返回成功
    if (warehouseIds.length === 0) {
      return true
    }

    // 批量插入新的仓库分配
    const insertData = warehouseIds.map((warehouseId) => ({
      driver_id: driverId,
      warehouse_id: warehouseId
    }))

    const {error: insertError} = await supabase.from('driver_warehouses').insert(insertData)

    if (insertError) {
      console.error('插入新仓库分配失败:', insertError)
      return false
    }

    return true
  } catch (error) {
    console.error('设置司机仓库失败:', error)
    return false
  }
}
