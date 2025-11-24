import {supabase} from '@/client/supabase'
import {CACHE_KEYS, clearCache, clearCacheByPrefix, getCache, setCache} from '@/utils/cache'
import {createLogger} from '@/utils/logger'
import type {
  ApplicationReviewInput,
  AttendanceRecord,
  AttendanceRecordInput,
  AttendanceRecordUpdate,
  AttendanceRule,
  AttendanceRuleInput,
  AttendanceRuleUpdate,
  CategoryPrice,
  CategoryPriceInput,
  DriverLicense,
  DriverLicenseInput,
  DriverLicenseUpdate,
  DriverType,
  DriverWarehouse,
  DriverWarehouseInput,
  Feedback,
  FeedbackInput,
  FeedbackStatus,
  LeaveApplication,
  LeaveApplicationInput,
  LockedPhotos,
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
  Vehicle,
  VehicleInput,
  VehicleUpdate,
  VehicleWithDriver,
  VehicleWithDriverDetails,
  Warehouse,
  WarehouseInput,
  WarehouseUpdate,
  WarehouseWithRule
} from './types'

// 创建数据库操作日志记录器
const logger = createLogger('DatabaseAPI')

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
 * 获取当前用户档案（包含真实姓名）
 * 用于需要显示操作人真实姓名的场景，如通知消息
 */
export async function getCurrentUserWithRealName(): Promise<(Profile & {real_name: string | null}) | null> {
  try {
    console.log('[getCurrentUserWithRealName] 开始获取当前用户（含真实姓名）')
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserWithRealName] 获取认证用户失败:', authError)
      return null
    }

    if (!user) {
      console.warn('[getCurrentUserWithRealName] 用户未登录')
      return null
    }

    console.log('[getCurrentUserWithRealName] 当前用户ID:', user.id)

    // 查询用户档案，并 LEFT JOIN driver_licenses 表获取真实姓名
    const {data, error} = await supabase
      .from('profiles')
      .select(
        `
        *,
        driver_licenses (
          id_card_name
        )
      `
      )
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[getCurrentUserWithRealName] 查询用户档案失败:', error)
      return null
    }

    if (!data) {
      console.warn('[getCurrentUserWithRealName] 用户档案不存在，用户ID:', user.id)
      return null
    }

    // 提取真实姓名
    const realName = (data.driver_licenses as any)?.id_card_name || null

    console.log('[getCurrentUserWithRealName] 成功获取用户档案:', {
      id: data.id,
      name: data.name,
      real_name: realName,
      role: data.role
    })

    // 返回包含真实姓名的用户信息
    return {
      ...data,
      real_name: realName
    }
  } catch (error) {
    console.error('[getCurrentUserWithRealName] 未预期的错误:', error)
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

/**
 * 获取所有司机档案（包含实名信息）
 * 通过LEFT JOIN driver_licenses表获取身份证姓名
 */
export async function getAllDriversWithRealName(): Promise<Array<Profile & {real_name: string | null}>> {
  logger.db('查询', 'profiles + driver_licenses', {role: 'driver'})
  try {
    const {data, error} = await supabase
      .from('profiles')
      .select(
        `
        *,
        driver_licenses!driver_licenses_driver_id_fkey(id_card_name)
      `
      )
      .eq('role', 'driver')
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('获取司机列表失败', error)
      return []
    }

    // 转换数据格式，提取real_name
    const drivers = (data || []).map((item: any) => {
      const {driver_licenses, ...profile} = item
      return {
        ...profile,
        real_name: driver_licenses?.id_card_name || null
      }
    })

    logger.info(`成功获取司机列表，共 ${drivers.length} 名司机`)
    return drivers
  } catch (error) {
    logger.error('获取司机列表异常', error)
    return []
  }
}

/**
 * 根据ID获取用户档案
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const {data, error} = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()

  if (error) {
    console.error('获取用户档案失败:', error)
    return null
  }

  return data
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
  const {data, error} = await supabase.from('attendance').insert(input).select().maybeSingle()

  if (error) {
    console.error('创建打卡记录失败:', error)
    return null
  }

  // 清除考勤缓存
  if (data) {
    const date = new Date(data.work_date)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const cacheKey = `${CACHE_KEYS.ATTENDANCE_MONTHLY}_${data.user_id}_${year}_${month}`
    clearCache(cacheKey)
    // 清除所有记录缓存
    const allCacheKey = `${CACHE_KEYS.ATTENDANCE_ALL_RECORDS}_${year}_${month}`
    clearCache(allCacheKey)
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

  // 清除考勤缓存（需要先获取记录信息）
  const {data: record} = await supabase.from('attendance').select('user_id, work_date').eq('id', id).maybeSingle()
  if (record) {
    const date = new Date(record.work_date)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const cacheKey = `${CACHE_KEYS.ATTENDANCE_MONTHLY}_${record.user_id}_${year}_${month}`
    clearCache(cacheKey)
    // 清除所有记录缓存
    const allCacheKey = `${CACHE_KEYS.ATTENDANCE_ALL_RECORDS}_${year}_${month}`
    clearCache(allCacheKey)
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
 * 使用30分钟缓存，减少频繁查询
 */
export async function getMonthlyAttendance(userId: string, year: number, month: number): Promise<AttendanceRecord[]> {
  console.log(`📊 [考勤查询] 开始查询 - 用户:${userId}, 年月:${year}-${month}`)

  // 生成缓存键
  const cacheKey = `${CACHE_KEYS.ATTENDANCE_MONTHLY}_${userId}_${year}_${month}`
  console.log(`🔑 [考勤查询] 缓存键: ${cacheKey}`)

  // 尝试从缓存获取
  const cached = getCache<AttendanceRecord[]>(cacheKey)
  if (cached) {
    console.log(`✅ [考勤查询] 使用缓存数据，记录数: ${cached.length}`)
    return cached
  }

  console.log(`🔄 [考勤查询] 缓存未命中，从数据库查询...`)

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
    console.error('❌ [考勤查询] 获取当月考勤记录失败:', error)
    return []
  }

  const result = Array.isArray(data) ? data : []
  console.log(`✅ [考勤查询] 数据库查询成功，记录数: ${result.length}`)

  // 缓存30分钟
  setCache(cacheKey, result, 30 * 60 * 1000)
  console.log(`💾 [考勤查询] 已缓存数据，有效期: 30分钟`)

  return result
}

/**
 * 获取所有用户的考勤记录（管理员使用）
 * 使用30分钟缓存，减少频繁查询
 */
export async function getAllAttendanceRecords(year?: number, month?: number): Promise<AttendanceRecord[]> {
  console.log(`📊 [管理员考勤查询] 开始查询 - 年月:${year || '全部'}-${month || '全部'}`)

  // 生成缓存键
  const cacheKey = `${CACHE_KEYS.ATTENDANCE_ALL_RECORDS}_${year || 'all'}_${month || 'all'}`
  console.log(`🔑 [管理员考勤查询] 缓存键: ${cacheKey}`)

  // 尝试从缓存获取
  const cached = getCache<AttendanceRecord[]>(cacheKey)
  if (cached) {
    console.log(`✅ [管理员考勤查询] 使用缓存数据，记录数: ${cached.length}`)
    return cached
  }

  console.log(`🔄 [管理员考勤查询] 缓存未命中，从数据库查询...`)

  let query = supabase.from('attendance').select('*')

  if (year && month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = getLocalDateString(new Date(year, month, 0))
    query = query.gte('work_date', startDate).lte('work_date', endDate)
  }

  const {data, error} = await query.order('work_date', {ascending: false})

  if (error) {
    console.error('❌ [管理员考勤查询] 获取所有考勤记录失败:', error)
    return []
  }

  const result = Array.isArray(data) ? data : []
  console.log(`✅ [管理员考勤查询] 数据库查询成功，记录数: ${result.length}`)

  // 缓存30分钟
  setCache(cacheKey, result, 30 * 60 * 1000)
  console.log(`💾 [管理员考勤查询] 已缓存数据，有效期: 30分钟`)

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

/**
 * 获取指定仓库在指定日期范围内的考勤记录
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

  if (startDate) {
    query = query.gte('work_date', startDate)
  }
  if (endDate) {
    query = query.lte('work_date', endDate)
  }

  const {data, error} = await query

  if (error) {
    console.error('获取仓库考勤记录失败:', error)
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
 * 获取仓库的考勤规则（返回最新的一条激活规则）
 */
export async function getAttendanceRuleByWarehouseId(warehouseId: string): Promise<AttendanceRule | null> {
  const {data, error} = await supabase
    .from('attendance_rules')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)
    .order('created_at', {ascending: false})
    .limit(1)

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
 * 获取所有仓库及其考勤规则（包括禁用的仓库，供超管使用）
 */
export async function getAllWarehousesWithRules(): Promise<WarehouseWithRule[]> {
  const warehouses = await getAllWarehouses()
  const rules = await getAllAttendanceRules()

  return warehouses.map((warehouse) => ({
    ...warehouse,
    rule: rules.find((rule) => rule.warehouse_id === warehouse.id)
  }))
}

/**
 * 获取司机的仓库列表
 */
export async function getDriverWarehouses(driverId: string): Promise<Warehouse[]> {
  console.log('=== getDriverWarehouses 调用 ===')
  console.log('司机ID:', driverId)

  const {data, error} = await supabase
    .from('driver_warehouses')
    .select('warehouse_id, warehouses(*)')
    .eq('driver_id', driverId)

  console.log('Supabase 查询响应 - data:', data)
  console.log('Supabase 查询响应 - error:', error)

  if (error) {
    console.error('❌ 获取司机仓库失败 - Supabase 错误:', error)
    console.error('错误详情:', JSON.stringify(error, null, 2))
    return []
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ 未找到司机的仓库分配记录')
    return []
  }

  // 提取仓库信息
  const warehouses = data.map((item: any) => item.warehouses).filter(Boolean)
  console.log('✅ 成功获取司机仓库，数量:', warehouses.length)
  console.log('仓库列表:', warehouses)

  return warehouses
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
export async function assignWarehouseToDriver(
  input: DriverWarehouseInput
): Promise<{success: boolean; error?: string}> {
  // 检查仓库是否被禁用
  const {data: warehouse, error: warehouseError} = await supabase
    .from('warehouses')
    .select('is_active, name')
    .eq('id', input.warehouse_id)
    .maybeSingle()

  if (warehouseError) {
    console.error('查询仓库状态失败:', warehouseError)
    return {success: false, error: '查询仓库状态失败'}
  }

  if (!warehouse) {
    console.error('仓库不存在:', input.warehouse_id)
    return {success: false, error: '仓库不存在'}
  }

  if (!warehouse.is_active) {
    console.error('仓库已被禁用，不允许分配司机:', warehouse.name)
    return {success: false, error: `仓库"${warehouse.name}"已被禁用，不允许分配司机`}
  }

  const {error} = await supabase.from('driver_warehouses').insert(input)

  if (error) {
    console.error('分配仓库失败:', error)
    return {success: false, error: '分配仓库失败'}
  }

  return {success: true}
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
 * 获取指定司机的仓库分配列表
 */
export async function getWarehouseAssignmentsByDriver(driverId: string): Promise<DriverWarehouse[]> {
  const {data, error} = await supabase
    .from('driver_warehouses')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取司机仓库分配失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 删除指定司机的所有仓库分配
 */
export async function deleteWarehouseAssignmentsByDriver(driverId: string): Promise<boolean> {
  const {error} = await supabase.from('driver_warehouses').delete().eq('driver_id', driverId)

  if (error) {
    console.error('删除司机仓库分配失败:', error)
    return false
  }

  return true
}

/**
 * 插入单个仓库分配
 */
export async function insertWarehouseAssignment(input: DriverWarehouseInput): Promise<boolean> {
  const {error} = await supabase.from('driver_warehouses').insert(input)

  if (error) {
    console.error('插入仓库分配失败:', error)
    return false
  }

  return true
}

/**
 * 批量设置司机的仓库
 */
export async function setDriverWarehouses(
  driverId: string,
  warehouseIds: string[]
): Promise<{success: boolean; error?: string}> {
  try {
    // 如果有新的仓库分配，先检查所有仓库是否都是启用状态
    if (warehouseIds.length > 0) {
      const {data: warehouses, error: warehouseError} = await supabase
        .from('warehouses')
        .select('id, name, is_active')
        .in('id', warehouseIds)

      if (warehouseError) {
        console.error('查询仓库状态失败:', warehouseError)
        return {success: false, error: '查询仓库状态失败'}
      }

      // 检查是否有被禁用的仓库
      const disabledWarehouses = warehouses?.filter((w) => !w.is_active) || []
      if (disabledWarehouses.length > 0) {
        const disabledNames = disabledWarehouses.map((w) => w.name).join('、')
        console.error('以下仓库已被禁用，不允许分配司机:', disabledNames)
        return {success: false, error: `以下仓库已被禁用，不允许分配司机：${disabledNames}`}
      }
    }

    // 先删除该司机的所有仓库分配
    const {error: deleteError} = await supabase.from('driver_warehouses').delete().eq('driver_id', driverId)

    if (deleteError) {
      console.error('删除旧仓库分配失败:', deleteError)
      return {success: false, error: '删除旧仓库分配失败'}
    }

    // 如果没有新的仓库分配，直接返回成功
    if (warehouseIds.length === 0) {
      return {success: true}
    }

    // 批量插入新的仓库分配
    const insertData = warehouseIds.map((warehouseId) => ({
      driver_id: driverId,
      warehouse_id: warehouseId
    }))

    const {error: insertError} = await supabase.from('driver_warehouses').insert(insertData)

    if (insertError) {
      console.error('插入新仓库分配失败:', insertError)
      return {success: false, error: '插入新仓库分配失败'}
    }

    return {success: true}
  } catch (error) {
    console.error('设置司机仓库失败:', error)
    return {success: false, error: '设置司机仓库失败'}
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
  const {data: categories} = await supabase.from('category_prices').select('*')
  const categoryMap = new Map(categories?.map((c) => [c.id, c.category_name]) || [])

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
    .from('category_prices')
    .select('*')
    .eq('is_active', true)
    .order('category_name', {ascending: true})

  if (error) {
    console.error('获取启用品类失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取所有品类（包括禁用的）
export async function getAllCategories(): Promise<PieceWorkCategory[]> {
  const {data, error} = await supabase.from('category_prices').select('*').order('category_name', {ascending: true})

  if (error) {
    console.error('获取所有品类失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 创建品类
export async function createCategory(category: PieceWorkCategoryInput): Promise<PieceWorkCategory | null> {
  const {data, error} = await supabase.from('category_prices').insert(category).select().maybeSingle()

  if (error) {
    console.error('创建品类失败:', error)
    return null
  }

  return data
}

// 更新品类
export async function updateCategory(id: string, updates: Partial<PieceWorkCategoryInput>): Promise<boolean> {
  const {error} = await supabase
    .from('category_prices')
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
  const {error} = await supabase.from('category_prices').delete().eq('id', id)

  if (error) {
    console.error('删除品类失败:', error)
    return false
  }

  return true
}

// 删除未被任何仓库使用的品类
export async function deleteUnusedCategories(): Promise<{success: boolean; deletedCount: number; error?: string}> {
  try {
    // 查找所有品类
    const {data: allCategories, error: categoriesError} = await supabase
      .from('category_prices')
      .select('id')
      .order('id', {ascending: true})

    if (categoriesError) {
      console.error('查询品类失败:', categoriesError)
      return {success: false, deletedCount: 0, error: categoriesError.message}
    }

    if (!allCategories || allCategories.length === 0) {
      return {success: true, deletedCount: 0}
    }

    // 查找所有被使用的品类ID
    const {data: usedCategories, error: pricesError} = await supabase
      .from('category_prices')
      .select('category_id')
      .order('category_id', {ascending: true})

    if (pricesError) {
      console.error('查询品类价格失败:', pricesError)
      return {success: false, deletedCount: 0, error: pricesError.message}
    }

    // 获取被使用的品类ID集合
    const usedCategoryIds = new Set(usedCategories?.map((p) => p.category_id) || [])

    // 找出未被使用的品类
    const unusedCategoryIds = allCategories.filter((c) => !usedCategoryIds.has(c.id)).map((c) => c.id)

    if (unusedCategoryIds.length === 0) {
      return {success: true, deletedCount: 0}
    }

    // 删除未使用的品类
    const {error: deleteError} = await supabase.from('category_prices').delete().in('id', unusedCategoryIds)

    if (deleteError) {
      console.error('删除未使用品类失败:', deleteError)
      return {success: false, deletedCount: 0, error: deleteError.message}
    }

    return {success: true, deletedCount: unusedCategoryIds.length}
  } catch (error) {
    console.error('删除未使用品类异常:', error)
    return {success: false, deletedCount: 0, error: String(error)}
  }
}

// ==================== 品类价格配置 API ====================

// 获取指定仓库的所有品类价格配置
export async function getCategoryPricesByWarehouse(warehouseId: string): Promise<CategoryPrice[]> {
  const {data, error} = await supabase
    .from('category_prices')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('created_at', {ascending: true})

  if (error) {
    console.error('获取品类价格配置失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取指定仓库和品类的价格配置（通过品类名称）
export async function getCategoryPrice(warehouseId: string, categoryName: string): Promise<CategoryPrice | null> {
  const {data, error} = await supabase
    .from('category_prices')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('category_name', categoryName)
    .maybeSingle()

  if (error) {
    console.error('获取品类价格配置失败:', error)
    return null
  }

  return data
}

// 创建或更新品类价格配置
export async function upsertCategoryPrice(input: CategoryPriceInput): Promise<boolean> {
  const {error} = await supabase.from('category_prices').upsert(
    {
      warehouse_id: input.warehouse_id,
      category_name: input.category_name,
      unit_price: input.unit_price,
      upstairs_price: input.upstairs_price,
      sorting_unit_price: input.sorting_unit_price,
      is_active: input.is_active ?? true
    },
    {
      onConflict: 'warehouse_id,category_name'
    }
  )

  if (error) {
    console.error('保存品类价格配置失败:', error)
    return false
  }

  return true
}

// 批量创建或更新品类价格配置
export async function batchUpsertCategoryPrices(inputs: CategoryPriceInput[]): Promise<boolean> {
  const {error} = await supabase.from('category_prices').upsert(
    inputs.map((input) => ({
      warehouse_id: input.warehouse_id,
      category_name: input.category_name,
      unit_price: input.unit_price,
      upstairs_price: input.upstairs_price,
      sorting_unit_price: input.sorting_unit_price,
      is_active: input.is_active ?? true
    })),
    {
      onConflict: 'warehouse_id,category_name'
    }
  )

  if (error) {
    console.error('批量保存品类价格配置失败:', error)
    return false
  }

  return true
}

// 删除品类价格配置
export async function deleteCategoryPrice(id: string): Promise<boolean> {
  const {error} = await supabase.from('category_prices').delete().eq('id', id)

  if (error) {
    console.error('删除品类价格配置失败:', error)
    return false
  }

  return true
}

/**
 * 获取指定仓库和品类的价格配置
 * @param warehouseId 仓库ID
 * @param categoryId 品类ID
 * @returns 价格配置对象，如果不存在则返回 null
 */
export async function getCategoryPriceForDriver(
  warehouseId: string,
  categoryId: string
): Promise<{unitPrice: number; upstairsPrice: number; sortingUnitPrice: number} | null> {
  const {data, error} = await supabase
    .from('category_prices')
    .select('unit_price, upstairs_price, sorting_unit_price')
    .eq('warehouse_id', warehouseId)
    .eq('id', categoryId)
    .maybeSingle()

  if (error) {
    console.error('获取品类价格失败:', error)
    return null
  }

  if (!data) {
    return null
  }

  return {
    unitPrice: data.unit_price,
    upstairsPrice: data.upstairs_price,
    sortingUnitPrice: data.sorting_unit_price
  }
}

// ==================== 管理员仓库关联 API ====================

// 获取管理员的仓库列表
export async function getManagerWarehouses(managerId: string): Promise<Warehouse[]> {
  console.log('[getManagerWarehouses] 开始查询，管理员ID:', managerId)

  // 生成缓存键
  const cacheKey = `${CACHE_KEYS.WAREHOUSE_ASSIGNMENTS}_${managerId}`
  console.log('[getManagerWarehouses] 缓存键:', cacheKey)

  // 尝试从缓存获取
  const cached = getCache<Warehouse[]>(cacheKey)
  if (cached) {
    console.log(`✅ [getManagerWarehouses] 使用缓存数据，仓库数: ${cached.length}`)
    return cached
  }

  console.log('[getManagerWarehouses] 缓存未命中，从数据库查询...')

  const {data, error} = await supabase.from('manager_warehouses').select('warehouse_id').eq('manager_id', managerId)

  console.log('[getManagerWarehouses] 查询结果:', {data, error})

  if (error) {
    console.error('[getManagerWarehouses] 获取管理员仓库失败:', error)
    return []
  }

  if (!data || data.length === 0) {
    console.log('[getManagerWarehouses] 没有找到仓库分配数据')
    // 缓存空结果，避免重复查询（缓存5分钟）
    setCache(cacheKey, [], 5 * 60 * 1000)
    return []
  }

  console.log(
    '[getManagerWarehouses] 找到仓库ID列表:',
    data.map((item) => item.warehouse_id)
  )

  const warehouseIds = data.map((item) => item.warehouse_id)
  const {data: warehouses, error: warehouseError} = await supabase
    .from('warehouses')
    .select('*')
    .in('id', warehouseIds)
    .order('name', {ascending: true})

  console.log('[getManagerWarehouses] 仓库详情查询结果:', {warehouses, warehouseError})

  if (warehouseError) {
    console.error('[getManagerWarehouses] 获取仓库信息失败:', warehouseError)
    return []
  }

  const result = Array.isArray(warehouses) ? warehouses : []
  console.log('[getManagerWarehouses] 最终返回仓库数量:', result.length)

  // 缓存30分钟
  setCache(cacheKey, result, 30 * 60 * 1000)
  console.log('[getManagerWarehouses] 已缓存数据，有效期: 30分钟')

  return result
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
      leave_type: input.leave_type,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason,
      status: 'pending'
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
 * 保存请假申请草稿（注意：由于数据库不支持草稿，此函数直接创建正式申请）
 */
export async function saveDraftLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  // 直接创建正式申请
  return createLeaveApplication(input)
}

/**
 * 更新请假申请草稿（注意：由于数据库不支持草稿，此函数更新正式申请）
 */
export async function updateDraftLeaveApplication(
  draftId: string,
  input: Partial<LeaveApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.leave_type !== undefined) updateData.leave_type = input.leave_type
  if (input.start_date !== undefined) updateData.start_date = input.start_date
  if (input.end_date !== undefined) updateData.end_date = input.end_date
  if (input.reason !== undefined) updateData.reason = input.reason

  const {error} = await supabase.from('leave_applications').update(updateData).eq('id', draftId)

  if (error) {
    console.error('更新请假申请草稿失败:', error)
    return false
  }

  return true
}

/**
 * 提交请假申请草稿（注意：由于数据库不支持草稿，此函数直接返回成功）
 */
export async function submitDraftLeaveApplication(_draftId: string): Promise<boolean> {
  // 由于没有草稿状态，直接返回成功
  return true
}

/**
 * 删除请假申请草稿（注意：由于数据库不支持草稿，此函数删除正式申请）
 */
export async function deleteDraftLeaveApplication(draftId: string): Promise<boolean> {
  const {error} = await supabase.from('leave_applications').delete().eq('id', draftId)

  if (error) {
    console.error('删除请假申请草稿失败:', error)
    return false
  }

  return true
}

/**
 * 获取用户的请假申请草稿列表（注意：由于数据库不支持草稿，返回空数组）
 */
export async function getDraftLeaveApplications(_userId: string): Promise<LeaveApplication[]> {
  // 由于没有草稿状态，返回空数组
  return []
}

/**
 * 获取用户的所有请假申请
 */
export async function getLeaveApplicationsByUser(userId: string): Promise<LeaveApplication[]> {
  const {data, error} = await supabase
    .from('leave_applications')
    .select('*')
    .eq('user_id', userId)
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
  try {
    // 先获取申请信息（包括司机ID和申请详情）
    const {data: application, error: fetchError} = await supabase
      .from('leave_applications')
      .select('user_id, leave_type, start_date, end_date, reason')
      .eq('id', applicationId)
      .maybeSingle()

    if (fetchError || !application) {
      console.error('获取请假申请信息失败:', fetchError)
      return false
    }

    // 更新审批状态
    const {error: updateError} = await supabase
      .from('leave_applications')
      .update({
        status: review.status,
        reviewed_by: review.reviewed_by,
        review_notes: review.review_notes || null,
        reviewed_at: review.reviewed_at
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('审批请假申请失败:', updateError)
      return false
    }

    // 创建通知给司机
    const notificationType = review.status === 'approved' ? 'leave_approved' : 'leave_rejected'
    const notificationTitle = review.status === 'approved' ? '请假申请已通过' : '请假申请已驳回'
    const statusText = review.status === 'approved' ? '已通过' : '已驳回'

    const leaveTypeMap: Record<string, string> = {
      personal: '事假',
      sick: '病假',
      annual: '年假',
      other: '其他'
    }
    const leaveTypeLabel = leaveTypeMap[application.leave_type] || '请假'

    await createNotification({
      user_id: application.user_id,
      type: notificationType,
      title: notificationTitle,
      message: `您的${leaveTypeLabel}申请（${application.start_date} 至 ${application.end_date}）${statusText}${review.review_notes ? `，备注：${review.review_notes}` : ''}`,
      related_id: applicationId
    })

    console.log('✅ 请假申请审批成功，已通知司机')
    return true
  } catch (error) {
    console.error('审批请假申请异常:', error)
    return false
  }
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
      resignation_date: input.resignation_date,
      reason: input.reason,
      status: 'pending'
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
 * 保存离职申请草稿（注意：由于数据库不支持草稿，此函数直接创建正式申请）
 */
export async function saveDraftResignationApplication(
  input: ResignationApplicationInput
): Promise<ResignationApplication | null> {
  // 直接创建正式申请
  return createResignationApplication(input)
}

/**
 * 更新离职申请草稿（注意：由于数据库不支持草稿，此函数更新正式申请）
 */
export async function updateDraftResignationApplication(
  draftId: string,
  input: Partial<ResignationApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.resignation_date !== undefined) updateData.resignation_date = input.resignation_date
  if (input.reason !== undefined) updateData.reason = input.reason

  const {error} = await supabase.from('resignation_applications').update(updateData).eq('id', draftId)

  if (error) {
    console.error('更新离职申请草稿失败:', error)
    return false
  }

  return true
}

/**
 * 提交离职申请草稿（注意：由于数据库不支持草稿，此函数直接返回成功）
 */
export async function submitDraftResignationApplication(_draftId: string): Promise<boolean> {
  // 由于没有草稿状态，直接返回成功
  return true
}

/**
 * 删除离职申请草稿（注意：由于数据库不支持草稿，此函数删除正式申请）
 */
export async function deleteDraftResignationApplication(draftId: string): Promise<boolean> {
  const {error} = await supabase.from('resignation_applications').delete().eq('id', draftId)

  if (error) {
    console.error('删除离职申请草稿失败:', error)
    return false
  }

  return true
}

/**
 * 获取用户的离职申请草稿列表（注意：由于数据库不支持草稿，返回空数组）
 */
export async function getDraftResignationApplications(_userId: string): Promise<ResignationApplication[]> {
  // 由于没有草稿状态，返回空数组
  return []
}

/**
 * 获取用户的所有离职申请
 */
export async function getResignationApplicationsByUser(userId: string): Promise<ResignationApplication[]> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .select('*')
    .eq('user_id', userId)
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
  try {
    // 先获取申请信息（包括司机ID和申请详情）
    const {data: application, error: fetchError} = await supabase
      .from('resignation_applications')
      .select('user_id, resignation_date, reason')
      .eq('id', applicationId)
      .maybeSingle()

    if (fetchError || !application) {
      console.error('获取离职申请信息失败:', fetchError)
      return false
    }

    // 更新审批状态
    const {error: updateError} = await supabase
      .from('resignation_applications')
      .update({
        status: review.status,
        reviewed_by: review.reviewed_by,
        review_notes: review.review_notes || null,
        reviewed_at: review.reviewed_at
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('审批离职申请失败:', updateError)
      return false
    }

    // 创建通知给司机
    const notificationType = review.status === 'approved' ? 'resignation_approved' : 'resignation_rejected'
    const notificationTitle = review.status === 'approved' ? '离职申请已通过' : '离职申请已驳回'
    const statusText = review.status === 'approved' ? '已通过' : '已驳回'

    await createNotification({
      user_id: application.user_id,
      type: notificationType,
      title: notificationTitle,
      message: `您的离职申请（期望离职日期：${application.resignation_date}）${statusText}${review.review_notes ? `，备注：${review.review_notes}` : ''}`,
      related_id: applicationId
    })

    console.log('✅ 离职申请审批成功，已通知司机')
    return true
  } catch (error) {
    console.error('审批离职申请异常:', error)
    return false
  }
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

      // 将英文错误信息转换为中文
      let errorMessage = error.message
      if (errorMessage.includes('New password should be different from the old password')) {
        errorMessage = '新密码不能与原密码相同'
      } else if (errorMessage.includes('Password should be at least')) {
        errorMessage = '密码长度至少8位'
      } else if (errorMessage.includes('Invalid password')) {
        errorMessage = '密码格式不正确'
      }

      return {success: false, error: errorMessage}
    }

    return {success: true}
  } catch (error) {
    console.error('修改密码异常:', error)
    return {success: false, error: '修改密码失败，请稍后重试'}
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
      .from('attendance')
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
      ? supabase.from('attendance').select('user_id').in('user_id', driverIds).eq('work_date', today)
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
      .from('attendance')
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
      .from('attendance')
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
  console.log('🔍 getAllUsers: 开始从数据库获取用户列表')
  const {data, error} = await supabase.from('profiles').select('*').order('created_at', {ascending: false})

  if (error) {
    console.error('❌ 获取用户列表失败:', error)
    return []
  }

  console.log('📦 getAllUsers: 从数据库获取到的原始数据:')
  console.log(JSON.stringify(data, null, 2))

  // 检查每个用户的 vehicle_plate 字段
  if (Array.isArray(data)) {
    const drivers = data.filter((u) => u.role === 'driver')
    console.log(`🚗 getAllUsers: 发现 ${drivers.length} 个司机用户`)
    drivers.forEach((driver, index) => {
      console.log(`   ${index + 1}. ${driver.name}:`)
      console.log(`      - id: ${driver.id}`)
      console.log(`      - role: ${driver.role}`)
      console.log(
        `      - vehicle_plate: ${driver.vehicle_plate === null ? '(null)' : driver.vehicle_plate === '' ? '(空字符串)' : driver.vehicle_plate}`
      )
      console.log(`      - vehicle_plate 类型: ${typeof driver.vehicle_plate}`)
    })
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取所有管理员用户
 */
export async function getAllManagers(): Promise<Profile[]> {
  console.log('🔍 getAllManagers: 开始获取管理员列表')
  const {data, error} = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'manager')
    .order('created_at', {ascending: false})

  if (error) {
    console.error('❌ 获取管理员列表失败:', error)
    return []
  }

  console.log(`✅ getAllManagers: 获取到 ${data?.length || 0} 个管理员`)
  return Array.isArray(data) ? data : []
}

/**
 * 获取所有超级管理员列表
 */
export async function getAllSuperAdmins(): Promise<Profile[]> {
  console.log('🔍 getAllSuperAdmins: 开始获取超级管理员列表')
  const {data, error} = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'super_admin')
    .order('created_at', {ascending: false})

  if (error) {
    console.error('❌ 获取超级管理员列表失败:', error)
    return []
  }

  console.log(`✅ getAllSuperAdmins: 获取到 ${data?.length || 0} 个超级管理员`)
  return Array.isArray(data) ? data : []
}

/**
 * 获取所有司机列表
 */
export async function getAllDrivers(): Promise<Profile[]> {
  console.log('🔍 getAllDrivers: 开始获取司机列表')
  const {data, error} = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'driver')
    .order('created_at', {ascending: false})

  if (error) {
    console.error('❌ 获取司机列表失败:', error)
    return []
  }

  console.log(`✅ getAllDrivers: 获取到 ${data?.length || 0} 个司机`)
  return Array.isArray(data) ? data : []
}

/**
 * 修改用户角色（超级管理员）
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  // 根据角色设置 driver_type
  const updateData: {role: UserRole; driver_type?: 'pure' | null} = {role}

  if (role === 'driver') {
    // 变更为司机时，设置默认的 driver_type 为 'pure'（纯司机）
    updateData.driver_type = 'pure'
  } else {
    // 变更为管理员或超级管理员时，清空 driver_type
    updateData.driver_type = null
  }

  const {error} = await supabase.from('profiles').update(updateData).eq('id', userId)

  if (error) {
    console.error('修改用户角色失败:', error)
    return false
  }

  return true
}

/**
 * 获取管理员权限配置
 * 注意：在新的数据库设计中，权限通过角色和仓库关联来管理
 * 这个函数返回默认权限配置
 */
export async function getManagerPermission(managerId: string): Promise<ManagerPermission | null> {
  // 检查用户是否是管理员
  const {data: profile, error} = await supabase.from('profiles').select('role').eq('id', managerId).maybeSingle()

  if (error || !profile) {
    console.error('获取管理员信息失败:', error)
    return null
  }

  // 如果是超级管理员，返回所有权限
  if (profile.role === 'super_admin') {
    const now = new Date().toISOString()
    return {
      id: managerId, // 使用 managerId 作为 id
      manager_id: managerId,
      can_edit_user_info: true,
      can_edit_piece_work: true,
      can_manage_attendance_rules: true,
      can_manage_categories: true,
      created_at: now,
      updated_at: now
    }
  }

  // 如果是普通管理员，返回默认权限
  if (profile.role === 'manager') {
    const now = new Date().toISOString()
    return {
      id: managerId, // 使用 managerId 作为 id
      manager_id: managerId,
      can_edit_user_info: true,
      can_edit_piece_work: true,
      can_manage_attendance_rules: false,
      can_manage_categories: false,
      created_at: now,
      updated_at: now
    }
  }

  return null
}

/**
 * 创建或更新管理员权限配置
 * 注意：在新的数据库设计中，权限通过角色来管理，此函数已废弃
 */
export async function upsertManagerPermission(_input: ManagerPermissionInput): Promise<boolean> {
  console.warn('upsertManagerPermission 已废弃，权限现在通过角色来管理')
  // 保留函数是为了兼容性，但不执行任何操作
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

  // 2. 如果没有新的仓库，清除缓存并返回成功
  if (warehouseIds.length === 0) {
    // 清除该管理员的仓库缓存
    try {
      const {clearManagerWarehousesCache} = await import('@/utils/cache')
      clearManagerWarehousesCache(managerId)
    } catch (err) {
      console.error('清除缓存失败:', err)
    }
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

  // 4. 成功后清除该管理员的仓库缓存，确保下次登录时获取最新数据
  try {
    const {clearManagerWarehousesCache} = await import('@/utils/cache')
    clearManagerWarehousesCache(managerId)
    console.log(`[API] 已清除管理员 ${managerId} 的仓库缓存`)
  } catch (err) {
    console.error('清除缓存失败:', err)
  }

  return true
}

/**
 * 获取仓库的品类列表（返回品类ID数组）
 */
export async function getWarehouseCategories(warehouseId: string): Promise<string[]> {
  const {data, error} = await supabase
    .from('category_prices')
    .select('id')
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)

  if (error) {
    console.error('获取仓库品类列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data.map((item) => item.id) : []
}

/**
 * 获取仓库的品类详细信息
 */
export async function getWarehouseCategoriesWithDetails(warehouseId: string): Promise<PieceWorkCategory[]> {
  const {data, error} = await supabase
    .from('category_prices')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)

  if (error) {
    console.error('获取仓库品类详细信息失败:', error)
    return []
  }

  if (!Array.isArray(data)) {
    return []
  }

  // 数据已经是 PieceWorkCategory 格式，直接返回
  return data
}

/**
 * 设置仓库的品类（更新 category_prices 表）
 * 注意：在新的数据库设计中，品类直接关联到仓库，不需要单独的关联表
 */
export async function setWarehouseCategories(_warehouseId: string, _categoryIds: string[]): Promise<boolean> {
  // 在新的设计中，品类已经直接关联到仓库
  // 这个函数保留是为了兼容性，但实际上不需要做任何操作
  // 品类的启用/禁用应该通过更新 category_prices 表的 is_active 字段来实现
  console.warn('setWarehouseCategories 已废弃，请使用 category_prices 表的 is_active 字段')
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
export async function createDriver(
  phone: string,
  name: string,
  driverType: 'pure' | 'with_vehicle' = 'pure'
): Promise<Profile | null> {
  const timestamp = new Date().toISOString()
  console.log(`\n${'='.repeat(80)}`)
  console.log('🚀 [createDriver] 函数调用开始')
  console.log('⏰ 时间戳:', timestamp)
  console.log('📱 输入参数:')
  console.log('  - 手机号:', phone)
  console.log('  - 姓名:', name)
  console.log('  - 司机类型:', driverType)
  console.log(`${'='.repeat(80)}\n`)

  try {
    // 步骤1: 检查手机号是否已存在
    console.log('📋 [步骤1] 检查手机号是否已存在')
    console.log('  - 查询条件: phone =', phone)

    const {data: existingProfiles, error: checkError} = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (checkError) {
      console.error('  ❌ 查询失败:', checkError)
      console.error('  错误详情:', JSON.stringify(checkError, null, 2))
      return null
    }

    if (existingProfiles) {
      console.warn('  ⚠️ 手机号已存在')
      console.warn('  已存在的用户ID:', existingProfiles.id)
      console.warn('  已存在的用户姓名:', existingProfiles.name)
      console.log('  ❌ 创建失败：手机号重复\n')
      return null
    }

    console.log('  ✅ 手机号可用，继续创建\n')

    // 步骤2: 创建 profiles 表记录
    console.log('📋 [步骤2] 创建 profiles 表记录')
    const insertData = {
      phone,
      name,
      role: 'driver' as UserRole,
      email: `${phone}@fleet.com`,
      driver_type: driverType,
      join_date: new Date().toISOString().split('T')[0] // 设置入职日期为今天
    }
    console.log('  - 插入数据:', JSON.stringify(insertData, null, 2))

    const {data, error} = await supabase.from('profiles').insert(insertData).select().maybeSingle()

    if (error) {
      console.error('  ❌ 插入失败:', error)
      console.error('  错误代码:', error.code)
      console.error('  错误消息:', error.message)
      console.error('  错误详情:', JSON.stringify(error, null, 2))
      return null
    }

    if (!data) {
      console.error('  ❌ 插入失败：返回数据为空')
      return null
    }

    console.log('  ✅ profiles 表记录创建成功')
    console.log('  - 用户ID:', data.id)
    console.log('  - 手机号:', data.phone)
    console.log('  - 姓名:', data.name)
    console.log('  - 角色:', data.role)
    console.log('  - 邮箱:', data.email)
    console.log('  - 司机类型:', data.driver_type)
    console.log('  - 入职日期:', data.join_date)
    console.log('  - 创建时间:', data.created_at)
    console.log('  - 完整数据:', JSON.stringify(data, null, 2))
    console.log('')

    // 步骤3: 创建 auth.users 表记录
    console.log('📋 [步骤3] 创建 auth.users 表记录')
    const loginEmail = `${phone}@fleet.com`
    console.log('  - 目标用户ID:', data.id)
    console.log('  - 登录邮箱:', loginEmail)
    console.log('  - 手机号:', phone)
    console.log('  - 默认密码: 123456')
    console.log('  - 使用函数: create_user_auth_account')

    try {
      const {data: rpcData, error: authError} = await supabase.rpc('create_user_auth_account', {
        target_user_id: data.id,
        user_email: loginEmail,
        user_phone: phone
      })

      console.log('  - RPC 调用完成')
      console.log('  - 返回数据:', rpcData)
      console.log('  - 错误信息:', authError)

      if (authError) {
        console.error('  ❌ 创建 auth.users 记录失败')
        console.error('  错误代码:', authError.code)
        console.error('  错误消息:', authError.message)
        console.error('  错误详情:', JSON.stringify(authError, null, 2))
        console.warn('  ⚠️ profiles 记录已创建，但 auth.users 记录创建失败')
        console.warn('  💡 用户可以通过手机号验证码登录')
        console.warn('  💡 或稍后通过编辑用户信息创建登录账号')
      } else if (rpcData && rpcData.success === false) {
        console.error('  ❌ 创建 auth.users 记录失败')
        console.error('  错误:', rpcData.error)
        console.error('  详情:', rpcData.details)
        console.warn('  ⚠️ profiles 记录已创建，但 auth.users 记录创建失败')
      } else {
        console.log('  ✅ auth.users 记录创建成功')
        console.log('  - 用户ID:', rpcData.user_id)
        console.log('  - 邮箱:', rpcData.email)
        console.log('  - 默认密码:', rpcData.default_password)
        console.log('  💡 用户可以使用以下方式登录:')
        console.log(`    1. 手机号 + 密码: ${phone} / 123456`)
        console.log(`    2. 邮箱 + 密码: ${loginEmail} / 123456`)
        console.log('    3. 手机号 + 验证码')
      }
    } catch (authError) {
      console.error('  ❌ 创建 auth.users 记录异常')
      console.error('  异常类型:', typeof authError)
      console.error('  异常内容:', authError)
      if (authError instanceof Error) {
        console.error('  异常消息:', authError.message)
        console.error('  异常堆栈:', authError.stack)
      }
      console.warn('  ⚠️ profiles 记录已创建，但 auth.users 记录创建失败')
    }

    console.log('')
    console.log('='.repeat(80))
    console.log('✅ [createDriver] 函数执行完成')
    console.log('📊 最终结果:')
    console.log('  - profiles 表: ✅ 创建成功')
    console.log('  - auth.users 表: 请查看上方日志')
    console.log('  - 返回数据:', JSON.stringify(data, null, 2))
    console.log(`${'='.repeat(80)}\n`)

    return data as Profile
  } catch (error) {
    console.error(`\n${'='.repeat(80)}`)
    console.error('❌ [createDriver] 函数执行异常')
    console.error('异常类型:', typeof error)
    console.error('异常内容:', error)
    if (error instanceof Error) {
      console.error('异常消息:', error.message)
      console.error('异常堆栈:', error.stack)
    }
    console.error(`${'='.repeat(80)}\n`)
    return null
  }
}

/**
 * 创建新用户（支持司机和管理员）
 * @param phone 手机号
 * @param name 姓名
 * @param role 用户角色（driver 或 manager）
 * @param driverType 司机类型（仅当 role 为 driver 时需要）
 * @returns 创建的用户资料，如果失败返回null
 */
export async function createUser(
  phone: string,
  name: string,
  role: 'driver' | 'manager',
  driverType?: 'pure' | 'with_vehicle'
): Promise<Profile | null> {
  const timestamp = new Date().toISOString()
  console.log(`\n${'='.repeat(80)}`)
  console.log('🚀 [createUser] 函数调用开始')
  console.log('⏰ 时间戳:', timestamp)
  console.log('📱 输入参数:')
  console.log('  - 手机号:', phone)
  console.log('  - 姓名:', name)
  console.log('  - 角色:', role)
  console.log('  - 司机类型:', driverType || 'N/A')
  console.log(`${'='.repeat(80)}\n`)

  try {
    // 步骤1: 检查手机号是否已存在
    console.log('📋 [步骤1] 检查手机号是否已存在')
    console.log('  - 查询条件: phone =', phone)

    const {data: existingProfiles, error: checkError} = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (checkError) {
      console.error('  ❌ 查询失败:', checkError)
      console.error('  错误详情:', JSON.stringify(checkError, null, 2))
      return null
    }

    if (existingProfiles) {
      console.warn('  ⚠️ 手机号已存在')
      console.warn('  已存在的用户ID:', existingProfiles.id)
      console.warn('  已存在的用户姓名:', existingProfiles.name)
      console.log('  ❌ 创建失败：手机号重复\n')
      return null
    }

    console.log('  ✅ 手机号可用，继续创建\n')

    // 步骤2: 创建 profiles 表记录
    console.log('📋 [步骤2] 创建 profiles 表记录')
    const insertData: any = {
      phone,
      name,
      role: role as UserRole,
      email: `${phone}@fleet.com`
    }

    // 如果是司机，添加司机类型和入职日期
    if (role === 'driver') {
      insertData.driver_type = driverType || 'pure'
      insertData.join_date = new Date().toISOString().split('T')[0]
    }

    console.log('  - 插入数据:', JSON.stringify(insertData, null, 2))

    const {data, error} = await supabase.from('profiles').insert(insertData).select().maybeSingle()

    if (error) {
      console.error('  ❌ 插入失败:', error)
      console.error('  错误代码:', error.code)
      console.error('  错误消息:', error.message)
      console.error('  错误详情:', JSON.stringify(error, null, 2))
      return null
    }

    if (!data) {
      console.error('  ❌ 插入失败：返回数据为空')
      return null
    }

    console.log('  ✅ profiles 表记录创建成功')
    console.log('  - 用户ID:', data.id)
    console.log('  - 手机号:', data.phone)
    console.log('  - 姓名:', data.name)
    console.log('  - 角色:', data.role)
    console.log('  - 邮箱:', data.email)
    if (role === 'driver') {
      console.log('  - 司机类型:', data.driver_type)
      console.log('  - 入职日期:', data.join_date)
    }
    console.log('  - 创建时间:', data.created_at)
    console.log('  - 完整数据:', JSON.stringify(data, null, 2))
    console.log('')

    // 步骤3: 创建 auth.users 表记录
    console.log('📋 [步骤3] 创建 auth.users 表记录')
    const loginEmail = `${phone}@fleet.com`
    console.log('  - 目标用户ID:', data.id)
    console.log('  - 登录邮箱:', loginEmail)
    console.log('  - 手机号:', phone)
    console.log('  - 默认密码: 123456')
    console.log('  - 使用函数: create_user_auth_account')

    try {
      const {data: rpcData, error: authError} = await supabase.rpc('create_user_auth_account', {
        target_user_id: data.id,
        user_email: loginEmail,
        user_phone: phone
      })

      console.log('  - RPC 调用完成')
      console.log('  - 返回数据:', rpcData)
      console.log('  - 错误信息:', authError)

      if (authError) {
        console.error('  ❌ 创建 auth.users 记录失败')
        console.error('  错误代码:', authError.code)
        console.error('  错误消息:', authError.message)
        console.error('  错误详情:', JSON.stringify(authError, null, 2))
        console.warn('  ⚠️ profiles 记录已创建，但 auth.users 记录创建失败')
        console.warn('  💡 用户可以通过手机号验证码登录')
        console.warn('  💡 或稍后通过编辑用户信息创建登录账号')
      } else if (rpcData && rpcData.success === false) {
        console.error('  ❌ 创建 auth.users 记录失败')
        console.error('  错误:', rpcData.error)
        console.error('  详情:', rpcData.details)
        console.warn('  ⚠️ profiles 记录已创建，但 auth.users 记录创建失败')
      } else {
        console.log('  ✅ auth.users 记录创建成功')
        console.log('  - 用户ID:', rpcData.user_id)
        console.log('  - 邮箱:', rpcData.email)
        console.log('  - 默认密码:', rpcData.default_password)
        console.log('  💡 用户可以使用以下方式登录:')
        console.log(`    1. 手机号 + 密码: ${phone} / 123456`)
        console.log(`    2. 邮箱 + 密码: ${loginEmail} / 123456`)
        console.log('    3. 手机号 + 验证码')
      }
    } catch (authError) {
      console.error('  ❌ 创建 auth.users 记录异常')
      console.error('  异常类型:', typeof authError)
      console.error('  异常内容:', authError)
      if (authError instanceof Error) {
        console.error('  异常消息:', authError.message)
        console.error('  异常堆栈:', authError.stack)
      }
      console.warn('  ⚠️ profiles 记录已创建，但 auth.users 记录创建失败')
    }

    console.log('')
    console.log('='.repeat(80))
    console.log('✅ [createUser] 函数执行完成')
    console.log('📊 最终结果:')
    console.log('  - profiles 表: ✅ 创建成功')
    console.log('  - auth.users 表: 请查看上方日志')
    console.log('  - 返回数据:', JSON.stringify(data, null, 2))
    console.log(`${'='.repeat(80)}\n`)

    return data as Profile
  } catch (error) {
    console.error(`\n${'='.repeat(80)}`)
    console.error('❌ [createUser] 函数执行异常')
    console.error('异常类型:', typeof error)
    console.error('异常内容:', error)
    if (error instanceof Error) {
      console.error('异常消息:', error.message)
      console.error('异常堆栈:', error.stack)
    }
    console.error(`${'='.repeat(80)}\n`)
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
      .from('attendance')
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
 * 使用 PostgreSQL 函数直接重置密码，避免 Supabase Auth 的扫描问题
 * 将用户密码重置为 123456
 */
export async function resetUserPassword(userId: string): Promise<{success: boolean; error?: string}> {
  try {
    console.log('=== 开始重置密码 ===')
    console.log('目标用户ID:', userId)
    console.log('使用方法: PostgreSQL RPC 函数')

    // 调用 PostgreSQL 函数重置密码
    const {data, error} = await supabase.rpc('reset_user_password_by_admin', {
      target_user_id: userId,
      new_password: '123456'
    })

    console.log('RPC 调用结果:', data)

    if (error) {
      console.error('❌ RPC 调用失败:', error)
      return {success: false, error: error.message || '调用重置密码函数失败'}
    }

    // 检查返回的结果
    if (!data) {
      console.error('❌ 未收到返回数据')
      return {success: false, error: '未收到服务器响应'}
    }

    // data 是一个 JSON 对象，包含 success, error, details, message 等字段
    if (data.success === false) {
      console.error('❌ 重置密码失败:', data.error)
      console.error('详细信息:', data.details)
      return {success: false, error: data.error || data.details || '重置密码失败'}
    }

    console.log('✅ 密码重置成功:', data.message)
    return {success: true}
  } catch (error) {
    console.error('❌ 重置密码异常:', error)
    console.error('异常类型:', error?.constructor?.name)
    console.error('异常堆栈:', error instanceof Error ? error.stack : '无堆栈信息')

    const errorMsg = error instanceof Error ? error.message : '未知错误'
    return {success: false, error: `异常: ${errorMsg}`}
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
    driver_type?: DriverType | null
    login_account?: string
    vehicle_plate?: string | null
    join_date?: string
  }
): Promise<boolean> {
  console.log('========================================')
  console.log('=== updateUserInfo API 调用 ===')
  console.log('目标用户ID:', userId)
  console.log('更新数据:', JSON.stringify(updates, null, 2))

  // 特别检查 driver_type 字段
  if ('driver_type' in updates) {
    console.log('🏷️  检测到 driver_type 字段更新:')
    console.log('   - 值:', updates.driver_type)
    console.log('   - 类型:', typeof updates.driver_type)
  }

  // 特别检查 vehicle_plate 字段
  if ('vehicle_plate' in updates) {
    console.log('🚗 检测到 vehicle_plate 字段更新:')
    console.log('   - 值:', updates.vehicle_plate)
    console.log('   - 类型:', typeof updates.vehicle_plate)
    console.log('   - 是否为 null:', updates.vehicle_plate === null)
    console.log('   - 是否为空字符串:', updates.vehicle_plate === '')
  }
  console.log('========================================')

  try {
    // 1. 更新 profiles 表
    const {data, error} = await supabase.from('profiles').update(updates).eq('id', userId).select()

    console.log('Supabase 更新 profiles 响应 - data:', JSON.stringify(data, null, 2))
    console.log('Supabase 更新 profiles 响应 - error:', JSON.stringify(error, null, 2))

    if (error) {
      console.error('========================================')
      console.error('❌ 更新用户信息失败 - Supabase 错误')
      console.error('错误代码:', error.code)
      console.error('错误消息:', error.message)
      console.error('错误详情:', error.details)
      console.error('错误提示:', error.hint)
      console.error('完整错误对象:', JSON.stringify(error, null, 2))
      console.error('========================================')
      return false
    }

    if (!data || data.length === 0) {
      console.error('========================================')
      console.error('❌ 更新用户信息失败 - 没有返回数据')
      console.error('可能原因：')
      console.error('1. 用户不存在（ID 不匹配）')
      console.error('2. RLS 策略阻止了更新操作（权限不足）')
      console.error('3. 触发器阻止了更新操作')
      console.error('========================================')
      console.error('调试信息：')
      console.error('- 目标用户ID:', userId)
      console.error('- 当前登录用户ID:', (await supabase.auth.getUser()).data.user?.id)
      console.error('- 更新的字段:', Object.keys(updates))
      console.error('- 是否包含 role 字段:', 'role' in updates)
      console.error('- 是否包含 vehicle_plate 字段:', 'vehicle_plate' in updates)
      console.error('========================================')
      return false
    }

    console.log('========================================')
    console.log('✅ profiles 表更新成功！')
    console.log('更新后的完整数据:', JSON.stringify(data[0], null, 2))

    // 特别检查更新后的 vehicle_plate 字段
    if (data[0]) {
      console.log('🚗 更新后的 vehicle_plate 字段:')
      console.log('   - 值:', data[0].vehicle_plate)
      console.log('   - 类型:', typeof data[0].vehicle_plate)
      console.log('   - 是否为 null:', data[0].vehicle_plate === null)
      console.log('   - 是否为空字符串:', data[0].vehicle_plate === '')
    }
    console.log('========================================')

    // 2. 如果更新了 login_account，同时更新/创建 auth.users 表的 email
    if (updates.login_account) {
      console.log('检测到 login_account 更新，同步更新/创建 auth.users 表的 email...')

      // 将登录账号转换为邮箱格式
      const newEmail = updates.login_account.includes('@')
        ? updates.login_account
        : `${updates.login_account}@fleet.com`

      console.log('新的邮箱地址:', newEmail)

      // 使用 SQL 直接更新/创建 auth.users 表
      // 如果用户不存在，函数会自动创建用户记录
      const {error: authError} = await supabase.rpc('update_user_email', {
        target_user_id: userId,
        new_email: newEmail
      })

      if (authError) {
        console.error('❌ 更新/创建 auth.users 邮箱失败:', authError)
        console.error('错误详情:', JSON.stringify(authError, null, 2))
        console.warn('⚠️ profiles 表已更新，但 auth.users 表操作失败，用户可能无法使用新账号登录')
        // 不返回 false，因为 profiles 已经更新成功
      } else {
        console.log('✅ auth.users 表邮箱更新/创建成功！')
        console.log('💡 如果是新创建的账号，用户需要通过"重置密码"功能设置密码')

        // 同时更新 profiles 表的 email 字段以保持一致
        await supabase.from('profiles').update({email: newEmail}).eq('id', userId)
        console.log('✅ profiles 表 email 字段同步更新成功！')
      }
    }

    return true
  } catch (error) {
    console.error('❌ 更新用户信息异常:', error)
    console.error('异常详情:', JSON.stringify(error, null, 2))
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
 * 仓库数据量统计接口
 */
export interface WarehouseDataVolume {
  warehouseId: string
  warehouseName: string
  todayPieceCount: number // 今日计件数
  monthPieceCount: number // 本月计件数
  todayAttendanceCount: number // 今日考勤数
  monthAttendanceCount: number // 本月考勤数
  totalVolume: number // 总数据量（用于排序）
  hasData: boolean // 是否有数据
}

/**
 * 获取仓库的数据量统计（用于排序和过滤）
 * @param warehouseId 仓库ID
 * @param userId 用户ID（可选，如果提供则只统计该用户的数据）
 */
export async function getWarehouseDataVolume(
  warehouseId: string,
  userId?: string
): Promise<WarehouseDataVolume | null> {
  try {
    // 获取仓库信息
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

    // 统计今日计件数
    let todayPieceQuery = supabase
      .from('piece_work_records')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .eq('work_date', today)

    if (userId) {
      todayPieceQuery = todayPieceQuery.eq('user_id', userId)
    }

    const {count: todayPieceCount} = await todayPieceQuery

    // 统计本月计件数
    let monthPieceQuery = supabase
      .from('piece_work_records')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .gte('work_date', firstDayOfMonth)

    if (userId) {
      monthPieceQuery = monthPieceQuery.eq('user_id', userId)
    }

    const {count: monthPieceCount} = await monthPieceQuery

    // 统计今日考勤数
    let todayAttendanceQuery = supabase
      .from('attendance')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .eq('work_date', today)

    if (userId) {
      todayAttendanceQuery = todayAttendanceQuery.eq('user_id', userId)
    }

    const {count: todayAttendanceCount} = await todayAttendanceQuery

    // 统计本月考勤数
    let monthAttendanceQuery = supabase
      .from('attendance')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .gte('work_date', firstDayOfMonth)

    if (userId) {
      monthAttendanceQuery = monthAttendanceQuery.eq('user_id', userId)
    }

    const {count: monthAttendanceCount} = await monthAttendanceQuery

    // 计算总数据量
    const totalVolume =
      (todayPieceCount || 0) + (monthPieceCount || 0) + (todayAttendanceCount || 0) + (monthAttendanceCount || 0)

    // 判断是否有数据（今日或本月有任何数据）
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

// ==================== 车辆管理 API ====================

/**
 * 测试函数：获取当前认证用户信息
 * 用于调试RLS策略问题
 */
export async function debugAuthStatus(): Promise<{
  authenticated: boolean
  userId: string | null
  email: string | null
  role: string | null
}> {
  try {
    // 获取当前session
    const {
      data: {session},
      error: sessionError
    } = await supabase.auth.getSession()

    if (sessionError) {
      logger.error('获取session失败', sessionError)
      return {authenticated: false, userId: null, email: null, role: null}
    }

    if (!session) {
      logger.warn('未找到有效session')
      return {authenticated: false, userId: null, email: null, role: null}
    }

    logger.info('当前认证状态', {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role
    })

    return {
      authenticated: true,
      userId: session.user.id,
      email: session.user.email || null,
      role: session.user.role || null
    }
  } catch (error) {
    logger.error('检查认证状态异常', error)
    return {authenticated: false, userId: null, email: null, role: null}
  }
}

/**
 * 获取司机的所有车辆
 */
export async function getDriverVehicles(driverId: string): Promise<Vehicle[]> {
  logger.db('查询', 'vehicles', {driverId})
  try {
    logger.info('开始查询司机车辆', {driverId})
    const {data, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', driverId)
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('获取司机车辆失败', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        driverId
      })
      return []
    }

    logger.info(`成功获取司机车辆列表，共 ${data?.length || 0} 辆`, {
      driverId,
      count: data?.length,
      vehicleIds: data?.map((v) => v.id)
    })
    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error('获取司机车辆异常', {error, driverId})
    return []
  }
}

/**
 * 获取所有车辆信息（包含司机信息）
 * 用于超级管理员查看所有车辆
 */
export async function getAllVehiclesWithDrivers(): Promise<VehicleWithDriver[]> {
  logger.db('查询', 'vehicles', {action: 'getAllWithDrivers'})
  try {
    logger.info('🚀 开始查询所有车辆及司机信息（包括所有状态的车辆）')

    // 第一步：获取每辆车的最新记录（包括所有状态）
    // 使用 DISTINCT ON 获取每个车牌号的最新记录
    const {data: vehiclesData, error: vehiclesError} = await supabase
      .from('vehicles')
      .select('*')
      // 移除 return_time 限制，超级管理员应该能看到所有车辆
      .order('plate_number', {ascending: true})
      .order('pickup_time', {ascending: false})

    logger.info('📊 Supabase查询结果', {
      hasError: !!vehiclesError,
      error: vehiclesError,
      dataLength: vehiclesData?.length || 0,
      data: vehiclesData
    })

    if (vehiclesError) {
      logger.error('❌ 获取所有车辆失败', {
        error: vehiclesError.message,
        code: vehiclesError.code,
        details: vehiclesError.details,
        hint: vehiclesError.hint
      })
      return []
    }

    if (!vehiclesData || vehiclesData.length === 0) {
      logger.info('⚠️ 没有找到任何车辆记录')
      return []
    }

    logger.info('📝 原始车辆数据', {
      count: vehiclesData.length,
      vehicles: vehiclesData
    })

    // 第二步：按车牌号去重，只保留每辆车的最新记录
    const latestVehiclesMap = new Map()
    vehiclesData.forEach((vehicle: any) => {
      if (!latestVehiclesMap.has(vehicle.plate_number)) {
        latestVehiclesMap.set(vehicle.plate_number, vehicle)
      }
    })
    const latestVehicles = Array.from(latestVehiclesMap.values())

    logger.info('🔄 去重后的车辆数据', {
      count: latestVehicles.length,
      vehicles: latestVehicles
    })

    // 第三步：获取所有相关的司机信息和实名信息
    const userIds = latestVehicles.map((v: any) => v.user_id).filter(Boolean)
    const {data: profilesData, error: profilesError} = await supabase
      .from('profiles')
      .select('id, name, phone, email')
      .in('id', userIds)

    if (profilesError) {
      logger.error('获取司机信息失败', {error: profilesError.message})
      // 即使获取司机信息失败，也返回车辆数据（只是没有司机信息）
    }

    // 第四步：获取司机的实名信息（身份证姓名）
    const {data: licensesData, error: licensesError} = await supabase
      .from('driver_licenses')
      .select('driver_id, id_card_name')
      .in('driver_id', userIds)

    if (licensesError) {
      logger.error('获取司机实名信息失败', {error: licensesError.message})
    }

    // 第五步：创建司机信息映射
    const profilesMap = new Map()
    if (profilesData) {
      profilesData.forEach((profile: any) => {
        profilesMap.set(profile.id, profile)
      })
    }

    // 创建实名信息映射
    const licensesMap = new Map()
    if (licensesData) {
      licensesData.forEach((license: any) => {
        licensesMap.set(license.driver_id, license)
      })
    }

    // 第六步：合并数据，优先使用身份证实名
    const vehicles: VehicleWithDriver[] = latestVehicles.map((item: any) => {
      const profile = profilesMap.get(item.user_id)
      const license = licensesMap.get(item.user_id)
      // 优先使用身份证实名，如果没有则使用系统注册姓名
      const displayName = license?.id_card_name || profile?.name || null
      return {
        ...item,
        driver_id: profile?.id || null,
        driver_name: displayName,
        driver_phone: profile?.phone || null,
        driver_email: profile?.email || null
      }
    })

    logger.info(`成功获取所有车辆列表（包括所有状态），共 ${vehicles.length} 辆`, {
      count: vehicles.length,
      withDriver: vehicles.filter((v) => v.driver_id).length,
      withoutDriver: vehicles.filter((v) => !v.driver_id).length,
      returned: vehicles.filter((v) => v.return_time).length,
      active: vehicles.filter((v) => !v.return_time).length
    })
    return vehicles
  } catch (error) {
    logger.error('获取所有车辆异常', {error})
    return []
  }
}

/**
 * 根据ID获取车辆信息
 */
export async function getVehicleById(vehicleId: string): Promise<Vehicle | null> {
  logger.db('查询', 'vehicles', {vehicleId})
  try {
    const {data, error} = await supabase.from('vehicles').select('*').eq('id', vehicleId).maybeSingle()

    if (error) {
      logger.error('获取车辆信息失败', error)
      return null
    }

    if (data) {
      logger.info('成功获取车辆信息', {vehicleId, plate: data.plate_number})
    } else {
      logger.warn('车辆不存在', {vehicleId})
    }
    return data
  } catch (error) {
    logger.error('获取车辆信息异常', error)
    return null
  }
}

/**
 * 根据车辆ID获取车辆信息（包含司机详细信息）
 */
export async function getVehicleWithDriverDetails(vehicleId: string): Promise<VehicleWithDriverDetails | null> {
  logger.db('查询', 'vehicles with driver details', {vehicleId})
  try {
    // 1. 获取车辆基本信息
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) {
      logger.warn('车辆不存在', {vehicleId})
      return null
    }

    // 2. 获取司机基本信息（从profiles表）
    const {data: profile, error: profileError} = await supabase
      .from('profiles')
      .select('name, phone, email')
      .eq('id', vehicle.user_id)
      .maybeSingle()

    if (profileError) {
      logger.error('获取司机基本信息失败', {error: profileError})
    }

    // 3. 获取司机证件信息（从driver_licenses表）
    const {data: driverLicense, error: licenseError} = await supabase
      .from('driver_licenses')
      .select(
        'id_card_name, id_card_number, id_card_address, id_card_birth_date, id_card_photo_front, id_card_photo_back, license_number, license_class, first_issue_date, valid_from, valid_to, issue_authority, driving_license_photo'
      )
      .eq('driver_id', vehicle.user_id)
      .maybeSingle()

    if (licenseError) {
      logger.error('获取司机证件信息失败', {error: licenseError})
    }

    // 4. 组合数据
    const result: VehicleWithDriverDetails = {
      ...vehicle,
      driver_profile: profile
        ? {
            name: profile.name || null,
            phone: profile.phone || null,
            email: profile.email || null
          }
        : null,
      driver_license: driverLicense
        ? {
            id_card_name: driverLicense.id_card_name || null,
            id_card_number: driverLicense.id_card_number || null,
            id_card_address: driverLicense.id_card_address || null,
            id_card_birth_date: driverLicense.id_card_birth_date || null,
            id_card_photo_front: driverLicense.id_card_photo_front || null,
            id_card_photo_back: driverLicense.id_card_photo_back || null,
            license_number: driverLicense.license_number || null,
            license_class: driverLicense.license_class || null,
            first_issue_date: driverLicense.first_issue_date || null,
            valid_from: driverLicense.valid_from || null,
            valid_to: driverLicense.valid_to || null,
            issue_authority: driverLicense.issue_authority || null,
            driving_license_photo: driverLicense.driving_license_photo || null
          }
        : null
    }

    logger.info('成功获取车辆和司机详细信息', {vehicleId, hasProfile: !!profile, hasLicense: !!driverLicense})
    return result
  } catch (error) {
    logger.error('获取车辆和司机详细信息异常', error)
    return null
  }
}

/**
 * 根据司机ID获取车辆列表
 */
export async function getVehiclesByDriverId(driverId: string): Promise<Vehicle[]> {
  logger.db('查询', 'vehicles', {driverId})
  try {
    const {data, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', driverId)
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('获取司机车辆列表失败', error)
      return []
    }

    logger.info('成功获取司机车辆列表', {driverId, count: data?.length || 0})
    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error('获取司机车辆列表异常', error)
    return []
  }
}

/**
 * 添加车辆
 */
export async function insertVehicle(vehicle: VehicleInput): Promise<Vehicle | null> {
  logger.db('插入', 'vehicles', {plate: vehicle.plate_number})
  try {
    const {data, error} = await supabase.from('vehicles').insert(vehicle).select().maybeSingle()

    if (error) {
      logger.error('添加车辆失败', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        vehicle
      })
      return null
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('成功添加车辆', {vehicleId: data?.id, plate: data?.plate_number})
    return data
  } catch (error) {
    logger.error('添加车辆异常', error)
    return null
  }
}

/**
 * 更新车辆信息
 */
export async function updateVehicle(vehicleId: string, updates: VehicleUpdate): Promise<Vehicle | null> {
  logger.db('更新', 'vehicles', {vehicleId, updates})
  try {
    // 在新的数据库设计中，所有车辆信息都在 vehicles 表中
    const {data, error} = await supabase
      .from('vehicles')
      .update({...updates, updated_at: new Date().toISOString()})
      .eq('id', vehicleId)
      .select()
      .maybeSingle()

    if (error) {
      logger.error('更新车辆信息失败', error)
      return null
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('成功更新车辆信息', {vehicleId, plate: data?.plate_number})
    return data
  } catch (error) {
    logger.error('更新车辆信息异常', error)
    return null
  }
}

/**
 * 删除车辆（包含图片文件）
 */
export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  logger.db('删除', 'vehicles', {vehicleId})
  try {
    // 1. 先获取车辆信息，获取所有图片路径
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) {
      logger.error('车辆不存在', {vehicleId})
      return false
    }

    // 2. 收集所有图片路径
    const allPhotos: string[] = []
    if (vehicle.pickup_photos) {
      allPhotos.push(...vehicle.pickup_photos)
    }
    if (vehicle.return_photos) {
      allPhotos.push(...vehicle.return_photos)
    }
    if (vehicle.registration_photos) {
      allPhotos.push(...vehicle.registration_photos)
    }

    // 3. 删除存储桶中的图片文件
    const bucketName = `${process.env.TARO_APP_APP_ID}_images`
    if (allPhotos.length > 0) {
      logger.info('开始删除图片文件', {vehicleId, photoCount: allPhotos.length})

      // 过滤出相对路径（不是完整URL的）
      const photoPaths = allPhotos.filter((photo) => {
        return photo && !photo.startsWith('http://') && !photo.startsWith('https://')
      })

      if (photoPaths.length > 0) {
        const {error: storageError} = await supabase.storage.from(bucketName).remove(photoPaths)

        if (storageError) {
          logger.warn('删除部分图片文件失败', {error: storageError, paths: photoPaths})
          // 继续删除数据库记录，即使图片删除失败
        } else {
          logger.info('成功删除图片文件', {vehicleId, deletedCount: photoPaths.length})
        }
      }
    }

    // 4. 删除数据库记录
    const {error} = await supabase.from('vehicles').delete().eq('id', vehicleId)

    if (error) {
      logger.error('删除车辆失败', error)
      return false
    }

    // 5. 清除相关缓存
    // 清除所有司机的车辆列表缓存（因为缓存键包含司机ID）
    clearCacheByPrefix('driver_vehicles_')
    // 清除全局车辆缓存
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('成功删除车辆及关联文件', {vehicleId, photoCount: allPhotos.length})
    return true
  } catch (error) {
    logger.error('删除车辆异常', error)
    return false
  }
}

/**
 * 还车录入
 * @param vehicleId 车辆ID
 * @param returnPhotos 还车照片URL数组
 * @returns 更新后的车辆信息
 */
export async function returnVehicle(vehicleId: string, returnPhotos: string[]): Promise<Vehicle | null> {
  logger.db('更新', 'vehicles', {vehicleId, action: '还车录入'})
  try {
    // 还车时需要更新：return_time、return_photos 和 status
    // status 设置为 'inactive' 表示车辆已停用
    const {data, error} = await supabase
      .from('vehicles')
      .update({
        return_time: new Date().toISOString(),
        return_photos: returnPhotos,
        status: 'inactive' // 还车后将状态设置为已停用
      })
      .eq('id', vehicleId)
      .select()
      .maybeSingle()

    if (error) {
      logger.error('还车录入失败', error)
      return null
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('成功完成还车录入', {vehicleId, status: 'inactive'})
    return data
  } catch (error) {
    logger.error('还车录入异常', error)
    return null
  }
}

/**
 * 根据车牌号获取车辆信息（用于历史记录页面）
 * @param plateNumber 车牌号
 * @returns 车辆信息，包含司机信息和证件照片
 */
export async function getVehicleByPlateNumber(plateNumber: string): Promise<VehicleWithDriver | null> {
  logger.db('查询', 'vehicles', {plateNumber})
  try {
    const {data, error} = await supabase
      .from('vehicles')
      .select(
        `
        *,
        driver:driver_id (
          id,
          name,
          phone,
          email
        )
      `
      )
      .eq('plate_number', plateNumber)
      .maybeSingle()

    if (error) {
      logger.error('根据车牌号获取车辆信息失败', {error, plateNumber})
      return null
    }

    if (!data) {
      logger.warn('车辆不存在', {plateNumber})
      return null
    }

    let driverId = data.driver_id

    // 如果车辆当前没有司机（已还车），从最近的 vehicle_records 中获取司机信息
    if (!driverId && data.return_time) {
      const {data: recordData} = await supabase
        .from('vehicle_records')
        .select('driver_id')
        .eq('vehicle_id', data.id)
        .order('pickup_time', {ascending: false})
        .limit(1)
        .maybeSingle()

      if (recordData?.driver_id) {
        driverId = recordData.driver_id
        // 查询司机信息
        const {data: driverData} = await supabase
          .from('profiles')
          .select('id, name, phone, email')
          .eq('id', driverId)
          .maybeSingle()

        if (driverData) {
          ;(data as any).driver = driverData
        }
      }
    }

    // 如果有司机信息，查询司机的证件照片和实名信息
    if (driverId) {
      const {data: licenseData} = await supabase
        .from('driver_licenses')
        .select(
          `
          id_card_photo_front,
          id_card_photo_back,
          driving_license_photo,
          id_card_name,
          id_card_number,
          id_card_address,
          id_card_birth_date,
          license_number,
          license_class,
          first_issue_date,
          valid_from,
          valid_to,
          issue_authority
          `
        )
        .eq('driver_id', driverId)
        .maybeSingle()

      if (licenseData) {
        // 将证件照片和实名信息添加到返回数据中
        ;(data as any).driver_license = licenseData
      }
    }

    logger.info('成功获取车辆信息', {plateNumber, vehicleId: data.id})
    return data as VehicleWithDriver
  } catch (error) {
    logger.error('根据车牌号获取车辆信息异常', {error, plateNumber})
    return null
  }
}

// ==================== 驾驶员证件管理 API ====================

/**
 * 获取驾驶员证件信息
 */
export async function getDriverLicense(driverId: string): Promise<DriverLicense | null> {
  logger.db('查询', 'driver_licenses', {driverId})
  try {
    const {data, error} = await supabase.from('driver_licenses').select('*').eq('driver_id', driverId).maybeSingle()

    if (error) {
      logger.error('获取驾驶员证件信息失败', error)
      return null
    }

    if (data) {
      logger.info('成功获取驾驶员证件信息', {driverId, hasIdCard: !!data.id_card_front_url})
    } else {
      logger.warn('驾驶员证件信息不存在', {driverId})
    }
    return data
  } catch (error) {
    logger.error('获取驾驶员证件信息异常', error)
    return null
  }
}

/**
 * 添加或更新驾驶员证件信息
 */
export async function upsertDriverLicense(license: DriverLicenseInput): Promise<DriverLicense | null> {
  logger.db('插入/更新', 'driver_licenses', {driverId: license.driver_id})
  try {
    const {data, error} = await supabase
      .from('driver_licenses')
      .upsert(license, {onConflict: 'driver_id'})
      .select()
      .maybeSingle()

    if (error) {
      logger.error('保存驾驶员证件信息失败', error)
      return null
    }

    logger.info('成功保存驾驶员证件信息', {driverId: license.driver_id})
    return data
  } catch (error) {
    logger.error('保存驾驶员证件信息异常', error)
    return null
  }
}

/**
 * 更新驾驶员证件信息
 */
export async function updateDriverLicense(
  driverId: string,
  updates: DriverLicenseUpdate
): Promise<DriverLicense | null> {
  logger.db('更新', 'driver_licenses', {driverId, updates})
  try {
    const {data, error} = await supabase
      .from('driver_licenses')
      .update({...updates, updated_at: new Date().toISOString()})
      .eq('driver_id', driverId)
      .select()
      .maybeSingle()

    if (error) {
      logger.error('更新驾驶员证件信息失败', error)
      return null
    }

    logger.info('成功更新驾驶员证件信息', {driverId})
    return data
  } catch (error) {
    logger.error('更新驾驶员证件信息异常', error)
    return null
  }
}

/**
 * 删除驾驶员证件信息
 * @param driverId 驾驶员ID
 * @returns 是否删除成功
 */
export async function deleteDriverLicense(driverId: string): Promise<boolean> {
  try {
    // 先获取驾驶证信息，用于删除关联的图片
    const license = await getDriverLicense(driverId)

    // 删除数据库记录
    const {error} = await supabase.from('driver_licenses').delete().eq('driver_id', driverId)

    if (error) {
      console.error('删除驾驶员证件信息失败:', error)
      return false
    }

    // 删除关联的图片文件（如果存在）
    if (license) {
      const imagePaths: string[] = []
      if (license.id_card_photo_front) imagePaths.push(license.id_card_photo_front)
      if (license.id_card_photo_back) imagePaths.push(license.id_card_photo_back)
      if (license.driving_license_photo) imagePaths.push(license.driving_license_photo)

      // 从storage中删除图片
      if (imagePaths.length > 0) {
        // 过滤出相对路径（不是完整URL的）
        const relativeImagePaths = imagePaths.filter(
          (path) => !path.startsWith('http://') && !path.startsWith('https://')
        )

        if (relativeImagePaths.length > 0) {
          const bucketName = `${process.env.TARO_APP_APP_ID}_vehicles`
          const {error: deleteError} = await supabase.storage.from(bucketName).remove(relativeImagePaths)

          if (deleteError) {
            console.warn('删除证件照片失败:', deleteError)
            // 不影响主流程，继续返回成功
          }
        }
      }
    }

    return true
  } catch (error) {
    console.error('删除驾驶员证件信息异常:', error)
    return false
  }
}

/**
 * 获取司机的详细信息（包括驾驶证和车辆信息）
 * @param driverId 司机ID
 * @returns 司机详细信息
 */
export async function getDriverDetailInfo(driverId: string) {
  try {
    // 获取司机基本信息
    const profile = await getProfileById(driverId)
    if (!profile) {
      return null
    }

    // 获取驾驶证信息
    const license = await getDriverLicense(driverId)

    // 获取车辆信息
    const vehicles = await getVehiclesByDriverId(driverId)

    // 计算年龄
    let age: number | null = null
    if (license?.id_card_birth_date) {
      const birth = new Date(license.id_card_birth_date)
      const today = new Date()
      age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
    }

    // 计算驾龄
    let drivingYears: number | null = null
    if (license?.first_issue_date) {
      const issueDate = new Date(license.first_issue_date)
      const today = new Date()
      drivingYears = today.getFullYear() - issueDate.getFullYear()
      const monthDiff = today.getMonth() - issueDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < issueDate.getDate())) {
        drivingYears--
      }
    }

    // 计算在职天数
    let workDays: number | null = null
    let joinDate: string | null = null

    // 优先使用join_date，如果没有则使用created_at
    if (profile.join_date) {
      joinDate = profile.join_date
    } else if (profile.created_at) {
      joinDate = profile.created_at.split('T')[0] // 只取日期部分
    }

    if (joinDate) {
      const join = new Date(joinDate)
      const today = new Date()
      // 计算天数差
      const timeDiff = today.getTime() - join.getTime()
      workDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
    }

    // 从profile中读取司机类型
    const driverType =
      profile.driver_type === 'with_vehicle' ? '带车司机' : profile.driver_type === 'pure' ? '纯司机' : '未设置'

    return {
      profile,
      license,
      vehicles,
      age,
      drivingYears,
      driverType,
      joinDate,
      workDays
    }
  } catch (error) {
    console.error('获取司机详细信息失败:', error)
    return null
  }
}

// ==================== 车辆审核管理 API ====================

/**
 * 提交车辆审核
 * @param vehicleId 车辆ID
 * @returns 是否成功
 */
export async function submitVehicleForReview(vehicleId: string): Promise<boolean> {
  try {
    logger.db('提交车辆审核', 'vehicles', {vehicleId})

    const {error} = await supabase
      .from('vehicles')
      .update({
        review_status: 'pending_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (error) {
      logger.error('提交车辆审核失败', error)
      return false
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('提交车辆审核成功', {vehicleId})
    return true
  } catch (error) {
    logger.error('提交车辆审核异常', error)
    return false
  }
}

/**
 * 获取待审核车辆列表
 * @returns 待审核车辆列表
 */
export async function getPendingReviewVehicles(): Promise<Vehicle[]> {
  try {
    logger.db('查询待审核车辆列表', 'vehicles', {})

    const {data, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('review_status', 'pending_review')
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('查询待审核车辆列表失败', error)
      return []
    }

    logger.info('查询待审核车辆列表成功', {count: data?.length || 0})
    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error('查询待审核车辆列表异常', error)
    return []
  }
}

/**
 * 锁定图片
 * @param vehicleId 车辆ID
 * @param photoField 图片字段名（pickup_photos, return_photos, registration_photos）
 * @param photoIndex 图片索引
 * @returns 是否成功
 */
export async function lockPhoto(vehicleId: string, photoField: string, photoIndex: number): Promise<boolean> {
  try {
    logger.db('锁定图片', 'vehicles', {vehicleId, photoField, photoIndex})

    // 先获取当前的 locked_photos
    const {data: vehicle, error: fetchError} = await supabase
      .from('vehicles')
      .select('locked_photos')
      .eq('id', vehicleId)
      .maybeSingle()

    if (fetchError || !vehicle) {
      logger.error('获取车辆信息失败', fetchError)
      return false
    }

    const lockedPhotos = vehicle.locked_photos || {}
    const fieldLocks = lockedPhotos[photoField] || []

    // 如果该索引尚未锁定，则添加
    if (!fieldLocks.includes(photoIndex)) {
      fieldLocks.push(photoIndex)
      lockedPhotos[photoField] = fieldLocks

      const {error: updateError} = await supabase
        .from('vehicles')
        .update({
          locked_photos: lockedPhotos,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)

      if (updateError) {
        logger.error('锁定图片失败', updateError)
        return false
      }

      // 清除相关缓存
      clearCacheByPrefix('driver_vehicles_')
      clearCache(CACHE_KEYS.ALL_VEHICLES)
    }

    logger.info('锁定图片成功', {vehicleId, photoField, photoIndex})
    return true
  } catch (error) {
    logger.error('锁定图片异常', error)
    return false
  }
}

/**
 * 解锁图片
 * @param vehicleId 车辆ID
 * @param photoField 图片字段名
 * @param photoIndex 图片索引
 * @returns 是否成功
 */
export async function unlockPhoto(vehicleId: string, photoField: string, photoIndex: number): Promise<boolean> {
  try {
    logger.db('解锁图片', 'vehicles', {vehicleId, photoField, photoIndex})

    // 先获取当前的 locked_photos
    const {data: vehicle, error: fetchError} = await supabase
      .from('vehicles')
      .select('locked_photos')
      .eq('id', vehicleId)
      .maybeSingle()

    if (fetchError || !vehicle) {
      logger.error('获取车辆信息失败', fetchError)
      return false
    }

    const lockedPhotos = vehicle.locked_photos || {}
    const fieldLocks = lockedPhotos[photoField] || []

    // 移除锁定
    const newFieldLocks = fieldLocks.filter((idx: number) => idx !== photoIndex)
    lockedPhotos[photoField] = newFieldLocks

    const {error: updateError} = await supabase
      .from('vehicles')
      .update({
        locked_photos: lockedPhotos,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (updateError) {
      logger.error('解锁图片失败', updateError)
      return false
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('解锁图片成功', {vehicleId, photoField, photoIndex})
    return true
  } catch (error) {
    logger.error('解锁图片异常', error)
    return false
  }
}

/**
 * 删除图片（标记为需补录）
 * @param vehicleId 车辆ID
 * @param photoField 图片字段名
 * @param photoIndex 图片索引
 * @returns 是否成功
 */
export async function markPhotoForDeletion(
  vehicleId: string,
  photoField: string,
  photoIndex: number
): Promise<boolean> {
  try {
    logger.db('标记图片需补录', 'vehicles', {vehicleId, photoField, photoIndex})

    // 先获取当前的 required_photos
    const {data: vehicle, error: fetchError} = await supabase
      .from('vehicles')
      .select('required_photos')
      .eq('id', vehicleId)
      .maybeSingle()

    if (fetchError || !vehicle) {
      logger.error('获取车辆信息失败', fetchError)
      return false
    }

    const requiredPhotos = vehicle.required_photos || []
    const photoKey = `${photoField}_${photoIndex}`

    // 如果尚未标记，则添加
    if (!requiredPhotos.includes(photoKey)) {
      requiredPhotos.push(photoKey)

      const {error: updateError} = await supabase
        .from('vehicles')
        .update({
          required_photos: requiredPhotos,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)

      if (updateError) {
        logger.error('标记图片需补录失败', updateError)
        return false
      }
    }

    logger.info('标记图片需补录成功', {vehicleId, photoField, photoIndex})
    return true
  } catch (error) {
    logger.error('标记图片需补录异常', error)
    return false
  }
}

/**
 * 通过审核
 * @param vehicleId 车辆ID
 * @param reviewerId 审核人ID
 * @param notes 审核备注
 * @returns 是否成功
 */
export async function approveVehicle(vehicleId: string, reviewerId: string, notes: string): Promise<boolean> {
  try {
    logger.db('通过车辆审核', 'vehicles', {vehicleId, reviewerId, notes})

    const {error} = await supabase
      .from('vehicles')
      .update({
        review_status: 'approved',
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        required_photos: [], // 清空需补录列表
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (error) {
      logger.error('通过车辆审核失败', error)
      return false
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('通过车辆审核成功', {vehicleId})
    return true
  } catch (error) {
    logger.error('通过车辆审核异常', error)
    return false
  }
}

/**
 * 一键锁定车辆（锁定所有未标记需要补录的照片）
 * @param vehicleId 车辆ID
 * @param reviewerId 审核人ID
 * @param notes 审核备注
 * @param lockedPhotos 已锁定的照片信息
 * @returns 是否成功
 */
export async function lockVehiclePhotos(
  vehicleId: string,
  reviewerId: string,
  notes: string,
  lockedPhotos: LockedPhotos
): Promise<boolean> {
  try {
    logger.db('一键锁定车辆照片', 'vehicles', {vehicleId, reviewerId, notes, lockedPhotos})

    const {error} = await supabase
      .from('vehicles')
      .update({
        review_status: 'approved',
        locked_photos: lockedPhotos,
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (error) {
      logger.error('一键锁定车辆照片失败', error)
      return false
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('一键锁定车辆照片成功', {vehicleId})
    return true
  } catch (error) {
    logger.error('一键锁定车辆照片异常', error)
    return false
  }
}

/**
 * 要求补录
 * @param vehicleId 车辆ID
 * @param reviewerId 审核人ID
 * @param notes 审核备注
 * @returns 是否成功
 */
export async function requireSupplement(vehicleId: string, reviewerId: string, notes: string): Promise<boolean> {
  try {
    logger.db('要求补录车辆信息', 'vehicles', {vehicleId, reviewerId, notes})

    const {error} = await supabase
      .from('vehicles')
      .update({
        review_status: 'need_supplement',
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (error) {
      logger.error('要求补录车辆信息失败', error)
      return false
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('要求补录车辆信息成功', {vehicleId})
    return true
  } catch (error) {
    logger.error('要求补录车辆信息异常', error)
    return false
  }
}

/**
 * 补录图片
 * @param vehicleId 车辆ID
 * @param photoField 图片字段名
 * @param photoIndex 图片索引
 * @param photoUrl 新图片URL
 * @returns 是否成功
 */
export async function supplementPhoto(
  vehicleId: string,
  photoField: string,
  photoIndex: number,
  photoUrl: string
): Promise<boolean> {
  try {
    logger.db('补录图片', 'vehicles', {vehicleId, photoField, photoIndex, photoUrl})

    // 获取当前车辆信息
    const {data: vehicle, error: fetchError} = await supabase
      .from('vehicles')
      .select('pickup_photos, return_photos, registration_photos, required_photos')
      .eq('id', vehicleId)
      .maybeSingle()

    if (fetchError || !vehicle) {
      logger.error('获取车辆信息失败', {
        fetchError,
        vehicleId,
        message: fetchError?.message,
        details: fetchError?.details
      })
      return false
    }

    // 更新图片数组
    const photos = (vehicle as any)[photoField] || []
    photos[photoIndex] = photoUrl

    // 从需补录列表中移除
    const requiredPhotos = vehicle.required_photos || []
    const photoKey = `${photoField}_${photoIndex}`
    const newRequiredPhotos = requiredPhotos.filter((key: string) => key !== photoKey)

    logger.info('准备更新车辆图片', {
      vehicleId,
      photoField,
      photoIndex,
      photosLength: photos.length,
      requiredPhotosCount: requiredPhotos.length,
      newRequiredPhotosCount: newRequiredPhotos.length
    })

    const {error: updateError} = await supabase
      .from('vehicles')
      .update({
        [photoField]: photos,
        required_photos: newRequiredPhotos,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (updateError) {
      logger.error('补录图片失败', {
        updateError,
        vehicleId,
        photoField,
        photoIndex,
        message: updateError?.message,
        details: updateError?.details,
        hint: updateError?.hint,
        code: updateError?.code
      })
      return false
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('补录图片成功', {vehicleId, photoField, photoIndex})
    return true
  } catch (error) {
    logger.error('补录图片异常', {error, vehicleId, photoField, photoIndex})
    return false
  }
}

/**
 * 获取需要补录的图片列表
 * @param vehicleId 车辆ID
 * @returns 需要补录的图片字段列表
 */
export async function getRequiredPhotos(vehicleId: string): Promise<string[]> {
  try {
    logger.db('获取需要补录的图片列表', 'vehicles', {vehicleId})

    const {data, error} = await supabase.from('vehicles').select('required_photos').eq('id', vehicleId).maybeSingle()

    if (error || !data) {
      logger.error('获取需要补录的图片列表失败', error)
      return []
    }

    logger.info('获取需要补录的图片列表成功', {vehicleId, count: data.required_photos?.length || 0})
    return data.required_photos || []
  } catch (error) {
    logger.error('获取需要补录的图片列表异常', error)
    return []
  }
}

// ==================== 通知系统 ====================

/**
 * 创建通知
 * @param notification 通知信息
 * @returns 创建的通知ID，失败返回null
 */
export async function createNotification(notification: {
  user_id: string
  type: string
  title: string
  message: string
  related_id?: string
}): Promise<string | null> {
  try {
    logger.info('创建通知', notification)

    const {data, error} = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        related_id: notification.related_id,
        is_read: false
      })
      .select('id')
      .maybeSingle()

    if (error) {
      logger.error('创建通知失败', error)
      return null
    }

    logger.info('创建通知成功', {notificationId: data?.id})
    return data?.id || null
  } catch (error) {
    logger.error('创建通知异常', error)
    return null
  }
}

/**
 * 为所有管理员创建通知
 * @param notification 通知信息（不包含user_id）
 * @returns 成功创建的通知数量
 */
export async function createNotificationForAllManagers(notification: {
  type: string
  title: string
  message: string
  related_id?: string
}): Promise<number> {
  try {
    logger.info('为所有管理员创建通知', notification)

    // 获取所有管理员和超级管理员
    const {data: managers, error: managersError} = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['manager', 'super_admin'])

    if (managersError) {
      logger.error('获取管理员列表失败', managersError)
      return 0
    }

    if (!managers || managers.length === 0) {
      logger.warn('没有找到管理员')
      return 0
    }

    logger.info('找到管理员', {count: managers.length})

    // 为每个管理员创建通知
    const notifications = managers.map((manager) => ({
      user_id: manager.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      related_id: notification.related_id || null,
      is_read: false
    }))

    // 使用 SECURITY DEFINER 函数批量创建通知，绕过 RLS 限制
    const {data, error} = await supabase.rpc('create_notifications_batch', {
      notifications: notifications
    })

    if (error) {
      logger.error('批量创建通知失败', error)
      return 0
    }

    const count = data || 0
    logger.info('批量创建通知成功', {count})
    return count
  } catch (error) {
    logger.error('批量创建通知异常', error)
    return 0
  }
}

/**
 * 获取司机姓名
 * @param userId 用户ID
 * @returns 司机姓名，失败返回"未知司机"
 */
/**
 * 获取司机的显示名称（包含司机类型和姓名）
 * @param userId 用户ID
 * @returns 格式化的司机名称，例如："纯司机 张三" 或 "带车司机 李四"
 */
export async function getDriverDisplayName(userId: string): Promise<string> {
  try {
    const {data, error} = await supabase.from('profiles').select('name, driver_type').eq('id', userId).maybeSingle()

    if (error || !data) {
      logger.error('获取司机信息失败', {userId, error})
      return '未知司机'
    }

    // 司机类型映射
    const driverTypeMap: Record<string, string> = {
      pure: '纯司机',
      with_vehicle: '带车司机'
    }

    const driverType = data.driver_type ? driverTypeMap[data.driver_type] || '司机' : '司机'
    const driverName = data.name || '未知'

    return `${driverType} ${driverName}`
  } catch (error) {
    logger.error('获取司机信息异常', {userId, error})
    return '未知司机'
  }
}

/**
 * 获取司机姓名（仅姓名，不含类型）
 * @deprecated 建议使用 getDriverDisplayName 获取完整的显示名称
 */
export async function getDriverName(userId: string): Promise<string> {
  try {
    const {data, error} = await supabase.from('profiles').select('name').eq('id', userId).maybeSingle()

    if (error || !data) {
      logger.error('获取司机姓名失败', {userId, error})
      return '未知司机'
    }

    return data.name || '未知司机'
  } catch (error) {
    logger.error('获取司机姓名异常', {userId, error})
    return '未知司机'
  }
}
