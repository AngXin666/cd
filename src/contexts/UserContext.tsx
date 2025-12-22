/**
 * 用户上下文
 *
 * 提供全局的用户信息和认证状态管理。
 * 缓存由 UsersRepository 统一管理，UserContext 不再维护独立缓存。
 *
 * @module contexts/UserContext
 */

import type React from 'react'
import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import type {UserRole} from '@/db/types'
// 导入 UsersRepository 用于缓存管理
import {usersRepository} from '@/db/repositories/UsersRepository'

/**
 * 用户权限接口
 */
export interface UserPermissions {
  // 司机管理权限
  /** 是否可以添加司机 */
  can_add_driver: boolean
  /** 是否可以编辑司机 */
  can_edit_driver: boolean
  /** 是否可以删除司机 */
  can_delete_driver: boolean
  /** 是否可以禁用司机 */
  can_disable_driver: boolean

  // 审核权限
  /** 是否可以审批请假 */
  can_approve_leave: boolean
  /** 是否可以审批离职 */
  can_approve_resignation: boolean
  /** 是否可以审批车辆 */
  can_approve_vehicle: boolean
  /** 是否可以审批实名认证 */
  can_approve_realname: boolean

  // 查看权限
  /** 是否可以查看所有司机 */
  can_view_all_drivers: boolean
  /** 是否可以查看所有数据 */
  can_view_all_data: boolean
}

/**
 * 用户上下文数据接口
 */
export interface UserContextData {
  // 用户基本信息
  /** 用户 ID */
  userId: string | null
  /** 用户姓名 */
  name: string | null
  /** 用户邮箱 */
  email: string | null
  /** 用户手机号 */
  phone: string | null
  /** 用户角色 */
  role: UserRole | null
  /** 用户状态 */
  status: string | null

  // 租户信息
  /** 租户 ID */
  tenantId: string | null
  /** 主账号 ID */
  mainAccountId: string | null

  // 权限信息
  /** 用户权限 */
  permissions: UserPermissions | null

  // 加载状态
  /** 是否正在加载 */
  loading: boolean
  /** 错误信息 */
  error: string | null

  // 方法
  /** 刷新用户数据 */
  refreshUserData: () => Promise<void>
  /** 清除用户数据 */
  clearUserData: () => void
}

/**
 * 用户上下文
 */
const UserContext = createContext<UserContextData | undefined>(undefined)

/**
 * 用户上下文提供者
 *
 * 提供全局的用户信息和认证状态管理。
 * 缓存由 UsersRepository 统一管理。
 *
 * @param children - 子组件
 */
export const UserContextProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [mainAccountId, setMainAccountId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 使用 ref 防止重复加载
  const loadingRef = useRef(false)

  /**
   * 清除用户数据
   * 同时清除 UsersRepository 的缓存
   */
  const clearUserData = useCallback(() => {
    setUserId(null)
    setName(null)
    setEmail(null)
    setPhone(null)
    setRole(null)
    setStatus(null)
    setTenantId(null)
    setMainAccountId(null)
    setPermissions(null)
    setLoading(false)
    setError(null)
    // 清除 UsersRepository 缓存
    usersRepository.invalidateCache()
  }, [])

  /**
   * 加载用户数据
   * 数据通过 UsersRepository 获取，缓存由 Repository 层统一管理
   */
  const loadUserData = useCallback(async () => {
    // 防止重复加载
    if (loadingRef.current) {
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      // 1. 获取当前认证用户
      const {
        data: {user},
        error: authError
      } = await supabase.auth.getUser()

      // 如果是会话缺失错误，说明用户未登录，这是正常的
      if (authError) {
        if (authError.message.includes('Auth session missing')) {
          clearUserData()
          return
        }
        console.error('[UserContext] 获取认证用户失败:', authError)
        throw new Error('获取认证用户失败')
      }

      if (!user) {
        clearUserData()
        return
      }

      // 2. 通过 UsersRepository 获取用户信息（缓存由 Repository 管理）
      const userInfo = await usersRepository.getById(user.id)

      if (!userInfo) {
        console.error('[UserContext] 用户信息不存在')
        throw new Error('用户信息不存在')
      }

      // 3. 更新状态
      setUserId(user.id)
      setName(userInfo.name || null)
      setEmail(userInfo.email || null)
      setPhone(userInfo.phone || null)
      setRole(userInfo.role)
      setStatus('active') // 单用户系统固定为 active
      // 单用户系统不需要租户ID和主账号ID
      setTenantId(null)
      setMainAccountId(null)
      setPermissions(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      console.error('[UserContext] 加载用户数据失败:', errorMessage)
      setError(errorMessage)
      clearUserData()
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [clearUserData])

  /**
   * 刷新用户数据
   * 清除 Repository 缓存后重新加载
   */
  const refreshUserData = useCallback(async () => {
    // 清除 UsersRepository 缓存，确保获取最新数据
    usersRepository.invalidateCache()
    await loadUserData()
  }, [loadUserData])

  // 监听认证状态变化
  useEffect(() => {
    loadUserData()

    const {
      data: {subscription}
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUserData()
      } else {
        clearUserData()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadUserData, clearUserData])

  const contextValue: UserContextData = {
    userId,
    name,
    email,
    phone,
    role,
    status,
    tenantId,
    mainAccountId,
    permissions,
    loading,
    error,
    refreshUserData,
    clearUserData
  }

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
}

/**
 * 使用用户上下文的 Hook
 *
 * @returns 用户上下文数据
 * @throws 如果在 UserContextProvider 外部使用则抛出错误
 *
 * @example
 * ```typescript
 * const { userId, name, role, loading, error } = useUserContext()
 * if (loading) return <Loading />
 * if (error) return <Error message={error} />
 * return <div>欢迎, {name}</div>
 * ```
 */
export const useUserContext = (): UserContextData => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUserContext 必须在 UserContextProvider 内部使用')
  }
  return context
}
