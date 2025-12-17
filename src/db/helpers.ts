/**
 * 数据库查询辅助函数
 *
 * 优化后：role字段已直接存储在users表中，简化了查询逻辑
 * 
 * 审计补充：添加数组字段处理辅助函数
 */

import {supabase} from '@/client/supabase'

// ==================== 数组字段处理辅助函数 ====================

/**
 * 安全地合并数组字段值
 * 
 * 使用 ?? 运算符确保空数组 [] 不会被错误地回退到备用值
 * 只有当值为 null 或 undefined 时才使用备用值
 * 
 * @param primary - 主要值（优先使用）
 * @param fallback - 备用值（当主要值为 null/undefined 时使用）
 * @returns 合并后的数组值，如果都为空则返回 null
 * 
 * @example
 * // 空数组会被保留
 * mergeArrayField([], ['a', 'b']) // 返回 []
 * 
 * // null 会回退到备用值
 * mergeArrayField(null, ['a', 'b']) // 返回 ['a', 'b']
 * 
 * // undefined 会回退到备用值
 * mergeArrayField(undefined, ['a', 'b']) // 返回 ['a', 'b']
 */
export function mergeArrayField<T>(
  primary: T[] | null | undefined,
  fallback: T[] | null | undefined
): T[] | null {
  return primary ?? fallback ?? null
}

/**
 * 确保数组字段是有效的数组
 * 
 * 用于从数据库读取数据后，确保数组字段是有效的 JavaScript 数组
 * 处理可能的 null、undefined 或非数组值
 * 
 * @param value - 要检查的值
 * @returns 有效的数组或空数组
 * 
 * @example
 * ensureArray(['a', 'b']) // 返回 ['a', 'b']
 * ensureArray(null) // 返回 []
 * ensureArray(undefined) // 返回 []
 * ensureArray('not-an-array') // 返回 []
 */
export function ensureArray<T>(value: T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value
  }
  return []
}

/**
 * 检查数组字段是否有有效内容
 * 
 * @param value - 要检查的数组
 * @returns 如果数组存在且有内容则返回 true
 */
export function hasArrayContent<T>(value: T[] | null | undefined): boolean {
  return Array.isArray(value) && value.length > 0
}
import {PermissionAction} from '@/config/permission-config'
import {checkCurrentUserPermission} from '@/services/permission-service'
import {getDriverIdsByWarehouse, getManagerWarehouses} from './api/warehouses'
import type {Profile, UserRole} from './types'

/**
 * 用户完整信息接口（包含角色和所有扩展字段）
 * 
 * 该接口对应数据库 users 表的完整结构，包含：
 * - 基本信息：id, name, email, phone, avatar_url
 * - 角色信息：role, driver_type
 * - 权限信息：manager_permissions_enabled, main_account_id, peer_account_permission
 * - 扩展信息：nickname, join_date, company_name, vehicle_plate, status, is_active
 * - 地址信息：address_province, address_city, address_district, address_detail
 * - 紧急联系人：emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
 * - 租赁信息：lease_start_date, lease_end_date, monthly_fee, notes
 * - 会话信息：session_token, session_created_at
 * - 时间戳：created_at, updated_at
 */
export interface UserWithRole {
  // 基本信息
  id: string
  name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  // 角色信息
  role: UserRole | null
  driver_type?: 'pure' | 'with_vehicle' | null
  // 权限信息
  /** 车队长权限启用状态：true=完整权限(full_control)，false=仅查看权限(view_only) */
  manager_permissions_enabled?: boolean
  /** 主账号ID：null 表示是主账号，非 null 表示是平级账号（调度） */
  main_account_id?: string | null
  /** 平级账号权限：true=完整权限，false=仅查看权限 */
  peer_account_permission?: boolean | null
  // 扩展信息
  /** 昵称 */
  nickname?: string | null
  /** 入职日期 */
  join_date?: string | null
  /** 公司名称 */
  company_name?: string | null
  /** 车牌号 */
  vehicle_plate?: string | null
  /** 登录账号 */
  login_account?: string | null
  /** 状态 */
  status?: string | null
  /** 是否激活 */
  is_active?: boolean | null
  // 地址信息
  /** 省份 */
  address_province?: string | null
  /** 城市 */
  address_city?: string | null
  /** 区县 */
  address_district?: string | null
  /** 详细地址 */
  address_detail?: string | null
  // 紧急联系人
  /** 紧急联系人姓名 */
  emergency_contact_name?: string | null
  /** 紧急联系人电话 */
  emergency_contact_phone?: string | null
  /** 紧急联系人关系 */
  emergency_contact_relationship?: string | null
  // 租赁信息（兼容旧代码）
  /** 租赁开始日期 */
  lease_start_date?: string | null
  /** 租赁结束日期 */
  lease_end_date?: string | null
  /** 月租金 */
  monthly_fee?: number | null
  /** 备注 */
  notes?: string | null
  // 会话信息（单点登录）
  /** 会话令牌 */
  session_token?: string | null
  /** 会话创建时间 */
  session_created_at?: string | null
  // 时间戳
  created_at: string
  updated_at: string
}

/**
 * 将 UserWithRole 转换为 Profile 格式（向后兼容）
 * 
 * 该函数将数据库查询返回的用户数据转换为 Profile 接口格式，
 * 确保所有字段都被正确映射，包括：
 * - 基本信息字段
 * - 角色和权限字段
 * - 扩展信息字段
 * - 地址信息字段
 * - 紧急联系人字段
 * - 租赁信息字段
 * - 会话信息字段
 * 
 * @param user 用户数据（从数据库查询返回）
 * @returns Profile 对象（包含所有必要字段）
 */
export function convertUserToProfile(user: UserWithRole): Profile {
  return {
    // 基本信息
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    // 角色信息
    role: user.role || 'DRIVER', // 默认角色为司机
    driver_type: user.driver_type || null, // 司机类型：pure（纯司机）或 with_vehicle（带车司机）
    // 权限信息
    manager_permissions_enabled: user.manager_permissions_enabled, // 车队长权限启用状态
    main_account_id: user.main_account_id, // 主账号ID（调度账号关联）
    peer_account_permission: user.peer_account_permission, // 平级账号权限
    // 扩展信息
    nickname: user.nickname || null, // 昵称
    join_date: user.join_date || null, // 入职日期
    company_name: user.company_name || null, // 公司名称
    vehicle_plate: user.vehicle_plate || null, // 车牌号
    login_account: user.login_account || null, // 登录账号
    status: user.status || null, // 状态
    is_active: user.is_active, // 是否激活
    // 地址信息
    address_province: user.address_province || null, // 省份
    address_city: user.address_city || null, // 城市
    address_district: user.address_district || null, // 区县
    address_detail: user.address_detail || null, // 详细地址
    // 紧急联系人
    emergency_contact_name: user.emergency_contact_name || null, // 紧急联系人姓名
    emergency_contact_phone: user.emergency_contact_phone || null, // 紧急联系人电话
    emergency_contact_relationship: user.emergency_contact_relationship || null, // 紧急联系人关系
    // 租赁信息（兼容旧代码）
    lease_start_date: user.lease_start_date || null, // 租赁开始日期
    lease_end_date: user.lease_end_date || null, // 租赁结束日期
    monthly_fee: user.monthly_fee || null, // 月租金
    notes: user.notes || null, // 备注
    // 会话信息（单点登录）
    session_token: user.session_token || null, // 会话令牌
    // 时间戳
    created_at: user.created_at,
    updated_at: user.updated_at
  }
}

/**
 * 批量转换用户数据为 Profile 格式
 * @param users 用户数据数组
 * @returns Profile 对象数组
 */
export function convertUsersToProfiles(users: UserWithRole[]): Profile[] {
  return users.map(convertUserToProfile)
}

/**
 * 查询单个用户的完整信息（包含角色）
 * 优化后：直接从users表查询，无需JOIN
 *
 * @param userId - 用户ID
 * @returns 用户信息（包含角色）
 */
export async function getUserWithRole(userId: string): Promise<UserWithRole | null> {
  const {data: user, error: userError} = await supabase.from('users').select('*').eq('id', userId).maybeSingle()

  if (userError) {
    console.error('[getUserWithRole] 查询用户失败:', userError)
    throw new Error(`查询用户失败: ${userError.message}`)
  }

  return user
}

/**
 * 查询多个用户的完整信息（包含角色）
 * 优化后：直接从users表查询，无需JOIN
 *
 * @param userIds - 用户ID数组（可选，不传则查询所有用户）
 * @returns 用户信息数组
 */
export async function getUsersWithRole(userIds?: string[]): Promise<UserWithRole[]> {
  let usersQuery = supabase.from('users').select('*')

  if (userIds && userIds.length > 0) {
    usersQuery = usersQuery.in('id', userIds)
  }

  const {data: users, error: usersError} = await usersQuery

  if (usersError) {
    console.error('[getUsersWithRole] 查询用户失败:', usersError)
    throw new Error(`查询用户失败: ${usersError.message}`)
  }

  return users || []
}

/**
 * 根据角色获取用户列表
 *
 * @param role - 用户角色
 * @param user - 用户对象，包含id和可选的role字段
 * @returns 用户信息数组
 */
export async function getUsersByRole(
  role: UserRole,
  user?: {id: string; role?: string} | null
): Promise<UserWithRole[]> {
  try {
    if (!user) {
      console.error('[getUsersByRole] 用户未登录')
      throw new Error('用户未登录')
    }

    const permissionResult = checkCurrentUserPermission('users', PermissionAction.SELECT, user)
    if (!permissionResult.hasPermission) {
      console.error('[getUsersByRole] 查询用户权限不足:', permissionResult.error)
      throw new Error('查询用户权限不足')
    }

    let query = supabase.from('users').select('*').eq('role', role)

    // 应用数据过滤
    if (permissionResult.filter) {
      // 对于车队长角色，需要特殊处理：查看管辖仓库下的司机
      if (user.role === 'MANAGER' && role === 'DRIVER') {
        // 获取车队长管理的所有仓库
        const managerWarehouses = await getManagerWarehouses(user.id)
        const warehouseIds = managerWarehouses.map((warehouse) => warehouse.id)

        if (warehouseIds.length > 0) {
          // 获取这些仓库下的所有用户ID
          const allUserIds: string[] = []
          for (const warehouseId of warehouseIds) {
            const userIds = await getDriverIdsByWarehouse(warehouseId)
            allUserIds.push(...userIds)
          }

          // 去重并添加到查询中
          const uniqueUserIds = [...new Set(allUserIds)]
          if (uniqueUserIds.length > 0) {
            query = query.in('id', uniqueUserIds)
          } else {
            // 如果没有管辖的司机，返回空数组
            return []
          }
        } else {
          // 如果没有管辖的仓库，返回空数组
          return []
        }
      } else {
        // 其他情况应用普通过滤
        Object.entries(permissionResult.filter).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }
    }
    const {data: userData, error} = await query

    if (error) {
      console.error('[getUsersByRole] 查询用户失败:', error)
      throw new Error(`查询用户失败: ${error.message}`)
    }

    // 转换数据格式以匹配UserWithRole类型
    const users = userData || []

    return users
  } catch (error) {
    console.error('[getUsersByRole] 查询用户异常:', error)
    throw error
  }
}

/**
 * 更新用户信息（包含角色）
 * 优化后：直接在users表更新，无需分开更新
 *
 * @param userId - 用户ID
 * @param updates - 要更新的字段
 */
export async function updateUserWithRole(
  userId: string,
  updates: {
    name?: string
    email?: string
    phone?: string
    avatar_url?: string
    role?: UserRole
  }
): Promise<void> {
  const {error} = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    console.error('[updateUserWithRole] 更新用户失败:', error)
    throw new Error(`更新用户失败: ${error.message}`)
  }
}

/**
 * 创建新用户（包含角色）
 * 优化后：直接在users表创建，包含role字段
 *
 * @param user - 用户信息
 * @returns 创建的用户ID
 */
export async function createUserWithRole(user: {
  id: string
  name: string
  email?: string
  phone?: string
  avatar_url?: string
  role: UserRole
}): Promise<string> {
  const {error} = await supabase.from('users').insert({
    ...user,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  if (error) {
    console.error('[createUserWithRole] 创建用户失败:', error)
    throw new Error(`创建用户失败: ${error.message}`)
  }

  return user.id
}

/**
 * 删除用户
 * 优化后：只需删除users表记录
 *
 * @param userId - 用户ID
 */
export async function deleteUser(userId: string): Promise<void> {
  const {error} = await supabase.from('users').delete().eq('id', userId)

  if (error) {
    console.error('[deleteUser] 删除用户失败:', error)
    throw new Error(`删除用户失败: ${error.message}`)
  }
}

/**
 * 检查用户是否具有指定角色
 * 优化后：直接从users表查询
 *
 * @param userId - 用户ID
 * @param role - 要检查的角色
 * @returns 是否具有该角色
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const {data, error} = await supabase.from('users').select('role').eq('id', userId).maybeSingle()

  if (error) {
    console.error('[hasRole] 查询角色失败:', error)
    return false
  }

  return data?.role === role
}

/**
 * 获取用户角色
 * 优化后：直接从users表查询
 *
 * @param userId - 用户ID
 * @returns 用户角色
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const {data, error} = await supabase.from('users').select('role').eq('id', userId).maybeSingle()

  if (error) {
    console.error('[getUserRole] 查询角色失败:', error)
    return null
  }

  return data?.role || null
}
