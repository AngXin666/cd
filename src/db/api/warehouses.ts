/**
 * 仓库管理 API
 *
 * 功能包括：
 * - 仓库CRUD操作
 * - 仓库规则管理
 * - 仓库与驾驶员关联
 * - 仓库与管理员关联
 * - 仓库设置
 *
 * 注意：此文件是 Repository 层的包装器
 * 所有数据访问都通过 Repository 层进行，确保缓存一致性
 *
 * @module db/api/warehouses
 */

import { supabase } from '@/client/supabase'
import { publish } from '@/utils/eventBus'
import { createLogger } from '@/utils/logger'
import { convertUserToProfile } from '../helpers'
import {
  warehousesRepository,
  warehouseAssignmentsRepository,
  categoriesRepository
} from '../repositories'
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
import { getAllAttendanceRules } from './attendance'

// ==================== 仓库管理 ====================

/**
 * 获取所有启用的仓库
 * 使用 WarehousesRepository，带缓存（TTL 10 分钟）
 *
 * @returns 启用的仓库列表
 */
export async function getActiveWarehouses(): Promise<Warehouse[]> {
  // 获取所有仓库，然后过滤启用的
  const warehouses = await warehousesRepository.getAllWarehouses()
  return warehouses.filter((w) => w.is_active)
}

/**
 * 获取所有仓库（管理员使用）
 * 使用 WarehousesRepository，带缓存（TTL 10 分钟）
 *
 * @returns 所有仓库列表
 */
export async function getAllWarehouses(): Promise<Warehouse[]> {
  return warehousesRepository.getAllWarehouses()
}

/**
 * 获取仓库详情
 * 使用 WarehousesRepository，带缓存（TTL 10 分钟）
 *
 * @param id - 仓库 ID
 * @returns 仓库信息，不存在返回 null
 */
export async function getWarehouseById(id: string): Promise<Warehouse | null> {
  return warehousesRepository.getWarehouseById(id)
}


/**
 * 获取仓库详情（包含规则）
 * 注意：此函数需要关联查询，暂时保留直接 Supabase 调用
 *
 * @param id - 仓库 ID
 * @returns 仓库信息（包含规则），不存在返回 null
 */
export async function getWarehouseWithRule(id: string): Promise<WarehouseWithRule | null> {
  const { data, error } = await supabase
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
    return { ...data, rule: data.rule[0] } as WarehouseWithRule
  }

  return data as WarehouseWithRule | null
}

/**
 * 创建仓库
 * 使用 WarehousesRepository，创建成功后自动清除缓存
 *
 * @param input - 仓库输入数据
 * @returns 创建的仓库对象，失败返回 null
 * @throws {Error} 用户未登录、名称为空、地址为空或创建失败时抛出错误
 */
export async function createWarehouse(input: WarehouseInput): Promise<Warehouse | null> {
  // 1. 获取当前用户
  const {
    data: { user }
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

  // 3. 使用 Repository 创建仓库
  const data = await warehousesRepository.createWarehouse({
    name: input.name.trim(),
    address: input.address.trim(),
    is_active: input.is_active !== undefined ? input.is_active : true
  })

  if (!data) {
    throw new Error('创建仓库失败，请稍后重试')
  }

  // 4. 发布仓库创建事件，通知相关页面刷新
  publish('warehouse:created', {
    id: data.id,
    name: data.name,
    address: data.address,
    is_active: data.is_active
  })

  return data
}

/**
 * 更新仓库
 * 使用 WarehousesRepository，更新成功后自动清除缓存
 *
 * @param id - 仓库ID
 * @param update - 更新数据
 * @returns 是否更新成功
 */
export async function updateWarehouse(id: string, update: WarehouseUpdate): Promise<boolean> {
  const result = await warehousesRepository.updateWarehouse(id, update)

  if (result) {
    // 发布仓库更新事件，通知相关页面刷新
    publish('warehouse:updated', {
      id,
      ...update
    })
    return true
  }

  return false
}

/**
 * 删除仓库
 * 使用 WarehousesRepository，删除成功后自动清除缓存
 *
 * @param id - 仓库ID
 * @returns 是否删除成功
 * @throws {Error} 当是最后一个仓库或删除失败时抛出错误
 */
export async function deleteWarehouse(id: string): Promise<boolean> {
  const success = await warehousesRepository.deleteWarehouse(id)

  if (success) {
    // 发布仓库删除事件，通知相关页面刷新
    publish('warehouse:deleted', { id })
    return true
  }

  throw new Error('删除仓库失败，请稍后重试')
}

// ==================== 仓库规则关联 ====================

/**
 * 获取所有仓库及其考勤规则
 *
 * @returns 仓库列表（包含规则）
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
 *
 * @returns 所有仓库列表（包含规则）
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
 * 使用 WarehousesRepository，带缓存（TTL 10 分钟）
 *
 * @param driverId - 司机用户 ID
 * @returns 司机关联的仓库列表
 */
export async function getDriverWarehouses(driverId: string): Promise<Warehouse[]> {
  return warehousesRepository.getDriverWarehouses(driverId)
}

/**
 * 获取司机的仓库ID列表
 * 使用 WarehouseAssignmentsRepository，带缓存（TTL 5 分钟）
 *
 * @param driverId - 司机用户 ID
 * @returns 司机关联的仓库 ID 列表
 */
export async function getDriverWarehouseIds(driverId: string): Promise<string[]> {
  // 添加参数验证
  if (!driverId || driverId === 'anon' || driverId.length < 10) {
    logger.error('无效的司机 ID', { driverId })
    return []
  }

  logger.db('查询', 'warehouse_assignments', { driverId })

  const warehouseIds = await warehouseAssignmentsRepository.getWarehouseIdsByUser(driverId)

  logger.db('查询成功', 'warehouse_assignments', {
    driverId,
    count: warehouseIds.length
  })

  return warehouseIds
}

/**
 * 获取仓库的司机列表
 * 单用户架构：直接查询 warehouse_assignments + users + user_roles
 *
 * @param warehouseId - 仓库 ID
 * @returns 仓库关联的司机列表
 */
export async function getDriversByWarehouse(warehouseId: string): Promise<Profile[]> {
  try {
    // 使用 Repository 获取仓库的用户 ID 列表
    const driverIds = await warehouseAssignmentsRepository.getUserIdsByWarehouse(warehouseId)

    if (driverIds.length === 0) {
      return []
    }

    // 单用户架构：从 users 表查询司机信息
    const [{ data: users, error: usersError }, { data: roles, error: rolesError }] = await Promise.all([
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
 * 使用 WarehouseAssignmentsRepository，创建成功后自动清除缓存
 *
 * @param input - 仓库分配输入数据
 * @returns 分配结果
 */
export async function assignWarehouseToDriver(
  input: DriverWarehouseInput
): Promise<{ success: boolean; error?: string }> {
  // 单用户架构：从 users 表查询司机信息
  const { data: driver, error: driverError } = await supabase
    .from('users')
    .select('name')
    .eq('id', input.user_id)
    .maybeSingle()

  if (driverError) {
    console.error('查询司机信息失败:', driverError)
    return { success: false, error: '查询司机信息失败' }
  }

  if (!driver) {
    console.error('司机不存在:', input.user_id)
    return { success: false, error: '司机不存在' }
  }

  // 获取仓库信息
  const warehouse = await warehousesRepository.getWarehouseById(input.warehouse_id)

  if (!warehouse) {
    console.error('仓库不存在:', input.warehouse_id)
    return { success: false, error: '仓库不存在' }
  }

  // 3. 检查仓库是否被禁用
  if (!warehouse.is_active) {
    console.error('仓库已被禁用，不允许分配司机:', warehouse.name)
    return { success: false, error: `仓库"${warehouse.name}"已被禁用，不允许分配司机` }
  }

  // 4. 使用 Repository 执行分配
  const result = await warehouseAssignmentsRepository.createAssignment({
    user_id: input.user_id,
    warehouse_id: input.warehouse_id
  })

  if (!result) {
    return { success: false, error: '分配仓库失败' }
  }

  // 5. 发布仓库分配创建事件，通知相关页面刷新
  publish('warehouse_assignment:created', {
    user_id: input.user_id,
    warehouse_id: input.warehouse_id,
    driver_name: driver.name,
    warehouse_name: warehouse.name
  })

  return { success: true }
}

/**
 * 取消司机的仓库分配
 * 注意：需要先查询分配 ID，然后删除
 *
 * @param driverId - 司机ID
 * @param warehouseId - 仓库ID
 * @returns 是否成功
 */
export async function removeWarehouseFromDriver(driverId: string, warehouseId: string): Promise<boolean> {
  // 先查询分配记录的 ID
  const assignments = await warehouseAssignmentsRepository.getByUser(driverId)
  const assignment = assignments.find((a) => a.warehouse_id === warehouseId)

  if (!assignment) {
    console.error('未找到仓库分配记录:', { driverId, warehouseId })
    return false
  }

  const success = await warehouseAssignmentsRepository.deleteAssignment(assignment.id)

  if (success) {
    // 发布仓库分配删除事件，通知相关页面刷新
    publish('warehouse_assignment:deleted', {
      user_id: driverId,
      warehouse_id: warehouseId
    })
  }

  return success
}

/**
 * 获取所有司机仓库关联
 * 使用 WarehouseAssignmentsRepository，带缓存（TTL 5 分钟）
 *
 * @returns 所有仓库分配列表
 */
export async function getAllDriverWarehouses(): Promise<DriverWarehouse[]> {
  const assignments = await warehouseAssignmentsRepository.getAllAssignments()
  // 转换为 DriverWarehouse 格式
  return assignments.map((a) => ({
    id: a.id,
    user_id: a.user_id,
    warehouse_id: a.warehouse_id,
    assigned_by: a.assigned_by || null,
    created_at: a.created_at
  }))
}

/**
 * 获取指定司机的仓库分配列表
 * 使用 WarehouseAssignmentsRepository，带缓存（TTL 5 分钟）
 *
 * @param driverId - 司机用户 ID
 * @returns 司机的仓库分配列表
 */
export async function getWarehouseAssignmentsByDriver(driverId: string): Promise<DriverWarehouse[]> {
  const assignments = await warehouseAssignmentsRepository.getByUser(driverId)
  // 转换为 DriverWarehouse 格式
  return assignments.map((a) => ({
    id: a.id,
    user_id: a.user_id,
    warehouse_id: a.warehouse_id,
    assigned_by: a.assigned_by || null,
    created_at: a.created_at
  }))
}

/**
 * 获取指定管理员的仓库分配列表
 * 使用 WarehouseAssignmentsRepository，带缓存（TTL 5 分钟）
 *
 * @param managerId - 管理员用户 ID
 * @returns 管理员的仓库分配列表
 */
export async function getWarehouseAssignmentsByManager(
  managerId: string
): Promise<{ id: string; manager_id: string; warehouse_id: string; created_at: string }[]> {
  const assignments = await warehouseAssignmentsRepository.getByUser(managerId)

  // 转换字段名以保持兼容性
  return assignments.map((item) => ({
    id: item.id,
    manager_id: item.user_id,
    warehouse_id: item.warehouse_id,
    created_at: item.created_at
  }))
}

/**
 * 删除指定司机的所有仓库分配
 * 使用 WarehouseAssignmentsRepository，删除成功后自动清除缓存
 *
 * @param driverId - 司机用户 ID
 * @returns 是否删除成功
 */
export async function deleteWarehouseAssignmentsByDriver(driverId: string): Promise<boolean> {
  return warehouseAssignmentsRepository.deleteByUser(driverId)
}

/**
 * 插入单个仓库分配
 * 使用 WarehouseAssignmentsRepository，创建成功后自动清除缓存
 *
 * @param input - 仓库分配输入数据
 * @returns 是否插入成功
 */
export async function insertWarehouseAssignment(input: DriverWarehouseInput): Promise<boolean> {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('插入仓库分配失败: 用户未登录')
    return false
  }

  const result = await warehouseAssignmentsRepository.upsertAssignment({
    user_id: input.user_id,
    warehouse_id: input.warehouse_id
  })

  return result !== null
}


/**
 * 插入管理员/车队长的仓库分配
 * 使用 WarehouseAssignmentsRepository，创建成功后自动清除缓存
 *
 * @param input - 管理员仓库分配输入数据
 * @returns 是否插入成功
 */
export async function insertManagerWarehouseAssignment(input: {
  manager_id: string
  warehouse_id: string
}): Promise<boolean> {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('插入管理员仓库分配失败: 用户未登录')
    return false
  }

  // 单用户架构：从 users 表查询车队长信息
  const { data: manager, error: managerError } = await supabase
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

  // 获取仓库信息
  const warehouse = await warehousesRepository.getWarehouseById(input.warehouse_id)

  if (!warehouse) {
    console.error('仓库不存在:', input.warehouse_id)
    return false
  }

  // 使用 Repository 的 upsert 方法（自动处理重复）
  const result = await warehouseAssignmentsRepository.upsertAssignment({
    user_id: input.manager_id,
    warehouse_id: input.warehouse_id
  })

  return result !== null
}

/**
 * 批量设置司机的仓库
 * 使用 WarehouseAssignmentsRepository，操作成功后自动清除缓存
 *
 * @param driverId - 司机用户 ID
 * @param warehouseIds - 仓库 ID 列表
 * @returns 设置结果
 */
export async function setDriverWarehouses(
  driverId: string,
  warehouseIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // 如果有新的仓库分配，先检查所有仓库是否都是启用状态
    if (warehouseIds.length > 0) {
      const warehouses = await warehousesRepository.getAllWarehouses()
      const warehouseMap = new Map(warehouses.map((w) => [w.id, w]))

      // 检查是否有被禁用的仓库
      const disabledWarehouses = warehouseIds
        .map((id) => warehouseMap.get(id))
        .filter((w) => w && !w.is_active)

      if (disabledWarehouses.length > 0) {
        const disabledNames = disabledWarehouses.map((w) => w!.name).join('、')
        console.error('以下仓库已被禁用，不允许分配司机:', disabledNames)
        return { success: false, error: `以下仓库已被禁用，不允许分配司机：${disabledNames}` }
      }
    }

    // 使用 Repository 批量设置用户仓库
    const success = await warehouseAssignmentsRepository.setUserWarehouses(driverId, warehouseIds)

    if (success) {
      // 发布仓库分配更新事件，通知相关页面刷新
      publish('warehouse_assignment:updated', {
        user_id: driverId,
        warehouse_ids: warehouseIds,
        action: 'batch_update'
      })
    }

    return { success }
  } catch (error) {
    console.error('设置司机仓库失败:', error)
    return { success: false, error: '设置司机仓库失败' }
  }
}

// ==================== 管理员仓库关联 API ====================

/**
 * 获取管理员的仓库列表
 * 使用 WarehousesRepository，带缓存（TTL 10 分钟）
 *
 * @param managerId - 管理员用户 ID
 * @returns 管理员关联的仓库列表
 */
export async function getManagerWarehouses(managerId: string): Promise<Warehouse[]> {
  // 添加参数验证
  if (!managerId || managerId === 'anon' || managerId.length < 10) {
    logger.error('无效的管理员 ID', { managerId })
    return []
  }

  logger.db('查询', 'warehouse_assignments', { managerId })

  const warehouses = await warehousesRepository.getManagerWarehouses(managerId)

  logger.db('查询成功', 'warehouse_assignments', {
    managerId,
    count: warehouses.length
  })

  return warehouses
}

/**
 * 获取仓库的管理员列表
 * 单用户架构：直接查询 warehouse_assignments + users
 *
 * @param warehouseId - 仓库 ID
 * @returns 仓库关联的管理员列表
 */
export async function getWarehouseManagers(warehouseId: string): Promise<Profile[]> {
  try {
    // 使用 Repository 获取仓库的用户 ID 列表
    const managerIds = await warehouseAssignmentsRepository.getUserIdsByWarehouse(warehouseId)

    if (managerIds.length === 0) {
      return []
    }

    // 查询管理员信息
    const { data: managers, error: managerError } = await supabase
      .from('users')
      .select('*')
      .in('id', managerIds)
      .order('name', { ascending: true })

    if (managerError) {
      console.error('获取管理员信息失败:', managerError)
      return []
    }

    if (!managers || managers.length === 0) {
      return []
    }

    // 获取角色信息
    const { data: roleData } = await supabase.from('users').select('id, role').in('id', managerIds)

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
 *
 * @param warehouseId - 仓库ID
 * @returns 调度和车队长的用户ID列表
 */
export async function getWarehouseDispatchersAndManagers(warehouseId: string): Promise<string[]> {
  try {
    // 1. 使用 Repository 获取分配到该仓库的所有用户ID
    const userIds = await warehouseAssignmentsRepository.getUserIdsByWarehouse(warehouseId)

    if (userIds.length === 0) {
      return []
    }

    // 2. 查询这些用户中角色为 BOSS、DISPATCHER 或 MANAGER 的用户
    const { data: roles, error: roleError } = await supabase
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
 * 使用 WarehouseAssignmentsRepository，创建成功后自动清除缓存
 *
 * @param managerId - 管理员用户 ID
 * @param warehouseId - 仓库 ID
 * @returns 是否添加成功
 */
export async function addManagerWarehouse(managerId: string, warehouseId: string): Promise<boolean> {
  const result = await warehouseAssignmentsRepository.createAssignment({
    user_id: managerId,
    warehouse_id: warehouseId
  })

  return result !== null
}

/**
 * 删除管理员仓库关联
 * 注意：需要先查询分配 ID，然后删除
 *
 * @param managerId - 管理员用户 ID
 * @param warehouseId - 仓库 ID
 * @returns 是否删除成功
 */
export async function removeManagerWarehouse(managerId: string, warehouseId: string): Promise<boolean> {
  // 先查询分配记录的 ID
  const assignments = await warehouseAssignmentsRepository.getByUser(managerId)
  const assignment = assignments.find((a) => a.warehouse_id === warehouseId)

  if (!assignment) {
    console.error('未找到管理员仓库分配记录:', { managerId, warehouseId })
    return false
  }

  return warehouseAssignmentsRepository.deleteAssignment(assignment.id)
}


// ==================== 仓库设置 ====================

/**
 * 获取仓库设置
 * 使用 WarehousesRepository，带缓存（TTL 10 分钟）
 *
 * @param warehouseId - 仓库 ID
 * @returns 仓库设置，不存在返回 null
 */
export async function getWarehouseSettings(warehouseId: string): Promise<{
  max_leave_days: number
  resignation_notice_days: number
} | null> {
  const warehouse = await warehousesRepository.getWarehouseById(warehouseId)

  if (!warehouse) {
    return null
  }

  return {
    max_leave_days: warehouse.max_leave_days || 0,
    resignation_notice_days: warehouse.resignation_notice_days || 0
  }
}

/**
 * 更新仓库设置
 * 使用 WarehousesRepository，更新成功后自动清除缓存
 *
 * @param warehouseId - 仓库 ID
 * @param settings - 设置数据
 * @returns 是否更新成功
 */
export async function updateWarehouseSettings(
  warehouseId: string,
  settings: {
    max_leave_days?: number
    resignation_notice_days?: number
  }
): Promise<boolean> {
  const result = await warehousesRepository.updateSettings(warehouseId, settings)
  return result !== null
}

/**
 * 获取仓库绑定的司机数量
 * 使用 WarehousesRepository，带缓存（TTL 10 分钟）
 *
 * @param warehouseId - 仓库 ID
 * @returns 司机数量
 */
export async function getWarehouseDriverCount(warehouseId: string): Promise<number> {
  const driverIds = await warehousesRepository.getDriverIdsByWarehouse(warehouseId)
  return driverIds.length
}

/**
 * 获取仓库的管理员（单个）
 * 单用户架构：直接查询 warehouse_assignments + users + user_roles
 *
 * @param warehouseId - 仓库 ID
 * @returns 仓库管理员，不存在返回 null
 */
export async function getWarehouseManager(warehouseId: string): Promise<Profile | null> {
  try {
    // 使用 Repository 获取仓库的用户分配
    const assignments = await warehouseAssignmentsRepository.getByWarehouse(warehouseId)

    if (assignments.length === 0) {
      return null
    }

    // 取第一个分配的用户
    const managerId = assignments[0].user_id

    // 单用户架构：从 users 表查询车队长信息
    const [{ data: user, error: userError }, { data: roleData, error: roleError }] = await Promise.all([
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
 * 使用 WarehouseAssignmentsRepository，操作成功后自动清除缓存
 *
 * @param managerId - 管理员用户 ID
 * @param warehouseIds - 仓库 ID 列表
 * @returns 是否设置成功
 */
export async function setManagerWarehouses(managerId: string, warehouseIds: string[]): Promise<boolean> {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('设置管理员仓库失败: 用户未登录')
    return false
  }

  // 使用 Repository 批量设置用户仓库
  return warehouseAssignmentsRepository.setUserWarehouses(managerId, warehouseIds)
}

// ==================== 仓库品类 ====================

/**
 * 获取仓库的品类列表（返回品类ID数组）
 * 使用 WarehousesRepository，带缓存（TTL 10 分钟）
 *
 * @param warehouseId - 仓库 ID
 * @returns 品类 ID 列表
 */
export async function getWarehouseCategories(warehouseId: string): Promise<string[]> {
  return warehousesRepository.getWarehouseCategories(warehouseId)
}

/**
 * 获取仓库的品类详细信息
 * 使用 CategoriesRepository 获取品类详情
 *
 * @param warehouseId - 仓库 ID
 * @returns 品类详细信息列表
 */
export async function getWarehouseCategoriesWithDetails(warehouseId: string): Promise<PieceWorkCategory[]> {
  try {
    // 获取仓库关联的品类 ID
    const categoryIds = await warehousesRepository.getWarehouseCategories(warehouseId)

    if (categoryIds.length === 0) {
      return []
    }

    // 从 CategoriesRepository 获取品类详细信息
    const allCategories = await categoriesRepository.getAllCategories()

    // 过滤出仓库关联的品类
    const warehouseCategories = allCategories.filter((cat) => categoryIds.includes(cat.id))

    // 转换为 PieceWorkCategory 格式，并保持向后兼容
    return warehouseCategories.map((item) => ({
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

// ==================== 其他仓库函数 ====================

/**
 * 获取仓库的司机ID列表
 * 使用 WarehousesRepository，带缓存（TTL 10 分钟）
 *
 * @param warehouseId - 仓库 ID
 * @returns 司机 ID 列表
 */
export async function getDriverIdsByWarehouse(warehouseId: string): Promise<string[]> {
  return warehousesRepository.getDriverIdsByWarehouse(warehouseId)
}
