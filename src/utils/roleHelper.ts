import type {UserRole} from '@/db/types'

/**
 * 检查用户是否为老板
 * @param role 用户角色
 * @returns 是否为老板
 */
export function isSuperAdmin(role: UserRole | undefined | null): boolean {
  return role === 'BOSS'
}

/**
 * 检查用户是否为老板
 * @param role 用户角色
 * @returns 是否为老板
 */
export function isBoss(role: UserRole | undefined | null): boolean {
  return role === 'BOSS'
}

/**
 * 检查用户是否为管理员（老板）
 * @param role 用户角色
 * @returns 是否为管理员
 */
export function isTenantAdmin(role: UserRole | undefined | null): boolean {
  return role === 'BOSS'
}

/**
 * 检查用户是否为管理员（包括老板和车队长）
 * @param role 用户角色
 * @returns 是否为管理员
 */
export function isManager(role: UserRole | undefined | null): boolean {
  return role === 'BOSS' || role === 'MANAGER'
}

/**
 * 检查用户是否可以管理其他用户
 * @param managerRole 管理员角色
 * @param targetRole 目标用户角色
 * @returns 是否可以管理
 * 
 * 权限规则：
 * - BOSS: 可以管理所有角色
 * - PEER_ADMIN: 根据被授予的权限等级管理（需要完整控制权）
 * - MANAGER: 只能管理被分配仓库内的司机（需要完整控制权）
 * - DRIVER: 无管理权限
 */
export function canManageUser(managerRole: UserRole | undefined | null, targetRole: UserRole): boolean {
  if (!managerRole) return false

  // BOSS 可以管理所有角色
  if (managerRole === 'BOSS') return true

  // PEER_ADMIN 可以管理所有角色（如果有完整控制权）
  if (managerRole === 'PEER_ADMIN') {
    return true  // 由RLS策略控制实际权限
  }

  // MANAGER 只能管理被分配仓库内的 DRIVER（需要完整控制权）
  if (managerRole === 'MANAGER') {
    return targetRole === 'DRIVER'  // 由RLS策略控制实际仓库范围和权限等级
  }

  // 其他角色不能管理
  return false
}

/**
 * 获取角色的显示名称
 * @param role 用户角色
 * @returns 角色显示名称
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    BOSS: '老板',
    PEER_ADMIN: '调度',
    MANAGER: '车队长',
    DRIVER: '司机'
  }
  return roleNames[role] || role
}

/**
 * 获取可创建的角色列表
 * @param currentRole 当前用户角色
 * @returns 可创建的角色列表
 */
export function getCreatableRoles(currentRole: UserRole | undefined | null): UserRole[] {
  if (!currentRole) return []

  // BOSS 可以创建所有角色（除了 BOSS）
  if (currentRole === 'BOSS') {
    return ['PEER_ADMIN', 'MANAGER', 'DRIVER']
  }

  // MANAGER 可以创建 DRIVER
  if (currentRole === 'MANAGER') {
    return ['DRIVER']
  }

  // 其他角色不能创建用户
  return []
}
