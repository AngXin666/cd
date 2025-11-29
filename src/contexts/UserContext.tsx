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
const _DEFAULT_PERMISSIONS: UserPermissions = {
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

      // 如果是会话缺失错误，说明用户未登录，这是正常的
      if (authError) {
        if (authError.message.includes('Auth session missing')) {
          console.log('[UserContext] 用户未登录（会话缺失）')
          clearUserData()
          return
        }
        console.error('[UserContext] 获取认证用户失败:', authError)
        throw new Error('获取认证用户失败')
      }

      if (!user) {
        console.log('[UserContext] 用户未登录')
        clearUserData()
        return
      }

      console.log('[UserContext] 当前用户ID:', user.id)

      // 2. 查询用户信息
      const {data: userInfo, error: userError} = await supabase
        .from('users')
        .select('name, email, phone, status')
        .eq('id', user.id)
        .maybeSingle()

      if (userError) {
        console.error('[UserContext] 查询用户信息失败:', userError)
        throw new Error('查询用户信息失败')
      }

      if (!userInfo) {
        console.error('[UserContext] 用户信息不存在')
        throw new Error('用户信息不存在')
      }

      // 3. 查询用户角色
      const {data: roleData, error: roleError} = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (roleError) {
        console.error('[UserContext] 查询用户角色失败:', roleError)
        throw new Error('查询用户角色失败')
      }

      if (!roleData) {
        console.error('[UserContext] 用户角色不存在')
        throw new Error('用户角色不存在')
      }

      console.log('[UserContext] 用户信息加载成功:', {
        name: userInfo.name,
        role: roleData.role,
        status: userInfo.status
      })

      // 4. 更新状态
      setUserId(user.id)
      setName(userInfo.name || null)
      setEmail(userInfo.email || null)
      setPhone(userInfo.phone || null)
      setRole(roleData.role)
      setStatus(userInfo.status || null)
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
