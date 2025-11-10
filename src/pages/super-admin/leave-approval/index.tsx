import {Button, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  getAllAttendanceRecords,
  getAllLeaveApplications,
  getAllProfiles,
  getAllResignationApplications,
  getAllWarehouses,
  getManagerWarehouses,
  reviewLeaveApplication,
  reviewResignationApplication
} from '@/db/api'
import type {AttendanceRecord, LeaveApplication, Profile, ResignationApplication, Warehouse} from '@/db/types'

// 司机统计数据类型
interface DriverStats {
  driverId: string
  driverName: string
  warehouseId: string
  warehouseName: string
  totalLeaveDays: number
  leaveCount: number
  resignationCount: number
  attendanceCount: number
  pendingCount: number
}

// 打卡记录统计类型
interface AttendanceStats {
  totalRecords: number
  normalCount: number
  lateCount: number
  earlyCount: number
  absentCount: number
}

const SuperAdminLeaveApproval: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [resignationApplications, setResignationApplications] = useState<ResignationApplication[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [managerWarehouses, setManagerWarehouses] = useState<Warehouse[]>([])
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState<number>(0) // 当前仓库索引
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [filterDriver, setFilterDriver] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'pending' | 'stats' | 'attendance'>('pending')
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [showFilters, setShowFilters] = useState<boolean>(false) // 筛选条件是否展开

  // 初始化当前月份
  const initCurrentMonth = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }, [])

  // 默认显示本月数据
  const [filterMonth, setFilterMonth] = useState<string>(initCurrentMonth())

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user) return

    showLoading({title: '加载中...'})

    try {
      // 获取所有仓库信息
      const allWarehouses = await getAllWarehouses()
      setWarehouses(allWarehouses)

      // 获取所有用户信息
      const allProfiles = await getAllProfiles()
      setProfiles(allProfiles)

      // 获取当前用户信息
      const userProfile = allProfiles.find((p) => p.id === user.id) || null
      setCurrentUserProfile(userProfile)

      // 获取所有请假申请（包括历史数据）
      const allLeaveApps = await getAllLeaveApplications()
      setLeaveApplications(allLeaveApps)

      // 获取所有离职申请（包括历史数据）
      const allResignationApps = await getAllResignationApplications()
      setResignationApplications(allResignationApps)

      // 获取管理员管辖的仓库
      const managedWarehouses = await getManagerWarehouses(user.id)
      setManagerWarehouses(managedWarehouses)

      // 始终加载打卡记录（进入页面时加载全部数据）
      const currentMonth = filterMonth || initCurrentMonth()
      const [year, month] = currentMonth.split('-').map(Number)
      const records = await getAllAttendanceRecords(year, month)

      // 根据权限过滤记录
      if (userProfile?.role === 'super_admin') {
        // 超级管理员可以看到所有记录
        setAttendanceRecords(records)
      } else if (userProfile?.role === 'manager') {
        // 普通管理员只能看到管辖仓库的记录
        const managedWarehouseIds = managedWarehouses.map((w) => w.id)
        const filteredRecords = records.filter((r) => managedWarehouseIds.includes(r.warehouse_id))
        setAttendanceRecords(filteredRecords)
      }
    } finally {
      Taro.hideLoading()
    }
  }, [user, filterMonth, initCurrentMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await loadData()
    Taro.stopPullDownRefresh()
  })

  // 获取用户姓名
  const getUserName = (userId: string) => {
    const profile = profiles.find((p) => p.id === userId)
    return profile?.name || profile?.phone || '未知'
  }

  // 获取仓库名称
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
  }

  // 计算请假天数
  const calculateLeaveDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return dateStr.split('T')[0]
  }

  // 获取可见的仓库列表（根据权限）
  const getVisibleWarehouses = () => {
    if (!currentUserProfile) return []

    if (currentUserProfile.role === 'super_admin') {
      // 超级管理员可以看到所有仓库
      return warehouses
    } else if (currentUserProfile.role === 'manager') {
      // 普通管理员只能看到自己管辖的仓库
      const managedWarehouseIds = managerWarehouses.map((w) => w.id)
      return warehouses.filter((w) => managedWarehouseIds.includes(w.id))
    }

    return []
  }

  // 获取当前仓库
  const getCurrentWarehouse = () => {
    const visibleWarehouses = getVisibleWarehouses()
    if (visibleWarehouses.length === 0) return null
    return visibleWarehouses[currentWarehouseIndex] || visibleWarehouses[0]
  }

  // 获取当前仓库ID（用于筛选）
  const getCurrentWarehouseId = () => {
    const currentWarehouse = getCurrentWarehouse()
    return currentWarehouse?.id || 'all'
  }

  // 左右滑动切换仓库
  const handleSwipeWarehouse = (direction: 'left' | 'right') => {
    const visibleWarehouses = getVisibleWarehouses()
    if (visibleWarehouses.length === 0) return

    if (direction === 'left') {
      // 向左滑动，显示下一个仓库
      setCurrentWarehouseIndex((prev) => (prev + 1) % visibleWarehouses.length)
    } else {
      // 向右滑动，显示上一个仓库
      setCurrentWarehouseIndex((prev) => (prev - 1 + visibleWarehouses.length) % visibleWarehouses.length)
    }
  }

  // 获取可见的申请数据（根据权限和筛选条件）
  const getVisibleApplications = () => {
    let visibleLeave = leaveApplications
    let visibleResignation = resignationApplications

    // 如果是普通管理员，只显示其管辖仓库的数据
    if (currentUserProfile?.role === 'manager') {
      const managedWarehouseIds = managerWarehouses.map((w) => w.id)
      visibleLeave = leaveApplications.filter((app) => managedWarehouseIds.includes(app.warehouse_id))
      visibleResignation = resignationApplications.filter((app) => managedWarehouseIds.includes(app.warehouse_id))
    }

    // 按当前仓库筛选
    const currentWarehouseId = getCurrentWarehouseId()
    if (currentWarehouseId !== 'all') {
      visibleLeave = visibleLeave.filter((app) => app.warehouse_id === currentWarehouseId)
      visibleResignation = visibleResignation.filter((app) => app.warehouse_id === currentWarehouseId)
    }

    // 按状态筛选
    if (filterStatus !== 'all') {
      visibleLeave = visibleLeave.filter((app) => app.status === filterStatus)
      visibleResignation = visibleResignation.filter((app) => app.status === filterStatus)
    }

    return {visibleLeave, visibleResignation}
  }

  // 计算司机统计数据
  const calculateDriverStats = (): DriverStats[] => {
    const {visibleLeave, visibleResignation} = getVisibleApplications()

    // 获取所有司机（role为driver的用户）
    const drivers = profiles.filter((p) => p.role === 'driver')

    const statsMap = new Map<string, DriverStats>()

    // 处理请假申请
    for (const app of visibleLeave) {
      const driver = drivers.find((d) => d.id === app.user_id)
      if (!driver) continue

      if (!statsMap.has(driver.id)) {
        statsMap.set(driver.id, {
          driverId: driver.id,
          driverName: getUserName(driver.id),
          warehouseId: app.warehouse_id,
          warehouseName: getWarehouseName(app.warehouse_id),
          totalLeaveDays: 0,
          leaveCount: 0,
          resignationCount: 0,
          attendanceCount: 0,
          pendingCount: 0
        })
      }

      const stats = statsMap.get(driver.id)!
      stats.leaveCount++

      // 只统计已通过的请假天数
      if (app.status === 'approved') {
        stats.totalLeaveDays += calculateLeaveDays(app.start_date, app.end_date)
      }

      // 统计待审批数量
      if (app.status === 'pending') {
        stats.pendingCount++
      }
    }

    // 处理离职申请
    for (const app of visibleResignation) {
      const driver = drivers.find((d) => d.id === app.user_id)
      if (!driver) continue

      if (!statsMap.has(driver.id)) {
        statsMap.set(driver.id, {
          driverId: driver.id,
          driverName: getUserName(driver.id),
          warehouseId: app.warehouse_id,
          warehouseName: getWarehouseName(app.warehouse_id),
          totalLeaveDays: 0,
          leaveCount: 0,
          resignationCount: 0,
          attendanceCount: 0,
          pendingCount: 0
        })
      }

      const stats = statsMap.get(driver.id)!
      stats.resignationCount++

      // 统计待审批数量
      if (app.status === 'pending') {
        stats.pendingCount++
      }
    }

    // 处理打卡记录
    let visibleAttendance = attendanceRecords
    // 如果是普通管理员，只显示其管辖仓库的数据
    if (currentUserProfile?.role === 'manager') {
      const managerWarehouseIds = managerWarehouses.map((w) => w.id)
      visibleAttendance = attendanceRecords.filter((record) =>
        record.warehouse_id ? managerWarehouseIds.includes(record.warehouse_id) : false
      )
    }
    // 按当前仓库筛选
    const currentWarehouseId = getCurrentWarehouseId()
    if (currentWarehouseId !== 'all') {
      visibleAttendance = visibleAttendance.filter((record) => record.warehouse_id === currentWarehouseId)
    }

    for (const record of visibleAttendance) {
      const driver = drivers.find((d) => d.id === record.user_id)
      if (!driver) continue

      if (!statsMap.has(driver.id)) {
        // 如果还没有这个司机的统计，需要找到他的仓库信息
        const driverWarehouseId = record.warehouse_id || ''
        statsMap.set(driver.id, {
          driverId: driver.id,
          driverName: getUserName(driver.id),
          warehouseId: driverWarehouseId,
          warehouseName: getWarehouseName(driverWarehouseId),
          totalLeaveDays: 0,
          leaveCount: 0,
          resignationCount: 0,
          attendanceCount: 0,
          pendingCount: 0
        })
      }

      const stats = statsMap.get(driver.id)!
      stats.attendanceCount++
    }

    return Array.from(statsMap.values()).sort(
      (a, b) => b.pendingCount - a.pendingCount || b.totalLeaveDays - a.totalLeaveDays
    )
  }

  // 审批请假申请
  const handleReviewLeave = async (applicationId: string, approved: boolean) => {
    if (!user) return

    try {
      showLoading({title: approved ? '批准中...' : '拒绝中...'})

      const success = await reviewLeaveApplication(applicationId, {
        status: approved ? 'approved' : 'rejected',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString()
      })

      if (success) {
        showToast({
          title: approved ? '已批准' : '已拒绝',
          icon: 'success',
          duration: 1500
        })
        await loadData()
      } else {
        throw new Error('操作失败')
      }
    } catch (_error) {
      showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      Taro.hideLoading()
    }
  }

  // 审批离职申请
  const handleReviewResignation = async (applicationId: string, approved: boolean) => {
    if (!user) return

    try {
      showLoading({title: approved ? '批准中...' : '拒绝中...'})

      const success = await reviewResignationApplication(applicationId, {
        status: approved ? 'approved' : 'rejected',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString()
      })

      if (success) {
        showToast({
          title: approved ? '已批准' : '已拒绝',
          icon: 'success',
          duration: 1500
        })
        await loadData()
      } else {
        throw new Error('操作失败')
      }
    } catch (_error) {
      showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      Taro.hideLoading()
    }
  }

  // 跳转到司机详情页
  const navigateToDriverDetail = (driverId: string) => {
    Taro.navigateTo({
      url: `/pages/super-admin/driver-leave-detail/index?driverId=${driverId}`
    })
  }

  // 打卡记录相关函数
  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 获取状态文本和样式
  const getStatusInfo = (record: AttendanceRecord) => {
    if (record.status === 'absent') {
      return {text: '缺勤', color: 'text-red-600', bg: 'bg-red-50'}
    }
    if (record.status === 'late') {
      return {text: '迟到', color: 'text-orange-600', bg: 'bg-orange-50'}
    }
    if (record.status === 'early') {
      return {text: '早退', color: 'text-yellow-600', bg: 'bg-yellow-50'}
    }
    return {text: '正常', color: 'text-green-600', bg: 'bg-green-50'}
  }

  // 获取可见的打卡记录
  const getVisibleAttendanceRecords = () => {
    let visible = attendanceRecords
    const _managedWarehouseIds = managerWarehouses.map((w) => w.id)

    // 按当前仓库筛选
    const currentWarehouseId = getCurrentWarehouseId()
    if (currentWarehouseId !== 'all') {
      visible = visible.filter((r) => r.warehouse_id === currentWarehouseId)
    }

    // 按司机筛选
    if (filterDriver !== 'all') {
      visible = visible.filter((r) => r.user_id === filterDriver)
    }

    // 按日期倒序排序
    return visible.sort((a, b) => new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime())
  }

  // 计算打卡统计数据
  const calculateAttendanceStats = (): AttendanceStats => {
    const visible = getVisibleAttendanceRecords()
    return {
      totalRecords: visible.length,
      normalCount: visible.filter((r) => r.status === 'normal').length,
      lateCount: visible.filter((r) => r.status === 'late').length,
      earlyCount: visible.filter((r) => r.status === 'early').length,
      absentCount: visible.filter((r) => r.status === 'absent').length
    }
  }

  // 生成月份选项（最近12个月）
  const generateMonthOptions = () => {
    const options: string[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      options.push(`${year}-${month}`)
    }
    return options
  }

  // 获取司机列表（去重）
  const getDriverList = () => {
    const driverIds = new Set(attendanceRecords.map((r) => r.user_id))
    return Array.from(driverIds)
      .map((id) => ({
        id,
        name: getUserName(id)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const driverStats = calculateDriverStats()
  const _visibleWarehouses = getVisibleWarehouses()
  const {visibleLeave, visibleResignation} = getVisibleApplications()

  // 统计数据
  const totalDrivers = driverStats.length
  const _totalLeaveDays = driverStats.reduce((sum, s) => sum + s.totalLeaveDays, 0)
  const totalPending = driverStats.reduce((sum, s) => sum + s.pendingCount, 0)
  const pendingLeave = visibleLeave.filter((app) => app.status === 'pending')
  const pendingResignation = visibleResignation.filter((app) => app.status === 'pending')

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">考勤管理</Text>
            <Text className="text-blue-100 text-sm block">
              {currentUserProfile?.role === 'super_admin' ? '超级管理员' : '管理员'}工作台
            </Text>
          </View>

          {/* 统计卡片 */}
          <View className="grid grid-cols-2 gap-3 mb-4">
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">司机总数</Text>
              <Text className="text-3xl font-bold text-blue-900 block">{totalDrivers}</Text>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">待审批</Text>
              <Text className="text-3xl font-bold text-red-600 block">{totalPending}</Text>
            </View>
          </View>

          {/* 标签切换 */}
          <View className="flex gap-2 mb-4">
            <View
              className={`flex-1 text-center py-3 rounded-lg ${activeTab === 'pending' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => setActiveTab('pending')}>
              <Text className={`text-xs font-bold ${activeTab === 'pending' ? 'text-white' : 'text-gray-600'}`}>
                待审批 ({totalPending})
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-3 rounded-lg ${activeTab === 'stats' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => setActiveTab('stats')}>
              <Text className={`text-xs font-bold ${activeTab === 'stats' ? 'text-white' : 'text-gray-600'}`}>
                司机统计
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-3 rounded-lg ${activeTab === 'attendance' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => {
                setActiveTab('attendance')
                if (!filterMonth) {
                  setFilterMonth(initCurrentMonth())
                }
              }}>
              <Text className={`text-xs font-bold ${activeTab === 'attendance' ? 'text-white' : 'text-gray-600'}`}>
                打卡记录
              </Text>
            </View>
          </View>

          {/* 仓库切换区域 - 左右滑动 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center justify-between">
              <View
                className="i-mdi-chevron-left text-3xl text-blue-600 cursor-pointer"
                onClick={() => handleSwipeWarehouse('right')}
              />
              <View className="flex-1 text-center">
                <Text className="text-lg font-bold text-gray-800 block">
                  {getCurrentWarehouse()?.name || '全部仓库'}
                </Text>
                <Text className="text-xs text-gray-500 mt-1 block">
                  左右滑动切换仓库 ({currentWarehouseIndex + 1}/{getVisibleWarehouses().length})
                </Text>
              </View>
              <View
                className="i-mdi-chevron-right text-3xl text-blue-600 cursor-pointer"
                onClick={() => handleSwipeWarehouse('left')}
              />
            </View>
          </View>

          {/* 筛选条件展开/收起按钮 */}
          <View className="mb-4">
            <Button
              size="default"
              className="bg-white text-blue-600 border border-blue-600"
              onClick={() => setShowFilters(!showFilters)}>
              <View className="flex items-center justify-center gap-2">
                <View className={`i-mdi-filter-variant text-lg ${showFilters ? 'text-blue-600' : 'text-gray-600'}`} />
                <Text className={`text-sm ${showFilters ? 'text-blue-600' : 'text-gray-600'}`}>
                  {showFilters ? '收起筛选' : '展开筛选'}
                </Text>
                <View
                  className={`i-mdi-chevron-${showFilters ? 'up' : 'down'} text-lg ${showFilters ? 'text-blue-600' : 'text-gray-600'}`}
                />
              </View>
            </Button>
          </View>

          {/* 筛选条件区域 - 默认隐藏 */}
          {showFilters && (
            <View className="bg-white rounded-lg p-4 mb-4 shadow">
              <Text className="text-sm font-bold text-gray-800 mb-3 block">筛选条件</Text>

              {/* 待审批标签页的筛选条件 */}
              {activeTab === 'pending' && (
                <View>
                  {/* 状态筛选 */}
                  <View>
                    <Text className="text-xs text-gray-600 mb-2 block">选择状态</Text>
                    <Picker
                      mode="selector"
                      range={['待审批', '已批准', '已拒绝', '全部状态']}
                      value={
                        filterStatus === 'pending'
                          ? 0
                          : filterStatus === 'approved'
                            ? 1
                            : filterStatus === 'rejected'
                              ? 2
                              : 3
                      }
                      onChange={(e) => {
                        const index = Number(e.detail.value)
                        setFilterStatus(
                          index === 0 ? 'pending' : index === 1 ? 'approved' : index === 2 ? 'rejected' : 'all'
                        )
                      }}>
                      <View className="border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between">
                        <Text className="text-sm text-gray-800">
                          {filterStatus === 'pending'
                            ? '待审批'
                            : filterStatus === 'approved'
                              ? '已批准'
                              : filterStatus === 'rejected'
                                ? '已拒绝'
                                : '全部状态'}
                        </Text>
                        <View className="i-mdi-chevron-down text-xl text-gray-400" />
                      </View>
                    </Picker>
                  </View>
                </View>
              )}

              {/* 打卡记录和司机统计标签页的筛选条件 */}
              {(activeTab === 'attendance' || activeTab === 'stats') && (
                <View>
                  {/* 月份筛选 */}
                  <View className="mb-3">
                    <Text className="text-xs text-gray-600 mb-2 block">选择月份</Text>
                    <Picker
                      mode="selector"
                      range={generateMonthOptions()}
                      value={generateMonthOptions().indexOf(filterMonth)}
                      onChange={(e) => {
                        const selectedMonth = generateMonthOptions()[e.detail.value]
                        setFilterMonth(selectedMonth)
                      }}>
                      <View className="border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between">
                        <Text className="text-sm text-gray-800">{filterMonth}</Text>
                        <View className="i-mdi-chevron-down text-xl text-gray-400" />
                      </View>
                    </Picker>
                  </View>

                  {/* 司机筛选 */}
                  <View>
                    <Text className="text-xs text-gray-600 mb-2 block">选择司机</Text>
                    <Picker
                      mode="selector"
                      range={['全部司机', ...getDriverList().map((d) => d.name)]}
                      value={
                        filterDriver === 'all'
                          ? 0
                          : Math.max(0, getDriverList().findIndex((d) => d.id === filterDriver) + 1)
                      }
                      onChange={(e) => {
                        const selectedIndex = Number(e.detail.value)
                        if (selectedIndex === 0) {
                          setFilterDriver('all')
                        } else {
                          setFilterDriver(getDriverList()[selectedIndex - 1].id)
                        }
                      }}>
                      <View className="border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between">
                        <Text className="text-sm text-gray-800">
                          {filterDriver === 'all' ? '全部司机' : getUserName(filterDriver)}
                        </Text>
                        <View className="i-mdi-chevron-down text-xl text-gray-400" />
                      </View>
                    </Picker>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 待审批申请列表 */}
          {activeTab === 'pending' && (
            <View className="mb-4">
              <View className="flex items-center justify-between mb-3">
                <Text className="text-base font-bold text-gray-800">待审批申请</Text>
                <Text className="text-xs text-gray-500">
                  {pendingLeave.length + pendingResignation.length} 条待审批
                </Text>
              </View>

              {/* 请假申请 */}
              {pendingLeave.length > 0 && (
                <View className="mb-4">
                  <Text className="text-sm font-bold text-gray-700 block mb-2">请假申请</Text>
                  {pendingLeave.map((app) => (
                    <View key={app.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                      {/* 申请人信息 */}
                      <View className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <View className="flex items-center">
                          <View className="i-mdi-account-circle text-3xl text-blue-900 mr-3" />
                          <View>
                            <Text className="text-base font-bold text-gray-800 block">{getUserName(app.user_id)}</Text>
                            <Text className="text-xs text-gray-500">{getWarehouseName(app.warehouse_id)}</Text>
                          </View>
                        </View>
                        <View className="bg-orange-50 px-3 py-1 rounded-full">
                          <Text className="text-xs text-orange-600 font-bold">待审批</Text>
                        </View>
                      </View>

                      {/* 请假信息 */}
                      <View className="space-y-2 mb-3">
                        <View className="flex items-center">
                          <View className="i-mdi-calendar-range text-lg text-gray-500 mr-2" />
                          <Text className="text-sm text-gray-700">
                            {formatDate(app.start_date)} 至 {formatDate(app.end_date)}
                          </Text>
                        </View>
                        <View className="flex items-center">
                          <View className="i-mdi-calendar-clock text-lg text-gray-500 mr-2" />
                          <Text className="text-sm text-gray-700">
                            请假天数：{calculateLeaveDays(app.start_date, app.end_date)} 天
                          </Text>
                        </View>
                        {app.reason && (
                          <View className="flex items-start">
                            <View className="i-mdi-text text-lg text-gray-500 mr-2 mt-0.5" />
                            <Text className="text-sm text-gray-700 flex-1">理由：{app.reason}</Text>
                          </View>
                        )}
                      </View>

                      {/* 操作按钮 */}
                      <View className="flex gap-2">
                        <Button
                          size="default"
                          className="flex-1 bg-green-600 text-white text-sm font-bold break-keep"
                          onClick={() => handleReviewLeave(app.id, true)}>
                          批准
                        </Button>
                        <Button
                          size="default"
                          className="flex-1 bg-red-600 text-white text-sm font-bold break-keep"
                          onClick={() => handleReviewLeave(app.id, false)}>
                          拒绝
                        </Button>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* 离职申请 */}
              {pendingResignation.length > 0 && (
                <View className="mb-4">
                  <Text className="text-sm font-bold text-gray-700 block mb-2">离职申请</Text>
                  {pendingResignation.map((app) => (
                    <View key={app.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                      {/* 申请人信息 */}
                      <View className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <View className="flex items-center">
                          <View className="i-mdi-account-circle text-3xl text-purple-900 mr-3" />
                          <View>
                            <Text className="text-base font-bold text-gray-800 block">{getUserName(app.user_id)}</Text>
                            <Text className="text-xs text-gray-500">{getWarehouseName(app.warehouse_id)}</Text>
                          </View>
                        </View>
                        <View className="bg-purple-50 px-3 py-1 rounded-full">
                          <Text className="text-xs text-purple-600 font-bold">离职申请</Text>
                        </View>
                      </View>

                      {/* 离职信息 */}
                      <View className="space-y-2 mb-3">
                        <View className="flex items-center">
                          <View className="i-mdi-calendar text-lg text-gray-500 mr-2" />
                          <Text className="text-sm text-gray-700">离职日期：{formatDate(app.expected_date)}</Text>
                        </View>
                        {app.reason && (
                          <View className="flex items-start">
                            <View className="i-mdi-text text-lg text-gray-500 mr-2 mt-0.5" />
                            <Text className="text-sm text-gray-700 flex-1">理由：{app.reason}</Text>
                          </View>
                        )}
                      </View>

                      {/* 操作按钮 */}
                      <View className="flex gap-2">
                        <Button
                          size="default"
                          className="flex-1 bg-green-600 text-white text-sm font-bold break-keep"
                          onClick={() => handleReviewResignation(app.id, true)}>
                          批准
                        </Button>
                        <Button
                          size="default"
                          className="flex-1 bg-red-600 text-white text-sm font-bold break-keep"
                          onClick={() => handleReviewResignation(app.id, false)}>
                          拒绝
                        </Button>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* 无待审批申请 */}
              {pendingLeave.length === 0 && pendingResignation.length === 0 && (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-check-circle text-6xl text-green-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无待审批申请</Text>
                </View>
              )}
            </View>
          )}

          {/* 司机统计列表 */}
          {activeTab === 'stats' && (
            <View className="mb-4">
              <View className="flex items-center justify-between mb-3">
                <Text className="text-base font-bold text-gray-800">司机请假统计</Text>
                <Text className="text-xs text-gray-500">点击查看详情</Text>
              </View>

              {driverStats.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-account-off text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无司机数据</Text>
                </View>
              ) : (
                driverStats.map((stats) => (
                  <View
                    key={stats.driverId}
                    className="bg-white rounded-lg p-4 mb-3 shadow"
                    onClick={() => navigateToDriverDetail(stats.driverId)}>
                    {/* 司机信息头部 */}
                    <View className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                      <View className="flex items-center">
                        <View className="i-mdi-account-circle text-3xl text-blue-900 mr-3" />
                        <View>
                          <Text className="text-base font-bold text-gray-800 block">{stats.driverName}</Text>
                          <Text className="text-xs text-gray-500">{stats.warehouseName}</Text>
                        </View>
                      </View>
                      {stats.pendingCount > 0 && (
                        <View className="bg-red-50 px-3 py-1 rounded-full">
                          <Text className="text-xs text-red-600 font-bold">{stats.pendingCount} 待审批</Text>
                        </View>
                      )}
                    </View>

                    {/* 统计数据 */}
                    <View className={`grid gap-3 ${stats.resignationCount > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      <View className="text-center">
                        <Text className="text-2xl font-bold text-orange-600 block">{stats.totalLeaveDays}</Text>
                        <Text className="text-xs text-gray-500">请假天数</Text>
                      </View>
                      <View className="text-center">
                        <Text className="text-2xl font-bold text-blue-600 block">{stats.leaveCount}</Text>
                        <Text className="text-xs text-gray-500">请假次数</Text>
                      </View>
                      <View className="text-center">
                        <Text className="text-2xl font-bold text-green-600 block">{stats.attendanceCount}</Text>
                        <Text className="text-xs text-gray-500">打卡次数</Text>
                      </View>
                      {stats.resignationCount > 0 && (
                        <View className="text-center">
                          <Text className="text-2xl font-bold text-purple-600 block">{stats.resignationCount}</Text>
                          <Text className="text-xs text-gray-500">离职申请</Text>
                        </View>
                      )}
                    </View>

                    {/* 查看详情提示 */}
                    <View className="flex items-center justify-center mt-3 pt-3 border-t border-gray-100">
                      <Text className="text-xs text-blue-600 mr-1">查看详细记录</Text>
                      <View className="i-mdi-chevron-right text-sm text-blue-600" />
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* 打卡记录标签页 */}
          {activeTab === 'attendance' && (
            <View className="mb-4">
              {/* 统计数据 */}
              <View className="bg-white rounded-lg p-4 mb-4 shadow">
                <Text className="text-sm font-bold text-gray-800 mb-3 block">打卡统计</Text>
                <View className="grid grid-cols-4 gap-3">
                  <View className="text-center">
                    <Text className="text-xl font-bold text-blue-600 block">
                      {calculateAttendanceStats().totalRecords}
                    </Text>
                    <Text className="text-xs text-gray-500">总记录</Text>
                  </View>
                  <View className="text-center">
                    <Text className="text-xl font-bold text-green-600 block">
                      {calculateAttendanceStats().normalCount}
                    </Text>
                    <Text className="text-xs text-gray-500">正常</Text>
                  </View>
                  <View className="text-center">
                    <Text className="text-xl font-bold text-orange-600 block">
                      {calculateAttendanceStats().lateCount}
                    </Text>
                    <Text className="text-xs text-gray-500">迟到</Text>
                  </View>
                  <View className="text-center">
                    <Text className="text-xl font-bold text-yellow-600 block">
                      {calculateAttendanceStats().earlyCount}
                    </Text>
                    <Text className="text-xs text-gray-500">早退</Text>
                  </View>
                </View>
              </View>

              {/* 打卡记录列表 */}
              <View className="flex items-center justify-between mb-3">
                <Text className="text-base font-bold text-gray-800">打卡记录</Text>
                <Text className="text-xs text-gray-500">{getVisibleAttendanceRecords().length} 条记录</Text>
              </View>

              {getVisibleAttendanceRecords().length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-clock-outline text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无打卡记录</Text>
                </View>
              ) : (
                getVisibleAttendanceRecords().map((record) => {
                  const statusInfo = getStatusInfo(record)
                  return (
                    <View key={record.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                      {/* 头部信息 */}
                      <View className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <View className="flex items-center">
                          <View className="i-mdi-account-circle text-2xl text-blue-900 mr-2" />
                          <View>
                            <Text className="text-sm font-bold text-gray-800 block">{getUserName(record.user_id)}</Text>
                            <Text className="text-xs text-gray-500">{getWarehouseName(record.warehouse_id || '')}</Text>
                          </View>
                        </View>
                        <View className={`${statusInfo.bg} px-3 py-1 rounded-full`}>
                          <Text className={`text-xs font-bold ${statusInfo.color}`}>{statusInfo.text}</Text>
                        </View>
                      </View>

                      {/* 打卡详情 */}
                      <View className="space-y-2">
                        <View className="flex items-center">
                          <View className="i-mdi-calendar text-base text-gray-500 mr-2" />
                          <Text className="text-sm text-gray-700">{record.work_date}</Text>
                        </View>
                        <View className="flex items-center">
                          <View className="i-mdi-clock-in text-base text-green-600 mr-2" />
                          <Text className="text-sm text-gray-700">上班：{formatTime(record.clock_in_time)}</Text>
                        </View>
                        {record.clock_out_time && (
                          <View className="flex items-center">
                            <View className="i-mdi-clock-out text-base text-blue-600 mr-2" />
                            <Text className="text-sm text-gray-700">下班：{formatTime(record.clock_out_time)}</Text>
                          </View>
                        )}
                        {record.work_hours !== null && (
                          <View className="flex items-center">
                            <View className="i-mdi-timer text-base text-blue-600 mr-2" />
                            <Text className="text-sm text-gray-700">工作时长：{record.work_hours.toFixed(1)} 小时</Text>
                          </View>
                        )}
                        {record.notes && (
                          <View className="flex items-start">
                            <View className="i-mdi-note-text text-base text-gray-500 mr-2 mt-0.5" />
                            <Text className="text-sm text-gray-700 flex-1">{record.notes}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default SuperAdminLeaveApproval
