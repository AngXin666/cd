import {ScrollView, Text, View} from '@tarojs/components'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useAdminAuth} from '@/hooks/useAdminAuth'

/**
 * 电脑端管理后台首页
 * 仅允许管理员（车队长）和超级管理员（老板）访问
 */
const WebAdminHome: React.FC = () => {
  const {logout} = useAuth()
  const {profile, isAuthorized, isLoading} = useAdminAuth()

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
            <Text className="text-xl md:text-2xl font-bold">车队管家 - 管理后台</Text>
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
          <View className="bg-white rounded-lg shadow-md p-8 mb-8">
            <View className="flex items-center mb-4">
              <View className="i-mdi-hand-wave text-4xl text-yellow-500 mr-3" />
              <Text className="text-3xl font-bold text-gray-800">欢迎回来，{profile?.name || '管理员'}！</Text>
            </View>
            <Text className="text-lg text-gray-600 mb-4">这是车队管家电脑端管理后台，专为管理员和老板设计。</Text>
            <View className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <View className="flex items-start">
                <View className="i-mdi-information text-2xl text-blue-500 mr-3 mt-1" />
                <View>
                  <Text className="text-sm font-semibold text-blue-800 mb-1">提示</Text>
                  <Text className="text-sm text-blue-700">管理后台功能正在开发中，敬请期待更多功能上线。</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 用户信息卡片 */}
          <View className="bg-white rounded-lg shadow-md p-6">
            <Text className="text-xl font-bold text-gray-800 mb-4">当前用户信息</Text>
            <View className="space-y-3">
              <View className="flex items-center">
                <View className="i-mdi-account text-2xl text-gray-500 mr-3" />
                <View>
                  <Text className="text-sm text-gray-500">姓名</Text>
                  <Text className="text-base font-medium text-gray-800">{profile?.name || '未设置'}</Text>
                </View>
              </View>
              <View className="flex items-center">
                <View className="i-mdi-phone text-2xl text-gray-500 mr-3" />
                <View>
                  <Text className="text-sm text-gray-500">手机号</Text>
                  <Text className="text-base font-medium text-gray-800">{profile?.phone || '未设置'}</Text>
                </View>
              </View>
              <View className="flex items-center">
                <View className="i-mdi-shield-account text-2xl text-gray-500 mr-3" />
                <View>
                  <Text className="text-sm text-gray-500">角色</Text>
                  <View className="flex items-center">
                    <Text
                      className={`text-base font-medium px-3 py-1 rounded ${
                        profile?.role === 'super_admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                      {profile?.role === 'super_admin' ? '超级管理员（老板）' : '管理员（车队长）'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 功能预告 */}
          <View className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6">
            <View className="flex items-center mb-4">
              <View className="i-mdi-rocket-launch text-3xl text-indigo-600 mr-3" />
              <Text className="text-2xl font-bold text-gray-800">即将上线的功能</Text>
            </View>
            <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex items-center mb-2">
                  <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                  <Text className="font-semibold text-gray-800">仓库配置管理</Text>
                </View>
                <Text className="text-sm text-gray-600">添加、编辑、禁用、删除仓库信息</Text>
              </View>
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex items-center mb-2">
                  <View className="i-mdi-account-group text-2xl text-green-600 mr-2" />
                  <Text className="font-semibold text-gray-800">用户管理</Text>
                </View>
                <Text className="text-sm text-gray-600">管理用户账号、角色和权限</Text>
              </View>
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex items-center mb-2">
                  <View className="i-mdi-chart-bar text-2xl text-orange-600 mr-2" />
                  <Text className="font-semibold text-gray-800">件数报表</Text>
                </View>
                <Text className="text-sm text-gray-600">查看和分析计件工作数据</Text>
              </View>
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex items-center mb-2">
                  <View className="i-mdi-calendar-check text-2xl text-purple-600 mr-2" />
                  <Text className="font-semibold text-gray-800">考勤管理</Text>
                </View>
                <Text className="text-sm text-gray-600">查看和管理员工考勤记录</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default WebAdminHome
