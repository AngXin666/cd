import {Button, Input, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import {showLoading, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import * as UsersAPI from '@/db/api/users'

import type {Feedback, FeedbackType} from '@/db/types'

const FeedbackPage: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit')

  // 提交反馈表单
  const [typeIndex, setTypeIndex] = useState(0)
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)

  // 历史反馈列表
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])

  const feedbackTypes: {label: string; value: FeedbackType}[] = [
    {label: '功能建议', value: 'suggestion'},
    {label: '问题反馈', value: 'bug'},
    {label: '功能需求', value: 'feature'},
    {label: '投诉建议', value: 'complaint'},
    {label: '其他', value: 'other'}
  ]

  const loadFeedbackList = useCallback(async () => {
    if (!user?.id) return
    const list = await UsersAPI.getUserFeedbackList(user.id)
    setFeedbackList(list)
  }, [user?.id])

  useDidShow(() => {
    if (activeTab === 'history') {
      loadFeedbackList()
    }
  })

  // 提交反馈
  const handleSubmit = async () => {
    if (!user?.id) return

    // 验证内容
    if (!content.trim()) {
      showToast({title: '请输入反馈内容', icon: 'none'})
      return
    }

    if (content.trim().length < 10) {
      showToast({title: '反馈内容至少10个字', icon: 'none'})
      return
    }

    setLoading(true)
    showLoading({title: '提交中...'})

    const result = await UsersAPI.submitFeedback({
      user_id: user.id,
      type: feedbackTypes[typeIndex].value,
      content: content.trim(),
      contact: contact.trim() || undefined
    })

    setLoading(false)

    if (result.success) {
      showToast({title: '提交成功', icon: 'success'})
      // 清空表单
      setContent('')
      setContact('')
      setTypeIndex(0)
      // 切换到历史记录
      setTimeout(() => {
        setActiveTab('history')
        loadFeedbackList()
      }, 1500)
    } else {
      showToast({title: result.error || '提交失败', icon: 'error'})
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理'
      case 'processing':
        return '处理中'
      case 'resolved':
        return '已解决'
      default:
        return '未知'
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取类型文本
  const getTypeText = (type: string) => {
    const found = feedbackTypes.find((t) => t.value === type)
    return found?.label || '其他'
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      {/* Tab切换 */}
      <View className="bg-white px-4 py-2 flex gap-2 shadow-sm">
        <View
          className={`flex-1 py-2 rounded-lg text-center transition-all ${activeTab === 'submit' ? 'bg-blue-900' : 'bg-gray-100'}`}
          onClick={() => setActiveTab('submit')}>
          <Text className={`text-sm font-medium ${activeTab === 'submit' ? 'text-white' : 'text-gray-600'}`}>
            提交反馈
          </Text>
        </View>
        <View
          className={`flex-1 py-2 rounded-lg text-center transition-all ${activeTab === 'history' ? 'bg-blue-900' : 'bg-gray-100'}`}
          onClick={() => {
            setActiveTab('history')
            loadFeedbackList()
          }}>
          <Text className={`text-sm font-medium ${activeTab === 'history' ? 'text-white' : 'text-gray-600'}`}>
            历史反馈
          </Text>
        </View>
      </View>

      <ScrollView scrollY className="box-border" style={{height: 'calc(100vh - 60px)', background: 'transparent'}}>
        {activeTab === 'submit' ? (
          <View className="p-4">
            {/* 提示信息 */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <View className="flex items-start">
                <View className="i-mdi-information text-2xl text-blue-600 mr-2 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-sm text-blue-800 block mb-1 font-medium">反馈说明</Text>
                  <Text className="text-xs text-blue-700 block">
                    感谢您的反馈！我们会认真对待每一条意见和建议，并尽快给予回复。
                  </Text>
                </View>
              </View>
            </View>

            {/* 反馈表单 */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow">
              {/* 反馈类型 */}
              <View className="mb-4">
                <View className="flex items-center mb-2">
                  <Text className="text-sm text-gray-700">反馈类型</Text>
                  <Text className="text-xs text-red-500 ml-1">*</Text>
                </View>
                <Picker
                  mode="selector"
                  range={feedbackTypes.map((t) => t.label)}
                  value={typeIndex}
                  onChange={(e) => setTypeIndex(Number(e.detail.value))}>
                  <View className="w-full px-4 py-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <Text className="text-sm text-gray-800">{feedbackTypes[typeIndex].label}</Text>
                    <View className="i-mdi-chevron-down text-lg text-gray-400" />
                  </View>
                </Picker>
              </View>

              {/* 反馈内容 */}
              <View className="mb-4">
                <View className="flex items-center mb-2">
                  <Text className="text-sm text-gray-700">反馈内容</Text>
                  <Text className="text-xs text-red-500 ml-1">*</Text>
                </View>
                <Textarea
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                  value={content}
                  onInput={(e) => setContent(e.detail.value)}
                  placeholder="请详细描述您的问题或建议（至少10个字）"
                  maxlength={500}
                  style={{minHeight: '120px'}}
                />
                <Text className="text-xs text-gray-500 block mt-1">{content.length}/500</Text>
              </View>

              {/* 联系方式 */}
              <View>
                <Text className="text-sm text-gray-700 block mb-2">联系方式（选填）</Text>
                <Input
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                  value={contact}
                  onInput={(e) => setContact(e.detail.value)}
                  placeholder="请输入您的联系方式，方便我们回复"
                  maxlength={50}
                />
              </View>
            </View>

            {/* 提交按钮 */}
            <Button
              className="w-full text-base break-keep"
              size="default"
              style={{
                backgroundColor: '#1E3A8A',
                color: 'white',
                borderRadius: '12px',
                border: 'none',
                padding: '16px'
              }}
              onClick={handleSubmit}
              disabled={loading}>
              提交反馈
            </Button>
          </View>
        ) : (
          <View className="p-4">
            {feedbackList.length === 0 ? (
              <View className="flex flex-col items-center justify-center py-20">
                <View className="i-mdi-message-text-outline text-6xl text-gray-300 mb-4" />
                <Text className="text-sm text-gray-500">暂无反馈记录</Text>
              </View>
            ) : (
              feedbackList.map((feedback) => (
                <View key={feedback.id} className="bg-white rounded-xl p-4 mb-3 shadow">
                  {/* 头部 */}
                  <View className="flex items-center justify-between mb-3">
                    <View className="flex items-center">
                      <View className="i-mdi-tag text-lg text-blue-900 mr-2" />
                      <Text className="text-sm font-medium text-gray-800">{getTypeText(feedback.type)}</Text>
                    </View>
                    <View className={`px-2 py-1 rounded-full ${getStatusColor(feedback.status)}`}>
                      <Text className="text-xs font-medium">{getStatusText(feedback.status)}</Text>
                    </View>
                  </View>

                  {/* 内容 */}
                  <View className="mb-3">
                    <Text className="text-sm text-gray-700 leading-relaxed">{feedback.content}</Text>
                  </View>

                  {/* 联系方式 */}
                  {feedback.contact && (
                    <View className="mb-3 pb-3 border-b border-gray-100">
                      <View className="flex items-center">
                        <View className="i-mdi-phone text-sm text-gray-500 mr-1" />
                        <Text className="text-xs text-gray-500">联系方式：{feedback.contact}</Text>
                      </View>
                    </View>
                  )}

                  {/* 时间 */}
                  <View className="flex items-center">
                    <View className="i-mdi-clock-outline text-sm text-gray-400 mr-1" />
                    <Text className="text-xs text-gray-400">{formatDate(feedback.created_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default FeedbackPage
