import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import {hideLoading, navigateBack, showLoading, showToast} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import * as UsersAPI from '@/db/api/users'

import TopNavBar from '@/components/TopNavBar'
const ChangePasswordPage: React.FC = () => {
  useAuth({guard: true})

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // 密码强度检查
  const checkPasswordStrength = (password: string) => {
    if (password.length < 8) {
      return {valid: false, message: '密码长度至少8位'}
    }
    if (!/[a-zA-Z]/.test(password)) {
      return {valid: false, message: '密码必须包含字母'}
    }
    if (!/\d/.test(password)) {
      return {valid: false, message: '密码必须包含数字'}
    }
    return {valid: true, message: '密码强度：强'}
  }

  // 获取密码强度颜色
  const getStrengthColor = (password: string) => {
    if (password.length === 0) return 'bg-gray-200'
    const strength = checkPasswordStrength(password)
    if (!strength.valid) return 'bg-red-500'
    return 'bg-green-500'
  }

  // 提交修改
  const handleSubmit = async () => {
    // 验证旧密码
    if (!oldPassword) {
      showToast({title: '请输入原密码', icon: 'none'})
      return
    }

    // 验证新密码
    if (!newPassword) {
      showToast({title: '请输入新密码', icon: 'none'})
      return
    }

    const strength = checkPasswordStrength(newPassword)
    if (!strength.valid) {
      showToast({title: strength.message, icon: 'none'})
      return
    }

    // 验证确认密码
    if (newPassword !== confirmPassword) {
      showToast({title: '两次输入的密码不一致', icon: 'none'})
      return
    }

    // 验证新旧密码不能相同
    if (oldPassword === newPassword) {
      showToast({title: '新密码不能与原密码相同', icon: 'none'})
      return
    }

    setLoading(true)
    showLoading({title: '修改中...'})

    try {
      const result = await UsersAPI.changePassword(newPassword)
      hideLoading()
      setLoading(false)

      if (result.success) {
        showToast({title: '密码修改成功', icon: 'success', duration: 2000})
        setTimeout(() => {
          navigateBack()
        }, 1500)
      } else {
        showToast({
          title: result.error || '密码修改失败，请稍后重试',
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      hideLoading()
      setLoading(false)
      console.error('修改密码异常:', error)
      showToast({
        title: '密码修改失败，请稍后重试',
        icon: 'none',
        duration: 3000
      })
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      {/* 顶部导航栏 */}
      <TopNavBar />
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 提示信息 */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <View className="flex items-start">
              <View className="i-mdi-information text-2xl text-blue-600 mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm text-blue-800 block mb-1 font-medium">密码要求</Text>
                <Text className="text-xs text-blue-700 block">• 长度至少8位</Text>
                <Text className="text-xs text-blue-700 block">• 必须包含字母和数字</Text>
                <Text className="text-xs text-blue-700 block">• 建议使用大小写字母、数字和符号组合</Text>
              </View>
            </View>
          </View>

          {/* 修改密码表单 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow">
            {/* 原密码 */}
            <View className="mb-4">
              <View className="flex items-center mb-2">
                <Text className="text-sm text-gray-700">原密码</Text>
                <Text className="text-xs text-red-500 ml-1">*</Text>
              </View>
              <Input
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={oldPassword}
                onInput={(e) => setOldPassword(e.detail.value)}
                placeholder="请输入原密码"
                password
                maxlength={32}
              />
            </View>

            {/* 新密码 */}
            <View className="mb-4">
              <View className="flex items-center mb-2">
                <Text className="text-sm text-gray-700">新密码</Text>
                <Text className="text-xs text-red-500 ml-1">*</Text>
              </View>
              <Input
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={newPassword}
                onInput={(e) => setNewPassword(e.detail.value)}
                placeholder="请输入新密码"
                password
                maxlength={32}
              />
              {/* 密码强度指示器 */}
              {newPassword && (
                <View className="mt-2">
                  <View className="flex items-center justify-between mb-1">
                    <Text className="text-xs text-gray-600">密码强度</Text>
                    <Text
                      className={`text-xs ${checkPasswordStrength(newPassword).valid ? 'text-green-600' : 'text-red-600'}`}>
                      {checkPasswordStrength(newPassword).message}
                    </Text>
                  </View>
                  <View className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <View
                      className={`h-full ${getStrengthColor(newPassword)} transition-all`}
                      style={{width: '100%'}}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* 确认新密码 */}
            <View>
              <View className="flex items-center mb-2">
                <Text className="text-sm text-gray-700">确认新密码</Text>
                <Text className="text-xs text-red-500 ml-1">*</Text>
              </View>
              <Input
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={confirmPassword}
                onInput={(e) => setConfirmPassword(e.detail.value)}
                placeholder="请再次输入新密码"
                password
                maxlength={32}
              />
              {/* 密码匹配提示 */}
              {confirmPassword && (
                <View className="mt-2">
                  {newPassword === confirmPassword ? (
                    <View className="flex items-center">
                      <View className="i-mdi-check-circle text-base text-green-600 mr-1" />
                      <Text className="text-xs text-green-600">密码匹配</Text>
                    </View>
                  ) : (
                    <View className="flex items-center">
                      <View className="i-mdi-close-circle text-base text-red-600 mr-1" />
                      <Text className="text-xs text-red-600">密码不匹配</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* 安全提示 */}
          <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <View className="flex items-start">
              <View className="i-mdi-alert text-2xl text-yellow-600 mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm text-yellow-800 block mb-1 font-medium">安全提示</Text>
                <Text className="text-xs text-yellow-700 block">修改密码后，您需要重新登录</Text>
              </View>
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
            确认修改
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

export default ChangePasswordPage
