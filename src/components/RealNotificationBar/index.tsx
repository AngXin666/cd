/**
 * 真实通知栏组件
 * 连接到数据库的通知系统，显示最新的未读通知
 */

import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getUserNotifications, type Notification} from '@/db/notificationApi'

const RealNotificationBar: React.FC = () => {
  const {user} = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // 加载通知
  const loadNotifications = useCallback(async () => {
    if (!user) return

    try {
      const data = await getUserNotifications(user.id, 10)
      // 只显示未读通知
      const unreadNotifications = data.filter((n) => !n.is_read)
      setNotifications(unreadNotifications)
    } catch (error) {
      console.error('加载通知失败:', error)
    }
  }, [user])

  // 初始加载
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // 自动切换通知
  useEffect(() => {
    if (notifications.length <= 1) return

    const timer = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % notifications.length)
        setIsAnimating(false)
      }, 300)
    }, 5000) // 每5秒切换一次

    return () => clearInterval(timer)
  }, [notifications.length])

  // 如果没有未读通知，不显示通知栏
  if (notifications.length === 0) {
    return null
  }

  const currentNotification = notifications[currentIndex]

  // 如果当前通知不存在，不显示通知栏
  if (!currentNotification) {
    return null
  }

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'vehicle_review_pending':
        return 'i-mdi-clock-alert'
      case 'vehicle_review_approved':
        return 'i-mdi-check-circle'
      case 'vehicle_review_need_supplement':
        return 'i-mdi-alert-circle'
      case 'warehouse_assigned':
        return 'i-mdi-warehouse'
      case 'warehouse_unassigned':
        return 'i-mdi-warehouse-off'
      case 'driver_type_changed':
        return 'i-mdi-account-switch'
      case 'permission_change':
        return 'i-mdi-shield-account'
      case 'driver_info_update':
        return 'i-mdi-account-edit'
      case 'driver_created':
        return 'i-mdi-account-plus'
      case 'leave_approved':
        return 'i-mdi-check-circle'
      case 'leave_rejected':
        return 'i-mdi-close-circle'
      case 'system_notice':
        return 'i-mdi-information'
      default:
        return 'i-mdi-bell'
    }
  }

  // 获取通知颜色
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'vehicle_review_pending':
        return 'bg-orange-50 border-orange-200'
      case 'vehicle_review_approved':
        return 'bg-green-50 border-green-200'
      case 'vehicle_review_need_supplement':
        return 'bg-red-50 border-red-200'
      case 'warehouse_assigned':
        return 'bg-blue-50 border-blue-200'
      case 'warehouse_unassigned':
        return 'bg-gray-50 border-gray-200'
      case 'driver_type_changed':
        return 'bg-purple-50 border-purple-200'
      case 'leave_approved':
        return 'bg-green-50 border-green-200'
      case 'leave_rejected':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-primary/10 border-primary/30'
    }
  }

  // 获取图标颜色
  const getIconColor = (type: string) => {
    switch (type) {
      case 'vehicle_review_pending':
        return 'text-orange-500'
      case 'vehicle_review_approved':
        return 'text-green-500'
      case 'vehicle_review_need_supplement':
        return 'text-red-500'
      case 'warehouse_assigned':
        return 'text-blue-500'
      case 'warehouse_unassigned':
        return 'text-gray-500'
      case 'driver_type_changed':
        return 'text-purple-500'
      case 'leave_approved':
        return 'text-green-500'
      case 'leave_rejected':
        return 'text-red-500'
      default:
        return 'text-primary'
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) {
      return '刚刚'
    }
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`
    }
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`
    }
    return `${Math.floor(diff / 86400000)}天前`
  }

  // 点击通知栏跳转到通知中心
  const handleClick = () => {
    Taro.navigateTo({url: '/pages/common/notifications/index'})
  }

  return (
    <View
      className={`mx-4 mb-4 rounded-lg border ${getNotificationColor(currentNotification.type)} overflow-hidden transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
      onClick={handleClick}>
      <View className="flex items-center p-3">
        {/* 图标 */}
        <View
          className={`${getNotificationIcon(currentNotification.type)} text-2xl ${getIconColor(currentNotification.type)} mr-3 flex-shrink-0`}
        />

        {/* 内容 */}
        <View className="flex-1 min-w-0">
          <View className="flex items-center justify-between mb-1">
            <Text className="text-sm font-medium text-foreground">{currentNotification.title}</Text>
            <Text className="text-xs text-muted-foreground ml-2 flex-shrink-0">
              {formatTime(currentNotification.created_at)}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground line-clamp-1">{currentNotification.message}</Text>
        </View>

        {/* 未读标记和数量 */}
        <View className="flex items-center ml-3 flex-shrink-0">
          {notifications.length > 1 && (
            <View className="bg-secondary text-white text-xs px-2 py-1 rounded-full min-w-5 text-center">
              <Text className="text-white text-xs">{notifications.length}</Text>
            </View>
          )}
          <View className="i-mdi-chevron-right text-xl text-muted-foreground ml-2" />
        </View>
      </View>

      {/* 进度条 */}
      {notifications.length > 1 && (
        <View className="h-1 bg-muted">
          <View
            className="h-full bg-primary transition-all duration-5000 ease-linear"
            style={{width: `${((currentIndex + 1) / notifications.length) * 100}%`}}
          />
        </View>
      )}
    </View>
  )
}

export default RealNotificationBar
