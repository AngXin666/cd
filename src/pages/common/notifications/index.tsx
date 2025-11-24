/**
 * 通知列表页面
 * 显示所有通知，支持标记已读、删除等操作
 * 优化功能：
 * 1. 已读绿色点，未读红色点
 * 2. 点击即标记为已读
 * 3. 未读信息优先排在最前面
 * 4. 按今天、昨天、历史进行日期分类
 */

import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useMemo, useState} from 'react'
import {getCurrentUserRole} from '@/db/api'
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

// 通知分组类型
interface NotificationGroup {
  title: string
  notifications: Notification[]
}

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
      // 排序：未读优先，然后按时间倒序
      const sorted = data.sort((a, b) => {
        // 未读优先
        if (a.is_read !== b.is_read) {
          return a.is_read ? 1 : -1
        }
        // 时间倒序
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setNotifications(sorted)
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
      setNotifications((prev) =>
        prev
          .map((n) => (n.id === notificationId ? {...n, is_read: true} : n))
          .sort((a, b) => {
            // 未读优先
            if (a.is_read !== b.is_read) {
              return a.is_read ? 1 : -1
            }
            // 时间倒序
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
      )
    }
  }

  // 标记所有通知为已读
  const handleMarkAllAsRead = async () => {
    if (!user) return

    const success = await markAllNotificationsAsRead(user.id)
    if (success) {
      setNotifications((prev) =>
        prev
          .map((n) => ({...n, is_read: true}))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      )
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
        case 'leave_application_submitted':
        case 'resignation_application_submitted': {
          // 获取用户角色，根据角色跳转到不同的审批页面
          const userRole = await getCurrentUserRole()
          if (userRole === 'super_admin') {
            // 超级管理员跳转到超级管理员的考勤管理页面（待审批标签）
            Taro.navigateTo({
              url: `/pages/super-admin/leave-approval/index?tab=pending`
            })
          } else {
            // 普通管理员跳转到普通管理员的考勤管理页面（待审批标签）
            Taro.navigateTo({
              url: `/pages/manager/leave-approval/index?tab=pending`
            })
          }
          break
        }
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
      case 'leave_application_submitted':
        return 'i-mdi-file-document-edit text-orange-500'
      case 'leave_approved':
        return 'i-mdi-check-circle text-green-500'
      case 'leave_rejected':
        return 'i-mdi-close-circle text-red-500'
      case 'resignation_application_submitted':
        return 'i-mdi-account-remove text-orange-500'
      case 'resignation_approved':
        return 'i-mdi-check-circle text-green-500'
      case 'resignation_rejected':
        return 'i-mdi-close-circle text-red-500'
      case 'system_notice':
        return 'i-mdi-information text-blue-500'
      default:
        return 'i-mdi-bell text-primary'
    }
  }

  // 判断日期分类
  const getDateCategory = useCallback((dateString: string): 'today' | 'yesterday' | 'history' => {
    const date = new Date(dateString)
    const now = new Date()

    // 重置时间到当天0点
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const notificationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffDays = Math.floor((today.getTime() - notificationDate.getTime()) / 86400000)

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    return 'history'
  }, [])

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 格式化历史日期
  const formatHistoryDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month}月${day}日 ${hours}:${minutes}`
  }

  // 按日期分组通知
  const groupedNotifications = useMemo(() => {
    const groups: NotificationGroup[] = []

    // 分类通知
    const todayNotifications = notifications.filter((n) => getDateCategory(n.created_at) === 'today')
    const yesterdayNotifications = notifications.filter((n) => getDateCategory(n.created_at) === 'yesterday')
    const historyNotifications = notifications.filter((n) => getDateCategory(n.created_at) === 'history')

    // 添加今天的通知
    if (todayNotifications.length > 0) {
      groups.push({
        title: '今天',
        notifications: todayNotifications
      })
    }

    // 添加昨天的通知
    if (yesterdayNotifications.length > 0) {
      groups.push({
        title: '昨天',
        notifications: yesterdayNotifications
      })
    }

    // 添加历史通知
    if (historyNotifications.length > 0) {
      groups.push({
        title: '更早',
        notifications: historyNotifications
      })
    }

    return groups
  }, [notifications, getDateCategory])

  // 统计未读数量
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length
  }, [notifications])

  return (
    <View className="min-h-screen bg-background">
      {/* 顶部操作栏 */}
      <View className="bg-card p-4 border-b border-border">
        <View className="flex items-center justify-between mb-2">
          <Text className="text-lg font-bold text-foreground">通知中心</Text>
          {unreadCount > 0 && (
            <View className="bg-destructive text-destructive-foreground px-2 py-1 rounded-full">
              <Text className="text-xs text-white">{unreadCount} 条未读</Text>
            </View>
          )}
        </View>
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
          <View className="pb-4">
            {groupedNotifications.map((group) => (
              <View key={group.title} className="mb-4">
                {/* 日期分组标题 */}
                <View className="px-4 py-2 bg-muted/50">
                  <Text className="text-sm font-bold text-muted-foreground">{group.title}</Text>
                </View>

                {/* 该分组的通知列表 */}
                <View className="px-4 pt-3 space-y-3">
                  {group.notifications.map((notification) => (
                    <View
                      key={notification.id}
                      className={`bg-card rounded-lg p-4 border ${notification.is_read ? 'border-border' : 'border-primary/50 shadow-sm'}`}
                      onClick={() => handleNotificationClick(notification)}>
                      <View className="flex items-start gap-3">
                        {/* 已读/未读状态点 */}
                        <View
                          className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${notification.is_read ? 'bg-green-500' : 'bg-red-500'}`}></View>

                        {/* 图标 */}
                        <View
                          className={`${getNotificationIcon(notification.type)} text-2xl mt-1 flex-shrink-0`}></View>

                        {/* 内容 */}
                        <View className="flex-1 min-w-0">
                          <View className="flex items-start justify-between mb-1">
                            <Text
                              className={`font-bold ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {notification.title}
                            </Text>
                          </View>
                          <Text
                            className={`text-sm mb-2 ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {notification.message}
                          </Text>
                          <View className="flex items-center justify-between">
                            <Text className="text-xs text-muted-foreground">
                              {group.title === '更早'
                                ? formatHistoryDate(notification.created_at)
                                : formatTime(notification.created_at)}
                            </Text>
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
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default NotificationsPage
