/**
 * @file Taro 应用入口文件
 *
 * 本文件是应用的主入口，负责：
 * - 初始化全局错误处理
 * - 初始化平台特定功能（微信小程序、H5、Android APP）
 * - 初始化统一热更新服务
 * - 设置认证上下文和用户上下文
 * - 监听认证状态变化
 */

import {AuthProvider} from 'miaoda-auth-taro'
import type React from 'react'
import type {PropsWithChildren} from 'react'
import {useEffect} from 'react'
import {supabase} from '@/client/supabase'
import {UserContextProvider} from '@/contexts/UserContext'
import {initMigrations} from '@/db/migrations/runMigrations'
import {UnifiedUpdateService} from '@/services/unifiedUpdateService'
import {capacitorApp, capacitorSplashScreen, capacitorStatusBar} from '@/utils/capacitor'
import {setCurrentUserId, setupGlobalErrorHandler} from '@/utils/logger'
import {platformExecute} from '@/utils/platform'
import {initTaroCompat} from '@/utils/taroCompat'
import './app.scss'

// 设置全局错误处理
setupGlobalErrorHandler()

// 初始化 Taro H5 兼容层（全局覆盖 showLoading/hideLoading 等方法）
initTaroCompat()

/**
 * 平台特定初始化
 */
const initializePlatform = async () => {
  // 微信小程序初始化
  platformExecute.onWeapp(() => {
    console.log('微信小程序环境初始化')
  })

  // H5初始化
  platformExecute.onH5(() => {
    console.log('H5环境初始化')
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
      })
    } catch (error) {
      console.error('安卓APP初始化失败:', error)
    }
  })
}

/**
 * 应用主组件
 * @param props - 组件属性
 * @param props.children - 子组件
 * @returns React 组件
 */
const App: React.FC = ({children}: PropsWithChildren<unknown>) => {
  useEffect(() => {
    // 初始化数据库迁移
    initMigrations()

    // 平台初始化
    initializePlatform()

    // 初始化统一热更新服务
    const initializeUpdateService = async () => {
      try {
        // 创建统一更新服务实例
        const updateService = new UnifiedUpdateService()

        // 初始化更新服务
        await updateService.initialize()

        // 延迟 500ms 后进行静默更新检查
        setTimeout(async () => {
          try {
            await updateService.checkAndApplyUpdate(true)
          } catch (error) {
            console.error('静默检查更新失败:', error)
          }
        }, 500)
      } catch (error) {
        console.error('初始化更新服务失败:', error)
      }
    }

    // 启动更新服务初始化
    initializeUpdateService()

    // 监听认证状态变化
    const {data: authListener} = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id || null
      setCurrentUserId(userId)

      if (event === 'SIGNED_IN') {
        console.log('用户登录成功')
        platformExecute.onAndroid(() => {
          // 安卓APP登录后的处理
        })
        platformExecute.onWeapp(() => {
          // 微信小程序登录后的处理
        })
      } else if (event === 'SIGNED_OUT') {
        console.log('用户登出')
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
