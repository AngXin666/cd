/**
 * 通知铃铛组件
 * 显示未读通知数量，点击跳转到通知列表页面
 */

import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
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
    const count = await getUnreadNotificationCount(userId)
    setUnreadCount(count)
  }, [userId])

  useEffect(() => {
    loadUnreadCount()

    // 订阅实时通知更新
    const unsubscribe = subscribeToNotifications(userId, () => {
      loadUnreadCount()
    })

    return () => {
      unsubscribe()
    }
  }, [userId, loadUnreadCount])

  // 点击跳转到通知列表页面
  const handleClick = () => {
    Taro.navigateTo({
      url: '/pages/common/notifications/index'
    })
  }

  return (
    <View className={`relative ${className}`} onClick={handleClick}>
      {/* 铃铛图标 */}
      <View className="i-mdi-bell text-2xl text-foreground"></View>

      {/* 未读数量徽章 */}
      {unreadCount > 0 && (
        <View className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-5 h-5 flex items-center justify-center px-1">
          <Text className="text-xs font-bold">{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </View>
  )
}

export default NotificationBell
