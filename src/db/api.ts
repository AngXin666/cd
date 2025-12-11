import {supabase} from '@/client/supabase'
import {sendDriverSubmissionNotification} from '@/services/notificationService'
import {CACHE_KEYS, clearCache, clearCacheByPrefix, getCache, setCache} from '@/utils/cache'
import {formatLeaveDate} from '@/utils/dateFormat'
import {createLogger} from '@/utils/logger'
import {
  convertUsersToProfiles,
  convertUserToProfile,
  getUsersByRole,
  getUsersWithRole,
  getUserWithRole
} from './helpers'
import type {
  ApplicationReviewInput,
  AttendanceRecord,
  AttendanceRecordInput,
  AttendanceRecordUpdate,
  AttendanceRule,
  AttendanceRuleInput,
  AttendanceRuleUpdate,
  AutoReminderRule,
  AutoReminderRuleWithWarehouse,
  CategoryPrice,
  CategoryPriceInput,
  CreateNotificationInput,
  DriverLicense,
  DriverLicenseInput,
  DriverLicenseUpdate,
  DriverType,
  DriverWarehouse,
  DriverWarehouseInput,
  LeaveApplication,
  LeaveApplicationInput,
  LockedPhotos,
  ManagerPermission,
  ManagerPermissionInput,
  Notification,
  NotificationSendRecord,
  NotificationSendRecordWithSender,
  NotificationTemplate,
  PieceWorkCategory,
  PieceWorkCategoryInput,
  PieceWorkRecord,
  PieceWorkRecordInput,
  PieceWorkStats,
  Profile,
  ProfileUpdate,
  ResignationApplication,
  ResignationApplicationInput,
  ScheduledNotification,
  SenderRole,
  UserRole,
  UserWithRole,
  Vehicle,
  VehicleInput,
  VehicleUpdate,
  VehicleWithDocuments,
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
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserProfile] 获取认证用户失败:', authError)
      return null
    }

    if (!user) {
      return null
    }

    // 使用 helpers 中的函数查询用户信息（从 users + user_roles 表）
    const userWithRole = await getUserWithRole(user.id)

    if (!userWithRole) {
      return null
    }

    return convertUserToProfile(userWithRole)
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
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserWithRealName] 获取认证用户失败:', authError)
      return null
    }

    if (!user) {
      return null
    }

    // 使用 helpers 中的函数查询用户信息（从 users + user_roles 表）
    const userWithRole = await getUserWithRole(user.id)

    if (!userWithRole) {
      return null
    }

    // 查询驾驶证信息获取真实姓名
    const {data: licenseData} = await supabase
      .from('driver_licenses')
      .select('id_card_name')
      .eq('driver_id', user.id)
      .maybeSingle()

    const realName = licenseData?.id_card_name || null

    const profile = convertUserToProfile(userWithRole)

    // 返回包含真实姓名的用户信息
    return {
      ...profile,
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
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserRole] 获取认证用户失败:', authError)
      return null
    }

    if (!user) {
      return null
    }

    // 从 users 表查询用户角色
    const {data, error} = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()

    if (error) {
      console.error('[getCurrentUserRole] 查询用户角色失败:', error)
      return null
    }

    if (!data) {
      return null
    }

    return data.role as UserRole
  } catch (error) {
    console.error('[getCurrentUserRole] 未预期的错误:', error)
    return null
  }
}

/**
 * 获取指定用户的所有角色
 * 注意：系统约束确保每个用户只有一个角色，此函数返回数组是为了保持接口兼容性
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  try {
    // 从 users 表查询用户角色
    const {data, error} = await supabase.from('users').select('role').eq('id', userId).maybeSingle()

    if (error) {
      console.error('[getUserRoles] 查询用户角色失败:', error)
      return []
    }

    const roles = data?.role ? [data.role] : []
    return roles
  } catch (error) {
    console.error('[getUserRoles] 未预期的错误:', error)
    return []
  }
}

/**
 * 获取当前用户的角色
 *
 * 注意：
 * - 当前系统为单用户架构，不再使用租户概念
 * - 所有用户都在 users 和 user_roles 表中
 * - tenant_id 已废弃，始终返回 null（保留用于兼容性）
 *
 * @returns {role, tenant_id} tenant_id 始终为 null
 */
export async function getCurrentUserRoleAndTenant(): Promise<{
  role: UserRole
  tenant_id: string | null
}> {
  try {
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserRoleAndTenant] 获取认证用户失败:', authError)
      throw new Error('获取认证用户失败')
    }

    if (!user) {
      throw new Error('用户未登录')
    }

    // 从 users 表查询用户角色
    const {data: roleData, error: roleError} = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (roleError) {
      console.error('[getCurrentUserRoleAndTenant] 查询 users 出错:', roleError)
      throw new Error('查询用户信息失败')
    }

    if (!roleData) {
      console.error('[getCurrentUserRoleAndTenant] 用户角色不存在')
      throw new Error('用户角色不存在')
    }

    // 单用户系统不再使用租户概念，tenant_id 始终返回 null
    const tenant_id = null

    return {role: roleData.role as UserRole, tenant_id}
  } catch (error) {
    console.error('[getCurrentUserRoleAndTenant] 发生错误:', error)
    // 返回默认值，避免应用崩溃
    return {role: 'DRIVER', tenant_id: null}
  }
}

/**
 * 获取所有用户档案
 * 单用户架构：从 users + user_roles 表查询
 */
export async function getAllProfiles(): Promise<Profile[]> {
  try {
    // 使用 helpers 中的函数查询所有用户
    const usersWithRole = await getUsersWithRole()

    if (!usersWithRole || usersWithRole.length === 0) {
      return []
    }

    // 转换为 Profile 格式
    return convertUsersToProfiles(usersWithRole)
  } catch (error) {
    console.error('获取所有用户档案异常:', error)
    return []
  }
}

/**
 * 获取所有司机档案（包含实名信息）
 * 通过LEFT JOIN driver_licenses表获取身份证姓名
 * 单用户架构：从 users + user_roles 表查询
 */
export async function getAllDriversWithRealName(): Promise<Array<Profile & {real_name: string | null}>> {
  logger.db('查询', 'users + user_roles + driver_licenses', {role: 'DRIVER'})
  try {
    // 获取当前用户信息
    const {
      data: {user}
    } = await supabase.auth.getUser()

    // 获取包含角色的完整用户信息
    const userWithRole = await getUserWithRole(user.id)

    // 使用 helpers 中的函数查询所有司机
    const drivers = await getUsersByRole('DRIVER', userWithRole)

    if (!drivers || drivers.length === 0) {
      return []
    }

    // 查询所有司机的驾驶证信息
    const driverIds = drivers.map((d) => d.id)
    const {data: licenses} = await supabase
      .from('driver_licenses')
      .select('driver_id, id_card_name')
      .in('driver_id', driverIds)

    // 创建驾驶证信息映射
    const licenseMap = new Map(licenses?.map((l) => [l.driver_id, l.id_card_name]) || [])

    // 转换为 Profile 格式并添加真实姓名
    const result = drivers.map((driver) => {
      const profile = convertUserToProfile(driver)
      return {
        ...profile,
        real_name: licenseMap.get(driver.id) || null
      }
    })

    return result
  } catch (error) {
    logger.error('获取司机列表异常', error)
    return []
  }
}

/**
 * 根据ID获取用户档案
 * 单用户架构：从 users + user_roles 表查询
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  try {
    // 使用 helpers 中的函数查询用户信息
    const userWithRole = await getUserWithRole(id)

    if (!userWithRole) {
      return null
    }

    // 转换为 Profile 格式
    return convertUserToProfile(userWithRole)
  } catch (error) {
    console.error('获取用户档案异常:', error)
    return null
  }
}

export async function updateProfile(id: string, updates: ProfileUpdate): Promise<boolean> {
  try {
    // 获取当前登录用户
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('❌ 用户未登录')
      return false
    }

    // 单用户架构：直接更新 users 和 user_roles 表
    const {role, ...userUpdates} = updates

    // 更新用户基本信息
    if (Object.keys(userUpdates).length > 0) {
      const {error: userError} = await supabase
        .from('users')
        .update({
          ...userUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (userError) {
        console.error('❌ 更新用户信息失败:', userError)
        return false
      }
    }

    // 更新用户角色
    if (role) {
      const {error: roleError} = await supabase.from('users').update({role}).eq('id', id)

      if (roleError) {
        console.error('❌ 更新用户角色失败:', roleError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('❌ 更新用户档案异常:', error)
    return false
  }
}

/**
 * 获取司机档案列表
 * 单用户架构：直接查询 DRIVER 角色的用户
 */
export async function getDriverProfiles(): Promise<Profile[]> {
  try {
    // 获取当前用户信息
    const {
      data: {user}
    } = await supabase.auth.getUser()

    // 获取包含角色的完整用户信息
    const userWithRole = await getUserWithRole(user.id)

    // 单用户架构：直接查询 DRIVER 角色的用户
    const drivers = await getUsersByRole('DRIVER', userWithRole)

    if (!drivers || drivers.length === 0) {
      return []
    }

    // 转换为 Profile 格式
    const profiles = convertUsersToProfiles(drivers)
    return profiles
  } catch (error) {
    console.error('❌ 获取司机档案异常:', error)
    return []
  }
}

/**
 * 获取管理员档案列表
 * 单用户架构：查询 MANAGER 和 BOSS 角色的用户
 */
export async function getManagerProfiles(): Promise<Profile[]> {
  try {
    // 单用户架构：查询所有用户，然后筛选 MANAGER 和 BOSS
    const allUsers = await getUsersWithRole()

    if (!allUsers || allUsers.length === 0) {
      return []
    }

    // 筛选 MANAGER 和 BOSS 角色
    const managers = allUsers.filter((u) => u.role === 'MANAGER' || u.role === 'BOSS')

    // 转换为 Profile 格式
    const profiles = convertUsersToProfiles(managers)

    return profiles
  } catch (error) {
    console.error('获取管理员档案异常:', error)
    return []
  }
}

// ==================== 考勤打卡相关API ====================

/**
 * 创建上班打卡记录
 */
export async function createClockIn(input: AttendanceRecordInput): Promise<AttendanceRecord | null> {
  // 1. 获取当前用户
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('创建打卡记录失败: 用户未登录')
    return null
  }

  // 验证必填字段
  if (!input.user_id) {
    console.error('创建打卡记录失败: 用户ID不能为空')
    return null
  }
  if (!input.work_date) {
    console.error('创建打卡记录失败: 工作日期不能为空')
    return null
  }
  if (!input.status) {
    console.error('创建打卡记录失败: 状态不能为空')
    return null
  }

  // 2. 检查是否已存在当天的打卡记录
  const {data: existingRecord} = await supabase
    .from('attendance')
    .select('id')
    .eq('user_id', input.user_id)
    .eq('work_date', input.work_date)
    .maybeSingle()

  // 3. 如果已存在，更新现有记录而非创建新记录
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

    // 清除考勤缓存
    if (data) {
      const date = new Date(data.work_date)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const cacheKey = `${CACHE_KEYS.ATTENDANCE_MONTHLY}_${data.user_id}_${year}_${month}`
      clearCache(cacheKey)
      const allCacheKey = `${CACHE_KEYS.ATTENDANCE_ALL_RECORDS}_${year}_${month}`
      clearCache(allCacheKey)
    }

    return data
  }

  // 4. 不存在则创建新记录
  const {data, error} = await supabase
    .from('attendance')
    .insert({
      ...input
    })
    .select()
    .maybeSingle()

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
  // 生成缓存键
  const cacheKey = `${CACHE_KEYS.ATTENDANCE_MONTHLY}_${userId}_${year}_${month}`

  // 尝试从缓存获取
  const cached = getCache<AttendanceRecord[]>(cacheKey)
  if (cached) {
    return cached
  }

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

  // 缓存30分钟
  setCache(cacheKey, result, 30 * 60 * 1000)

  return result
}

/**
 * 获取所有用户的考勤记录（管理员使用）
 * 使用30分钟缓存，减少频繁查询
 */
export async function getAllAttendanceRecords(year?: number, month?: number): Promise<AttendanceRecord[]> {
  // 获取当前用户信息，用于权限控制
  const {
    data: {user: authUser},
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    console.error('获取当前用户失败:', authError)
    return []
  }

  // 获取当前用户角色
  const {data: currentUser, error: userError} = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle()

  if (userError || !currentUser) {
    console.error('获取当前用户角色失败:', userError)
    return []
  }

  // 生成缓存键
  const cacheKey = `${CACHE_KEYS.ATTENDANCE_ALL_RECORDS}_${currentUser.role}_${authUser.id}_${year || 'all'}_${month || 'all'}`

  // 尝试从缓存获取
  const cached = getCache<AttendanceRecord[]>(cacheKey)
  if (cached) {
    return cached
  }

  let query = supabase.from('attendance').select('*')

  // 对于车队长角色，需要特殊处理：查看管辖司机的所有考勤记录
  if (currentUser.role === 'MANAGER') {
    // 获取车队长管理的所有仓库
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
      // 获取这些仓库下的所有司机ID
      const {data: driverAssignments, error: driverError} = await supabase
        .from('warehouse_assignments')
        .select('user_id')
        .in('warehouse_id', warehouseIds)

      if (driverError) {
        console.error('获取司机分配信息失败:', driverError)
        return []
      }

      // 去重司机ID
      const uniqueDriverIds = [...new Set(driverAssignments.map((d) => d.user_id))]

      if (uniqueDriverIds.length > 0) {
        // 只查询这些司机的考勤记录
        query = query.in('user_id', uniqueDriverIds)
      } else {
        // 如果没有管辖的司机，返回空数组
        return []
      }
    } else {
      // 如果没有管辖的仓库，返回空数组
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

  // 缓存30分钟
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
  // 1. 获取当前用户
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('创建仓库失败: 用户未登录')
    throw new Error('用户未登录')
  }

  // 2. 验证必填字段
  if (!input.name?.trim()) {
    console.error('创建仓库失败: 仓库名称不能为空')
    throw new Error('仓库名称不能为空')
  }
  if (!input.address?.trim()) {
    console.error('创建仓库失败: 仓库地址不能为空')
    throw new Error('仓库地址不能为空')
  }

  const {data, error} = await supabase
    .from('warehouses')
    .insert({
      name: input.name.trim(),
      address: input.address.trim(),
      is_active: input.is_active !== undefined ? input.is_active : true
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('创建仓库失败:', error)
    // 检查是否是重复名称错误
    if (error.code === '23505' && error.message.includes('warehouses_name_key')) {
      throw new Error('仓库名称已存在，请使用其他名称')
    }
    throw new Error('创建仓库失败，请稍后重试')
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
    // 检查是否是最后一个仓库的错误
    if (error.message?.includes('每个老板号必须保留至少一个仓库')) {
      throw new Error('无法删除：每个老板号必须保留至少一个仓库')
    }
    throw new Error('删除仓库失败，请稍后重试')
  }

  return true
}

// ==================== 考勤规则管理 ====================

/**
 * 获取仓库的考勤规则（返回最新的一条激活规则）
 */
export async function getAttendanceRuleByWarehouseId(warehouseId: string): Promise<AttendanceRule | null> {
  // 先尝试获取仓库专属规则
  let {data, error} = await supabase
    .from('attendance_rules')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)
    .order('created_at', {ascending: false})
    .limit(1)

  // 如果没有找到仓库专属规则，使用全局默认规则
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
  // 1. 获取当前用户
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
    throw new Error('创建考勤规则失败，请稍后重试')
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
  const {data, error} = await supabase
    .from('warehouse_assignments')
    .select('warehouse_id, warehouses(*)')
    .eq('user_id', driverId)

  if (error) {
    console.error('❌ 获取司机仓库失败 - Supabase 错误:', error)
    console.error('错误详情:', JSON.stringify(error, null, 2))
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // 提取仓库信息
  const warehouses = data.map((item: any) => item.warehouses).filter(Boolean)

  return warehouses
}

/**
 * 获取司机的仓库ID列表
 */
export async function getDriverWarehouseIds(driverId: string): Promise<string[]> {
  // 添加参数验证
  if (!driverId || driverId === 'anon' || driverId.length < 10) {
    logger.error('无效的司机 ID', {driverId})
    return []
  }

  logger.db('查询', 'warehouse_assignments', {driverId})

  const {data, error} = await supabase.from('warehouse_assignments').select('warehouse_id').eq('user_id', driverId)

  if (error) {
    logger.error('获取司机仓库ID失败', error)
    return []
  }

  const warehouseIds = data?.map((item) => item.warehouse_id) || []
  logger.db('查询成功', 'warehouse_assignments', {
    driverId,
    count: warehouseIds.length
  })
  return warehouseIds
}

/**
 * 获取仓库的司机列表
 * 单用户架构：直接查询 warehouse_assignments + users + user_roles
 */
export async function getDriversByWarehouse(warehouseId: string): Promise<Profile[]> {
  try {
    // 查询仓库的司机关联
    const {data: driverWarehouseData, error: dwError} = await supabase
      .from('warehouse_assignments')
      .select('user_id')
      .eq('warehouse_id', warehouseId)

    if (dwError) {
      console.error('获取仓库司机关联失败:', dwError)
      return []
    }

    if (!driverWarehouseData || driverWarehouseData.length === 0) {
      return []
    }

    const driverIds = driverWarehouseData.map((dw) => dw.user_id)

    // 单用户架构：从 users 表查询司机信息
    const [{data: users, error: usersError}, {data: roles, error: rolesError}] = await Promise.all([
      supabase.from('users').select('*').in('id', driverIds),
      supabase.from('users').select('id, role').in('id', driverIds)
    ])

    if (usersError) {
      console.error('查询 users 表失败:', usersError)
      return []
    }

    if (rolesError) {
      console.error('查询 user_roles 表失败:', rolesError)
      return []
    }

    // 合并用户和角色数据
    const profiles = (users || []).map((user) => {
      const roleData = (roles || []).find((r) => r.id === user.id)
      return convertUserToProfile({
        ...user,
        role: roleData?.role || 'DRIVER'
      })
    })

    return profiles
  } catch (error) {
    console.error('获取仓库司机失败:', error)
    return []
  }
}

/**
 * 为司机分配仓库
 */
export async function assignWarehouseToDriver(
  input: DriverWarehouseInput
): Promise<{success: boolean; error?: string}> {
  // 单用户架构：从 users 表查询司机信息
  const {data: driver, error: driverError} = await supabase
    .from('users')
    .select('name')
    .eq('id', input.user_id)
    .maybeSingle()

  if (driverError) {
    console.error('查询司机信息失败:', driverError)
    return {success: false, error: '查询司机信息失败'}
  }

  if (!driver) {
    console.error('司机不存在:', input.user_id)
    return {success: false, error: '司机不存在'}
  }

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

  // 3. 检查仓库是否被禁用
  if (!warehouse.is_active) {
    console.error('仓库已被禁用，不允许分配司机:', warehouse.name)
    return {success: false, error: `仓库"${warehouse.name}"已被禁用，不允许分配司机`}
  }

  // 4. 执行分配
  const {error} = await supabase.from('warehouse_assignments').insert({
    user_id: input.user_id,
    warehouse_id: input.warehouse_id
  })

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
    .from('warehouse_assignments')
    .delete()
    .eq('user_id', driverId)
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
  const {data, error} = await supabase.from('warehouse_assignments').select('*').order('created_at', {ascending: false})

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
    .from('warehouse_assignments')
    .select('*')
    .eq('user_id', driverId)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取司机仓库分配失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取指定管理员的仓库分配列表
 */
export async function getWarehouseAssignmentsByManager(
  managerId: string
): Promise<{id: string; manager_id: string; warehouse_id: string; created_at: string}[]> {
  const {data, error} = await supabase
    .from('warehouse_assignments')
    .select('*')
    .eq('user_id', managerId)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取管理员仓库分配失败:', error)
    return []
  }

  // 转换字段名以保持兼容性
  const result = Array.isArray(data)
    ? data.map((item) => ({
        ...item,
        manager_id: item.user_id
      }))
    : []

  return result
}

/**
 * 删除指定司机的所有仓库分配
 */
export async function deleteWarehouseAssignmentsByDriver(driverId: string): Promise<boolean> {
  const {error} = await supabase.from('warehouse_assignments').delete().eq('user_id', driverId)

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
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('插入仓库分配失败: 用户未登录')
    return false
  }

  const {error} = await supabase.from('warehouse_assignments').upsert(
    {
      user_id: input.user_id,
      warehouse_id: input.warehouse_id
    },
    {
      onConflict: 'user_id,warehouse_id'
    }
  )

  if (error) {
    console.error('插入仓库分配失败:', error)
    return false
  }

  return true
}

/**
 * 插入管理员/车队长的仓库分配
 */
export async function insertManagerWarehouseAssignment(input: {
  manager_id: string
  warehouse_id: string
}): Promise<boolean> {
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('插入管理员仓库分配失败: 用户未登录')
    return false
  }

  // 单用户架构：从 users 表查询车队长信息
  const {data: manager, error: managerError} = await supabase
    .from('users')
    .select('name')
    .eq('id', input.manager_id)
    .maybeSingle()

  if (managerError) {
    console.error('查询车队长信息失败:', managerError)
    return false
  }

  if (!manager) {
    console.error('车队长不存在:', input.manager_id)
    return false
  }

  const {data: warehouse, error: warehouseError} = await supabase
    .from('warehouses')
    .select('name')
    .eq('id', input.warehouse_id)
    .maybeSingle()

  if (warehouseError) {
    console.error('查询仓库信息失败:', warehouseError)
    return false
  }

  if (!warehouse) {
    console.error('仓库不存在:', input.warehouse_id)
    return false
  }

  // 3. 检查是否已经存在该分配
  const {data: existingAssignment, error: checkError} = await supabase
    .from('warehouse_assignments')
    .select('id')
    .eq('user_id', input.manager_id)
    .eq('warehouse_id', input.warehouse_id)
    .maybeSingle()

  // 如果查询出错但不是PGRST116（未找到记录），则报错
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('检查仓库分配失败:', checkError)
    return false
  }

  if (existingAssignment) {
    return true
  }

  // 4. 执行分配
  const {error} = await supabase.from('warehouse_assignments').insert({
    user_id: input.manager_id,
    warehouse_id: input.warehouse_id
  })

  if (error) {
    // 如果是唯一约束冲突（23505），说明已经存在该分配，返回成功
    if (error.code === '23505') {
      return true
    }
    console.error('插入管理员仓库分配失败:', error)
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
    const {error: deleteError} = await supabase.from('warehouse_assignments').delete().eq('user_id', driverId)

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
      user_id: driverId,
      warehouse_id: warehouseId
    }))

    const {error: insertError} = await supabase.from('warehouse_assignments').insert(insertData)

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
  // 1. 获取当前用户
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('创建计件记录失败: 用户未登录')
    return false
  }

  // 2. 验证必填字段
  if (!record.user_id) {
    console.error('创建计件记录失败: 用户ID不能为空')
    return false
  }
  if (!record.quantity || record.quantity <= 0) {
    console.error('创建计件记录失败: 数量必须大于0')
    return false
  }

  const {error} = await supabase.from('piece_work_records').insert({
    ...record
  })

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

  // 初始化stats变量，确保在任何return语句前都已声明
  const stats: PieceWorkStats = {
    total_orders: records.length,
    total_quantity: 0,
    total_amount: 0,
    by_category: []
  }

  // 获取所有品类信息（新表结构）
  const {data: categoryPrices} = await supabase.from('category_prices').select('category_id')
  if (!categoryPrices || categoryPrices.length === 0) {
    return stats
  }

  // 从piece_work_categories表获取品类名称
  const categoryIds = categoryPrices.map((cp) => cp.category_id)
  const {data: categories} = await supabase.from('piece_work_categories').select('id, name').in('id', categoryIds)

  const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) || [])

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
  try {
    // 新表结构：通过piece_work_categories和category_prices的关联查询获取品类信息
    const {data, error} = await supabase
      .from('piece_work_categories')
      .select('id, name, description, created_at, updated_at')
      .order('name', {ascending: true})

    if (error) {
      console.error('获取启用品类失败:', error)
      return []
    }

    // 转换字段名以匹配PieceWorkCategory类型，并保持向后兼容
    if (Array.isArray(data)) {
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        category_name: item.name, // 保持向后兼容，为前端提供旧字段名
        description: item.description,
        is_active: true, // piece_work_categories表没有is_active字段，默认都启用
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
    }

    return []
  } catch (error) {
    console.error('获取启用品类异常:', error)
    return []
  }
}

// 获取所有品类（包括禁用的）
export async function getAllCategories(): Promise<PieceWorkCategory[]> {
  try {
    const {data, error} = await supabase
      .from('piece_work_categories')
      .select('id, name, description, created_at, updated_at')
      .order('name', {ascending: true})

    if (error) {
      console.error('获取所有品类失败:', error)
      return []
    }

    // 转换字段名以匹配PieceWorkCategory类型，并保持向后兼容
    if (Array.isArray(data)) {
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        category_name: item.name, // 保持向后兼容，为前端提供旧字段名
        description: item.description,
        is_active: true, // piece_work_categories表没有is_active字段，默认都启用
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
    }

    return []
  } catch (error) {
    console.error('获取所有品类异常:', error)
    return []
  }
}

// 创建品类
export async function createCategory(category: PieceWorkCategoryInput): Promise<PieceWorkCategory | null> {
  try {
    // 在piece_work_categories表中创建品类
    const {data, error} = await supabase
      .from('piece_work_categories')
      .insert({
        name: category.name,
        description: category.description
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error('创建品类失败:', error)
      return null
    }

    // 转换为PieceWorkCategory类型
    if (data) {
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        is_active: true, // piece_work_categories表没有is_active字段，默认都启用
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    }

    return null
  } catch (error) {
    console.error('创建品类异常:', error)
    return null
  }
}

// 更新品类
export async function updateCategory(id: string, updates: Partial<PieceWorkCategoryInput>): Promise<boolean> {
  try {
    // 更新piece_work_categories表中的品类信息
    const mappedUpdates: Partial<{name: string; description: string; updated_at: string}> = {
      updated_at: new Date().toISOString()
    }

    if (updates.name !== undefined) mappedUpdates.name = updates.name
    if (updates.description !== undefined) mappedUpdates.description = updates.description
    // is_active字段在新表结构中不再使用

    const {error} = await supabase.from('piece_work_categories').update(mappedUpdates).eq('id', id)

    if (error) {
      console.error('更新品类失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('更新品类异常:', error)
    return false
  }
}

// 删除品类
export async function deleteCategory(id: string): Promise<boolean> {
  try {
    // 首先删除关联的价格记录
    const {error: priceError} = await supabase.from('category_prices').delete().eq('category_id', id)
    if (priceError) {
      console.error('删除关联价格记录失败:', priceError)
      return false
    }

    // 然后删除品类本身
    const {error} = await supabase.from('piece_work_categories').delete().eq('id', id)

    if (error) {
      console.error('删除品类失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('删除品类异常:', error)
    return false
  }
}

// 删除未被任何仓库使用的品类
export async function deleteUnusedCategories(): Promise<{success: boolean; deletedCount: number; error?: string}> {
  try {
    // 新表结构：获取所有没有关联category_prices记录的品类
    const {data: usedCategoryIds, error: usedError} = await supabase
      .from('category_prices')
      .select('category_id')
      .order('category_id', {ascending: true})

    if (usedError) {
      console.error('查询使用中的品类ID失败:', usedError)
      return {success: false, deletedCount: 0, error: usedError.message}
    }

    // 如果没有任何价格记录，那么所有品类都未使用
    if (!usedCategoryIds || usedCategoryIds.length === 0) {
      const {data: allCategories, error: allError} = await supabase.from('piece_work_categories').select('id')

      if (allError) {
        console.error('查询所有品类失败:', allError)
        return {success: false, deletedCount: 0, error: allError.message}
      }

      if (!allCategories || allCategories.length === 0) {
        return {success: true, deletedCount: 0}
      }

      // 删除所有品类
      const categoryIdsToDelete = allCategories.map((cat) => cat.id)
      const {error: deleteError} = await supabase.from('piece_work_categories').delete().in('id', categoryIdsToDelete)

      if (deleteError) {
        console.error('删除所有未使用品类失败:', deleteError)
        return {success: false, deletedCount: 0, error: deleteError.message}
      }

      return {success: true, deletedCount: categoryIdsToDelete.length}
    }

    // 找出没有关联category_prices记录的品类
    const usedIds = new Set(usedCategoryIds.map((item) => item.category_id))

    // 获取所有品类
    const {data: allCategories, error: allError} = await supabase.from('piece_work_categories').select('id')

    if (allError) {
      console.error('查询所有品类失败:', allError)
      return {success: false, deletedCount: 0, error: allError.message}
    }

    if (!allCategories || allCategories.length === 0) {
      return {success: true, deletedCount: 0}
    }

    // 找出未使用的品类ID
    const unusedCategoryIds = allCategories.filter((cat) => !usedIds.has(cat.id)).map((cat) => cat.id)

    if (unusedCategoryIds.length === 0) {
      return {success: true, deletedCount: 0}
    }

    // 删除未使用的品类
    const {error: deleteError} = await supabase.from('piece_work_categories').delete().in('id', unusedCategoryIds)

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

  return data || []
}

// 获取指定仓库和品类的价格配置（通过品类ID）
export async function getCategoryPrice(warehouseId: string, categoryId: string): Promise<CategoryPrice | null> {
  const {data, error} = await supabase
    .from('category_prices')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('category_id', categoryId)
    .maybeSingle()

  if (error) {
    console.error('获取品类价格配置失败:', error)
    return null
  }

  return data
}

// 创建或更新品类价格配置
export async function upsertCategoryPrice(input: CategoryPriceInput): Promise<boolean> {
  // 1. 获取当前用户
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('保存品类价格配置失败: 用户未登录')
    return false
  }

  const {error} = await supabase.from('category_prices').upsert(
    {
      warehouse_id: input.warehouse_id,
      category_id: input.category_id,
      price: input.price,
      driver_type: input.driver_type,
      effective_date: input.effective_date
    },
    {
      onConflict: 'category_id,warehouse_id,driver_type,effective_date'
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
  // 1. 获取当前用户
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('批量保存品类价格配置失败: 用户未登录')
    return false
  }

  const {error} = await supabase.from('category_prices').upsert(
    inputs.map((input) => ({
      warehouse_id: input.warehouse_id,
      category_id: input.category_id,
      price: input.price,
      driver_type: input.driver_type,
      effective_date: input.effective_date
    })),
    {
      onConflict: 'category_id,warehouse_id,driver_type,effective_date'
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
  // 查询所有类型的价格（可能有多行）
  const {data, error} = await supabase
    .from('category_prices')
    .select(`
      price,
      driver_type
    `)
    .eq('warehouse_id', warehouseId)
    .eq('category_id', categoryId)

  if (error) {
    console.error('获取品类价格失败:', error)
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  // 默认返回driver_only的价格，如果没有就返回第一个
  const driverOnlyPrice = data.find((item: any) => item.driver_type === 'driver_only')
  const defaultPrice = driverOnlyPrice || data[0]

  return {
    unitPrice: defaultPrice.price || 0,
    upstairsPrice: 0,
    sortingUnitPrice: 0
  }
}

// ==================== 管理员仓库关联 API ====================

// 获取管理员的仓库列表
export async function getManagerWarehouses(managerId: string): Promise<Warehouse[]> {
  // 添加参数验证
  if (!managerId || managerId === 'anon' || managerId.length < 10) {
    logger.error('无效的管理员 ID', {managerId})
    return []
  }

  logger.db('查询', 'warehouse_assignments', {managerId})

  // 生成缓存键
  const cacheKey = `${CACHE_KEYS.WAREHOUSE_ASSIGNMENTS}_${managerId}`

  // 尝试从缓存获取
  const cached = getCache<Warehouse[]>(cacheKey)
  if (cached) {
    logger.db('缓存命中', 'warehouse_assignments', {
      managerId,
      count: cached.length
    })
    return cached
  }

  // 从数据库查询 - 使用 warehouse_assignments 表
  const {data, error} = await supabase.from('warehouse_assignments').select('warehouse_id').eq('user_id', managerId)

  if (error) {
    logger.error('获取管理员仓库失败', error)
    return []
  }

  if (!data || data.length === 0) {
    logger.db('查询结果为空', 'warehouse_assignments', {managerId})
    // 缓存空结果，避免重复查询（缓存5分钟）
    setCache(cacheKey, [], 5 * 60 * 1000)
    return []
  }

  // 查询仓库详情
  const warehouseIds = data.map((item) => item.warehouse_id)
  const {data: warehouses, error: warehouseError} = await supabase
    .from('warehouses')
    .select('*')
    .in('id', warehouseIds)
    .order('name', {ascending: true})

  if (warehouseError) {
    logger.error('获取仓库信息失败', warehouseError)
    return []
  }

  const result = Array.isArray(warehouses) ? warehouses : []
  logger.db('查询成功', 'warehouse_assignments', {
    managerId,
    count: result.length
  })

  // 缓存30分钟
  setCache(cacheKey, result, 30 * 60 * 1000)

  return result
}

/**
 * 获取仓库的管理员列表
 * 单用户架构：直接查询 warehouse_assignments + users
 */
export async function getWarehouseManagers(warehouseId: string): Promise<Profile[]> {
  try {
    // 单用户架构：直接查询 warehouse_assignments 表
    const {data, error} = await supabase.from('warehouse_assignments').select('user_id').eq('warehouse_id', warehouseId)

    if (error) {
      console.error('获取仓库管理员失败:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    const managerIds = data.map((item) => item.user_id)

    // 查询管理员信息
    const {data: managers, error: managerError} = await supabase
      .from('users')
      .select('*')
      .in('id', managerIds)
      .order('name', {ascending: true})

    if (managerError) {
      console.error('获取管理员信息失败:', managerError)
      return []
    }

    if (!managers || managers.length === 0) {
      return []
    }

    // 获取角色信息
    const {data: roleData} = await supabase.from('users').select('id, role').in('id', managerIds)

    const roleMap = new Map(roleData?.map((r) => [r.id, r.role]) || [])

    // 转换为 Profile 格式
    const profiles: Profile[] = managers.map((user) => ({
      ...user,
      role: roleMap.get(user.id) || 'DRIVER'
    }))

    return profiles
  } catch (error) {
    console.error('获取仓库管理员异常:', error)
    return []
  }
}

/**
 * 获取仓库的所有调度和车队长
 * @param warehouseId 仓库ID
 * @returns 调度和车队长的用户ID列表
 */
export async function getWarehouseDispatchersAndManagers(warehouseId: string): Promise<string[]> {
  try {
    // 1. 获取分配到该仓库的所有用户ID
    const {data: assignments, error: assignmentError} = await supabase
      .from('warehouse_assignments')
      .select('user_id')
      .eq('warehouse_id', warehouseId)

    if (assignmentError) {
      console.error('获取仓库分配失败:', assignmentError)
      return []
    }

    if (!assignments || assignments.length === 0) {
      return []
    }

    const userIds = assignments.map((a) => a.user_id)

    // 2. 查询这些用户中角色为 BOSS、DISPATCHER 或 MANAGER 的用户

    const {data: roles, error: roleError} = await supabase
      .from('users')
      .select('id')
      .in('id', userIds)
      .in('role', ['BOSS', 'DISPATCHER', 'MANAGER'])

    if (roleError) {
      console.error('获取用户角色失败:', roleError)
      return []
    }

    return roles?.map((r) => r.id) || []
  } catch (error) {
    console.error('获取仓库调度和车队长异常:', error)
    return []
  }
}

// 添加管理员仓库关联
export async function addManagerWarehouse(managerId: string, warehouseId: string): Promise<boolean> {
  const {error} = await supabase.from('warehouse_assignments').insert({
    user_id: managerId,
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
    .from('warehouse_assignments')
    .delete()
    .eq('id', managerId)
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
 * 单用户架构：直接插入到 leave_applications 表
 */
export async function createLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  try {
    // 1. 获取当前用户
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('创建请假申请失败: 用户未登录')
      return null
    }

    // 2. 插入请假申请
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

    if (!data) {
      console.error('创建请假申请失败: 未返回数据')
      return null
    }

    // 3. 获取申请人信息
    const {data: applicant} = await supabase.from('users').select('name').eq('id', input.user_id).maybeSingle()
    const applicantName = applicant?.name || '司机'

    // 4. 格式化请假类型
    const leaveTypeMap: Record<string, string> = {
      personal: '事假',
      sick: '病假',
      annual: '年假',
      other: '其他'
    }
    const leaveTypeLabel = leaveTypeMap[input.leave_type] || '请假'

    // 5. 格式化日期
    const dateRangeText = formatLeaveDate(input.start_date, input.end_date, data.days || 0)

    // 6. 发送通知给所有相关人员（老板、调度、有管辖权的车队长）
    // 使用 sendDriverSubmissionNotification 并行获取所有接收者
    await sendDriverSubmissionNotification({
      driverId: input.user_id,
      driverName: applicantName,
      type: 'leave_application_submitted',
      title: '新的请假申请',
      content: `${applicantName}提交了${leaveTypeLabel}申请（${dateRangeText}），请及时审批`,
      relatedId: data.id,
      approvalStatus: 'pending'
    })

    return data
  } catch (error) {
    console.error('创建请假申请异常:', error)
    return null
  }
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
 * 获取所有请假申请（老板）
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
      .select('user_id, leave_type, start_date, end_date, days, reason')
      .eq('id', applicationId)
      .maybeSingle()

    if (fetchError || !application) {
      console.error('获取请假申请信息失败:', fetchError)
      return false
    }

    // 调试日志：检查获取到的数据

    // 验证 user_id 是否存在
    if (!application.user_id) {
      console.error('❌ 请假申请的 user_id 为空，无法创建通知')
      return false
    }

    // 注意：审批人和申请人信息的获取已移至审批页面通知更新逻辑中处理

    // 更新审批状态
    const {data: updateData, error: updateError} = await supabase
      .from('leave_applications')
      .update({
        status: review.status,
        reviewed_by: review.reviewed_by,
        review_notes: review.review_notes || null,
        reviewed_at: review.reviewed_at
      })
      .eq('id', applicationId)
      .select()

    if (updateError) {
      console.error('审批请假申请失败:', updateError)
      return false
    }

    if (!updateData || updateData.length === 0) {
      console.error('❗ 审批更新未返回数据，可能未找到记录')
      return false
    }

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
  try {
    // 1. 获取当前用户
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('创建离职申请失败: 用户未登录')
      return null
    }

    // 2. 插入离职申请
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

    if (!data) {
      console.error('创建离职申请失败: 未返回数据')
      return null
    }

    // 3. 获取申请人信息
    const {data: applicant} = await supabase.from('users').select('name').eq('id', input.user_id).maybeSingle()
    const applicantName = applicant?.name || '司机'

    // 4. 格式化日期
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
    const resignationDate = formatDate(input.resignation_date)

    // 5. 发送通知给所有相关人员（老板、调度、有管辖权的车队长）
    // 使用 sendDriverSubmissionNotification 并行获取所有接收者
    await sendDriverSubmissionNotification({
      driverId: input.user_id,
      driverName: applicantName,
      type: 'resignation_application_submitted',
      title: '新的离职申请',
      content: `${applicantName}提交了离职申请（离职日期：${resignationDate}），请及时审批`,
      relatedId: data.id,
      approvalStatus: 'pending'
    })

    return data
  } catch (error) {
    console.error('创建离职申请异常:', error)
    return null
  }
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
 * 获取所有离职申请（老板）
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
      .select('user_id, resignation_date, reason, status')
      .eq('id', applicationId)
      .maybeSingle()

    if (fetchError || !application) {
      console.error('❌ 获取离职申请信息失败:', fetchError)
      return false
    }

    // 验证 user_id 是否存在
    if (!application.user_id) {
      console.error('❌ 离职申请的 user_id 为空')
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
      .select()

    if (updateError) {
      console.error('❌ 审批离职申请失败:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      })
      return false
    }

    return true
  } catch (error) {
    console.error('❌ 审批离职申请异常:', error)
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
    .from('warehouse_assignments')
    .select('*', {count: 'exact', head: true})
    .eq('warehouse_id', warehouseId)

  if (error) {
    console.error('获取仓库司机数量失败:', error)
    return 0
  }

  return count || 0
}

/**
 * 获取仓库的管理员（单个）
 * 单用户架构：直接查询 warehouse_assignments + users + user_roles
 */
export async function getWarehouseManager(warehouseId: string): Promise<Profile | null> {
  try {
    // 查询仓库的管理员关联
    const {data: managerWarehouseData, error: mwError} = await supabase
      .from('warehouse_assignments')
      .select('user_id')
      .eq('warehouse_id', warehouseId)
      .order('created_at', {ascending: true})
      .limit(1)
      .maybeSingle()

    if (mwError) {
      console.error('获取仓库管理员关联失败:', mwError)
      return null
    }

    if (!managerWarehouseData) {
      return null
    }

    const managerId = managerWarehouseData.user_id

    // 单用户架构：从 users 表查询车队长信息
    const [{data: user, error: userError}, {data: roleData, error: roleError}] = await Promise.all([
      supabase.from('users').select('*').eq('id', managerId).maybeSingle(),
      supabase.from('users').select('role').eq('id', managerId).maybeSingle()
    ])

    if (userError) {
      console.error('查询 users 表失败:', userError)
      return null
    }

    if (roleError) {
      console.error('查询 user_roles 表失败:', roleError)
      return null
    }

    if (!user) {
      return null
    }

    return convertUserToProfile({
      ...user,
      role: roleData?.role || 'MANAGER'
    })
  } catch (error) {
    console.error('获取仓库管理员异常:', error)
    return null
  }
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
    const {error} = await supabase.storage.from('app-7cdqf07mbu9t_avatars').upload(fileName, fileContent, {
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
    // 单用户架构：分别更新 users 和 user_roles 表
    const {role, ...userUpdates} = updates

    // 更新用户基本信息
    if (Object.keys(userUpdates).length > 0) {
      const {error: userError} = await supabase
        .from('users')
        .update({
          ...userUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (userError) {
        console.error('更新个人信息失败:', userError)
        return {success: false, error: userError.message}
      }
    }

    // 更新用户角色
    if (role) {
      const {error: roleError} = await supabase.from('users').update({role}).eq('id', userId)

      if (roleError) {
        console.error('更新用户角色失败:', roleError)
        return {success: false, error: roleError.message}
      }
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

  // 1. 获取该仓库的所有用户ID
  const {data: warehouseAssignments} = await supabase
    .from('warehouse_assignments')
    .select('user_id')
    .eq('warehouse_id', warehouseId)

  const allUserIds = warehouseAssignments?.map((wa) => wa.user_id) || []

  // 2. 过滤出司机ID（排除车队长和老板）
  let driverIds: string[] = []
  if (allUserIds.length > 0) {
    const {data: userRoles} = await supabase.from('users').select('id, role').in('id', allUserIds).eq('role', 'DRIVER') // 只获取司机角色

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
    // 司机基本信息（仅当有司机时查询）- 单用户架构：查询 users 表
    driverIds.length > 0
      ? supabase.from('users').select('id, name, phone').in('id', driverIds)
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

  // 4. 处理统计数据
  const todayAttendance = todayAttendanceResult.data?.length || 0
  const todayPieceCount = todayPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0
  const pendingLeaveCount = pendingLeaveResult.data?.length || 0
  const monthlyPieceCount = monthlyPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0

  // 5. 构建司机列表（使用批量查询结果）
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
 * 获取所有仓库的汇总统计数据（老板使用）
 * @returns 汇总统计数据
 */
export async function getAllWarehousesDashboardStats(): Promise<DashboardStats> {
  const today = getLocalDateString()
  const firstDayOfMonth = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

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
    // 所有司机基本信息 - 从 users 表查询角色信息
    (async () => {
      const {data, error} = await supabase
        .from('users')
        .select('id, name, phone')
        .eq('role', 'DRIVER')

      return {data, error}
    })(),
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

  const todayAttendance = todayAttendanceResult.data?.length || 0
  const todayPieceCount = todayPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0
  const pendingLeaveCount = pendingLeaveResult.data?.length || 0
  const monthlyPieceCount = monthlyPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0

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

  const result = {
    todayAttendance,
    todayPieceCount,
    pendingLeaveCount,
    monthlyPieceCount,
    driverList
  }

  return result
}

/**
 * ==================== 权限管理相关 API ====================
 */

/**
 * 获取所有用户
 * 单用户架构：直接查询 users + user_roles
 */
export async function getAllUsers(): Promise<Profile[]> {
  try {
    // 单用户架构：使用 getUsersWithRole() 获取所有用户
    const users = await getUsersWithRole()

    if (!users || users.length === 0) {
      return []
    }

    // 转换为 Profile 格式
    const profiles = convertUsersToProfiles(users)
    return profiles
  } catch (error) {
    console.error('❌ 获取用户列表异常:', error)
    return []
  }
}

/**
 * 获取所有管理员用户
 * 单用户架构：直接查询 MANAGER 角色的用户
 */
export async function getAllManagers(): Promise<Profile[]> {
  try {
    // 获取当前用户信息
    const {
      data: {user}
    } = await supabase.auth.getUser()

    // 获取包含角色的完整用户信息
    const userWithRole = await getUserWithRole(user.id)

    // 单用户架构：直接查询 MANAGER 角色的用户
    const managers = await getUsersByRole('MANAGER', userWithRole)

    if (!managers || managers.length === 0) {
      return []
    }

    // 转换为 Profile 格式
    const profiles = convertUsersToProfiles(managers)
    return profiles
  } catch (error) {
    console.error('❌ 获取管理员列表异常:', error)
    return []
  }
}

/**
 * 获取所有老板列表
 */
export async function getAllSuperAdmins(): Promise<Profile[]> {
  try {
    // 获取当前用户信息
    const {
      data: {user}
    } = await supabase.auth.getUser()

    // 获取包含角色的完整用户信息
    const userWithRole = await getUserWithRole(user.id)

    // 单用户架构：直接查询 BOSS 角色的用户
    const bosses = await getUsersByRole('BOSS', userWithRole)

    if (!bosses || bosses.length === 0) {
      return []
    }

    // 转换为 Profile 格式
    const profiles = convertUsersToProfiles(bosses)
    return profiles
  } catch (error) {
    console.error('❌ 获取老板列表失败:', error)
    return []
  }
}

/**
 * 获取所有调度列表
 */
export async function getAllPeerAdmins(): Promise<Profile[]> {
  try {
    // 获取当前用户信息
    const {
      data: {user}
    } = await supabase.auth.getUser()

    // 获取包含角色的完整用户信息
    const userWithRole = await getUserWithRole(user.id)

    // 单用户架构：直接查询 PEER_ADMIN 角色的用户
    const peerAdmins = await getUsersByRole('PEER_ADMIN', userWithRole)

    if (!peerAdmins || peerAdmins.length === 0) {
      return []
    }

    // 转换为 Profile 格式
    const profiles = convertUsersToProfiles(peerAdmins)
    return profiles
  } catch (error) {
    console.error('❌ 获取调度列表失败:', error)
    return []
  }
}

/**
 * 获取所有司机列表
 */
export async function getAllDrivers(): Promise<Profile[]> {
  try {
    // 获取当前用户信息
    const {
      data: {user}
    } = await supabase.auth.getUser()

    // 获取包含角色的完整用户信息
    const userWithRole = await getUserWithRole(user.id)

    // 单用户架构：直接查询 DRIVER 角色的用户
    const drivers = await getUsersByRole('DRIVER', userWithRole)

    if (!drivers || drivers.length === 0) {
      return []
    }

    // 转换为 Profile 格式
    const profiles = convertUsersToProfiles(drivers)
    return profiles
  } catch (error) {
    console.error('❌ 获取司机列表失败:', error)
    return []
  }
}

/**
 * 修改用户角色（老板）
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    // 单用户架构：更新 user_roles 表和 users 表

    // 更新角色
    const {error: roleError} = await supabase.from('users').update({role}).eq('id', userId)

    if (roleError) {
      console.error('修改用户角色失败:', roleError)
      return false
    }

    // 根据角色设置 driver_type
    const updateData: {driver_type?: 'pure' | null} = {}

    if (role === 'DRIVER') {
      // 变更为司机时，设置默认的 driver_type 为 'pure'（纯司机）
      updateData.driver_type = 'pure'
    } else {
      // 变更为车队长或老板时，清空 driver_type
      updateData.driver_type = null
    }

    // 更新 driver_type
    if (Object.keys(updateData).length > 0) {
      const {error: userError} = await supabase.from('users').update(updateData).eq('id', userId)

      if (userError) {
        console.error('更新用户 driver_type 失败:', userError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('修改用户角色异常:', error)
    return false
  }
}

/**
 * 获取管理员权限配置
 * 注意：在新的数据库设计中，权限通过角色和仓库关联来管理
 * 这个函数返回默认权限配置
 */
export async function getManagerPermission(managerId: string): Promise<ManagerPermission | null> {
  // 单用户架构：从 user_roles 表查询用户角色
  const {data: roleData, error} = await supabase.from('users').select('role').eq('id', managerId).maybeSingle()

  if (error || !roleData) {
    console.error('获取管理员信息失败:', error)
    return null
  }

  // 如果是老板或平级管理员，返回所有权限
  if (roleData.role === 'BOSS' || roleData.role === 'BOSS') {
    const now = new Date().toISOString()
    return {
      id: managerId, // 使用 managerId 作为 id
      manager_id: managerId,
      permission_type: 'full',
      can_edit_user_info: true,
      can_edit_piece_work: true,
      can_manage_attendance_rules: true,
      can_manage_categories: true,
      created_at: now,
      updated_at: now
    }
  }

  // 如果是车队长，返回默认权限
  if (roleData.role === 'MANAGER') {
    const now = new Date().toISOString()
    return {
      id: managerId, // 使用 managerId 作为 id
      manager_id: managerId,
      permission_type: 'default',
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
  // 保留函数是为了兼容性，但不执行任何操作
  return true
}

/**
 * 更新车队长的权限启用状态
 * @param managerId 车队长ID
 * @param enabled 是否启用权限
 * @returns 是否更新成功
 */
export async function updateManagerPermissionsEnabled(managerId: string, enabled: boolean): Promise<boolean> {
  try {
    // 单用户架构：更新 users 表
    const {error} = await supabase.from('users').update({manager_permissions_enabled: enabled}).eq('id', managerId)

    if (error) {
      console.error('[updateManagerPermissionsEnabled] 更新失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[updateManagerPermissionsEnabled] 异常:', error)
    return false
  }
}

/**
 * 获取车队长的权限启用状态
 * @param managerId 车队长ID
 * @returns 权限启用状态，如果获取失败返回 null
 */
export async function getManagerPermissionsEnabled(managerId: string): Promise<boolean | null> {
  try {
    // 单用户架构：从 users 表查询权限状态
    const {data, error} = await supabase
      .from('users')
      .select('manager_permissions_enabled')
      .eq('id', managerId)
      .maybeSingle()

    if (error) {
      console.error('[getManagerPermissionsEnabled] 获取失败:', error)
      return null
    }

    if (!data) {
      return null
    }

    const enabled = data.manager_permissions_enabled ?? true // 默认为 true
    return enabled
  } catch (error) {
    console.error('[getManagerPermissionsEnabled] 获取异常:', error)
    return null
  }
}

/**
 * 获取管理员管辖的仓库ID列表
 */
export async function getManagerWarehouseIds(managerId: string): Promise<string[]> {
  const {data, error} = await supabase.from('warehouse_assignments').select('warehouse_id').eq('user_id', managerId)

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
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('设置管理员仓库失败: 用户未登录')
    return false
  }

  // 1. 删除旧的关联
  const {error: deleteError} = await supabase.from('warehouse_assignments').delete().eq('user_id', managerId)

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

  const insertData = warehouseIds.map((warehouseId) => ({
    user_id: managerId,
    warehouse_id: warehouseId
  }))

  const {error: insertError} = await supabase.from('warehouse_assignments').insert(insertData)

  if (insertError) {
    console.error('插入新的仓库关联失败:', insertError)
    return false
  }

  // 4. 成功后清除该管理员的仓库缓存，确保下次登录时获取最新数据
  try {
    const {clearManagerWarehousesCache} = await import('@/utils/cache')
    clearManagerWarehousesCache(managerId)
  } catch (err) {
    console.error('清除缓存失败:', err)
  }

  return true
}

/**
 * 获取仓库的品类列表（返回品类ID数组）
 */
export async function getWarehouseCategories(warehouseId: string): Promise<string[]> {
  const {data, error} = await supabase.from('category_prices').select('category_id').eq('warehouse_id', warehouseId)

  if (error) {
    console.error('获取仓库品类列表失败:', error)
    return []
  }

  // 去重
  const uniqueIds = [...new Set(data.map((item) => item.category_id))]
  return uniqueIds
}

/**
 * 获取仓库的品类详细信息
 */
export async function getWarehouseCategoriesWithDetails(warehouseId: string): Promise<PieceWorkCategory[]> {
  try {
    // 新表结构：先从category_prices获取仓库关联的品类ID，再从piece_work_categories获取详细信息
    const {data: categoryPriceData, error: categoryPriceError} = await supabase
      .from('category_prices')
      .select('category_id')
      .eq('warehouse_id', warehouseId)
      .order('created_at')

    if (categoryPriceError) {
      console.error('获取仓库品类关联失败:', categoryPriceError)
      return []
    }

    if (!Array.isArray(categoryPriceData) || categoryPriceData.length === 0) {
      return []
    }

    // 获取所有关联的品类ID
    const categoryIds = categoryPriceData.map((item) => item.category_id)

    // 从piece_work_categories获取品类详细信息
    const {data: categoriesData, error: categoriesError} = await supabase
      .from('piece_work_categories')
      .select('id, name, description, created_at, updated_at')
      .in('id', categoryIds)
      .order('name')

    if (categoriesError) {
      console.error('获取品类详细信息失败:', categoriesError)
      return []
    }

    if (!Array.isArray(categoriesData)) {
      return []
    }

    // 转换为PieceWorkCategory格式，并保持向后兼容
    return categoriesData.map((item: any) => ({
      id: item.id,
      name: item.name,
      category_name: item.name, // 保持向后兼容
      description: item.description || '',
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString(),
      is_active: true // 默认启用
    }))
  } catch (error) {
    console.error('获取仓库品类详细信息异常:', error)
    return []
  }
}

/**
 * 设置仓库的品类（更新 category_prices 表）
 * 注意：在新的数据库设计中，品类直接关联到仓库，不需要单独的关联表
 */
export async function setWarehouseCategories(_warehouseId: string, _categoryIds: string[]): Promise<boolean> {
  // 在新的设计中，品类已经直接关联到仓库
  // 这个函数保留是为了兼容性，但实际上不需要做任何操作
  // 品类的启用/禁用应该通过更新 category_prices 表的 is_active 字段来实现
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
 * 创建司机账号（使用租户隔离）
 * @param phone 手机号
 * @param name 姓名
 * @param driverType 司机类型（暂时保留参数，但租户 Schema 中不使用）
 * @returns 创建的司机资料，如果失败返回null
 */
export async function createDriver(
  phone: string,
  name: string,
  driverType: 'pure' | 'with_vehicle' = 'pure'
): Promise<Profile | null> {
  try {
    // 调用 RPC 函数，在租户 Schema 中创建司机
    const {data, error} = await supabase.rpc('create_driver_in_tenant', {
      p_phone: phone,
      p_name: name,
      p_email: null,
      p_password: null // 使用默认密码（手机号后6位）
    })

    if (error) {
      console.error('❌ 创建司机失败:', error)
      return null
    }

    if (!data || !data.success) {
      console.error('❌ 创建司机失败:', data?.error || '未知错误')
      return null
    }

    // 构造 Profile 对象返回
    const profile: Profile = {
      id: data.user_id,
      phone: data.phone,
      email: data.email,
      name,
      role: 'DRIVER',
      driver_type: driverType,
      avatar_url: null,
      nickname: null,
      address_province: null,
      address_city: null,
      address_district: null,
      address_detail: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      login_account: null,
      vehicle_plate: null,
      join_date: new Date().toISOString().split('T')[0],
      status: 'active',
      company_name: null,
      lease_start_date: null,
      lease_end_date: null,
      monthly_fee: null,
      notes: null,
      main_account_id: null,
      peer_account_permission: null,
      manager_permissions_enabled: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return profile
  } catch (error) {
    console.error('❌ 创建司机异常:', error)
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
  role: 'DRIVER' | 'MANAGER',
  driverType?: 'pure' | 'with_vehicle'
): Promise<Profile | null> {
  const _timestamp = new Date().toISOString()

  try {
    // 获取当前登录用户
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('  ❌ 用户未登录')
      throw new Error('用户未登录')
    }

    // 步骤1: 创建 auth.users 表记录
    const loginEmail = `${phone}@fleet.com`

    let userId: string | null = null

    try {
      const {data: rpcData, error: authError} = await supabase.rpc('create_user_auth_account_first', {
        user_email: loginEmail,
        user_phone: phone
      })

      if (authError || !rpcData || rpcData.success === false) {
        console.error('  ❌ 创建 auth.users 记录失败')
        console.error('  错误:', authError?.message || rpcData?.error)

        // 检查是否是重复用户错误
        const errorMsg = authError?.message || rpcData?.error || ''
        if (errorMsg.includes('already') || errorMsg.includes('duplicate') || errorMsg.includes('exists')) {
          throw new Error(`该手机号（${phone}）已被注册，请使用其他手机号`)
        }

        throw new Error(authError?.message || rpcData?.error || '创建用户失败')
      }

      userId = rpcData.user_id
    } catch (authError: any) {
      console.error('  ❌ 创建 auth.users 记录异常:', authError)

      // 如果已经是我们自定义的错误，直接抛出
      if (authError.message?.includes('已被注册')) {
        throw authError
      }

      // 检查是否是重复用户错误
      const errorMsg = authError?.message || String(authError)
      if (errorMsg.includes('already') || errorMsg.includes('duplicate') || errorMsg.includes('exists')) {
        throw new Error(`该手机号（${phone}）已被注册，请使用其他手机号`)
      }

      throw new Error('创建用户失败，请稍后重试')
    }

    if (!userId) {
      console.error('  ❌ 未能获取用户ID')
      throw new Error('创建用户失败：未能获取用户ID')
    }

    // 步骤2: 创建 users 表记录（单用户架构）

    const insertData: {
      id: string
      phone: string
      name: string
      email: string
      role: UserRole
      driver_type?: string
      join_date?: string
    } = {
      id: userId,
      phone,
      name,
      email: loginEmail,
      role: role as UserRole
    }

    if (role === 'DRIVER') {
      insertData.driver_type = driverType || 'pure'
      insertData.join_date = new Date().toISOString().split('T')[0]
    }

    const {data: userData, error: userError} = await supabase.from('users').insert(insertData).select().maybeSingle()

    if (userError) {
      console.error('  ❌ 插入 users 表失败:', userError)
      return null
    }

    if (!userData) {
      console.error('  ❌ 插入失败：返回数据为空')
      return null
    }

    // 转换为 Profile 格式
    const profile: Profile = convertUserToProfile({
      ...userData,
      role: role as UserRole
    })

    return profile
  } catch (error) {
    console.error(`\n${'='.repeat(80)}`)
    console.error('❌ [createUser] 函数执行异常')
    console.error('异常内容:', error)
    if (error instanceof Error) {
      console.error('异常消息:', error.message)
    }
    console.error(`${'='.repeat(80)}\n`)
    throw error
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
      .eq('id', userId)
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd)

    const monthAttendanceDays = Array.isArray(attendanceData) ? attendanceData.length : 0

    // 获取本月计件收入
    const {data: pieceWorkData} = await supabase
      .from('piece_work_records')
      .select('total_amount')
      .eq('id', userId)
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd)

    const monthPieceWorkIncome = Array.isArray(pieceWorkData)
      ? pieceWorkData.reduce((sum, record) => sum + (record.total_amount || 0), 0)
      : 0

    // 获取本月请假天数
    const {data: leaveData} = await supabase
      .from('leave_applications')
      .select('start_date, end_date')
      .eq('id', userId)
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
    const {data: warehouseData} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('user_id', userId)

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
      .from('warehouse_assignments')
      .select('warehouse_id')
      .eq('user_id', userId)

    const totalWarehouses = Array.isArray(warehouseData) ? warehouseData.length : 0
    const warehouseIds = Array.isArray(warehouseData) ? warehouseData.map((w) => w.warehouse_id) : []

    // 获取管理的司机数（通过仓库关联）
    let totalDrivers = 0
    if (warehouseIds.length > 0) {
      const {data: driverData} = await supabase
        .from('warehouse_assignments')
        .select('user_id')
        .in('warehouse_id', warehouseIds)

      // 去重统计司机数
      const uniqueDrivers = new Set(Array.isArray(driverData) ? driverData.map((d) => d.user_id) : [])
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
 * 获取老板端个人页面统计数据
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
    // 获取总仓库数（降级处理：如果表不存在返回0）
    const {data: warehouseData} = await supabase.from('warehouses').select('id').eq('is_active', true)

    const totalWarehouses = Array.isArray(warehouseData) ? warehouseData.length : 0

    // 获取总司机数
    const {data: driverData} = await supabase.from('users').select('id').eq('role', 'DRIVER')

    const totalDrivers = Array.isArray(driverData) ? driverData.length : 0

    // 获取总管理员数
    const {data: managerData} = await supabase.from('users').select('id').eq('role', 'MANAGER')

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

    // 获取总用户数 - 单用户架构：从 users 表查询
    const {data: userData} = await supabase.from('users').select('id')

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
    console.error('获取老板统计数据失败:', error)
    return null
  }
}

/**
 * 重置用户密码（老板功能）
 * 使用 PostgreSQL 函数直接重置密码，避免 Supabase Auth 的扫描问题
 * 将用户密码重置为 123456
 */
export async function resetUserPassword(userId: string): Promise<{success: boolean; error?: string}> {
  try {
    // 调用 PostgreSQL 函数重置密码
    const {data, error} = await supabase.rpc('reset_user_password_by_admin', {
      target_user_id: userId,
      new_password: '123456'
    })

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
 * 更新用户完整信息（老板功能）
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
  // 特别检查 driver_type 字段
  if ('driver_type' in updates) {
  }

  // 特别检查 vehicle_plate 字段
  if ('vehicle_plate' in updates) {
  }

  try {
    // 单用户架构：分别更新 users 和 user_roles 表
    const {role, ...userUpdates} = updates

    // 1. 更新 users 表
    if (Object.keys(userUpdates).length > 0) {
      const {data, error} = await supabase
        .from('users')
        .update({
          ...userUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

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
        console.error('- 更新的字段:', Object.keys(userUpdates))
        console.error('========================================')
        return false
      }

      // 特别检查更新后的 vehicle_plate 字段
      if (data[0]) {
      }
    }

    // 2. 更新用户角色
    if (role) {
      const {error: roleError} = await supabase.from('users').update({role}).eq('id', userId)

      if (roleError) {
        console.error('❌ 更新用户角色失败:', roleError)
        return false
      }
    }

    // 3. 如果更新了 login_account，同时更新/创建 auth.users 表的 email
    if (updates.login_account) {
      // 将登录账号转换为邮箱格式
      const newEmail = updates.login_account.includes('@')
        ? updates.login_account
        : `${updates.login_account}@fleet.com`

      // 使用 SQL 直接更新/创建 auth.users 表
      const {error: authError} = await supabase.rpc('update_user_email', {
        target_user_id: userId,
        new_email: newEmail
      })

      if (authError) {
        console.error('❌ 更新/创建 auth.users 邮箱失败:', authError)
        console.error('错误详情:', JSON.stringify(authError, null, 2))
      } else {
        // 同时更新 users 表的 email 字段以保持一致
        await supabase.from('users').update({email: newEmail}).eq('id', userId)
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
    // 单用户架构：从 users + user_roles 表查询
    const userWithRole = await getUserWithRole(userId)

    if (!userWithRole) {
      return null
    }

    // 转换为 Profile 格式
    return convertUserToProfile(userWithRole)
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
      todayPieceQuery = todayPieceQuery.eq('id', userId)
    }

    const {count: todayPieceCount} = await todayPieceQuery

    // 统计本月计件数
    let monthPieceQuery = supabase
      .from('piece_work_records')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .gte('work_date', firstDayOfMonth)

    if (userId) {
      monthPieceQuery = monthPieceQuery.eq('id', userId)
    }

    const {count: monthPieceCount} = await monthPieceQuery

    // 统计今日考勤数
    let todayAttendanceQuery = supabase
      .from('attendance')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .eq('work_date', today)

    if (userId) {
      todayAttendanceQuery = todayAttendanceQuery.eq('id', userId)
    }

    const {count: todayAttendanceCount} = await todayAttendanceQuery

    // 统计本月考勤数
    let monthAttendanceQuery = supabase
      .from('attendance')
      .select('id', {count: 'exact', head: true})
      .eq('warehouse_id', warehouseId)
      .gte('work_date', firstDayOfMonth)

    if (userId) {
      monthAttendanceQuery = monthAttendanceQuery.eq('id', userId)
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
      return {authenticated: false, userId: null, email: null, role: null}
    }

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
    const {data, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', driverId)
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

    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error('获取司机车辆异常', {error, driverId})
    return []
  }
}

/**
 * 获取所有车辆信息（包含司机信息）
 * 用于老板查看所有车辆
 */
export async function getAllVehiclesWithDrivers(): Promise<VehicleWithDriver[]> {
  logger.db('查询', 'vehicles', {action: 'getAllWithDrivers'})
  try {
    // 第一步：获取每辆车的最新记录（包括所有状态）
    // 使用 DISTINCT ON 获取每个车牌号的最新记录
    const {data: vehiclesData, error: vehiclesError} = await supabase
      .from('vehicles')
      .select('*')
      // 移除 return_time 限制，老板应该能看到所有车辆
      .order('plate_number', {ascending: true})
      .order('created_at', {ascending: false})

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
      return []
    }

    // 第二步：按车牌号去重，只保留每辆车的最新记录
    const latestVehiclesMap = new Map()
    vehiclesData.forEach((vehicle: any) => {
      if (!latestVehiclesMap.has(vehicle.plate_number)) {
        latestVehiclesMap.set(vehicle.plate_number, vehicle)
      }
    })
    const latestVehicles = Array.from(latestVehiclesMap.values())

    // 第三步：获取所有相关的司机信息和实名信息 - 单用户架构：查询 users 表
    const userIds = latestVehicles.map((v: any) => v.user_id).filter(Boolean)
    const {data: profilesData, error: profilesError} = await supabase
      .from('users')
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

    return vehicles
  } catch (error) {
    logger.error('获取所有车辆异常', {error})
    return []
  }
}

/**
 * 根据ID获取车辆信息（包含扩展信息）
 */
export async function getVehicleById(vehicleId: string): Promise<VehicleWithDocuments | null> {
  logger.db('查询', 'vehicles', {vehicleId})
  try {
    const {data, error} = await supabase
      .from('vehicles')
      .select(`
        *,
        document:vehicle_documents(*)
      `)
      .eq('id', vehicleId)
      .maybeSingle()

    if (error) {
      logger.error('获取车辆信息失败', error)
      return null
    }

    if (data) {
    } else {
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
      return null
    }

    // 2. 获取司机基本信息 - 单用户架构：查询 users 表
    const {data: user, error: userError} = await supabase
      .from('users')
      .select('*')
      .eq('id', vehicle.user_id)
      .maybeSingle()

    if (userError) {
      logger.error('获取司机基本信息失败', {error: userError})
    }

    // 获取角色信息
    let profile: Profile | null = null
    if (user) {
      const {data: roleData} = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()

      profile = {
        ...user,
        role: roleData?.role || 'DRIVER'
      }
    }

    // 3. 获取司机证件信息（从driver_licenses表）
    const {data: driverLicense, error: licenseError} = await supabase
      .from('driver_licenses')
      .select('*')
      .eq('driver_id', vehicle.user_id)
      .maybeSingle()

    if (licenseError) {
      logger.error('获取司机证件信息失败', {error: licenseError})
    }

    // 4. 组合数据
    const result: VehicleWithDriverDetails = {
      ...vehicle,
      driver_profile: profile || null,
      driver_license: driverLicense || null
    }

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
      .eq('id', driverId)
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('获取司机车辆列表失败', error)
      return []
    }

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
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      logger.error('添加车辆失败: 用户未登录')
      return null
    }

    // 验证必填字段
    if (!vehicle.plate_number?.trim()) {
      logger.error('添加车辆失败: 车牌号不能为空')
      return null
    }

    const {data, error} = await supabase
      .from('vehicles')
      .insert({
        ...vehicle
      })
      .select()
      .maybeSingle()

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

    // 2. 收集所有图片路径（从vehicle_documents表）
    const allPhotos: string[] = []
    if (vehicle.document) {
      const doc = vehicle.document
      // 提车、还车、登记照片
      if (doc.pickup_photos) {
        allPhotos.push(...doc.pickup_photos)
      }
      if (doc.return_photos) {
        allPhotos.push(...doc.return_photos)
      }
      if (doc.registration_photos) {
        allPhotos.push(...doc.registration_photos)
      }
      if (doc.damage_photos) {
        allPhotos.push(...doc.damage_photos)
      }
      // 车辆照片
      if (doc.left_front_photo) allPhotos.push(doc.left_front_photo)
      if (doc.right_front_photo) allPhotos.push(doc.right_front_photo)
      if (doc.left_rear_photo) allPhotos.push(doc.left_rear_photo)
      if (doc.right_rear_photo) allPhotos.push(doc.right_rear_photo)
      if (doc.dashboard_photo) allPhotos.push(doc.dashboard_photo)
      if (doc.rear_door_photo) allPhotos.push(doc.rear_door_photo)
      if (doc.cargo_box_photo) allPhotos.push(doc.cargo_box_photo)
      // 行驶证照片
      if (doc.driving_license_main_photo) allPhotos.push(doc.driving_license_main_photo)
      if (doc.driving_license_sub_photo) allPhotos.push(doc.driving_license_sub_photo)
      if (doc.driving_license_back_photo) allPhotos.push(doc.driving_license_back_photo)
      if (doc.driving_license_sub_back_photo) allPhotos.push(doc.driving_license_sub_back_photo)
    }

    // 3. 删除存储桶中的图片文件
    const bucketName = `${process.env.TARO_APP_APP_ID}_images`
    if (allPhotos.length > 0) {
      // 过滤出相对路径（不是完整URL的）
      const photoPaths = allPhotos.filter((photo) => {
        return photo && !photo.startsWith('http://') && !photo.startsWith('https://')
      })

      if (photoPaths.length > 0) {
        const {error: storageError} = await supabase.storage.from(bucketName).remove(photoPaths)

        if (storageError) {
          // 继续删除数据库记录，即使图片删除失败
        } else {
        }
      }
    }

    // 4. 删除数据库记录（CASCADE会自动删除vehicle_documents）
    const {error} = await supabase.from('vehicles').delete().eq('id', vehicleId)

    if (error) {
      logger.error('删除车辆失败', error)
      return false
    }

    // 5. 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

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
export async function returnVehicle(vehicleId: string, returnPhotos: string[]): Promise<VehicleWithDocuments | null> {
  logger.db('更新', 'vehicles', {vehicleId, action: '还车录入'})
  try {
    // 1. 更新vehicles表的status
    const {error: vehicleError} = await supabase
      .from('vehicles')
      .update({
        status: 'inactive' // 还车后将状态设置为已停用
      })
      .eq('id', vehicleId)
      .select()
      .maybeSingle()

    if (vehicleError) {
      logger.error('更新车辆状态失败', vehicleError)
      return null
    }

    // 2. 更新vehicle_documents表的return_time和return_photos
    const {error: docError} = await supabase
      .from('vehicle_documents')
      .update({
        return_time: new Date().toISOString(),
        return_photos: returnPhotos
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新还车信息失败', docError)
      // 回滚vehicle状态
      await supabase.from('vehicles').update({status: 'active'}).eq('id', vehicleId)
      return null
    }

    // 3. 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    // 4. 返回完整的车辆信息
    return await getVehicleById(vehicleId)
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
      return null
    }

    let driverId = data.driver_id

    // 如果车辆当前没有司机（已还车），从最近的 vehicle_records 中获取司机信息
    if (!driverId && data.return_time) {
      const {data: recordData} = await supabase
        .from('vehicle_records')
        .select('driver_id')
        .eq('vehicle_id', data.id)
        .order('created_at', {ascending: false})
        .limit(1)
        .maybeSingle()

      if (recordData?.driver_id) {
        driverId = recordData.driver_id
        // 查询司机信息 - 单用户架构：查询 users 表
        const {data: driverData} = await supabase
          .from('users')
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
    } else {
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

    // 根据实际情况计算司机类型
    let driverType = '未设置'

    // 判断是否为新司机（入职≤7天）
    const isNewDriver = workDays !== null && workDays <= 7

    // 判断是否带车（根据实际车辆记录）
    const hasVehicle = vehicles.length > 0

    // 根据是否为新司机和是否带车，计算司机类型
    if (hasVehicle) {
      driverType = isNewDriver ? '新带车司机' : '带车司机'
    } else {
      driverType = isNewDriver ? '新纯司机' : '纯司机'
    }

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
    logger.db('锁定图片', 'vehicle_documents', {vehicleId, photoField, photoIndex})

    // 先获取当前的 locked_photos
    const {data: document, error: fetchError} = await supabase
      .from('vehicle_documents')
      .select('locked_photos')
      .eq('vehicle_id', vehicleId)
      .maybeSingle()

    if (fetchError || !document) {
      logger.error('获取车辆文档信息失败', fetchError)
      return false
    }

    const lockedPhotos = document.locked_photos || {}
    const fieldLocks = lockedPhotos[photoField] || []

    // 如果该索引尚未锁定，则添加
    if (!fieldLocks.includes(photoIndex)) {
      fieldLocks.push(photoIndex)
      lockedPhotos[photoField] = fieldLocks

      const {error: updateError} = await supabase
        .from('vehicle_documents')
        .update({
          locked_photos: lockedPhotos,
          updated_at: new Date().toISOString()
        })
        .eq('vehicle_id', vehicleId)

      if (updateError) {
        logger.error('锁定图片失败', updateError)
        return false
      }

      // 清除相关缓存
      clearCacheByPrefix('driver_vehicles_')
      clearCache(CACHE_KEYS.ALL_VEHICLES)
    }

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
    logger.db('解锁图片', 'vehicle_documents', {vehicleId, photoField, photoIndex})

    // 先获取当前的 locked_photos
    const {data: document, error: fetchError} = await supabase
      .from('vehicle_documents')
      .select('locked_photos')
      .eq('vehicle_id', vehicleId)
      .maybeSingle()

    if (fetchError || !document) {
      logger.error('获取车辆文档信息失败', fetchError)
      return false
    }

    const lockedPhotos = document.locked_photos || {}
    const fieldLocks = lockedPhotos[photoField] || []

    // 移除锁定
    const newFieldLocks = fieldLocks.filter((idx: number) => idx !== photoIndex)
    lockedPhotos[photoField] = newFieldLocks

    const {error: updateError} = await supabase
      .from('vehicle_documents')
      .update({
        locked_photos: lockedPhotos,
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (updateError) {
      logger.error('解锁图片失败', updateError)
      return false
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

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

    // 1. 更新vehicles表的审核状态
    const {error: vehicleError} = await supabase
      .from('vehicles')
      .update({
        review_status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (vehicleError) {
      logger.error('更新车辆审核状态失败', vehicleError)
      return false
    }

    // 2. 更新vehicle_documents表的审核备注和清空需补录列表
    const {error: docError} = await supabase
      .from('vehicle_documents')
      .update({
        review_notes: notes,
        required_photos: [], // 清空需补录列表
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新车辆文档审核信息失败', docError)
      // 回滚vehicles表
      await supabase.from('vehicles').update({review_status: 'pending'}).eq('id', vehicleId)
      return false
    }

    // 3. 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

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

    // 1. 更新vehicles表的审核状态
    const {error: vehicleError} = await supabase
      .from('vehicles')
      .update({
        review_status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (vehicleError) {
      logger.error('更新车辆审核状态失败', vehicleError)
      return false
    }

    // 2. 更新vehicle_documents表的锁定照片和审核备注
    const {error: docError} = await supabase
      .from('vehicle_documents')
      .update({
        locked_photos: lockedPhotos,
        review_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新车辆文档锁定信息失败', docError)
      // 回滚vehicles表
      await supabase.from('vehicles').update({review_status: 'pending'}).eq('id', vehicleId)
      return false
    }

    // 3. 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

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

    // 1. 更新vehicles表的审核状态
    const {error: vehicleError} = await supabase
      .from('vehicles')
      .update({
        review_status: 'need_supplement',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (vehicleError) {
      logger.error('更新车辆审核状态失败', vehicleError)
      return false
    }

    // 2. 更新vehicle_documents表的审核备注
    const {error: docError} = await supabase
      .from('vehicle_documents')
      .update({
        review_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新车辆文档审核备注失败', docError)
      // 回滚vehicles表
      await supabase.from('vehicles').update({review_status: 'pending'}).eq('id', vehicleId)
      return false
    }

    // 3. 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

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
    logger.db('获取需要补录的图片列表', 'vehicle_documents', {vehicleId})

    const {data, error} = await supabase
      .from('vehicle_documents')
      .select('required_photos')
      .eq('vehicle_id', vehicleId)
      .maybeSingle()

    if (error || !data) {
      logger.error('获取需要补录的图片列表失败', error)
      return []
    }

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
    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const senderId = user?.id || null
    let senderName = '系统'
    let _senderRole = 'BOSS'

    // 如果有当前用户，获取其信息 - 单用户架构：查询 users + user_roles
    if (user?.id) {
      const {data: senderUser} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
      const {data: roleData} = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()

      if (senderUser) {
        senderName = senderUser.name || '系统'
        _senderRole = roleData?.role || 'BOSS'
      }
    }

    const notificationPayload = {
      user_id: notification.user_id,
      sender_id: senderId,
      sender_name: senderName,
      // sender_role: senderRole, // 临时移除
      type: notification.type,
      title: notification.title,
      message: notification.message,
      related_id: notification.related_id || null,
      is_read: false
    }

    // 使用 create_notifications_batch 函数来创建通知，传递完整的发送者信息
    const {error} = await supabase.rpc('create_notifications_batch', {
      notifications: [notificationPayload]
    })

    if (error) {
      logger.error('创建通知失败', error)
      return null
    }

    // 查询刚创建的通知ID
    const {data: createdNotification, error: queryError} = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', notification.user_id)
      .eq('type', notification.type)
      .eq('title', notification.title)
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle()

    if (queryError) {
      logger.error('查询通知ID失败', queryError)
      return null
    }

    return createdNotification?.id || null
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
    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const senderId = user?.id || null
    let senderName = '系统'
    let _senderRole = 'BOSS'

    // 如果有当前用户，获取其信息 - 单用户架构：查询 users + user_roles
    if (user?.id) {
      const {data: senderUser} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
      const {data: roleData} = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()

      if (senderUser) {
        senderName = senderUser.name || '系统'
        _senderRole = roleData?.role || 'BOSS'
      }
    }

    // 获取所有车队长、老板和调度 - 单用户架构：查询 user_roles 表

    const {data: managers, error: managersError} = await supabase
      .from('users')
      .select('id')
      .in('role', ['MANAGER', 'BOSS', 'DISPATCHER'])

    if (managersError) {
      logger.error('获取管理员列表失败', managersError)
      return 0
    }

    if (!managers || managers.length === 0) {
      return 0
    }

    // 为每个管理员创建通知
    const notifications = managers.map((manager) => ({
      user_id: manager.id,
      sender_id: senderId,
      sender_name: senderName,
      // sender_role: senderRole, // 临时移除
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
      logger.error('批量创建通知失败', {error, errorMessage: error.message, errorDetails: error.details})
      return 0
    }

    const count = data || 0
    return count
  } catch (error) {
    logger.error('批量创建通知异常', error)
    return 0
  }
}

/**
 * 为所有老板创建通知
 * @param notification 通知信息（不包含user_id）
 * @returns 成功创建的通知数量
 */
export async function createNotificationForAllSuperAdmins(notification: {
  type: string
  title: string
  message: string
  related_id?: string
}): Promise<number> {
  try {
    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const senderId = user?.id || null
    let senderName = '系统'
    let _senderRole = 'BOSS'

    // 如果有当前用户，获取其信息 - 单用户架构：查询 users + user_roles
    if (user?.id) {
      const {data: senderUser} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
      const {data: roleData} = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()

      if (senderUser) {
        senderName = senderUser.name || '系统'
        _senderRole = roleData?.role || 'BOSS'
      }
    }

    // 获取所有老板 - 单用户架构：查询 users 表
    const {data: superAdmins, error: superAdminsError} = await supabase
      .from('users')
      .select('id')
      .eq('role', 'BOSS')

    if (superAdminsError) {
      logger.error('获取老板列表失败', superAdminsError)
      return 0
    }

    if (!superAdmins || superAdmins.length === 0) {
      return 0
    }

    // 为每个老板创建通知
    const notifications = superAdmins.map((admin) => ({
      user_id: admin.id,
      sender_id: senderId,
      sender_name: senderName,
      // sender_role: senderRole, // 临时移除
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
    // 单用户架构：从 users 表查询司机信息
    const {data, error} = await supabase.from('users').select('name, driver_type').eq('id', userId).maybeSingle()

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
    // 单用户架构：从 users 表查询
    const {data, error} = await supabase.from('users').select('name').eq('id', userId).maybeSingle()

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

// ============================================
// 数据库结构管理 API
// ============================================

/**
 * 数据库表信息
 */
export interface DatabaseTable {
  table_name: string
  table_schema: string
  table_type: string
}

/**
 * 数据库列信息
 */
export interface DatabaseColumn {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  character_maximum_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
}

/**
 * 数据库约束信息
 */
export interface DatabaseConstraint {
  constraint_name: string
  table_name: string
  constraint_type: string
  column_name: string
}

/**
 * 获取所有表信息
 */
export async function getDatabaseTables(): Promise<DatabaseTable[]> {
  try {
    const {data, error} = await supabase.rpc('get_database_tables')

    if (error) {
      console.error('获取数据库表信息失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取数据库表信息异常:', error)
    return []
  }
}

/**
 * 获取指定表的列信息
 */
export async function getTableColumns(tableName: string): Promise<DatabaseColumn[]> {
  try {
    const {data, error} = await supabase.rpc('get_table_columns', {table_name_param: tableName})

    if (error) {
      console.error('获取表列信息失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取表列信息异常:', error)
    return []
  }
}

/**
 * 获取指定表的约束信息
 */
export async function getTableConstraints(tableName: string): Promise<DatabaseConstraint[]> {
  try {
    const {data, error} = await supabase.rpc('get_table_constraints', {table_name_param: tableName})

    if (error) {
      console.error('获取表约束信息失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取表约束信息异常:', error)
    return []
  }
}

// ============================================
// 司机通知系统 API
// ============================================

/**
 * 获取所有通知模板
 */
export async function getNotificationTemplates(): Promise<NotificationTemplate[]> {
  try {
    const {data, error} = await supabase
      .from('notification_templates')
      .select('*')
      .order('is_favorite', {ascending: false})
      .order('created_at', {ascending: false})

    if (error) {
      console.error('获取通知模板失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取通知模板异常:', error)
    return []
  }
}

/**
 * 创建通知模板
 */
export async function createNotificationTemplate(
  template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<NotificationTemplate | null> {
  try {
    const {data, error} = await supabase.from('notification_templates').insert(template).select().maybeSingle()

    if (error) {
      console.error('创建通知模板失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('创建通知模板异常:', error)
    return null
  }
}

/**
 * 更新通知模板
 */
export async function updateNotificationTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<boolean> {
  try {
    const {error} = await supabase.from('notification_templates').update(updates).eq('id', id)

    if (error) {
      console.error('更新通知模板失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('更新通知模板异常:', error)
    return false
  }
}

/**
 * 删除通知模板
 */
export async function deleteNotificationTemplate(id: string): Promise<boolean> {
  try {
    const {error} = await supabase.from('notification_templates').delete().eq('id', id)

    if (error) {
      console.error('删除通知模板失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('删除通知模板异常:', error)
    return false
  }
}

/**
 * 获取所有定时通知
 */
export async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  try {
    const {data, error} = await supabase
      .from('scheduled_notifications')
      .select('*')
      .order('send_time', {ascending: true})

    if (error) {
      console.error('获取定时通知失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取定时通知异常:', error)
    return []
  }
}

/**
 * 创建定时通知
 */
export async function createScheduledNotification(
  notification: Omit<ScheduledNotification, 'id' | 'created_at' | 'sent_at' | 'status'>
): Promise<ScheduledNotification | null> {
  try {
    const {data, error} = await supabase
      .from('scheduled_notifications')
      .insert({...notification, status: 'pending'})
      .select()
      .maybeSingle()

    if (error) {
      console.error('创建定时通知失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('创建定时通知异常:', error)
    return null
  }
}

/**
 * 更新定时通知状态
 */
export async function updateScheduledNotificationStatus(
  id: string,
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
): Promise<boolean> {
  try {
    const updates: {status: 'pending' | 'sent' | 'cancelled' | 'failed'; sent_at?: string} = {status}
    if (status === 'sent') {
      updates.sent_at = new Date().toISOString()
    }

    const {error} = await supabase.from('scheduled_notifications').update(updates).eq('id', id)

    if (error) {
      console.error('更新定时通知状态失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('更新定时通知状态异常:', error)
    return false
  }
}

/**
 * 获取所有自动提醒规则
 */
export async function getAutoReminderRules(): Promise<AutoReminderRuleWithWarehouse[]> {
  try {
    const {data, error} = await supabase
      .from('auto_reminder_rules')
      .select(
        `
        *,
        warehouse:warehouses(id, name)
      `
      )
      .order('created_at', {ascending: false})

    if (error) {
      console.error('获取自动提醒规则失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取自动提醒规则异常:', error)
    return []
  }
}

/**
 * 创建自动提醒规则
 */
export async function createAutoReminderRule(
  rule: Omit<AutoReminderRule, 'id' | 'created_at' | 'updated_at'>
): Promise<AutoReminderRule | null> {
  try {
    const {data, error} = await supabase.from('auto_reminder_rules').insert(rule).select().maybeSingle()

    if (error) {
      console.error('创建自动提醒规则失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('创建自动提醒规则异常:', error)
    return null
  }
}

/**
 * 更新自动提醒规则
 */
export async function updateAutoReminderRule(id: string, updates: Partial<AutoReminderRule>): Promise<boolean> {
  try {
    const {error} = await supabase.from('auto_reminder_rules').update(updates).eq('id', id)

    if (error) {
      console.error('更新自动提醒规则失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('更新自动提醒规则异常:', error)
    return false
  }
}

/**
 * 删除自动提醒规则
 */
export async function deleteAutoReminderRule(id: string): Promise<boolean> {
  try {
    const {error} = await supabase.from('auto_reminder_rules').delete().eq('id', id)

    if (error) {
      console.error('删除自动提醒规则失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('删除自动提醒规则异常:', error)
    return false
  }
}

/**
 * 获取通知发送记录
 */
export async function getNotificationSendRecords(): Promise<NotificationSendRecordWithSender[]> {
  try {
    const {data, error} = await supabase
      .from('notification_send_records')
      .select(
        `
        *,
        sender:profiles!notification_send_records_sent_by_fkey(id, name, role)
      `
      )
      .order('sent_at', {ascending: false})

    if (error) {
      console.error('获取通知发送记录失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取通知发送记录异常:', error)
    return []
  }
}

/**
 * 创建通知发送记录
 */
export async function createNotificationSendRecord(
  record: Omit<NotificationSendRecord, 'id' | 'sent_at'>
): Promise<NotificationSendRecord | null> {
  try {
    const {data, error} = await supabase.from('notification_send_records').insert(record).select().maybeSingle()

    if (error) {
      console.error('创建通知发送记录失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('创建通知发送记录异常:', error)
    return null
  }
}

/**
 * 发送通知给司机
 * @param driverIds 司机ID列表
 * @param title 通知标题
 * @param content 通知内容
 */
export async function sendNotificationToDrivers(driverIds: string[], title: string, content: string): Promise<boolean> {
  try {
    // 获取当前用户信息作为发送者
    const {
      data: {user}
    } = await supabase.auth.getUser()

    const senderId = user?.id || null
    let senderName = '系统'

    if (user?.id) {
      const {data: userData} = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
      senderName = userData?.name || '系统'
    }

    // 为每个司机创建通知记录
    const notifications = driverIds.map((driverId) => ({
      recipient_id: driverId, // 使用recipient_id
      sender_id: senderId,
      sender_name: senderName,
      title,
      content,
      type: 'system',
      // category: 'system', // 临时移除：数据库字段不存在
      action_url: null,
      related_id: null,
      is_read: false
    }))

    const {error} = await supabase.from('notifications').insert(notifications)

    if (error) {
      console.error('发送通知失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('发送通知异常:', error)
    return false
  }
}

/**
 * 获取指定仓库的所有司机ID
 */
export async function getDriverIdsByWarehouse(warehouseId: string): Promise<string[]> {
  try {
    const {data, error} = await supabase.from('warehouse_assignments').select('user_id').eq('warehouse_id', warehouseId)

    if (error) {
      console.error('获取仓库司机失败:', error)
      return []
    }

    return Array.isArray(data) ? data.map((item) => item.user_id) : []
  } catch (error) {
    console.error('获取仓库司机异常:', error)
    return []
  }
}

/**
 * 获取所有司机ID
 */
export async function getAllDriverIds(): Promise<string[]> {
  try {
    // 单用户架构：从 user_roles 表查询所有司机
    const {data, error} = await supabase
      .from('users')
      .select('id')
      .eq('role', 'DRIVER')
      .order('id', {ascending: true})

    if (error) {
      console.error('获取所有司机失败:', error)
      return []
    }

    return Array.isArray(data) ? data.map((item) => item.id) : []
  } catch (error) {
    console.error('获取所有司机异常:', error)
    return []
  }
}

// ============================================
// 平级账号管理 API
// ============================================

/**
 * 创建平级账号
 * 平级账号与主账号拥有相同的权限和数据访问范围
 */
export async function createPeerAccount(
  mainAccountId: string,
  account: {
    name: string | null
    phone: string | null
    company_name?: string | null
    monthly_fee?: number | null
    notes?: string | null
  },
  email: string | null,
  password: string
): Promise<Profile | null | 'EMAIL_EXISTS'> {
  try {
    // 1. 获取主账号信息 - 单用户架构：从 users 表查询
    const {data: mainAccount, error: mainAccountError} = await supabase
      .from('users')
      .select('*')
      .eq('id', mainAccountId)
      .maybeSingle()

    if (mainAccountError || !mainAccount) {
      console.error('获取主账号信息失败:', mainAccountError)
      return null
    }

    // 2. 验证主账号是否为主账号（main_account_id 为 NULL）
    if (mainAccount.main_account_id !== null) {
      console.error('指定的账号不是主账号，无法创建平级账号')
      return null
    }

    // 如果没有提供邮箱，使用手机号作为邮箱（添加 @fleet.com 后缀）
    const authEmail = email || `${account.phone}@fleet.com`

    // 3. 创建认证用户
    const {data: authData, error: authError} = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        data: {
          name: account.name,
          phone: account.phone,
          role: 'BOSS'
        }
      }
    })

    if (authError) {
      // 检查是否是邮箱已存在的错误
      if (authError.message?.includes('User already registered') || authError.message?.includes('already registered')) {
        console.error('邮箱已被注册:', authEmail)
        return 'EMAIL_EXISTS'
      }
      console.error('创建认证用户失败:', authError)
      return null
    }

    if (!authData.user) {
      console.error('创建认证用户失败：未返回用户数据')
      return null
    }

    // 4. 自动确认用户邮箱（这会触发 handle_new_user 触发器创建基础 profiles 记录）
    const {error: confirmError} = await supabase.rpc('confirm_user_email', {
      user_id: authData.user.id
    })

    if (confirmError) {
      console.error('确认用户邮箱失败:', confirmError)
      return null
    }

    // 5. 等待触发器创建 users 记录（短暂延迟）
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 6. 更新 users 记录，设置平级账号相关字段（单用户架构）
    const {data: userData, error: userError} = await supabase
      .from('users')
      .update({
        name: account.name,
        phone: account.phone,
        email: email, // 保存真实邮箱（可能为 null）
        company_name: account.company_name || mainAccount.company_name,
        monthly_fee: account.monthly_fee || mainAccount.monthly_fee,
        lease_start_date: mainAccount.lease_start_date,
        lease_end_date: mainAccount.lease_end_date,
        notes: account.notes,
        status: 'active',
        main_account_id: mainAccountId // 设置主账号ID
      })
      .eq('id', authData.user.id)
      .select()
      .maybeSingle()

    if (userError) {
      console.error('更新平级账号 users 记录失败:', userError)
      return null
    }

    // 7. user_roles 已废弃，role 字段已在上面的 update 中设置

    // 转换为 Profile 格式
    if (!userData) {
      console.error('更新失败：返回数据为空')
      return null
    }

    const profile: Profile = convertUserToProfile({
      ...userData,
      role: 'BOSS' as UserRole
    })

    return profile
  } catch (error) {
    console.error('创建平级账号异常:', error)
    return null
  }
}

/**
 * 获取主账号的所有平级账号（包括主账号本身）
 */
export async function getPeerAccounts(accountId: string): Promise<Profile[]> {
  try {
    // 1. 获取当前账号信息 - 单用户架构：从 users 表查询
    const {data: currentAccount, error: currentError} = await supabase
      .from('users')
      .select('*')
      .eq('id', accountId)
      .maybeSingle()

    if (currentError || !currentAccount) {
      console.error('获取当前账号信息失败:', currentError)
      return []
    }

    // 2. 确定主账号ID
    const primaryAccountId = currentAccount.main_account_id || currentAccount.id

    // 3. 查询主账号和所有平级账号 - 单用户架构：从 users 表查询
    const {data: usersData, error} = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${primaryAccountId},main_account_id.eq.${primaryAccountId}`)
      .order('created_at', {ascending: true})

    if (error) {
      console.error('获取平级账号列表失败:', error)
      return []
    }

    if (!usersData || usersData.length === 0) {
      return []
    }

    // 4. 批量查询角色信息
    const userIds = usersData.map((u) => u.id)
    const {data: rolesData} = await supabase.from('users').select('id, role').in('id', userIds)

    // 创建角色映射
    const roleMap = new Map<string, UserRole>()
    if (rolesData) {
      for (const roleItem of rolesData) {
        roleMap.set(roleItem.id, roleItem.role)
      }
    }

    // 5. 合并用户和角色信息
    const usersWithRole: UserWithRole[] = usersData.map((user) => ({
      ...user,
      role: roleMap.get(user.id) || null
    }))

    // 6. 转换为 Profile 类型
    return convertUsersToProfiles(usersWithRole)
  } catch (error) {
    console.error('获取平级账号列表异常:', error)
    return []
  }
}

/**
 * 检查账号是否为主账号
 */
export async function isPrimaryAccount(accountId: string): Promise<boolean> {
  try {
    // 单用户架构：从 users 表查询 main_account_id
    const {data, error} = await supabase.from('users').select('main_account_id').eq('id', accountId).maybeSingle()

    if (error || !data) {
      return false
    }

    return data.main_account_id === null
  } catch (error) {
    console.error('检查主账号状态异常:', error)
    return false
  }
}

/**
 * ============================================
 * 通知管理相关API
 * ============================================
 */

/**
 * 创建通知记录（新版通知系统）
 */
export async function createNotificationRecord(input: CreateNotificationInput): Promise<Notification | null> {
  try {
    // 1. 获取当前用户
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('创建通知失败: 用户未登录')
      return null
    }

    // 2. 只使用数据库表中存在的字段
    const {data, error} = await supabase
      .from('notifications')
      .insert({
        recipient_id: input.recipient_id,
        sender_id: input.sender_id || user.id,
        type: input.type || 'system',
        title: input.title,
        content: input.content
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error('创建通知失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('创建通知异常:', error)
    return null
  }
}

/**
 * 获取用户的通知列表
 * 单用户架构：直接查询 public.notifications 表
 */
export async function getNotifications(userId: string, limit = 50): Promise<Notification[]> {
  try {
    // 单用户架构：直接查询 public.notifications
    const {data, error} = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', {ascending: false})
      .limit(limit)

    if (error) {
      console.error('❌ 获取通知失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('❌ 获取通知异常:', error)
    return []
  }
}

/**
 * 获取未读通知数量
 * 单用户架构：直接查询 public.notifications 表
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const {count, error} = await supabase
      .from('notifications')
      .select('*', {count: 'exact', head: true})
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('获取未读通知数量失败:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('获取未读通知数量异常:', error)
    return 0
  }
}

/**
 * 标记通知为已读
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const {error} = await supabase.from('notifications').update({is_read: true}).eq('id', notificationId)

    if (error) {
      console.error('标记通知为已读失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('标记通知为已读异常:', error)
    return false
  }
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const {error} = await supabase
      .from('notifications')
      .update({is_read: true})
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('标记所有通知为已读失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('标记所有通知为已读异常:', error)
    return false
  }
}

/**
 * 删除通知
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const {error} = await supabase.from('notifications').delete().eq('id', notificationId)

    if (error) {
      console.error('删除通知失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('删除通知异常:', error)
    return false
  }
}

/**
 * 发送实名提醒通知
 */
export async function sendVerificationReminder(
  recipientId: string,
  senderId: string,
  senderName: string,
  _senderRole: SenderRole
): Promise<boolean> {
  try {
    const notification = await createNotificationRecord({
      recipient_id: recipientId,
      sender_id: senderId,
      sender_name: senderName,
      // sender_role: senderRole, // 临时移除
      type: 'verification_reminder',
      title: '实名提醒',
      content: `${senderName}要求您尽快完成实名和车辆录入`,
      action_url: '/pages/driver/vehicle-list/index'
    })

    return notification !== null
  } catch (error) {
    console.error('发送实名提醒通知异常:', error)
    return false
  }
}

/**
 * 删除租户结果
 */
export interface DeleteTenantResult {
  success: boolean
  message: string
  deletedData?: {
    tenant: string
    peerAccounts: number
    managers: number
    drivers: number
    vehicles: number
    warehouses: number
    attendance: number
    leaves: number
    pieceWorks: number
    notifications: number
    total: number
  }
  error?: string
}

/**
 * 删除租户（老板账号）- 带详细日志版本
 * 会级联删除该租户下的所有数据
 */
export async function deleteTenantWithLog(id: string): Promise<DeleteTenantResult> {
  try {
    // 1. 验证是否为主账号 - 单用户架构：从 users 和 user_roles 表查询
    const [{data: user, error: fetchError}, {data: roleData}] = await Promise.all([
      supabase.from('users').select('id, main_account_id, name, phone').eq('id', id).maybeSingle(),
      supabase.from('users').select('role').eq('id', id).maybeSingle()
    ])

    if (fetchError) {
      console.error('查询租户信息失败:', fetchError)
      return {
        success: false,
        message: '查询租户信息失败',
        error: fetchError.message
      }
    }

    if (!user) {
      console.error('租户不存在')
      return {
        success: false,
        message: '租户不存在',
        error: '未找到指定的租户'
      }
    }

    const role = roleData?.role || 'DRIVER'

    // 确保是老板账号
    if (role !== 'BOSS') {
      console.error('只能删除老板账号，当前角色:', role)
      return {
        success: false,
        message: '只能删除老板账号',
        error: `当前用户角色为 ${role}，不是 BOSS`
      }
    }

    // 确保是主账号（不是平级账号）
    if (user.main_account_id !== null) {
      console.error('只能删除主账号，不能删除平级账号')
      return {
        success: false,
        message: '只能删除主账号，不能删除平级账号',
        error: '请删除主账号，平级账号会自动级联删除'
      }
    }

    // 2. 统计将要删除的数据 - 单用户架构
    const [
      {data: peerAccounts},
      {data: managerRoles},
      {data: driverRoles},
      {data: vehicles},
      {data: warehouses},
      {data: attendance},
      {data: leaves},
      {data: pieceWorks},
      {data: notifications}
    ] = await Promise.all([
      supabase.from('users').select('id').eq('main_account_id', id),
      supabase
        .from('users')
        .select('id')
        .eq('role', 'MANAGER'),
      supabase
        .from('users')
        .select('id')
        .eq('role', 'DRIVER'),
      supabase.from('vehicles').select('id').eq('tenant_id', id),
      supabase.from('warehouses').select('id').eq('tenant_id', id),
      supabase.from('attendance').select('id').eq('tenant_id', id),
      supabase.from('leave_applications').select('id').eq('tenant_id', id),
      supabase.from('piece_work_records').select('id').eq('tenant_id', id),
      supabase.from('notifications').select('id').eq('tenant_id', id)
    ])

    const stats = {
      tenant: `${user.name || '未命名'} (${user.phone || '无手机号'})`,
      peerAccounts: peerAccounts?.length || 0,
      managers: managerRoles?.length || 0,
      drivers: driverRoles?.length || 0,
      vehicles: vehicles?.length || 0,
      warehouses: warehouses?.length || 0,
      attendance: attendance?.length || 0,
      leaves: leaves?.length || 0,
      pieceWorks: pieceWorks?.length || 0,
      notifications: notifications?.length || 0,
      total: 0
    }

    stats.total =
      1 + // 租户本身
      stats.peerAccounts +
      stats.managers +
      stats.drivers +
      stats.vehicles +
      stats.warehouses +
      stats.attendance +
      stats.leaves +
      stats.pieceWorks +
      stats.notifications

    // 3. 删除主账号（会自动级联删除所有关联数据）- 单用户架构：删除 users 表记录
    const {error: deleteError} = await supabase.from('users').delete().eq('id', id)

    if (deleteError) {
      console.error('删除老板账号失败:', deleteError)
      return {
        success: false,
        message: '删除失败',
        error: deleteError.message
      }
    }

    // 4. 验证删除是否成功
    const {data: verifyUser} = await supabase.from('users').select('id').eq('id', id).maybeSingle()

    if (verifyUser) {
      console.error('删除失败：租户仍然存在')
      return {
        success: false,
        message: '删除失败：租户仍然存在',
        error: '可能是权限不足或数据库约束问题',
        deletedData: stats
      }
    }

    return {
      success: true,
      message: '删除成功',
      deletedData: stats
    }
  } catch (error) {
    console.error('删除老板账号异常:', error)
    return {
      success: false,
      message: '删除异常',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
