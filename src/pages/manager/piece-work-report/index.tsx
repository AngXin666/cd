import {Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {
  getActiveCategories,
  getCurrentUserProfile,
  getDriverProfiles,
  getManagerWarehouses,
  getPieceWorkRecordsByWarehouse
} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, Profile, Warehouse} from '@/db/types'
import {matchWithPinyin} from '@/utils/pinyin'

// 司机汇总数据结构
interface DriverSummary {
  driverId: string
  driverName: string
  driverPhone: string
  totalQuantity: number
  totalAmount: number
  warehouses: Set<string> // 关联的仓库ID集合
  warehouseNames: string[] // 关联的仓库名称列表
  recordCount: number // 记录数量
}

const ManagerPieceWorkReport: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [_profile, setProfile] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [_categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])

  // 筛选条件
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [selectedDriverId, setSelectedDriverId] = useState<string>('') // 改用ID而不是索引
  const [driverSearchKeyword, setDriverSearchKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeQuickFilter, setActiveQuickFilter] = useState<'yesterday' | 'week' | 'month' | 'custom'>('month')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 初始化日期范围（默认当月）
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const firstDay = `${year}-${month}-01`
    const today = now.toISOString().split('T')[0]
    setStartDate(firstDay)
    setEndDate(today)
  }, [])

  // 加载基础数据
  const loadData = useCallback(async () => {
    if (!user?.id) return

    try {
      // 加载当前用户信息
      const profileData = await getCurrentUserProfile()
      setProfile(profileData)

      // 加载管辖的仓库
      const warehousesData = await getManagerWarehouses(user.id)
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
    if (!startDate || !endDate || warehouses.length === 0) return

    try {
      let data: PieceWorkRecord[] = []

      // 如果选择了特定仓库
      if (selectedWarehouseIndex > 0) {
        const warehouse = warehouses[selectedWarehouseIndex - 1]
        if (warehouse) {
          data = await getPieceWorkRecordsByWarehouse(warehouse.id, startDate, endDate)

          // 如果还选择了特定司机，进一步筛选
          if (selectedDriverId) {
            data = data.filter((r) => r.user_id === selectedDriverId)
          }
        }
      } else {
        // 如果选择了"所有仓库"，加载所有管辖仓库的记录
        const allRecords = await Promise.all(
          warehouses.map((w) => getPieceWorkRecordsByWarehouse(w.id, startDate, endDate))
        )
        data = allRecords.flat()

        // 如果选择了特定司机，筛选该司机的记录
        if (selectedDriverId) {
          data = data.filter((r) => r.user_id === selectedDriverId)
        }
      }

      // 按日期排序
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
  }, [startDate, endDate, warehouses, selectedWarehouseIndex, selectedDriverId, sortOrder])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useDidShow(() => {
    loadData()
  })

  // 快捷筛选：前一天
  const handleYesterdayFilter = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]
    setStartDate(dateStr)
    setEndDate(dateStr)
    setActiveQuickFilter('yesterday')
  }

  // 快捷筛选：本周
  const handleWeekFilter = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    monday.setDate(now.getDate() - daysToMonday)

    const startDateStr = monday.toISOString().split('T')[0]
    const endDateStr = now.toISOString().split('T')[0]

    setStartDate(startDateStr)
    setEndDate(endDateStr)
    setActiveQuickFilter('week')
  }

  // 快捷筛选：本月
  const handleMonthFilter = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const firstDay = `${year}-${month}-01`
    const today = now.toISOString().split('T')[0]

    setStartDate(firstDay)
    setEndDate(today)
    setActiveQuickFilter('month')
  }

  // 处理开始日期变化
  const handleStartDateChange = (e) => {
    setStartDate(e.detail.value)
    setActiveQuickFilter('custom')
  }

  // 处理结束日期变化
  const handleEndDateChange = (e) => {
    setEndDate(e.detail.value)
    setActiveQuickFilter('custom')
  }

  // 切换排序顺序
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  // 查看司机详情
  const handleViewDriverDetail = (driverId: string) => {
    navigateTo({
      url: `/pages/manager/piece-work-report-detail/index?driverId=${driverId}&startDate=${startDate}&endDate=${endDate}&warehouseIndex=${selectedWarehouseIndex}`
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

  // 计算司机汇总数据
  const driverSummaries = useMemo(() => {
    const summaryMap = new Map<string, DriverSummary>()

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

    // 按总金额排序
    summaries.sort((a, b) => {
      return sortOrder === 'desc' ? b.totalAmount - a.totalAmount : a.totalAmount - b.totalAmount
    })

    return summaries
  }, [records, drivers, sortOrder, getWarehouseName])

  // 计算统计数据
  const totalQuantity = records.reduce((sum, r) => sum + (r.quantity || 0), 0)
  const totalAmount = records.reduce((sum, r) => {
    const baseAmount = (r.quantity || 0) * (r.unit_price || 0)
    const upstairsAmount = r.need_upstairs ? (r.quantity || 0) * (r.upstairs_price || 0) : 0
    const sortingAmount = r.need_sorting ? (r.sorting_quantity || 0) * (r.sorting_unit_price || 0) : 0
    return sum + baseAmount + upstairsAmount + sortingAmount
  }, 0)
  const uniqueDrivers = new Set(records.map((r) => r.user_id)).size

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
            </View>
            <View className="bg-white rounded-lg p-3 shadow">
              <View className="flex items-center justify-between mb-1">
                <Text className="text-xs text-gray-600">总金额</Text>
                <View className="i-mdi-currency-cny text-lg text-orange-600" />
              </View>
              <Text className="text-2xl font-bold text-orange-600 block">¥{totalAmount.toFixed(2)}</Text>
            </View>
            <View className="bg-white rounded-lg p-3 shadow">
              <View className="flex items-center justify-between mb-1">
                <Text className="text-xs text-gray-600">司机数</Text>
                <View className="i-mdi-account-group text-lg text-blue-900" />
              </View>
              <Text className="text-2xl font-bold text-blue-900 block">{uniqueDrivers}</Text>
            </View>
          </View>

          {/* 筛选区域 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-base font-bold text-gray-800 block mb-3">筛选条件</Text>

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
                    activeQuickFilter === 'yesterday' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                  <Text className="text-xs">前一天</Text>
                </View>
                <View
                  onClick={handleWeekFilter}
                  className={`flex-1 text-center py-2 rounded-lg ${
                    activeQuickFilter === 'week' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                  <Text className="text-xs">本周</Text>
                </View>
                <View
                  onClick={handleMonthFilter}
                  className={`flex-1 text-center py-2 rounded-lg ${
                    activeQuickFilter === 'month' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                  <Text className="text-xs">本月</Text>
                </View>
              </View>
            </View>

            {/* 自定义日期范围 */}
            <View className="mb-3">
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

            {/* 排序 */}
            <View>
              <Text className="text-sm text-gray-700 block mb-2">排序</Text>
              <View onClick={toggleSortOrder} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <Text className="text-sm text-gray-800">{sortOrder === 'desc' ? '金额从高到低' : '金额从低到高'}</Text>
                <View
                  className={`i-mdi-sort-${sortOrder === 'desc' ? 'descending' : 'ascending'} text-xl text-blue-900`}
                />
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
                    {/* 司机信息头部 */}
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
                      <View className="bg-orange-500 px-3 py-1 rounded-full">
                        <Text className="text-sm text-white font-bold">¥{summary.totalAmount.toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* 统计信息 */}
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

                    {/* 关联仓库 */}
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

                    {/* 查看详情提示 */}
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

export default ManagerPieceWorkReport
