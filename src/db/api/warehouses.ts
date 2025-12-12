/**
 * 仓库管理 API
 *
 * 功能包括：
 * - 仓库CRUD操作
 * - 仓库规则管理
 * - 仓库与驾驶员关联
 * - 仓库与管理员关联
 * - 仓库设置
 */

import {supabase} from '@/client/supabase'
import {CACHE_KEYS, getCache, setCache} from '@/utils/cache'
import {createLogger} from '@/utils/logger'
import {convertUserToProfile} from '../helpers'
import type {
  DriverWarehouse,
  DriverWarehouseInput,
  PieceWorkCategory,
  Profile,
  Warehouse,
  WarehouseInput,
  WarehouseUpdate,
  WarehouseWithRule
} from '../types'

// 创建日志记录器
const logger = createLogger('WarehousesAPI')

// 导入考勤规则函数（从 attendance 模块导入）
import {getAllAttendanceRules} from './attendance'

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

// ==================== 仓库规则关联 ====================

/**
 * 获取所有仓库及其考勤规则
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

// ==================== 司机仓库分配 ====================

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

// ==================== 管理员仓库关联 API ====================

/**
 * 获取管理员的仓库列表
 */
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

/**
 * 添加管理员仓库关联
 */
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

/**
 * 删除管理员仓库关联
 */
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

// ==================== 仓库设置 ====================

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

// ==================== 管理员仓库批量设置 ====================

/**
 * 批量设置管理员的仓库
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

// ==================== 仓库品类 ====================

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

// ==================== 其他仓库函数 ====================

/**
 * 获取仓库的司机ID列表
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
