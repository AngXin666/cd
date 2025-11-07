import {Button, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showModal, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {type DashboardStats, getCurrentUserProfile, getManagerWarehouses, getWarehouseDashboardStats} from '@/db/api'
import type {Profile, Warehouse} from '@/db/types'

const ManagerHome: React.FC = () => {
  const {user, logout} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)

  // 加载仪表盘数据
  const loadDashboardData = useCallback(async (warehouseId: string) => {
    setLoading(true)
    const stats = await getWarehouseDashboardStats(warehouseId)
    setDashboardStats(stats)
    setLoading(false)
  }, [])

  // 加载管理员负责的仓库列表
  const loadWarehouses = useCallback(async () => {
    if (!user?.id) return

    const warehousesData = await getManagerWarehouses(user.id)
    setWarehouses(warehousesData)

    // 如果有仓库，加载第一个仓库的数据
    if (warehousesData.length > 0) {
      loadDashboardData(warehousesData[0].id)
    }
  }, [user?.id, loadDashboardData])

  // 加载用户资料
  const loadProfile = useCallback(async () => {
    const profileData = await getCurrentUserProfile()
    setProfile(profileData)
  }, [])

  useEffect(() => {
    loadProfile()
    loadWarehouses()
  }, [loadProfile, loadWarehouses])

  useDidShow(() => {
    loadProfile()
    loadWarehouses()
  })

  // 处理仓库切换
  const handleWarehouseChange = useCallback(
    (e: any) => {
      const index = e.detail.current
      setCurrentWarehouseIndex(index)
      if (warehouses[index]) {
        loadDashboardData(warehouses[index].id)
      }
    },
    [warehouses, loadDashboardData]
  )

  const handlePieceWorkReport = () => {
    navigateTo({url: '/pages/manager/piece-work-report/index'})
  }

  const handleLeaveApproval = () => {
    navigateTo({url: '/pages/manager/leave-approval/index'})
  }

  const handleWarehouseCategories = () => {
    // 获取当前选中的仓库
    const currentWarehouse = warehouses[currentWarehouseIndex]
    if (currentWarehouse) {
      navigateTo({
        url: `/pages/manager/warehouse-categories/index?warehouseId=${currentWarehouse.id}&warehouseName=${encodeURIComponent(currentWarehouse.name)}`
      })
    }
  }

  const handleProfileClick = () => {
    navigateTo({url: '/pages/profile/index'})
  }

  const handleLogout = async () => {
    const res = await showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      cancelText: '取消'
    })

    if (res.confirm) {
      logout()
      Taro.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 2000
      })
    }
  }

  // 如果没有分配仓库，显示提示
  if (warehouses.length === 0 && !loading) {
    return (
      <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
        <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
          <View className="p-4">
            {/* 欢迎卡片 */}
            <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-6 mb-4 shadow-lg">
              <Text className="text-white text-2xl font-bold block mb-2">管理员工作台</Text>
              <Text className="text-blue-100 text-sm block">
                欢迎回来，{profile?.name || profile?.phone || '管理员'}
              </Text>
            </View>

            {/* 无仓库提示 */}
            <View className="bg-white rounded-xl p-8 shadow-md text-center">
              <View className="i-mdi-warehouse-off text-6xl text-gray-300 mb-4" />
              <Text className="text-lg font-bold text-gray-700 block mb-2">暂无分配仓库</Text>
              <Text className="text-sm text-gray-500 block">请联系超级管理员为您分配仓库</Text>
            </View>

            {/* 退出登录按钮 */}
            <View className="mt-4">
              <Button
                size="default"
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl h-12 text-base font-bold break-keep shadow-md"
                onClick={handleLogout}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-logout text-xl mr-2" />
                  <Text className="text-base font-bold">退出登录</Text>
                </View>
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    )
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

          {/* 仓库切换器 */}
          {warehouses.length > 1 && (
            <View className="mb-4">
              <View className="flex items-center mb-2">
                <View className="i-mdi-warehouse text-lg text-blue-900 mr-2" />
                <Text className="text-sm font-bold text-gray-700">选择仓库</Text>
                <Text className="text-xs text-gray-400 ml-2">
                  ({currentWarehouseIndex + 1}/{warehouses.length})
                </Text>
              </View>
              <View className="bg-white rounded-xl shadow-md overflow-hidden">
                <Swiper
                  className="h-16"
                  current={currentWarehouseIndex}
                  onChange={handleWarehouseChange}
                  indicatorDots
                  indicatorColor="rgba(0, 0, 0, 0.2)"
                  indicatorActiveColor="#1E3A8A">
                  {warehouses.map((warehouse) => (
                    <SwiperItem key={warehouse.id}>
                      <View className="h-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100">
                        <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                        <Text className="text-lg font-bold text-blue-900">{warehouse.name}</Text>
                      </View>
                    </SwiperItem>
                  ))}
                </Swiper>
              </View>
            </View>
          )}

          {/* 单个仓库显示 */}
          {warehouses.length === 1 && (
            <View className="mb-4">
              <View className="bg-white rounded-xl p-4 shadow-md">
                <View className="flex items-center justify-center">
                  <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                  <Text className="text-lg font-bold text-blue-900">{warehouses[0].name}</Text>
                </View>
              </View>
            </View>
          )}

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
            ) : dashboardStats ? (
              <View className="bg-white rounded-xl p-4 shadow-md">
                <View className="grid grid-cols-2 gap-3">
                  {/* 今日出勤 */}
                  <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <View className="i-mdi-account-check text-2xl text-blue-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">今日出勤</Text>
                    <Text className="text-2xl font-bold text-blue-900 block">{dashboardStats.todayAttendance}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">人</Text>
                  </View>

                  {/* 当日总件数 */}
                  <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <View className="i-mdi-package-variant text-2xl text-green-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">当日总件数</Text>
                    <Text className="text-2xl font-bold text-green-600 block">{dashboardStats.todayPieceCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">件</Text>
                  </View>

                  {/* 请假待审批 */}
                  <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                    <View className="i-mdi-calendar-clock text-2xl text-orange-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">请假待审批</Text>
                    <Text className="text-2xl font-bold text-orange-600 block">{dashboardStats.pendingLeaveCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">条</Text>
                  </View>

                  {/* 本月完成件数 */}
                  <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <View className="i-mdi-chart-line text-2xl text-purple-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">本月完成件数</Text>
                    <Text className="text-2xl font-bold text-purple-900 block">{dashboardStats.monthlyPieceCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">件</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          {/* 快捷功能板块 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <View className="flex items-center justify-between mb-4">
              <View className="flex items-center">
                <View className="i-mdi-lightning-bolt text-xl text-orange-600 mr-2" />
                <Text className="text-lg font-bold text-gray-800">快捷功能</Text>
              </View>
              {/* 右侧个人中心按钮 */}
              <View
                onClick={handleProfileClick}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-full px-3 py-2 active:scale-95 transition-all flex items-center">
                <View className="i-mdi-account-circle text-xl text-blue-600 mr-1" />
                <Text className="text-xs text-blue-900 font-medium">个人中心</Text>
              </View>
            </View>
            <View className="grid grid-cols-2 gap-3">
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

              {/* 仓库品类配置 */}
              <View
                onClick={handleWarehouseCategories}
                className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-tag-multiple text-3xl text-green-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">品类配置</Text>
              </View>
            </View>
          </View>

          {/* 司机列表 */}
          {dashboardStats && dashboardStats.driverList.length > 0 && (
            <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
              <View className="flex items-center mb-4">
                <View className="i-mdi-account-group text-xl text-blue-900 mr-2" />
                <Text className="text-lg font-bold text-gray-800">司机列表</Text>
                <Text className="text-xs text-gray-400 ml-2">({dashboardStats.driverList.length}人)</Text>
              </View>
              <View className="space-y-2">
                {dashboardStats.driverList.map((driver) => (
                  <View
                    key={driver.id}
                    className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 flex items-center justify-between">
                    <View className="flex items-center flex-1">
                      <View className="i-mdi-account-circle text-3xl text-blue-600 mr-3" />
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-800 block">{driver.name}</Text>
                        <Text className="text-xs text-gray-500 block">{driver.phone}</Text>
                      </View>
                    </View>
                    <View className="flex flex-col items-end">
                      <View className="flex items-center mb-1">
                        {driver.todayAttendance ? (
                          <View className="flex items-center">
                            <View className="i-mdi-check-circle text-sm text-green-600 mr-1" />
                            <Text className="text-xs text-green-600">已出勤</Text>
                          </View>
                        ) : (
                          <View className="flex items-center">
                            <View className="i-mdi-close-circle text-sm text-gray-400 mr-1" />
                            <Text className="text-xs text-gray-400">未出勤</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-gray-600">今日: {driver.todayPieceCount}件</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 退出登录按钮 */}
          <View className="mb-4">
            <Button
              size="default"
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl h-12 text-base font-bold break-keep shadow-md"
              onClick={handleLogout}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-logout text-xl mr-2" />
                <Text className="text-base font-bold">退出登录</Text>
              </View>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ManagerHome
