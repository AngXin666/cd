import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {useTenant} from '@/contexts/TenantContext'
import {getAllVehicleLeases} from '@/db/api'
import type {VehicleLease} from '@/db/types'

/**
 * 租赁端工作台
 *
 * 功能：
 * - 显示租赁统计信息
 * - 快速访问租赁管理功能
 * - 查看最近的租赁记录
 */
const LeaseAdminDashboard: React.FC = () => {
  const {user} = useAuth({guard: true})
  const {profile, isLeaseAdmin, loading: tenantLoading} = useTenant()
  const [leases, setLeases] = useState<VehicleLease[]>([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    totalRevenue: 0
  })
  const [loading, setLoading] = useState(false)

  /**
   * 加载租赁数据
   */
  const loadData = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // 获取所有租赁记录
      const allLeases = await getAllVehicleLeases()
      setLeases(allLeases)

      // 计算统计数据
      const now = new Date()
      const active = allLeases.filter((lease) => {
        if (!lease.end_date) return true
        return new Date(lease.end_date) >= now
      })
      const expired = allLeases.filter((lease) => {
        if (!lease.end_date) return false
        return new Date(lease.end_date) < now
      })

      // 计算总收入（活跃租赁的月租金总和）
      const totalRevenue = active.reduce((sum, lease) => sum + (lease.monthly_rent || 0), 0)

      setStats({
        total: allLeases.length,
        active: active.length,
        expired: expired.length,
        totalRevenue
      })
    } catch (error) {
      console.error('加载租赁数据失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // 页面显示时加载数据
  useDidShow(() => {
    loadData()
  })

  /**
   * 导航到租赁列表
   */
  const goToLeaseList = () => {
    Taro.navigateTo({
      url: '/pages/lease-admin/lease-list/index'
    })
  }

  /**
   * 导航到添加租赁
   */
  const goToAddLease = () => {
    Taro.navigateTo({
      url: '/pages/lease-admin/add-lease/index'
    })
  }

  /**
   * 查看租赁详情
   */
  const viewLeaseDetail = (leaseId: string) => {
    Taro.navigateTo({
      url: `/pages/lease-admin/lease-detail/index?id=${leaseId}`
    })
  }

  // 权限检查
  if (tenantLoading) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  if (!isLeaseAdmin) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background p-4">
        <View className="text-center">
          <View className="i-mdi-alert-circle text-6xl text-destructive mb-4" />
          <Text className="text-lg font-medium text-foreground mb-2">无权访问</Text>
          <Text className="text-muted-foreground">您没有权限访问租赁管理端</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #1e3a8a, #3b82f6)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{background: 'transparent', minHeight: '100vh'}}>
        <View className="p-4">
          {/* 欢迎信息 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <Text className="text-xl font-bold text-primary mb-1">欢迎，{profile?.name || '租赁管理员'}</Text>
            <Text className="text-sm text-muted-foreground">租赁管理工作台</Text>
          </View>

          {/* 统计卡片 */}
          <View className="grid grid-cols-2 gap-3 mb-4">
            {/* 总租赁数 */}
            <View className="bg-white rounded-lg p-4 shadow-sm">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-muted-foreground">总租赁数</Text>
                <View className="i-mdi-file-document-multiple text-2xl text-primary" />
              </View>
              <Text className="text-2xl font-bold text-foreground">{stats.total}</Text>
            </View>

            {/* 活跃租赁 */}
            <View className="bg-white rounded-lg p-4 shadow-sm">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-muted-foreground">活跃租赁</Text>
                <View className="i-mdi-check-circle text-2xl text-green-500" />
              </View>
              <Text className="text-2xl font-bold text-foreground">{stats.active}</Text>
            </View>

            {/* 已过期 */}
            <View className="bg-white rounded-lg p-4 shadow-sm">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-muted-foreground">已过期</Text>
                <View className="i-mdi-clock-alert text-2xl text-orange-500" />
              </View>
              <Text className="text-2xl font-bold text-foreground">{stats.expired}</Text>
            </View>

            {/* 月租金总额 */}
            <View className="bg-white rounded-lg p-4 shadow-sm">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-muted-foreground">月租金总额</Text>
                <View className="i-mdi-currency-cny text-2xl text-secondary" />
              </View>
              <Text className="text-2xl font-bold text-foreground">¥{stats.totalRevenue.toLocaleString()}</Text>
            </View>
          </View>

          {/* 快速操作 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <Text className="text-base font-medium text-foreground mb-3">快速操作</Text>
            <View className="grid grid-cols-2 gap-3">
              <Button
                className="bg-primary text-white py-3 rounded break-keep text-sm"
                size="default"
                onClick={goToAddLease}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-plus-circle text-lg mr-1" />
                  <Text>添加租赁</Text>
                </View>
              </Button>
              <Button
                className="bg-secondary text-white py-3 rounded break-keep text-sm"
                size="default"
                onClick={goToLeaseList}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-format-list-bulleted text-lg mr-1" />
                  <Text>租赁列表</Text>
                </View>
              </Button>
            </View>
          </View>

          {/* 最近租赁记录 */}
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-base font-medium text-foreground">最近租赁记录</Text>
              <Text className="text-sm text-primary" onClick={goToLeaseList}>
                查看全部 →
              </Text>
            </View>

            {loading ? (
              <View className="py-8 text-center">
                <Text className="text-muted-foreground">加载中...</Text>
              </View>
            ) : leases.length === 0 ? (
              <View className="py-8 text-center">
                <View className="i-mdi-file-document-outline text-4xl text-muted-foreground mb-2" />
                <Text className="text-muted-foreground">暂无租赁记录</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {leases.slice(0, 5).map((lease) => {
                  const isActive = !lease.end_date || new Date(lease.end_date) >= new Date()
                  return (
                    <View
                      key={lease.id}
                      className="border border-border rounded-lg p-3"
                      onClick={() => viewLeaseDetail(lease.id)}>
                      <View className="flex items-center justify-between mb-2">
                        <Text className="text-sm font-medium text-foreground">
                          车牌号：{lease.vehicle_id || '未知'}
                        </Text>
                        <View
                          className={`px-2 py-1 rounded text-xs ${
                            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                          <Text>{isActive ? '活跃' : '已过期'}</Text>
                        </View>
                      </View>
                      <View className="flex items-center text-xs text-muted-foreground mb-1">
                        <View className="i-mdi-calendar text-sm mr-1" />
                        <Text>开始：{lease.start_date}</Text>
                      </View>
                      {lease.end_date && (
                        <View className="flex items-center text-xs text-muted-foreground mb-1">
                          <View className="i-mdi-calendar-end text-sm mr-1" />
                          <Text>结束：{lease.end_date}</Text>
                        </View>
                      )}
                      <View className="flex items-center text-xs text-muted-foreground">
                        <View className="i-mdi-currency-cny text-sm mr-1" />
                        <Text>月租金：¥{lease.monthly_rent?.toLocaleString() || 0}</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default LeaseAdminDashboard
