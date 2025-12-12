/**
 * 策略模板权限管理 API
 * 用于管理PEER_ADMIN和MANAGER的权限级别
 */

import {supabase} from '@/client/supabase'

/**
 * 权限级别类型
 */
export type PermissionLevel = 'full_control' | 'view_only'

/**
 * 用户权限信息
 */
export interface UserPermissionInfo {
  user_id: string
  user_name: string
  user_phone: string
  permission_level: PermissionLevel
  strategy_name: string
  granted_at: string
  notes: string | null
}

/**
 * 用户权限详情
 */
export interface UserPermissionDetail extends UserPermissionInfo {
  granted_by_id: string
  granted_by_name: string
}

/**
 * 操作结果
 */
export interface OperationResult {
  success: boolean
  message: string
  user_id?: string
  permission_level?: PermissionLevel
}

/**
 * 创建PEER_ADMIN
 * @param userId 用户ID
 * @param permissionLevel 权限级别（full_control或view_only）
 * @param bossId BOSS的用户ID
 * @param notes 备注
 */
export async function createPeerAdmin(
  userId: string,
  permissionLevel: PermissionLevel,
  bossId: string,
  notes?: string
): Promise<OperationResult> {
  try {
    const {data, error} = await supabase.rpc('create_peer_admin', {
      p_user_id: userId,
      p_permission_level: permissionLevel,
      p_boss_id: bossId,
      p_notes: notes || null
    })

    if (error) {
      console.error('创建PEER_ADMIN失败:', error)
      return {
        success: false,
        message: error.message || '创建失败'
      }
    }

    return data as OperationResult
  } catch (error) {
    console.error('创建PEER_ADMIN异常:', error)
    return {
      success: false,
      message: '创建异常'
    }
  }
}

/**
 * 更新PEER_ADMIN权限
 * @param userId 用户ID
 * @param permissionLevel 权限级别（full_control或view_only）
 * @param bossId BOSS的用户ID
 * @param notes 备注
 */
export async function updatePeerAdminPermission(
  userId: string,
  permissionLevel: PermissionLevel,
  bossId: string,
  notes?: string
): Promise<OperationResult> {
  try {
    const {data, error} = await supabase.rpc('update_peer_admin_permission', {
      p_user_id: userId,
      p_permission_level: permissionLevel,
      p_boss_id: bossId,
      p_notes: notes || null
    })

    if (error) {
      console.error('更新PEER_ADMIN权限失败:', error)
      return {
        success: false,
        message: error.message || '更新失败'
      }
    }

    return data as OperationResult
  } catch (error) {
    console.error('更新PEER_ADMIN权限异常:', error)
    return {
      success: false,
      message: '更新异常'
    }
  }
}

/**
 * 删除PEER_ADMIN
 * @param userId 用户ID
 * @param bossId BOSS的用户ID
 */
export async function removePeerAdmin(userId: string, bossId: string): Promise<OperationResult> {
  try {
    const {data, error} = await supabase.rpc('remove_peer_admin', {
      p_user_id: userId,
      p_boss_id: bossId
    })

    if (error) {
      console.error('删除PEER_ADMIN失败:', error)
      return {
        success: false,
        message: error.message || '删除失败'
      }
    }

    return data as OperationResult
  } catch (error) {
    console.error('删除PEER_ADMIN异常:', error)
    return {
      success: false,
      message: '删除异常'
    }
  }
}

/**
 * 获取所有PEER_ADMIN
 * @param bossId BOSS的用户ID
 */
export async function getAllPeerAdmins(bossId: string): Promise<UserPermissionInfo[]> {
  try {
    const {data, error} = await supabase.rpc('get_all_peer_admins', {
      p_boss_id: bossId
    })

    if (error) {
      console.error('获取PEER_ADMIN列表失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取PEER_ADMIN列表异常:', error)
    return []
  }
}

/**
 * 获取PEER_ADMIN权限信息
 * @param userId 用户ID
 */
export async function getPeerAdminPermission(userId: string): Promise<UserPermissionDetail | null> {
  try {
    const {data, error} = await supabase.rpc('get_peer_admin_permission', {
      p_user_id: userId
    })

    if (error) {
      console.error('获取PEER_ADMIN权限信息失败:', error)
      return null
    }

    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error('获取PEER_ADMIN权限信息异常:', error)
    return null
  }
}

/**
 * 创建MANAGER
 * @param userId 用户ID
 * @param permissionLevel 权限级别（full_control或view_only）
 * @param bossId BOSS的用户ID
 * @param notes 备注
 */
export async function createManager(
  userId: string,
  permissionLevel: PermissionLevel,
  bossId: string,
  notes?: string
): Promise<OperationResult> {
  try {
    const {data, error} = await supabase.rpc('create_manager', {
      p_user_id: userId,
      p_permission_level: permissionLevel,
      p_boss_id: bossId,
      p_notes: notes || null
    })

    if (error) {
      console.error('创建MANAGER失败:', error)
      return {
        success: false,
        message: error.message || '创建失败'
      }
    }

    return data as OperationResult
  } catch (error) {
    console.error('创建MANAGER异常:', error)
    return {
      success: false,
      message: '创建异常'
    }
  }
}

/**
 * 更新MANAGER权限
 * @param userId 用户ID
 * @param permissionLevel 权限级别（full_control或view_only）
 * @param bossId BOSS的用户ID
 * @param notes 备注
 */
export async function updateManagerPermission(
  userId: string,
  permissionLevel: PermissionLevel,
  bossId: string,
  notes?: string
): Promise<OperationResult> {
  try {
    const {data, error} = await supabase.rpc('update_manager_permission', {
      p_user_id: userId,
      p_permission_level: permissionLevel,
      p_boss_id: bossId,
      p_notes: notes || null
    })

    if (error) {
      console.error('更新MANAGER权限失败:', error)
      return {
        success: false,
        message: error.message || '更新失败'
      }
    }

    return data as OperationResult
  } catch (error) {
    console.error('更新MANAGER权限异常:', error)
    return {
      success: false,
      message: '更新异常'
    }
  }
}

/**
 * 删除MANAGER
 * @param userId 用户ID
 * @param bossId BOSS的用户ID
 */
export async function removeManager(userId: string, bossId: string): Promise<OperationResult> {
  try {
    const {data, error} = await supabase.rpc('remove_manager', {
      p_user_id: userId,
      p_boss_id: bossId
    })

    if (error) {
      console.error('删除MANAGER失败:', error)
      return {
        success: false,
        message: error.message || '删除失败'
      }
    }

    return data as OperationResult
  } catch (error) {
    console.error('删除MANAGER异常:', error)
    return {
      success: false,
      message: '删除异常'
    }
  }
}

/**
 * 获取所有MANAGER
 * @param bossId BOSS的用户ID
 */
export async function getAllManagers(bossId: string): Promise<UserPermissionInfo[]> {
  try {
    const {data, error} = await supabase.rpc('get_all_managers', {
      p_boss_id: bossId
    })

    if (error) {
      console.error('获取MANAGER列表失败:', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取MANAGER列表异常:', error)
    return []
  }
}

/**
 * 获取MANAGER权限信息
 * @param userId 用户ID
 */
export async function getManagerPermission(userId: string): Promise<UserPermissionDetail | null> {
  try {
    const {data, error} = await supabase.rpc('get_manager_permission', {
      p_user_id: userId
    })

    if (error) {
      console.error('获取MANAGER权限信息失败:', error)
      return null
    }

    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error('获取MANAGER权限信息异常:', error)
    return null
  }
}

/**
 * 检查用户是否为BOSS
 * @param userId 用户ID
 */
export async function isBoss(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('is_boss', {
      p_user_id: userId
    })

    if (error) {
      console.error('检查BOSS失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('检查BOSS异常:', error)
    return false
  }
}

/**
 * 检查用户是否为PEER_ADMIN（有完整控制权）
 * @param userId 用户ID
 */
export async function isPeerAdminWithFullControl(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('peer_admin_has_full_control', {
      p_user_id: userId
    })

    if (error) {
      console.error('检查PEER_ADMIN完整控制权失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('检查PEER_ADMIN完整控制权异常:', error)
    return false
  }
}

/**
 * 检查用户是否为PEER_ADMIN（仅查看权）
 * @param userId 用户ID
 */
export async function isPeerAdminViewOnly(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('peer_admin_is_view_only', {
      p_user_id: userId
    })

    if (error) {
      console.error('检查PEER_ADMIN仅查看权失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('检查PEER_ADMIN仅查看权异常:', error)
    return false
  }
}

/**
 * 检查用户是否为MANAGER（有完整控制权）
 * @param userId 用户ID
 */
export async function isManagerWithFullControl(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('manager_has_full_control', {
      p_user_id: userId
    })

    if (error) {
      console.error('检查MANAGER完整控制权失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('检查MANAGER完整控制权异常:', error)
    return false
  }
}

/**
 * 检查用户是否为MANAGER（仅查看权）
 * @param userId 用户ID
 */
export async function isManagerViewOnly(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('manager_is_view_only', {
      p_user_id: userId
    })

    if (error) {
      console.error('检查MANAGER仅查看权失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('检查MANAGER仅查看权异常:', error)
    return false
  }
}

// ============================================
// 调度（SCHEDULER）权限管理
// ============================================

/**
 * 创建SCHEDULER
 * @param userId 用户ID
 * @param permissionLevel 权限级别（full_control或view_only）
 * @param bossId BOSS的用户ID
 * @param notes 备注
 */
export async function createScheduler(
  userId: string,
  permissionLevel: PermissionLevel,
  bossId: string,
  notes?: string
): Promise<OperationResult> {
  try {
    const strategyName = permissionLevel === 'full_control' ? 'scheduler_full_control' : 'scheduler_view_only'

    const {error} = await supabase.rpc('assign_permission_strategy', {
      p_user_id: userId,
      p_strategy_name: strategyName,
      p_granted_by: bossId,
      p_notes: notes || null
    })

    if (error) {
      console.error('创建SCHEDULER失败:', error)
      return {
        success: false,
        message: error.message || '创建SCHEDULER失败'
      }
    }

    return {
      success: true,
      message: '创建SCHEDULER成功',
      user_id: userId,
      permission_level: permissionLevel
    }
  } catch (error) {
    console.error('创建SCHEDULER异常:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '创建SCHEDULER异常'
    }
  }
}

/**
 * 获取SCHEDULER权限信息
 * @param userId 用户ID
 */
export async function getSchedulerPermission(userId: string): Promise<UserPermissionDetail | null> {
  try {
    const {data, error} = await supabase.rpc('get_user_permission_detail', {
      p_user_id: userId
    })

    if (error) {
      console.error('获取SCHEDULER权限信息失败:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    const permissionData = data[0]

    // 只返回SCHEDULER相关的权限
    if (
      permissionData.strategy_name !== 'scheduler_full_control' &&
      permissionData.strategy_name !== 'scheduler_view_only'
    ) {
      return null
    }

    return {
      user_id: permissionData.user_id,
      user_name: permissionData.user_name,
      user_phone: permissionData.user_phone,
      permission_level: permissionData.strategy_name === 'scheduler_full_control' ? 'full_control' : 'view_only',
      strategy_name: permissionData.strategy_name,
      granted_at: permissionData.granted_at,
      granted_by_id: permissionData.granted_by_id,
      granted_by_name: permissionData.granted_by_name,
      notes: permissionData.notes
    }
  } catch (error) {
    console.error('获取SCHEDULER权限信息异常:', error)
    return null
  }
}

/**
 * 更新SCHEDULER权限
 * @param userId 用户ID
 * @param permissionLevel 权限级别（full_control或view_only）
 * @param bossId BOSS的用户ID
 * @param notes 备注
 */
export async function updateSchedulerPermission(
  userId: string,
  permissionLevel: PermissionLevel,
  bossId: string,
  notes?: string
): Promise<OperationResult> {
  try {
    const strategyName = permissionLevel === 'full_control' ? 'scheduler_full_control' : 'scheduler_view_only'

    const {error} = await supabase.rpc('update_permission_strategy', {
      p_user_id: userId,
      p_strategy_name: strategyName,
      p_granted_by: bossId,
      p_notes: notes || null
    })

    if (error) {
      console.error('更新SCHEDULER权限失败:', error)
      return {
        success: false,
        message: error.message || '更新SCHEDULER权限失败'
      }
    }

    return {
      success: true,
      message: '更新SCHEDULER权限成功',
      user_id: userId,
      permission_level: permissionLevel
    }
  } catch (error) {
    console.error('更新SCHEDULER权限异常:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新SCHEDULER权限异常'
    }
  }
}

/**
 * 移除SCHEDULER权限
 * @param userId 用户ID
 * @param bossId BOSS的用户ID
 */
export async function removeScheduler(userId: string, bossId: string): Promise<OperationResult> {
  try {
    const {error} = await supabase.rpc('remove_permission_strategy', {
      p_user_id: userId,
      p_removed_by: bossId
    })

    if (error) {
      console.error('移除SCHEDULER权限失败:', error)
      return {
        success: false,
        message: error.message || '移除SCHEDULER权限失败'
      }
    }

    return {
      success: true,
      message: '移除SCHEDULER权限成功',
      user_id: userId
    }
  } catch (error) {
    console.error('移除SCHEDULER权限异常:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '移除SCHEDULER权限异常'
    }
  }
}

/**
 * 检查用户是否为SCHEDULER（完整控制权）
 * @param userId 用户ID
 */
export async function isSchedulerFullControl(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('scheduler_has_full_control', {
      uid: userId
    })

    if (error) {
      console.error('检查SCHEDULER完整控制权失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('检查SCHEDULER完整控制权异常:', error)
    return false
  }
}

/**
 * 检查用户是否为SCHEDULER（仅查看权）
 * @param userId 用户ID
 */
export async function isSchedulerViewOnly(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('scheduler_is_view_only', {
      uid: userId
    })

    if (error) {
      console.error('检查SCHEDULER仅查看权失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('检查SCHEDULER仅查看权异常:', error)
    return false
  }
}
