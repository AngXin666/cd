import {ScrollView, Text, View} from '@tarojs/components'
import {navigateTo, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getCurrentUserProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const SettingsPage: React.FC = () => {
  useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async () => {
    const data = await getCurrentUserProfile()
    setProfile(data)
  }, [])

  useDidShow(() => {
    loadProfile()
  })

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 账户与安全 */}
          <View className="bg-white rounded-xl mb-4 shadow overflow-hidden">
            <View className="px-4 py-3 border-b border-gray-100">
              <Text className="text-base font-bold text-gray-800">账户与安全</Text>
            </View>

            {/* 账号管理 - 仅老板和超级管理员显示 */}
            {(profile?.role === 'BOSS' || profile?.role === 'MANAGER') && (
              <View
                className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 transition-all"
                onClick={() => navigateTo({url: '/pages/profile/account-management/index'})}>
                <View className="flex items-center">
                  <View className="i-mdi-account-multiple-plus text-2xl text-blue-900 mr-3" />
                  <View>
                    <Text className="text-sm text-gray-800 block mb-1">账号管理</Text>
                    <Text className="text-xs text-gray-500">管理主账号和平级账号</Text>
                  </View>
                </View>
                <View className="i-mdi-chevron-right text-xl text-gray-400" />
              </View>
            )}

            {/* 修改手机号 */}
            <View
              className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 transition-all"
              onClick={() => navigateTo({url: '/pages/profile/change-phone/index'})}>
              <View className="flex items-center">
                <View className="i-mdi-phone-settings text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">修改手机号</Text>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>

            {/* 修改密码 */}
            <View
              className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 transition-all"
              onClick={() => navigateTo({url: '/pages/profile/change-password/index'})}>
              <View className="flex items-center">
                <View className="i-mdi-lock-reset text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">修改密码</Text>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>

            {/* 账户安全 */}
            <View className="flex items-center justify-between p-4">
              <View className="flex items-center">
                <View className="i-mdi-shield-check text-2xl text-blue-900 mr-3" />
                <View>
                  <Text className="text-sm text-gray-800 block mb-1">账户安全</Text>
                  <Text className="text-xs text-gray-500">您的账户安全等级：高</Text>
                </View>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>
          </View>

          {/* 关于 */}
          <View className="bg-white rounded-xl mb-4 shadow overflow-hidden">
            <View className="px-4 py-3 border-b border-gray-100">
              <Text className="text-base font-bold text-gray-800">关于</Text>
            </View>

            {/* 关于我们 */}
            <View className="flex items-center justify-between p-4 border-b border-gray-100">
              <View className="flex items-center">
                <View className="i-mdi-information text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">关于我们</Text>
              </View>
              <View className="flex items-center">
                <Text className="text-xs text-gray-500 mr-2">v1.0.0</Text>
                <View className="i-mdi-chevron-right text-xl text-gray-400" />
              </View>
            </View>

            {/* 用户协议 */}
            <View className="flex items-center justify-between p-4 border-b border-gray-100">
              <View className="flex items-center">
                <View className="i-mdi-file-document text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">用户协议</Text>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>

            {/* 隐私政策 */}
            <View className="flex items-center justify-between p-4">
              <View className="flex items-center">
                <View className="i-mdi-shield-lock text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">隐私政策</Text>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>
          </View>

          {/* 应用信息 */}
          <View className="bg-white rounded-xl shadow p-4">
            <View className="flex flex-col items-center">
              <View className="i-mdi-truck text-5xl text-blue-900 mb-3" />
              <Text className="text-base font-bold text-gray-800 block mb-1">车队管家</Text>
              <Text className="text-xs text-gray-500 block mb-3">专业的车队管理小程序</Text>
              <Text className="text-xs text-gray-400">© 2025 车队管家 All Rights Reserved</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default SettingsPage
