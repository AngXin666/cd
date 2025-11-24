/**
 * 通知铃铛组件
 *
 * 功能：
 * 1. 显示铃铛图标
 * 2. 有未读消息时显示红色铃铛和未读数量徽章
 * 3. 无未读消息时显示绿色铃铛
 * 4. 点击跳转到通知中心
 * 5. 实时更新未读数量
 */

import {Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getUnreadNotificationCount, subscribeToNotifications} from '@/db/notificationApi'

interface NotificationBellProps {
  userId: string
  className?: string
}

const NotificationBell: React.FC<NotificationBellProps> = ({userId, className = ''}) => {
  const [unreadCount, setUnreadCount] = useState(0)

  // 加载未读通知数量
  const loadUnreadCount = useCallback(async () => {
    if (!userId) return
    const count = await getUnreadNotificationCount(userId)
    setUnreadCount(count)
  }, [userId])

  // 页面显示时刷新未读数量
  useDidShow(() => {
    loadUnreadCount()
  })

  // 订阅实时通知更新
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeToNotifications(userId, () => {
      // 有新通知时刷新未读数量
      loadUnreadCount()
    })

    return () => {
      unsubscribe()
    }
  }, [userId, loadUnreadCount])

  // 点击跳转到通知中心
  const handleClick = () => {
    Taro.navigateTo({
      url: '/pages/common/notifications/index'
    })
  }

  return (
    <View
      className={`relative flex items-center justify-center cursor-pointer active:opacity-70 transition-all ${className}`}
      onClick={handleClick}
      style={{transform: 'rotate(15deg)'}}>
      {/* 铃铛图标 - 有未读显示红色，无未读显示绿色 */}
      <View
        className={`i-mdi-bell text-2xl transition-colors ${unreadCount > 0 ? 'text-red-500' : 'text-green-500'}`}
      />

      {/* 未读数量徽章 */}
      {unreadCount > 0 && (
        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-5 h-5 flex items-center justify-center px-1 shadow-md">
          <Text className="text-white text-xs font-bold">{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </View>
  )
}

export default NotificationBell
