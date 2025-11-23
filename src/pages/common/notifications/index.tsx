/**
 * 通知列表页面
 * 显示所有通知，支持标记已读、删除等操作
 */

import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {
  deleteNotification,
  deleteReadNotifications,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type Notification,
  subscribeToNotifications
} from '@/db/notificationApi'
import {createLogger} from '@/utils/logger'

const logger = createLogger('NotificationsPage')

const NotificationsPage: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  // 加载通知列表
  const loadNotifications = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await getUserNotifications(user.id)
      setNotifications(data)
    } catch (error) {
      logger.error('加载通知列表失败', error)
      Taro.showToast({title: '加载失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [user])

  // 页面显示时加载数据
  useDidShow(() => {
    loadNotifications()

    // 订阅实时通知更新
    if (user) {
      const unsubscribe = subscribeToNotifications(user.id, (newNotification) => {
        // 只添加新通知，不重新加载所有通知
        setNotifications((prev) => {
          // 检查是否已存在该通知
          const exists = prev.some((n) => n.id === newNotification.id)
          if (exists) {
            return prev
          }
          // 添加到列表开头
          return [newNotification, ...prev]
        })
      })

      return () => {
        unsubscribe()
      }
    }
  })

  // 标记单个通知为已读
  const handleMarkAsRead = async (notificationId: string) => {
    const success = await markNotificationAsRead(notificationId)
    if (success) {
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? {...n, is_read: true} : n)))
    }
  }

  // 标记所有通知为已读
  const handleMarkAllAsRead = async () => {
    if (!user) return

    const success = await markAllNotificationsAsRead(user.id)
    if (success) {
      setNotifications((prev) => prev.map((n) => ({...n, is_read: true})))
      Taro.showToast({title: '已全部标记为已读', icon: 'success'})
    }
  }

  // 删除单个通知
  const handleDelete = async (notificationId: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: async (res) => {
        if (res.confirm) {
          const success = await deleteNotification(notificationId)
          if (success) {
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
            Taro.showToast({title: '删除成功', icon: 'success'})
          }
        }
      }
    })
  }

  // 删除所有已读通知
  const handleDeleteRead = async () => {
    if (!user) return

    Taro.showModal({
      title: '确认删除',
      content: '确定要删除所有已读通知吗？',
      success: async (res) => {
        if (res.confirm) {
          const success = await deleteReadNotifications(user.id)
          if (success) {
            setNotifications((prev) => prev.filter((n) => !n.is_read))
            Taro.showToast({title: '删除成功', icon: 'success'})
          }
        }
      }
    })
  }

  // 点击通知项
  const handleNotificationClick = async (notification: Notification) => {
    // 标记为已读
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id)
    }

    // 根据通知类型跳转到相应页面
    if (notification.related_id) {
      switch (notification.type) {
        case 'vehicle_review_pending':
        case 'vehicle_review_approved':
        case 'vehicle_review_need_supplement':
          // 跳转到车辆详情页
          Taro.navigateTo({
            url: `/pages/super-admin/vehicle-review-detail/index?vehicleId=${notification.related_id}`
          })
          break
        default:
          break
      }
    }
  }

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'vehicle_review_pending':
        return 'i-mdi-clock-alert text-orange-500'
      case 'vehicle_review_approved':
        return 'i-mdi-check-circle text-green-500'
      case 'vehicle_review_need_supplement':
        return 'i-mdi-alert-circle text-red-500'
      case 'warehouse_assigned':
        return 'i-mdi-warehouse text-blue-500'
      case 'warehouse_unassigned':
        return 'i-mdi-warehouse-off text-gray-500'
      case 'driver_type_changed':
        return 'i-mdi-account-switch text-purple-500'
      case 'permission_change':
        return 'i-mdi-shield-account text-orange-500'
      case 'driver_info_update':
        return 'i-mdi-account-edit text-blue-500'
      case 'driver_created':
        return 'i-mdi-account-plus text-green-500'
      case 'leave_approved':
        return 'i-mdi-check-circle text-green-500'
      case 'leave_rejected':
        return 'i-mdi-close-circle text-red-500'
      case 'system_notice':
        return 'i-mdi-information text-blue-500'
      default:
        return 'i-mdi-bell text-primary'
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }

    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`
    }

    // 小于1天
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`
    }

    // 小于7天
    if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}天前`
    }

    // 显示完整日期
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <View className="min-h-screen bg-background">
      {/* 顶部操作栏 */}
      <View className="bg-card p-4 flex items-center justify-between border-b border-border">
        <Text className="text-lg font-bold text-foreground">通知中心</Text>
        <View className="flex items-center gap-2">
          <Button
            className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm break-keep"
            size="mini"
            onClick={handleMarkAllAsRead}>
            全部已读
          </Button>
          <Button
            className="bg-muted text-muted-foreground px-4 py-2 rounded text-sm break-keep"
            size="mini"
            onClick={handleDeleteRead}>
            清空已读
          </Button>
        </View>
      </View>

      {/* 通知列表 */}
      <ScrollView scrollY className="h-screen box-border">
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="text-muted-foreground">加载中...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <View className="i-mdi-bell-off text-6xl text-muted-foreground mb-4"></View>
            <Text className="text-muted-foreground">暂无通知</Text>
          </View>
        ) : (
          <View className="p-4 space-y-3">
            {notifications.map((notification) => (
              <View
                key={notification.id}
                className={`bg-card rounded-lg p-4 border ${notification.is_read ? 'border-border' : 'border-primary'}`}
                onClick={() => handleNotificationClick(notification)}>
                <View className="flex items-start gap-3">
                  {/* 图标 */}
                  <View className={`${getNotificationIcon(notification.type)} text-2xl mt-1`}></View>

                  {/* 内容 */}
                  <View className="flex-1">
                    <View className="flex items-center justify-between mb-1">
                      <Text
                        className={`font-bold ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.title}
                      </Text>
                      {!notification.is_read && <View className="w-2 h-2 bg-primary rounded-full"></View>}
                    </View>
                    <Text className={`text-sm ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {notification.message}
                    </Text>
                    <View className="flex items-center justify-between mt-2">
                      <Text className="text-xs text-muted-foreground">{formatTime(notification.created_at)}</Text>
                      <Button
                        className="bg-destructive text-destructive-foreground px-3 py-1 rounded text-xs break-keep"
                        size="mini"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(notification.id)
                        }}>
                        删除
                      </Button>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default NotificationsPage
