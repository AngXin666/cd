import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import {useCallback, useEffect, useState} from 'react'
import {getDashboardStats, getProfileById} from '@/db/api'
import type {Profile} from '@/db/types'

type MenuItem = {
  id: string
  title: string
  icon: string
  description: string
}

type DashboardStats = {
  todayAttendance: {
    attendedCount: number
    totalCount: number
    attendanceRate: number
  }
  todayPieceWork: {
    totalQuantity: number
    completedQuantity: number
    completionRate: number
  }
  monthlyStats: {
    totalAttendanceDays: number
    totalPieceWorkQuantity: number
    totalCompletedQuantity: number
  }
  vehicleStats: {
    activeCount: number
    inactiveCount: number
    inUseCount: number
  }
  driverStats: {
    activeCount: number
    resignedCount: number
    newThisMonth: number
  }
  pendingTasks: {
    pendingLeaveCount: number
    unassignedDrivers: number
  }
}

const WebAdmin: React.FC = () => {
  const {user, logout} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const loadProfile = useCallback(async () => {
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
  }, [user?.id])

  const loadDashboardStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const stats = await getDashboardStats()
      setDashboardStats(stats)
    } catch (error) {
      console.error('加载仪表盘数据失败:', error)
      await Taro.showToast({
        title: '加载数据失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (activeMenu === 'dashboard' && profile) {
      loadDashboardStats()
    }
  }, [activeMenu, profile, loadDashboardStats])

  useDidShow(() => {
    if (activeMenu === 'dashboard' && profile) {
      loadDashboardStats()
    }
  })

  const handleLogout = async () => {
    try {
      await logout()
      await Taro.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      })
      setTimeout(() => {
        Taro.reLaunch({url: '/pages/login/index'})
      }, 1500)
    } catch (error) {
      console.error('退出登录失败:', error)
    }
  }

  const menuItems: MenuItem[] = [
    {id: 'dashboard', title: '仪表盘', icon: 'i-mdi-view-dashboard', description: '数据统计和图表'},
    {id: 'drivers', title: '司机管理', icon: 'i-mdi-account-group', description: '查看和管理司机信息'},
    {id: 'vehicles', title: '车辆管理', icon: 'i-mdi-car', description: '车辆审核和历史记录'},
    {id: 'attendance', title: '考勤管理', icon: 'i-mdi-calendar-check', description: '考勤统计和打卡记录'},
    {id: 'leave', title: '请假审批', icon: 'i-mdi-file-document', description: '审批请假申请'},
    {id: 'piecework', title: '计件管理', icon: 'i-mdi-clipboard-list', description: '计件录入和统计'},
    {id: 'warehouse', title: '仓库管理', icon: 'i-mdi-warehouse', description: '仓库配置和分配'},
    {id: 'users', title: '用户管理', icon: 'i-mdi-account-cog', description: '用户权限管理'}
  ]

  const renderDashboard = () => {
    if (statsLoading) {
      return (
        <View className="flex items-center justify-center py-20">
          <Text className="text-muted-foreground">加载数据中...</Text>
        </View>
      )
    }

    if (!dashboardStats) {
      return (
        <View className="flex items-center justify-center py-20">
          <Text className="text-muted-foreground">暂无数据</Text>
        </View>
      )
    }

    return (
      <View className="space-y-6">
        {/* 今日数据统计 */}
        <View>
          <Text className="text-xl font-bold text-foreground mb-4">今日数据</Text>
          <View className="grid grid-cols-4 gap-4">
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-account-check text-4xl text-primary mb-2" />
              <Text className="text-3xl font-bold text-foreground">
                {dashboardStats.todayAttendance.attendedCount}/{dashboardStats.todayAttendance.totalCount}
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">今日出勤</Text>
              <Text className="text-xs text-primary mt-1">出勤率 {dashboardStats.todayAttendance.attendanceRate}%</Text>
            </View>
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-clipboard-list text-4xl text-secondary mb-2" />
              <Text className="text-3xl font-bold text-foreground">{dashboardStats.todayPieceWork.totalQuantity}</Text>
              <Text className="text-sm text-muted-foreground mt-1">今日总件数</Text>
              <Text className="text-xs text-secondary mt-1">
                已完成 {dashboardStats.todayPieceWork.completedQuantity} 件
              </Text>
            </View>
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-chart-line text-4xl text-accent mb-2" />
              <Text className="text-3xl font-bold text-foreground">
                {dashboardStats.todayPieceWork.completionRate}%
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">今日完成率</Text>
              <Text className="text-xs text-accent mt-1">
                {dashboardStats.todayPieceWork.completedQuantity}/{dashboardStats.todayPieceWork.totalQuantity}
              </Text>
            </View>
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-alert-circle text-4xl text-destructive mb-2" />
              <Text className="text-3xl font-bold text-foreground">
                {dashboardStats.pendingTasks.pendingLeaveCount}
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">待审批请假</Text>
              {dashboardStats.pendingTasks.pendingLeaveCount > 0 && (
                <Text className="text-xs text-destructive mt-1">需要处理</Text>
              )}
            </View>
          </View>
        </View>

        {/* 本月数据统计 */}
        <View>
          <Text className="text-xl font-bold text-foreground mb-4">本月数据</Text>
          <View className="grid grid-cols-3 gap-4">
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-calendar-month text-4xl text-primary mb-2" />
              <Text className="text-3xl font-bold text-foreground">
                {dashboardStats.monthlyStats.totalAttendanceDays}
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">本月总出勤天数</Text>
            </View>
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-package-variant text-4xl text-secondary mb-2" />
              <Text className="text-3xl font-bold text-foreground">
                {dashboardStats.monthlyStats.totalPieceWorkQuantity}
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">本月总件数</Text>
            </View>
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-check-circle text-4xl text-accent mb-2" />
              <Text className="text-3xl font-bold text-foreground">
                {dashboardStats.monthlyStats.totalCompletedQuantity}
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">本月完成件数</Text>
            </View>
          </View>
        </View>

        {/* 车辆和司机状态 */}
        <View>
          <Text className="text-xl font-bold text-foreground mb-4">车辆与司机</Text>
          <View className="grid grid-cols-4 gap-4">
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-car text-4xl text-primary mb-2" />
              <Text className="text-3xl font-bold text-foreground">{dashboardStats.vehicleStats.activeCount}</Text>
              <Text className="text-sm text-muted-foreground mt-1">在用车辆</Text>
            </View>
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-car-off text-4xl text-muted mb-2" />
              <Text className="text-3xl font-bold text-foreground">{dashboardStats.vehicleStats.inactiveCount}</Text>
              <Text className="text-sm text-muted-foreground mt-1">停用车辆</Text>
            </View>
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-account-group text-4xl text-secondary mb-2" />
              <Text className="text-3xl font-bold text-foreground">{dashboardStats.driverStats.activeCount}</Text>
              <Text className="text-sm text-muted-foreground mt-1">在职司机</Text>
            </View>
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="i-mdi-account-plus text-4xl text-accent mb-2" />
              <Text className="text-3xl font-bold text-foreground">{dashboardStats.driverStats.newThisMonth}</Text>
              <Text className="text-sm text-muted-foreground mt-1">本月新入职</Text>
            </View>
          </View>
        </View>

        {/* 待处理事项 */}
        {(dashboardStats.pendingTasks.pendingLeaveCount > 0 || dashboardStats.pendingTasks.unassignedDrivers > 0) && (
          <View>
            <Text className="text-xl font-bold text-foreground mb-4">待处理事项</Text>
            <View className="bg-card p-6 rounded-lg border border-border">
              <View className="space-y-3">
                {dashboardStats.pendingTasks.pendingLeaveCount > 0 && (
                  <View className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                    <View className="flex items-center">
                      <View className="i-mdi-file-document text-2xl text-destructive mr-3" />
                      <View>
                        <Text className="text-sm font-medium text-foreground">待审批请假申请</Text>
                        <Text className="text-xs text-muted-foreground">
                          有 {dashboardStats.pendingTasks.pendingLeaveCount} 条请假申请待处理
                        </Text>
                      </View>
                    </View>
                    <Button
                      className="bg-destructive text-destructive-foreground py-2 px-4 rounded break-keep text-xs"
                      size="mini"
                      onClick={() => setActiveMenu('leave')}>
                      去处理
                    </Button>
                  </View>
                )}
                {dashboardStats.pendingTasks.unassignedDrivers > 0 && (
                  <View className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <View className="flex items-center">
                      <View className="i-mdi-warehouse text-2xl text-primary mr-3" />
                      <View>
                        <Text className="text-sm font-medium text-foreground">未分配仓库的司机</Text>
                        <Text className="text-xs text-muted-foreground">
                          有 {dashboardStats.pendingTasks.unassignedDrivers} 名司机未分配仓库
                        </Text>
                      </View>
                    </View>
                    <Button
                      className="bg-primary text-primary-foreground py-2 px-4 rounded break-keep text-xs"
                      size="mini"
                      onClick={() => setActiveMenu('warehouse')}>
                      去分配
                    </Button>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* 快速操作 */}
        <View>
          <Text className="text-xl font-bold text-foreground mb-4">快速操作</Text>
          <View className="grid grid-cols-4 gap-3">
            <Button
              className="bg-primary text-primary-foreground py-4 rounded break-keep text-sm"
              size="default"
              onClick={() => setActiveMenu('drivers')}>
              <View className="flex flex-col items-center">
                <View className="i-mdi-account-plus text-2xl mb-1" />
                <Text>添加司机</Text>
              </View>
            </Button>
            <Button
              className="bg-secondary text-secondary-foreground py-4 rounded break-keep text-sm"
              size="default"
              onClick={() => setActiveMenu('vehicles')}>
              <View className="flex flex-col items-center">
                <View className="i-mdi-car-plus text-2xl mb-1" />
                <Text>添加车辆</Text>
              </View>
            </Button>
            <Button
              className="bg-accent text-accent-foreground py-4 rounded break-keep text-sm"
              size="default"
              onClick={() => setActiveMenu('attendance')}>
              <View className="flex flex-col items-center">
                <View className="i-mdi-calendar-check text-2xl mb-1" />
                <Text>查看考勤</Text>
              </View>
            </Button>
            <Button
              className="bg-muted text-muted-foreground py-4 rounded break-keep text-sm"
              size="default"
              onClick={() => setActiveMenu('piecework')}>
              <View className="flex flex-col items-center">
                <View className="i-mdi-clipboard-list text-2xl mb-1" />
                <Text>计件管理</Text>
              </View>
            </Button>
          </View>
        </View>
      </View>
    )
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return renderDashboard()
      default:
        return (
          <View className="bg-card p-8 rounded-lg border border-border text-center">
            <View
              className={`${menuItems.find((m) => m.id === activeMenu)?.icon} text-6xl text-muted-foreground mb-4 mx-auto`}
            />
            <Text className="text-xl font-bold text-foreground mb-2">
              {menuItems.find((m) => m.id === activeMenu)?.title}
            </Text>
            <Text className="text-muted-foreground mb-6">
              {menuItems.find((m) => m.id === activeMenu)?.description}
            </Text>
            <Text className="text-sm text-muted-foreground">此功能正在开发中，敬请期待...</Text>
          </View>
        )
    }
  }

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
      <View className="flex h-screen">
        {/* 侧边栏 */}
        <View className="w-64 bg-card border-r border-border flex flex-col">
          {/* 侧边栏头部 */}
          <View className="p-6 border-b border-border">
            <Text className="text-xl font-bold text-primary">车队管家</Text>
            <Text className="text-sm text-muted-foreground mt-1">电脑端管理后台</Text>
          </View>

          {/* 用户信息 */}
          <View className="p-4 border-b border-border">
            <View className="flex items-center">
              <View className="i-mdi-account-circle text-3xl text-primary mr-3" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">{profile.name || '管理员'}</Text>
                <Text className="text-xs text-muted-foreground">
                  {profile.role === 'super_admin' ? '超级管理员' : '管理员'}
                </Text>
              </View>
            </View>
          </View>

          {/* 菜单列表 */}
          <ScrollView scrollY className="flex-1 box-border">
            <View className="p-2">
              {menuItems.map((item) => (
                <View
                  key={item.id}
                  className={`p-3 rounded-lg mb-1 cursor-pointer transition-all ${
                    activeMenu === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
                  }`}
                  onClick={() => setActiveMenu(item.id)}>
                  <View className="flex items-center">
                    <View className={`${item.icon} text-xl mr-3`} />
                    <Text className="text-sm font-medium">{item.title}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* 侧边栏底部 */}
          <View className="p-4 border-t border-border">
            <Button
              className="w-full bg-destructive text-destructive-foreground py-3 rounded break-keep text-sm"
              size="default"
              onClick={handleLogout}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-logout text-lg mr-2" />
                <Text>退出登录</Text>
              </View>
            </Button>
          </View>
        </View>

        {/* 主内容区域 */}
        <View className="flex-1 flex flex-col">
          {/* 顶部标题栏 */}
          <View className="bg-card border-b border-border p-6">
            <View className="flex items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-foreground">
                  {menuItems.find((m) => m.id === activeMenu)?.title || '仪表盘'}
                </Text>
                <Text className="text-sm text-muted-foreground mt-1">
                  {menuItems.find((m) => m.id === activeMenu)?.description || '数据统计和图表'}
                </Text>
              </View>
              {activeMenu === 'dashboard' && (
                <Button
                  className="bg-primary text-primary-foreground py-2 px-4 rounded break-keep text-sm"
                  size="mini"
                  onClick={loadDashboardStats}
                  disabled={statsLoading}>
                  <View className="flex items-center">
                    <View className="i-mdi-refresh text-lg mr-1" />
                    <Text>{statsLoading ? '刷新中...' : '刷新数据'}</Text>
                  </View>
                </Button>
              )}
            </View>
          </View>

          {/* 内容区域 */}
          <ScrollView scrollY className="flex-1 box-border">
            <View className="p-6">{renderContent()}</View>
          </ScrollView>
        </View>
      </View>
    </View>
  )
}

export default WebAdmin
