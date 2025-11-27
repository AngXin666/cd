/**
 * 多租户认证上下文
 *
 * 功能：
 * 1. 管理用户认证状态
 * 2. 自动加载用户所属租户的配置
 * 3. 创建租户专属的 Supabase 客户端
 * 4. 提供租户切换功能
 */

import type {SupabaseClient, User} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import type React from 'react'
import {createContext, useCallback, useContext, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import {
  createTenantSupabaseClient,
  getTenantConfig,
  switchTenant,
  type TenantConfig
} from '@/client/tenantSupabaseManager'

// 上下文接口
interface MultiTenantAuthContextValue {
  user: User | null
  tenantConfig: TenantConfig | null
  tenantClient: SupabaseClient | null
  isLoading: boolean
  refreshTenantConfig: () => Promise<void>
  switchToTenant: (userId: string) => Promise<void>
  logout: () => Promise<void>
}

// 创建上下文
const MultiTenantAuthContext = createContext<MultiTenantAuthContextValue | undefined>(undefined)

// Provider 组件
export const MultiTenantAuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null)
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null)
  const [tenantClient, setTenantClient] = useState<SupabaseClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 加载租户配置
  const loadTenantConfig = useCallback(async (userId: string) => {
    try {
      const config = await getTenantConfig(userId)
      if (config) {
        setTenantConfig(config)
        const client = createTenantSupabaseClient(config)
        setTenantClient(client)

        // 显示欢迎消息
        Taro.showToast({
          title: `欢迎使用 ${config.tenant_name}`,
          icon: 'none',
          duration: 2000
        })
      } else {
        console.warn('未找到租户配置')
        setTenantConfig(null)
        setTenantClient(null)
      }
    } catch (error) {
      console.error('加载租户配置失败:', error)
      setTenantConfig(null)
      setTenantClient(null)
    }
  }, [])

  // 刷新租户配置
  const refreshTenantConfig = useCallback(async () => {
    if (user) {
      await loadTenantConfig(user.id)
    }
  }, [user, loadTenantConfig])

  // 切换租户
  const switchToTenant = useCallback(
    async (userId: string) => {
      try {
        await switchTenant(userId)
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
      }
    },
    [loadTenantConfig]
  )

  // 登出
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setTenantConfig(null)
      setTenantClient(null)
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

  // 监听认证状态变化
  useEffect(() => {
    // 获取当前用户
    supabase.auth.getUser().then(({data: {user}}) => {
      setUser(user)
      if (user) {
        loadTenantConfig(user.id)
      }
      setIsLoading(false)
    })

    // 监听认证状态变化
    const {
      data: {subscription}
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        loadTenantConfig(currentUser.id)
      } else {
        setTenantConfig(null)
        setTenantClient(null)
      }

      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadTenantConfig])

  const value: MultiTenantAuthContextValue = {
    user,
    tenantConfig,
    tenantClient,
    isLoading,
    refreshTenantConfig,
    switchToTenant,
    logout
  }

  return <MultiTenantAuthContext.Provider value={value}>{children}</MultiTenantAuthContext.Provider>
}

// Hook
export const useMultiTenantAuth = (): MultiTenantAuthContextValue => {
  const context = useContext(MultiTenantAuthContext)
  if (context === undefined) {
    throw new Error('useMultiTenantAuth must be used within a MultiTenantAuthProvider')
  }
  return context
}
