/**
 * 租户上下文管理器
 *
 * 提供全局的租户（用户）上下文，用于多租户数据隔离
 *
 * 功能：
 * - 获取当前登录用户ID
 * - 获取当前用户资料和角色
 * - 检查用户权限
 * - 获取用户管理的仓库列表
 */

import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {createContext, useCallback, useContext, useEffect, useState} from 'react'
import {getProfileById, getWarehouseAssignmentsByDriver, getWarehouseAssignmentsByManager} from '@/db/api'
import type {Profile, UserRole} from '@/db/types'

/**
 * 检查用户是否为 BOSS 角色
 */
function isBossRole(role: UserRole | null): boolean {
  return role === 'BOSS'
}

/**
 * 检查用户是否为 DISPATCHER 角色
 */
function isDispatcherRole(role: UserRole | null): boolean {
  return role === 'DISPATCHER' || role === 'BOSS'
}

/**
 * 检查用户是否为 DRIVER 角色
 */
function isDriverRole(role: UserRole | null): boolean {
  return role === 'DRIVER'
}

/**
 * 租户上下文值接口
 */
interface TenantContextValue {
  // 当前用户ID
  userId: string | null
  // 当前用户资料
  profile: Profile | null
  // 当前用户角色
  role: UserRole | null
  // 是否正在加载
  loading: boolean
  // 是否为超级管理员
  isSuperAdmin: boolean
  // 是否为管理员
  isManager: boolean
  // 是否为司机
  isDriver: boolean
  // 获取用户管理的仓库ID列表
  getManagedWarehouseIds: () => Promise<string[]>
  // 获取用户分配的仓库ID列表
  getAssignedWarehouseIds: () => Promise<string[]>
  // 检查是否有权限访问指定用户的数据
  canAccessUser: (targetUserId: string) => boolean
  // 检查是否有权限访问指定仓库的数据
  canAccessWarehouse: (warehouseId: string) => Promise<boolean>
  // 刷新用户资料
  refreshProfile: () => Promise<void>
}

/**
 * 创建租户上下文
 */
const TenantContext = createContext<TenantContextValue | undefined>(undefined)

/**
 * 租户上下文提供者组件
 */
export const TenantProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {user} = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [managedWarehouseIds, setManagedWarehouseIds] = useState<string[]>([])
  const [assignedWarehouseIds, setAssignedWarehouseIds] = useState<string[]>([])

  /**
   * 加载用户资料
   */
  const loadProfile = useCallback(async () => {
    // 如果用户未登录，直接返回，不加载资料
    if (!user?.id) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const userProfile = await getProfileById(user.id)
      setProfile(userProfile)

      // 根据角色加载仓库信息
      if (userProfile) {
        if (isDispatcherRole(userProfile.role)) {
          // 管理员：加载管理的仓库
          const assignments = await getWarehouseAssignmentsByManager(user.id)
          setManagedWarehouseIds(assignments.map((a) => a.warehouse_id))
        } else if (isDriverRole(userProfile.role)) {
          // 司机：加载分配的仓库
          const assignments = await getWarehouseAssignmentsByDriver(user.id)
          setAssignedWarehouseIds(assignments.map((a) => a.warehouse_id))
        }
      }
    } catch (error) {
      // 静默处理错误，不影响登录流程
      console.error('加载用户资料失败:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  /**
   * 刷新用户资料
   */
  const refreshProfile = useCallback(async () => {
    await loadProfile()
  }, [loadProfile])

  /**
   * 用户变化时重新加载资料
   */
  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  /**
   * 获取用户管理的仓库ID列表
   */
  const getManagedWarehouseIds = useCallback(async (): Promise<string[]> => {
    if (!user?.id || !profile) {
      return []
    }

    // 超级管理员可以访问所有仓库
    if (isBossRole(profile.role)) {
      // 这里可以返回所有仓库ID，但为了性能考虑，返回空数组表示"所有"
      return []
    }

    // 管理员返回管理的仓库
    if (isDispatcherRole(profile.role)) {
      return managedWarehouseIds
    }

    // 司机没有管理的仓库
    return []
  }, [user?.id, profile, managedWarehouseIds])

  /**
   * 获取用户分配的仓库ID列表
   */
  const getAssignedWarehouseIds = useCallback(async (): Promise<string[]> => {
    if (!user?.id || !profile) {
      return []
    }

    // 超级管理员可以访问所有仓库
    if (isBossRole(profile.role)) {
      return []
    }

    // 管理员返回管理的仓库
    if (isDispatcherRole(profile.role)) {
      return managedWarehouseIds
    }

    // 司机返回分配的仓库
    if (isDriverRole(profile.role)) {
      return assignedWarehouseIds
    }

    return []
  }, [user?.id, profile, managedWarehouseIds, assignedWarehouseIds])

  /**
   * 检查是否有权限访问指定用户的数据
   */
  const canAccessUser = useCallback(
    (targetUserId: string): boolean => {
      if (!user?.id || !profile) {
        return false
      }

      // 可以访问自己的数据
      if (user.id === targetUserId) {
        return true
      }

      // 超级管理员可以访问所有用户的数据
      if (isBossRole(profile.role)) {
        return true
      }

      // 管理员可以访问管理仓库下的司机数据
      // 这里需要异步查询，所以返回 false，实际权限由 RLS 策略控制
      if (isDispatcherRole(profile.role)) {
        // 在实际使用中，应该通过 canAccessWarehouse 来检查
        return false
      }

      // 司机不能访问其他用户的数据
      return false
    },
    [user?.id, profile]
  )

  /**
   * 检查是否有权限访问指定仓库的数据
   */
  const canAccessWarehouse = useCallback(
    async (warehouseId: string): Promise<boolean> => {
      if (!user?.id || !profile) {
        return false
      }

      // 超级管理员可以访问所有仓库
      if (isBossRole(profile.role)) {
        return true
      }

      // 管理员检查是否管理该仓库
      if (isDispatcherRole(profile.role)) {
        return managedWarehouseIds.includes(warehouseId)
      }

      // 司机检查是否分配到该仓库
      if (isDriverRole(profile.role)) {
        return assignedWarehouseIds.includes(warehouseId)
      }

      return false
    },
    [user?.id, profile, managedWarehouseIds, assignedWarehouseIds]
  )

  /**
   * 计算派生状态
   */
  const isSuperAdmin = profile?.role === 'super_admin'
  const isManager = profile?.role === 'manager'
  const isDriver = profile?.role === 'driver'

  /**
   * 上下文值
   */
  const value: TenantContextValue = {
    userId: user?.id || null,
    profile,
    role: profile?.role || null,
    loading,
    isSuperAdmin,
    isManager,
    isDriver,
    getManagedWarehouseIds,
    getAssignedWarehouseIds,
    canAccessUser,
    canAccessWarehouse,
    refreshProfile
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

/**
 * 使用租户上下文的 Hook
 *
 * @throws {Error} 如果在 TenantProvider 外部使用
 * @returns {TenantContextValue} 租户上下文值
 *
 * @example
 * ```tsx
 * const MyComponent: React.FC = () => {
 *   const { userId, role, isSuperAdmin, canAccessUser } = useTenant()
 *
 *   if (!canAccessUser(someUserId)) {
 *     return <Text>无权访问</Text>
 *   }
 *
 *   return <View>...</View>
 * }
 * ```
 */
export const useTenant = (): TenantContextValue => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant 必须在 TenantProvider 内部使用')
  }
  return context
}

/**
 * 导出类型
 */
export type {TenantContextValue}
