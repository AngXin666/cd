/**
 * 权限守卫组件
 * 用于控制 UI 元素的显示权限
 */

import type React from 'react'
import {usePermission} from '@/contexts/PermissionContext'

interface PermissionGuardProps {
  /**
   * 必需的权限列表
   */
  permissions: string | string[]

  /**
   * 是否需要所有权限（默认 false，即只需任一权限）
   */
  requireAll?: boolean

  /**
   * 没有权限时显示的内容（可选）
   */
  fallback?: React.ReactNode

  /**
   * 子组件
   */
  children: React.ReactNode
}

/**
 * 权限守卫组件
 * 根据用户权限控制子组件的显示
 *
 * @example
 * // 单个权限
 * <PermissionGuard permissions="driver:manage">
 *   <Button>管理司机</Button>
 * </PermissionGuard>
 *
 * @example
 * // 多个权限（任一）
 * <PermissionGuard permissions={['driver:manage', 'driver:verify']}>
 *   <Button>操作</Button>
 * </PermissionGuard>
 *
 * @example
 * // 多个权限（全部）
 * <PermissionGuard permissions={['driver:manage', 'driver:verify']} requireAll>
 *   <Button>高级操作</Button>
 * </PermissionGuard>
 *
 * @example
 * // 带降级内容
 * <PermissionGuard permissions="driver:manage" fallback={<Text>无权限</Text>}>
 *   <Button>管理司机</Button>
 * </PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permissions,
  requireAll = false,
  fallback = null,
  children
}) => {
  const {hasPermission, hasAnyPermission, hasAllPermissions, isLoaded} = usePermission()

  // 权限未加载时，不显示任何内容
  if (!isLoaded) {
    return null
  }

  // 转换为数组
  const permissionList = Array.isArray(permissions) ? permissions : [permissions]

  // 检查权限
  let hasAccess = false
  if (permissionList.length === 1) {
    hasAccess = hasPermission(permissionList[0])
  } else if (requireAll) {
    hasAccess = hasAllPermissions(permissionList)
  } else {
    hasAccess = hasAnyPermission(permissionList)
  }

  // 根据权限决定显示内容
  return hasAccess ? <>{children}</> : <>{fallback}</>
}
