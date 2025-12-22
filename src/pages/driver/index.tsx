/**
 * 司机主页
 * 提供司机工作台功能，包括数据仪表盘、快捷功能、仓库管理等
 * 支持 Supabase Realtime 实时订阅，收到仓库分配变更时自动刷新
 *
 * @module pages/driver/index
 * @feature event-driven-data-refresh
 */

import {ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showModal, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useRef, useState} from 'react'
import {ClockInReminderModal} from '@/components/attendance'
import NotificationBell from '@/components/notification/NotificationBell'
import RealNotificationBar from '@/components/RealNotificationBar'
import SafeAreaTop from '@/components/SafeAreaTop'
import TopNavBar from '@/components/TopNavBar'
import * as UsersAPI from '@/db/api/users'
import * as VehiclesAPI from '@/db/api/vehicles'
import {hideLoading, showLoading} from '@/utils/taroCompat'
import {isH5} from '@/utils/platform'

import type {DriverLicense, Profile} from '@/db/types'
import {
  useBackButtonBlock,
  useDriverDashboard,
  useDriverWarehouses,
  useNotifications,
  usePollingNotifications,
  useWarehousesSorted
} from '@/hooks'
import {useRealtimeSubscription} from '@/hooks/useRealtimeSubscription'
import type {AttendanceCheckResult} from '@/utils/attendance-check'
import {checkTodayAttendance} from '@/utils/attendance-check'
import {smartLogout, isLogoutInProgress} from '@/utils/auth'
import {NotificationPresets, sendDebouncedNotification} from '@/utils/notificationDebounce'
import {startRealtimeMonitor} from '@/utils/sessionManager'

// 存储工具函数，兼容H5和小程序
const getStorageSync = (key: string): any => {
  if (isH5) {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } else {
    return Taro.getStorageSync(key)
  }
}

const setStorageSync = (key: string, data: any): void => {
  if (isH5) {
    localStorage.setItem(key, JSON.stringify(data))
  } else {
    Taro.setStorageSync(key, data)
  }
}

// ==================== 缓存配置 ====================
// 用户资料缓存有效期：2分钟
const PROFILE_CACHE_KEY = 'driver_profile_cache'
const PROFILE_CACHE_EXPIRY_MS = 2 * 60 * 1000

/**
 * 读取用户资料缓存
 * @param userId - 用户ID
 * @returns 缓存的用户资料，如果缓存过期或不存在则返回 null
 */
const readProfileCache = (userId: string): {profile: Profile | null; driverLicense: DriverLicense | null} | null => {
  try {
    const cached = getStorageSync(`${PROFILE_CACHE_KEY}_${userId}`)
    if (cached?.timestamp && Date.now() - cached.timestamp < PROFILE_CACHE_EXPIRY_MS) {
      return {profile: cached.profile, driverLicense: cached.driverLicense}
    }
  } catch (e) {
    console.error('[DriverHome] 读取资料缓存失败:', e)
  }
  return null
}

/**
 * 写入用户资料缓存
 * @param userId - 用户ID
 * @param profile - 用户资料
 * @param driverLicense - 驾驶证信息
 */
const writeProfileCache = (userId: string, profile: Profile | null, driverLicense: DriverLicense | null): void => {
  try {
    setStorageSync(`${PROFILE_CACHE_KEY}_${userId}`, {
      profile,
      driverLicense,
      timestamp: Date.now()
    })
  } catch (e) {
    console.error('[DriverHome] 写入资料缓存失败:', e)
  }
}

const DriverHome: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [driverLicense, setDriverLicense] = useState<DriverLicense | null>(null)
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0)
  const [loadTimeout, setLoadTimeout] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 首页返回键拦截：防止用户在首页按返回键退出应用
  useBackButtonBlock()

  // 通知管理
  const {addNotification} = useNotifications()

  // 打卡检测相关状态
  const [showClockInReminder, setShowClockInReminder] = useState(false)
  const [attendanceCheck, setAttendanceCheck] = useState<AttendanceCheckResult | null>(null)
  const hasCheckedToday = useRef(false) // 标记今天是否已检测过

  // 加载用户资料（批量并行查询优化 + 缓存）
  // 性能优化：添加缓存机制，避免重复请求
  const loadProfile = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return

    // 先尝试使用缓存（除非强制刷新）
    if (!forceRefresh) {
      const cached = readProfileCache(user.id)
      if (cached) {
        setProfile(cached.profile)
        setDriverLicense(cached.driverLicense)
        return
      }
    }

    try {
      // 批量并行加载用户资料和驾驶证信息
      const [profileData, licenseData] = await Promise.all([
        UsersAPI.getCurrentUserProfile(),
        VehiclesAPI.getDriverLicense(user.id)
      ])
      setProfile(profileData)
      setDriverLicense(licenseData)
      // 写入缓存
      writeProfileCache(user.id, profileData, licenseData)
    } catch (error) {
      console.error('[DriverHome] 加载用户资料失败:', error)
      Taro.showToast({
        title: '加载用户资料失败',
        icon: 'none',
        duration: 2000
      })
    }
  }, [user?.id])

  // 检测打卡状态
  // 性能优化：只依赖 user?.id 而不是整个 user 对象，避免不必要的重新执行
  const checkAttendance = useCallback(async () => {
    if (!user?.id) return

    try {
      const result = await checkTodayAttendance(user.id)
      setAttendanceCheck(result)

      // 获取今天的日期字符串
      const today = new Date().toLocaleDateString('zh-CN')

      // 检查是否今天已经检测过
      const lastCheckDate = localStorage.getItem('lastAttendanceCheckDate')

      // 如果今天还没检测过，且需要打卡，则显示提醒
      if (lastCheckDate !== today && result.needClockIn) {
        setShowClockInReminder(true)
        // 记录今天已检测过
        localStorage.setItem('lastAttendanceCheckDate', today)
        hasCheckedToday.current = true
      }
    } catch (error) {
      console.error('[DriverHome] 检测打卡状态失败:', error)
    }
  }, [user?.id])

  // 使用仓库列表管理 Hook（原始列表）
  // 缓存由 Repository 层统一管理，不再需要传递 cacheEnabled 参数
  const {
    warehouses: rawWarehouses,
    loading: warehousesLoading,
    refresh: refreshWarehouses
  } = useDriverWarehouses(user?.id || '')

  // 使用仓库排序 Hook（按数据量排序，隐藏无数据仓库）
  const {warehouses: sortedWarehouses, refresh: refreshSorting} = useWarehousesSorted({
    warehouses: rawWarehouses,
    userId: user?.id,
    sortByVolume: true,
    hideEmpty: false // 不隐藏无数据仓库，只排序
  })

  // 使用排序后的仓库列表
  const warehouses = sortedWarehouses

  // 获取当前选中的仓库ID
  const currentWarehouseId = warehouses[currentWarehouseIndex]?.id || ''

  // 使用仪表板数据管理 Hook
  // 缓存由 Repository 层统一管理，不再需要传递 cacheEnabled 参数
  const {
    data: stats,
    loading: statsLoading,
    refresh: refreshStats
  } = useDriverDashboard({
    userId: user?.id || '',
    warehouseId: currentWarehouseId, // 根据选中的仓库加载数据
    enableRealtime: true
  })

  const loading = warehousesLoading || statsLoading

  // 设置加载超时（8秒）
  // 性能优化：只依赖 user?.id，避免 profile 变化时重置超时定时器
  useEffect(() => {
    if (!user?.id) return

    timeoutRef.current = setTimeout(() => {
      if (!profile) {
        console.error('[DriverHome] 加载超时')
        setLoadTimeout(true)
      }
    }, 8000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [user?.id, profile])

  // 处理仓库切换
  const handleWarehouseChange = useCallback((e: any) => {
    const index = e.detail.current
    setCurrentWarehouseIndex(index)
    // 切换仓库时，useDriverDashboard Hook 会自动加载新仓库的数据（优先使用缓存）
  }, [])

  // 初始加载（批量并行查询优化）
  // 性能优化：只依赖 user?.id 而不是整个 user 对象，避免不必要的重新执行
  useEffect(() => {
    if (user?.id) {
      // 批量并行加载所有初始数据
      Promise.all([loadProfile(), checkAttendance()])
      // 启动实时会话监听（优先使用 WebSocket，失败时降级到轮询）
      startRealtimeMonitor(user.id)
    }
  }, [user?.id, loadProfile, checkAttendance])

  // 页面显示时刷新数据（使用缓存优先策略）
  // 性能优化：不强制刷新，让各个 hook 的缓存机制生效
  useDidShow(() => {
    if (user) {
      // 使用缓存优先策略加载数据，避免重复请求
      // loadProfile 会先检查缓存，缓存有效则不发起请求
      loadProfile()
      // refreshStats 和 refreshSorting 会清除缓存后重新加载
      // 但由于 useDriverDashboard 和 useDriverWarehouses 有缓存机制
      // 如果缓存有效，实际不会发起网络请求
      // 注意：这里不调用 refreshStats() 和 refreshSorting()
      // 因为初始加载时已经加载过数据，useDidShow 只需要检查打卡状态
      checkAttendance()

      // 添加欢迎通知（仅在首次加载时）
      try {
        const hasShownWelcome = getStorageSync('driver_welcome_shown')
        if (!hasShownWelcome) {
          // 添加多条通知以展示滚动效果
          addNotification({
            type: 'system',
            title: '欢迎使用司机工作台',
            content: '您可以在这里打卡、提交计件、申请请假等'
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
              content: '当您的请假申请或离职申请有审批结果时，您会收到实时通知'
            })
          }, 200)

          setStorageSync('driver_welcome_shown', 'true')
        }
      } catch (err) {
        console.error('加载欢迎通知失败:', err)
      }
    }
  })

  // 启用轮询通知（代替 Realtime）
  // 注意：轮询间隔设置为 60 秒，避免频繁请求
  usePollingNotifications({
    userId: user?.id || '',
    userRole: 'driver',
    onLeaveApplicationChange: () => {
      refreshStats()
    },
    onResignationApplicationChange: () => {
      refreshStats()
    },
    onAttendanceChange: () => {
      refreshStats()
      checkAttendance()
    },
    onNewNotification: addNotification
  })

  // ==================== Realtime 订阅：仓库分配变更 ====================
  // 使用 useRealtimeSubscription 订阅 warehouse_assignments 表
  // 收到分配变更时自动刷新仓库列表
  // Requirements: 4.3, 4.4
  useRealtimeSubscription({
    table: 'warehouse_assignments',
    event: '*', // 监听所有事件（INSERT, UPDATE, DELETE）
    // 只监听当前用户的仓库分配
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled: !!user?.id,
    onDataChange: useCallback(
      (event) => {
        console.log('[DriverHome] 收到仓库分配变更:', event.eventType)

        // 显示仓库分配变更通知
        sendDebouncedNotification(NotificationPresets.warehouseAssignmentChanged())

        // 刷新仓库列表和统计数据
        refreshWarehouses()
        refreshSorting()
        refreshStats()
      },
      [refreshWarehouses, refreshSorting, refreshStats]
    ),
    onError: useCallback((error) => {
      console.error('[DriverHome] Realtime 订阅错误:', error)
    }, [])
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    if (user) {
      await Promise.all([loadProfile(), refreshStats(), refreshWarehouses(), refreshSorting()])
    }
    Taro.stopPullDownRefresh()
  })

  // 快捷功能点击处理
  // 性能优化：使用 useCallback 缓存函数，避免每次渲染创建新函数
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'piece-work':
        navigateTo({url: '/pages/driver/piece-work-entry/index'})
        break
      case 'clock-in':
        navigateTo({url: '/pages/driver/clock-in/index'})
        break
      case 'leave':
        navigateTo({url: '/pages/driver/leave/index'})
        break
      case 'stats':
        navigateTo({url: '/pages/driver/piece-work/index'})
        break
      default:
        break
    }
  }, [])

  // 处理统计卡片点击
  // 性能优化：使用 useCallback 缓存函数
  const handleStatsClick = useCallback((type: 'today' | 'month') => {
    // 跳转到数据统计页面，并传递时间范围参数
    navigateTo({url: `/pages/driver/piece-work/index?range=${type}`})
  }, [])

  // 处理考勤卡片点击
  // 性能优化：使用 useCallback 缓存函数
  const handleAttendanceClick = useCallback(() => {
    // 跳转到请假申请页面
    navigateTo({url: '/pages/driver/leave/index'})
  }, [])

  // 退出登录处理
  // 性能优化：使用 useCallback 缓存函数
  const handleLogout = useCallback(() => {
    showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          smartLogout()
        }
      }
    })
  }, [])

  // 获取显示名称（优先显示驾驶证上的真实姓名）
  const getDisplayName = () => {
    // 优先显示驾驶证上的真实姓名
    if (driverLicense?.id_card_name) {
      return driverLicense.id_card_name
    }
    // 其次显示profile中的姓名
    if (profile?.name) {
      return profile.name
    }
    // 再次显示手机号
    if (profile?.phone) {
      return profile.phone
    }
    // 最后显示默认值
    return '司机'
  }

  // 处理打卡提醒弹窗 - 点击"立即打卡"
  const handleClockInConfirm = () => {
    setShowClockInReminder(false)
    navigateTo({url: '/pages/driver/clock-in/index'})
  }

  // 处理打卡提醒弹窗 - 点击"稍后再说"
  const handleClockInCancel = () => {
    setShowClockInReminder(false)
  }

  // 初始加载状态：当用户信息还未加载时显示加载界面
  // 使用 showLoading/hideLoading 处理加载状态
  // 注意：如果正在退出登录，不显示 loading，避免退出时闪现 "加载用户信息中..."
  // 性能优化：只依赖 user?.id 而不是整个 user 对象
  useEffect(() => {
    if (!user?.id && !isLogoutInProgress()) {
      showLoading({title: '加载用户信息中...'})
    } else {
      hideLoading()
    }
  }, [user?.id])

  if (!user) {
    return null
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
              loadProfile()
            }}>
            <Text className="text-white">重试</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      {/* 顶部安全区域 */}
      <SafeAreaTop />
      {/* 顶部导航栏 */}
      <TopNavBar />
      <ScrollView scrollY className="box-border" style={{height: 'calc(100vh - 44px)', background: 'transparent'}}>
        <View className="p-4">
          {/* 欢迎卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-6 mb-4 shadow-lg relative">
            {/* 通知铃铛 - 右下角 */}
            {user && (
              <View className="absolute bottom-4 right-4">
                <NotificationBell userId={user.id} />
              </View>
            )}

            <View className="flex items-center justify-between pr-12">
              <View className="flex-1">
                <Text className="text-white text-2xl font-bold block mb-2">司机工作台</Text>
                <Text className="text-blue-100 text-sm block">欢迎回来，{getDisplayName()}</Text>
              </View>
              {/* 请假状态提示 */}
              {attendanceCheck?.onLeave && (
                <View className="bg-orange-500 rounded-lg px-4 py-2 ml-4">
                  <View className="flex items-center">
                    <View className="i-mdi-beach text-2xl text-white mr-2" />
                    <View>
                      <Text className="text-white text-sm font-bold block">今天您休息</Text>
                      <Text className="text-orange-100 text-xs block">无需打卡</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 通知栏 */}
          <RealNotificationBar />

          {/* 数据统计仪表盘 */}
          <View className="mb-4">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center">
                <View className="i-mdi-view-dashboard text-xl text-blue-900 mr-2" />
                <Text className="text-lg font-bold text-gray-800">数据仪表盘</Text>
                {loading && <View className="ml-2 i-mdi-loading animate-spin text-blue-600" />}
              </View>
              <Text className="text-xs text-gray-500">{new Date().toLocaleDateString('zh-CN')}</Text>
            </View>

            <View className="bg-white rounded-xl p-4 shadow-md">
              <View className="grid grid-cols-3 gap-3">
                {/* 今天件数 */}
                <View
                  className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 active:scale-95 transition-all"
                  onClick={() => handleStatsClick('today')}>
                  <View className="i-mdi-package-variant text-2xl text-blue-600 mb-2" />
                  <Text className="text-xs text-gray-600 block mb-1">今天件数</Text>
                  <Text className="text-2xl font-bold text-blue-900 block">{stats.todayPieceCount}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">件</Text>
                </View>

                {/* 今天收入 */}
                <View
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 active:scale-95 transition-all"
                  onClick={() => handleStatsClick('today')}>
                  <View className="i-mdi-cash-multiple text-2xl text-green-600 mb-2" />
                  <Text className="text-xs text-gray-600 block mb-1">今天收入</Text>
                  <Text className="text-2xl font-bold text-green-600 block">{stats.todayIncome.toFixed(0)}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">元</Text>
                </View>

                {/* 本月件数 */}
                <View
                  className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 active:scale-95 transition-all"
                  onClick={() => handleStatsClick('month')}>
                  <View className="i-mdi-package-variant-closed text-2xl text-purple-600 mb-2" />
                  <Text className="text-xs text-gray-600 block mb-1">本月件数</Text>
                  <Text className="text-2xl font-bold text-purple-900 block">{stats.monthPieceCount}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">件</Text>
                </View>

                {/* 本月收入 */}
                <View
                  className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 active:scale-95 transition-all"
                  onClick={() => handleStatsClick('month')}>
                  <View className="i-mdi-currency-cny text-2xl text-orange-600 mb-2" />
                  <Text className="text-xs text-gray-600 block mb-1">本月收入</Text>
                  <Text className="text-2xl font-bold text-orange-600 block">{stats.monthIncome.toFixed(0)}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">元</Text>
                </View>

                {/* 出勤天数 */}
                <View
                  className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 active:scale-95 transition-all"
                  onClick={handleAttendanceClick}>
                  <View className="i-mdi-calendar-check text-2xl text-teal-600 mb-2" />
                  <Text className="text-xs text-gray-600 block mb-1">出勤天数</Text>
                  <Text className="text-2xl font-bold text-teal-900 block">{stats.attendanceDays}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">天</Text>
                </View>

                {/* 请假天数 */}
                <View
                  className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 active:scale-95 transition-all"
                  onClick={handleAttendanceClick}>
                  <View className="i-mdi-calendar-remove text-2xl text-red-600 mb-2" />
                  <Text className="text-xs text-gray-600 block mb-1">请假天数</Text>
                  <Text className="text-2xl font-bold text-red-900 block">{stats.leaveDays}</Text>
                  <Text className="text-xs text-gray-400 block mt-1">天</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 仓库切换器（多仓库时显示） */}
          {warehouses.length > 1 && (
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

          {/* 快捷功能板块 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <View className="flex items-center justify-between mb-4">
              <View className="flex items-center">
                <View className="i-mdi-lightning-bolt text-xl text-orange-600 mr-2" />
                <Text className="text-lg font-bold text-gray-800">快捷功能</Text>
              </View>
              {/* 右侧个人中心按钮 */}
              <View
                className="flex items-center bg-blue-50 rounded-full px-3 py-1 active:scale-95 transition-all"
                onClick={() => Taro.switchTab({url: '/pages/profile/index'})}>
                <View className="i-mdi-account-circle text-lg text-blue-600 mr-1" />
                <Text className="text-sm text-blue-600 font-medium">个人中心</Text>
              </View>
            </View>

            {/* 2x2网格布局 */}
            <View className="grid grid-cols-2 gap-4">
              {/* 计件录入 */}
              <View
                className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl active:scale-95 transition-all shadow"
                onClick={() => handleQuickAction('piece-work')}>
                <View className="i-mdi-clipboard-edit text-5xl text-blue-600 mb-3" />
                <Text className="text-base font-medium text-gray-800">计件录入</Text>
              </View>

              {/* 考勤打卡 */}
              <View
                className="flex flex-col items-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl active:scale-95 transition-all shadow"
                onClick={() => handleQuickAction('clock-in')}>
                <View className="i-mdi-clock-check text-5xl text-orange-600 mb-3" />
                <Text className="text-base font-medium text-gray-800">考勤打卡</Text>
              </View>

              {/* 请假申请 */}
              <View
                className="flex flex-col items-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl active:scale-95 transition-all shadow"
                onClick={() => handleQuickAction('leave')}>
                <View className="i-mdi-calendar-remove text-5xl text-purple-600 mb-3" />
                <Text className="text-base font-medium text-gray-800">请假申请</Text>
              </View>

              {/* 车辆管理 */}
              <View
                className="flex flex-col items-center p-6 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl active:scale-95 transition-all shadow"
                onClick={() => navigateTo({url: '/pages/driver/vehicle-list/index'})}>
                <View className="i-mdi-car text-5xl text-cyan-600 mb-3" />
                <Text className="text-base font-medium text-gray-800">车辆管理</Text>
              </View>
            </View>
          </View>

          {/* 数据统计卡片 */}
          <View className="bg-white rounded-xl p-4 shadow-md mb-4">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center">
                <View className="i-mdi-chart-line text-xl text-blue-900 mr-2" />
                <Text className="text-lg font-bold text-gray-800">数据统计</Text>
              </View>
              <View
                className="flex items-center bg-blue-50 rounded-full px-3 py-1 active:scale-95 transition-all"
                onClick={() => handleQuickAction('stats')}>
                <Text className="text-sm text-blue-600 font-medium mr-1">查看详情</Text>
                <View className="i-mdi-chevron-right text-blue-600" />
              </View>
            </View>
            <View className="grid grid-cols-2 gap-3">
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">本月件数</Text>
                <Text className="text-2xl font-bold text-blue-600">{stats?.monthPieceCount || 0}</Text>
              </View>
              <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">本月出勤</Text>
                <Text className="text-2xl font-bold text-green-600">{stats?.attendanceDays || 0}天</Text>
              </View>
            </View>
          </View>

          {/* 所属仓库卡片 */}
          <View className="bg-white rounded-xl p-4 shadow-md mb-4">
            <View className="flex items-center mb-3">
              <View className="i-mdi-warehouse text-xl text-blue-900 mr-2" />
              <Text className="text-lg font-bold text-gray-800">所属仓库</Text>
            </View>
            {warehouses.length > 0 ? (
              <View className="space-y-2">
                {warehouses.map((warehouse) => (
                  <View
                    key={warehouse.id}
                    className="flex items-center bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 active:scale-98 transition-all"
                    onClick={() =>
                      navigateTo({url: `/pages/driver/warehouse-stats/index?warehouseId=${warehouse.id}`})
                    }>
                    <View className="i-mdi-map-marker text-blue-600 text-xl mr-2" />
                    <Text className="text-gray-800 text-sm flex-1 font-medium">{warehouse.name}</Text>
                    <View className={`px-2 py-1 rounded mr-2 ${warehouse.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Text className={`text-xs ${warehouse.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                        {warehouse.is_active ? '启用中' : '已禁用'}
                      </Text>
                    </View>
                    <View className="i-mdi-chevron-right text-gray-400 text-xl" />
                  </View>
                ))}
              </View>
            ) : (
              <View className="text-center py-8">
                <View className="i-mdi-alert-circle text-gray-300 text-5xl mb-3" />
                <Text className="text-gray-400 text-sm block font-medium">暂未分配仓库</Text>
                <Text className="text-gray-400 text-xs block mt-1">请联系管理员分配仓库</Text>
              </View>
            )}
          </View>

          {/* 退出登录按钮 */}
          <View className="bg-white rounded-xl p-4 shadow-md mb-4">
            <View
              className="flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 active:scale-98 transition-all"
              onClick={handleLogout}>
              <View className="i-mdi-logout text-2xl text-white mr-2" />
              <Text className="text-base font-bold text-white">退出登录</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 打卡提醒弹窗 */}
      <ClockInReminderModal
        visible={showClockInReminder}
        onClose={handleClockInCancel}
        onConfirm={handleClockInConfirm}
        message="您今天尚未打卡，是否立即去打卡？"
      />
    </View>
  )
}

export default DriverHome
