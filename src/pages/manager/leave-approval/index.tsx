import {Button, Picker, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
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
  driverPhone: string | null // 手机号码
  licensePlate: string | null // 车牌号
  warehouseIds: string[] // 改为数组，支持多个仓库
  warehouseNames: string[] // 改为数组，支持多个仓库名称
  totalLeaveDays: number
  leaveCount: number
  resignationCount: number
  attendanceCount: number
  pendingCount: number
  // 出勤统计字段
  workDays: number // 应出勤天数（工作日）
  actualAttendanceDays: number // 实际打卡天数
  attendanceRate: number // 出勤率（百分比）
  isFullAttendance: boolean // 是否满勤
  // 入职信息字段
  joinDate: string | null // 入职日期
  workingDays: number // 在职天数
}

// 打卡记录统计类型
interface AttendanceStats {
  totalRecords: number
  normalCount: number
  lateCount: number
  earlyCount: number
  absentCount: number
}

const ManagerLeaveApproval: React.FC = () => {
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
  const [activeTab, setActiveTab] = useState<'pending' | 'stats' | 'attendance'>('stats') // 默认显示司机统计标签页
  const [showFilters, setShowFilters] = useState<boolean>(false) // 筛选条件是否展开
  const [sortBy, setSortBy] = useState<'rate' | 'count'>('rate') // 排序方式：出勤率或打卡次数
  const [_refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now()) // 用于触发在职天数重新计算

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

      // 过滤管理员管辖的仓库的记录
      const managedWarehouseIds = managedWarehouses.map((w) => w.id)
      const filteredRecords = records.filter((r) => managedWarehouseIds.includes(r.warehouse_id))
      setAttendanceRecords(filteredRecords)
    } finally {
      Taro.hideLoading()
    }
  }, [user, filterMonth, initCurrentMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    // 考勤数据已使用30分钟缓存，减少频繁查询
    // 但仍需刷新请假申请等其他数据
    loadData()
    // 更新刷新时间戳，触发在职天数重新计算
    setRefreshTimestamp(Date.now())
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

  // 获取可见的仓库列表（只显示管理员管辖的且有数据的仓库）
  const getVisibleWarehouses = () => {
    const managedWarehouseIds = managerWarehouses.map((w) => w.id)
    const managedWarehouses = warehouses.filter((w) => managedWarehouseIds.includes(w.id))

    // 过滤出有数据的仓库，并按数据量排序
    const warehousesWithData = managedWarehouses
      .map((warehouse) => {
        // 统计该仓库的数据量
        const leaveCount = leaveApplications.filter((app) => app.warehouse_id === warehouse.id).length
        const resignationCount = resignationApplications.filter((app) => app.warehouse_id === warehouse.id).length
        const attendanceCount = attendanceRecords.filter((record) => record.warehouse_id === warehouse.id).length
        const totalDataCount = leaveCount + resignationCount + attendanceCount

        return {
          warehouse,
          totalDataCount
        }
      })
      .filter((item) => item.totalDataCount > 0) // 只保留有数据的仓库
      .sort((a, b) => b.totalDataCount - a.totalDataCount) // 按数据量降序排序
      .map((item) => item.warehouse)

    return warehousesWithData
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

  // 处理仓库切换
  const handleWarehouseChange = useCallback((e: any) => {
    const index = e.detail.current
    setCurrentWarehouseIndex(index)
  }, [])

  // 获取可见的申请数据（只显示管辖仓库的数据）
  const getVisibleApplications = () => {
    const managedWarehouseIds = managerWarehouses.map((w) => w.id)
    let visibleLeave = leaveApplications.filter((app) => managedWarehouseIds.includes(app.warehouse_id))
    let visibleResignation = resignationApplications.filter((app) => managedWarehouseIds.includes(app.warehouse_id))

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

  // 计算从指定月份1号到当前日期（或指定结束日期）的天数
  // yearMonth: 格式为 "YYYY-MM"
  // endDate: 可选，格式为 "YYYY-MM-DD"，默认为当前日期
  const calculateWorkDays = useCallback((yearMonth: string, endDate?: string): number => {
    const [year, month] = yearMonth.split('-').map(Number)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    // 确定结束日期
    let lastDay: number
    if (endDate) {
      // 如果提供了结束日期，使用该日期
      const endDateObj = new Date(endDate)
      lastDay = endDateObj.getDate()
    } else if (year === currentYear && month === currentMonth) {
      // 如果是当前月份，使用当前日期
      lastDay = currentDay
    } else {
      // 如果是其他月份，使用该月的最后一天
      lastDay = new Date(year, month, 0).getDate()
    }

    // 计算天数（不排除周末，按自然天数计算）
    return lastDay
  }, [])

  // 计算整月的总天数（用于判断满勤）
  const calculateMonthTotalDays = useCallback((yearMonth: string): number => {
    const [year, month] = yearMonth.split('-').map(Number)
    return new Date(year, month, 0).getDate()
  }, [])

  // 计算司机统计数据
  const calculateDriverStats = useMemo((): DriverStats[] => {
    const {visibleLeave, visibleResignation} = getVisibleApplications()

    // 获取所有司机（role为driver的用户）
    const drivers = profiles.filter((p) => p.role === 'driver')

    // 计算当前月份
    const currentMonth = filterMonth || initCurrentMonth()
    const _monthTotalDays = calculateMonthTotalDays(currentMonth) // 整月总天数，用于判断满勤

    // 辅助函数：计算在职天数
    const calculateWorkingDays = (joinDate: string | null): number => {
      if (!joinDate) return 0
      // 将日期标准化到当天的00:00:00，避免时间部分影响天数计算
      const join = new Date(joinDate)
      join.setHours(0, 0, 0, 0)
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const diffTime = now.getTime() - join.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 ? diffDays + 1 : 0 // 加1是因为要包含入职当天
    }

    // 辅助函数：计算司机在当前月份的应出勤天数
    const getDriverWorkDays = (driver: Profile): number => {
      const [year, month] = currentMonth.split('-').map(Number)
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth_num = now.getMonth() + 1

      // 如果司机有入职日期，且入职日期在当前月份内
      if (driver.join_date) {
        const joinDate = new Date(driver.join_date)
        const joinYear = joinDate.getFullYear()
        const joinMonth = joinDate.getMonth() + 1
        const joinDay = joinDate.getDate()

        // 如果入职月份就是当前筛选的月份
        if (joinYear === year && joinMonth === month) {
          // 如果是当前月份，计算从入职日期到今天的天数
          if (year === currentYear && month === currentMonth_num) {
            const today = now.getDate()
            return today - joinDay + 1
          } else {
            // 如果是历史月份，计算从入职日期到月底的天数
            const lastDayOfMonth = new Date(year, month, 0).getDate()
            return lastDayOfMonth - joinDay + 1
          }
        }
      }

      // 默认情况：从1号到当前日期（或整月）
      return calculateWorkDays(currentMonth)
    }

    const statsMap = new Map<string, DriverStats>()

    // 辅助函数：添加仓库信息到司机统计中
    const addWarehouseToStats = (stats: DriverStats, warehouseId: string) => {
      if (warehouseId && !stats.warehouseIds.includes(warehouseId)) {
        stats.warehouseIds.push(warehouseId)
        stats.warehouseNames.push(getWarehouseName(warehouseId))
      }
    }

    // 首先，为所有司机创建初始统计数据
    for (const driver of drivers) {
      statsMap.set(driver.id, {
        driverId: driver.id,
        driverName: getUserName(driver.id),
        driverPhone: driver.phone,
        licensePlate: driver.license_plate,
        warehouseIds: [],
        warehouseNames: [],
        totalLeaveDays: 0,
        leaveCount: 0,
        resignationCount: 0,
        attendanceCount: 0,
        pendingCount: 0,
        workDays: getDriverWorkDays(driver),
        actualAttendanceDays: 0,
        attendanceRate: 0,
        isFullAttendance: false,
        joinDate: driver.join_date,
        workingDays: calculateWorkingDays(driver.join_date)
      })
    }

    // 处理请假申请
    for (const app of visibleLeave) {
      const stats = statsMap.get(app.user_id)
      if (!stats) continue // 如果司机不存在（可能已删除），跳过

      addWarehouseToStats(stats, app.warehouse_id)
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
      const stats = statsMap.get(app.user_id)
      if (!stats) continue // 如果司机不存在（可能已删除），跳过

      addWarehouseToStats(stats, app.warehouse_id)
      stats.resignationCount++

      // 统计待审批数量
      if (app.status === 'pending') {
        stats.pendingCount++
      }
    }

    // 处理打卡记录 - 用于计算出勤率（不按仓库筛选，统计所有仓库）
    let allAttendanceForStats = attendanceRecords
    // 只显示管辖仓库的数据
    const managerWarehouseIds = managerWarehouses.map((w) => w.id)
    allAttendanceForStats = attendanceRecords.filter((record) =>
      record.warehouse_id ? managerWarehouseIds.includes(record.warehouse_id) : false
    )

    // 按月份筛选打卡记录（但不按仓库筛选，保证出勤率是所有仓库的合计）
    if (filterMonth) {
      allAttendanceForStats = allAttendanceForStats.filter((record) => {
        const recordDate = new Date(record.clock_in_time)
        const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`
        return recordMonth === filterMonth
      })
    }

    // 统计每个司机的打卡天数（去重，一天只算一次）- 基于所有仓库
    const attendanceDaysMap = new Map<string, Set<string>>()
    for (const record of allAttendanceForStats) {
      const stats = statsMap.get(record.user_id)
      if (!stats) continue // 如果司机不存在（可能已删除），跳过

      addWarehouseToStats(stats, record.warehouse_id || '')
      stats.attendanceCount++

      // 记录打卡日期（用于计算实际出勤天数）
      if (!attendanceDaysMap.has(record.user_id)) {
        attendanceDaysMap.set(record.user_id, new Set())
      }
      const checkInDate = new Date(record.clock_in_time).toISOString().split('T')[0]
      attendanceDaysMap.get(record.user_id)?.add(checkInDate)
    }

    // 计算出勤率和满勤状态
    for (const [driverId, stats] of statsMap.entries()) {
      const attendanceDays = attendanceDaysMap.get(driverId)?.size || 0
      stats.actualAttendanceDays = attendanceDays

      // 计算出勤率：实际出勤天数 / 应出勤天数
      stats.attendanceRate = stats.workDays > 0 ? Math.round((attendanceDays / stats.workDays) * 100) : 0

      // 满勤判断：实际出勤天数 == 应出勤天数（考虑新入职司机的情况）
      stats.isFullAttendance = attendanceDays === stats.workDays && stats.workDays > 0
    }

    // 根据排序方式排序
    let statsArray = Array.from(statsMap.values())

    // 按仓库筛选：只显示在选定仓库工作过的司机
    const currentWarehouseId = getCurrentWarehouseId()
    if (currentWarehouseId !== 'all') {
      statsArray = statsArray.filter((stats) => stats.warehouseIds.includes(currentWarehouseId))
    }

    if (sortBy === 'rate') {
      return statsArray.sort(
        (a, b) => b.attendanceRate - a.attendanceRate || b.actualAttendanceDays - a.actualAttendanceDays
      )
    } else {
      return statsArray.sort((a, b) => b.attendanceCount - a.attendanceCount || b.attendanceRate - a.attendanceRate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    attendanceRecords,
    profiles,
    managerWarehouses,
    filterMonth,
    sortBy,
    calculateLeaveDays,
    calculateMonthTotalDays,
    calculateWorkDays,
    getCurrentWarehouseId,
    getUserName,
    getVisibleApplications,
    getWarehouseName,
    initCurrentMonth
  ])

  // 计算整体出勤率
  const calculateOverallAttendanceRate = (): {rate: number; totalDrivers: number; fullAttendanceCount: number} => {
    const stats = calculateDriverStats
    if (stats.length === 0) {
      return {rate: 0, totalDrivers: 0, fullAttendanceCount: 0}
    }

    const totalRate = stats.reduce((sum, s) => sum + s.attendanceRate, 0)
    const avgRate = Math.round(totalRate / stats.length)
    const fullAttendanceCount = stats.filter((s) => s.isFullAttendance).length

    return {
      rate: avgRate,
      totalDrivers: stats.length,
      fullAttendanceCount
    }
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

  const driverStats = calculateDriverStats
  const _visibleWarehouses = managerWarehouses
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
            <Text className="text-blue-100 text-sm block">管理员工作台</Text>
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
          <View className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
            <Swiper
              className="h-16"
              current={currentWarehouseIndex}
              onChange={handleWarehouseChange}
              indicatorDots
              indicatorColor="rgba(0, 0, 0, 0.2)"
              indicatorActiveColor="#1E3A8A">
              {getVisibleWarehouses().map((warehouse) => (
                <SwiperItem key={warehouse.id}>
                  <View className="h-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100">
                    <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                    <Text className="text-lg font-bold text-blue-900">{warehouse.name}</Text>
                  </View>
                </SwiperItem>
              ))}
            </Swiper>
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
              {/* 整体出勤率卡片 */}
              <View className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 mb-4 shadow-lg">
                <Text className="text-white text-lg font-bold mb-4 block">整体出勤率</Text>
                <View className="flex items-center justify-between">
                  <View className="flex-1">
                    <View className="flex items-baseline mb-2">
                      <Text className="text-5xl font-bold text-white">{calculateOverallAttendanceRate().rate}</Text>
                      <Text className="text-2xl text-white ml-1">%</Text>
                    </View>
                    <View className="flex items-center gap-4 mt-3">
                      <View className="flex items-center">
                        <View className="i-mdi-account-group text-white text-lg mr-1" />
                        <Text className="text-white text-sm">
                          {calculateOverallAttendanceRate().totalDrivers} 名司机
                        </Text>
                      </View>
                      <View className="flex items-center">
                        <View className="i-mdi-trophy text-yellow-300 text-lg mr-1" />
                        <Text className="text-white text-sm">
                          {calculateOverallAttendanceRate().fullAttendanceCount} 人满勤
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="relative w-24 h-24">
                    <View
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(#fff ${calculateOverallAttendanceRate().rate * 3.6}deg, rgba(255,255,255,0.2) 0deg)`
                      }}
                    />
                    <View className="absolute inset-2 bg-blue-600 rounded-full flex items-center justify-center">
                      <View className="i-mdi-chart-arc text-3xl text-white" />
                    </View>
                  </View>
                </View>
              </View>

              {/* 排序按钮 */}
              <View className="flex gap-2 mb-4">
                <View
                  className={`flex-1 text-center py-2 rounded-lg ${sortBy === 'rate' ? 'bg-blue-600' : 'bg-white'}`}
                  onClick={() => setSortBy('rate')}>
                  <View className="flex items-center justify-center gap-1">
                    <View
                      className={`i-mdi-sort-descending text-base ${sortBy === 'rate' ? 'text-white' : 'text-gray-600'}`}
                    />
                    <Text className={`text-xs font-bold ${sortBy === 'rate' ? 'text-white' : 'text-gray-600'}`}>
                      按出勤率排序
                    </Text>
                  </View>
                </View>
                <View
                  className={`flex-1 text-center py-2 rounded-lg ${sortBy === 'count' ? 'bg-blue-600' : 'bg-white'}`}
                  onClick={() => setSortBy('count')}>
                  <View className="flex items-center justify-center gap-1">
                    <View
                      className={`i-mdi-sort-numeric-descending text-base ${sortBy === 'count' ? 'text-white' : 'text-gray-600'}`}
                    />
                    <Text className={`text-xs font-bold ${sortBy === 'count' ? 'text-white' : 'text-gray-600'}`}>
                      按打卡次数排序
                    </Text>
                  </View>
                </View>
              </View>

              {/* 司机出勤列表 */}
              <View className="flex items-center justify-between mb-3">
                <Text className="text-base font-bold text-gray-800">司机出勤统计</Text>
                <Text className="text-xs text-gray-500">{filterMonth || initCurrentMonth()} 月度数据</Text>
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
                    className={`relative bg-white rounded-xl p-4 mb-3 shadow-md ${stats.isFullAttendance ? 'border-2 border-yellow-400' : ''}`}
                    onClick={() => navigateToDriverDetail(stats.driverId)}>
                    {/* 满勤徽章 */}
                    {stats.isFullAttendance && (
                      <View className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-yellow-500 px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <View className="i-mdi-trophy text-white text-sm" />
                        <Text className="text-xs text-white font-bold">满勤</Text>
                      </View>
                    )}

                    {/* 司机信息头部 */}
                    <View className="flex items-center justify-between mb-4">
                      <View className="flex items-center flex-1">
                        <View className="i-mdi-account-circle text-4xl text-blue-600 mr-3" />
                        <View className="flex-1">
                          <View className="flex items-center gap-2 mb-1">
                            <Text className="text-base font-bold text-gray-800">{stats.driverName}</Text>
                            {/* 新司机标签 */}
                            {stats.workingDays <= 7 && (
                              <View className="bg-gradient-to-r from-green-400 to-green-500 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-white font-bold">新司机</Text>
                              </View>
                            )}
                          </View>
                          {/* 手机号码 */}
                          {stats.driverPhone && (
                            <View className="flex items-center gap-1 mb-1">
                              <View className="i-mdi-phone text-xs text-gray-400" />
                              <Text className="text-xs text-gray-600">{stats.driverPhone}</Text>
                            </View>
                          )}
                          {/* 车牌号 */}
                          {stats.licensePlate && (
                            <View className="flex items-center gap-1 mb-1">
                              <View className="i-mdi-car text-xs text-gray-400" />
                              <Text className="text-xs text-gray-600">{stats.licensePlate}</Text>
                            </View>
                          )}
                          {/* 分配仓库 */}
                          <View className="flex items-center gap-1 mb-1">
                            <View className="i-mdi-warehouse text-xs text-gray-400" />
                            <Text className="text-xs text-gray-600">
                              {stats.warehouseNames.length > 0 ? stats.warehouseNames.join('、') : '未分配仓库'}
                            </Text>
                          </View>
                          {/* 入职时间和在职天数 */}
                          {stats.joinDate && (
                            <View className="flex items-center gap-2 mt-1">
                              <Text className="text-xs text-gray-400">
                                入职: {new Date(stats.joinDate).toLocaleDateString('zh-CN')}
                              </Text>
                              <Text className="text-xs text-gray-400">•</Text>
                              <Text className="text-xs text-gray-400">在职 {stats.workingDays} 天</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* 出勤率圆环 */}
                    <View className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                      <View className="relative w-20 h-20">
                        <View
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `conic-gradient(${
                              stats.attendanceRate >= 90
                                ? '#10b981'
                                : stats.attendanceRate >= 70
                                  ? '#f59e0b'
                                  : '#ef4444'
                            } ${stats.attendanceRate * 3.6}deg, #e5e7eb 0deg)`
                          }}
                        />
                        <View className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                          <View>
                            <Text className="text-xl font-bold text-gray-800 text-center block">
                              {stats.attendanceRate}
                            </Text>
                            <Text className="text-xs text-gray-500 text-center">%</Text>
                          </View>
                        </View>
                      </View>
                      <View className="flex-1">
                        <View className="flex items-center justify-between mb-2">
                          <Text className="text-sm text-gray-600">实际出勤</Text>
                          <Text className="text-sm font-bold text-blue-600">
                            {stats.actualAttendanceDays} / {stats.workDays} 天
                          </Text>
                        </View>
                        <View className="flex items-center justify-between">
                          <Text className="text-sm text-gray-600">打卡次数</Text>
                          <Text className="text-sm font-bold text-green-600">{stats.attendanceCount} 次</Text>
                        </View>
                      </View>
                    </View>

                    {/* 其他统计数据 */}
                    <View className="grid grid-cols-3 gap-3">
                      <View className="text-center bg-orange-50 rounded-lg py-2">
                        <Text className="text-xl font-bold text-orange-600 block">{stats.totalLeaveDays}</Text>
                        <Text className="text-xs text-gray-600">请假天数</Text>
                      </View>
                      <View className="text-center bg-blue-50 rounded-lg py-2">
                        <Text className="text-xl font-bold text-blue-600 block">{stats.actualAttendanceDays}</Text>
                        <Text className="text-xs text-gray-600">出勤天数</Text>
                      </View>
                      <View className="text-center bg-purple-50 rounded-lg py-2">
                        <Text className="text-xl font-bold text-purple-600 block">{stats.pendingCount}</Text>
                        <Text className="text-xs text-gray-600">待审批</Text>
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

export default ManagerLeaveApproval
