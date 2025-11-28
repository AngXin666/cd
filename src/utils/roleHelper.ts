import type {UserRole} from '@/db/types'

/**
 * 检查用户是否为中央管理系统的超级管理员
 * @param role 用户角色
 * @returns 是否为超级管理员
 */
export function isSuperAdmin(role: UserRole | undefined | null): boolean {
  return role === 'super_admin'
}

/**
 * 检查用户是否为租户的老板
 * @param role 用户角色
 * @returns 是否为老板
 */
export function isBoss(role: UserRole | undefined | null): boolean {
  return role === 'boss'
}

/**
 * 检查用户是否为租户管理员（老板或平级管理员）
 * @param role 用户角色
 * @returns 是否为租户管理员
 */
export function isTenantAdmin(role: UserRole | undefined | null): boolean {
  return role === 'boss' || role === 'peer_admin'
}

/**
 * 检查用户是否为管理员（包括超级管理员、老板、平级管理员和车队长）
 * @param role 用户角色
 * @returns 是否为管理员
 */
export function isManager(role: UserRole | undefined | null): boolean {
  return role === 'super_admin' || role === 'boss' || role === 'peer_admin' || role === 'manager'
}

/**
 * 检查用户是否可以管理其他用户
 * @param managerRole 管理员角色
 * @param targetRole 目标用户角色
 * @returns 是否可以管理
 */
export function canManageUser(managerRole: UserRole | undefined | null, targetRole: UserRole): boolean {
  if (!managerRole) return false

  // super_admin（中央管理系统）可以管理所有角色
  if (managerRole === 'super_admin') return true

  // boss（租户老板）可以管理租户内的所有角色（peer_admin, manager, driver）
  if (managerRole === 'boss') {
    return targetRole === 'peer_admin' || targetRole === 'manager' || targetRole === 'driver'
  }

  // peer_admin（平级管理员）可以管理 driver 和 manager，但不能管理 boss 和其他 peer_admin
  if (managerRole === 'peer_admin') {
    return targetRole === 'driver' || targetRole === 'manager'
  }

  // manager（车队长）只能查看，不能管理
  return false
}

/**
 * 获取角色的显示名称
 * @param role 用户角色
 * @returns 角色显示名称
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    boss: '老板',
    super_admin: '超级管理员',
    peer_admin: '平级管理员',
    manager: '车队长',
    driver: '司机'
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

  // super_admin（中央管理系统）只能创建租户，不能直接创建用户
  if (currentRole === 'super_admin') {
    return []
  }

  // boss（租户老板）可以创建租户内的所有角色
  if (currentRole === 'boss') {
    return ['peer_admin', 'manager', 'driver']
  }

  // peer_admin（平级管理员）只能创建 driver 和 manager
  if (currentRole === 'peer_admin') {
    return ['manager', 'driver']
  }

  // 其他角色不能创建用户
  return []
}
