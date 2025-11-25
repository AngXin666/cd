import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {getLeaseStats} from '@/db/api'

export default function LeaseAdminDashboard() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    thisMonthNewTenants: 0
  })
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getLeaseStats()
      setStats(data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useDidShow(() => {
    loadStats()
  })

  const handleNavigate = (url: string) => {
    Taro.navigateTo({url})
  }

  return (
    <View className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4">
          {/* 页面标题 */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-primary">租赁系统管理</Text>
            <Text className="text-sm text-muted-foreground mt-1">管理租用车队管家小程序的客户</Text>
          </View>

          {/* 统计卡片 */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">数据概览</Text>
            <View className="grid grid-cols-2 gap-3">
              {/* 老板账号总数 */}
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text className="text-sm text-muted-foreground">老板账号总数</Text>
                  <View className="i-mdi-account-group text-2xl text-primary"></View>
                </View>
                <Text className="text-3xl font-bold text-primary">{stats.totalTenants}</Text>
              </View>

              {/* 活跃账号数 */}
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text className="text-sm text-muted-foreground">活跃账号</Text>
                  <View className="i-mdi-check-circle text-2xl text-green-500"></View>
                </View>
                <Text className="text-3xl font-bold text-green-500">{stats.activeTenants}</Text>
              </View>

              {/* 停用账号数 */}
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text className="text-sm text-muted-foreground">停用账号</Text>
                  <View className="i-mdi-cancel text-2xl text-orange-500"></View>
                </View>
                <Text className="text-3xl font-bold text-orange-500">{stats.suspendedTenants}</Text>
              </View>

              {/* 本月新增账号 */}
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text className="text-sm text-muted-foreground">本月新增</Text>
                  <View className="i-mdi-account-plus text-2xl text-blue-500"></View>
                </View>
                <Text className="text-3xl font-bold text-blue-500">{stats.thisMonthNewTenants}</Text>
              </View>
            </View>
          </View>

          {/* 快速操作 */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">快速操作</Text>
            <View className="grid grid-cols-1 gap-3">
              {/* 老板账号管理 */}
              <View
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 shadow-md active:scale-95 transition-transform"
                onClick={() => handleNavigate('/pages/lease-admin/tenant-list/index')}>
                <View className="i-mdi-account-group text-3xl text-white mb-2"></View>
                <Text className="text-white font-semibold">老板账号管理</Text>
                <Text className="text-white text-xs opacity-80 mt-1">查看和管理所有老板账号</Text>
              </View>
            </View>
          </View>

          {/* 加载状态 */}
          {loading && (
            <View className="flex items-center justify-center py-8">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
