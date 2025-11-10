import {Button, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  getAllLeaveApplications,
  getAllProfiles,
  getAllResignationApplications,
  getAllWarehouses,
  getManagerWarehouses,
  reviewLeaveApplication,
  reviewResignationApplication
} from '@/db/api'
import type {LeaveApplication, Profile, ResignationApplication, Warehouse} from '@/db/types'

// 司机统计数据类型
interface DriverStats {
  driverId: string
  driverName: string
  warehouseId: string
  warehouseName: string
  totalLeaveDays: number
  leaveCount: number
  resignationCount: number
  pendingCount: number
}

const ManagerLeaveApproval: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [resignationApplications, setResignationApplications] = useState<ResignationApplication[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [managerWarehouses, setManagerWarehouses] = useState<string[]>([])
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [activeTab, setActiveTab] = useState<'stats' | 'pending'>('pending')

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

      // 获取所有请假申请（包括历史数据）
      const allLeaveApps = await getAllLeaveApplications()
      setLeaveApplications(allLeaveApps)

      // 获取所有离职申请（包括历史数据）
      const allResignationApps = await getAllResignationApplications()
      setResignationApplications(allResignationApps)

      // 获取管理员管辖的仓库
      const managedWarehouses = await getManagerWarehouses(user.id)
      setManagerWarehouses(managedWarehouses.map((w) => w.id))
    } finally {
      Taro.hideLoading()
    }
  }, [user])

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

  // 获取可见的仓库列表（只显示管理员管辖的仓库）
  const getVisibleWarehouses = () => {
    return warehouses.filter((w) => managerWarehouses.includes(w.id))
  }

  // 获取可见的申请数据（只显示管辖仓库的数据）
  const getVisibleApplications = () => {
    let visibleLeave = leaveApplications.filter((app) => managerWarehouses.includes(app.warehouse_id))
    let visibleResignation = resignationApplications.filter((app) => managerWarehouses.includes(app.warehouse_id))

    // 按仓库筛选
    if (filterWarehouse !== 'all') {
      visibleLeave = visibleLeave.filter((app) => app.warehouse_id === filterWarehouse)
      visibleResignation = visibleResignation.filter((app) => app.warehouse_id === filterWarehouse)
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
      url: `/pages/manager/driver-leave-detail/index?driverId=${driverId}`
    })
  }

  // 跳转到打卡记录页面
  const navigateToAttendanceRecords = () => {
    Taro.navigateTo({
      url: '/pages/manager/attendance-records/index'
    })
  }

  const driverStats = calculateDriverStats()
  const visibleWarehouses = getVisibleWarehouses()
  const {visibleLeave, visibleResignation} = getVisibleApplications()

  // 统计数据
  const totalDrivers = driverStats.length
  const totalLeaveDays = driverStats.reduce((sum, s) => sum + s.totalLeaveDays, 0)
  const totalPending = driverStats.reduce((sum, s) => sum + s.pendingCount, 0)
  const pendingLeave = visibleLeave.filter((app) => app.status === 'pending')
  const pendingResignation = visibleResignation.filter((app) => app.status === 'pending')

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">请假审批管理</Text>
            <Text className="text-blue-100 text-sm block">管理员工作台</Text>
          </View>

          {/* 快捷入口 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-sm text-gray-700 font-bold block mb-3">快捷入口</Text>
            <Button
              size="default"
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white text-base font-bold break-keep"
              onClick={navigateToAttendanceRecords}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-clock-check text-xl mr-2" />
                <Text>查看打卡记录</Text>
              </View>
            </Button>
          </View>

          {/* 统计卡片 */}
          <View className="grid grid-cols-3 gap-3 mb-4">
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">司机总数</Text>
              <Text className="text-3xl font-bold text-blue-900 block">{totalDrivers}</Text>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">请假总天数</Text>
              <Text className="text-3xl font-bold text-orange-600 block">{totalLeaveDays}</Text>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">待审批</Text>
              <Text className="text-3xl font-bold text-red-600 block">{totalPending}</Text>
            </View>
          </View>

          {/* 筛选区域 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-sm text-gray-700 font-bold block mb-3">筛选条件</Text>

            {/* 仓库筛选 */}
            <View className="mb-3">
              <Text className="text-xs text-gray-600 block mb-2">选择仓库</Text>
              <Picker
                mode="selector"
                range={['全部仓库', ...visibleWarehouses.map((w) => w.name)]}
                value={
                  filterWarehouse === 'all'
                    ? 0
                    : Math.max(0, visibleWarehouses.findIndex((w) => w.id === filterWarehouse) + 1)
                }
                onChange={(e) => {
                  const index = Number(e.detail.value)
                  setFilterWarehouse(index === 0 ? 'all' : visibleWarehouses[index - 1]?.id || 'all')
                }}>
                <View className="border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-sm text-gray-800">
                    {filterWarehouse === 'all' ? '全部仓库' : getWarehouseName(filterWarehouse)}
                  </Text>
                  <View className="i-mdi-chevron-down text-xl text-gray-400" />
                </View>
              </Picker>
            </View>

            {/* 状态筛选 */}
            <View>
              <Text className="text-xs text-gray-600 block mb-2">选择状态</Text>
              <Picker
                mode="selector"
                range={['待审批', '已批准', '已拒绝', '全部状态']}
                value={
                  filterStatus === 'pending' ? 0 : filterStatus === 'approved' ? 1 : filterStatus === 'rejected' ? 2 : 3
                }
                onChange={(e) => {
                  const index = Number(e.detail.value)
                  setFilterStatus(index === 0 ? 'pending' : index === 1 ? 'approved' : index === 2 ? 'rejected' : 'all')
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

          {/* 标签切换 */}
          <View className="flex gap-2 mb-4">
            <View
              className={`flex-1 text-center py-3 rounded-lg ${activeTab === 'pending' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => setActiveTab('pending')}>
              <Text className={`text-sm font-bold ${activeTab === 'pending' ? 'text-white' : 'text-gray-600'}`}>
                待审批申请 ({totalPending})
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-3 rounded-lg ${activeTab === 'stats' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => setActiveTab('stats')}>
              <Text className={`text-sm font-bold ${activeTab === 'stats' ? 'text-white' : 'text-gray-600'}`}>
                司机统计
              </Text>
            </View>
          </View>

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
                    <View className="grid grid-cols-3 gap-3">
                      <View className="text-center">
                        <Text className="text-2xl font-bold text-orange-600 block">{stats.totalLeaveDays}</Text>
                        <Text className="text-xs text-gray-500">请假天数</Text>
                      </View>
                      <View className="text-center">
                        <Text className="text-2xl font-bold text-blue-600 block">{stats.leaveCount}</Text>
                        <Text className="text-xs text-gray-500">请假次数</Text>
                      </View>
                      <View className="text-center">
                        <Text className="text-2xl font-bold text-purple-600 block">{stats.resignationCount}</Text>
                        <Text className="text-xs text-gray-500">离职申请</Text>
                      </View>
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
        </View>
      </ScrollView>
    </View>
  )
}

export default ManagerLeaveApproval
