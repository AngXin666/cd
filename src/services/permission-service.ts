/**
 * 应用层权限服务
 * 提供权限验证和数据过滤功能，替代RLS
 */

import {PermissionAction, permissionConfig, type TablePermissionRule} from '@/config/permission-config'
import type {UserRole} from '@/db/types'

// 重新导出PermissionAction以方便其他文件使用
export {PermissionAction}

/**
 * 权限验证结果
 */
export interface PermissionCheckResult {
  /** 是否有权限 */
  hasPermission: boolean
  /** 数据过滤条件 */
  filter?: Record<string, any> | null
  /** 错误信息 */
  error?: string
}

/**
 * 权限服务类
 */
export class PermissionService {
  private userId: string
  private userRole: UserRole

  /**
   * 创建权限服务实例
   * @param userId 用户ID
   * @param userRole 用户角色
   */
  constructor(userId: string, userRole: UserRole) {
    this.userId = userId
    this.userRole = userRole
  }

  /**
   * 检查用户是否有权限执行指定操作
   * @param tableName 表名
   * @param action 操作类型
   * @returns 权限检查结果
   */
  checkPermission(tableName: string, action: PermissionAction): PermissionCheckResult {
    // 检查配置是否存在
    const tablePermissions = permissionConfig[tableName]
    if (!tablePermissions) {
      // 如果没有配置，默认允许（兼容旧表）
      return {hasPermission: true, filter: null}
    }

    // 查找匹配的权限规则
    const matchingRules = tablePermissions.filter(
      (rule: TablePermissionRule) => rule.action === action && rule.roles.includes(this.userRole)
    )

    if (matchingRules.length === 0) {
      return {
        hasPermission: false,
        error: `用户角色 ${this.userRole} 没有对表 ${tableName} 的 ${action} 权限`
      }
    }

    // 获取第一条匹配规则
    const rule = matchingRules[0]

    // 如果允许所有数据
    if (rule.allowAll) {
      return {hasPermission: true, filter: null}
    }

    // 生成过滤条件
    const filter = rule.filter ? rule.filter(this.userId) : null
    return {hasPermission: true, filter}
  }

  /**
   * 应用权限过滤到查询构建器
   * @param query 查询构建器
   * @param tableName 表名
   * @param action 操作类型
   * @returns 增强后的查询构建器
   */
  applyFilter<T extends {eq: (key: string, value: any) => T}>(
    query: T,
    tableName: string,
    action: PermissionAction
  ): T {
    const result = this.checkPermission(tableName, action)
    if (!result.hasPermission) {
      throw new Error(result.error)
    }

    // 应用过滤条件
    if (result.filter) {
      Object.entries(result.filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    return query
  }

  /**
   * 检查是否允许查看所有数据
   * @param tableName 表名
   * @returns 是否允许查看所有数据
   */
  canViewAll(tableName: string): boolean {
    const result = this.checkPermission(tableName, PermissionAction.SELECT)
    if (!result.hasPermission) {
      return false
    }

    // 查找允许所有的规则
    const tablePermissions = permissionConfig[tableName]
    if (tablePermissions) {
      const rule = tablePermissions.find(
        (r: TablePermissionRule) =>
          r.action === PermissionAction.SELECT && r.roles.includes(this.userRole) && r.allowAll
      )
      return !!rule
    }

    return true // 默认允许
  }
}

/**
 * 获取当前用户的权限服务实例
 * @param user 用户对象，包含id和可选的role字段
 * @returns 权限服务实例
 */
export function getCurrentPermissionService(user: {id: string; role?: string}): PermissionService {
  if (!user?.id) {
    throw new Error('用户未登录')
  }
  // 使用默认角色或确保user.role存在
  return new PermissionService(user.id, (user.role || 'user') as UserRole)
}

/**
 * 检查当前用户是否有权限
 * @param tableName 表名
 * @param action 操作类型
 * @param user 用户对象，包含id和可选的role字段
 * @returns 权限检查结果
 */
export function checkCurrentUserPermission(
  tableName: string,
  action: PermissionAction,
  user: {id: string; role?: string} | null
): PermissionCheckResult {
  if (!user?.id) {
    return {
      hasPermission: false,
      error: '用户未登录'
    }
  }

  // 使用默认角色或确保user.role存在
  const service = new PermissionService(user.id, (user.role || 'user') as UserRole)
  return service.checkPermission(tableName, action)
}
