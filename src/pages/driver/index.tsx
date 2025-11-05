import {ScrollView, Text, View} from '@tarojs/components'
import {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getCurrentUserProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const DriverHome: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async () => {
    const data = await getCurrentUserProfile()
    setProfile(data)
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useDidShow(() => {
    loadProfile()
  })

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 欢迎卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">司机工作台</Text>
            <Text className="text-blue-100 text-sm block">欢迎回来，{profile?.name || profile?.phone || '司机'}</Text>
          </View>

          {/* 个人信息卡片 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center mb-4">
              <View className="i-mdi-account-circle text-5xl text-blue-900 mr-4" />
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800 block mb-1">{profile?.name || '未设置姓名'}</Text>
                <Text className="text-sm text-gray-500 block">
                  {profile?.phone || profile?.email || '未设置联系方式'}
                </Text>
              </View>
            </View>
            <View className="border-t border-gray-200 pt-3">
              <View className="flex justify-between items-center mb-2">
                <Text className="text-sm text-gray-600">角色</Text>
                <Text className="text-sm font-medium text-blue-900">司机</Text>
              </View>
              <View className="flex justify-between items-center">
                <Text className="text-sm text-gray-600">用户ID</Text>
                <Text className="text-xs text-gray-400">{user?.id?.substring(0, 8)}...</Text>
              </View>
            </View>
          </View>

          {/* 功能卡片 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">快捷功能</Text>
            <View className="grid grid-cols-3 gap-4">
              <View className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <View className="i-mdi-car text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">车辆信息</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                <View className="i-mdi-map-marker text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700">行程记录</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <View className="i-mdi-calendar-clock text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">工作日程</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                <View className="i-mdi-file-document text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700">任务单</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <View className="i-mdi-gas-station text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">加油记录</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                <View className="i-mdi-wrench text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700">维修保养</Text>
              </View>
            </View>
          </View>

          {/* 今日统计 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">今日统计</Text>
            <View className="grid grid-cols-2 gap-4">
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <Text className="text-sm text-gray-600 block mb-1">行驶里程</Text>
                <Text className="text-2xl font-bold text-blue-900 block">0 km</Text>
              </View>
              <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <Text className="text-sm text-gray-600 block mb-1">完成任务</Text>
                <Text className="text-2xl font-bold text-orange-600 block">0 单</Text>
              </View>
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <Text className="text-sm text-gray-600 block mb-1">工作时长</Text>
                <Text className="text-2xl font-bold text-blue-900 block">0 h</Text>
              </View>
              <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <Text className="text-sm text-gray-600 block mb-1">油耗统计</Text>
                <Text className="text-2xl font-bold text-orange-600 block">0 L</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverHome
