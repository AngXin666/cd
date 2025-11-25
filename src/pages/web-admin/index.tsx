import {ScrollView, Text, View} from '@tarojs/components'
import {navigateTo} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useAdminAuth} from '@/hooks/useAdminAuth'

/**
 * 电脑端后台管理系统首页
 * 仅允许管理员和超级管理员访问
 */
const WebAdminHome: React.FC = () => {
  const {logout} = useAuth()
  const {profile, isAuthorized, isLoading} = useAdminAuth()

  // 导航到功能页面
  const navigateToPage = (url: string) => {
    navigateTo({url})
  }

  // 退出登录
  const handleLogout = () => {
    logout()
  }

  // 如果正在加载或未授权，显示提示
  if (isLoading || !isAuthorized) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <View className="text-center">
          <View className="i-mdi-shield-lock text-6xl text-gray-400 mb-4" />
          <Text className="text-xl text-gray-600">正在验证权限...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <View className="bg-primary text-white shadow-lg">
        <View className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
          <View className="flex items-center">
            <View className="i-mdi-truck text-3xl mr-3" />
            <Text className="text-xl md:text-2xl font-bold">车队管家 - 后台管理系统</Text>
          </View>
          <View className="flex items-center">
            <View className="mr-4 hidden md:flex items-center">
              <View className="i-mdi-account-circle text-2xl mr-2" />
              <Text className="text-sm">{profile?.name || profile?.phone || '管理员'}</Text>
            </View>
            <View
              onClick={handleLogout}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded cursor-pointer transition-all flex items-center">
              <View className="i-mdi-logout text-lg mr-1" />
              <Text className="text-sm">退出登录</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 主内容区域 */}
      <ScrollView scrollY className="h-screen box-border">
        <View className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
          {/* 欢迎信息 */}
          <View className="bg-white rounded-lg shadow-md p-6 mb-8">
            <Text className="text-2xl font-bold text-gray-800 mb-2">欢迎回来，{profile?.name || '管理员'}！</Text>
            <Text className="text-gray-600">
              这是车队管家电脑端后台管理系统，您可以在这里管理仓库、用户、查看报表等。
            </Text>
          </View>

          {/* 功能模块卡片 */}
          <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 仓库配置 */}
            <View
              onClick={() => navigateToPage('/pages/web-admin/warehouse-config/index')}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer p-6 flex flex-col items-center">
              <View className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <View className="i-mdi-warehouse text-4xl text-blue-600" />
              </View>
              <Text className="text-lg font-bold text-gray-800 mb-2">仓库配置</Text>
              <Text className="text-sm text-gray-600 text-center">添加、编辑、禁用、删除仓库信息</Text>
            </View>

            {/* 用户管理 */}
            <View
              onClick={() => navigateToPage('/pages/web-admin/user-management/index')}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer p-6 flex flex-col items-center">
              <View className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <View className="i-mdi-account-group text-4xl text-green-600" />
              </View>
              <Text className="text-lg font-bold text-gray-800 mb-2">用户管理</Text>
              <Text className="text-sm text-gray-600 text-center">管理用户账号、角色和权限</Text>
            </View>

            {/* 件数报表 */}
            <View
              onClick={() => navigateToPage('/pages/web-admin/piece-work-report/index')}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer p-6 flex flex-col items-center">
              <View className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <View className="i-mdi-chart-box text-4xl text-orange-600" />
              </View>
              <Text className="text-lg font-bold text-gray-800 mb-2">件数报表</Text>
              <Text className="text-sm text-gray-600 text-center">查看和导出计件工作报表</Text>
            </View>

            {/* 考勤管理 */}
            <View
              onClick={() => navigateToPage('/pages/web-admin/attendance-management/index')}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer p-6 flex flex-col items-center">
              <View className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <View className="i-mdi-calendar-check text-4xl text-purple-600" />
              </View>
              <Text className="text-lg font-bold text-gray-800 mb-2">考勤管理</Text>
              <Text className="text-sm text-gray-600 text-center">查看和管理员工考勤记录</Text>
            </View>
          </View>

          {/* 快捷统计信息 */}
          <View className="mt-8 bg-white rounded-lg shadow-md p-6">
            <Text className="text-xl font-bold text-gray-800 mb-4">系统概览</Text>
            <View className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <View className="bg-blue-50 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">仓库总数</Text>
                  <View className="i-mdi-warehouse text-xl text-blue-600" />
                </View>
                <Text className="text-2xl font-bold text-blue-600">--</Text>
              </View>
              <View className="bg-green-50 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">用户总数</Text>
                  <View className="i-mdi-account-group text-xl text-green-600" />
                </View>
                <Text className="text-2xl font-bold text-green-600">--</Text>
              </View>
              <View className="bg-orange-50 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">本月计件</Text>
                  <View className="i-mdi-chart-line text-xl text-orange-600" />
                </View>
                <Text className="text-2xl font-bold text-orange-600">--</Text>
              </View>
              <View className="bg-purple-50 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">今日考勤</Text>
                  <View className="i-mdi-clock-check text-xl text-purple-600" />
                </View>
                <Text className="text-2xl font-bold text-purple-600">--</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default WebAdminHome
