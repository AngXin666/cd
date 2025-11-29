import {Button, ScrollView, Text, View} from '@tarojs/components'
import {showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import * as NotificationsAPI from '@/db/api/notifications'

import type {ScheduledNotification} from '@/db/types'

/**
 * 定时通知管理页面
 */
const ScheduledNotifications: React.FC = () => {
  const {user} = useAuth({guard: true})

  const [notifications, setNotifications] = useState<ScheduledNotification[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('pending')

  // 加载定时通知
  const loadNotifications = useCallback(async () => {
    const data = await NotificationsAPI.getScheduledNotifications()
    setNotifications(data)
  }, [])

  useDidShow(() => {
    loadNotifications()
  })

  // 取消定时通知
  const handleCancel = async (notification: ScheduledNotification) => {
    const res = await showModal({
      title: '确认取消',
      content: `确定要取消定时通知"${notification.title}"吗？`
    })

    if (res.confirm) {
      const success = await NotificationsAPI.updateScheduledNotificationStatus(notification.id, 'cancelled')
      if (success) {
        showToast({title: '已取消', icon: 'success'})
        loadNotifications()
      } else {
        showToast({title: '操作失败', icon: 'error'})
      }
    }
  }

  // 格式化时间
  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  // 获取状态标签
  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: {label: '待发送', color: 'bg-blue-100 text-blue-700'},
      sent: {label: '已发送', color: 'bg-green-100 text-green-700'},
      cancelled: {label: '已取消', color: 'bg-gray-100 text-gray-700'},
      failed: {label: '发送失败', color: 'bg-red-100 text-red-700'}
    }
    return statusMap[status] || statusMap.pending
  }

  // 获取目标类型标签
  const getTargetTypeLabel = (type: string) => {
    const typeMap = {
      all: '全部司机',
      warehouse: '指定仓库',
      specific: '指定司机'
    }
    return typeMap[type] || type
  }

  // 过滤通知
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true
    if (filter === 'pending') return n.status === 'pending'
    if (filter === 'sent') return n.status === 'sent'
    return true
  })

  return (
    <View style={{background: 'linear-gradient(to bottom, #dbeafe, #bfdbfe)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 筛选器 */}
          <View className="bg-white rounded-xl p-3 mb-4 shadow-sm">
            <View className="flex gap-2">
              <View
                onClick={() => setFilter('pending')}
                className={`flex-1 rounded-lg px-4 py-2 text-center active:scale-95 transition-all ${
                  filter === 'pending' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-sm font-medium ${filter === 'pending' ? 'text-white' : 'text-gray-700'}`}>
                  待发送
                </Text>
              </View>

              <View
                onClick={() => setFilter('sent')}
                className={`flex-1 rounded-lg px-4 py-2 text-center active:scale-95 transition-all ${
                  filter === 'sent' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-sm font-medium ${filter === 'sent' ? 'text-white' : 'text-gray-700'}`}>
                  已发送
                </Text>
              </View>

              <View
                onClick={() => setFilter('all')}
                className={`flex-1 rounded-lg px-4 py-2 text-center active:scale-95 transition-all ${
                  filter === 'all' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-sm font-medium ${filter === 'all' ? 'text-white' : 'text-gray-700'}`}>全部</Text>
              </View>
            </View>
          </View>

          {/* 通知列表 */}
          {filteredNotifications.length === 0 ? (
            <View className="bg-white rounded-xl p-8 text-center shadow-sm">
              <View className="i-mdi-calendar-clock text-6xl text-gray-300 mb-4 mx-auto" />
              <Text className="text-gray-500">暂无定时通知</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {filteredNotifications.map((notification) => {
                const statusBadge = getStatusBadge(notification.status)
                return (
                  <View key={notification.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <View className="flex items-start justify-between mb-2">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-800 mb-1">{notification.title}</Text>
                        <View className="flex items-center gap-2 mb-2">
                          <View className={`inline-block px-2 py-1 rounded ${statusBadge.color}`}>
                            <Text className="text-xs">{statusBadge.label}</Text>
                          </View>
                          <View className="inline-block bg-purple-100 px-2 py-1 rounded">
                            <Text className="text-xs text-purple-700">
                              {getTargetTypeLabel(notification.target_type)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <Text className="text-sm text-gray-600 mb-3 line-clamp-2">{notification.content}</Text>

                    <View className="flex items-center text-sm text-gray-500 mb-3">
                      <View className="i-mdi-clock-outline text-base mr-1" />
                      <Text className="text-xs">发送时间：{formatDateTime(notification.send_time)}</Text>
                    </View>

                    {notification.status === 'pending' && (
                      <Button
                        onClick={() => handleCancel(notification)}
                        className="w-full bg-red-50 text-red-600 py-2 rounded-lg break-keep text-sm"
                        size="default">
                        取消发送
                      </Button>
                    )}

                    {notification.status === 'sent' && notification.sent_at && (
                      <View className="flex items-center text-sm text-green-600">
                        <View className="i-mdi-check-circle text-base mr-1" />
                        <Text className="text-xs">已发送于 {formatDateTime(notification.sent_at)}</Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default ScheduledNotifications
