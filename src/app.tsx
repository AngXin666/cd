/**
 * @file Taro application entry file
 */

import {AuthProvider} from 'miaoda-auth-taro'
import type React from 'react'
import type {PropsWithChildren} from 'react'
import {useEffect} from 'react'
import {supabase} from '@/client/supabase'
import {PermissionProvider} from '@/contexts/PermissionContext'
import {UserContextProvider} from '@/contexts/UserContext'
import {silentCheckUpdate} from '@/utils/hotUpdate'
import {setCurrentUserId, setupGlobalErrorHandler} from '@/utils/logger'
import './app.scss'

// 设置全局错误处理
setupGlobalErrorHandler()

const App: React.FC = ({children}: PropsWithChildren<unknown>) => {
  useEffect(() => {
    // 检查热更新
    silentCheckUpdate()

    // 监听认证状态变化
    const {data: authListener} = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id || null
      setCurrentUserId(userId)

      if (event === 'SIGNED_IN') {
      } else if (event === 'SIGNED_OUT') {
      }
    })

    // 清理监听器
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthProvider client={supabase} loginPath="/pages/login/index">
      <PermissionProvider>
        <UserContextProvider>{children}</UserContextProvider>
      </PermissionProvider>
    </AuthProvider>
  )
}

export default App
