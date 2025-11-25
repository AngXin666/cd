import {Button, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import {navigateTo, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  createNotificationSendRecord,
  createScheduledNotification,
  getAllDriverIds,
  getAllWarehouses,
  getDriversByWarehouse,
  getNotificationTemplates,
  sendNotificationToDrivers
} from '@/db/api'
import type {NotificationTemplate, Profile, Warehouse} from '@/db/types'

/**
 * 司机通知发送页面
 * 支持立即发送和定时发送
 */
const DriverNotification: React.FC = () => {
  const {user} = useAuth({guard: true})

  // 通知内容
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // 目标选择
  const [targetType, setTargetType] = useState<'all' | 'warehouse' | 'specific'>('all')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([])

  // 发送方式
  const [sendType, setSendType] = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // 数据
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])

  // 加载状态
  const [loading, setLoading] = useState(false)

  // 加载模板
  const loadTemplates = useCallback(async () => {
    const data = await getNotificationTemplates()
    setTemplates(data)
  }, [])

  // 加载仓库
  const loadWarehouses = useCallback(async () => {
    const data = await getAllWarehouses()
    setWarehouses(data)
  }, [])

  // 加载司机
  const loadDrivers = useCallback(async () => {
    if (targetType === 'warehouse' && selectedWarehouseId) {
      const data = await getDriversByWarehouse(selectedWarehouseId)
      setDrivers(data)
    } else if (targetType === 'specific') {
      // 加载所有司机供选择
      const allDrivers = await getDriversByWarehouse('')
      setDrivers(allDrivers)
    }
  }, [targetType, selectedWarehouseId])

  useEffect(() => {
    loadDrivers()
  }, [loadDrivers])

  useDidShow(() => {
    loadTemplates()
    loadWarehouses()
  })

  // 使用模板
  const handleUseTemplate = (template: NotificationTemplate) => {
    setTitle(template.title)
    setContent(template.content)
    showToast({title: '已应用模板', icon: 'success'})
  }

  // 计算接收人数
  const _getRecipientCount = useCallback(async () => {
    if (targetType === 'all') {
      const allDriverIds = await getAllDriverIds()
      return allDriverIds.length
    } else if (targetType === 'warehouse' && selectedWarehouseId) {
      return drivers.length
    } else if (targetType === 'specific') {
      return selectedDriverIds.length
    }
    return 0
  }, [targetType, selectedWarehouseId, drivers, selectedDriverIds])

  // 发送通知
  const handleSend = async () => {
    // 验证
    if (!title.trim()) {
      showToast({title: '请输入通知标题', icon: 'none'})
      return
    }
    if (!content.trim()) {
      showToast({title: '请输入通知内容', icon: 'none'})
      return
    }

    if (targetType === 'warehouse' && !selectedWarehouseId) {
      showToast({title: '请选择仓库', icon: 'none'})
      return
    }

    if (targetType === 'specific' && selectedDriverIds.length === 0) {
      showToast({title: '请选择司机', icon: 'none'})
      return
    }

    if (sendType === 'scheduled') {
      if (!scheduledDate || !scheduledTime) {
        showToast({title: '请选择发送时间', icon: 'none'})
        return
      }
    }

    setLoading(true)

    try {
      if (sendType === 'immediate') {
        // 立即发送
        let driverIds: string[] = []

        if (targetType === 'all') {
          driverIds = await getAllDriverIds()
        } else if (targetType === 'warehouse' && selectedWarehouseId) {
          driverIds = drivers.map((d) => d.id)
        } else if (targetType === 'specific') {
          driverIds = selectedDriverIds
        }

        if (driverIds.length === 0) {
          showToast({title: '没有找到接收人', icon: 'none'})
          return
        }

        // 发送通知
        const success = await sendNotificationToDrivers(driverIds, title, content)

        if (success) {
          // 记录发送记录
          await createNotificationSendRecord({
            notification_type: 'manual',
            title,
            content,
            recipient_count: driverIds.length,
            target_type: targetType,
            target_ids: targetType === 'warehouse' ? [selectedWarehouseId] : driverIds,
            sent_by: user?.id,
            related_notification_id: null
          })

          showToast({title: `成功发送给 ${driverIds.length} 位司机`, icon: 'success'})

          // 清空表单
          setTitle('')
          setContent('')
          setSelectedWarehouseId('')
          setSelectedDriverIds([])
        } else {
          showToast({title: '发送失败', icon: 'error'})
        }
      } else {
        // 定时发送
        const sendTime = `${scheduledDate} ${scheduledTime}:00`

        let targetIds: string[] = []
        if (targetType === 'warehouse') {
          targetIds = [selectedWarehouseId]
        } else if (targetType === 'specific') {
          targetIds = selectedDriverIds
        }

        const result = await createScheduledNotification({
          title,
          content,
          send_time: sendTime,
          target_type: targetType,
          target_ids: targetIds,
          created_by: user?.id
        })

        if (result) {
          showToast({title: '定时通知已创建', icon: 'success'})

          // 清空表单
          setTitle('')
          setContent('')
          setSelectedWarehouseId('')
          setSelectedDriverIds([])
          setScheduledDate('')
          setScheduledTime('')
        } else {
          showToast({title: '创建失败', icon: 'error'})
        }
      }
    } catch (error) {
      console.error('发送通知失败:', error)
      showToast({title: '操作失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 快捷模板 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <View className="flex items-center mb-3">
              <View className="i-mdi-file-document-multiple text-xl text-blue-600 mr-2" />
              <Text className="text-base font-bold text-gray-800">快捷模板</Text>
              <View className="flex-1" />
              <View
                onClick={() => navigateTo({url: '/pages/shared/notification-templates/index'})}
                className="flex items-center">
                <Text className="text-sm text-blue-600 mr-1">管理</Text>
                <View className="i-mdi-chevron-right text-lg text-blue-600" />
              </View>
            </View>

            {templates.length === 0 ? (
              <Text className="text-sm text-gray-500 text-center py-4">暂无模板</Text>
            ) : (
              <ScrollView scrollX className="whitespace-nowrap">
                <View className="flex gap-2">
                  {templates.slice(0, 5).map((template) => (
                    <View
                      key={template.id}
                      onClick={() => handleUseTemplate(template)}
                      className="inline-block bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-4 py-2 active:scale-95 transition-all">
                      <Text className="text-sm text-blue-900 font-medium">{template.title}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* 通知内容 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <View className="flex items-center mb-3">
              <View className="i-mdi-message-text text-xl text-green-600 mr-2" />
              <Text className="text-base font-bold text-gray-800">通知内容</Text>
            </View>

            <View className="mb-3">
              <Text className="text-sm text-gray-700 mb-2">标题</Text>
              <View style={{overflow: 'hidden'}}>
                <Textarea
                  value={title}
                  onInput={(e) => setTitle(e.detail.value)}
                  placeholder="请输入通知标题"
                  maxlength={50}
                  className="bg-gray-50 text-foreground px-3 py-2 rounded border border-border w-full"
                  style={{height: '60px'}}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm text-gray-700 mb-2">内容</Text>
              <View style={{overflow: 'hidden'}}>
                <Textarea
                  value={content}
                  onInput={(e) => setContent(e.detail.value)}
                  placeholder="请输入通知内容"
                  maxlength={500}
                  className="bg-gray-50 text-foreground px-3 py-2 rounded border border-border w-full"
                  style={{height: '120px'}}
                />
              </View>
            </View>
          </View>

          {/* 接收对象 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <View className="flex items-center mb-3">
              <View className="i-mdi-account-group text-xl text-purple-600 mr-2" />
              <Text className="text-base font-bold text-gray-800">接收对象</Text>
            </View>

            <View className="flex gap-2 mb-3">
              <View
                onClick={() => setTargetType('all')}
                className={`flex-1 rounded-lg px-4 py-3 text-center active:scale-95 transition-all ${
                  targetType === 'all' ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-sm font-medium ${targetType === 'all' ? 'text-white' : 'text-gray-700'}`}>
                  全部司机
                </Text>
              </View>

              <View
                onClick={() => setTargetType('warehouse')}
                className={`flex-1 rounded-lg px-4 py-3 text-center active:scale-95 transition-all ${
                  targetType === 'warehouse' ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-sm font-medium ${targetType === 'warehouse' ? 'text-white' : 'text-gray-700'}`}>
                  指定仓库
                </Text>
              </View>

              <View
                onClick={() => setTargetType('specific')}
                className={`flex-1 rounded-lg px-4 py-3 text-center active:scale-95 transition-all ${
                  targetType === 'specific' ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-sm font-medium ${targetType === 'specific' ? 'text-white' : 'text-gray-700'}`}>
                  指定司机
                </Text>
              </View>
            </View>

            {targetType === 'warehouse' && (
              <View>
                <Text className="text-sm text-gray-700 mb-2">选择仓库</Text>
                <Picker
                  mode="selector"
                  range={warehouses}
                  rangeKey="name"
                  value={warehouses.findIndex((w) => w.id === selectedWarehouseId)}
                  onChange={(e) => {
                    const index = e.detail.value
                    setSelectedWarehouseId(warehouses[index]?.id || '')
                  }}>
                  <View className="bg-gray-50 px-3 py-3 rounded border border-border flex items-center justify-between">
                    <Text className="text-sm text-gray-700">
                      {selectedWarehouseId ? warehouses.find((w) => w.id === selectedWarehouseId)?.name : '请选择仓库'}
                    </Text>
                    <View className="i-mdi-chevron-down text-lg text-gray-500" />
                  </View>
                </Picker>
              </View>
            )}

            {targetType === 'specific' && (
              <View>
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-700">选择司机</Text>
                  <Text className="text-xs text-gray-500">已选 {selectedDriverIds.length} 人</Text>
                </View>
                <View
                  onClick={() =>
                    navigateTo({
                      url: '/pages/shared/driver-selector/index?multiple=true'
                    })
                  }
                  className="bg-gray-50 px-3 py-3 rounded border border-border flex items-center justify-between active:bg-gray-100">
                  <Text className="text-sm text-gray-700">
                    {selectedDriverIds.length > 0 ? `已选择 ${selectedDriverIds.length} 位司机` : '点击选择司机'}
                  </Text>
                  <View className="i-mdi-chevron-right text-lg text-gray-500" />
                </View>
              </View>
            )}
          </View>

          {/* 发送方式 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <View className="flex items-center mb-3">
              <View className="i-mdi-clock-outline text-xl text-orange-600 mr-2" />
              <Text className="text-base font-bold text-gray-800">发送方式</Text>
            </View>

            <View className="flex gap-2 mb-3">
              <View
                onClick={() => setSendType('immediate')}
                className={`flex-1 rounded-lg px-4 py-3 text-center active:scale-95 transition-all ${
                  sendType === 'immediate' ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-sm font-medium ${sendType === 'immediate' ? 'text-white' : 'text-gray-700'}`}>
                  立即发送
                </Text>
              </View>

              <View
                onClick={() => setSendType('scheduled')}
                className={`flex-1 rounded-lg px-4 py-3 text-center active:scale-95 transition-all ${
                  sendType === 'scheduled' ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gray-100'
                }`}>
                <Text className={`text-sm font-medium ${sendType === 'scheduled' ? 'text-white' : 'text-gray-700'}`}>
                  定时发送
                </Text>
              </View>
            </View>

            {sendType === 'scheduled' && (
              <View>
                <View className="mb-3">
                  <Text className="text-sm text-gray-700 mb-2">发送日期</Text>
                  <Picker mode="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.detail.value)}>
                    <View className="bg-gray-50 px-3 py-3 rounded border border-border flex items-center justify-between">
                      <Text className="text-sm text-gray-700">{scheduledDate || '请选择日期'}</Text>
                      <View className="i-mdi-calendar text-lg text-gray-500" />
                    </View>
                  </Picker>
                </View>

                <View>
                  <Text className="text-sm text-gray-700 mb-2">发送时间</Text>
                  <Picker mode="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.detail.value)}>
                    <View className="bg-gray-50 px-3 py-3 rounded border border-border flex items-center justify-between">
                      <Text className="text-sm text-gray-700">{scheduledTime || '请选择时间'}</Text>
                      <View className="i-mdi-clock text-lg text-gray-500" />
                    </View>
                  </Picker>
                </View>
              </View>
            )}
          </View>

          {/* 发送按钮 */}
          <View className="mb-4">
            <Button
              onClick={handleSend}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl break-keep text-base font-bold"
              size="default">
              {loading ? '发送中...' : sendType === 'immediate' ? '立即发送' : '创建定时通知'}
            </Button>
          </View>

          {/* 快捷入口 */}
          <View className="grid grid-cols-2 gap-3">
            <View
              onClick={() => navigateTo({url: '/pages/shared/scheduled-notifications/index'})}
              className="bg-white rounded-xl p-4 flex flex-col items-center active:scale-95 transition-all shadow-sm">
              <View className="i-mdi-calendar-clock text-3xl text-blue-600 mb-2" />
              <Text className="text-sm text-gray-700 font-medium">定时通知</Text>
            </View>

            <View
              onClick={() => navigateTo({url: '/pages/shared/notification-records/index'})}
              className="bg-white rounded-xl p-4 flex flex-col items-center active:scale-95 transition-all shadow-sm">
              <View className="i-mdi-history text-3xl text-green-600 mb-2" />
              <Text className="text-sm text-gray-700 font-medium">发送记录</Text>
            </View>

            <View
              onClick={() => navigateTo({url: '/pages/shared/auto-reminder-rules/index'})}
              className="bg-white rounded-xl p-4 flex flex-col items-center active:scale-95 transition-all shadow-sm">
              <View className="i-mdi-bell-ring text-3xl text-purple-600 mb-2" />
              <Text className="text-sm text-gray-700 font-medium">自动提醒</Text>
            </View>

            <View
              onClick={() => navigateTo({url: '/pages/shared/notification-templates/index'})}
              className="bg-white rounded-xl p-4 flex flex-col items-center active:scale-95 transition-all shadow-sm">
              <View className="i-mdi-file-document text-3xl text-orange-600 mb-2" />
              <Text className="text-sm text-gray-700 font-medium">模板管理</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverNotification
