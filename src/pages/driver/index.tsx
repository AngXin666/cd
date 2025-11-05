import {ScrollView, Text, View} from '@tarojs/components'
import {navigateTo, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getCurrentUserProfile, getDriverWarehouses} from '@/db/api'
import type {Profile, Warehouse} from '@/db/types'

const DriverHome: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  const loadProfile = useCallback(async () => {
    const data = await getCurrentUserProfile()
    setProfile(data)
  }, [])

  const loadWarehouses = useCallback(async () => {
    if (!user?.id) return
    const data = await getDriverWarehouses(user.id)
    setWarehouses(data)
  }, [user?.id])

  useEffect(() => {
    loadProfile()
    loadWarehouses()
  }, [loadProfile, loadWarehouses])

  useDidShow(() => {
    loadProfile()
    loadWarehouses()
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

          {/* 所属仓库卡片 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-warehouse text-xl text-blue-900 mr-2" />
              <Text className="text-lg font-bold text-gray-800">所属仓库</Text>
            </View>
            {warehouses.length > 0 ? (
              <View className="space-y-2">
                {warehouses.map((warehouse) => (
                  <View
                    key={warehouse.id}
                    className="flex items-center bg-blue-50 rounded-lg p-3"
                    onClick={() =>
                      navigateTo({url: `/pages/driver/warehouse-stats/index?warehouseId=${warehouse.id}`})
                    }>
                    <View className="i-mdi-map-marker text-blue-600 text-xl mr-2" />
                    <Text className="text-gray-800 text-sm flex-1">{warehouse.name}</Text>
                    <View className={`px-2 py-1 rounded mr-2 ${warehouse.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Text className={`text-xs ${warehouse.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                        {warehouse.is_active ? '启用中' : '已禁用'}
                      </Text>
                    </View>
                    <View className="i-mdi-chevron-right text-gray-400 text-xl" />
                  </View>
                ))}
              </View>
            ) : (
              <View className="text-center py-6">
                <View className="i-mdi-alert-circle text-gray-300 text-4xl mb-2" />
                <Text className="text-gray-400 text-sm block">暂未分配仓库</Text>
                <Text className="text-gray-400 text-xs block mt-1">请联系管理员分配仓库</Text>
              </View>
            )}
          </View>

          {/* 功能卡片 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">快捷功能</Text>
            <View className="grid grid-cols-3 gap-4">
              <View className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <View className="i-mdi-car text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">车辆信息</Text>
              </View>
              <View
                className="flex flex-col items-center p-3 bg-orange-50 rounded-lg"
                onClick={() => navigateTo({url: '/pages/driver/clock-in/index'})}>
                <View className="i-mdi-clock-check text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700">上下班打卡</Text>
              </View>
              <View
                className="flex flex-col items-center p-3 bg-blue-50 rounded-lg"
                onClick={() => navigateTo({url: '/pages/driver/attendance/index'})}>
                <View className="i-mdi-calendar-month text-3xl text-blue-900 mb-2" />
                <Text className="text-xs text-gray-700">当月考勤</Text>
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
