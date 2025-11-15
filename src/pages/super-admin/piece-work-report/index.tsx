import {Input, Picker, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
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
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0) // 当前仓库索引（用于Swiper切换）
  const [selectedDriverId, setSelectedDriverId] = useState<string>('') // 使用ID而不是索引
  const [driverSearchKeyword, setDriverSearchKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [quickFilter, setQuickFilter] = useState<'yesterday' | 'week' | 'month' | 'custom'>('month')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState<'completion' | 'quantity' | 'leave'>('completion') // 排序依据
  const [showFilters, setShowFilters] = useState(false) // 是否显示筛选区域

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
      // 加载当前选中仓库的记录
      const warehouse = warehouses[currentWarehouseIndex]
      let data: PieceWorkRecord[] = []

      if (warehouse) {
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
          {/* 整体目标完成率卡片 */}
          <View className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl p-6 mb-4 shadow-lg">
            <View className="flex items-center justify-between mb-4">
              <Text className="text-white text-lg font-bold">整体目标完成率</Text>
              <View className="i-mdi-chart-box text-white text-2xl" />
            </View>

            <View className="flex items-center gap-6">
              {/* 圆环图 */}
              <View className="relative w-28 h-28">
                <View
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${
                      completionRate >= 100 ? '#10b981' : completionRate >= 80 ? '#fbbf24' : '#ef4444'
                    } ${Math.min(completionRate, 100) * 3.6}deg, rgba(255,255,255,0.3) 0deg)`
                  }}
                />
                <View className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <View>
                    <Text className="text-3xl font-bold text-gray-800 text-center block">
                      {completionRate.toFixed(0)}
                    </Text>
                    <Text className="text-sm text-gray-500 text-center">%</Text>
                  </View>
                </View>
              </View>

              {/* 统计信息 */}
              <View className="flex-1">
                <View className="mb-3">
                  <Text className="text-white text-opacity-90 text-sm block mb-1">总完成件数</Text>
                  <Text className="text-white text-2xl font-bold">{totalQuantity} 件</Text>
                </View>
                <View className="mb-3">
                  <Text className="text-white text-opacity-90 text-sm block mb-1">每日目标</Text>
                  <Text className="text-white text-xl font-bold">{dailyTarget} 件</Text>
                </View>
                <View>
                  <Text className="text-white text-opacity-90 text-sm block mb-1">参与司机</Text>
                  <Text className="text-white text-xl font-bold">{uniqueDrivers} 人</Text>
                </View>
              </View>
            </View>

            {/* 达标状态 */}
            <View className="mt-4 pt-4 border-t border-white border-opacity-20">
              <View className="flex items-center justify-between">
                <Text className="text-white text-opacity-90 text-sm">完成状态</Text>
                <View className={`px-3 py-1 rounded-full ${completionRate >= 100 ? 'bg-green-500' : 'bg-orange-500'}`}>
                  <Text className="text-white text-sm font-bold">{completionRate >= 100 ? '✓ 已达标' : '未达标'}</Text>
                </View>
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
            driverSummaries.map((summary) => (
              <View
                key={summary.driverId}
                className={`bg-white rounded-xl p-4 mb-3 shadow-md ${summary.completionRate >= 100 ? 'border-2 border-green-400' : ''}`}
                onClick={() => handleViewDriverDetail(summary.driverId)}>
                {/* 达标徽章 */}
                {summary.completionRate >= 100 && (
                  <View className="absolute top-2 right-2 bg-gradient-to-r from-green-400 to-green-500 px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                    <View className="i-mdi-check-circle text-white text-sm" />
                    <Text className="text-xs text-white font-bold">达标</Text>
                  </View>
                )}

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

                {/* 达标率圆环 */}
                <View className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                  <View className="relative w-20 h-20">
                    <View
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(${
                          summary.completionRate >= 100
                            ? '#10b981'
                            : summary.completionRate >= 80
                              ? '#f59e0b'
                              : '#ef4444'
                        } ${Math.min(summary.completionRate, 100) * 3.6}deg, #e5e7eb 0deg)`
                      }}
                    />
                    <View className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                      <View>
                        <Text className="text-xl font-bold text-gray-800 text-center block">
                          {summary.completionRate.toFixed(0)}
                        </Text>
                        <Text className="text-xs text-gray-500 text-center">%</Text>
                      </View>
                    </View>
                  </View>
                  <View className="flex-1">
                    <View className="flex items-center justify-between mb-2">
                      <Text className="text-sm text-gray-600">完成件数</Text>
                      <Text className="text-sm font-bold text-blue-600">
                        {summary.totalQuantity} / {dailyTarget} 件
                      </Text>
                    </View>
                    <View className="flex items-center justify-between">
                      <Text className="text-sm text-gray-600">记录数</Text>
                      <Text className="text-sm font-bold text-green-600">{summary.recordCount} 条</Text>
                    </View>
                  </View>
                </View>

                {/* 考勤统计数据 */}
                <View className="grid grid-cols-3 gap-3">
                  <View className="text-center bg-green-50 rounded-lg py-2">
                    <Text className="text-xl font-bold text-green-600 block">{summary.attendanceDays}</Text>
                    <Text className="text-xs text-gray-600">出勤天数</Text>
                  </View>
                  <View className="text-center bg-orange-50 rounded-lg py-2">
                    <Text className="text-xl font-bold text-orange-600 block">{summary.lateDays}</Text>
                    <Text className="text-xs text-gray-600">迟到天数</Text>
                  </View>
                  <View className="text-center bg-red-50 rounded-lg py-2">
                    <Text className="text-xl font-bold text-red-600 block">{summary.leaveDays}</Text>
                    <Text className="text-xs text-gray-600">请假天数</Text>
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
      </ScrollView>
    </View>
  )
}

export default SuperAdminPieceWorkReport
