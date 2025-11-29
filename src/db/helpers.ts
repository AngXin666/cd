/**
 * 数据库查询辅助函数
 *
 * 这些函数简化了对新表结构（users + user_roles）的查询操作
 */

import {supabase} from '@/client/supabase'
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
 *
 * @param userId - 用户ID
 * @returns 用户信息（包含角色）
 */
export async function getUserWithRole(userId: string): Promise<UserWithRole | null> {
  // 1. 查询用户基本信息
  const {data: user, error: userError} = await supabase.from('users').select('*').eq('id', userId).maybeSingle()

  if (userError) {
    console.error('[getUserWithRole] 查询用户失败:', userError)
    throw new Error(`查询用户失败: ${userError.message}`)
  }

  if (!user) {
    return null
  }

  // 2. 查询用户角色
  const {data: roleData, error: roleError} = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (roleError) {
    console.error('[getUserWithRole] 查询角色失败:', roleError)
    throw new Error(`查询角色失败: ${roleError.message}`)
  }

  return {
    ...user,
    role: roleData?.role || null
  }
}

/**
 * 查询多个用户的完整信息（包含角色）
 *
 * @param userIds - 用户ID数组（可选，不传则查询所有用户）
 * @returns 用户信息数组
 */
export async function getUsersWithRole(userIds?: string[]): Promise<UserWithRole[]> {
  // 1. 查询用户基本信息
  let usersQuery = supabase.from('users').select('*')

  if (userIds && userIds.length > 0) {
    usersQuery = usersQuery.in('id', userIds)
  }

  const {data: users, error: usersError} = await usersQuery

  if (usersError) {
    console.error('[getUsersWithRole] 查询用户失败:', usersError)
    throw new Error(`查询用户失败: ${usersError.message}`)
  }

  if (!users || users.length === 0) {
    return []
  }

  // 2. 查询所有用户的角色
  const {data: roles, error: rolesError} = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in(
      'user_id',
      users.map((u) => u.id)
    )

  if (rolesError) {
    console.error('[getUsersWithRole] 查询角色失败:', rolesError)
    throw new Error(`查询角色失败: ${rolesError.message}`)
  }

  // 3. 合并用户信息和角色
  const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || [])

  return users.map((user) => ({
    ...user,
    role: roleMap.get(user.id) || null
  }))
}

/**
 * 根据角色查询用户
 *
 * @param role - 用户角色
 * @returns 用户信息数组
 */
export async function getUsersByRole(role: UserRole): Promise<UserWithRole[]> {
  // 1. 查询指定角色的用户ID
  const {data: roleData, error: roleError} = await supabase.from('user_roles').select('user_id').eq('role', role)

  if (roleError) {
    console.error('[getUsersByRole] 查询角色失败:', roleError)
    throw new Error(`查询角色失败: ${roleError.message}`)
  }

  if (!roleData || roleData.length === 0) {
    return []
  }

  const userIds = roleData.map((r) => r.user_id)

  // 2. 查询用户信息
  return getUsersWithRole(userIds)
}

/**
 * 更新用户信息（包含角色）
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
  const {role, ...userUpdates} = updates

  // 1. 更新用户基本信息
  if (Object.keys(userUpdates).length > 0) {
    const {error: userError} = await supabase
      .from('users')
      .update({
        ...userUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (userError) {
      console.error('[updateUserWithRole] 更新用户失败:', userError)
      throw new Error(`更新用户失败: ${userError.message}`)
    }
  }

  // 2. 更新角色
  if (role) {
    const {error: roleError} = await supabase.from('user_roles').update({role}).eq('user_id', userId)

    if (roleError) {
      console.error('[updateUserWithRole] 更新角色失败:', roleError)
      throw new Error(`更新角色失败: ${roleError.message}`)
    }
  }
}

/**
 * 创建新用户（包含角色）
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
  const {role, ...userData} = user

  // 1. 创建用户
  const {error: userError} = await supabase.from('users').insert({
    ...userData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  if (userError) {
    console.error('[createUserWithRole] 创建用户失败:', userError)
    throw new Error(`创建用户失败: ${userError.message}`)
  }

  // 2. 分配角色
  const {error: roleError} = await supabase.from('user_roles').insert({
    user_id: user.id,
    role: role,
    assigned_at: new Date().toISOString()
  })

  if (roleError) {
    console.error('[createUserWithRole] 分配角色失败:', roleError)
    // 如果角色分配失败，删除已创建的用户
    await supabase.from('users').delete().eq('id', user.id)
    throw new Error(`分配角色失败: ${roleError.message}`)
  }

  return user.id
}

/**
 * 删除用户（会自动删除关联的角色）
 *
 * @param userId - 用户ID
 */
export async function deleteUser(userId: string): Promise<void> {
  // 由于配置了外键级联删除，只需删除 users 表的记录
  // user_roles 表的记录会自动删除
  const {error} = await supabase.from('users').delete().eq('id', userId)

  if (error) {
    console.error('[deleteUser] 删除用户失败:', error)
    throw new Error(`删除用户失败: ${error.message}`)
  }
}

/**
 * 检查用户是否具有指定角色
 *
 * @param userId - 用户ID
 * @param role - 要检查的角色
 * @returns 是否具有该角色
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const {data, error} = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle()

  if (error) {
    console.error('[hasRole] 查询角色失败:', error)
    return false
  }

  return data !== null
}

/**
 * 获取用户角色
 *
 * @param userId - 用户ID
 * @returns 用户角色
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const {data, error} = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle()

  if (error) {
    console.error('[getUserRole] 查询角色失败:', error)
    return null
  }

  return data?.role || null
}
