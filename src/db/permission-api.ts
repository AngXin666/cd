/**
 * 权限管理 API
 * 提供权限查询、验证和管理功能
 */

import {supabase} from '@/client/supabase'
import type {Permission, Role, RolePermission} from './types/permission'

/**
 * 获取所有角色
 */
export async function getAllRoles(): Promise<Role[]> {
  const {data, error} = await supabase.from('roles').select('*').order('id', {ascending: true})

  if (error) {
    console.error('获取角色列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取所有权限
 */
export async function getAllPermissions(): Promise<Permission[]> {
  const {data, error} = await supabase.from('permissions').select('*').order('module, id', {ascending: true})

  if (error) {
    console.error('获取权限列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取指定角色的权限列表
 */
export async function getRolePermissions(roleId: string): Promise<string[]> {
  const {data, error} = await supabase.from('role_permissions').select('permission_id').eq('role_id', roleId)

  if (error) {
    console.error('获取角色权限失败:', error)
    return []
  }

  return Array.isArray(data) ? data.map((item) => item.permission_id) : []
}

/**
 * 获取用户的所有权限
 * 注意：权限系统已简化，现在直接基于 users.role 进行权限判断
 * 此函数保留用于兼容性，始终返回空数组
 */
export async function getUserPermissions(_userId: string): Promise<string[]> {
  // 权限系统已废弃，表 user_roles, permissions, role_permissions 已删除
  // 现在权限判断直接基于 users.role 字段
  // 返回空数组以避免报错
  return []
}

/**
 * 检查用户是否有指定权限
 */
export async function checkUserPermission(userId: string, permissionCode: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('has_permission', {
      user_id_param: userId,
      permission_code: permissionCode
    })

    if (error) {
      console.error('检查用户权限失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('检查用户权限异常:', error)
    return false
  }
}

/**
 * 检查用户是否有任一权限
 */
export async function checkUserAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('has_any_permission', {
      user_id_param: userId,
      permission_codes: permissionCodes
    })

    if (error) {
      console.error('检查用户权限失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('检查用户权限异常:', error)
    return false
  }
}

/**
 * 检查用户是否有所有权限
 */
export async function checkUserAllPermissions(userId: string, permissionCodes: string[]): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('has_all_permissions', {
      user_id_param: userId,
      permission_codes: permissionCodes
    })

    if (error) {
      console.error('检查用户权限失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('检查用户权限异常:', error)
    return false
  }
}

/**
 * 更新角色权限映射
 * 只有 BOSS 可以调用
 */
export async function updateRolePermissions(roleId: string, permissionIds: string[]): Promise<boolean> {
  try {
    // 1. 删除该角色的所有权限
    const {error: deleteError} = await supabase.from('role_permissions').delete().eq('role_id', roleId)

    if (deleteError) {
      console.error('删除角色权限失败:', deleteError)
      return false
    }

    // 2. 插入新的权限映射
    if (permissionIds.length > 0) {
      const mappings: Omit<RolePermission, 'id' | 'created_at'>[] = permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId
      }))

      const {error: insertError} = await supabase.from('role_permissions').insert(mappings)

      if (insertError) {
        console.error('插入角色权限失败:', insertError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('更新角色权限异常:', error)
    return false
  }
}
