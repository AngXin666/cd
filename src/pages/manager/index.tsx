import {ScrollView, Text, View} from '@tarojs/components'
import {navigateTo, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getCurrentUserProfile, getDriverProfiles} from '@/db/api'
import type {Profile} from '@/db/types'

const ManagerHome: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [drivers, setDrivers] = useState<Profile[]>([])

  const loadData = useCallback(async () => {
    const profileData = await getCurrentUserProfile()
    setProfile(profileData)

    const driversData = await getDriverProfiles()
    setDrivers(driversData)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  const handlePieceWorkReport = () => {
    navigateTo({url: '/pages/manager/data-summary/index'})
  }

  const handlePieceWorkManagement = () => {
    navigateTo({url: '/pages/manager/piece-work/index'})
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 欢迎卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">管理员工作台</Text>
            <Text className="text-blue-100 text-sm block">欢迎，{profile?.name || profile?.phone || '管理员'}</Text>
          </View>

          {/* 统计卡片 */}
          <View className="grid grid-cols-2 gap-4 mb-4">
            <View className="bg-white rounded-lg p-4 shadow">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">司机总数</Text>
                <View className="i-mdi-account-group text-2xl text-blue-900" />
              </View>
              <Text className="text-3xl font-bold text-blue-900 block">{drivers.length}</Text>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">在线司机</Text>
                <View className="i-mdi-account-check text-2xl text-orange-600" />
              </View>
              <Text className="text-3xl font-bold text-orange-600 block">0</Text>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">今日任务</Text>
                <View className="i-mdi-clipboard-text text-2xl text-blue-900" />
              </View>
              <Text className="text-3xl font-bold text-blue-900 block">0</Text>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">车辆总数</Text>
                <View className="i-mdi-car-multiple text-2xl text-orange-600" />
              </View>
              <Text className="text-3xl font-bold text-orange-600 block">0</Text>
            </View>
          </View>

          {/* 管理功能 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">管理功能</Text>
            <View className="grid grid-cols-3 gap-4">
              <View className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <View className="i-mdi-account-multiple text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">司机管理</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                <View className="i-mdi-car text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700">车辆管理</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <View className="i-mdi-clipboard-list text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">任务分配</Text>
              </View>
              <View
                onClick={handlePieceWorkManagement}
                className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                <View className="i-mdi-clipboard-edit text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700">计件管理</Text>
              </View>
              <View onClick={handlePieceWorkReport} className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <View className="i-mdi-chart-line text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">计件报表</Text>
              </View>
              <View className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                <View className="i-mdi-alert-circle text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700">异常处理</Text>
              </View>
            </View>
          </View>

          {/* 司机列表 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">司机列表</Text>
            {drivers.length === 0 ? (
              <View className="text-center py-8">
                <View className="i-mdi-account-off text-5xl text-gray-300 mx-auto mb-2" />
                <Text className="text-sm text-gray-400 block">暂无司机</Text>
              </View>
            ) : (
              <View>
                {drivers.map((driver) => (
                  <View key={driver.id} className="flex items-center justify-between p-3 mb-2 bg-gray-50 rounded-lg">
                    <View className="flex items-center flex-1">
                      <View className="i-mdi-account-circle text-3xl text-blue-900 mr-3" />
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-800 block">{driver.name || '未设置姓名'}</Text>
                        <Text className="text-xs text-gray-500 block">
                          {driver.phone || driver.email || '无联系方式'}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-blue-100 px-2 py-1 rounded">
                      <Text className="text-xs text-blue-900">司机</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ManagerHome
