/**
 * @file Taro application entry file
 */

import {AuthProvider} from 'miaoda-auth-taro'
import type React from 'react'
import type {PropsWithChildren} from 'react'
import {useEffect} from 'react'
import {supabase} from '@/client/supabase'
import {TenantProvider} from '@/contexts/TenantContext'
import {clearAllRoleCache} from '@/db/tenant-utils'
import {logger, setCurrentUserId, setupGlobalErrorHandler} from '@/utils/logger'
import './app.scss'

// 设置全局错误处理
setupGlobalErrorHandler()

const App: React.FC = ({children}: PropsWithChildren<unknown>) => {
  useEffect(() => {
    logger.info('应用启动')

    // 监听认证状态变化
    const {data: authListener} = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id || null
      setCurrentUserId(userId)

      if (event === 'SIGNED_IN') {
        logger.info('用户登录', {userId})
      } else if (event === 'SIGNED_OUT') {
        logger.info('用户登出')
        // 清除角色缓存
        clearAllRoleCache()
      }
    })

    // 清理监听器
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthProvider client={supabase} loginPath="/pages/login/index">
      <TenantProvider>{children}</TenantProvider>
    </AuthProvider>
  )
}

export default App
