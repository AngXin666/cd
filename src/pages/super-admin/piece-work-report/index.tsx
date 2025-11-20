import {ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import CircularProgress from '@/components/CircularProgress'
import {
  getActiveCategories,
  getAllWarehouses,
  getAttendanceRecordsByWarehouse,
  getBatchDriverAttendanceStats,
  getDriverProfiles,
  getDriversByWarehouse,
  getLeaveApplicationsByWarehouse,
  getPieceWorkRecordsByWarehouse
} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, Profile, Warehouse} from '@/db/types'
import {clearVersionedCache, getVersionedCache, setVersionedCache} from '@/utils/cache'
import {getFirstDayOfMonthString, getLocalDateString} from '@/utils/date'

// 完成率状态判断和样式配置
interface CompletionRateStatus {
  label: string // 状态文字
  bgColor: string // 背景色
  textColor: string // 文字颜色
  ringColor: string // 圆环颜色
  badgeBgColor: string // 徽章背景色
}

const _getCompletionRateStatus = (rate: number): CompletionRateStatus => {
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
  driverType: 'pure' | 'with_vehicle' | null // 司机类型：纯司机/带车司机
  totalQuantity: number
  totalAmount: number
  completionRate: number // 总达标率（基于在职天数）
  dailyCompletionRate: number // 今天达标率
  weeklyCompletionRate: number // 本周达标率
  monthlyCompletionRate: number // 本月达标率
  dailyQuantity: number // 今天件数
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
  todayStatus: 'on_leave' | 'not_recorded' | number // 今日状态：休假/未记录/已记N次（数字表示计件次数）
}

const SuperAdminPieceWorkReport: React.FC = () => {
  const {user} = useAuth({guard: true})

  // 数据状态
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])

  // 筛选状态 - 简化版本，移除所有筛选UI
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0) // 当前仓库索引（用于Swiper切换）
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState<'today' | 'week' | 'month'>('today') // 排序依据：今天、本周、本月

  // 仪表盘数据
  const [dashboardData, setDashboardData] = useState({
    totalDrivers: 0, // 司机总数（当前分配至指定仓库的所有司机）
    todayDrivers: 0, // 今天出勤司机个数
    todayLeaveDrivers: 0, // 今天请假司机个数
    expectedDrivers: 0 // 应出勤司机个数 = 总司机数 - 请假司机数
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

  // 加载计件记录（带缓存）- 移除司机筛选功能
  const loadRecords = useCallback(async () => {
    if (warehouses.length === 0) return

    try {
      // 加载当前选中仓库的记录
      const warehouse = warehouses[currentWarehouseIndex]
      if (!warehouse) {
        setRecords([])
        return
      }

      // 确保日期范围至少包含今天（用于计算今天件数）
      const today = new Date().toISOString().split('T')[0]
      const actualStartDate = startDate <= today ? startDate : today
      const actualEndDate = endDate >= today ? endDate : today

      // 生成缓存键（包含仓库ID、日期范围）
      const cacheKey = `super_admin_piece_work_records_${warehouse.id}_${actualStartDate}_${actualEndDate}`
      const cached = getVersionedCache<PieceWorkRecord[]>(cacheKey)

      let data: PieceWorkRecord[] = []

      if (cached) {
        console.log('✅ 使用缓存的计件记录')
        data = cached
      } else {
        console.log('🔄 从数据库加载计件记录')
        data = await getPieceWorkRecordsByWarehouse(warehouse.id, actualStartDate, actualEndDate)
        // 保存到缓存（3分钟有效期）
        setVersionedCache(cacheKey, data, 3 * 60 * 1000)
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
  }, [warehouses, currentWarehouseIndex, startDate, endDate, sortOrder])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useDidShow(() => {
    // 清除缓存，强制重新加载最新数据
    clearVersionedCache('super_admin_piece_work_base_data')
    // 清除所有计件记录缓存
    warehouses.forEach((warehouse) => {
      const today = new Date().toISOString().split('T')[0]
      const actualStartDate = startDate <= today ? startDate : today
      const actualEndDate = endDate >= today ? endDate : today
      clearVersionedCache(`super_admin_piece_work_records_${warehouse.id}_${actualStartDate}_${actualEndDate}`)
    })
    loadData()
    loadRecords()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadData(), loadRecords()])
    Taro.stopPullDownRefresh()
  })

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
    const target = warehouse?.daily_target || 0
    console.log('📊 每日指标计算：', {
      currentWarehouseIndex,
      warehouseName: warehouse?.name,
      daily_target: warehouse?.daily_target,
      finalTarget: target
    })
    return target
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

    // 首先，为所有司机创建初始汇总数据
    drivers.forEach((driver) => {
      const daysEmployed = calculateDaysEmployed(driver.join_date || null)
      summaryMap.set(driver.id, {
        driverId: driver.id,
        driverName: driver.name || '',
        driverPhone: driver.phone || '',
        driverType: driver.driver_type || null,
        totalQuantity: 0,
        totalAmount: 0,
        warehouses: new Set<string>(),
        warehouseNames: [],
        recordCount: 0,
        joinDate: driver.join_date || null,
        daysEmployed,
        dailyCompletionRate: 0,
        weeklyCompletionRate: 0,
        monthlyCompletionRate: 0,
        dailyQuantity: 0,
        weeklyQuantity: 0,
        monthlyQuantity: 0,
        todayStatus: 'not_recorded' as const
      })
    })

    // 然后，累加计件工作记录
    records.forEach((record) => {
      const driverId = record.user_id
      const summary = summaryMap.get(driverId)

      // 如果司机不在 summaryMap 中（可能是已删除的司机），跳过
      if (!summary) return

      // 累加数量
      summary.totalQuantity += record.quantity || 0

      // 计算金额
      const baseAmount = (record.quantity || 0) * (record.unit_price || 0)
      const upstairsAmount = record.need_upstairs ? (record.quantity || 0) * (record.upstairs_price || 0) : 0
      const sortingAmount = record.need_sorting ? (record.sorting_quantity || 0) * (record.sorting_unit_price || 0) : 0
      summary.totalAmount += baseAmount + upstairsAmount + sortingAmount

      // 记录仓库
      summary.warehouses.add(record.warehouse_id)

      // 记录数量
      summary.recordCount += 1
    })

    // 转换为数组并填充仓库名称
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
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`
    return {start: todayStr, end: todayStr}
  }

  // 辅助函数：获取本周的日期范围（周一到今天）
  const getWeekRange = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周一为起点
    const monday = new Date(today)
    monday.setDate(today.getDate() - diff)

    // 使用本地时间格式化日期
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    return {start: mondayStr, end: todayStr}
  }

  // 辅助函数：获取本月的日期范围（本月1号到今天）
  const getMonthRange = () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

    // 使用本地时间格式化日期
    const firstDayStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
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
      if (driverSummariesBase.length === 0) {
        setDriverSummaries([])
        return
      }

      try {
        // 获取日期范围
        const todayRange = getTodayRange()
        const weekRange = getWeekRange()
        const monthRange = getMonthRange()

        // 批量获取所有司机的考勤数据（一次查询）
        const driverIds = driverSummariesBase.map((s) => s.driverId)
        const attendanceStatsMap = await getBatchDriverAttendanceStats(driverIds, startDate, endDate)

        // 批量获取本周考勤数据（用于计算本周请假天数）
        const weeklyAttendanceStatsMap = await getBatchDriverAttendanceStats(driverIds, weekRange.start, weekRange.end)

        // 处理每个司机的数据
        const summariesWithAttendance = driverSummariesBase.map((summary) => {
          const attendanceStats = attendanceStatsMap.get(summary.driverId) || {
            attendanceDays: 0,
            lateDays: 0,
            leaveDays: 0
          }

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

          // 计算今天达标率
          let dailyCompletionRate = 0
          if (dailyTarget > 0) {
            dailyCompletionRate = (dailyQuantity / dailyTarget) * 100
          }

          // 计算本周达标率（考虑新员工入职日期和请假天数）
          let weeklyCompletionRate = 0
          if (dailyTarget > 0) {
            const today = new Date()
            const weekStart = weekRange.start
            const weekStartDate = new Date(weekStart)

            // 计算实际工作的起始日期（本周一或入职日，取较晚的）
            let startDate = weekStartDate
            if (summary.joinDate) {
              const joinDate = new Date(summary.joinDate)
              if (joinDate > weekStartDate) {
                startDate = joinDate
              }
            }

            // 计算从起始日期到今天的天数（包含起始日和今天）
            const diffTime = today.getTime() - startDate.getTime()
            const daysInWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

            // 获取本周的请假天数（从批量查询结果中获取）
            const weeklyAttendanceStats = weeklyAttendanceStatsMap.get(summary.driverId) || {
              attendanceDays: 0,
              lateDays: 0,
              leaveDays: 0
            }
            const weeklyLeaveDays = weeklyAttendanceStats.leaveDays || 0

            // 获取当前仓库的允许请假天数（按比例计算本周允许的请假天数）
            const currentWarehouse = warehouses[currentWarehouseIndex]
            const monthlyMaxLeaveDays = currentWarehouse?.max_leave_days || 0
            // 假设一个月30天，计算本周允许的请假天数
            const weeklyMaxLeaveDays = Math.floor((monthlyMaxLeaveDays * daysInWeek) / 30)

            // 计算合规请假天数（不超过允许的请假天数）
            const validLeaveDays = Math.min(weeklyLeaveDays, weeklyMaxLeaveDays)

            // 计算本周应工作天数 = 本周天数 - 合规请假天数
            const workDaysInWeek = Math.max(daysInWeek - validLeaveDays, 0)

            const weeklyTarget = dailyTarget * workDaysInWeek
            weeklyCompletionRate = weeklyTarget > 0 ? (weeklyQuantity / weeklyTarget) * 100 : 0
          }

          // 计算本月达标率（考虑新员工入职日期和请假天数）
          let monthlyCompletionRate = 0
          if (dailyTarget > 0) {
            const today = new Date()
            const monthStart = monthRange.start
            const monthStartDate = new Date(monthStart)

            // 计算实际工作的起始日期（本月1号或入职日，取较晚的）
            let startDate = monthStartDate
            if (summary.joinDate) {
              const joinDate = new Date(summary.joinDate)
              if (joinDate > monthStartDate) {
                startDate = joinDate
              }
            }

            // 计算从起始日期到今天的天数（包含起始日和今天）
            const diffTime = today.getTime() - startDate.getTime()
            const daysInMonth = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

            // 获取本月的请假天数（使用已经获取的 attendanceStats）
            const monthlyLeaveDays = attendanceStats.leaveDays || 0

            // 获取当前仓库的允许请假天数
            const currentWarehouse = warehouses[currentWarehouseIndex]
            const maxLeaveDays = currentWarehouse?.max_leave_days || 0

            // 计算合规请假天数（不超过允许的请假天数）
            const validLeaveDays = Math.min(monthlyLeaveDays, maxLeaveDays)

            // 计算本月应工作天数 = 本月天数 - 合规请假天数
            const workDaysInMonth = Math.max(daysInMonth - validLeaveDays, 0)

            const monthlyTarget = dailyTarget * workDaysInMonth
            monthlyCompletionRate = monthlyTarget > 0 ? (monthlyQuantity / monthlyTarget) * 100 : 0
          }

          // 判断今日状态
          let todayStatus: 'on_leave' | 'not_recorded' | number = 'not_recorded'

          // 1. 优先检查是否在休假中
          if (attendanceStats.leaveDays > 0) {
            // 检查今天是否在请假期间
            todayStatus = 'on_leave'
          }

          // 2. 计算今天的计件次数
          if (todayStatus === 'not_recorded') {
            const todayStr = getLocalDateString()
            // 从 records 中过滤出当前司机今天的记录
            const todayRecordsCount = records.filter(
              (r) => r.user_id === summary.driverId && r.work_date === todayStr
            ).length

            if (todayRecordsCount > 0) {
              todayStatus = todayRecordsCount // 存储具体的计件次数
            }
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
            monthlyQuantity,
            todayStatus
          }
        })

        // 根据排序依据和排序顺序排序
        summariesWithAttendance.sort((a, b) => {
          let compareValue = 0
          if (sortBy === 'today') {
            compareValue = b.dailyQuantity - a.dailyQuantity
          } else if (sortBy === 'week') {
            compareValue = b.weeklyQuantity - a.weeklyQuantity
          } else if (sortBy === 'month') {
            compareValue = b.monthlyQuantity - a.monthlyQuantity
          }
          return sortOrder === 'desc' ? compareValue : -compareValue
        })

        setDriverSummaries(summariesWithAttendance)
      } catch (error) {
        console.error('加载考勤数据失败:', error)
        setDriverSummaries([])
      }
    }

    loadAttendanceData()
  }, [
    driverSummariesBase,
    startDate,
    endDate,
    sortOrder,
    sortBy,
    dailyTarget,
    currentWarehouseIndex,
    warehouses,
    records,
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
          todayDrivers: 0,
          todayLeaveDrivers: 0,
          expectedDrivers: 0
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
        console.log('仪表盘数据计算：今天出勤司机数', todayDriversCount)

        // 获取今天请假的司机
        const leaveApplications = await getLeaveApplicationsByWarehouse(warehouse.id)
        const todayLeaveDriversSet = new Set<string>()

        // 筛选出今天在请假期间的申请（状态为已批准）
        leaveApplications.forEach((app) => {
          if (app.status === 'approved') {
            const startDate = new Date(app.start_date)
            const endDate = new Date(app.end_date)
            const todayDate = new Date(today)

            // 检查今天是否在请假日期范围内
            if (todayDate >= startDate && todayDate <= endDate) {
              todayLeaveDriversSet.add(app.user_id)
            }
          }
        })

        const todayLeaveDriversCount = todayLeaveDriversSet.size
        console.log('仪表盘数据计算：今天请假司机数', todayLeaveDriversCount)

        // 计算应出勤司机数 = 总司机数 - 请假司机数
        const expectedDriversCount = totalDrivers - todayLeaveDriversCount
        console.log('仪表盘数据计算：应出勤司机数', expectedDriversCount)

        setDashboardData({
          totalDrivers,
          todayDrivers: todayDriversCount,
          todayLeaveDrivers: todayLeaveDriversCount,
          expectedDrivers: expectedDriversCount
        })
        console.log('仪表盘数据计算：完成', {
          totalDrivers,
          todayDrivers: todayDriversCount,
          todayLeaveDrivers: todayLeaveDriversCount,
          expectedDrivers: expectedDriversCount
        })
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

  // 计算本月总件数
  const monthlyTotalQuantity = useMemo(() => {
    return driverSummaries.reduce((sum, driver) => sum + (driver.monthlyQuantity || 0), 0)
  }, [driverSummaries])

  // 计算本月天数（从本月1号到今天）
  const daysInCurrentMonth = useMemo(() => {
    const today = new Date()
    const currentDay = today.getDate() // 今天是几号
    return currentDay
  }, [])

  // 计算日均件数（本月总件数 / 本月天数）
  const dailyAverageQuantity = useMemo(() => {
    if (daysInCurrentMonth === 0) return 0
    return Math.round(monthlyTotalQuantity / daysInCurrentMonth)
  }, [monthlyTotalQuantity, daysInCurrentMonth])

  // 计算今天件数（只统计今天的数据）
  const todayQuantity = useMemo(() => {
    const today = getLocalDateString()
    return records.filter((r) => r.work_date === today).reduce((sum, r) => sum + (r.quantity || 0), 0)
  }, [records])

  // 计算今天有计件记录的司机数
  const _todayDriversWithRecords = useMemo(() => {
    const today = getLocalDateString()
    console.log('计算今天有计件记录的司机数：', {
      today,
      totalRecords: records.length,
      todayRecords: records.filter((r) => r.work_date === today).length
    })
    const driverIds = new Set(records.filter((r) => r.work_date === today).map((r) => r.user_id))
    console.log('今天有计件记录的司机ID：', Array.from(driverIds))
    console.log('今天有计件记录的司机数：', driverIds.size)
    return driverIds.size
  }, [records])

  // 计算今天达标率（使用应出勤司机数）
  const completionRate = useMemo(() => {
    console.log('今天达标率计算：开始', {
      todayQuantity,
      totalQuantity,
      dailyTarget,
      totalDrivers: dashboardData.totalDrivers,
      todayLeaveDrivers: dashboardData.todayLeaveDrivers,
      expectedDrivers: dashboardData.expectedDrivers
    })

    // 1. 检查每日指标是否有效
    if (dailyTarget === 0) {
      console.log('今天达标率计算：每日指标为0，返回0')
      return 0
    }

    // 2. 获取应出勤司机数（总司机数 - 请假司机数）
    const expectedDriversCount = dashboardData.expectedDrivers

    // 3. 检查应出勤司机数是否有效
    if (expectedDriversCount === 0) {
      console.log('今天达标率计算：应出勤司机数为0，返回0')
      return 0
    }

    // 4. 计算今天总目标 = 每日指标 × 应出勤司机数
    const todayTotalTarget = dailyTarget * expectedDriversCount

    // 5. 计算达标率 = 今天完成件数 / 今天总目标
    const rate = (todayQuantity / todayTotalTarget) * 100

    console.log('今天达标率计算：完成', {
      todayQuantity,
      expectedDriversCount,
      todayTotalTarget,
      rate: `${rate.toFixed(1)}%`
    })

    return rate
  }, [
    todayQuantity,
    dailyTarget,
    dashboardData.expectedDrivers,
    dashboardData.totalDrivers,
    dashboardData.todayLeaveDrivers,
    totalQuantity
  ])

  // 计算月度平均达标率
  const monthlyCompletionRate = useMemo(() => {
    console.log('月度达标率计算：司机汇总数据', {
      driverSummariesLength: driverSummaries.length,
      driverSummaries: driverSummaries.map((s) => ({
        name: s.driverName,
        completionRate: s.completionRate,
        monthlyCompletionRate: s.monthlyCompletionRate
      }))
    })

    if (driverSummaries.length === 0) {
      console.log('月度达标率计算：无司机数据，返回 0')
      return 0
    }

    // 使用每个司机的月度达标率，而不是总达标率
    const totalRate = driverSummaries.reduce((sum, s) => sum + (s.monthlyCompletionRate || 0), 0)
    const avgRate = totalRate / driverSummaries.length

    console.log('月度达标率计算：完成', {
      totalRate,
      avgRate,
      driverCount: driverSummaries.length
    })

    return avgRate
  }, [driverSummaries])

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 仪表盘卡片 - 可滑动切换 */}
          <View className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-5 mb-4 shadow-xl">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center gap-2">
                <View className="i-mdi-view-dashboard text-white text-2xl" />
                <Text className="text-white text-lg font-bold">数据仪表盘</Text>
              </View>
              <View className="bg-white bg-opacity-20 rounded-full px-3 py-1.5">
                <Text className="text-white text-xs">左右滑动查看</Text>
              </View>
            </View>

            {/* 滑动切换容器 */}
            <Swiper
              className="h-72"
              autoplay
              interval={10000}
              circular
              indicatorDots
              indicatorColor="rgba(255, 255, 255, 0.3)"
              indicatorActiveColor="rgba(255, 255, 255, 1)">
              {/* 第一页：达标率和出勤率 */}
              <SwiperItem>
                <View className="h-full">
                  <View className="grid grid-cols-2 gap-3">
                    {/* 今天达标率 */}
                    <View className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4 border border-white border-opacity-20">
                      <View className="flex items-center gap-1.5 mb-2">
                        <View className="i-mdi-target text-yellow-300 text-lg" />
                        <Text className="text-white text-opacity-95 text-xs font-medium">今天达标率</Text>
                      </View>
                      <Text className="text-white text-2xl font-bold mb-1.5">{completionRate.toFixed(1)}%</Text>
                      <View className="bg-white bg-opacity-10 rounded px-2 py-1.5">
                        <Text className="text-white text-opacity-80 text-xs leading-tight">
                          完成 {todayQuantity} / {(dailyTarget * dashboardData.expectedDrivers).toFixed(0)} 件
                        </Text>
                      </View>
                    </View>

                    {/* 月度达标率 */}
                    <View className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4 border border-white border-opacity-20">
                      <View className="flex items-center gap-1.5 mb-2">
                        <View className="i-mdi-calendar-month text-green-300 text-lg" />
                        <Text className="text-white text-opacity-95 text-xs font-medium">月度达标率</Text>
                      </View>
                      <Text className="text-white text-2xl font-bold mb-1.5">{monthlyCompletionRate.toFixed(1)}%</Text>
                      <View className="bg-white bg-opacity-10 rounded px-2 py-1.5">
                        <Text className="text-white text-opacity-80 text-xs leading-tight">
                          当月 {driverSummaries.length} 位司机
                        </Text>
                      </View>
                    </View>

                    {/* 今天出勤率 */}
                    <View className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4 border border-white border-opacity-20">
                      <View className="flex items-center gap-1.5 mb-2">
                        <View className="i-mdi-account-check text-blue-300 text-lg" />
                        <Text className="text-white text-opacity-95 text-xs font-medium">今天出勤率</Text>
                      </View>
                      <Text className="text-white text-2xl font-bold mb-1.5">
                        {dashboardData.totalDrivers > 0
                          ? Math.round((dashboardData.todayDrivers / dashboardData.totalDrivers) * 100)
                          : 0}
                        %
                      </Text>
                      <View className="bg-white bg-opacity-10 rounded px-2 py-1.5">
                        <Text className="text-white text-opacity-80 text-xs leading-tight">
                          出勤 {dashboardData.todayDrivers} / {dashboardData.totalDrivers} 人
                        </Text>
                      </View>
                    </View>

                    {/* 司机总数 */}
                    <View className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4 border border-white border-opacity-20">
                      <View className="flex items-center gap-1.5 mb-2">
                        <View className="i-mdi-account-group text-purple-300 text-lg" />
                        <Text className="text-white text-opacity-95 text-xs font-medium">司机总数</Text>
                      </View>
                      <Text className="text-white text-2xl font-bold mb-1.5">{dashboardData.totalDrivers}</Text>
                      <View className="bg-white bg-opacity-10 rounded px-2 py-1.5">
                        <Text className="text-white text-opacity-80 text-xs leading-tight">当前仓库分配</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </SwiperItem>

              {/* 第二页：件数统计 */}
              <SwiperItem>
                <View className="h-full">
                  <View className="grid grid-cols-2 gap-3">
                    {/* 今天总件数 */}
                    <View className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4 border border-white border-opacity-20">
                      <View className="flex items-center gap-1.5 mb-2">
                        <View className="i-mdi-package-variant text-orange-300 text-lg" />
                        <Text className="text-white text-opacity-95 text-xs font-medium">今天总件数</Text>
                      </View>
                      <Text className="text-white text-2xl font-bold mb-1.5">{todayQuantity}</Text>
                      <View className="bg-white bg-opacity-10 rounded px-2 py-1.5">
                        <Text className="text-white text-opacity-80 text-xs leading-tight">
                          {dashboardData.todayDrivers} 位司机完成
                        </Text>
                      </View>
                    </View>

                    {/* 本周总件数 */}
                    <View className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4 border border-white border-opacity-20">
                      <View className="flex items-center gap-1.5 mb-2">
                        <View className="i-mdi-calendar-week text-cyan-300 text-lg" />
                        <Text className="text-white text-opacity-95 text-xs font-medium">本周总件数</Text>
                      </View>
                      <Text className="text-white text-2xl font-bold mb-1.5">
                        {driverSummaries.reduce((sum, driver) => sum + (driver.weeklyQuantity || 0), 0)}
                      </Text>
                      <View className="bg-white bg-opacity-10 rounded px-2 py-1.5">
                        <Text className="text-white text-opacity-80 text-xs leading-tight">本周累计完成</Text>
                      </View>
                    </View>

                    {/* 本月总件数 */}
                    <View className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4 border border-white border-opacity-20">
                      <View className="flex items-center gap-1.5 mb-2">
                        <View className="i-mdi-calendar-range text-pink-300 text-lg" />
                        <Text className="text-white text-opacity-95 text-xs font-medium">本月总件数</Text>
                      </View>
                      <Text className="text-white text-2xl font-bold mb-1.5">
                        {driverSummaries.reduce((sum, driver) => sum + (driver.monthlyQuantity || 0), 0)}
                      </Text>
                      <View className="bg-white bg-opacity-10 rounded px-2 py-1.5">
                        <Text className="text-white text-opacity-80 text-xs leading-tight">本月累计完成</Text>
                      </View>
                    </View>

                    {/* 平均每日件数 */}
                    <View className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4 border border-white border-opacity-20">
                      <View className="flex items-center gap-1.5 mb-2">
                        <View className="i-mdi-chart-line text-lime-300 text-lg" />
                        <Text className="text-white text-opacity-95 text-xs font-medium">日均件数</Text>
                      </View>
                      <Text className="text-white text-2xl font-bold mb-1.5">{dailyAverageQuantity}</Text>
                      <View className="bg-white bg-opacity-10 rounded px-2 py-1.5">
                        <Text className="text-white text-opacity-80 text-xs leading-tight">
                          本月 {daysInCurrentMonth} 天平均
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </SwiperItem>
            </Swiper>
          </View>

          {/* 仓库切换 */}
          {warehouses.length > 0 && (
            <View className="mb-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">
                  当前仓库 ({currentWarehouseIndex + 1}/{warehouses.length})
                </Text>
                {/* 刷新按钮 */}
                <View
                  onClick={async () => {
                    Taro.showLoading({title: '刷新中...'})
                    await Promise.all([loadData(), loadRecords()])
                    Taro.hideLoading()
                    Taro.showToast({
                      title: '刷新成功',
                      icon: 'success',
                      duration: 1500
                    })
                  }}
                  className="flex items-center gap-1 bg-blue-900 text-white px-3 py-1.5 rounded-full">
                  <View className="i-mdi-refresh text-base" />
                  <Text className="text-xs">刷新数据</Text>
                </View>
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

          {/* 筛选区域 - 已移除，直接显示所有数据 */}

          {/* 排序按钮 */}
          <View className="flex gap-2 mb-4">
            <View
              className={`flex-1 text-center py-2 rounded-lg transition-all active:scale-95 ${sortBy === 'today' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => {
                if (sortBy === 'today') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                } else {
                  setSortBy('today')
                  setSortOrder('desc')
                }
              }}>
              <View className="flex items-center justify-center gap-1">
                <View
                  className={`i-mdi-calendar-today text-base ${sortBy === 'today' ? 'text-white' : 'text-gray-600'}`}
                />
                <Text className={`text-xs font-bold ${sortBy === 'today' ? 'text-white' : 'text-gray-600'}`}>
                  今天 ({sortBy === 'today' && sortOrder === 'asc' ? '升序' : '降序'})
                </Text>
                <View
                  className={`i-mdi-arrow-${sortBy === 'today' && sortOrder === 'asc' ? 'up' : 'down'} text-base ${sortBy === 'today' ? 'text-white' : 'text-gray-600'}`}
                />
              </View>
            </View>
            <View
              className={`flex-1 text-center py-2 rounded-lg transition-all active:scale-95 ${sortBy === 'week' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => {
                if (sortBy === 'week') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                } else {
                  setSortBy('week')
                  setSortOrder('desc')
                }
              }}>
              <View className="flex items-center justify-center gap-1">
                <View
                  className={`i-mdi-calendar-week text-base ${sortBy === 'week' ? 'text-white' : 'text-gray-600'}`}
                />
                <Text className={`text-xs font-bold ${sortBy === 'week' ? 'text-white' : 'text-gray-600'}`}>
                  本周 ({sortBy === 'week' && sortOrder === 'asc' ? '升序' : '降序'})
                </Text>
                <View
                  className={`i-mdi-arrow-${sortBy === 'week' && sortOrder === 'asc' ? 'up' : 'down'} text-base ${sortBy === 'week' ? 'text-white' : 'text-gray-600'}`}
                />
              </View>
            </View>
            <View
              className={`flex-1 text-center py-2 rounded-lg transition-all active:scale-95 ${sortBy === 'month' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => {
                if (sortBy === 'month') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                } else {
                  setSortBy('month')
                  setSortOrder('desc')
                }
              }}>
              <View className="flex items-center justify-center gap-1">
                <View
                  className={`i-mdi-calendar-month text-base ${sortBy === 'month' ? 'text-white' : 'text-gray-600'}`}
                />
                <Text className={`text-xs font-bold ${sortBy === 'month' ? 'text-white' : 'text-gray-600'}`}>
                  本月 ({sortBy === 'month' && sortOrder === 'asc' ? '升序' : '降序'})
                </Text>
                <View
                  className={`i-mdi-arrow-${sortBy === 'month' && sortOrder === 'asc' ? 'up' : 'down'} text-base ${sortBy === 'month' ? 'text-white' : 'text-gray-600'}`}
                />
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
              return (
                <View
                  key={summary.driverId}
                  className="bg-white rounded-xl p-4 mb-3 shadow-md"
                  onClick={() => handleViewDriverDetail(summary.driverId)}>
                  {/* 司机信息头部 */}
                  <View className="flex items-center justify-between mb-4">
                    <View className="flex items-center flex-1">
                      <View className="i-mdi-account-circle text-4xl text-blue-600 mr-3" />
                      <View className="flex-1">
                        <View className="flex items-center justify-between mb-1.5">
                          {/* 左侧：姓名和类型标签 */}
                          <View className="flex items-center gap-2">
                            <Text className="text-base font-bold text-gray-800">
                              {summary.driverName || summary.driverPhone || '未知司机'}
                            </Text>
                            {/* 司机类型标签 */}
                            {summary.driverType && (
                              <View className="bg-gradient-to-r from-purple-400 to-purple-500 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-white font-bold">
                                  {summary.driverType === 'pure' ? '纯司机' : '带车司机'}
                                </Text>
                              </View>
                            )}
                            {/* 新司机标签 */}
                            {summary.daysEmployed < 7 && (
                              <View className="bg-gradient-to-r from-green-400 to-green-500 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-white font-bold">新司机</Text>
                              </View>
                            )}
                          </View>
                          {/* 右侧：今日状态标签 */}
                          {typeof summary.todayStatus === 'number' && (
                            <View className="bg-gradient-to-r from-green-500 to-green-600 px-2 py-0.5 rounded-full">
                              <Text className="text-xs text-white font-bold">已记{summary.todayStatus}次</Text>
                            </View>
                          )}
                          {summary.todayStatus === 'on_leave' && (
                            <View className="bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-0.5 rounded-full">
                              <Text className="text-xs text-white font-bold">休假</Text>
                            </View>
                          )}
                          {summary.todayStatus === 'not_recorded' && (
                            <View className="bg-gradient-to-r from-red-500 to-red-600 px-2 py-0.5 rounded-full">
                              <Text className="text-xs text-white font-bold">未记录</Text>
                            </View>
                          )}
                        </View>
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
                    {/* 今天达标率环形图 */}
                    <View className="flex flex-col items-center">
                      <CircularProgress
                        percentage={summary.dailyCompletionRate || 0}
                        size={70}
                        strokeWidth={6}
                        label="今天达标率"
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
                        应工作{(() => {
                          const today = new Date()
                          // 计算本周一的日期
                          const dayOfWeek = today.getDay()
                          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周日为0，需要特殊处理
                          const weekStart = new Date(today)
                          weekStart.setDate(today.getDate() - diff)
                          weekStart.setHours(0, 0, 0, 0)

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
                          const daysInWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

                          // 获取本周的请假天数（从 summary 中获取，需要在数据加载时计算）
                          // 注意：这里简化处理，实际应该从后端获取本周请假天数
                          // 暂时使用 0，因为 summary 中没有 weeklyLeaveDays 字段
                          const weeklyLeaveDays = 0

                          // 获取当前仓库的允许请假天数（按比例计算本周允许的请假天数）
                          const currentWarehouse = warehouses[currentWarehouseIndex]
                          const monthlyMaxLeaveDays = currentWarehouse?.max_leave_days || 0
                          // 假设一个月30天，计算本周允许的请假天数
                          const weeklyMaxLeaveDays = Math.floor((monthlyMaxLeaveDays * daysInWeek) / 30)

                          // 计算合规请假天数（不超过允许的请假天数）
                          const validLeaveDays = Math.min(weeklyLeaveDays, weeklyMaxLeaveDays)

                          // 计算本周应工作天数 = 本周天数 - 合规请假天数
                          const workDaysInWeek = Math.max(daysInWeek - validLeaveDays, 0)

                          return workDaysInWeek
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
                          const daysInMonth = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

                          // 获取本月的请假天数
                          const monthlyLeaveDays = summary.leaveDays || 0

                          // 获取当前仓库的允许请假天数
                          const currentWarehouse = warehouses[currentWarehouseIndex]
                          const maxLeaveDays = currentWarehouse?.max_leave_days || 0

                          // 计算合规请假天数（不超过允许的请假天数）
                          const validLeaveDays = Math.min(monthlyLeaveDays, maxLeaveDays)

                          // 计算本月应工作天数 = 本月天数 - 合规请假天数
                          const workDaysInMonth = Math.max(daysInMonth - validLeaveDays, 0)

                          return workDaysInMonth
                        })()}天
                      </Text>
                    </View>
                  </View>

                  {/* 入职信息 */}
                  <View className="bg-blue-50 rounded-lg px-3 py-2 mb-4">
                    <View className="flex items-center justify-between mb-1.5">
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
                      <Text className="text-xs text-gray-600">今天件数</Text>
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
