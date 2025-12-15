/**
 * 全局通知提供者组件
 *
 * 在应用根级别订阅通知，当用户登录后自动启用通知 Toast 功能。
 * 该组件不渲染任何 UI，仅负责订阅通知并在收到新通知时弹出 Toast。
 *
 * 功能：
 * - 用户登录后自动订阅通知
 * - 用户退出登录后自动取消订阅
 * - 在任意页面都能显示通知 Toast
 *
 * @module components/GlobalNotificationProvider
 */

import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import type {PropsWithChildren} from 'react'
import {useEffect} from 'react'
import {useNotificationToast} from '@/hooks/useNotificationToast'

/**
 * GlobalNotificationProvider 组件属性
 */
export interface GlobalNotificationProviderProps {
  /** 子组件 */
  children: React.ReactNode
}

/**
 * 全局通知提供者组件
 *
 * 使用方式：
 * 在 App.tsx 中包裹应用内容，确保在 AuthProvider 内部使用。
 *
 * @example
 * ```tsx
 * <AuthProvider client={supabase}>
 *   <GlobalNotificationProvider>
 *     <UserContextProvider>{children}</UserContextProvider>
 *   </GlobalNotificationProvider>
 * </AuthProvider>
 * ```
 *
 * @param props - 组件属性
 * @param props.children - 子组件
 * @returns React 组件
 */
const GlobalNotificationProvider: React.FC<PropsWithChildren<GlobalNotificationProviderProps>> = ({children}) => {
  // 获取当前登录用户
  const {user} = useAuth()

  // 调试日志：监控用户状态变化
  useEffect(() => {
    console.log('🔔 [GlobalNotificationProvider] 用户状态变化:', {
      userId: user?.id || '(未登录)',
      hasUser: !!user
    })
  }, [user])

  // 订阅通知 Toast
  // 当 user 存在时启用订阅，用户退出登录后自动取消订阅
  useNotificationToast(user?.id, !!user)

  // 该组件不渲染任何 UI，直接返回子组件
  return <>{children}</>
}

export default GlobalNotificationProvider
