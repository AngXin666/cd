/**
 * 多租户认证上下文
 *
 * 功能：
 * 1. 用户登录后自动加载租户配置
 * 2. 创建租户专属的 Supabase 客户端
 * 3. 提供租户切换功能
 */

import type {SupabaseClient, User} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import type React from 'react'
import {createContext, useCallback, useContext, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import {
  clearClientCache,
  createTenantSupabaseClient,
  getTenantConfig,
  switchTenant as switchTenantManager,
  type TenantConfig
} from '@/client/tenantSupabaseManager'

interface MultiTenantAuthContextValue {
  // 用户信息
  user: User | null
  isLoading: boolean

  // 租户信息
  tenantConfig: TenantConfig | null
  tenantClient: SupabaseClient | null

  // 方法
  refreshTenantConfig: () => Promise<void>
  switchTenant: (userId: string) => Promise<void>
  logout: () => Promise<void>
}

const MultiTenantAuthContext = createContext<MultiTenantAuthContextValue | undefined>(undefined)

export const MultiTenantAuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null)
  const [tenantClient, setTenantClient] = useState<SupabaseClient | null>(null)

  /**
   * 加载租户配置
   */
  const loadTenantConfig = useCallback(async (userId: string) => {
    try {
      console.log('加载租户配置...', {userId})

      // 获取租户配置
      const config = await getTenantConfig(userId)
      if (!config) {
        console.error('未找到租户配置')
        Taro.showToast({
          title: '未找到租户配置',
          icon: 'none'
        })
        return
      }

      console.log('租户配置加载成功', {
        tenantName: config.tenant_name,
        schemaName: config.schema_name
      })

      // 创建租户客户端
      const client = createTenantSupabaseClient(config)

      // 更新状态
      setTenantConfig(config)
      setTenantClient(client)

      // 显示欢迎消息
      Taro.showToast({
        title: `欢迎，${config.tenant_name}`,
        icon: 'success'
      })
    } catch (error) {
      console.error('加载租户配置失败:', error)
      Taro.showToast({
        title: '加载租户配置失败',
        icon: 'none'
      })
    }
  }, [])

  /**
   * 刷新租户配置
   */
  const refreshTenantConfig = useCallback(async () => {
    if (!user) {
      return
    }

    await loadTenantConfig(user.id)
  }, [user, loadTenantConfig])

  /**
   * 切换租户
   */
  const switchTenant = useCallback(
    async (userId: string) => {
      try {
        setIsLoading(true)

        // 切换租户
        await switchTenantManager(userId)

        // 重新加载租户配置
        await loadTenantConfig(userId)

        Taro.showToast({
          title: '切换租户成功',
          icon: 'success'
        })
      } catch (error) {
        console.error('切换租户失败:', error)
        Taro.showToast({
          title: '切换租户失败',
          icon: 'none'
        })
      } finally {
        setIsLoading(false)
      }
    },
    [loadTenantConfig]
  )

  /**
   * 登出
   */
  const logout = useCallback(async () => {
    try {
      // 登出
      await supabase.auth.signOut()

      // 清除租户配置
      setTenantConfig(null)
      setTenantClient(null)
      clearClientCache()

      Taro.showToast({
        title: '已退出登录',
        icon: 'success'
      })
    } catch (error) {
      console.error('登出失败:', error)
      Taro.showToast({
        title: '登出失败',
        icon: 'none'
      })
    }
  }, [])

  /**
   * 初始化认证状态
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 获取当前用户
        const {
          data: {user: currentUser}
        } = await supabase.auth.getUser()

        if (currentUser) {
          setUser(currentUser)
          await loadTenantConfig(currentUser.id)
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [loadTenantConfig])

  /**
   * 监听认证状态变化
   */
  useEffect(() => {
    const {data: authListener} = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('认证状态变化:', event)

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await loadTenantConfig(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setTenantConfig(null)
        setTenantClient(null)
        clearClientCache()
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [loadTenantConfig])

  const value: MultiTenantAuthContextValue = {
    user,
    isLoading,
    tenantConfig,
    tenantClient,
    refreshTenantConfig,
    switchTenant,
    logout
  }

  return <MultiTenantAuthContext.Provider value={value}>{children}</MultiTenantAuthContext.Provider>
}

/**
 * 使用多租户认证上下文
 */
export function useMultiTenantAuth(): MultiTenantAuthContextValue {
  const context = useContext(MultiTenantAuthContext)
  if (!context) {
    throw new Error('useMultiTenantAuth must be used within MultiTenantAuthProvider')
  }
  return context
}
