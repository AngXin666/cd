/**
 * @file Taro application entry file
 */

import {AuthProvider} from 'miaoda-auth-taro'
import type React from 'react'
import type {PropsWithChildren} from 'react'
import {useEffect} from 'react'
import {supabase} from '@/client/supabase'
import {UserContextProvider} from '@/contexts/UserContext'
import {capacitorApp, capacitorSplashScreen, capacitorStatusBar} from '@/utils/capacitor'
import {silentCheckUpdate} from '@/utils/hotUpdate'
import {setCurrentUserId, setupGlobalErrorHandler} from '@/utils/logger'
import {platformExecute} from '@/utils/platform'
import './app.scss'

// 设置全局错误处理
setupGlobalErrorHandler()

/**
 * 平台特定初始化
 */
const initializePlatform = async () => {
  // 微信小程序初始化
  platformExecute.onWeapp(() => {
    console.log('微信小程序环境初始化')
    // 微信小程序特定的初始化逻辑
  })

  // H5初始化
  platformExecute.onH5(() => {
    console.log('H5环境初始化')
    // H5特定的初始化逻辑
  })

  // 安卓APP初始化
  platformExecute.onAndroid(async () => {
    console.log('安卓APP环境初始化')

    try {
      // 设置状态栏样式
      await capacitorStatusBar.setStyle('DARK')
      await capacitorStatusBar.setBackgroundColor('#1E3A8A')

      // 隐藏启动屏
      setTimeout(async () => {
        await capacitorSplashScreen.hide()
      }, 2000)

      // 获取应用信息
      const appInfo = await capacitorApp.getInfo()
      if (appInfo) {
        console.log('应用信息:', appInfo)
      }

      // 监听应用状态变化
      capacitorApp.addStateChangeListener((state) => {
        console.log('应用状态变化:', state)
        if (state.isActive) {
          // 应用激活时的逻辑
        } else {
          // 应用进入后台时的逻辑
        }
      })
    } catch (error) {
      console.error('安卓APP初始化失败:', error)
    }
  })
}

const App: React.FC = ({children}: PropsWithChildren<unknown>) => {
  useEffect(() => {
    // 平台初始化
    initializePlatform()

    // 检查热更新（仅在非生产环境）
    if (process.env.NODE_ENV !== 'production') {
      silentCheckUpdate()
    }

    // 监听认证状态变化
    const {data: authListener} = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id || null
      setCurrentUserId(userId)

      if (event === 'SIGNED_IN') {
        console.log('用户登录成功')
        // 登录成功后的平台特定处理
        platformExecute.onAndroid(() => {
          // 安卓APP登录后的处理
        })
        platformExecute.onWeapp(() => {
          // 微信小程序登录后的处理
        })
      } else if (event === 'SIGNED_OUT') {
        console.log('用户登出')
        // 登出后的平台特定处理
      }
    })

    // 清理监听器
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthProvider client={supabase} loginPath="/pages/login/index">
      <UserContextProvider>{children}</UserContextProvider>
    </AuthProvider>
  )
}

export default App
