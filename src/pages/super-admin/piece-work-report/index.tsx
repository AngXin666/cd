import {Input, Picker, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import CircularProgress from '@/components/CircularProgress'
import {
  getActiveCategories,
  getAllWarehouses,
  getAttendanceRecordsByWarehouse,
  getDriverAttendanceStats,
  getDriverProfiles,
  getDriversByWarehouse,
  getPieceWorkRecordsByWarehouse
} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, Profile, Warehouse} from '@/db/types'
import {getVersionedCache, setVersionedCache} from '@/utils/cache'
import {getFirstDayOfMonthString, getLocalDateString, getMondayDateString, getYesterdayDateString} from '@/utils/date'
import {matchWithPinyin} from '@/utils/pinyin'

// 完成率状态判断和样式配置
interface CompletionRateStatus {
  label: string // 状态文字
  bgColor: string // 背景色
  textColor: string // 文字颜色
  ringColor: string // 圆环颜色
  badgeBgColor: string // 徽章背景色
}

const getCompletionRateStatus = (rate: number): CompletionRateStatus => {
  if (rate > 110) {
    // 超额完成
    return {
      label: '超额完成',
      bgColor: '#dcfce7', // green-100
      textColor: '#15803d', // green-700
      ringColor: '#10b981', // green-500
      badgeBgColor: 'linear-gradient(135deg, #10b981, #059669)' // green-500 to green-600
    }
  }
  if (rate >= 100) {
    // 达标
    return {
      label: '达标',
      bgColor: '#dbeafe', // blue-100
      textColor: '#1e40af', // blue-700
      ringColor: '#3b82f6', // blue-500
      badgeBgColor: 'linear-gradient(135deg, #3b82f6, #2563eb)' // blue-500 to blue-600
    }
  }
  if (rate >= 70) {
    // 不达标
    return {
      label: '不达标',
      bgColor: '#fed7aa', // orange-200
      textColor: '#c2410c', // orange-700
      ringColor: '#f97316', // orange-500
      badgeBgColor: 'linear-gradient(135deg, #f97316, #ea580c)' // orange-500 to orange-600
    }
  }
  // 严重不达标
  return {
    label: '严重不达标',
    bgColor: '#fecaca', // red-200
    textColor: '#b91c1c', // red-700
    ringColor: '#ef4444', // red-500
    badgeBgColor: 'linear-gradient(135deg, #ef4444, #dc2626)' // red-500 to red-600
  }
}

// 司机汇总数据结构
interface DriverSummary {
  driverId: string
  driverName: string
  driverPhone: string
  totalQuantity: number
  totalAmount: number
  completionRate: number // 总达标率（基于在职天数）
  dailyCompletionRate: number // 当天达标率
  weeklyCompletionRate: number // 本周达标率
  monthlyCompletionRate: number // 本月达标率
  dailyQuantity: number // 当日件数
  weeklyQuantity: number // 本周件数
  monthlyQuantity: number // 本月件数
  warehouses: Set<string>
  warehouseNames: string[]
  recordCount: number
  attendanceDays: number
  lateDays: number
  leaveDays: number
  joinDate: string | null // 入职日期
  daysEmployed: number // 在职天数
}

const SuperAdminPieceWorkReport: React.FC = () => {
  const {user} = useAuth({guard: true})

  // 数据状态
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])

  // 筛选状态
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0) // 当前仓库索引（用于Swiper切换）
  const [selectedDriverId, setSelectedDriverId] = useState<string>('') // 使用ID而不是索引
  const [driverSearchKeyword, setDriverSearchKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [quickFilter, setQuickFilter] = useState<'yesterday' | 'week' | 'month' | 'custom'>('month')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState<'completion' | 'quantity' | 'leave'>('completion') // 排序依据
  const [showFilters, setShowFilters] = useState(false) // 是否显示筛选区域

  // 仪表盘数据
  const [dashboardData, setDashboardData] = useState({
    totalDrivers: 0, // 司机总数（当前分配至指定仓库的所有司机）
    todayDrivers: 0 // 当日出勤司机个数
  })

  // 处理仓库切换
  const handleWarehouseChange = useCallback((e: any) => {
    const index = e.detail.current
    setCurrentWarehouseIndex(index)
  }, [])

  // 初始化日期范围（默认当月）
  useEffect(() => {
    const firstDay = getFirstDayOfMonthString()
    const today = getLocalDateString()
    setStartDate(firstDay)
    setEndDate(today)
  }, [])

  // 加载基础数据（带缓存）
  const loadData = useCallback(async () => {
    if (!user?.id) return

    try {
      // 尝试从缓存加载仓库数据
      const cacheKey = 'super_admin_piece_work_base_data'
      const cached = getVersionedCache<{
        warehouses: Warehouse[]
        drivers: Profile[]
        categories: PieceWorkCategory[]
      }>(cacheKey)

      if (cached) {
        console.log('✅ 使用缓存的基础数据')
        setWarehouses(cached.warehouses)
        setDrivers(cached.drivers)
        setCategories(cached.categories)
        return
      }

      console.log('🔄 从数据库加载基础数据')
      // 加载所有仓库
      const warehousesData = await getAllWarehouses()
      setWarehouses(warehousesData)

      // 加载所有司机
      const driversData = await getDriverProfiles()
      setDrivers(driversData)

      // 加载所有品类
      const categoriesData = await getActiveCategories()
      setCategories(categoriesData)

      // 保存到缓存（5分钟有效期）
      setVersionedCache(
        cacheKey,
        {
          warehouses: warehousesData,
          drivers: driversData,
          categories: categoriesData
        },
        5 * 60 * 1000
      )
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({
        title: '加载数据失败',
        icon: 'error',
        duration: 2000
      })
    }
  }, [user?.id])

  // 过滤司机列表（根据搜索关键词，支持拼音首字母）
  const filteredDrivers = drivers.filter((driver) => {
    if (!driverSearchKeyword.trim()) return true

    const keyword = driverSearchKeyword.trim()
    const name = driver.name || ''
    const phone = driver.phone || ''

    // 支持姓名、手机号和拼音首字母匹配
    return matchWithPinyin(name, keyword) || phone.toLowerCase().includes(keyword.toLowerCase())
  })

  // 加载计件记录（带缓存）
  const loadRecords = useCallback(async () => {
    if (warehouses.length === 0) return

    try {
      // 加载当前选中仓库的记录
      const warehouse = warehouses[currentWarehouseIndex]
      if (!warehouse) {
        setRecords([])
        return
      }

      // 生成缓存键（包含仓库ID、日期范围）
      const cacheKey = `super_admin_piece_work_records_${warehouse.id}_${startDate}_${endDate}`
      const cached = getVersionedCache<PieceWorkRecord[]>(cacheKey)

      let data: PieceWorkRecord[] = []

      if (cached) {
        console.log('✅ 使用缓存的计件记录')
        data = cached
      } else {
        console.log('🔄 从数据库加载计件记录')
        data = await getPieceWorkRecordsByWarehouse(warehouse.id, startDate, endDate)
        // 保存到缓存（3分钟有效期）
        setVersionedCache(cacheKey, data, 3 * 60 * 1000)
      }

      // 司机筛选
      if (selectedDriverId) {
        data = data.filter((r) => r.user_id === selectedDriverId)
      }

      // 排序
      data.sort((a, b) => {
        const dateA = new Date(a.work_date).getTime()
        const dateB = new Date(b.work_date).getTime()
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      })

      setRecords(data)
    } catch (error) {
      console.error('加载记录失败:', error)
      Taro.showToast({
        title: '加载记录失败',
        icon: 'error',
        duration: 2000
      })
    }
  }, [warehouses, currentWarehouseIndex, selectedDriverId, startDate, endDate, sortOrder])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useDidShow(() => {
    loadData()
    loadRecords()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadData(), loadRecords()])
    Taro.stopPullDownRefresh()
  })

  // 快捷筛选：前一天
  const handleYesterdayFilter = () => {
    const dateStr = getYesterdayDateString()
    setStartDate(dateStr)
    setEndDate(dateStr)
    setQuickFilter('yesterday')
  }

  // 快捷筛选：本周
  const handleWeekFilter = () => {
    const startDateStr = getMondayDateString()
    const endDateStr = getLocalDateString()

    setStartDate(startDateStr)
    setEndDate(endDateStr)
    setQuickFilter('week')
  }

  // 快捷筛选：本月
  const handleMonthFilter = () => {
    const firstDay = getFirstDayOfMonthString()
    const today = getLocalDateString()

    setStartDate(firstDay)
    setEndDate(today)
    setQuickFilter('month')
  }

  // 处理开始日期变化
  const handleStartDateChange = (e) => {
    setStartDate(e.detail.value)
    setQuickFilter('custom')
  }

  // 处理结束日期变化
  const handleEndDateChange = (e) => {
    setEndDate(e.detail.value)
    setQuickFilter('custom')
  }

  // 添加记录
  const handleAddRecord = () => {
    if (warehouses.length === 0) {
      Taro.showToast({
        title: '暂无仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    const warehouseId = warehouses[currentWarehouseIndex]?.id
    if (!warehouseId) {
      Taro.showToast({
        title: '请先选择仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    navigateTo({
      url: `/pages/super-admin/piece-work-report-form/index?warehouseId=${warehouseId}&mode=add`
    })
  }

  // 编辑记录
  const _handleEditRecord = (record: PieceWorkRecord) => {
    navigateTo({
      url: `/pages/super-admin/piece-work-report-form/index?id=${record.id}&mode=edit`
    })
  }

  // 查看司机详情
  const handleViewDriverDetail = (driverId: string) => {
    navigateTo({
      url: `/pages/super-admin/piece-work-report-detail/index?driverId=${driverId}&startDate=${startDate}&endDate=${endDate}&warehouseIndex=${currentWarehouseIndex}`
    })
  }

  // 获取仓库名称
  const getWarehouseName = useCallback(
    (warehouseId: string) => {
      const warehouse = warehouses.find((w) => w.id === warehouseId)
      return warehouse?.name || '未知仓库'
    },
    [warehouses]
  )

  // 获取司机名称
  const _getDriverName = useCallback(
    (userId: string) => {
      const driver = drivers.find((d) => d.id === userId)
      return driver?.name || driver?.phone || '未知司机'
    },
    [drivers]
  )

  // 计算每日指标数（根据选中的仓库）
  const dailyTarget = useMemo(() => {
    const warehouse = warehouses[currentWarehouseIndex]
    return warehouse?.daily_target || 0
  }, [warehouses, currentWarehouseIndex])

  // 计算司机汇总数据（不含考勤）
  const driverSummariesBase = useMemo(() => {
    const summaryMap = new Map<
      string,
      Omit<DriverSummary, 'attendanceDays' | 'lateDays' | 'leaveDays' | 'completionRate'>
    >()

    // 计算在职天数的辅助函数
    const calculateDaysEmployed = (joinDate: string | null): number => {
      if (!joinDate) return 0
      const join = new Date(joinDate)
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - join.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }

    records.forEach((record) => {
      const driverId = record.user_id
      if (!summaryMap.has(driverId)) {
        const driver = drivers.find((d) => d.id === driverId)
        const daysEmployed = calculateDaysEmployed(driver?.join_date || null)
        summaryMap.set(driverId, {
          driverId,
          driverName: driver?.name || '',
          driverPhone: driver?.phone || '',
          totalQuantity: 0,
          totalAmount: 0,
          warehouses: new Set<string>(),
          warehouseNames: [],
          recordCount: 0,
          joinDate: driver?.join_date || null,
          daysEmployed,
          dailyCompletionRate: 0,
          weeklyCompletionRate: 0,
          monthlyCompletionRate: 0,
          dailyQuantity: 0,
          weeklyQuantity: 0,
          monthlyQuantity: 0
        })
      }

      const summary = summaryMap.get(driverId)!
      summary.totalQuantity += record.quantity || 0

      const baseAmount = (record.quantity || 0) * (record.unit_price || 0)
      const upstairsAmount = record.need_upstairs ? (record.quantity || 0) * (record.upstairs_price || 0) : 0
      const sortingAmount = record.need_sorting ? (record.sorting_quantity || 0) * (record.sorting_unit_price || 0) : 0
      summary.totalAmount += baseAmount + upstairsAmount + sortingAmount

      summary.warehouses.add(record.warehouse_id)
      summary.recordCount += 1
    })

    const summaries = Array.from(summaryMap.values()).map((summary) => ({
      ...summary,
      warehouseNames: Array.from(summary.warehouses).map((wId) => getWarehouseName(wId))
    }))

    return summaries
  }, [records, drivers, getWarehouseName])

  // 司机汇总数据（含考勤）
  const [driverSummaries, setDriverSummaries] = useState<DriverSummary[]>([])

  // 辅助函数：获取今天的日期范围
  const getTodayRange = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    return {start: todayStr, end: todayStr}
  }

  // 辅助函数：获取本周的日期范围（周一到今天）
  const getWeekRange = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周一为起点
    const monday = new Date(today)
    monday.setDate(today.getDate() - diff)
    monday.setHours(0, 0, 0, 0)
    const mondayStr = monday.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    return {start: mondayStr, end: todayStr}
  }

  // 辅助函数：获取本月的日期范围（本月1号到今天）
  const getMonthRange = () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    firstDay.setHours(0, 0, 0, 0)
    const firstDayStr = firstDay.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    return {start: firstDayStr, end: todayStr}
  }

  // 辅助函数：计算指定日期范围内的件数
  const calculateQuantityInRange = (driverId: string, startDate: string, endDate: string): number => {
    return records
      .filter((record) => {
        if (record.user_id !== driverId) return false
        const recordDate = record.work_date
        return recordDate >= startDate && recordDate <= endDate
      })
      .reduce((sum, record) => sum + (record.quantity || 0), 0)
  }

  // 加载考勤数据并合并
  useEffect(() => {
    const loadAttendanceData = async () => {
      // 获取日期范围
      const todayRange = getTodayRange()
      const weekRange = getWeekRange()
      const monthRange = getMonthRange()

      const summariesWithAttendance = await Promise.all(
        driverSummariesBase.map(async (summary) => {
          const attendanceStats = await getDriverAttendanceStats(summary.driverId, startDate, endDate)

          // 计算当天、本周、本月的件数
          const dailyQuantity = calculateQuantityInRange(summary.driverId, todayRange.start, todayRange.end)
          const weeklyQuantity = calculateQuantityInRange(summary.driverId, weekRange.start, weekRange.end)
          const monthlyQuantity = calculateQuantityInRange(summary.driverId, monthRange.start, monthRange.end)

          // 计算司机总达标率（基于在职天数）
          let driverCompletionRate = 0
          if (dailyTarget > 0) {
            const daysForCalculation = summary.daysEmployed > 0 ? summary.daysEmployed : attendanceStats.attendanceDays
            if (daysForCalculation > 0) {
              const driverTotalTarget = dailyTarget * daysForCalculation
              driverCompletionRate = (summary.totalQuantity / driverTotalTarget) * 100
            }
          }

          // 计算当天达标率
          let dailyCompletionRate = 0
          if (dailyTarget > 0) {
            dailyCompletionRate = (dailyQuantity / dailyTarget) * 100
          }

          // 计算本周达标率（考虑新员工入职日期）
          let weeklyCompletionRate = 0
          if (dailyTarget > 0) {
            const today = new Date()
            const dayOfWeek = today.getDay()
            let daysInWeek = dayOfWeek === 0 ? 7 : dayOfWeek // 周日算7天，其他按实际天数

            // 如果是新员工，需要考虑入职日期
            if (summary.joinDate) {
              const joinDate = new Date(summary.joinDate)
              const weekStart = getWeekRange().start
              const weekStartDate = new Date(weekStart)

              // 如果入职日期在本周内，只计算入职后的天数
              if (joinDate > weekStartDate) {
                const diffTime = Math.abs(today.getTime() - joinDate.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 包含入职当天
                daysInWeek = Math.min(diffDays, daysInWeek)
              }
            }

            const weeklyTarget = dailyTarget * daysInWeek
            weeklyCompletionRate = (weeklyQuantity / weeklyTarget) * 100
          }

          // 计算本月达标率（考虑新员工入职日期）
          let monthlyCompletionRate = 0
          if (dailyTarget > 0) {
            const today = new Date()
            let daysInMonth = today.getDate() // 本月已过天数

            // 如果是新员工，需要考虑入职日期
            if (summary.joinDate) {
              const joinDate = new Date(summary.joinDate)
              const monthStart = getMonthRange().start
              const monthStartDate = new Date(monthStart)

              // 如果入职日期在本月内，只计算入职后的天数
              if (joinDate > monthStartDate) {
                const diffTime = Math.abs(today.getTime() - joinDate.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 包含入职当天
                daysInMonth = Math.min(diffDays, daysInMonth)
              }
            }

            // 不扣除请假天数，直接使用实际天数
            const monthlyTarget = dailyTarget * daysInMonth
            monthlyCompletionRate = monthlyTarget > 0 ? (monthlyQuantity / monthlyTarget) * 100 : 0
          }

          return {
            ...summary,
            attendanceDays: attendanceStats.attendanceDays,
            lateDays: attendanceStats.lateDays,
            leaveDays: attendanceStats.leaveDays,
            completionRate: driverCompletionRate,
            dailyCompletionRate,
            weeklyCompletionRate,
            monthlyCompletionRate,
            dailyQuantity,
            weeklyQuantity,
            monthlyQuantity
          }
        })
      )

      // 根据排序依据和排序顺序排序
      summariesWithAttendance.sort((a, b) => {
        let compareValue = 0
        if (sortBy === 'completion') {
          compareValue = b.completionRate - a.completionRate
        } else if (sortBy === 'quantity') {
          compareValue = b.totalQuantity - a.totalQuantity
        } else if (sortBy === 'leave') {
          compareValue = b.leaveDays - a.leaveDays
        }
        return sortOrder === 'desc' ? compareValue : -compareValue
      })

      setDriverSummaries(summariesWithAttendance)
    }

    if (driverSummariesBase.length > 0) {
      loadAttendanceData()
    } else {
      setDriverSummaries([])
    }
  }, [
    driverSummariesBase,
    startDate,
    endDate,
    sortOrder,
    sortBy,
    dailyTarget,
    calculateQuantityInRange,
    getMonthRange,
    getTodayRange,
    getWeekRange
  ])

  // 计算仪表盘数据
  useEffect(() => {
    const calculateDashboardData = async () => {
      if (!user?.id) {
        console.log('仪表盘数据计算：用户未登录')
        return
      }

      if (warehouses.length === 0) {
        console.log('仪表盘数据计算：没有仓库数据')
        setDashboardData({
          totalDrivers: 0,
          todayDrivers: 0
        })
        return
      }

      try {
        const warehouse = warehouses[currentWarehouseIndex]
        if (!warehouse) {
          console.log('仪表盘数据计算：当前仓库索引无效', currentWarehouseIndex)
          return
        }

        console.log('仪表盘数据计算：开始计算', warehouse.name)
        const today = getLocalDateString()

        // 获取当前分配至指定仓库的所有司机
        const warehouseDrivers = await getDriversByWarehouse(warehouse.id)
        const totalDrivers = warehouseDrivers.length
        console.log('仪表盘数据计算：仓库司机总数', totalDrivers)

        // 获取当日考勤记录
        const todayAttendance = await getAttendanceRecordsByWarehouse(warehouse.id, today, today)
        const todayDriversSet = new Set(todayAttendance.map((a) => a.user_id))
        const todayDriversCount = todayDriversSet.size
        console.log('仪表盘数据计算：当日出勤司机数', todayDriversCount)

        setDashboardData({
          totalDrivers,
          todayDrivers: todayDriversCount
        })
        console.log('仪表盘数据计算：完成', {totalDrivers, todayDrivers: todayDriversCount})
      } catch (error) {
        console.error('计算仪表盘数据失败:', error)
      }
    }

    calculateDashboardData()
  }, [user?.id, warehouses, currentWarehouseIndex])

  // 获取品类名称
  const _getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || '未知品类'
  }

  // 计算统计数据
  const totalQuantity = records.reduce((sum, r) => sum + (r.quantity || 0), 0)
  const _totalAmount = records.reduce((sum, r) => {
    const baseAmount = (r.quantity || 0) * (r.unit_price || 0)
    const upstairsAmount = r.need_upstairs ? (r.quantity || 0) * (r.upstairs_price || 0) : 0
    const sortingAmount = r.need_sorting ? (r.sorting_quantity || 0) * (r.sorting_unit_price || 0) : 0
    return sum + baseAmount + upstairsAmount + sortingAmount
  }, 0)
  const _uniqueDrivers = new Set(records.map((r) => r.user_id)).size

  // 计算当日达标率（修正算法：考虑出勤司机数）
  const completionRate = useMemo(() => {
    // 1. 检查每日指标是否有效
    if (dailyTarget === 0) return 0

    // 2. 获取当日出勤司机数
    const todayDriversCount = dashboardData.todayDrivers

    // 3. 检查出勤司机数是否有效
    if (todayDriversCount === 0) return 0

    // 4. 计算当日总目标 = 每日指标 × 出勤司机数
    const todayTotalTarget = dailyTarget * todayDriversCount

    // 5. 计算达标率 = 总完成件数 / 总目标
    return (totalQuantity / todayTotalTarget) * 100
  }, [totalQuantity, dailyTarget, dashboardData.todayDrivers])

  // 计算月度平均达标率
  const monthlyCompletionRate = useMemo(() => {
    if (driverSummaries.length === 0) return 0
    const totalRate = driverSummaries.reduce((sum, s) => sum + s.completionRate, 0)
    return totalRate / driverSummaries.length
  }, [driverSummaries])

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 仪表盘卡片 */}
          <View className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl p-6 mb-4 shadow-lg">
            <View className="flex items-center justify-between mb-4">
              <Text className="text-white text-lg font-bold">数据仪表盘</Text>
              <View className="i-mdi-chart-box text-white text-2xl" />
            </View>

            {/* 四个指标卡片 */}
            <View className="grid grid-cols-2 gap-4">
              {/* 当日达标率 */}
              <View className="bg-white bg-opacity-20 rounded-lg p-4">
                <View className="flex items-center gap-2 mb-2">
                  <View className="i-mdi-calendar-today text-white text-xl" />
                  <Text className="text-white text-opacity-90 text-sm">当日达标率</Text>
                </View>
                <Text className="text-white text-3xl font-bold">
                  {dashboardData.todayDrivers > 0 ? `${completionRate.toFixed(1)}%` : '--'}
                </Text>
                <Text className="text-white text-opacity-70 text-xs mt-1">
                  {dashboardData.todayDrivers > 0
                    ? `目标: ${(dailyTarget * dashboardData.todayDrivers).toFixed(0)}件`
                    : '暂无数据'}
                </Text>
              </View>

              {/* 月度达标率 */}
              <View className="bg-white bg-opacity-20 rounded-lg p-4">
                <View className="flex items-center gap-2 mb-2">
                  <View className="i-mdi-calendar-month text-white text-xl" />
                  <Text className="text-white text-opacity-90 text-sm">月度达标率</Text>
                </View>
                <Text className="text-white text-3xl font-bold">
                  {driverSummaries.length > 0 ? `${monthlyCompletionRate.toFixed(1)}%` : '--'}
                </Text>
                <Text className="text-white text-opacity-70 text-xs mt-1">
                  {driverSummaries.length > 0 ? '平均值' : '暂无数据'}
                </Text>
              </View>

              {/* 司机总数 */}
              <View className="bg-white bg-opacity-20 rounded-lg p-4">
                <View className="flex items-center gap-2 mb-2">
                  <View className="i-mdi-account-group text-white text-xl" />
                  <Text className="text-white text-opacity-90 text-sm">司机总数</Text>
                </View>
                <Text className="text-white text-3xl font-bold">{dashboardData.totalDrivers}</Text>
                <Text className="text-white text-opacity-70 text-xs mt-1">当前仓库分配</Text>
              </View>

              {/* 当日出勤司机 */}
              <View className="bg-white bg-opacity-20 rounded-lg p-4">
                <View className="flex items-center gap-2 mb-2">
                  <View className="i-mdi-account-check text-white text-xl" />
                  <Text className="text-white text-opacity-90 text-sm">当日出勤率</Text>
                </View>
                <Text className="text-white text-3xl font-bold">
                  {dashboardData.totalDrivers > 0
                    ? `${Math.round((dashboardData.todayDrivers / dashboardData.totalDrivers) * 100)}%`
                    : '--'}
                </Text>
                <Text className="text-white text-opacity-70 text-xs mt-1">
                  {dashboardData.totalDrivers > 0
                    ? `出勤 ${dashboardData.todayDrivers}/${dashboardData.totalDrivers}`
                    : '暂无数据'}
                </Text>
              </View>
            </View>
          </View>

          {/* 仓库切换 */}
          {warehouses.length > 0 && (
            <View className="mb-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">
                  当前仓库 ({currentWarehouseIndex + 1}/{warehouses.length})
                </Text>
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

          {/* 操作按钮 - 仅超级管理员可见 */}
          <View className="mb-4">
            <View
              onClick={handleAddRecord}
              className="bg-blue-900 rounded-lg p-4 shadow flex items-center justify-center">
              <View className="i-mdi-plus-circle text-2xl text-white mr-2" />
              <Text className="text-white font-medium">添加计件记录</Text>
            </View>
          </View>

          {/* 筛选区域 */}
          <View className="bg-white rounded-lg mb-4 shadow">
            {/* 筛选标题栏 - 可点击展开/收起 */}
            <View
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setShowFilters(!showFilters)}>
              <View className="flex items-center">
                <View className="i-mdi-filter text-xl text-blue-900 mr-2" />
                <Text className="text-base font-bold text-gray-800">筛选条件</Text>
              </View>
              <View className={`i-mdi-chevron-${showFilters ? 'up' : 'down'} text-xl text-gray-400`} />
            </View>

            {/* 筛选内容 - 可折叠 */}
            {showFilters && (
              <View className="px-4 pb-4">
                {/* 司机筛选 */}
                <View className="mb-3">
                  <Text className="text-sm text-gray-700 block mb-2">司机（支持拼音首字母搜索）</Text>
                  <Input
                    className="bg-gray-50 rounded-lg p-3 text-sm mb-2"
                    placeholder="搜索司机姓名、拼音首字母或手机号"
                    value={driverSearchKeyword}
                    onInput={(e) => {
                      setDriverSearchKeyword(e.detail.value)
                      // 搜索关键词变化时，重置选中的司机
                      setSelectedDriverId('')
                    }}
                  />
                  <Picker
                    mode="selector"
                    range={['所有司机', ...filteredDrivers.map((d) => d.name || d.phone || '未知')]}
                    value={selectedDriverId ? filteredDrivers.findIndex((d) => d.id === selectedDriverId) + 1 : 0}
                    onChange={(e) => {
                      const index = Number(e.detail.value)
                      if (index === 0) {
                        setSelectedDriverId('')
                      } else {
                        const driver = filteredDrivers[index - 1]
                        if (driver) {
                          setSelectedDriverId(driver.id)
                        }
                      }
                    }}>
                    <View className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <Text className="text-sm text-gray-800">
                        {selectedDriverId
                          ? drivers.find((d) => d.id === selectedDriverId)?.name ||
                            drivers.find((d) => d.id === selectedDriverId)?.phone ||
                            '未知'
                          : '所有司机'}
                      </Text>
                      <View className="i-mdi-chevron-down text-xl text-gray-400" />
                    </View>
                  </Picker>
                </View>

                {/* 快捷日期筛选 */}
                <View className="mb-3">
                  <Text className="text-sm text-gray-700 block mb-2">快捷筛选</Text>
                  <View className="flex gap-2">
                    <View
                      onClick={handleYesterdayFilter}
                      className={`flex-1 text-center py-2 rounded-lg ${
                        quickFilter === 'yesterday' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                      <Text className="text-xs">前一天</Text>
                    </View>
                    <View
                      onClick={handleWeekFilter}
                      className={`flex-1 text-center py-2 rounded-lg ${
                        quickFilter === 'week' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                      <Text className="text-xs">本周</Text>
                    </View>
                    <View
                      onClick={handleMonthFilter}
                      className={`flex-1 text-center py-2 rounded-lg ${
                        quickFilter === 'month' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                      <Text className="text-xs">本月</Text>
                    </View>
                  </View>
                </View>

                {/* 自定义日期范围 */}
                <View>
                  <Text className="text-sm text-gray-700 block mb-2">日期范围</Text>
                  <View className="flex gap-2 items-center">
                    <Picker mode="date" value={startDate} onChange={handleStartDateChange}>
                      <View className="flex-1 bg-gray-50 rounded-lg p-3">
                        <Text className="text-sm text-gray-800">{startDate || '开始日期'}</Text>
                      </View>
                    </Picker>
                    <Text className="text-gray-500">至</Text>
                    <Picker mode="date" value={endDate} onChange={handleEndDateChange}>
                      <View className="flex-1 bg-gray-50 rounded-lg p-3">
                        <Text className="text-sm text-gray-800">{endDate || '结束日期'}</Text>
                      </View>
                    </Picker>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 排序按钮 */}
          <View className="flex gap-2 mb-4">
            <View
              className={`flex-1 text-center py-2 rounded-lg ${sortBy === 'completion' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => {
                if (sortBy === 'completion') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                } else {
                  setSortBy('completion')
                  setSortOrder('desc')
                }
              }}>
              <View className="flex items-center justify-center gap-1">
                <View
                  className={`i-mdi-chart-line text-base ${sortBy === 'completion' ? 'text-white' : 'text-gray-600'}`}
                />
                <Text className={`text-xs font-bold ${sortBy === 'completion' ? 'text-white' : 'text-gray-600'}`}>
                  按达标率排序
                </Text>
                {sortBy === 'completion' && (
                  <View
                    className={`i-mdi-arrow-${sortOrder === 'desc' ? 'down' : 'up'} text-base ${sortBy === 'completion' ? 'text-white' : 'text-gray-600'}`}
                  />
                )}
              </View>
            </View>
            <View
              className={`flex-1 text-center py-2 rounded-lg ${sortBy === 'quantity' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => {
                if (sortBy === 'quantity') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                } else {
                  setSortBy('quantity')
                  setSortOrder('desc')
                }
              }}>
              <View className="flex items-center justify-center gap-1">
                <View
                  className={`i-mdi-package-variant text-base ${sortBy === 'quantity' ? 'text-white' : 'text-gray-600'}`}
                />
                <Text className={`text-xs font-bold ${sortBy === 'quantity' ? 'text-white' : 'text-gray-600'}`}>
                  按件数排序
                </Text>
                {sortBy === 'quantity' && (
                  <View
                    className={`i-mdi-arrow-${sortOrder === 'desc' ? 'down' : 'up'} text-base ${sortBy === 'quantity' ? 'text-white' : 'text-gray-600'}`}
                  />
                )}
              </View>
            </View>
          </View>

          {/* 司机汇总列表 */}
          <View className="flex items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-800">司机汇总</Text>
            <Text className="text-xs text-gray-500">共 {driverSummaries.length} 位司机</Text>
          </View>

          {driverSummaries.length === 0 ? (
            <View className="bg-white rounded-lg p-8 text-center shadow">
              <View className="i-mdi-account-off text-6xl text-gray-300 mb-4 mx-auto" />
              <Text className="text-gray-500 block">暂无司机数据</Text>
            </View>
          ) : (
            driverSummaries.map((summary) => {
              const status = getCompletionRateStatus(summary.completionRate || 0)
              return (
                <View
                  key={summary.driverId}
                  className="bg-white rounded-xl p-4 mb-3 shadow-md"
                  onClick={() => handleViewDriverDetail(summary.driverId)}>
                  {/* 状态徽章 */}
                  <View
                    className="absolute top-2 right-2 px-3 py-1 rounded-full flex items-center gap-1 shadow-md"
                    style={{background: status.badgeBgColor}}>
                    <View
                      className={`${
                        status.label === '超额完成'
                          ? 'i-mdi-trophy'
                          : status.label === '达标'
                            ? 'i-mdi-check-circle'
                            : status.label === '不达标'
                              ? 'i-mdi-alert-circle'
                              : 'i-mdi-alert-octagon'
                      } text-white text-sm`}
                    />
                    <Text className="text-xs text-white font-bold">{status.label}</Text>
                  </View>

                  {/* 司机信息头部 */}
                  <View className="flex items-center justify-between mb-4">
                    <View className="flex items-center flex-1">
                      <View className="i-mdi-account-circle text-4xl text-blue-600 mr-3" />
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-800 block">
                          {summary.driverName || summary.driverPhone || '未知司机'}
                        </Text>
                        {summary.driverPhone && summary.driverName && (
                          <Text className="text-xs text-gray-500 block">{summary.driverPhone}</Text>
                        )}
                        <Text className="text-xs text-gray-500 block mt-1">
                          {summary.warehouseNames.length > 0 ? summary.warehouseNames.join('、') : '未分配仓库'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 三个环形图达标率 */}
                  <View className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-100">
                    {/* 当天达标率环形图 */}
                    <View className="flex flex-col items-center">
                      <CircularProgress
                        percentage={summary.dailyCompletionRate || 0}
                        size={70}
                        strokeWidth={6}
                        label="当天达标率"
                      />
                      <Text className="text-xs text-gray-500 mt-1">目标: {dailyTarget}件</Text>
                    </View>

                    {/* 本周达标率环形图 */}
                    <View className="flex flex-col items-center">
                      <CircularProgress
                        percentage={summary.weeklyCompletionRate || 0}
                        size={70}
                        strokeWidth={6}
                        label="本周达标率"
                      />
                      <Text className="text-xs text-gray-500 mt-1">
                        已工作{(() => {
                          const today = new Date()
                          const weekStart = new Date(getMondayDateString())

                          // 计算实际工作的起始日期（本周一或入职日，取较晚的）
                          let startDate = weekStart
                          if (summary.joinDate) {
                            const joinDate = new Date(summary.joinDate)
                            if (joinDate > weekStart) {
                              startDate = joinDate
                            }
                          }

                          // 计算从起始日期到今天的天数（包含起始日和今天）
                          const diffTime = today.getTime() - startDate.getTime()
                          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
                          return Math.max(diffDays, 0)
                        })()}天
                      </Text>
                    </View>

                    {/* 本月达标率环形图 */}
                    <View className="flex flex-col items-center">
                      <CircularProgress
                        percentage={summary.monthlyCompletionRate || 0}
                        size={70}
                        strokeWidth={6}
                        label="本月达标率"
                      />
                      <Text className="text-xs text-gray-500 mt-1">
                        应工作{(() => {
                          const today = new Date()
                          const monthStart = new Date(getFirstDayOfMonthString())

                          // 计算实际工作的起始日期（本月1号或入职日，取较晚的）
                          let startDate = monthStart
                          if (summary.joinDate) {
                            const joinDate = new Date(summary.joinDate)
                            if (joinDate > monthStart) {
                              startDate = joinDate
                            }
                          }

                          // 计算从起始日期到今天的天数（包含起始日和今天）
                          const diffTime = today.getTime() - startDate.getTime()
                          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
                          return Math.max(diffDays, 0)
                        })()}天
                      </Text>
                    </View>
                  </View>

                  {/* 入职信息 */}
                  <View className="bg-blue-50 rounded-lg px-3 py-2 mb-4">
                    <View className="flex items-center justify-between mb-1">
                      <Text className="text-xs text-gray-600">入职日期</Text>
                      <Text className="text-sm font-bold text-blue-700">{summary.joinDate || '未设置'}</Text>
                    </View>
                    <View className="flex items-center justify-between">
                      <Text className="text-xs text-gray-600">在职天数</Text>
                      <Text className="text-sm font-bold text-blue-700">{summary.daysEmployed} 天</Text>
                    </View>
                  </View>

                  {/* 件数统计 */}
                  <View className="grid grid-cols-3 gap-3">
                    <View className="text-center bg-blue-50 rounded-lg py-2">
                      <Text className="text-xl font-bold text-blue-600 block">{summary.dailyQuantity}</Text>
                      <Text className="text-xs text-gray-600">当日件数</Text>
                    </View>
                    <View className="text-center bg-green-50 rounded-lg py-2">
                      <Text className="text-xl font-bold text-green-600 block">{summary.weeklyQuantity}</Text>
                      <Text className="text-xs text-gray-600">本周件数</Text>
                    </View>
                    <View className="text-center bg-purple-50 rounded-lg py-2">
                      <Text className="text-xl font-bold text-purple-600 block">{summary.monthlyQuantity}</Text>
                      <Text className="text-xs text-gray-600">本月件数</Text>
                    </View>
                  </View>

                  {/* 查看详情提示 */}
                  <View className="flex items-center justify-center mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-xs text-blue-600 mr-1">查看详细记录</Text>
                    <View className="i-mdi-chevron-right text-sm text-blue-600" />
                  </View>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default SuperAdminPieceWorkReport
