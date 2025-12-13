/**
 * @file Taro application entry file
 */

import {AuthProvider} from 'miaoda-auth-taro'
import type React from 'react'
import type {PropsWithChildren} from 'react'
import {useEffect} from 'react'
import {supabase} from '@/client/supabase'
import {UserContextProvider} from '@/contexts/UserContext'
import {initMigrations} from '@/db/migrations/runMigrations'
import {capacitorApp, capacitorSplashScreen, capacitorStatusBar} from '@/utils/capacitor'
import {silentCheckUpdate} from '@/utils/hotUpdate'
import {setCurrentUserId, setupGlobalErrorHandler} from '@/utils/logger'
import {platformExecute} from '@/utils/platform'
import {checkForH5Update, applyH5Update, initLiveUpdate} from '@/services/h5UpdateService'
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
 * 显示更新弹窗并处理更新流程（使用原生confirm/alert）
 */
const showUpdateModal = async (versionInfo: {
  version: string
  h5_url: string
  release_notes?: string
  is_force_update: boolean
}) => {
  const content = versionInfo.release_notes || '修复已知问题，优化用户体验'

  // 1. 提示更新
  const userConfirmed = confirm(
    `发现新版本 v${versionInfo.version}\n\n更新内容：\n${content}\n\n是否立即更新？`
  )

  if (userConfirmed) {
    // 2. 下载更新
    alert('正在下载更新，请稍候...')

    const success = await applyH5Update(versionInfo.h5_url, versionInfo.version, (progress) => {
      console.log('更新进度:', progress)
    })

    if (success) {
      // 3. 更新成功，提示用户手动退出
      alert('更新成功！请手动退出应用后重新打开以应用更新。')
    } else {
      // 更新失败
      alert('更新失败，请检查网络后重试')
    }
  }
}

const App: React.FC = ({children}: PropsWithChildren<unknown>) => {
  useEffect(() => {
    // 初始化数据库迁移
    initMigrations()

    // 平台初始化
    initializePlatform()

    // 初始化LiveUpdate热更新
    initLiveUpdate()

    // 等待页面完全加载后再检查更新
    const checkUpdateWhenReady = async () => {
      console.log('=== 开始检查H5更新 ===')
      try {
        const result = await checkForH5Update()
        console.log('检查结果:', JSON.stringify(result))
        if (result.needsUpdate && result.versionInfo) {
          console.log('需要更新，准备显示弹窗')
          await showUpdateModal(result.versionInfo)
        } else {
          console.log('不需要更新，当前已是最新版本')
        }
      } catch (error) {
        console.error('检查H5更新失败:', error)
      }
    }

    // 延迟500毫秒后检查更新（避免干扰登录）
    const updateCheckTimer = setTimeout(checkUpdateWhenReady, 500)

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

    // 清理监听器和定时器
    return () => {
      authListener?.subscription.unsubscribe()
      clearTimeout(updateCheckTimer)
    }
  }, [])

  return (
    <AuthProvider client={supabase} loginPath="/pages/login/index">
      <UserContextProvider>{children}</UserContextProvider>
    </AuthProvider>
  )
}

export default App
