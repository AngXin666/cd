import {Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {
  getActiveCategories,
  getAllWarehouses,
  getDriverAttendanceStats,
  getDriverProfiles,
  getPieceWorkRecordsByWarehouse
} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, Profile, Warehouse} from '@/db/types'
import {getFirstDayOfMonthString, getLocalDateString, getMondayDateString, getYesterdayDateString} from '@/utils/date'
import {matchWithPinyin} from '@/utils/pinyin'

// 司机汇总数据结构
interface DriverSummary {
  driverId: string
  driverName: string
  driverPhone: string
  totalQuantity: number
  totalAmount: number
  completionRate: number // 每日达标率
  warehouses: Set<string>
  warehouseNames: string[]
  recordCount: number
  attendanceDays: number
  lateDays: number
  leaveDays: number
}

const SuperAdminPieceWorkReport: React.FC = () => {
  const {user} = useAuth({guard: true})

  // 数据状态
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])

  // 筛选状态
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0) // 0 表示所有仓库
  const [selectedDriverId, setSelectedDriverId] = useState<string>('') // 使用ID而不是索引
  const [driverSearchKeyword, setDriverSearchKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [quickFilter, setQuickFilter] = useState<'yesterday' | 'week' | 'month' | 'custom'>('month')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState<'completion' | 'quantity' | 'leave'>('completion') // 排序依据
  const [showFilters, setShowFilters] = useState(false) // 是否显示筛选区域

  // 初始化日期范围（默认当月）
  useEffect(() => {
    const firstDay = getFirstDayOfMonthString()
    const today = getLocalDateString()
    setStartDate(firstDay)
    setEndDate(today)
  }, [])

  // 加载基础数据
  const loadData = useCallback(async () => {
    if (!user?.id) return

    try {
      // 加载所有仓库
      const warehousesData = await getAllWarehouses()
      setWarehouses(warehousesData)

      // 加载所有司机
      const driversData = await getDriverProfiles()
      setDrivers(driversData)

      // 加载所有品类
      const categoriesData = await getActiveCategories()
      setCategories(categoriesData)
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

  // 加载计件记录
  const loadRecords = useCallback(async () => {
    if (warehouses.length === 0) return

    try {
      let data: PieceWorkRecord[] = []

      if (selectedWarehouseIndex === 0) {
        // 加载所有仓库的记录
        const allRecords = await Promise.all(
          warehouses.map((w) => getPieceWorkRecordsByWarehouse(w.id, startDate, endDate))
        )
        data = allRecords.flat()
      } else {
        // 加载特定仓库的记录
        const warehouse = warehouses[selectedWarehouseIndex - 1]
        data = await getPieceWorkRecordsByWarehouse(warehouse.id, startDate, endDate)
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
  }, [warehouses, selectedWarehouseIndex, selectedDriverId, startDate, endDate, sortOrder])

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

    const warehouseId = selectedWarehouseIndex > 0 ? warehouses[selectedWarehouseIndex - 1].id : warehouses[0].id
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
      url: `/pages/super-admin/piece-work-report-detail/index?driverId=${driverId}&startDate=${startDate}&endDate=${endDate}&warehouseIndex=${selectedWarehouseIndex}`
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
    if (selectedWarehouseIndex === 0) {
      // 所有仓库：累加所有仓库的每日指标数
      return warehouses.reduce((sum, w) => sum + (w.daily_target || 0), 0)
    } else {
      // 特定仓库：返回该仓库的每日指标数
      const warehouse = warehouses[selectedWarehouseIndex - 1]
      return warehouse?.daily_target || 0
    }
  }, [warehouses, selectedWarehouseIndex])

  // 计算司机汇总数据（不含考勤）
  const driverSummariesBase = useMemo(() => {
    const summaryMap = new Map<
      string,
      Omit<DriverSummary, 'attendanceDays' | 'lateDays' | 'leaveDays' | 'completionRate'>
    >()

    records.forEach((record) => {
      const driverId = record.user_id
      if (!summaryMap.has(driverId)) {
        const driver = drivers.find((d) => d.id === driverId)
        summaryMap.set(driverId, {
          driverId,
          driverName: driver?.name || '',
          driverPhone: driver?.phone || '',
          totalQuantity: 0,
          totalAmount: 0,
          warehouses: new Set<string>(),
          warehouseNames: [],
          recordCount: 0
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

  // 加载考勤数据并合并
  useEffect(() => {
    const loadAttendanceData = async () => {
      const summariesWithAttendance = await Promise.all(
        driverSummariesBase.map(async (summary) => {
          const attendanceStats = await getDriverAttendanceStats(summary.driverId, startDate, endDate)

          // 计算每日达标率
          // 达标率 = (总件数 / 每日指标数) * 100%
          let driverCompletionRate = 0
          if (dailyTarget > 0) {
            driverCompletionRate = (summary.totalQuantity / dailyTarget) * 100
          }

          return {
            ...summary,
            attendanceDays: attendanceStats.attendanceDays,
            lateDays: attendanceStats.lateDays,
            leaveDays: attendanceStats.leaveDays,
            completionRate: driverCompletionRate
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
  }, [driverSummariesBase, startDate, endDate, sortOrder, sortBy, dailyTarget])

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
  const uniqueDrivers = new Set(records.map((r) => r.user_id)).size

  // 计算目标完成率
  const completionRate = useMemo(() => {
    if (dailyTarget === 0) return 0
    return (totalQuantity / dailyTarget) * 100
  }, [totalQuantity, dailyTarget])

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 统计卡片 */}
          <View className="grid grid-cols-3 gap-3 mb-4">
            <View className="bg-white rounded-lg p-3 shadow">
              <View className="flex items-center justify-between mb-1">
                <Text className="text-xs text-gray-600">总件数</Text>
                <View className="i-mdi-package-variant text-lg text-blue-900" />
              </View>
              <Text className="text-2xl font-bold text-blue-900 block">{totalQuantity}</Text>
              <Text className="text-xs text-gray-500 mt-1">目标: {dailyTarget}</Text>
            </View>
            <View className="bg-white rounded-lg p-3 shadow">
              <View className="flex items-center justify-between mb-1">
                <Text className="text-xs text-gray-600">目标完成率</Text>
                <View className="i-mdi-chart-line text-lg text-green-600" />
              </View>
              <Text
                className={`text-2xl font-bold block ${completionRate >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                {completionRate.toFixed(1)}%
              </Text>
              <Text className="text-xs text-gray-500 mt-1">{completionRate >= 100 ? '已达标' : '未达标'}</Text>
            </View>
            <View className="bg-white rounded-lg p-3 shadow">
              <View className="flex items-center justify-between mb-1">
                <Text className="text-xs text-gray-600">司机数</Text>
                <View className="i-mdi-account-group text-lg text-blue-900" />
              </View>
              <Text className="text-2xl font-bold text-blue-900 block">{uniqueDrivers}</Text>
              <Text className="text-xs text-gray-500 mt-1">已有司机</Text>
            </View>
          </View>

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
                {/* 仓库筛选 */}
                <View className="mb-3">
                  <Text className="text-sm text-gray-700 block mb-2">仓库</Text>
                  <Picker
                    mode="selector"
                    range={['所有仓库', ...warehouses.map((w) => w.name)]}
                    value={selectedWarehouseIndex}
                    onChange={(e) => setSelectedWarehouseIndex(Number(e.detail.value))}>
                    <View className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <Text className="text-sm text-gray-800">
                        {selectedWarehouseIndex === 0 ? '所有仓库' : warehouses[selectedWarehouseIndex - 1]?.name}
                      </Text>
                      <View className="i-mdi-chevron-down text-xl text-gray-400" />
                    </View>
                  </Picker>
                </View>

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

          {/* 快捷排序按钮 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-sm font-bold text-gray-800 block mb-3">快捷排序</Text>
            <View className="flex gap-2">
              <View
                onClick={() => {
                  if (sortBy === 'completion') {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                  } else {
                    setSortBy('completion')
                    setSortOrder('desc')
                  }
                }}
                className={`flex-1 flex items-center justify-center py-2 rounded-lg ${
                  sortBy === 'completion' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                <View
                  className={`i-mdi-chart-line text-base mr-1 ${sortBy === 'completion' ? 'text-white' : 'text-gray-600'}`}
                />
                <Text className={`text-xs ${sortBy === 'completion' ? 'text-white' : 'text-gray-700'}`}>达标率</Text>
                {sortBy === 'completion' && (
                  <View
                    className={`i-mdi-arrow-${sortOrder === 'desc' ? 'down' : 'up'} text-base ml-1 ${sortBy === 'completion' ? 'text-white' : 'text-gray-600'}`}
                  />
                )}
              </View>
              <View
                onClick={() => {
                  if (sortBy === 'quantity') {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                  } else {
                    setSortBy('quantity')
                    setSortOrder('desc')
                  }
                }}
                className={`flex-1 flex items-center justify-center py-2 rounded-lg ${
                  sortBy === 'quantity' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                <View
                  className={`i-mdi-package-variant text-base mr-1 ${sortBy === 'quantity' ? 'text-white' : 'text-gray-600'}`}
                />
                <Text className={`text-xs ${sortBy === 'quantity' ? 'text-white' : 'text-gray-700'}`}>件数</Text>
                {sortBy === 'quantity' && (
                  <View
                    className={`i-mdi-arrow-${sortOrder === 'desc' ? 'down' : 'up'} text-base ml-1 ${sortBy === 'quantity' ? 'text-white' : 'text-gray-600'}`}
                  />
                )}
              </View>
              <View
                onClick={() => {
                  if (sortBy === 'leave') {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                  } else {
                    setSortBy('leave')
                    setSortOrder('desc')
                  }
                }}
                className={`flex-1 flex items-center justify-center py-2 rounded-lg ${
                  sortBy === 'leave' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                <View
                  className={`i-mdi-calendar-remove text-base mr-1 ${sortBy === 'leave' ? 'text-white' : 'text-gray-600'}`}
                />
                <Text className={`text-xs ${sortBy === 'leave' ? 'text-white' : 'text-gray-700'}`}>请假</Text>
                {sortBy === 'leave' && (
                  <View
                    className={`i-mdi-arrow-${sortOrder === 'desc' ? 'down' : 'up'} text-base ml-1 ${sortBy === 'leave' ? 'text-white' : 'text-gray-600'}`}
                  />
                )}
              </View>
            </View>
          </View>

          {/* 司机汇总列表 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-base font-bold text-gray-800">司机汇总</Text>
              <Text className="text-xs text-gray-500">共 {driverSummaries.length} 位司机</Text>
            </View>

            {driverSummaries.length === 0 ? (
              <View className="text-center py-12">
                <View className="i-mdi-account-off text-6xl text-gray-300 mx-auto mb-3" />
                <Text className="text-sm text-gray-400 block">暂无数据</Text>
              </View>
            ) : (
              <View>
                {driverSummaries.map((summary) => (
                  <View
                    key={summary.driverId}
                    className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-gray-100"
                    onClick={() => handleViewDriverDetail(summary.driverId)}>
                    <View className="flex items-start justify-between mb-3">
                      <View className="flex-1">
                        <View className="flex items-center mb-1">
                          <View className="i-mdi-account-circle text-2xl text-blue-900 mr-2" />
                          <Text className="text-base font-bold text-gray-800">
                            {summary.driverName || summary.driverPhone || '未知司机'}
                          </Text>
                        </View>
                        {summary.driverPhone && summary.driverName && (
                          <Text className="text-xs text-gray-500 ml-8">{summary.driverPhone}</Text>
                        )}
                      </View>
                      <View
                        className={`px-3 py-1 rounded-full ${summary.completionRate >= 100 ? 'bg-green-600' : 'bg-orange-500'}`}>
                        <Text className="text-sm text-white font-bold">{summary.completionRate.toFixed(1)}%</Text>
                      </View>
                    </View>

                    <View className="flex items-center gap-4 mb-3 ml-8">
                      <View className="flex items-center">
                        <View className="i-mdi-package-variant text-base text-gray-500 mr-1" />
                        <Text className="text-sm text-gray-600">总件数: {summary.totalQuantity}</Text>
                      </View>
                      <View className="flex items-center">
                        <View className="i-mdi-file-document text-base text-gray-500 mr-1" />
                        <Text className="text-sm text-gray-600">记录数: {summary.recordCount}</Text>
                      </View>
                    </View>

                    {/* 考勤信息 */}
                    <View className="flex items-center gap-4 mb-3 ml-8">
                      <View className="flex items-center">
                        <View className="i-mdi-calendar-check text-base text-green-600 mr-1" />
                        <Text className="text-sm text-gray-600">出勤: {summary.attendanceDays}天</Text>
                      </View>
                      <View className="flex items-center">
                        <View className="i-mdi-clock-alert text-base text-orange-600 mr-1" />
                        <Text className="text-sm text-gray-600">迟到: {summary.lateDays}天</Text>
                      </View>
                      <View className="flex items-center">
                        <View className="i-mdi-calendar-remove text-base text-red-600 mr-1" />
                        <Text className="text-sm text-gray-600">请假: {summary.leaveDays}天</Text>
                      </View>
                    </View>

                    <View className="ml-8">
                      <View className="flex items-start">
                        <View className="i-mdi-warehouse text-base text-gray-500 mr-1 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500">关联仓库: </Text>
                          <View className="flex flex-wrap gap-1 mt-1">
                            {summary.warehouseNames.map((name, index) => (
                              <View key={index} className="bg-blue-100 px-2 py-0.5 rounded">
                                <Text className="text-xs text-blue-700">{name}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    </View>

                    <View className="flex items-center justify-end mt-3">
                      <Text className="text-xs text-blue-600 mr-1">查看详细记录</Text>
                      <View className="i-mdi-chevron-right text-base text-blue-600" />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default SuperAdminPieceWorkReport
