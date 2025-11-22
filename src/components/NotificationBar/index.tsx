import {Text, View} from '@tarojs/components'
import type React from 'react'
import {useEffect, useState} from 'react'
import type {Notification} from '@/hooks/useNotifications'

interface NotificationBarProps {
  notifications: Notification[]
  onNotificationClick?: (notification: Notification) => void
}

/**
 * 动态通知栏组件
 * 显示最新的通知信息，自动滚动
 */
const NotificationBar: React.FC<NotificationBarProps> = ({notifications, onNotificationClick}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // 只显示未读通知
  const unreadNotifications = notifications.filter((n) => !n.read)

  console.log('🔔 NotificationBar 渲染:', {
    总通知数: notifications.length,
    未读通知数: unreadNotifications.length,
    当前索引: currentIndex
  })

  const currentNotification = unreadNotifications[currentIndex]

  // 自动切换通知
  useEffect(() => {
    if (unreadNotifications.length <= 1) return

    const timer = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % unreadNotifications.length)
        setIsAnimating(false)
      }, 300)
    }, 5000) // 每5秒切换一次

    return () => clearInterval(timer)
  }, [unreadNotifications.length])

  // 如果没有未读通知，不显示通知栏
  if (unreadNotifications.length === 0) {
    return null
  }

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'leave_application':
        return 'i-mdi-calendar-clock'
      case 'resignation_application':
        return 'i-mdi-account-remove'
      case 'attendance':
        return 'i-mdi-clock-check'
      case 'approval':
        return 'i-mdi-check-circle'
      case 'system':
        return 'i-mdi-information'
      default:
        return 'i-mdi-bell'
    }
  }

  // 获取通知颜色
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'leave_application':
        return 'bg-primary/10 border-primary/30'
      case 'resignation_application':
        return 'bg-secondary/10 border-secondary/30'
      case 'attendance':
        return 'bg-accent/10 border-accent/30'
      case 'approval':
        return 'bg-primary/10 border-primary/30'
      case 'system':
        return 'bg-muted border-border'
      default:
        return 'bg-primary/10 border-primary/30'
    }
  }

  // 获取图标颜色
  const getIconColor = (type: string) => {
    switch (type) {
      case 'leave_application':
        return 'text-primary'
      case 'resignation_application':
        return 'text-secondary'
      case 'attendance':
        return 'text-accent'
      case 'approval':
        return 'text-primary'
      case 'system':
        return 'text-muted-foreground'
      default:
        return 'text-primary'
    }
  }

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

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

  // 点击通知
  const handleClick = () => {
    if (onNotificationClick && currentNotification) {
      onNotificationClick(currentNotification)
    }
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
              {formatTime(currentNotification.timestamp)}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground line-clamp-1">{currentNotification.content}</Text>
        </View>

        {/* 未读标记和数量 */}
        <View className="flex items-center ml-3 flex-shrink-0">
          {unreadNotifications.length > 1 && (
            <View className="bg-secondary text-white text-xs px-2 py-1 rounded-full min-w-5 text-center">
              <Text className="text-white text-xs">{unreadNotifications.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 进度条 */}
      {unreadNotifications.length > 1 && (
        <View className="h-1 bg-muted">
          <View
            className="h-full bg-primary transition-all duration-5000 ease-linear"
            style={{width: `${((currentIndex + 1) / unreadNotifications.length) * 100}%`}}
          />
        </View>
      )}
    </View>
  )
}

export default NotificationBar
