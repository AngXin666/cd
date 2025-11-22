import {ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showModal, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useRef, useState} from 'react'
import NotificationBar from '@/components/NotificationBar'
import {getAllWarehouses, getCurrentUserProfile} from '@/db/api'
import type {Profile, Warehouse} from '@/db/types'
import {
  useDriverStats,
  useNotifications,
  usePollingNotifications,
  useSuperAdminDashboard,
  useWarehousesSorted
} from '@/hooks'

const SuperAdminHome: React.FC = () => {
  const {user, logout} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rawWarehouses, setRawWarehouses] = useState<Warehouse[]>([])
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0)
  const [loadTimeout, setLoadTimeout] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 通知管理
  const {notifications, addNotification, markAsRead, getRecentNotifications} = useNotifications()

  // 使用仓库排序 Hook（按数据量排序）
  const {warehouses: sortedWarehouses, refresh: refreshSorting} = useWarehousesSorted({
    warehouses: rawWarehouses,
    sortByVolume: true,
    hideEmpty: true // 隐藏完全没有数据的仓库
  })

  // 使用排序后的仓库列表
  const warehouses = sortedWarehouses

  // 获取当前选中的仓库ID（直接使用仓库列表，不再有"所有仓库"选项）
  const currentWarehouseId = warehouses[currentWarehouseIndex]?.id

  // 使用超级管理员仪表板数据管理Hook（带缓存和实时更新）
  const {
    data: dashboardStats,
    loading: dashboardLoading,
    refresh: refreshDashboard
  } = useSuperAdminDashboard({
    warehouseId: currentWarehouseId,
    enableRealtime: true,
    cacheEnabled: true
  })

  // 使用司机统计数据管理Hook（带缓存和实时更新）
  const {
    data: driverStats,
    loading: driverStatsLoading,
    refresh: refreshDriverStats
  } = useDriverStats({
    warehouseId: currentWarehouseId,
    enableRealtime: true,
    cacheEnabled: true
  })

  // 监听 dashboardStats 变化
  useEffect(() => {
    console.log('[SuperAdminHome] dashboardStats 更新:', dashboardStats)
  }, [dashboardStats])

  // 监听 driverStats 变化
  useEffect(() => {
    console.log('[SuperAdminHome] driverStats 更新:', driverStats)
  }, [driverStats])

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    try {
      const warehousesData = await getAllWarehouses()
      setRawWarehouses(warehousesData)
    } catch (error) {
      console.error('[SuperAdminHome] 加载仓库列表失败:', error)
    }
  }, [])

  // 加载个人信息
  const loadData = useCallback(async () => {
    try {
      const profileData = await getCurrentUserProfile()
      setProfile(profileData)
    } catch (error) {
      console.error('[SuperAdminHome] 加载数据失败:', error)
      Taro.showToast({
        title: '加载数据失败',
        icon: 'none',
        duration: 2000
      })
    }
  }, [])

  // 设置加载超时（8秒）
  useEffect(() => {
    if (!user) return

    timeoutRef.current = setTimeout(() => {
      if (!profile) {
        console.error('[SuperAdminHome] 加载超时')
        setLoadTimeout(true)
      }
    }, 8000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [user, profile])

  // 初始加载（批量并行查询优化）
  useEffect(() => {
    if (user) {
      // 批量并行加载所有初始数据
      Promise.all([loadData(), loadWarehouses()])
    }
  }, [user, loadData, loadWarehouses])

  // 页面显示时刷新数据（批量并行查询优化）
  useDidShow(() => {
    if (user) {
      // 批量并行刷新所有数据
      Promise.all([loadData(), loadWarehouses(), refreshSorting(), refreshDashboard(), refreshDriverStats()])

      // 添加欢迎通知（仅在首次加载时）
      try {
        const hasShownWelcome = Taro.getStorageSync('super_admin_welcome_shown')
        if (!hasShownWelcome) {
          // 添加多条通知以展示滚动效果
          addNotification({
            type: 'system',
            title: '欢迎使用超级管理员控制台',
            content: '您拥有最高权限，可以管理所有仓库、用户和系统设置'
          })

          setTimeout(() => {
            addNotification({
              type: 'system',
              title: '功能提示',
              content: '点击通知可以跳转到相应页面查看详情'
            })
          }, 100)

          setTimeout(() => {
            addNotification({
              type: 'system',
              title: '实时通知已启用',
              content: '当有新的请假申请、离职申请或打卡记录时，您会收到实时通知'
            })
          }, 200)

          Taro.setStorageSync('super_admin_welcome_shown', 'true')
        }
      } catch (err) {
        console.error('加载欢迎通知失败:', err)
      }
    }
  })

  // 启用轮询通知（代替 Realtime）
  usePollingNotifications({
    userId: user?.id || '',
    userRole: 'super_admin',
    onLeaveApplicationChange: () => {
      refreshDashboard()
    },
    onResignationApplicationChange: () => {
      refreshDashboard()
    },
    onAttendanceChange: () => {
      refreshDashboard()
      refreshDriverStats()
    },
    onNewNotification: addNotification,
    pollingInterval: 10000 // 10 秒轮询一次
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    if (user) {
      await Promise.all([loadData(), loadWarehouses(), refreshSorting(), refreshDashboard(), refreshDriverStats()])
    }
    Taro.stopPullDownRefresh()
  })

  // 处理仓库切换
  const handleWarehouseChange = useCallback((e: any) => {
    const index = e.detail.current
    setCurrentWarehouseIndex(index)
    // 切换仓库时，useSuperAdminDashboard 和 useDriverStats Hook 会自动加载新仓库的数据（优先使用缓存）
  }, [])

  const handleManageUsers = () => {
    navigateTo({url: '/pages/super-admin/user-management/index'})
  }

  const handleManageWarehouses = () => {
    navigateTo({url: '/pages/super-admin/warehouse-management/index'})
  }

  const handleVehicleManagement = () => {
    navigateTo({url: '/pages/super-admin/vehicle-management/index'})
  }

  const handleCategoryManagement = () => {
    navigateTo({url: '/pages/super-admin/category-management/index'})
  }

  const handlePieceWorkReport = () => {
    navigateTo({url: '/pages/super-admin/piece-work-report/index?range=month'})
  }

  const handleTodayPieceWorkReport = () => {
    navigateTo({url: '/pages/super-admin/piece-work-report/index?range=today'})
  }

  const handleLeaveApproval = () => {
    navigateTo({url: '/pages/super-admin/leave-approval/index'})
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

  // 使用仪表板和司机统计的loading状态
  const loading = dashboardLoading || driverStatsLoading

  // 初始加载状态：当用户信息还未加载时显示加载界面
  if (!user) {
    return (
      <View className="flex items-center justify-center" style={{minHeight: '100vh', background: '#F8FAFC'}}>
        <View className="text-center px-8">
          <View className="i-mdi-loading animate-spin text-6xl text-blue-900 mb-4" />
          <Text className="text-gray-600 block mb-2">加载用户信息中...</Text>
          <Text className="text-gray-400 text-xs block">请稍候...</Text>
        </View>
      </View>
    )
  }

  // 加载超时提示
  if (loadTimeout) {
    return (
      <View className="flex items-center justify-center" style={{minHeight: '100vh', background: '#F8FAFC'}}>
        <View className="text-center px-8">
          <View className="i-mdi-alert-circle text-6xl text-orange-600 mb-4" />
          <Text className="text-gray-800 text-lg block mb-2">加载超时</Text>
          <Text className="text-gray-600 text-sm block mb-4">数据加载时间过长，请检查网络连接</Text>
          <View
            className="bg-blue-900 text-white px-6 py-3 rounded-lg active:bg-blue-800"
            onClick={() => {
              setLoadTimeout(false)
              loadData()
            }}>
            <Text className="text-white">重试</Text>
          </View>
        </View>
      </View>
    )
  }

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

          {/* 通知栏 */}
          <NotificationBar
            notifications={getRecentNotifications(5)}
            onNotificationClick={(notification) => {
              markAsRead(notification.id)
              // 根据通知类型跳转到相应页面
              if (notification.type === 'leave_application' || notification.type === 'resignation_application') {
                Taro.navigateTo({url: '/pages/super-admin/leave-approval/index'})
              }
            }}
          />

          {/* 数据统计仪表盘 */}
          <View className="mb-4">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center">
                <View className="i-mdi-view-dashboard text-xl text-blue-900 mr-2" />
                <Text className="text-lg font-bold text-gray-800">数据仪表盘</Text>
                {loading && <View className="ml-2 i-mdi-loading animate-spin text-blue-600" />}
              </View>
              <View className="flex items-center">
                <Text className="text-xs text-gray-500 mr-2">{warehouses[currentWarehouseIndex]?.name || ''}</Text>
                <Text className="text-xs text-gray-400">|</Text>
                <Text className="text-xs text-gray-500 ml-2">{new Date().toLocaleDateString('zh-CN')}</Text>
              </View>
            </View>

            {dashboardStats ? (
              <View className="bg-white rounded-xl p-4 shadow-md">
                <View className="grid grid-cols-2 gap-3">
                  {/* 今天出勤 */}
                  <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <View className="i-mdi-account-check text-2xl text-blue-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">今天出勤</Text>
                    <Text className="text-2xl font-bold text-blue-900 block">{dashboardStats.todayAttendance}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">人</Text>
                  </View>

                  {/* 今天总件数 - 可点击跳转到件数报表 */}
                  <View
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 active:scale-95 transition-all"
                    onClick={handleTodayPieceWorkReport}>
                    <View className="i-mdi-package-variant text-2xl text-green-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">今天总件数</Text>
                    <Text className="text-2xl font-bold text-green-600 block">{dashboardStats.todayPieceCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">件</Text>
                  </View>

                  {/* 请假待审批 - 可点击跳转 */}
                  <View
                    className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 active:scale-95 transition-all"
                    onClick={handleLeaveApproval}>
                    <View className="i-mdi-calendar-clock text-2xl text-orange-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">请假待审批</Text>
                    <Text className="text-2xl font-bold text-orange-600 block">{dashboardStats.pendingLeaveCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">条</Text>
                  </View>

                  {/* 本月完成件数 - 可点击跳转到件数报表 */}
                  <View
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 active:scale-95 transition-all"
                    onClick={handlePieceWorkReport}>
                    <View className="i-mdi-chart-line text-2xl text-purple-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">本月完成件数</Text>
                    <Text className="text-2xl font-bold text-purple-900 block">{dashboardStats.monthlyPieceCount}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">件</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="bg-white rounded-xl p-8 shadow-md flex items-center justify-center">
                <Text className="text-gray-500">加载中...</Text>
              </View>
            )}
          </View>

          {/* 仓库切换器 */}
          {warehouses.length > 0 && (
            <View className="mb-4">
              <View className="flex items-center mb-2">
                <View className="i-mdi-warehouse text-lg text-blue-900 mr-2" />
                <Text className="text-sm font-bold text-gray-700">选择仓库</Text>
                <Text className="text-xs text-gray-400 ml-2">
                  ({currentWarehouseIndex + 1}/{warehouses.length})
                </Text>
                <Text className="text-xs text-gray-400 ml-auto">按数据量排序</Text>
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
                      <View className="h-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 px-4">
                        <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                        <Text className="text-lg font-bold text-blue-900">{warehouse.name}</Text>
                      </View>
                    </SwiperItem>
                  ))}
                </Swiper>
              </View>
            </View>
          )}

          {/* 统计概览（合并司机统计和系统统计） */}
          <View className="mb-4">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center">
                <View className="i-mdi-chart-box text-xl text-blue-900 mr-2" />
                <Text className="text-lg font-bold text-gray-800">统计概览</Text>
                {driverStatsLoading && <View className="ml-2 i-mdi-loading animate-spin text-blue-600" />}
              </View>
              <Text className="text-xs text-gray-500">{warehouses[currentWarehouseIndex]?.name || ''}</Text>
            </View>
            {driverStats ? (
              <View className="bg-white rounded-xl p-4 shadow-md">
                {/* 司机实时统计 */}
                <View>
                  <View className="flex items-center mb-2">
                    <View className="i-mdi-account-group text-sm text-blue-600 mr-1" />
                    <Text className="text-xs text-gray-600 font-medium">司机实时状态</Text>
                  </View>
                  <View className="grid grid-cols-4 gap-2">
                    {/* 总司机数 */}
                    <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 flex flex-col items-center">
                      <View className="i-mdi-account-multiple text-xl text-blue-600 mb-1" />
                      <Text className="text-xs text-gray-600 block mb-1">总数</Text>
                      <Text className="text-lg font-bold text-blue-900 block">{driverStats.totalDrivers}</Text>
                    </View>

                    {/* 在线司机 */}
                    <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 flex flex-col items-center">
                      <View className="i-mdi-account-check text-xl text-green-600 mb-1" />
                      <Text className="text-xs text-gray-600 block mb-1">在线</Text>
                      <Text className="text-lg font-bold text-green-600 block">{driverStats.onlineDrivers}</Text>
                    </View>

                    {/* 已计件司机 */}
                    <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 flex flex-col items-center">
                      <View className="i-mdi-account-clock text-xl text-orange-600 mb-1" />
                      <Text className="text-xs text-gray-600 block mb-1">已计件</Text>
                      <Text className="text-lg font-bold text-orange-600 block">{driverStats.busyDrivers}</Text>
                    </View>

                    {/* 未计件司机 */}
                    <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 flex flex-col items-center">
                      <View className="i-mdi-account-off text-xl text-purple-600 mb-1" />
                      <Text className="text-xs text-gray-600 block mb-1">未计件</Text>
                      <Text className="text-lg font-bold text-purple-900 block">{driverStats.idleDrivers}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View className="bg-white rounded-xl p-8 shadow-md flex items-center justify-center">
                <Text className="text-gray-500">加载中...</Text>
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

              {/* 车辆管理 */}
              <View
                onClick={handleVehicleManagement}
                className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-car-multiple text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">车辆管理</Text>
              </View>
            </View>
          </View>

          {/* 系统功能板块 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-lightning-bolt text-xl text-orange-600 mr-2" />
              <Text className="text-lg font-bold text-gray-800">系统功能</Text>
            </View>
            <View className="grid grid-cols-2 gap-3">
              {/* 件数报表 */}
              <View
                onClick={handlePieceWorkReport}
                className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-chart-box text-3xl text-orange-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">件数报表</Text>
              </View>

              {/* 考勤管理 */}
              <View
                onClick={handleLeaveApproval}
                className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 flex flex-col items-center active:scale-95 transition-all">
                <View className="i-mdi-calendar-check text-3xl text-red-600 mb-2" />
                <Text className="text-xs text-gray-700 font-medium">考勤管理</Text>
              </View>
            </View>
          </View>

          {/* 退出登录按钮 */}
          <View className="mb-4">
            <View className="bg-white rounded-xl p-4 shadow-md">
              <View
                className="flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 active:scale-98 transition-all"
                onClick={handleLogout}>
                <View className="i-mdi-logout text-2xl text-white mr-2" />
                <Text className="text-base font-bold text-white">退出登录</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default SuperAdminHome
