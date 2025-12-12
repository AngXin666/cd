/**
 * 统计数据 API
 *
 * 功能包括：
 * - 系统总体统计
 * - 用户个人统计
 * - 仓库统计
 * - 角色统计
 */

import {supabase} from '../supabase'

/**
 * 系统总体统计数据
 */
export interface SystemStats {
  total_users: number
  total_drivers: number
  total_managers: number
  total_warehouses: number
  total_vehicles: number
  total_active_vehicles: number
  total_attendance_today: number
  total_pending_leaves: number
  total_pending_resignations: number
  total_unread_notifications: number
}

/**
 * 用户个人统计数据
 */
export interface UserPersonalStats {
  my_attendance_count: number
  my_leave_count: number
  my_pending_leave_count: number
  my_approved_leave_count: number
  my_rejected_leave_count: number
  my_vehicles_count: number
  my_unread_notifications: number
  my_total_notifications: number
}

/**
 * 仓库统计数据
 */
export interface WarehouseStats {
  warehouse_id: string
  warehouse_name: string
  total_drivers: number
  total_vehicles: number
  active_vehicles: number
  attendance_today: number
  pending_leaves: number
  approved_leaves_this_month?: number
}

/**
 * 用户角色信息
 */
export interface UserRole {
  role: string
  created_at: string
}

/**
 * 用户详细信息
 */
export interface UserDetails {
  user_id: string
  name: string
  phone: string
  email: string
  avatar_url: string
  roles: string[]
  warehouses: Array<{
    id: string
    name: string
    assigned_at: string
  }> | null
  created_at: string
  updated_at: string
}

/**
 * 当前用户完整信息
 */
export interface CurrentUserInfo {
  user_id: string
  name: string
  phone: string
  email: string
  avatar_url: string
  roles: string[]
  is_admin: boolean
  is_manager: boolean
  is_driver: boolean
  warehouses: Array<{
    id: string
    name: string
    assigned_at: string
  }> | null
  permissions: {
    can_manage_all: boolean
    can_manage_warehouse: boolean
    can_manage_drivers: boolean
    can_view_all_data: boolean
    can_approve_applications: boolean
  }
}

/**
 * 获取系统总体统计（仅管理员）
 */
export async function getSystemStats(userId: string): Promise<SystemStats | null> {
  try {
    const {data, error} = await supabase.rpc('get_system_stats', {
      p_user_id: userId
    })

    if (error) {
      console.error('[getSystemStats] 获取系统统计失败:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0]
  } catch (error) {
    console.error('[getSystemStats] 未预期的错误:', error)
    return null
  }
}

/**
 * 获取用户个人统计
 */
export async function getUserPersonalStats(userId: string): Promise<UserPersonalStats | null> {
  try {
    const {data, error} = await supabase.rpc('get_user_personal_stats', {
      p_user_id: userId
    })

    if (error) {
      console.error('[getUserPersonalStats] 获取用户个人统计失败:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0]
  } catch (error) {
    console.error('[getUserPersonalStats] 未预期的错误:', error)
    return null
  }
}

/**
 * 获取仓库统计（管理员和车队长）
 */
export async function getWarehouseStats(warehouseId: string, userId: string): Promise<WarehouseStats | null> {
  try {
    const {data, error} = await supabase.rpc('get_warehouse_stats', {
      p_warehouse_id: warehouseId,
      p_user_id: userId
    })

    if (error) {
      console.error('[getWarehouseStats] 获取仓库统计失败:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0]
  } catch (error) {
    console.error('[getWarehouseStats] 未预期的错误:', error)
    return null
  }
}

/**
 * 获取所有仓库统计（仅管理员）
 */
export async function getAllWarehousesStats(userId: string): Promise<WarehouseStats[]> {
  try {
    const {data, error} = await supabase.rpc('get_all_warehouses_stats', {
      p_user_id: userId
    })

    if (error) {
      console.error('[getAllWarehousesStats] 获取所有仓库统计失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[getAllWarehousesStats] 未预期的错误:', error)
    return []
  }
}

/**
 * 获取用户的所有角色
 */
export async function getUserAllRoles(userId: string): Promise<UserRole[]> {
  try {
    const {data, error} = await supabase.rpc('get_user_all_roles', {
      p_user_id: userId
    })

    if (error) {
      console.error('[getUserAllRoles] 获取用户角色失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[getUserAllRoles] 未预期的错误:', error)
    return []
  }
}

/**
 * 检查用户是否有指定角色
 */
export async function userHasRole(userId: string, role: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('user_has_role', {
      p_user_id: userId,
      p_role: role
    })

    if (error) {
      console.error('[userHasRole] 检查用户角色失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('[userHasRole] 未预期的错误:', error)
    return false
  }
}

/**
 * 获取当前登录用户的完整信息
 */
export async function getCurrentUserInfo(): Promise<CurrentUserInfo | null> {
  try {
    const {data, error} = await supabase.rpc('get_current_user_info')

    if (error) {
      console.error('[getCurrentUserInfo] 获取当前用户信息失败:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0]
  } catch (error) {
    console.error('[getCurrentUserInfo] 未预期的错误:', error)
    return null
  }
}

/**
 * 添加角色给用户（仅管理员）
 */
export async function addRoleToUser(userId: string, role: string, adminId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('add_role_to_user', {
      p_user_id: userId,
      p_role: role,
      p_admin_id: adminId
    })

    if (error) {
      console.error('[addRoleToUser] 添加角色失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('[addRoleToUser] 未预期的错误:', error)
    return false
  }
}

/**
 * 移除用户的角色（仅管理员）
 */
export async function removeRoleFromUser(userId: string, role: string, adminId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('remove_role_from_user', {
      p_user_id: userId,
      p_role: role,
      p_admin_id: adminId
    })

    if (error) {
      console.error('[removeRoleFromUser] 移除角色失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('[removeRoleFromUser] 未预期的错误:', error)
    return false
  }
}

/**
 * 获取指定角色的用户列表（仅管理员）
 */
export async function getUsersByRole(
  role: string,
  adminId: string
): Promise<
  Array<{
    user_id: string
    user_name: string
    user_phone: string
    user_email: string
    created_at: string
  }>
> {
  try {
    const {data, error} = await supabase.rpc('get_users_by_role', {
      p_role: role,
      p_admin_id: adminId
    })

    if (error) {
      console.error('[getUsersByRole] 获取角色用户列表失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[getUsersByRole] 未预期的错误:', error)
    return []
  }
}
