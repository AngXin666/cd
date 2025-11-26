import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '@/db/api'
import type {Notification} from '@/db/types'
import {formatDistanceToNow} from '@/utils/dateFormat'

const NotificationCenter: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // 加载通知列表
  const loadNotifications = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const [notificationList, count] = await Promise.all([
        getNotifications(user.id),
        getUnreadNotificationCount(user.id)
      ])

      setNotifications(notificationList)
      setUnreadCount(count)
    } catch (error) {
      console.error('加载通知列表失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  // 页面显示时加载数据
  useDidShow(() => {
    loadNotifications()
  })

  // 标记单个通知为已读
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    const success = await markNotificationAsRead(notificationId)
    if (success) {
      // 更新本地状态
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? {...n, is_read: true} : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }, [])

  // 标记所有通知为已读
  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return

    Taro.showLoading({title: '处理中...'})
    try {
      const success = await markAllNotificationsAsRead(user.id)
      if (success) {
        setNotifications((prev) => prev.map((n) => ({...n, is_read: true})))
        setUnreadCount(0)
        Taro.showToast({
          title: '已全部标记为已读',
          icon: 'success'
        })
      } else {
        Taro.showToast({
          title: '操作失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('标记所有通知为已读失败:', error)
      Taro.showToast({
        title: '操作失败',
        icon: 'none'
      })
    } finally {
      Taro.hideLoading()
    }
  }, [user])

  // 删除通知
  const handleDelete = useCallback(async (notificationId: string, isRead: boolean) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({title: '删除中...'})
          try {
            const success = await deleteNotification(notificationId)
            if (success) {
              setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
              if (!isRead) {
                setUnreadCount((prev) => Math.max(0, prev - 1))
              }
              Taro.showToast({
                title: '删除成功',
                icon: 'success'
              })
            } else {
              Taro.showToast({
                title: '删除失败',
                icon: 'none'
              })
            }
          } catch (error) {
            console.error('删除通知失败:', error)
            Taro.showToast({
              title: '删除失败',
              icon: 'none'
            })
          } finally {
            Taro.hideLoading()
          }
        }
      }
    })
  }, [])

  // 点击通知
  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      // 如果未读，先标记为已读
      if (!notification.is_read) {
        await handleMarkAsRead(notification.id)
      }

      // 如果有跳转链接，执行跳转
      if (notification.action_url) {
        Taro.navigateTo({
          url: notification.action_url
        })
      }
    },
    [handleMarkAsRead]
  )

  // 获取通知类型图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'verification_reminder':
        return 'i-mdi-bell-alert'
      case 'system':
        return 'i-mdi-information'
      case 'announcement':
        return 'i-mdi-bullhorn'
      default:
        return 'i-mdi-bell'
    }
  }

  // 获取通知类型颜色
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'verification_reminder':
        return 'text-red-500'
      case 'system':
        return 'text-blue-500'
      case 'announcement':
        return 'text-green-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <View className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 头部 */}
      <View className="bg-white px-4 py-4 shadow-sm">
        <View className="flex items-center justify-between">
          <View className="flex items-center">
            <View className="i-mdi-bell text-2xl text-blue-600 mr-2" />
            <Text className="text-xl font-bold text-gray-800">通知中心</Text>
            {unreadCount > 0 && (
              <View className="ml-2 bg-red-500 rounded-full px-2 py-0.5 min-w-5 flex items-center justify-center">
                <Text className="text-white text-xs font-bold">{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <View
              onClick={handleMarkAllAsRead}
              className="flex items-center bg-blue-50 px-3 py-1.5 rounded-lg active:bg-blue-100">
              <View className="i-mdi-check-all text-blue-600 text-base mr-1" />
              <Text className="text-blue-600 text-sm font-medium">全部已读</Text>
            </View>
          )}
        </View>
      </View>

      {/* 通知列表 */}
      <ScrollView scrollY className="h-screen" style={{paddingBottom: '100px'}}>
        <View className="p-4">
          {loading ? (
            <View className="flex items-center justify-center py-12">
              <View className="i-mdi-loading animate-spin text-4xl text-blue-600 mb-2" />
              <Text className="text-gray-500 text-sm">加载中...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View className="bg-white rounded-xl p-8 text-center shadow-sm">
              <View className="i-mdi-bell-off text-6xl text-gray-300 mb-4" />
              <Text className="text-gray-500 block mb-2">暂无通知</Text>
              <Text className="text-gray-400 text-sm">您还没有收到任何通知</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {notifications.map((notification) => (
                <View
                  key={notification.id}
                  className={`bg-white rounded-xl p-4 shadow-sm ${!notification.is_read ? 'border-l-4 border-blue-500' : ''}`}
                  onClick={() => handleNotificationClick(notification)}>
                  <View className="flex items-start justify-between mb-2">
                    <View className="flex items-center flex-1">
                      <View
                        className={`${getNotificationIcon(notification.type)} ${getNotificationColor(notification.type)} text-xl mr-2`}
                      />
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-800">{notification.title}</Text>
                        {!notification.is_read && (
                          <View className="inline-block ml-2 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </View>
                    </View>
                    <View
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(notification.id, notification.is_read)
                      }}
                      className="ml-2 p-1 active:bg-gray-100 rounded">
                      <View className="i-mdi-delete text-gray-400 text-lg" />
                    </View>
                  </View>

                  <Text className="text-gray-700 text-sm mb-2 leading-relaxed">{notification.content}</Text>

                  <View className="flex items-center justify-between text-xs text-gray-400">
                    <View className="flex items-center">
                      <View className="i-mdi-account text-xs mr-1" />
                      <Text className="text-xs">{notification.sender_name}</Text>
                    </View>
                    <View className="flex items-center">
                      <View className="i-mdi-clock-outline text-xs mr-1" />
                      <Text className="text-xs">{formatDistanceToNow(notification.created_at)}</Text>
                    </View>
                  </View>

                  {notification.action_url && (
                    <View className="mt-3 pt-3 border-t border-gray-100">
                      <View className="flex items-center justify-center bg-blue-50 py-2 rounded-lg">
                        <Text className="text-blue-600 text-sm font-medium">点击查看详情</Text>
                        <View className="i-mdi-chevron-right text-blue-600 text-base ml-1" />
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default NotificationCenter
