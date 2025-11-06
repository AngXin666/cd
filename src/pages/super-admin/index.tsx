import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showModal, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getAllProfiles, getCurrentUserProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const SuperAdminHome: React.FC = () => {
  const {user, logout} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const profileData = await getCurrentUserProfile()
    setProfile(profileData)

    const usersData = await getAllProfiles()
    setAllUsers(usersData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  const handleManageUsers = () => {
    navigateTo({url: '/pages/admin-dashboard/index'})
  }

  const handleManageWarehouses = () => {
    navigateTo({url: '/pages/super-admin/warehouse-management/index'})
  }

  const handleDriverWarehouseAssignment = () => {
    navigateTo({url: '/pages/super-admin/driver-warehouse-assignment/index'})
  }

  const handleCategoryManagement = () => {
    navigateTo({url: '/pages/super-admin/category-management/index'})
  }

  const handlePieceWorkReport = () => {
    navigateTo({url: '/pages/super-admin/piece-work-report/index'})
  }

  const handleLeaveApproval = () => {
    navigateTo({url: '/pages/super-admin/leave-approval/index'})
  }

  const handleSystemSettings = () => {
    navigateTo({url: '/pages/profile/index'})
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

  const driverCount = allUsers.filter((u) => u.role === 'driver').length
  const managerCount = allUsers.filter((u) => u.role === 'manager').length
  const superAdminCount = allUsers.filter((u) => u.role === 'super_admin').length

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 欢迎卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">超级管理员控制台</Text>
            <Text className="text-blue-100 text-sm block">
              欢迎回来，{profile?.name || profile?.phone || '超级管理员'}
            </Text>
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
                  {/* 总用户数 */}
                  <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <View className="i-mdi-account-group text-2xl text-blue-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">总用户数</Text>
                    <Text className="text-2xl font-bold text-blue-900 block">{allUsers.length}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">人</Text>
                  </View>

                  {/* 司机数量 */}
                  <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <View className="i-mdi-account text-2xl text-green-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">司机数量</Text>
                    <Text className="text-2xl font-bold text-green-600 block">{driverCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">人</Text>
                  </View>

                  {/* 管理员数量 */}
                  <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <View className="i-mdi-shield-account text-2xl text-purple-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">管理员</Text>
                    <Text className="text-2xl font-bold text-purple-900 block">{managerCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">人</Text>
                  </View>

                  {/* 超级管理员 */}
                  <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                    <View className="i-mdi-shield-star text-2xl text-orange-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">超级管理员</Text>
                    <Text className="text-2xl font-bold text-orange-600 block">{superAdminCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">人</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 权限管理板块 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <View className="flex items-center justify-between mb-4">
              <View className="flex items-center">
                <View className="i-mdi-shield-check text-xl text-orange-600 mr-2" />
                <Text className="text-lg font-bold text-gray-800">权限管理</Text>
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
              {/* 用户管理 */}
              <View
                onClick={handleManageUsers}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-account-multiple text-3xl text-blue-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">用户管理</Text>
              </View>

              {/* 仓库管理 */}
              <View
                onClick={handleManageWarehouses}
                className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-warehouse text-3xl text-green-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">仓库管理</Text>
              </View>

              {/* 计件品类 */}
              <View
                onClick={handleCategoryManagement}
                className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-tag-multiple text-3xl text-purple-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">计件品类</Text>
              </View>

              {/* 司机分配 */}
              <View
                onClick={handleDriverWarehouseAssignment}
                className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-account-arrow-right text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">司机分配</Text>
              </View>
            </View>
          </View>

          {/* 系统功能板块 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-lightning-bolt text-xl text-orange-600 mr-2" />
              <Text className="text-lg font-bold text-gray-800">系统功能</Text>
            </View>
            <View className="grid grid-cols-3 gap-3">
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

              {/* 数据管理 */}
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 flex flex-col items-center">
                <View className="i-mdi-database text-3xl text-blue-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">数据管理</Text>
              </View>
            </View>
          </View>

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

export default SuperAdminHome
