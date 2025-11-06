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
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const profileData = await getCurrentUserProfile()
    setProfile(profileData)

    const driversData = await getDriverProfiles()
    setDrivers(driversData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  const handlePieceWorkReport = () => {
    navigateTo({url: '/pages/manager/piece-work-report/index'})
  }

  const handleLeaveApproval = () => {
    navigateTo({url: '/pages/manager/leave-approval/index'})
  }

  const handleSystemSettings = () => {
    navigateTo({url: '/pages/profile/index'})
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 欢迎卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">管理员工作台</Text>
            <Text className="text-blue-100 text-sm block">欢迎回来，{profile?.name || profile?.phone || '管理员'}</Text>
          </View>

          {/* 数据统计仪表盘 */}
          <View className="mb-4">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center">
                <View className="i-mdi-view-dashboard text-xl text-blue-900 mr-2" />
                <Text className="text-lg font-bold text-gray-800">数据仪表盘</Text>
              </View>
              <Text className="text-xs text-gray-500">{new Date().toLocaleDateString('zh-CN')}</Text>
            </View>

            {loading ? (
              <View className="bg-white rounded-xl p-8 shadow-md flex items-center justify-center">
                <Text className="text-gray-500">加载中...</Text>
              </View>
            ) : (
              <View className="bg-white rounded-xl p-4 shadow-md">
                <View className="grid grid-cols-2 gap-3">
                  {/* 司机总数 */}
                  <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <View className="i-mdi-account-group text-2xl text-blue-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">司机总数</Text>
                    <Text className="text-2xl font-bold text-blue-900 block">{drivers.length}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">人</Text>
                  </View>

                  {/* 在线司机 */}
                  <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <View className="i-mdi-account-check text-2xl text-green-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">在线司机</Text>
                    <Text className="text-2xl font-bold text-green-600 block">0</Text>
                    <Text className="text-xs text-gray-400 block mt-1">人</Text>
                  </View>

                  {/* 当日总件数 */}
                  <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <View className="i-mdi-package-variant text-2xl text-purple-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">当日总件数</Text>
                    <Text className="text-2xl font-bold text-purple-900 block">0</Text>
                    <Text className="text-xs text-gray-400 block mt-1">件</Text>
                  </View>

                  {/* 请假待审批 */}
                  <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                    <View className="i-mdi-calendar-clock text-2xl text-orange-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">请假待审批</Text>
                    <Text className="text-2xl font-bold text-orange-600 block">0</Text>
                    <Text className="text-xs text-gray-400 block mt-1">条</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 快捷功能板块 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-lightning-bolt text-xl text-orange-600 mr-2" />
              <Text className="text-lg font-bold text-gray-800">快捷功能</Text>
            </View>
            <View className="grid grid-cols-3 gap-3">
              {/* 司机管理 */}
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 flex flex-col items-center">
                <View className="i-mdi-account-multiple text-3xl text-blue-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">司机管理</Text>
              </View>

              {/* 车辆管理 */}
              <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 flex flex-col items-center">
                <View className="i-mdi-car text-3xl text-green-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">车辆管理</Text>
              </View>

              {/* 任务分配 */}
              <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 flex flex-col items-center">
                <View className="i-mdi-clipboard-list text-3xl text-purple-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">任务分配</Text>
              </View>

              {/* 件数报表 */}
              <View
                onClick={handlePieceWorkReport}
                className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-chart-box text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">件数报表</Text>
              </View>

              {/* 请假审批 */}
              <View
                onClick={handleLeaveApproval}
                className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-calendar-check text-3xl text-red-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">请假审批</Text>
              </View>

              {/* 系统设置 */}
              <View
                onClick={handleSystemSettings}
                className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-cog text-3xl text-teal-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">系统设置</Text>
              </View>
            </View>
          </View>

          {/* 司机列表 */}
          <View className="bg-white rounded-xl p-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-account-group text-xl text-blue-900 mr-2" />
              <Text className="text-lg font-bold text-gray-800">司机列表</Text>
            </View>
            {drivers.length === 0 ? (
              <View className="text-center py-8">
                <View className="i-mdi-account-off text-5xl text-gray-300 mb-2" />
                <Text className="text-sm text-gray-400 block">暂无司机</Text>
              </View>
            ) : (
              <View className="space-y-2">
                {drivers.map((driver) => (
                  <View
                    key={driver.id}
                    className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 flex items-center justify-between">
                    <View className="flex items-center flex-1">
                      <View className="i-mdi-account-circle text-3xl text-blue-600 mr-3" />
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-800 block">{driver.name || '未设置姓名'}</Text>
                        <Text className="text-xs text-gray-500 block">
                          {driver.phone || driver.email || '无联系方式'}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-blue-600 px-3 py-1 rounded-full">
                      <Text className="text-xs text-white font-medium">司机</Text>
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
