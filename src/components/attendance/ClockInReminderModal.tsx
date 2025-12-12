/**
 * 打卡提醒弹窗组件
 * 用于提醒司机完成打卡
 */

import {Button, Text, View} from '@tarojs/components'
import type React from 'react'

interface ClockInReminderModalProps {
  // 是否显示弹窗
  visible: boolean
  // 关闭弹窗回调
  onClose: () => void
  // 点击"是"按钮回调（跳转打卡页面）
  onConfirm: () => void
  // 提示消息
  message?: string
}

const ClockInReminderModal: React.FC<ClockInReminderModalProps> = ({
  visible,
  onClose,
  onConfirm,
  message = '您今日尚未打卡，是否立即去打卡？'
}) => {
  if (!visible) {
    return null
  }

  return (
    <View className="fixed inset-0 z-50 flex items-center justify-center" style={{background: 'rgba(0, 0, 0, 0.5)'}}>
      <View className="bg-white rounded-2xl mx-8 overflow-hidden shadow-2xl" style={{maxWidth: '400px', width: '85%'}}>
        {/* 图标 */}
        <View className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 flex items-center justify-center">
          <View className="i-mdi-clock-alert text-7xl text-orange-600" />
        </View>

        {/* 内容 */}
        <View className="p-6">
          <Text className="text-xl font-bold text-gray-800 block text-center mb-3">打卡提醒</Text>
          <Text className="text-base text-gray-600 block text-center mb-6 leading-relaxed">{message}</Text>

          {/* 按钮 */}
          <View className="flex gap-3">
            <Button
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 active:bg-gray-200 transition-all text-base"
              onClick={onClose}>
              <Text className="text-gray-700 text-base">稍后再说</Text>
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl py-3 active:opacity-90 transition-all text-base"
              onClick={onConfirm}>
              <Text className="text-white text-base font-medium">立即打卡</Text>
            </Button>
          </View>
        </View>
      </View>
    </View>
  )
}

export default ClockInReminderModal
