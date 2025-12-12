import {Button, Input, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import type React from 'react'
import {useState} from 'react'
import {supabase} from '@/client/supabase'

interface PasswordVerifyModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  title?: string
  description?: string
}

/**
 * 密码二次验证组件
 * 用于关键操作的安全验证
 */
const PasswordVerifyModal: React.FC<PasswordVerifyModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  title = '安全验证',
  description = '此操作需要验证您的登录密码'
}) => {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // 验证密码
  const handleVerify = async () => {
    if (!password.trim()) {
      Taro.showToast({
        title: '请输入密码',
        icon: 'none',
        duration: 2000
      })
      return
    }

    try {
      setLoading(true)

      // 获取当前用户信息
      const {
        data: {user}
      } = await supabase.auth.getUser()

      if (!user?.email) {
        Taro.showToast({
          title: '无法获取用户信息',
          icon: 'none',
          duration: 2000
        })
        return
      }

      // 使用邮箱和密码验证
      const {error} = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password.trim()
      })

      if (error) {
        Taro.showToast({
          title: '密码错误',
          icon: 'none',
          duration: 2000
        })
        return
      }

      // 验证成功
      Taro.showToast({
        title: '验证成功',
        icon: 'success',
        duration: 1500
      })

      setPassword('')
      onSuccess()
    } catch (_error) {
      Taro.showToast({
        title: '验证失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }

  // 取消验证
  const handleCancel = () => {
    setPassword('')
    onCancel()
  }

  if (!visible) return null

  return (
    <View className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <View className="bg-white rounded-lg p-6 m-6 w-full max-w-md">
        {/* 标题 */}
        <View className="flex items-center mb-4">
          <View className="i-mdi-shield-lock text-3xl text-red-600 mr-2"></View>
          <Text className="text-gray-800 text-lg font-bold">{title}</Text>
        </View>

        {/* 描述 */}
        <Text className="text-gray-600 text-sm block mb-4">{description}</Text>

        {/* 密码输入 */}
        <View className="mb-6">
          <Text className="text-gray-700 text-sm block mb-2">登录密码</Text>
          <Input
            className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-200"
            password
            placeholder="请输入您的登录密码"
            value={password}
            onInput={(e) => setPassword(e.detail.value)}
            disabled={loading}
          />
        </View>

        {/* 按钮组 */}
        <View className="flex gap-3">
          <Button
            size="default"
            className="flex-1 bg-gray-200 text-gray-700 text-base break-keep"
            onClick={handleCancel}
            disabled={loading}>
            取消
          </Button>
          <Button
            size="default"
            className="flex-1 bg-red-600 text-white text-base break-keep"
            onClick={handleVerify}
            disabled={loading}>
            {loading ? '验证中...' : '确认'}
          </Button>
        </View>
      </View>
    </View>
  )
}

export default PasswordVerifyModal
