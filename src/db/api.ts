import {supabase} from '@/client/supabase'
import type {
  ApplicationReviewInput,
  AttendanceRecord,
  AttendanceRecordInput,
  AttendanceRecordUpdate,
  AttendanceRule,
  AttendanceRuleInput,
  AttendanceRuleUpdate,
  DriverWarehouse,
  DriverWarehouseInput,
  Feedback,
  FeedbackInput,
  FeedbackStatus,
  LeaveApplication,
  LeaveApplicationInput,
  ManagerPermission,
  ManagerPermissionInput,
  PieceWorkCategory,
  PieceWorkCategoryInput,
  PieceWorkRecord,
  PieceWorkRecordInput,
  PieceWorkStats,
  Profile,
  ProfileUpdate,
  ResignationApplication,
  ResignationApplicationInput,
  UserRole,
  Warehouse,
  WarehouseInput,
  WarehouseUpdate,
  WarehouseWithRule
} from './types'

/**
 * 获取本地日期字符串（YYYY-MM-DD格式）
 * 避免使用toISOString()导致的时区问题
 */
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  try {
    console.log('[getCurrentUserProfile] 开始获取当前用户')
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserProfile] 获取认证用户失败:', authError)
      return null
    }

    if (!user) {
      console.warn('[getCurrentUserProfile] 用户未登录')
      return null
    }

    console.log('[getCurrentUserProfile] 当前用户ID:', user.id)
    console.log('[getCurrentUserProfile] 当前用户手机号:', user.phone)

    const {data, error} = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

    if (error) {
      console.error('[getCurrentUserProfile] 查询用户档案失败:', error)
      console.error('[getCurrentUserProfile] 错误详情:', JSON.stringify(error))
      return null
    }

    if (!data) {
      console.warn('[getCurrentUserProfile] 用户档案不存在，用户ID:', user.id)
      console.warn('[getCurrentUserProfile] 请检查 profiles 表中是否有该用户的记录')
      return null
    }

    console.log('[getCurrentUserProfile] 成功获取用户档案:', {
      id: data.id,
      phone: data.phone,
      role: data.role
    })

    return data
  } catch (error) {
    console.error('[getCurrentUserProfile] 未预期的错误:', error)
    return null
  }
}

/**
 * 快速获取当前用户角色（用于登录后的路由跳转）
 * 只查询 role 字段，不获取完整档案，提高性能
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    console.log('[getCurrentUserRole] 开始获取用户角色')
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserRole] 获取认证用户失败:', authError)
      return null
    }

    if (!user) {
      console.warn('[getCurrentUserRole] 用户未登录')
      return null
    }

    console.log('[getCurrentUserRole] 当前用户ID:', user.id)

    // 只查询 role 字段，提高查询效率
    const {data, error} = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

    if (error) {
      console.error('[getCurrentUserRole] 查询用户角色失败:', error)
      return null
    }

    if (!data) {
      console.warn('[getCurrentUserRole] 用户档案不存在，用户ID:', user.id)
      return null
    }

    console.log('[getCurrentUserRole] 成功获取用户角色:', data.role)
    return data.role
  } catch (error) {
    console.error('[getCurrentUserRole] 未预期的错误:', error)
    return null
  }
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
  const today = getLocalDateString()

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
  const endDate = getLocalDateString(new Date(year, month, 0))

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
    const endDate = getLocalDateString(new Date(year, month, 0))
    query = query.gte('work_date', startDate).lte('work_date', endDate)
  }

  const {data, error} = await query.order('work_date', {ascending: false})

  if (error) {
    console.error('获取所有考勤记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
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
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .eq('warehouse_id', warehouseId)
    .order('work_date', {ascending: false})

  if (startDate) {
    query = query.gte('work_date', startDate)
  }
  if (endDate) {
    query = query.lte('work_date', endDate)
  }

  const {data, error} = await query

  if (error) {
    console.error('获取用户仓库考勤记录失败:', error)
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
 * 获取仓库详情（包含规则）
 */
export async function getWarehouseWithRule(id: string): Promise<WarehouseWithRule | null> {
  const {data, error} = await supabase
    .from('warehouses')
    .select(
      `
      *,
      rule:attendance_rules!attendance_rules_warehouse_id_fkey(*)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('获取仓库详情失败:', error)
    return null
  }

  // 如果rule是数组，取第一个元素
  if (data && Array.isArray(data.rule) && data.rule.length > 0) {
    return {...data, rule: data.rule[0]} as WarehouseWithRule
  }

  return data as WarehouseWithRule | null
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
 * 获取仓库的司机列表
 */
export async function getDriversByWarehouse(warehouseId: string): Promise<Profile[]> {
  const {data, error} = await supabase
    .from('driver_warehouses')
    .select('driver_id, profiles(*)')
    .eq('warehouse_id', warehouseId)

  if (error) {
    console.error('获取仓库司机失败:', error)
    return []
  }

  if (!data) return []

  // 提取司机信息
  return data.map((item: any) => item.profiles).filter(Boolean)
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

// ==================== 计件记录相关 API ====================

// 获取用户的计件记录
export async function getPieceWorkRecordsByUser(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkRecord[]> {
  let query = supabase
    .from('piece_work_records')
    .select('*')
    .eq('user_id', userId)
    .order('work_date', {ascending: false})

  if (startDate) {
    query = query.gte('work_date', startDate)
  }
  if (endDate) {
    query = query.lte('work_date', endDate)
  }

  const {data, error} = await query

  if (error) {
    console.error('获取计件记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取仓库的计件记录
export async function getPieceWorkRecordsByWarehouse(
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkRecord[]> {
  let query = supabase
    .from('piece_work_records')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('work_date', {ascending: false})

  if (startDate) {
    query = query.gte('work_date', startDate)
  }
  if (endDate) {
    query = query.lte('work_date', endDate)
  }

  const {data, error} = await query

  if (error) {
    console.error('获取仓库计件记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取用户在指定仓库的计件记录
export async function getPieceWorkRecordsByUserAndWarehouse(
  userId: string,
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkRecord[]> {
  let query = supabase
    .from('piece_work_records')
    .select('*')
    .eq('user_id', userId)
    .eq('warehouse_id', warehouseId)
    .order('work_date', {ascending: false})

  if (startDate) {
    query = query.gte('work_date', startDate)
  }
  if (endDate) {
    query = query.lte('work_date', endDate)
  }

  const {data, error} = await query

  if (error) {
    console.error('获取用户仓库计件记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取所有计件记录
 */
export async function getAllPieceWorkRecords(): Promise<PieceWorkRecord[]> {
  const {data, error} = await supabase.from('piece_work_records').select('*').order('work_date', {ascending: false})

  if (error) {
    console.error('获取所有计件记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 创建计件记录
export async function createPieceWorkRecord(record: PieceWorkRecordInput): Promise<boolean> {
  const {error} = await supabase.from('piece_work_records').insert(record)

  if (error) {
    console.error('创建计件记录失败:', error)
    return false
  }

  return true
}

/**
 * 更新计件记录
 */
export async function updatePieceWorkRecord(id: string, record: Partial<PieceWorkRecordInput>): Promise<boolean> {
  const {error} = await supabase.from('piece_work_records').update(record).eq('id', id)

  if (error) {
    console.error('更新计件记录失败:', error)
    return false
  }

  return true
}

/**
 * 删除计件记录
 */
export async function deletePieceWorkRecord(id: string): Promise<boolean> {
  const {error} = await supabase.from('piece_work_records').delete().eq('id', id)

  if (error) {
    console.error('删除计件记录失败:', error)
    return false
  }

  return true
}

// 计算计件统计
export async function calculatePieceWorkStats(
  userId: string,
  warehouseId: string,
  startDate?: string,
  endDate?: string
): Promise<PieceWorkStats> {
  const records = await getPieceWorkRecordsByUserAndWarehouse(userId, warehouseId, startDate, endDate)

  // 获取所有品类信息
  const {data: categories} = await supabase.from('piece_work_categories').select('*')
  const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) || [])

  const stats: PieceWorkStats = {
    total_orders: records.length,
    total_quantity: 0,
    total_amount: 0,
    by_category: []
  }

  const categoryStatsMap = new Map<
    string,
    {
      category_id: string
      category_name: string
      quantity: number
      amount: number
    }
  >()

  for (const record of records) {
    stats.total_quantity += record.quantity
    stats.total_amount += Number(record.total_amount)

    const categoryId = record.category_id
    const categoryName = categoryMap.get(categoryId) || '未知品类'

    const existing = categoryStatsMap.get(categoryId)
    if (existing) {
      existing.quantity += record.quantity
      existing.amount += Number(record.total_amount)
    } else {
      categoryStatsMap.set(categoryId, {
        category_id: categoryId,
        category_name: categoryName,
        quantity: record.quantity,
        amount: Number(record.total_amount)
      })
    }
  }

  stats.by_category = Array.from(categoryStatsMap.values())

  return stats
}

// ==================== 计件品类管理 API ====================

// 获取所有启用的品类
export async function getActiveCategories(): Promise<PieceWorkCategory[]> {
  const {data, error} = await supabase
    .from('piece_work_categories')
    .select('*')
    .eq('is_active', true)
    .order('name', {ascending: true})

  if (error) {
    console.error('获取启用品类失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取所有品类（包括禁用的）
export async function getAllCategories(): Promise<PieceWorkCategory[]> {
  const {data, error} = await supabase.from('piece_work_categories').select('*').order('name', {ascending: true})

  if (error) {
    console.error('获取所有品类失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 创建品类
export async function createCategory(category: PieceWorkCategoryInput): Promise<boolean> {
  const {error} = await supabase.from('piece_work_categories').insert(category)

  if (error) {
    console.error('创建品类失败:', error)
    return false
  }

  return true
}

// 更新品类
export async function updateCategory(id: string, updates: Partial<PieceWorkCategoryInput>): Promise<boolean> {
  const {error} = await supabase
    .from('piece_work_categories')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('id', id)

  if (error) {
    console.error('更新品类失败:', error)
    return false
  }

  return true
}

// 删除品类
export async function deleteCategory(id: string): Promise<boolean> {
  const {error} = await supabase.from('piece_work_categories').delete().eq('id', id)

  if (error) {
    console.error('删除品类失败:', error)
    return false
  }

  return true
}

// ==================== 管理员仓库关联 API ====================

// 获取管理员的仓库列表
export async function getManagerWarehouses(managerId: string): Promise<Warehouse[]> {
  const {data, error} = await supabase.from('manager_warehouses').select('warehouse_id').eq('manager_id', managerId)

  if (error) {
    console.error('获取管理员仓库失败:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  const warehouseIds = data.map((item) => item.warehouse_id)
  const {data: warehouses, error: warehouseError} = await supabase
    .from('warehouses')
    .select('*')
    .in('id', warehouseIds)
    .order('name', {ascending: true})

  if (warehouseError) {
    console.error('获取仓库信息失败:', warehouseError)
    return []
  }

  return Array.isArray(warehouses) ? warehouses : []
}

// 获取仓库的管理员列表
export async function getWarehouseManagers(warehouseId: string): Promise<Profile[]> {
  const {data, error} = await supabase.from('manager_warehouses').select('manager_id').eq('warehouse_id', warehouseId)

  if (error) {
    console.error('获取仓库管理员失败:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  const managerIds = data.map((item) => item.manager_id)
  const {data: managers, error: managerError} = await supabase
    .from('profiles')
    .select('*')
    .in('id', managerIds)
    .order('name', {ascending: true})

  if (managerError) {
    console.error('获取管理员信息失败:', managerError)
    return []
  }

  return Array.isArray(managers) ? managers : []
}

// 添加管理员仓库关联
export async function addManagerWarehouse(managerId: string, warehouseId: string): Promise<boolean> {
  const {error} = await supabase.from('manager_warehouses').insert({
    manager_id: managerId,
    warehouse_id: warehouseId
  })

  if (error) {
    console.error('添加管理员仓库关联失败:', error)
    return false
  }

  return true
}

// 删除管理员仓库关联
export async function removeManagerWarehouse(managerId: string, warehouseId: string): Promise<boolean> {
  const {error} = await supabase
    .from('manager_warehouses')
    .delete()
    .eq('manager_id', managerId)
    .eq('warehouse_id', warehouseId)

  if (error) {
    console.error('删除管理员仓库关联失败:', error)
    return false
  }

  return true
}

// ==================== 请假申请相关 API ====================

/**
 * 创建请假申请
 */
export async function createLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  const {data, error} = await supabase
    .from('leave_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      type: input.type,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason,
      attachment_url: input.attachment_url || null,
      status: 'pending',
      is_draft: input.is_draft || false
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('创建请假申请失败:', error)
    return null
  }

  return data
}

/**
 * 保存请假申请草稿
 */
export async function saveDraftLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  const {data, error} = await supabase
    .from('leave_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      type: input.type,
      start_date: input.start_date || '',
      end_date: input.end_date || '',
      reason: input.reason || '',
      attachment_url: input.attachment_url || null,
      status: 'pending',
      is_draft: true
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('保存请假申请草稿失败:', error)
    return null
  }

  return data
}

/**
 * 更新请假申请草稿
 */
export async function updateDraftLeaveApplication(
  draftId: string,
  input: Partial<LeaveApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.type !== undefined) updateData.type = input.type
  if (input.start_date !== undefined) updateData.start_date = input.start_date
  if (input.end_date !== undefined) updateData.end_date = input.end_date
  if (input.reason !== undefined) updateData.reason = input.reason
  if (input.attachment_url !== undefined) updateData.attachment_url = input.attachment_url

  const {error} = await supabase.from('leave_applications').update(updateData).eq('id', draftId).eq('is_draft', true)

  if (error) {
    console.error('更新请假申请草稿失败:', error)
    return false
  }

  return true
}

/**
 * 提交请假申请草稿（转为正式申请）
 */
export async function submitDraftLeaveApplication(draftId: string): Promise<boolean> {
  const {error} = await supabase.from('leave_applications').update({is_draft: false}).eq('id', draftId)

  if (error) {
    console.error('提交请假申请草稿失败:', error)
    return false
  }

  return true
}

/**
 * 删除请假申请草稿
 */
export async function deleteDraftLeaveApplication(draftId: string): Promise<boolean> {
  const {error} = await supabase.from('leave_applications').delete().eq('id', draftId).eq('is_draft', true)

  if (error) {
    console.error('删除请假申请草稿失败:', error)
    return false
  }

  return true
}

/**
 * 获取用户的请假申请草稿列表
 */
export async function getDraftLeaveApplications(userId: string): Promise<LeaveApplication[]> {
  const {data, error} = await supabase
    .from('leave_applications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_draft', true)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取请假申请草稿失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取用户的所有请假申请（不包括草稿）
 */
export async function getLeaveApplicationsByUser(userId: string): Promise<LeaveApplication[]> {
  const {data, error} = await supabase
    .from('leave_applications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_draft', false)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取请假申请失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取仓库的所有请假申请
 */
export async function getLeaveApplicationsByWarehouse(warehouseId: string): Promise<LeaveApplication[]> {
  const {data, error} = await supabase
    .from('leave_applications')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取仓库请假申请失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取所有请假申请（超级管理员）
 */
export async function getAllLeaveApplications(): Promise<LeaveApplication[]> {
  const {data, error} = await supabase.from('leave_applications').select('*').order('created_at', {ascending: false})

  if (error) {
    console.error('获取所有请假申请失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 审批请假申请
 */
export async function reviewLeaveApplication(applicationId: string, review: ApplicationReviewInput): Promise<boolean> {
  const {error} = await supabase
    .from('leave_applications')
    .update({
      status: review.status,
      reviewer_id: review.reviewer_id,
      review_comment: review.review_comment || null,
      reviewed_at: review.reviewed_at
    })
    .eq('id', applicationId)

  if (error) {
    console.error('审批请假申请失败:', error)
    return false
  }

  return true
}

// ==================== 离职申请相关 API ====================

/**
 * 创建离职申请
 */
export async function createResignationApplication(
  input: ResignationApplicationInput
): Promise<ResignationApplication | null> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      expected_date: input.expected_date,
      reason: input.reason,
      status: 'pending',
      is_draft: input.is_draft || false
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('创建离职申请失败:', error)
    return null
  }

  return data
}

/**
 * 保存离职申请草稿
 */
export async function saveDraftResignationApplication(
  input: ResignationApplicationInput
): Promise<ResignationApplication | null> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      expected_date: input.expected_date || '',
      reason: input.reason || '',
      status: 'pending',
      is_draft: true
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('保存离职申请草稿失败:', error)
    return null
  }

  return data
}

/**
 * 更新离职申请草稿
 */
export async function updateDraftResignationApplication(
  draftId: string,
  input: Partial<ResignationApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.expected_date !== undefined) updateData.expected_date = input.expected_date
  if (input.reason !== undefined) updateData.reason = input.reason

  const {error} = await supabase
    .from('resignation_applications')
    .update(updateData)
    .eq('id', draftId)
    .eq('is_draft', true)

  if (error) {
    console.error('更新离职申请草稿失败:', error)
    return false
  }

  return true
}

/**
 * 提交离职申请草稿（转为正式申请）
 */
export async function submitDraftResignationApplication(draftId: string): Promise<boolean> {
  const {error} = await supabase.from('resignation_applications').update({is_draft: false}).eq('id', draftId)

  if (error) {
    console.error('提交离职申请草稿失败:', error)
    return false
  }

  return true
}

/**
 * 删除离职申请草稿
 */
export async function deleteDraftResignationApplication(draftId: string): Promise<boolean> {
  const {error} = await supabase.from('resignation_applications').delete().eq('id', draftId).eq('is_draft', true)

  if (error) {
    console.error('删除离职申请草稿失败:', error)
    return false
  }

  return true
}

/**
 * 获取用户的离职申请草稿列表
 */
export async function getDraftResignationApplications(userId: string): Promise<ResignationApplication[]> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_draft', true)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取离职申请草稿失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取用户的所有离职申请（不包括草稿）
 */
export async function getResignationApplicationsByUser(userId: string): Promise<ResignationApplication[]> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_draft', false)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取离职申请失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取仓库的所有离职申请
 */
export async function getResignationApplicationsByWarehouse(warehouseId: string): Promise<ResignationApplication[]> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取仓库离职申请失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取所有离职申请（超级管理员）
 */
export async function getAllResignationApplications(): Promise<ResignationApplication[]> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .select('*')
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取所有离职申请失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 审批离职申请
 */
export async function reviewResignationApplication(
  applicationId: string,
  review: ApplicationReviewInput
): Promise<boolean> {
  const {error} = await supabase
    .from('resignation_applications')
    .update({
      status: review.status,
      reviewer_id: review.reviewer_id,
      review_comment: review.review_comment || null,
      reviewed_at: review.reviewed_at
    })
    .eq('id', applicationId)

  if (error) {
    console.error('审批离职申请失败:', error)
    return false
  }

  return true
}

/**
 * 获取仓库设置
 */
export async function getWarehouseSettings(warehouseId: string): Promise<{
  max_leave_days: number
  resignation_notice_days: number
} | null> {
  const {data, error} = await supabase
    .from('warehouses')
    .select('max_leave_days, resignation_notice_days')
    .eq('id', warehouseId)
    .maybeSingle()

  if (error) {
    console.error('获取仓库设置失败:', error)
    return null
  }

  return data
}

/**
 * 更新仓库设置
 */
export async function updateWarehouseSettings(
  warehouseId: string,
  settings: {
    max_leave_days?: number
    resignation_notice_days?: number
  }
): Promise<boolean> {
  const {error} = await supabase.from('warehouses').update(settings).eq('id', warehouseId)

  if (error) {
    console.error('更新仓库设置失败:', error)
    return false
  }

  return true
}

/**
 * 验证请假申请
 */
export async function validateLeaveApplication(
  warehouseId: string,
  days: number
): Promise<{
  valid: boolean
  maxDays: number
  message?: string
}> {
  const settings = await getWarehouseSettings(warehouseId)

  if (!settings) {
    return {
      valid: false,
      maxDays: 7,
      message: '无法获取仓库设置'
    }
  }

  const {max_leave_days} = settings

  if (days > max_leave_days) {
    return {
      valid: false,
      maxDays: max_leave_days,
      message: `请假天数(${days}天)超过仓库上限(${max_leave_days}天)，需要管理员手动补录`
    }
  }

  return {
    valid: true,
    maxDays: max_leave_days
  }
}

/**
 * 验证离职日期
 */
export async function validateResignationDate(
  warehouseId: string,
  date: string
): Promise<{
  valid: boolean
  minDate: string
  noticeDays: number
  message?: string
}> {
  const settings = await getWarehouseSettings(warehouseId)

  if (!settings) {
    return {
      valid: false,
      minDate: '',
      noticeDays: 30,
      message: '无法获取仓库设置'
    }
  }

  const {resignation_notice_days} = settings

  // 计算最早可选日期
  const today = new Date()
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + resignation_notice_days)

  const minDateStr = getLocalDateString(minDate)
  const selectedDate = new Date(date)

  if (selectedDate < minDate) {
    return {
      valid: false,
      minDate: minDateStr,
      noticeDays: resignation_notice_days,
      message: `离职日期必须在${minDateStr}之后（需提前${resignation_notice_days}天）`
    }
  }

  return {
    valid: true,
    minDate: minDateStr,
    noticeDays: resignation_notice_days
  }
}

/**
 * 获取仓库绑定的司机数量
 */
export async function getWarehouseDriverCount(warehouseId: string): Promise<number> {
  const {count, error} = await supabase
    .from('driver_warehouses')
    .select('*', {count: 'exact', head: true})
    .eq('warehouse_id', warehouseId)

  if (error) {
    console.error('获取仓库司机数量失败:', error)
    return 0
  }

  return count || 0
}

/**
 * 获取仓库的主要管理员信息
 */
export async function getWarehouseManager(warehouseId: string): Promise<Profile | null> {
  const {data, error} = await supabase
    .from('manager_warehouses')
    .select(
      `
      profile:profiles (
        id,
        name,
        phone,
        email,
        role,
        created_at
      )
    `
    )
    .eq('warehouse_id', warehouseId)
    .order('created_at', {ascending: true})
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('获取仓库管理员失败:', error)
    return null
  }

  if (!data || !data.profile) {
    return null
  }

  return data.profile as unknown as Profile
}

/**
 * 获取用户当月已申请的请假天数（仅统计已通过的申请）
 */
export async function getMonthlyLeaveCount(userId: string, year: number, month: number): Promise<number> {
  // 构造月份的开始和结束日期
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = getLocalDateString(new Date(year, month, 0)) // 月份最后一天

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
 */
export async function getMonthlyPendingLeaveCount(userId: string, year: number, month: number): Promise<number> {
  // 构造月份的开始和结束日期
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = getLocalDateString(new Date(year, month, 0))

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
    .from('attendance_records')
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

  // 获取已批准的请假记录
  const {data: leaveData, error: leaveError} = await supabase
    .from('leave_applications')
    .select('start_date, end_date')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .or(
      `and(start_date.gte.${startDate},start_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate})`
    )

  if (leaveError) {
    console.error('获取请假记录失败:', leaveError)
    return {attendanceDays, lateDays, leaveDays: 0}
  }

  // 计算请假天数
  let leaveDays = 0
  if (leaveData && leaveData.length > 0) {
    for (const record of leaveData) {
      const start = new Date(Math.max(new Date(record.start_date).getTime(), new Date(startDate).getTime()))
      const end = new Date(Math.min(new Date(record.end_date).getTime(), new Date(endDate).getTime()))
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      if (days > 0) {
        leaveDays += days
      }
    }
  }

  return {
    attendanceDays,
    lateDays,
    leaveDays
  }
}

// ==================== 个人中心相关API ====================

/**
 * 上传头像到Supabase Storage
 * @param userId 用户ID
 * @param file 文件对象
 * @returns 头像URL
 */
export async function uploadAvatar(
  userId: string,
  file: {path: string; size: number; name?: string; originalFileObj?: File}
): Promise<{success: boolean; url?: string; error?: string}> {
  try {
    // 检查文件大小（最大1MB）
    if (file.size > 1048576) {
      return {success: false, error: '头像文件大小不能超过1MB'}
    }

    // 生成文件名
    const timestamp = Date.now()
    const ext = file.name?.split('.').pop() || 'jpg'
    const fileName = `${userId}/avatar_${timestamp}.${ext}`

    // 准备文件内容
    const fileContent = file.originalFileObj || ({tempFilePath: file.path} as any)

    // 上传到Supabase Storage
    const {data, error} = await supabase.storage.from('app-7cdqf07mbu9t_avatars').upload(fileName, fileContent, {
      cacheControl: '3600',
      upsert: true
    })

    if (error) {
      console.error('上传头像失败:', error)
      return {success: false, error: error.message}
    }

    // 获取公开URL
    const {data: urlData} = supabase.storage.from('app-7cdqf07mbu9t_avatars').getPublicUrl(fileName)

    return {success: true, url: urlData.publicUrl}
  } catch (error) {
    console.error('上传头像异常:', error)
    return {success: false, error: '上传头像失败'}
  }
}

/**
 * 更新用户个人信息
 * @param userId 用户ID
 * @param updates 更新的字段
 * @returns 更新结果
 */
export async function updateUserProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<{success: boolean; error?: string}> {
  try {
    const {error} = await supabase.from('profiles').update(updates).eq('id', userId)

    if (error) {
      console.error('更新个人信息失败:', error)
      return {success: false, error: error.message}
    }

    return {success: true}
  } catch (error) {
    console.error('更新个人信息异常:', error)
    return {success: false, error: '更新个人信息失败'}
  }
}

/**
 * 修改密码
 * @param newPassword 新密码
 * @returns 修改结果
 */
export async function changePassword(newPassword: string): Promise<{success: boolean; error?: string}> {
  try {
    const {error} = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('修改密码失败:', error)
      return {success: false, error: error.message}
    }

    return {success: true}
  } catch (error) {
    console.error('修改密码异常:', error)
    return {success: false, error: '修改密码失败'}
  }
}

/**
 * 提交意见反馈
 * @param input 反馈信息
 * @returns 提交结果
 */
export async function submitFeedback(input: FeedbackInput): Promise<{success: boolean; error?: string}> {
  try {
    const {error} = await supabase.from('feedback').insert({
      user_id: input.user_id,
      type: input.type,
      content: input.content,
      contact: input.contact || null,
      status: 'pending'
    })

    if (error) {
      console.error('提交反馈失败:', error)
      return {success: false, error: error.message}
    }

    return {success: true}
  } catch (error) {
    console.error('提交反馈异常:', error)
    return {success: false, error: '提交反馈失败'}
  }
}

/**
 * 获取用户的反馈列表
 * @param userId 用户ID
 * @returns 反馈列表
 */
export async function getUserFeedbackList(userId: string): Promise<Feedback[]> {
  try {
    const {data, error} = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', {ascending: false})

    if (error) {
      console.error('获取反馈列表失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取反馈列表异常:', error)
    return []
  }
}

/**
 * 获取所有反馈列表（管理员）
 * @returns 反馈列表
 */
export async function getAllFeedbackList(): Promise<Feedback[]> {
  try {
    const {data, error} = await supabase.from('feedback').select('*').order('created_at', {ascending: false})

    if (error) {
      console.error('获取所有反馈失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取所有反馈异常:', error)
    return []
  }
}

/**
 * 更新反馈状态（管理员）
 * @param feedbackId 反馈ID
 * @param status 新状态
 * @returns 更新结果
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): Promise<{success: boolean; error?: string}> {
  try {
    const {error} = await supabase.from('feedback').update({status}).eq('id', feedbackId)

    if (error) {
      console.error('更新反馈状态失败:', error)
      return {success: false, error: error.message}
    }

    return {success: true}
  } catch (error) {
    console.error('更新反馈状态异常:', error)
    return {success: false, error: '更新反馈状态失败'}
  }
}

// ==================== 仪表盘统计API ====================

/**
 * 仪表盘统计数据接口
 */
export interface DashboardStats {
  todayAttendance: number // 今日出勤人数
  todayPieceCount: number // 当日总件数
  pendingLeaveCount: number // 请假待审批
  monthlyPieceCount: number // 本月完成件数
  driverList: Array<{
    id: string
    name: string
    phone: string
    todayAttendance: boolean
    todayPieceCount: number
  }>
}

/**
 * 获取单个仓库的仪表盘统计数据
 * @param warehouseId 仓库ID
 * @returns 仪表盘统计数据
 */
export async function getWarehouseDashboardStats(warehouseId: string): Promise<DashboardStats> {
  const today = getLocalDateString()
  const firstDayOfMonth = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  // 1. 获取该仓库的所有司机ID
  const {data: driverWarehouseData} = await supabase
    .from('driver_warehouses')
    .select('driver_id')
    .eq('warehouse_id', warehouseId)

  const driverIds = driverWarehouseData?.map((dw) => dw.driver_id) || []

  // 2. 并行执行所有统计查询
  const [
    todayAttendanceResult,
    todayPieceResult,
    pendingLeaveResult,
    monthlyPieceResult,
    driversResult,
    allTodayAttendanceResult,
    allTodayPieceResult
  ] = await Promise.all([
    // 今日出勤人数
    supabase
      .from('attendance_records')
      .select('user_id')
      .eq('warehouse_id', warehouseId)
      .eq('work_date', today),
    // 当日总件数
    supabase
      .from('piece_work_records')
      .select('quantity')
      .eq('warehouse_id', warehouseId)
      .eq('work_date', today),
    // 请假待审批数量
    supabase
      .from('leave_applications')
      .select('id')
      .eq('warehouse_id', warehouseId)
      .eq('status', 'pending'),
    // 本月完成件数
    supabase
      .from('piece_work_records')
      .select('quantity')
      .eq('warehouse_id', warehouseId)
      .gte('work_date', firstDayOfMonth),
    // 司机基本信息（仅当有司机时查询）
    driverIds.length > 0
      ? supabase.from('profiles').select('id, name, phone').in('id', driverIds)
      : Promise.resolve({data: null}),
    // 所有司机的今日考勤记录（批量查询）
    driverIds.length > 0
      ? supabase.from('attendance_records').select('user_id').in('user_id', driverIds).eq('work_date', today)
      : Promise.resolve({data: null}),
    // 所有司机的今日计件记录（批量查询）
    driverIds.length > 0
      ? supabase.from('piece_work_records').select('user_id, quantity').in('user_id', driverIds).eq('work_date', today)
      : Promise.resolve({data: null})
  ])

  // 3. 处理统计数据
  const todayAttendance = todayAttendanceResult.data?.length || 0
  const todayPieceCount = todayPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0
  const pendingLeaveCount = pendingLeaveResult.data?.length || 0
  const monthlyPieceCount = monthlyPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0

  // 4. 构建司机列表（使用批量查询结果）
  const driverList: DashboardStats['driverList'] = []

  if (driversResult.data && driversResult.data.length > 0) {
    // 创建考勤和计件的快速查找Map
    const attendanceMap = new Set(allTodayAttendanceResult.data?.map((record) => record.user_id) || [])

    const pieceCountMap = new Map<string, number>()
    allTodayPieceResult.data?.forEach((record) => {
      const currentCount = pieceCountMap.get(record.user_id) || 0
      pieceCountMap.set(record.user_id, currentCount + (record.quantity || 0))
    })

    // 构建司机列表
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
 * 获取所有仓库的汇总统计数据（超级管理员使用）
 * @returns 汇总统计数据
 */
export async function getAllWarehousesDashboardStats(): Promise<DashboardStats> {
  console.log('[getAllWarehousesDashboardStats] 开始加载所有仓库数据')

  const today = getLocalDateString()
  const firstDayOfMonth = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  console.log('[getAllWarehousesDashboardStats] 日期:', {today, firstDayOfMonth})

  // 并行执行所有统计查询
  const [
    allDriversResult,
    todayAttendanceResult,
    todayPieceResult,
    pendingLeaveResult,
    monthlyPieceResult,
    allTodayAttendanceResult,
    allTodayPieceResult
  ] = await Promise.all([
    // 所有司机基本信息
    supabase
      .from('profiles')
      .select('id, name, phone')
      .eq('role', 'driver'),
    // 今日出勤人数（所有仓库）
    supabase
      .from('attendance_records')
      .select('user_id')
      .eq('work_date', today),
    // 当日总件数（所有仓库）
    supabase
      .from('piece_work_records')
      .select('quantity')
      .eq('work_date', today),
    // 请假待审批数量（所有仓库）
    supabase
      .from('leave_applications')
      .select('id')
      .eq('status', 'pending'),
    // 本月完成件数（所有仓库）
    supabase
      .from('piece_work_records')
      .select('quantity')
      .gte('work_date', firstDayOfMonth),
    // 所有司机的今日考勤记录（批量查询）
    supabase
      .from('attendance_records')
      .select('user_id')
      .eq('work_date', today),
    // 所有司机的今日计件记录（批量查询）
    supabase
      .from('piece_work_records')
      .select('user_id, quantity')
      .eq('work_date', today)
  ])

  console.log('[getAllWarehousesDashboardStats] 查询结果:', {
    allDrivers: allDriversResult.data?.length || 0,
    todayAttendance: todayAttendanceResult.data?.length || 0,
    todayPiece: todayPieceResult.data?.length || 0,
    pendingLeave: pendingLeaveResult.data?.length || 0,
    monthlyPiece: monthlyPieceResult.data?.length || 0
  })

  // 检查错误
  if (allDriversResult.error) {
    console.error('[getAllWarehousesDashboardStats] 查询司机失败:', allDriversResult.error)
  }
  if (todayAttendanceResult.error) {
    console.error('[getAllWarehousesDashboardStats] 查询今日出勤失败:', todayAttendanceResult.error)
  }
  if (todayPieceResult.error) {
    console.error('[getAllWarehousesDashboardStats] 查询今日计件失败:', todayPieceResult.error)
  }
  if (pendingLeaveResult.error) {
    console.error('[getAllWarehousesDashboardStats] 查询待审批请假失败:', pendingLeaveResult.error)
  }
  if (monthlyPieceResult.error) {
    console.error('[getAllWarehousesDashboardStats] 查询本月计件失败:', monthlyPieceResult.error)
  }

  // 处理统计数据
  const todayAttendance = todayAttendanceResult.data?.length || 0
  const todayPieceCount = todayPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0
  const pendingLeaveCount = pendingLeaveResult.data?.length || 0
  const monthlyPieceCount = monthlyPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0

  console.log('[getAllWarehousesDashboardStats] 统计数据:', {
    todayAttendance,
    todayPieceCount,
    pendingLeaveCount,
    monthlyPieceCount
  })

  // 构建司机列表（使用批量查询结果）
  const driverList: DashboardStats['driverList'] = []

  if (allDriversResult.data && allDriversResult.data.length > 0) {
    // 创建考勤和计件的快速查找Map
    const attendanceMap = new Set(allTodayAttendanceResult.data?.map((record) => record.user_id) || [])

    const pieceCountMap = new Map<string, number>()
    allTodayPieceResult.data?.forEach((record) => {
      const currentCount = pieceCountMap.get(record.user_id) || 0
      pieceCountMap.set(record.user_id, currentCount + (record.quantity || 0))
    })

    // 构建司机列表
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

  console.log('[getAllWarehousesDashboardStats] 司机列表:', driverList.length)

  const result = {
    todayAttendance,
    todayPieceCount,
    pendingLeaveCount,
    monthlyPieceCount,
    driverList
  }

  console.log('[getAllWarehousesDashboardStats] 返回结果:', result)

  return result
}

/**
 * ==================== 权限管理相关 API ====================
 */

/**
 * 获取所有用户列表（超级管理员）
 */
export async function getAllUsers(): Promise<Profile[]> {
  const {data, error} = await supabase.from('profiles').select('*').order('created_at', {ascending: false})

  if (error) {
    console.error('获取用户列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 修改用户角色（超级管理员）
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  const {error} = await supabase.from('profiles').update({role}).eq('id', userId)

  if (error) {
    console.error('修改用户角色失败:', error)
    return false
  }

  return true
}

/**
 * 获取管理员权限配置
 */
export async function getManagerPermission(managerId: string): Promise<ManagerPermission | null> {
  const {data, error} = await supabase.from('manager_permissions').select('*').eq('manager_id', managerId).maybeSingle()

  if (error) {
    console.error('获取管理员权限失败:', error)
    return null
  }

  return data
}

/**
 * 创建或更新管理员权限配置
 */
export async function upsertManagerPermission(input: ManagerPermissionInput): Promise<boolean> {
  const {error} = await supabase.from('manager_permissions').upsert(
    {
      manager_id: input.manager_id,
      can_edit_user_info: input.can_edit_user_info ?? false,
      can_edit_piece_work: input.can_edit_piece_work ?? false,
      can_manage_attendance_rules: input.can_manage_attendance_rules ?? false,
      can_manage_system: input.can_manage_system ?? false
    },
    {onConflict: 'manager_id'}
  )

  if (error) {
    console.error('更新管理员权限失败:', error)
    return false
  }

  return true
}

/**
 * 获取管理员管辖的仓库ID列表
 */
export async function getManagerWarehouseIds(managerId: string): Promise<string[]> {
  const {data, error} = await supabase.from('manager_warehouses').select('warehouse_id').eq('manager_id', managerId)

  if (error) {
    console.error('获取管理员仓库列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data.map((item) => item.warehouse_id) : []
}

/**
 * 设置管理员管辖的仓库（先删除旧的，再插入新的）
 */
export async function setManagerWarehouses(managerId: string, warehouseIds: string[]): Promise<boolean> {
  // 1. 删除旧的关联
  const {error: deleteError} = await supabase.from('manager_warehouses').delete().eq('manager_id', managerId)

  if (deleteError) {
    console.error('删除旧的仓库关联失败:', deleteError)
    return false
  }

  // 2. 如果没有新的仓库，直接返回成功
  if (warehouseIds.length === 0) {
    return true
  }

  // 3. 插入新的关联
  const insertData = warehouseIds.map((warehouseId) => ({
    manager_id: managerId,
    warehouse_id: warehouseId
  }))

  const {error: insertError} = await supabase.from('manager_warehouses').insert(insertData)

  if (insertError) {
    console.error('插入新的仓库关联失败:', insertError)
    return false
  }

  return true
}

/**
 * 获取仓库的品类列表
 */
export async function getWarehouseCategories(warehouseId: string): Promise<string[]> {
  const {data, error} = await supabase
    .from('warehouse_categories')
    .select('category_id')
    .eq('warehouse_id', warehouseId)

  if (error) {
    console.error('获取仓库品类列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data.map((item) => item.category_id) : []
}

/**
 * 设置仓库的品类（先删除旧的，再插入新的）
 */
export async function setWarehouseCategories(warehouseId: string, categoryIds: string[]): Promise<boolean> {
  // 1. 删除旧的关联
  const {error: deleteError} = await supabase.from('warehouse_categories').delete().eq('warehouse_id', warehouseId)

  if (deleteError) {
    console.error('删除旧的品类关联失败:', deleteError)
    return false
  }

  // 2. 如果没有新的品类，直接返回成功
  if (categoryIds.length === 0) {
    return true
  }

  // 3. 插入新的关联
  const insertData = categoryIds.map((categoryId) => ({
    warehouse_id: warehouseId,
    category_id: categoryId
  }))

  const {error: insertError} = await supabase.from('warehouse_categories').insert(insertData)

  if (insertError) {
    console.error('插入新的品类关联失败:', insertError)
    return false
  }

  return true
}

/**
 * 获取当前用户的权限配置（用于权限检查）
 */
export async function getCurrentUserPermissions(): Promise<ManagerPermission | null> {
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return getManagerPermission(user.id)
}

/**
 * 创建司机账号
 * @param phone 手机号
 * @param name 姓名
 * @returns 创建的司机资料，如果失败返回null
 */
export async function createDriver(phone: string, name: string): Promise<Profile | null> {
  try {
    // 检查手机号是否已存在
    const {data: existingProfiles} = await supabase.from('profiles').select('*').eq('phone', phone).maybeSingle()

    if (existingProfiles) {
      return null // 手机号已存在
    }

    // 创建新的司机资料
    const {data, error} = await supabase
      .from('profiles')
      .insert({
        phone,
        name,
        role: 'driver'
      })
      .select()
      .maybeSingle()

    if (error || !data) {
      console.error('创建司机失败:', error)
      return null
    }

    return data as Profile
  } catch (error) {
    console.error('创建司机异常:', error)
    return null
  }
}

/**
 * 获取司机端个人页面统计数据
 */
export async function getDriverStats(userId: string): Promise<{
  monthAttendanceDays: number
  monthPieceWorkIncome: number
  monthLeaveDays: number
  totalWarehouses: number
} | null> {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const monthStart = `${year}-${month}-01`
    const monthEnd = `${year}-${month}-31`

    // 获取本月考勤天数
    const {data: attendanceData} = await supabase
      .from('attendance_records')
      .select('id')
      .eq('user_id', userId)
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd)

    const monthAttendanceDays = Array.isArray(attendanceData) ? attendanceData.length : 0

    // 获取本月计件收入
    const {data: pieceWorkData} = await supabase
      .from('piece_work_records')
      .select('total_amount')
      .eq('user_id', userId)
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd)

    const monthPieceWorkIncome = Array.isArray(pieceWorkData)
      ? pieceWorkData.reduce((sum, record) => sum + (record.total_amount || 0), 0)
      : 0

    // 获取本月请假天数
    const {data: leaveData} = await supabase
      .from('leave_applications')
      .select('start_date, end_date')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('start_date', monthStart)
      .lte('end_date', monthEnd)

    let monthLeaveDays = 0
    if (Array.isArray(leaveData)) {
      for (const leave of leaveData) {
        const start = new Date(leave.start_date)
        const end = new Date(leave.end_date)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        monthLeaveDays += days
      }
    }

    // 获取分配的仓库数
    const {data: warehouseData} = await supabase.from('driver_warehouses').select('id').eq('driver_id', userId)

    const totalWarehouses = Array.isArray(warehouseData) ? warehouseData.length : 0

    return {
      monthAttendanceDays,
      monthPieceWorkIncome,
      monthLeaveDays,
      totalWarehouses
    }
  } catch (error) {
    console.error('获取司机统计数据失败:', error)
    return null
  }
}

/**
 * 获取管理员端个人页面统计数据
 */
export async function getManagerStats(userId: string): Promise<{
  totalWarehouses: number
  totalDrivers: number
  pendingLeaveCount: number
  monthPieceWorkTotal: number
} | null> {
  try {
    // 获取管理的仓库数
    const {data: warehouseData} = await supabase
      .from('manager_warehouses')
      .select('warehouse_id')
      .eq('manager_id', userId)

    const totalWarehouses = Array.isArray(warehouseData) ? warehouseData.length : 0
    const warehouseIds = Array.isArray(warehouseData) ? warehouseData.map((w) => w.warehouse_id) : []

    // 获取管理的司机数（通过仓库关联）
    let totalDrivers = 0
    if (warehouseIds.length > 0) {
      const {data: driverData} = await supabase
        .from('driver_warehouses')
        .select('driver_id')
        .in('warehouse_id', warehouseIds)

      // 去重统计司机数
      const uniqueDrivers = new Set(Array.isArray(driverData) ? driverData.map((d) => d.driver_id) : [])
      totalDrivers = uniqueDrivers.size
    }

    // 获取待审批请假数
    let pendingLeaveCount = 0
    if (warehouseIds.length > 0) {
      const {data: leaveData} = await supabase
        .from('leave_applications')
        .select('id')
        .in('warehouse_id', warehouseIds)
        .eq('status', 'pending')

      pendingLeaveCount = Array.isArray(leaveData) ? leaveData.length : 0
    }

    // 获取本月计件总额
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const monthStart = `${year}-${month}-01`
    const monthEnd = `${year}-${month}-31`

    let monthPieceWorkTotal = 0
    if (warehouseIds.length > 0) {
      const {data: pieceWorkData} = await supabase
        .from('piece_work_records')
        .select('total_amount')
        .in('warehouse_id', warehouseIds)
        .gte('work_date', monthStart)
        .lte('work_date', monthEnd)

      monthPieceWorkTotal = Array.isArray(pieceWorkData)
        ? pieceWorkData.reduce((sum, record) => sum + (record.total_amount || 0), 0)
        : 0
    }

    return {
      totalWarehouses,
      totalDrivers,
      pendingLeaveCount,
      monthPieceWorkTotal
    }
  } catch (error) {
    console.error('获取管理员统计数据失败:', error)
    return null
  }
}

/**
 * 获取超级管理员端个人页面统计数据
 */
export async function getSuperAdminStats(): Promise<{
  totalWarehouses: number
  totalDrivers: number
  totalManagers: number
  pendingLeaveCount: number
  monthPieceWorkTotal: number
  totalUsers: number
} | null> {
  try {
    // 获取总仓库数
    const {data: warehouseData} = await supabase.from('warehouses').select('id').eq('is_active', true)

    const totalWarehouses = Array.isArray(warehouseData) ? warehouseData.length : 0

    // 获取总司机数
    const {data: driverData} = await supabase.from('profiles').select('id').eq('role', 'driver')

    const totalDrivers = Array.isArray(driverData) ? driverData.length : 0

    // 获取总管理员数
    const {data: managerData} = await supabase.from('profiles').select('id').eq('role', 'manager')

    const totalManagers = Array.isArray(managerData) ? managerData.length : 0

    // 获取待审批请假数
    const {data: leaveData} = await supabase.from('leave_applications').select('id').eq('status', 'pending')

    const pendingLeaveCount = Array.isArray(leaveData) ? leaveData.length : 0

    // 获取本月计件总额
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const monthStart = `${year}-${month}-01`
    const monthEnd = `${year}-${month}-31`

    const {data: pieceWorkData} = await supabase
      .from('piece_work_records')
      .select('total_amount')
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd)

    const monthPieceWorkTotal = Array.isArray(pieceWorkData)
      ? pieceWorkData.reduce((sum, record) => sum + (record.total_amount || 0), 0)
      : 0

    // 获取总用户数
    const {data: userData} = await supabase.from('profiles').select('id')

    const totalUsers = Array.isArray(userData) ? userData.length : 0

    return {
      totalWarehouses,
      totalDrivers,
      totalManagers,
      pendingLeaveCount,
      monthPieceWorkTotal,
      totalUsers
    }
  } catch (error) {
    console.error('获取超级管理员统计数据失败:', error)
    return null
  }
}

/**
 * 重置用户密码（超级管理员功能）
 * 将用户密码重置为 123456
 */
export async function resetUserPassword(userId: string): Promise<boolean> {
  try {
    // 使用 Supabase Admin API 重置密码
    const {error} = await supabase.auth.admin.updateUserById(userId, {
      password: '123456'
    })

    if (error) {
      console.error('重置密码失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('重置密码失败:', error)
    return false
  }
}

/**
 * 更新用户完整信息（超级管理员功能）
 */
export async function updateUserInfo(
  userId: string,
  updates: {
    name?: string
    phone?: string
    email?: string
    role?: UserRole
  }
): Promise<boolean> {
  try {
    const {error} = await supabase.from('profiles').update(updates).eq('id', userId)

    if (error) {
      console.error('更新用户信息失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return false
  }
}

/**
 * 根据用户ID获取用户信息
 */
export async function getUserById(userId: string): Promise<Profile | null> {
  try {
    const {data, error} = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

    if (error) {
      console.error('获取用户信息失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

/**
 * 获取用户当日已批准的请假记录
 * @param userId 用户ID
 * @returns 请假记录，如果没有则返回null
 */
export async function getApprovedLeaveForToday(userId: string): Promise<LeaveApplication | null> {
  try {
    const today = getLocalDateString()

    const {data, error} = await supabase
      .from('leave_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', {ascending: false})
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
 * 撤销请假申请
 *
 * 撤销规则：
 * 1. 可撤销状态：待审批(pending)、已批准(approved)
 * 2. 不可撤销：已驳回(rejected)、已撤销(cancelled)、假期已完全过去
 * 3. 时效性：假期结束日期之前都可以撤销（包括假期当天）
 *
 * @param leaveId 请假记录ID
 * @param userId 用户ID（用于权限验证）
 * @returns 是否成功
 */
export async function cancelLeaveApplication(leaveId: string, userId: string): Promise<boolean> {
  try {
    // 先检查请假记录是否属于该用户
    const {data: leave, error: fetchError} = await supabase
      .from('leave_applications')
      .select('*')
      .eq('id', leaveId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('[cancelLeaveApplication] 查询请假记录失败:', fetchError)
      return false
    }

    if (!leave) {
      console.error('[cancelLeaveApplication] 请假记录不存在或无权限')
      return false
    }

    // 只能撤销待审批或已批准的请假
    if (leave.status !== 'pending' && leave.status !== 'approved') {
      console.error('[cancelLeaveApplication] 只能撤销待审批或已批准的请假')
      return false
    }

    // 检查假期是否已完全过去
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const endDate = new Date(leave.end_date)
    endDate.setHours(23, 59, 59, 999)

    // 如果假期已完全过去，不能撤销
    if (today > endDate) {
      console.error('[cancelLeaveApplication] 假期已完全过去，不能撤销')
      return false
    }

    // 更新状态为已撤销
    const {error: updateError} = await supabase
      .from('leave_applications')
      .update({
        status: 'cancelled',
        review_comment: '司机主动撤销'
      })
      .eq('id', leaveId)

    if (updateError) {
      console.error('[cancelLeaveApplication] 更新失败:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('[cancelLeaveApplication] 未预期的错误:', error)
    return false
  }
}

/**
 * 撤销离职申请
 * 只能撤销待审批状态的离职申请
 */
export async function cancelResignationApplication(resignationId: string, userId: string): Promise<boolean> {
  try {
    // 先检查离职申请是否属于该用户
    const {data: resignation, error: fetchError} = await supabase
      .from('resignation_applications')
      .select('*')
      .eq('id', resignationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('[cancelResignationApplication] 查询离职申请失败:', fetchError)
      return false
    }

    if (!resignation) {
      console.error('[cancelResignationApplication] 离职申请不存在或无权限')
      return false
    }

    // 只能撤销待审批状态的离职申请
    if (resignation.status !== 'pending') {
      console.error('[cancelResignationApplication] 只能撤销待审批状态的离职申请')
      return false
    }

    // 更新状态为已撤销
    const {error: updateError} = await supabase
      .from('resignation_applications')
      .update({
        status: 'cancelled',
        review_comment: '司机主动撤销'
      })
      .eq('id', resignationId)

    if (updateError) {
      console.error('[cancelResignationApplication] 更新失败:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('[cancelResignationApplication] 未预期的错误:', error)
    return false
  }
}
