/**
 * 角色权限守卫工具
 *
 * 提供页面级别的角色验证功能，确保用户只能访问其角色允许的页面。
 * 配合 useAuth 的 guard 选项使用，提供双重保护。
 *
 * 安全特性：
 * 1. 页面级别角色验证
 * 2. 防止 URL 直接访问绕过
 * 3. 统一的权限检查逻辑
 *
 * @module utils/roleGuard
 */

import Taro from '@tarojs/taro'

/**
 * 用户角色类型
 */
export type UserRole = 'DRIVER' | 'MANAGER' | 'BOSS' | 'PEER_ADMIN' | 'SCHEDULER'

/**
 * 页面权限配置
 * 定义每个页面路径允许访问的角色列表
 */
export const PAGE_PERMISSIONS: Record<string, UserRole[]> = {
  // 司机端页面 - 仅司机可访问
  '/pages/driver/index': ['DRIVER'],
  '/pages/driver/clock-in/index': ['DRIVER'],
  '/pages/driver/attendance/index': ['DRIVER'],
  '/pages/driver/piece-work/index': ['DRIVER'],
  '/pages/driver/leave/index': ['DRIVER'],
  '/pages/driver/vehicle-list/index': ['DRIVER'],

  // 车队长端页面 - 车队长和更高权限可访问
  '/pages/manager/index': ['MANAGER', 'BOSS', 'PEER_ADMIN'],
  '/pages/manager/data-summary/index': ['MANAGER', 'BOSS', 'PEER_ADMIN'],
  '/pages/manager/leave-approval/index': ['MANAGER', 'BOSS', 'PEER_ADMIN'],
  '/pages/manager/driver-management/index': ['MANAGER', 'BOSS', 'PEER_ADMIN'],
  '/pages/manager/piece-work-report/index': ['MANAGER', 'BOSS', 'PEER_ADMIN'],

  // 超级管理员页面 - 仅 BOSS 和 PEER_ADMIN 可访问
  '/pages/super-admin/index': ['BOSS', 'PEER_ADMIN'],
  '/pages/super-admin/user-management/index': ['BOSS', 'PEER_ADMIN'],
  '/pages/super-admin/warehouse-management/index': ['BOSS', 'PEER_ADMIN'],
  '/pages/super-admin/vehicle-management/index': ['BOSS', 'PEER_ADMIN'],
  '/pages/super-admin/category-management/index': ['BOSS', 'PEER_ADMIN'],
  '/pages/super-admin/permission-config/index': ['BOSS'], // 仅 BOSS 可配置权限
  '/pages/super-admin/staff-management/index': ['BOSS', 'PEER_ADMIN'],

  // 通用页面 - 所有已登录用户可访问
  '/pages/profile/index': ['DRIVER', 'MANAGER', 'BOSS', 'PEER_ADMIN', 'SCHEDULER'],
  '/pages/common/notifications/index': ['DRIVER', 'MANAGER', 'BOSS', 'PEER_ADMIN', 'SCHEDULER']
}

/**
 * 检查用户是否有权限访问指定页面
 *
 * @param pagePath - 页面路径
 * @param userRole - 用户角色
 * @returns 是否有权限访问
 *
 * @example
 * ```typescript
 * const canAccess = checkPagePermission('/pages/super-admin/index', 'DRIVER')
 * // 返回 false，司机无法访问超管页面
 * ```
 */
export function checkPagePermission(pagePath: string, userRole: UserRole | null | undefined): boolean {
  // 未登录用户无权限
  if (!userRole) {
    return false
  }

  // 获取页面权限配置
  const allowedRoles = PAGE_PERMISSIONS[pagePath]

  // 如果页面未配置权限，默认允许访问（向后兼容）
  if (!allowedRoles) {
    console.warn(`[RoleGuard] 页面 ${pagePath} 未配置权限，默认允许访问`)
    return true
  }

  // 检查用户角色是否在允许列表中
  return allowedRoles.includes(userRole)
}

/**
 * 角色守卫 Hook 返回值
 */
export interface UseRoleGuardResult {
  /** 是否有权限访问 */
  hasPermission: boolean
  /** 是否正在检查权限 */
  checking: boolean
}

/**
 * 验证当前页面权限并在无权限时跳转
 *
 * @param userRole - 用户角色
 * @param redirectOnFail - 无权限时是否自动跳转，默认 true
 * @returns 是否有权限访问
 *
 * @example
 * ```typescript
 * // 在页面组件中使用
 * const { user } = useAuth({ guard: true })
 * const { role } = useUserContext()
 *
 * useEffect(() => {
 *   if (role) {
 *     validatePageAccess(role)
 *   }
 * }, [role])
 * ```
 */
export function validatePageAccess(userRole: UserRole | null | undefined, redirectOnFail: boolean = true): boolean {
  // 获取当前页面路径
  const pages = Taro.getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const pagePath = currentPage ? `/${currentPage.route}` : ''

  // 检查权限
  const hasPermission = checkPagePermission(pagePath, userRole)

  // 无权限时处理
  if (!hasPermission && redirectOnFail) {
    console.warn(`[RoleGuard] 用户角色 ${userRole} 无权访问页面 ${pagePath}，即将跳转`)

    // 显示提示
    Taro.showToast({
      title: '无权限访问此页面',
      icon: 'none',
      duration: 2000
    })

    // 延迟跳转，让用户看到提示
    setTimeout(() => {
      // 根据用户角色跳转到对应首页
      const redirectPath = getHomePageByRole(userRole)
      Taro.reLaunch({url: redirectPath})
    }, 1500)
  }

  return hasPermission
}

/**
 * 根据用户角色获取首页路径
 *
 * @param userRole - 用户角色
 * @returns 首页路径
 */
export function getHomePageByRole(userRole: UserRole | null | undefined): string {
  switch (userRole) {
    case 'DRIVER':
      return '/pages/driver/index'
    case 'MANAGER':
      return '/pages/manager/index'
    case 'BOSS':
    case 'PEER_ADMIN':
      return '/pages/super-admin/index'
    case 'SCHEDULER':
      return '/pages/manager/index'
    default:
      return '/pages/login/index'
  }
}

/**
 * 检查用户是否为管理员角色（BOSS 或 PEER_ADMIN）
 *
 * @param userRole - 用户角色
 * @returns 是否为管理员
 */
export function isAdminRole(userRole: UserRole | null | undefined): boolean {
  return userRole === 'BOSS' || userRole === 'PEER_ADMIN'
}

/**
 * 检查用户是否为最高权限（仅 BOSS）
 *
 * @param userRole - 用户角色
 * @returns 是否为 BOSS
 */
export function isBossRole(userRole: UserRole | null | undefined): boolean {
  return userRole === 'BOSS'
}

/**
 * 检查用户是否有管理权限（MANAGER 及以上）
 *
 * @param userRole - 用户角色
 * @returns 是否有管理权限
 */
export function hasManagementPermission(userRole: UserRole | null | undefined): boolean {
  return userRole === 'MANAGER' || userRole === 'BOSS' || userRole === 'PEER_ADMIN'
}
