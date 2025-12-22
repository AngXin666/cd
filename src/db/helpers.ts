/**
 * 数据库查询辅助函数
 *
 * 优化后：role字段已直接存储在users表中，简化了查询逻辑
 * 
 * 审计补充：添加数组字段处理辅助函数
 * 
 * 迁移说明：
 * - 用户查询函数已迁移到 UsersRepository，本文件函数作为兼容层
 * - 新代码应直接使用 usersRepository 的方法
 */

import {supabase} from '@/client/supabase'
import {
  usersRepository,
  convertUserToProfile,
  convertUsersToProfiles,
  type UserWithRole
} from './repositories/UsersRepository'

// 重新导出类型和转换函数，保持向后兼容
export type { UserWithRole }
export { convertUserToProfile, convertUsersToProfiles }

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
import type {Profile, UserRole} from './types'

// ==================== 用户查询函数（使用 Repository）====================

/**
 * 查询单个用户的完整信息（包含角色）
 * 优化后：使用 UsersRepository 进行缓存管理
 *
 * @param userId - 用户ID
 * @returns 用户信息（包含角色）
 */
export async function getUserWithRole(userId: string): Promise<UserWithRole | null> {
  // 使用 Repository 方法（带缓存）
  return usersRepository.getById(userId)
}

/**
 * 查询多个用户的完整信息（包含角色）
 * 优化后：使用 UsersRepository 进行缓存管理
 *
 * @param userIds - 用户ID数组（可选，不传则查询所有用户）
 * @returns 用户信息数组
 */
export async function getUsersWithRole(userIds?: string[]): Promise<UserWithRole[]> {
  // 使用 Repository 方法（带缓存）
  return usersRepository.getByIds(userIds)
}

/**
 * 根据角色获取用户列表
 * 优化后：使用 UsersRepository 进行缓存管理和权限过滤
 *
 * @param role - 用户角色
 * @param user - 用户对象，包含id和可选的role字段
 * @returns 用户信息数组
 */
export async function getUsersByRole(
  role: UserRole,
  user?: {id: string; role?: string} | null
): Promise<UserWithRole[]> {
  // 使用 Repository 方法（带缓存和权限过滤）
  return usersRepository.getByRoleWithPermission(role, user)
}

/**
 * 更新用户信息（包含角色）
 * 优化后：直接在users表更新，更新后清除缓存
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

  // 清除用户缓存
  usersRepository.invalidateCache()
}

/**
 * 创建新用户（包含角色）
 * 优化后：直接在users表创建，创建后清除缓存
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

  // 清除用户缓存
  usersRepository.invalidateCache()

  return user.id
}

/**
 * 删除用户
 * 优化后：删除后清除缓存
 *
 * @param userId - 用户ID
 */
export async function deleteUser(userId: string): Promise<void> {
  const {error} = await supabase.from('users').delete().eq('id', userId)

  if (error) {
    console.error('[deleteUser] 删除用户失败:', error)
    throw new Error(`删除用户失败: ${error.message}`)
  }

  // 清除用户缓存
  usersRepository.invalidateCache()
}

/**
 * 检查用户是否具有指定角色
 * 优化后：使用 UsersRepository 进行缓存管理
 *
 * @param userId - 用户ID
 * @param role - 要检查的角色
 * @returns 是否具有该角色
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  // 使用 Repository 方法（带缓存）
  return usersRepository.hasRole(userId, role)
}

/**
 * 获取用户角色
 * 优化后：使用 UsersRepository 进行缓存管理
 *
 * @param userId - 用户ID
 * @returns 用户角色
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  // 使用 Repository 方法（带缓存）
  return usersRepository.getRole(userId)
}
