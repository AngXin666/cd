import {ScrollView, Text, View} from '@tarojs/components'
import {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import * as NotificationsAPI from '@/db/api/notifications'

import type {NotificationSendRecordWithSender} from '@/db/types'

import TopNavBar from '@/components/TopNavBar'
/**
 * 通知发送记录页面
 */
const NotificationRecords: React.FC = () => {
  const {user: _user} = useAuth({guard: true})

  const [records, setRecords] = useState<NotificationSendRecordWithSender[]>([])
  const [filter, setFilter] = useState<'all' | 'manual' | 'scheduled' | 'auto'>('all')

  // 加载发送记录
  const loadRecords = useCallback(async () => {
    const data = await NotificationsAPI.getNotificationSendRecords()
    setRecords(data)
  }, [])

  useDidShow(() => {
    loadRecords()
  })

  // 格式化时间
  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  // 获取类型标签
  const getTypeBadge = (type: string) => {
    const typeMap = {
      manual: {label: '手动发送', color: 'bg-blue-100 text-blue-700'},
      scheduled: {label: '定时发送', color: 'bg-purple-100 text-purple-700'},
      auto: {label: '自动提醒', color: 'bg-green-100 text-green-700'}
    }
    return typeMap[type] || typeMap.manual
  }

  // 过滤记录
  const filteredRecords = records.filter((r) => {
    if (filter === 'all') return true
    return r.notification_type === filter
  })

  return (
    <View style={{background: 'linear-gradient(to bottom, #d1fae5, #a7f3d0)', minHeight: '100vh'}}>
      {/* 顶部导航栏 */}
      <TopNavBar />
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 筛选器 */}
          <View className="bg-white rounded-xl p-3 mb-4 shadow-sm">
            <View className="grid grid-cols-4 gap-2">
              <View
                onClick={() => setFilter('all')}
                className={`rounded-lg px-3 py-2 text-center active:scale-95 transition-all ${
                  filter === 'all' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-xs font-medium ${filter === 'all' ? 'text-white' : 'text-gray-700'}`}>全部</Text>
              </View>

              <View
                onClick={() => setFilter('manual')}
                className={`rounded-lg px-3 py-2 text-center active:scale-95 transition-all ${
                  filter === 'manual' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-xs font-medium ${filter === 'manual' ? 'text-white' : 'text-gray-700'}`}>
                  手动
                </Text>
              </View>

              <View
                onClick={() => setFilter('scheduled')}
                className={`rounded-lg px-3 py-2 text-center active:scale-95 transition-all ${
                  filter === 'scheduled' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-xs font-medium ${filter === 'scheduled' ? 'text-white' : 'text-gray-700'}`}>
                  定时
                </Text>
              </View>

              <View
                onClick={() => setFilter('auto')}
                className={`rounded-lg px-3 py-2 text-center active:scale-95 transition-all ${
                  filter === 'auto' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-xs font-medium ${filter === 'auto' ? 'text-white' : 'text-gray-700'}`}>
                  自动
                </Text>
              </View>
            </View>
          </View>

          {/* 记录列表 */}
          {filteredRecords.length === 0 ? (
            <View className="bg-white rounded-xl p-8 text-center shadow-sm">
              <View className="i-mdi-history text-6xl text-gray-300 mb-4 mx-auto" />
              <Text className="text-gray-500">暂无发送记录</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {filteredRecords.map((record) => {
                const typeBadge = getTypeBadge(record.notification_type)
                return (
                  <View key={record.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <View className="flex items-start justify-between mb-2">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-800 mb-1">{record.title}</Text>
                        <View className={`inline-block px-2 py-1 rounded ${typeBadge.color} mb-2`}>
                          <Text className="text-xs">{typeBadge.label}</Text>
                        </View>
                      </View>
                    </View>

                    <Text className="text-sm text-gray-600 mb-3 line-clamp-2">{record.content}</Text>

                    <View className="flex items-center justify-between text-xs text-gray-500">
                      <View className="flex items-center">
                        <View className="i-mdi-account-group text-base mr-1" />
                        <Text>{record.recipient_count} 人</Text>
                      </View>
                      <View className="flex items-center">
                        <View className="i-mdi-clock-outline text-base mr-1" />
                        <Text>{formatDateTime(record.sent_at)}</Text>
                      </View>
                    </View>

                    {record.sender && (
                      <View className="mt-2 pt-2 border-t border-gray-100">
                        <Text className="text-xs text-gray-500">发送人：{record.sender.name || '未知'}</Text>
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

export default NotificationRecords
