/**
 * 数据库查询辅助函数
 *
 * 优化后：role字段已直接存储在users表中，简化了查询逻辑
 */

import {supabase} from '@/client/supabase'
import {PermissionAction} from '@/config/permission-config'
import {checkCurrentUserPermission} from '@/services/permission-service'
import {getDriverIdsByWarehouse, getManagerWarehouses} from './api/warehouses'
import type {Profile, UserRole} from './types'

/**
 * 用户完整信息接口（包含角色）
 */
export interface UserWithRole {
  id: string
  name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole | null
  driver_type?: 'pure' | 'with_vehicle' | null
  created_at: string
  updated_at: string
}

/**
 * 将 UserWithRole 转换为 Profile 格式（向后兼容）
 * @param user 用户数据
 * @returns Profile 对象
 */
export function convertUserToProfile(user: UserWithRole): Profile {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    role: user.role || 'DRIVER', // 默认角色
    avatar_url: user.avatar_url,
    driver_type: user.driver_type || null, // 司机类型
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
