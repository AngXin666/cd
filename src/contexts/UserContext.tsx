import type React from 'react'
import {createContext, useCallback, useContext, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import type {UserRole} from '@/db/types'

/**
 * 用户权限接口
 */
export interface UserPermissions {
  // 司机管理权限
  can_add_driver: boolean
  can_edit_driver: boolean
  can_delete_driver: boolean
  can_disable_driver: boolean

  // 审核权限
  can_approve_leave: boolean
  can_approve_resignation: boolean
  can_approve_vehicle: boolean
  can_approve_realname: boolean

  // 查看权限
  can_view_all_drivers: boolean
  can_view_all_data: boolean
}

/**
 * 用户上下文数据接口
 */
export interface UserContextData {
  // 用户基本信息
  userId: string | null
  name: string | null
  email: string | null
  phone: string | null
  role: UserRole | null
  status: string | null

  // 租户信息
  tenantId: string | null
  mainAccountId: string | null

  // 权限信息
  permissions: UserPermissions | null

  // 加载状态
  loading: boolean
  error: string | null

  // 方法
  refreshUserData: () => Promise<void>
  clearUserData: () => void
}

/**
 * 默认权限（所有权限为 false）
 */
const DEFAULT_PERMISSIONS: UserPermissions = {
  can_add_driver: false,
  can_edit_driver: false,
  can_delete_driver: false,
  can_disable_driver: false,
  can_approve_leave: false,
  can_approve_resignation: false,
  can_approve_vehicle: false,
  can_approve_realname: false,
  can_view_all_drivers: false,
  can_view_all_data: false
}

/**
 * 用户上下文
 */
const UserContext = createContext<UserContextData | undefined>(undefined)

/**
 * 用户上下文提供者
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

  /**
   * 清除用户数据
   */
  const clearUserData = useCallback(() => {
    console.log('[UserContext] 清除用户数据')
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
  }, [])

  /**
   * 加载用户数据
   */
  const loadUserData = useCallback(async () => {
    try {
      console.log('[UserContext] 开始加载用户数据')
      setLoading(true)
      setError(null)

      // 1. 获取当前认证用户
      const {
        data: {user},
        error: authError
      } = await supabase.auth.getUser()

      if (authError) {
        console.error('[UserContext] 获取认证用户失败:', authError)
        throw new Error('获取认证用户失败')
      }

      if (!user) {
        console.log('[UserContext] 用户未登录')
        clearUserData()
        return
      }

      console.log('[UserContext] 当前用户ID:', user.id)

      // 2. 查询用户信息（包括角色和租户信息）
      const {data: profile, error: profileError} = await supabase
        .schema('public')
        .from('profiles')
        .select('name, email, phone, role, status, main_account_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('[UserContext] 查询用户信息失败:', profileError)
        throw new Error('查询用户信息失败')
      }

      if (!profile) {
        console.error('[UserContext] 用户不存在')
        throw new Error('用户不存在')
      }

      console.log('[UserContext] 用户信息:', profile)

      // 3. 判断租户ID
      let calculatedTenantId: string | null = null

      if (profile.main_account_id) {
        // 如果有 main_account_id，说明是子账号
        calculatedTenantId = profile.main_account_id
      } else if (profile.role === 'boss') {
        // 如果是老板，租户ID是用户自己的ID
        calculatedTenantId = user.id
      } else {
        // super_admin 或 peer_admin 没有租户ID
        calculatedTenantId = null
      }

      console.log('[UserContext] 租户ID:', calculatedTenantId)

      // 4. 查询用户权限（如果有租户ID）
      let userPermissions: UserPermissions = {...DEFAULT_PERMISSIONS}

      if (calculatedTenantId) {
        const {data: permissionsData, error: permissionsError} = await supabase
          .schema('public')
          .from('user_permissions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (permissionsError) {
          console.warn('[UserContext] 查询用户权限失败:', permissionsError)
          // 不抛出错误，使用默认权限
        } else if (permissionsData) {
          console.log('[UserContext] 用户权限:', permissionsData)
          userPermissions = {
            can_add_driver: permissionsData.can_add_driver || false,
            can_edit_driver: permissionsData.can_edit_driver || false,
            can_delete_driver: permissionsData.can_delete_driver || false,
            can_disable_driver: permissionsData.can_disable_driver || false,
            can_approve_leave: permissionsData.can_approve_leave || false,
            can_approve_resignation: permissionsData.can_approve_resignation || false,
            can_approve_vehicle: permissionsData.can_approve_vehicle || false,
            can_approve_realname: permissionsData.can_approve_realname || false,
            can_view_all_drivers: permissionsData.can_view_all_drivers || false,
            can_view_all_data: permissionsData.can_view_all_data || false
          }
        } else {
          console.log('[UserContext] 用户没有权限配置，使用默认权限')
        }
      } else {
        console.log('[UserContext] 中央用户，不查询权限')
      }

      // 5. 更新状态
      setUserId(user.id)
      setName(profile.name)
      setEmail(profile.email)
      setPhone(profile.phone)
      setRole(profile.role as UserRole)
      setStatus(profile.status)
      setTenantId(calculatedTenantId)
      setMainAccountId(profile.main_account_id)
      setPermissions(userPermissions)

      console.log('[UserContext] 用户数据加载完成')
    } catch (err) {
      console.error('[UserContext] 加载用户数据失败:', err)
      setError(err instanceof Error ? err.message : '加载用户数据失败')
      clearUserData()
    } finally {
      setLoading(false)
    }
  }, [clearUserData])

  /**
   * 刷新用户数据
   */
  const refreshUserData = useCallback(async () => {
    await loadUserData()
  }, [loadUserData])

  // 监听认证状态变化
  useEffect(() => {
    console.log('[UserContext] 初始化，监听认证状态变化')

    // 初始加载
    loadUserData()

    // 监听认证状态变化
    const {
      data: {subscription}
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[UserContext] 认证状态变化:', _event, session ? '已登录' : '未登录')
      if (session) {
        loadUserData()
      } else {
        clearUserData()
      }
    })

    return () => {
      console.log('[UserContext] 取消监听认证状态变化')
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
 */
export const useUserContext = (): UserContextData => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUserContext 必须在 UserContextProvider 内部使用')
  }
  return context
}
