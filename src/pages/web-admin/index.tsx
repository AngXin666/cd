import {ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import {useEffect, useState} from 'react'
import {getProfileById} from '@/db/api'
import type {Profile} from '@/db/types'

const WebAdmin: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return

      try {
        const data = await getProfileById(user.id)
        setProfile(data)

        // 权限验证：只允许管理员和超级管理员访问
        if (data?.role !== 'manager' && data?.role !== 'super_admin') {
          await Taro.showToast({
            title: '无权限访问',
            icon: 'none',
            duration: 2000
          })
          setTimeout(() => {
            Taro.switchTab({url: '/pages/index/index'})
          }, 2000)
        }
      } catch (error) {
        console.error('加载用户信息失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user?.id])

  if (loading) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  if (!profile || (profile.role !== 'manager' && profile.role !== 'super_admin')) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="text-muted-foreground">权限验证中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-background">
      <ScrollView scrollY className="h-screen box-border">
        {/* 顶部标题栏 */}
        <View className="bg-primary text-primary-foreground p-6">
          <View className="max-w-7xl mx-auto">
            <Text className="text-2xl font-bold">车队管家 - 电脑端管理后台</Text>
            <Text className="text-sm opacity-90 mt-2">
              欢迎，{profile.name || '管理员'} ({profile.role === 'super_admin' ? '超级管理员' : '管理员'})
            </Text>
          </View>
        </View>

        {/* 主内容区域 */}
        <View className="max-w-7xl mx-auto p-6">
          {/* 测试卡片 */}
          <View className="bg-card rounded-lg p-6 shadow-sm border border-border">
            <View className="flex items-center mb-4">
              <View className="i-mdi-check-circle text-3xl text-green-600 mr-3" />
              <Text className="text-xl font-bold text-foreground">页面加载成功！</Text>
            </View>

            <View className="space-y-3">
              <View>
                <Text className="text-muted-foreground">✅ 路由配置正确</Text>
              </View>
              <View>
                <Text className="text-muted-foreground">✅ 权限验证通过</Text>
              </View>
              <View>
                <Text className="text-muted-foreground">✅ 用户信息加载成功</Text>
              </View>
              <View>
                <Text className="text-muted-foreground">✅ 页面样式正常显示</Text>
              </View>
            </View>

            <View className="mt-6 p-4 bg-muted rounded">
              <Text className="text-sm text-muted-foreground">当前用户ID: {user?.id}</Text>
              <Text className="text-sm text-muted-foreground mt-1">
                用户角色: {profile.role === 'super_admin' ? '超级管理员' : '管理员'}
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">真实姓名: {profile.name || '未设置'}</Text>
            </View>
          </View>

          {/* 功能预览卡片 */}
          <View className="bg-card rounded-lg p-6 shadow-sm border border-border mt-6">
            <Text className="text-lg font-bold text-foreground mb-4">即将实现的功能模块</Text>

            <View className="grid grid-cols-2 gap-4">
              <View className="p-4 bg-muted rounded">
                <View className="i-mdi-view-dashboard text-2xl text-primary mb-2" />
                <Text className="font-medium text-foreground">仪表盘</Text>
                <Text className="text-sm text-muted-foreground mt-1">数据统计和图表</Text>
              </View>

              <View className="p-4 bg-muted rounded">
                <View className="i-mdi-account-group text-2xl text-primary mb-2" />
                <Text className="font-medium text-foreground">司机管理</Text>
                <Text className="text-sm text-muted-foreground mt-1">查看和管理司机信息</Text>
              </View>

              <View className="p-4 bg-muted rounded">
                <View className="i-mdi-car text-2xl text-primary mb-2" />
                <Text className="font-medium text-foreground">车辆管理</Text>
                <Text className="text-sm text-muted-foreground mt-1">车辆审核和历史记录</Text>
              </View>

              <View className="p-4 bg-muted rounded">
                <View className="i-mdi-calendar-check text-2xl text-primary mb-2" />
                <Text className="font-medium text-foreground">考勤管理</Text>
                <Text className="text-sm text-muted-foreground mt-1">考勤统计和打卡记录</Text>
              </View>

              <View className="p-4 bg-muted rounded">
                <View className="i-mdi-file-document text-2xl text-primary mb-2" />
                <Text className="font-medium text-foreground">请假审批</Text>
                <Text className="text-sm text-muted-foreground mt-1">审批请假申请</Text>
              </View>

              <View className="p-4 bg-muted rounded">
                <View className="i-mdi-warehouse text-2xl text-primary mb-2" />
                <Text className="font-medium text-foreground">仓库管理</Text>
                <Text className="text-sm text-muted-foreground mt-1">仓库配置和分配</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default WebAdmin
