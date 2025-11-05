import {Text, View} from '@tarojs/components'
import {reLaunch, switchTab} from '@tarojs/taro'
import {LoginPanel} from 'miaoda-auth-taro'
import type React from 'react'
import {getCurrentUserProfile} from '@/db/api'

const Login: React.FC = () => {
  const handleLoginSuccess = async () => {
    const profile = await getCurrentUserProfile()

    let path = '/pages/driver/index'
    if (profile?.role === 'super_admin') {
      path = '/pages/super-admin/index'
    } else if (profile?.role === 'manager') {
      path = '/pages/manager/index'
    }

    try {
      switchTab({url: path})
    } catch (_e) {
      reLaunch({url: path})
    }
  }

  return (
    <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #1E3A8A, #3B82F6)'}}>
      <View className="pt-16 pb-8 text-center">
        <Text className="text-3xl font-bold text-white block mb-2">车队管家</Text>
        <Text className="text-sm text-blue-100 block">专业的车队管理系统</Text>
      </View>

      <LoginPanel onLoginSuccess={handleLoginSuccess} />

      <View className="mt-8 px-6">
        <View className="bg-white bg-opacity-10 rounded-lg p-4">
          <Text className="text-xs text-white block mb-2 font-bold">测试账号：</Text>
          <View className="mb-2">
            <Text className="text-xs text-blue-100 block">司机账号：admin1 / 123456</Text>
          </View>
          <View className="mb-2">
            <Text className="text-xs text-blue-100 block">管理员账号：admin2 / 123456</Text>
          </View>
          <View>
            <Text className="text-xs text-blue-100 block">超级管理员：admin / 123456</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default Login
