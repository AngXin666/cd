/**
 * 权限推断工具函数
 * 
 * 基于用户角色和 manager_permissions_enabled 字段推断权限级别
 * 这是一个纯函数，用于在应用层进行权限控制
 * 
 * @module utils/permissionInference
 */

import type {UserRole} from '@/db/types'

/**
 * 权限级别类型
 * - full_control: 完整控制权限
 * - view_only: 仅查看权限
 */
export type PermissionLevel = 'full_control' | 'view_only'

/**
 * 根据用户角色和权限启用状态推断权限级别
 * 
 * 权限推断规则：
 * - BOSS → full_control（完整权限）
 * - MANAGER/PEER_ADMIN → 基于 managerPermissionsEnabled 字段
 *   - true/null/undefined → full_control
 *   - false → view_only
 * - DRIVER → view_only（仅查看权限）
 * - 其他角色 → view_only（默认仅查看权限）
 * 
 * @param role - 用户角色
 * @param managerPermissionsEnabled - 管理员权限是否启用（仅对 MANAGER/PEER_ADMIN 有效）
 * @returns 权限级别：'full_control' 或 'view_only'
 * 
 * **Feature: permission-type-field-fix, Property 1: 角色到权限级别的映射一致性**
 * **Validates: Requirements 2.1**
 */
export function inferPermissionLevel(
  role: UserRole,
  managerPermissionsEnabled?: boolean | null
): PermissionLevel {
  // BOSS 角色始终拥有完整权限
  if (role === 'BOSS') {
    return 'full_control'
  }
  
  // MANAGER 和 PEER_ADMIN 角色根据 manager_permissions_enabled 字段确定
  // 默认为 true（完整权限），除非明确设置为 false
  if (role === 'MANAGER' || role === 'PEER_ADMIN') {
    return managerPermissionsEnabled !== false ? 'full_control' : 'view_only'
  }
  
  // DRIVER 和其他角色默认为仅查看权限
  return 'view_only'
}

/**
 * 检查用户是否拥有完整控制权限
 * 
 * @param role - 用户角色
 * @param managerPermissionsEnabled - 管理员权限是否启用
 * @returns 是否拥有完整控制权限
 */
export function hasFullControlPermission(
  role: UserRole,
  managerPermissionsEnabled?: boolean | null
): boolean {
  return inferPermissionLevel(role, managerPermissionsEnabled) === 'full_control'
}

/**
 * 检查用户是否仅有查看权限
 * 
 * @param role - 用户角色
 * @param managerPermissionsEnabled - 管理员权限是否启用
 * @returns 是否仅有查看权限
 */
export function hasViewOnlyPermission(
  role: UserRole,
  managerPermissionsEnabled?: boolean | null
): boolean {
  return inferPermissionLevel(role, managerPermissionsEnabled) === 'view_only'
}
