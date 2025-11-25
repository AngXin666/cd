import {Button, ScrollView, Text, View} from '@tarojs/components'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useAdminAuth} from '@/hooks'

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
      <View className="min-h-screen bg-background flex items-center justify-center p-4">
        <View className="text-center">
          <View className="i-mdi-shield-lock text-6xl text-muted mb-4" />
          <Text className="text-xl text-foreground">正在验证权限...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <View className="bg-primary text-white shadow-lg">
        <View className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <View className="flex items-center gap-3">
            <View className="i-mdi-truck text-3xl" />
            <Text className="text-xl font-bold">车队管家 - 管理后台</Text>
          </View>
          <View className="flex items-center gap-4">
            <View className="flex items-center gap-2">
              <View className="i-mdi-account-circle text-2xl" />
              <Text className="text-sm">{profile?.name || profile?.phone || '管理员'}</Text>
            </View>
            <Button
              onClick={handleLogout}
              className="bg-white bg-opacity-20 px-4 py-2 rounded text-white text-sm break-keep"
              size="default">
              退出登录
            </Button>
          </View>
        </View>
      </View>

      {/* 主内容区域 */}
      <ScrollView scrollY className="h-screen box-border">
        <View className="max-w-7xl mx-auto px-4 py-8">
          {/* 欢迎信息 */}
          <View className="bg-card rounded-lg shadow-md p-6 mb-6">
            <View className="flex items-center gap-3 mb-4">
              <View className="i-mdi-hand-wave text-4xl text-yellow-500" />
              <Text className="text-2xl font-bold text-foreground">欢迎回来，{profile?.name || '管理员'}！</Text>
            </View>
            <Text className="text-base text-muted-foreground mb-4">
              这是车队管家电脑端管理后台，专为管理员和老板设计。
            </Text>
            <View className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <View className="flex items-start gap-3">
                <View className="i-mdi-information text-2xl text-blue-500" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-blue-800 mb-1">提示</Text>
                  <Text className="text-sm text-blue-700">管理后台功能正在开发中，敬请期待更多功能上线。</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 用户信息卡片 */}
          <View className="bg-card rounded-lg shadow-md p-6 mb-6">
            <Text className="text-xl font-bold text-foreground mb-4">当前用户信息</Text>
            <View className="flex flex-col gap-4">
              <View className="flex items-center gap-3">
                <View className="i-mdi-account text-2xl text-muted" />
                <View className="flex-1">
                  <Text className="text-sm text-muted-foreground">姓名</Text>
                  <Text className="text-base font-medium text-foreground">{profile?.name || '未设置'}</Text>
                </View>
              </View>
              <View className="flex items-center gap-3">
                <View className="i-mdi-phone text-2xl text-muted" />
                <View className="flex-1">
                  <Text className="text-sm text-muted-foreground">手机号</Text>
                  <Text className="text-base font-medium text-foreground">{profile?.phone || '未设置'}</Text>
                </View>
              </View>
              <View className="flex items-center gap-3">
                <View className="i-mdi-shield-account text-2xl text-muted" />
                <View className="flex-1">
                  <Text className="text-sm text-muted-foreground">角色</Text>
                  <Text
                    className={`text-base font-medium px-3 py-1 rounded inline-block ${
                      profile?.role === 'super_admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {profile?.role === 'super_admin' ? '超级管理员（老板）' : '管理员（车队长）'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 功能预告 */}
          <View className="bg-card rounded-lg shadow-md p-6">
            <View className="flex items-center gap-3 mb-4">
              <View className="i-mdi-rocket-launch text-3xl text-indigo-600" />
              <Text className="text-2xl font-bold text-foreground">即将上线的功能</Text>
            </View>
            <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <View className="bg-background rounded-lg p-4 border border-border">
                <View className="flex items-center gap-2 mb-2">
                  <View className="i-mdi-warehouse text-2xl text-blue-600" />
                  <Text className="font-semibold text-foreground">仓库配置管理</Text>
                </View>
                <Text className="text-sm text-muted-foreground">添加、编辑、禁用、删除仓库信息</Text>
              </View>
              <View className="bg-background rounded-lg p-4 border border-border">
                <View className="flex items-center gap-2 mb-2">
                  <View className="i-mdi-account-group text-2xl text-green-600" />
                  <Text className="font-semibold text-foreground">用户管理</Text>
                </View>
                <Text className="text-sm text-muted-foreground">管理用户账号、角色和权限</Text>
              </View>
              <View className="bg-background rounded-lg p-4 border border-border">
                <View className="flex items-center gap-2 mb-2">
                  <View className="i-mdi-chart-bar text-2xl text-orange-600" />
                  <Text className="font-semibold text-foreground">件数报表</Text>
                </View>
                <Text className="text-sm text-muted-foreground">查看和分析计件工作数据</Text>
              </View>
              <View className="bg-background rounded-lg p-4 border border-border">
                <View className="flex items-center gap-2 mb-2">
                  <View className="i-mdi-calendar-check text-2xl text-purple-600" />
                  <Text className="font-semibold text-foreground">考勤管理</Text>
                </View>
                <Text className="text-sm text-muted-foreground">查看和管理员工考勤记录</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default WebAdminHome
