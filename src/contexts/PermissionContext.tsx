/**
 * 权限管理上下文
 * 提供全局权限状态管理和验证功能
 */

import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react'
import {checkCurrentUserPermission, type PermissionAction} from '@/services/permission-service'

/**
 * 权限上下文类型定义
 */
interface PermissionContextValue {
  // 权限状态
  permissions: Set<string>
  isLoading: boolean
  isLoaded: boolean

  // 权限验证方法
  hasPermission: (permissionCode: string) => boolean
  hasAnyPermission: (permissionCodes: string[]) => boolean
  hasAllPermissions: (permissionCodes: string[]) => boolean

  // 权限管理方法
  loadPermissions: () => Promise<void>
  refreshPermissions: () => Promise<void>
  clearPermissions: () => void
}

/**
 * 创建权限上下文
 */
const PermissionContext = createContext<PermissionContextValue | undefined>(undefined)

/**
 * 权限提供者组件
 */
export const PermissionProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {user, isAuthenticated} = useAuth()
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  /**
   * 加载用户权限
   * 现在使用应用层权限控制，不需要从数据库加载
   */
  const loadPermissions = useCallback(async () => {
    if (!user?.id || !user?.role) {
      return
    }

    setIsLoading(true)
    try {
      // 使用应用层权限控制，不需要从数据库加载权限列表
      // 基于用户角色和权限配置动态判断权限
      setPermissions(new Set()) // 保持兼容性，实际权限判断使用 PermissionService
      setIsLoaded(true)
    } catch (error) {
      console.error('权限加载失败:', error)
      setPermissions(new Set())
      setIsLoaded(false)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.role])

  /**
   * 刷新权限
   * 重新从数据库加载权限，用于权限变更后的更新
   */
  const refreshPermissions = useCallback(async () => {
    setIsLoaded(false)
    await loadPermissions()
  }, [loadPermissions])

  /**
   * 清除权限
   * 用于用户登出时清理权限缓存
   */
  const clearPermissions = useCallback(() => {
    setPermissions(new Set())
    setIsLoaded(false)
  }, [])

  /**
   * 检查是否有指定权限
   */
  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      // 权限码格式：tableName:action
      const [tableName, action] = permissionCode.split(':')
      if (!tableName || !action) {
        return false
      }

      const result = checkCurrentUserPermission(tableName, action as PermissionAction, user)
      return result.hasPermission
    },
    [user?.id, user?.role, user]
  )

  /**
   * 检查是否有任一权限
   */
  const hasAnyPermission = useCallback(
    (permissionCodes: string[]): boolean => {
      return permissionCodes.some((code) => hasPermission(code))
    },
    [hasPermission]
  )

  /**
   * 检查是否有所有权限
   */
  const hasAllPermissions = useCallback(
    (permissionCodes: string[]): boolean => {
      return permissionCodes.every((code) => hasPermission(code))
    },
    [hasPermission]
  )

  /**
   * 用户登录时自动加载权限
   */
  useEffect(() => {
    if (isAuthenticated && user?.id && user?.role && !isLoaded && !isLoading) {
      loadPermissions()
    }
  }, [isAuthenticated, user?.id, user?.role, isLoaded, isLoading, loadPermissions])

  /**
   * 用户登出时清除权限
   */
  useEffect(() => {
    if (!isAuthenticated && isLoaded) {
      clearPermissions()
    }
  }, [isAuthenticated, isLoaded, clearPermissions])

  /**
   * 构建上下文值
   */
  const contextValue = useMemo(
    () => ({
      permissions,
      isLoading,
      isLoaded,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      loadPermissions,
      refreshPermissions,
      clearPermissions
    }),
    [
      permissions,
      isLoading,
      isLoaded,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      loadPermissions,
      refreshPermissions,
      clearPermissions
    ]
  )

  return <PermissionContext.Provider value={contextValue}>{children}</PermissionContext.Provider>
}

/**
 * 使用权限上下文的 Hook
 */
export const usePermission = (): PermissionContextValue => {
  const context = useContext(PermissionContext)

  if (!context) {
    throw new Error('usePermission 必须在 PermissionProvider 内部使用')
  }

  return context
}

/**
 * 权限守卫 Hook
 * 用于页面级别的权限控制
 *
 * @param requiredPermissions 必需的权限列表
 * @param requireAll 是否需要所有权限（默认 false，即只需任一权限）
 * @returns 是否有权限访问
 */
export const usePermissionGuard = (requiredPermissions: string[], requireAll = false): boolean => {
  const {hasAnyPermission, hasAllPermissions, isLoaded} = usePermission()

  if (!isLoaded) {
    return false
  }

  return requireAll ? hasAllPermissions(requiredPermissions) : hasAnyPermission(requiredPermissions)
}
