/**
 * PEER_ADMIN管理 API
 *
 * 功能包括：
 * - 创建PEER_ADMIN
 * - 更新PEER_ADMIN权限
 * - 删除PEER_ADMIN
 * - 查询PEER_ADMIN列表
 * - 查询PEER_ADMIN权限详情
 */

import {supabase} from '../supabase'

/**
 * 权限级别
 */
export type PermissionLevel = 'full_control' | 'view_only'

/**
 * PEER_ADMIN权限信息
 */
export interface PeerAdminPermission {
  user_id: string
  permission_level: PermissionLevel
  granted_by: string
  granted_by_name: string
  granted_at: string
  updated_at: string
  notes: string | null
}

/**
 * PEER_ADMIN列表项
 */
export interface PeerAdminListItem {
  user_id: string
  user_name: string
  user_phone: string
  user_email: string
  permission_level: PermissionLevel
  granted_by: string
  granted_by_name: string
  granted_at: string
  notes: string | null
}

/**
 * 创建PEER_ADMIN
 * @param userId 用户ID
 * @param permissionLevel 权限级别（full_control或view_only）
 * @param bossId BOSS的用户ID
 * @param notes 备注（可选）
 * @returns 权限记录ID
 */
export async function createPeerAdmin(
  userId: string,
  permissionLevel: PermissionLevel,
  bossId: string,
  notes?: string
): Promise<string | null> {
  try {
    const {data, error} = await supabase.rpc('create_peer_admin', {
      p_user_id: userId,
      p_permission_level: permissionLevel,
      p_boss_id: bossId,
      p_notes: notes || null
    })

    if (error) {
      console.error('[createPeerAdmin] 创建PEER_ADMIN失败:', error)
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    console.error('[createPeerAdmin] 未预期的错误:', error)
    throw error
  }
}

/**
 * 更新PEER_ADMIN权限级别
 * @param userId 用户ID
 * @param permissionLevel 新的权限级别
 * @param bossId BOSS的用户ID
 * @param notes 备注（可选）
 * @returns 是否成功
 */
export async function updatePeerAdminPermission(
  userId: string,
  permissionLevel: PermissionLevel,
  bossId: string,
  notes?: string
): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('update_peer_admin_permission', {
      p_user_id: userId,
      p_permission_level: permissionLevel,
      p_boss_id: bossId,
      p_notes: notes || null
    })

    if (error) {
      console.error('[updatePeerAdminPermission] 更新PEER_ADMIN权限失败:', error)
      throw new Error(error.message)
    }

    return data === true
  } catch (error) {
    console.error('[updatePeerAdminPermission] 未预期的错误:', error)
    throw error
  }
}

/**
 * 删除PEER_ADMIN
 * @param userId 用户ID
 * @param bossId BOSS的用户ID
 * @returns 是否成功
 */
export async function removePeerAdmin(userId: string, bossId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('remove_peer_admin', {
      p_user_id: userId,
      p_boss_id: bossId
    })

    if (error) {
      console.error('[removePeerAdmin] 删除PEER_ADMIN失败:', error)
      throw new Error(error.message)
    }

    return data === true
  } catch (error) {
    console.error('[removePeerAdmin] 未预期的错误:', error)
    throw error
  }
}

/**
 * 获取所有PEER_ADMIN列表
 * @param bossId BOSS的用户ID
 * @returns PEER_ADMIN列表
 */
export async function getAllPeerAdmins(bossId: string): Promise<PeerAdminListItem[]> {
  try {
    const {data, error} = await supabase.rpc('get_all_peer_admins', {
      p_boss_id: bossId
    })

    if (error) {
      console.error('[getAllPeerAdmins] 获取PEER_ADMIN列表失败:', error)
      throw new Error(error.message)
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[getAllPeerAdmins] 未预期的错误:', error)
    throw error
  }
}

/**
 * 获取PEER_ADMIN权限详情
 * @param userId 用户ID
 * @returns PEER_ADMIN权限详情
 */
export async function getPeerAdminPermission(userId: string): Promise<PeerAdminPermission | null> {
  try {
    const {data, error} = await supabase.rpc('get_peer_admin_permission', {
      p_user_id: userId
    })

    if (error) {
      console.error('[getPeerAdminPermission] 获取PEER_ADMIN权限详情失败:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0]
  } catch (error) {
    console.error('[getPeerAdminPermission] 未预期的错误:', error)
    return null
  }
}

/**
 * 检查用户是否为PEER_ADMIN
 * @param userId 用户ID
 * @returns 是否为PEER_ADMIN
 */
export async function isPeerAdmin(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('is_peer_admin', {
      p_user_id: userId
    })

    if (error) {
      console.error('[isPeerAdmin] 检查失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('[isPeerAdmin] 未预期的错误:', error)
    return false
  }
}

/**
 * 检查PEER_ADMIN是否有完整控制权
 * @param userId 用户ID
 * @returns 是否有完整控制权
 */
export async function peerAdminHasFullControl(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('peer_admin_has_full_control', {
      p_user_id: userId
    })

    if (error) {
      console.error('[peerAdminHasFullControl] 检查失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('[peerAdminHasFullControl] 未预期的错误:', error)
    return false
  }
}

/**
 * 检查PEER_ADMIN是否只有查看权
 * @param userId 用户ID
 * @returns 是否只有查看权
 */
export async function peerAdminIsViewOnly(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('peer_admin_is_view_only', {
      p_user_id: userId
    })

    if (error) {
      console.error('[peerAdminIsViewOnly] 检查失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('[peerAdminIsViewOnly] 未预期的错误:', error)
    return false
  }
}

/**
 * 检查用户是否为BOSS或有完整控制权的PEER_ADMIN
 * @param userId 用户ID
 * @returns 是否为BOSS或有完整控制权的PEER_ADMIN
 */
export async function isBossOrFullControlPeerAdmin(userId: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('is_boss_or_full_control_peer_admin', {
      p_user_id: userId
    })

    if (error) {
      console.error('[isBossOrFullControlPeerAdmin] 检查失败:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('[isBossOrFullControlPeerAdmin] 未预期的错误:', error)
    return false
  }
}
