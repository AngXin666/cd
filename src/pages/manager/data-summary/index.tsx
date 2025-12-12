import {Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import * as PieceworkAPI from '@/db/api/piecework'
import * as UsersAPI from '@/db/api/users'
import * as WarehousesAPI from '@/db/api/warehouses'

import type {PieceWorkCategory, PieceWorkRecord, Profile, Warehouse} from '@/db/types'
import {getFirstDayOfMonthString, getLocalDateString, getMondayDateString, getYesterdayDateString} from '@/utils/date'
import {matchWithPinyin} from '@/utils/pinyin'

const DataSummary: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [_profile, setProfile] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])

  // 筛选条件
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [selectedDriverId, setSelectedDriverId] = useState<string>('') // 使用ID而不是索引
  const [driverSearchKeyword, setDriverSearchKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeQuickFilter, setActiveQuickFilter] = useState<'yesterday' | 'week' | 'month' | 'custom'>('month')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 初始化日期范围（默认当月）
  useEffect(() => {
    const firstDay = getFirstDayOfMonthString()
    const today = getLocalDateString()
    setStartDate(firstDay)
    setEndDate(today)
  }, [])

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user?.id) return

    // 加载当前用户信息
    const profileData = await UsersAPI.getCurrentUserProfile()
    setProfile(profileData)

    // 加载品类
    const categoriesData = await PieceworkAPI.getActiveCategories()
    setCategories(categoriesData)

    // 加载司机列表
    const driverList = await UsersAPI.getDriverProfiles()
    setDrivers(driverList)

    // 根据角色加载仓库
    if (profileData?.role === 'BOSS') {
      // 老板可以看到所有仓库
      const allWarehouses = await WarehousesAPI.getAllWarehouses()
      setWarehouses(allWarehouses)
    } else if (profileData?.role === 'MANAGER') {
      // 车队长只能看到管辖的仓库
      const managerWarehouses = await WarehousesAPI.getManagerWarehouses(user.id)
      setWarehouses(managerWarehouses)
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

    let data: PieceWorkRecord[] = []

    // 如果选择了"所有仓库"
    if (selectedWarehouseIndex === 0) {
      // 如果选择了"所有司机"
      if (!selectedDriverId) {
        // 获取所有管辖仓库的所有司机的计件记录
        const allRecords = await Promise.all(
          warehouses.map((w) => PieceworkAPI.getPieceWorkRecordsByWarehouse(w.id, startDate, endDate))
        )
        data = allRecords.flat()
      } else {
        // 获取指定司机的所有计件记录（不再根据仓库ID过滤）
        data = await PieceworkAPI.getPieceWorkRecordsByUser(selectedDriverId, startDate, endDate)
      }
    } else {
      // 选择了特定仓库
      const warehouse = warehouses[selectedWarehouseIndex - 1]
      if (warehouse) {
        if (!selectedDriverId) {
          // 获取该仓库所有司机的计件记录
          data = await PieceworkAPI.getPieceWorkRecordsByWarehouse(warehouse.id, startDate, endDate)
        } else {
          // 获取指定司机在该仓库的计件记录
          const allRecords = await PieceworkAPI.getPieceWorkRecordsByUser(selectedDriverId, startDate, endDate)
          data = allRecords.filter((r) => r.warehouse_id === warehouse.id)
        }
      }
    }

    // 按日期排序
    data.sort((a, b) => {
      const dateA = new Date(a.work_date).getTime()
      const dateB = new Date(b.work_date).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })

    setRecords(data)
  }, [startDate, endDate, warehouses, selectedWarehouseIndex, selectedDriverId, sortOrder])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useDidShow(() => {
    loadData()
    loadRecords() // 添加：页面显示时重新加载记录
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
    setActiveQuickFilter('yesterday')
  }

  // 快捷筛选：本周
  const handleWeekFilter = () => {
    const startDateStr = getMondayDateString()
    const endDateStr = getLocalDateString()

    setStartDate(startDateStr)
    setEndDate(endDateStr)
    setActiveQuickFilter('week')
  }

  // 快捷筛选：本月
  const handleMonthFilter = () => {
    const firstDay = getFirstDayOfMonthString()
    const today = getLocalDateString()

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

  // 计算统计数据
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0)
  const totalAmount = records.reduce((sum, r) => sum + Number(r.total_amount), 0)

  // 按品类统计
  const categoryStats = new Map<
    string,
    {
      name: string
      quantity: number
      amount: number
    }
  >()

  for (const record of records) {
    const category = categories.find((c) => c.id === record.category_id)
    const categoryName = category?.name || '未知品类'

    if (!categoryStats.has(record.category_id)) {
      categoryStats.set(record.category_id, {
        name: categoryName,
        quantity: 0,
        amount: 0
      })
    }

    const stat = categoryStats.get(record.category_id)!
    stat.quantity += record.quantity
    stat.amount += Number(record.total_amount)
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 获取仓库名称
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
  }

  // 获取司机名称
  const getDriverName = (userId: string) => {
    const driver = drivers.find((d) => d.id === userId)
    return driver?.name || driver?.phone || '未知司机'
  }

  // 获取品类名称
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || '未知品类'
  }

  // 仓库选择器选项
  const warehouseOptions = ['所有仓库', ...warehouses.map((w) => w.name)]

  // 司机选择器选项
  const driverOptions = ['所有司机', ...filteredDrivers.map((d) => d.name || d.phone || '未命名')]

  // 当搜索关键词变化时，重置司机选择
  useEffect(() => {
    setSelectedDriverId('')
  }, [])

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">计件报表</Text>
            <Text className="text-blue-100 text-sm block">查看计件数据报表和统计分析</Text>
          </View>

          {/* 筛选条件 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-filter text-blue-900 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">筛选条件</Text>
            </View>

            {/* 仓库选择 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-700 block mb-2">仓库</Text>
              <Picker
                mode="selector"
                range={warehouseOptions}
                value={selectedWarehouseIndex}
                onChange={(e) => setSelectedWarehouseIndex(Number(e.detail.value))}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-gray-800">{warehouseOptions[selectedWarehouseIndex]}</Text>
                  <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                </View>
              </Picker>
            </View>

            {/* 司机搜索和选择 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-700 block mb-2">司机搜索（支持拼音首字母）</Text>
              <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center mb-2">
                <View className="i-mdi-magnify text-gray-400 text-xl mr-2" />
                <Input
                  className="flex-1 text-gray-800"
                  placeholder="输入司机名字、拼音首字母或电话号码"
                  value={driverSearchKeyword}
                  onInput={(e) => {
                    setDriverSearchKeyword(e.detail.value)
                    // 搜索关键词变化时，重置选中的司机
                    setSelectedDriverId('')
                  }}
                />
                {driverSearchKeyword && (
                  <View
                    className="i-mdi-close-circle text-gray-400 text-xl"
                    onClick={() => {
                      setDriverSearchKeyword('')
                      setSelectedDriverId('')
                    }}
                  />
                )}
              </View>
              <Picker
                mode="selector"
                range={driverOptions}
                value={selectedDriverId ? filteredDrivers.findIndex((d) => d.id === selectedDriverId) + 1 : 0}
                onChange={(e) => {
                  if (!e || !e.detail) return
                  const index = Number(e.detail.value || 0)
                  if (index === 0) {
                    setSelectedDriverId('')
                  } else {
                    const driver = filteredDrivers[index - 1]
                    if (driver) {
                      setSelectedDriverId(driver.id)
                    }
                  }
                }}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-gray-800">
                    {selectedDriverId
                      ? drivers.find((d) => d.id === selectedDriverId)?.name ||
                        drivers.find((d) => d.id === selectedDriverId)?.phone ||
                        '未知'
                      : '所有司机'}
                  </Text>
                  <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                </View>
              </Picker>
              {driverSearchKeyword && filteredDrivers.length === 0 && (
                <Text className="text-xs text-orange-600 mt-1">未找到匹配的司机</Text>
              )}
            </View>

            {/* 日期范围 */}
            <View className="grid grid-cols-2 gap-3 mb-3">
              <View>
                <Text className="text-sm text-gray-700 block mb-2">开始日期</Text>
                <Picker mode="date" value={startDate} onChange={handleStartDateChange}>
                  <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                    <Text className="text-sm text-gray-800">{startDate}</Text>
                    <View className="i-mdi-calendar text-gray-400 text-lg" />
                  </View>
                </Picker>
              </View>
              <View>
                <Text className="text-sm text-gray-700 block mb-2">结束日期</Text>
                <Picker mode="date" value={endDate} onChange={handleEndDateChange}>
                  <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                    <Text className="text-sm text-gray-800">{endDate}</Text>
                    <View className="i-mdi-calendar text-gray-400 text-lg" />
                  </View>
                </Picker>
              </View>
            </View>

            {/* 快捷筛选按钮 */}
            <View className="flex gap-2">
              <View
                onClick={handleYesterdayFilter}
                className={`flex-1 rounded-lg px-3 py-2 text-center transition-all ${
                  activeQuickFilter === 'yesterday'
                    ? 'bg-gradient-to-r from-blue-900 to-blue-700 shadow-md'
                    : 'bg-gradient-to-r from-blue-50 to-blue-100'
                }`}>
                <Text
                  className={`text-sm font-medium ${
                    activeQuickFilter === 'yesterday' ? 'text-white' : 'text-blue-900'
                  }`}>
                  前一天
                </Text>
              </View>
              <View
                onClick={handleWeekFilter}
                className={`flex-1 rounded-lg px-3 py-2 text-center transition-all ${
                  activeQuickFilter === 'week'
                    ? 'bg-gradient-to-r from-green-700 to-green-600 shadow-md'
                    : 'bg-gradient-to-r from-green-50 to-green-100'
                }`}>
                <Text
                  className={`text-sm font-medium ${activeQuickFilter === 'week' ? 'text-white' : 'text-green-700'}`}>
                  本周
                </Text>
              </View>
              <View
                onClick={handleMonthFilter}
                className={`flex-1 rounded-lg px-3 py-2 text-center transition-all ${
                  activeQuickFilter === 'month'
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 shadow-md'
                    : 'bg-gradient-to-r from-orange-50 to-orange-100'
                }`}>
                <Text
                  className={`text-sm font-medium ${activeQuickFilter === 'month' ? 'text-white' : 'text-orange-600'}`}>
                  本月
                </Text>
              </View>
            </View>
          </View>

          {/* 统计卡片 */}
          <View className="grid grid-cols-2 gap-4 mb-4">
            <View className="bg-white rounded-lg p-4 shadow">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">总件数</Text>
                <View className="i-mdi-package-variant text-2xl text-blue-900" />
              </View>
              <Text className="text-3xl font-bold text-blue-900 block">{totalQuantity}</Text>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">总金额</Text>
                <View className="i-mdi-currency-cny text-2xl text-green-600" />
              </View>
              <Text className="text-3xl font-bold text-green-600 block">¥{totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* 品类统计 */}
          {categoryStats.size > 0 && (
            <View className="bg-white rounded-lg p-4 mb-4 shadow">
              <View className="flex items-center mb-3">
                <View className="i-mdi-chart-bar text-orange-600 text-xl mr-2" />
                <Text className="text-gray-800 text-base font-bold">品类统计</Text>
              </View>
              <View className="space-y-2">
                {Array.from(categoryStats.values()).map((stat, index) => (
                  <View key={index} className="bg-gray-50 rounded-lg p-3">
                    <View className="flex items-center justify-between mb-1">
                      <Text className="text-sm text-gray-800 font-medium">{stat.name}</Text>
                      <Text className="text-sm text-green-600 font-medium">¥{stat.amount.toFixed(2)}</Text>
                    </View>
                    <View className="flex items-center">
                      <View className="i-mdi-package-variant text-gray-400 text-sm mr-1" />
                      <Text className="text-xs text-gray-500">数量: {stat.quantity}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 计件记录列表 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-clipboard-list text-blue-900 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">计件记录</Text>
              <View className="ml-auto flex items-center gap-2">
                <Text className="text-xs text-gray-500">共 {records.length} 条</Text>
                <View onClick={toggleSortOrder} className="flex items-center bg-gray-100 rounded-lg px-2 py-1">
                  <View
                    className={`text-base mr-1 ${
                      sortOrder === 'asc' ? 'i-mdi-sort-calendar-ascending' : 'i-mdi-sort-calendar-descending'
                    } text-blue-900`}
                  />
                  <Text className="text-xs text-gray-700">{sortOrder === 'asc' ? '升序' : '降序'}</Text>
                </View>
              </View>
            </View>

            {records.length > 0 ? (
              <View className="space-y-2">
                {records.map((record) => (
                  <View key={record.id} className="bg-gray-50 rounded-lg p-4">
                    <View className="flex items-center justify-between mb-2">
                      <View className="flex items-center">
                        <View className="i-mdi-account-circle text-blue-600 text-lg mr-2" />
                        <Text className="text-sm text-gray-800 font-medium">{getDriverName(record.user_id)}</Text>
                      </View>
                      <Text className="text-xs text-gray-500">{formatDate(record.work_date)}</Text>
                    </View>

                    <View className="flex items-center mb-2">
                      <View className="i-mdi-warehouse text-orange-600 text-lg mr-2" />
                      <Text className="text-sm text-gray-700">{getWarehouseName(record.warehouse_id)}</Text>
                    </View>

                    <View className="flex items-center mb-2">
                      <View className="i-mdi-tag text-green-600 text-lg mr-2" />
                      <Text className="text-sm text-gray-700">{getCategoryName(record.category_id)}</Text>
                      {record.need_upstairs && (
                        <View className="ml-2 px-2 py-0.5 bg-orange-100 rounded">
                          <Text className="text-xs text-orange-600">需上楼</Text>
                        </View>
                      )}
                      {record.need_sorting && (
                        <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded">
                          <Text className="text-xs text-blue-600">需分拣</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex items-center justify-between mb-2">
                      <View className="flex items-center flex-wrap gap-2">
                        <Text className="text-xs text-gray-600">数量: {record.quantity}</Text>
                        <Text className="text-xs text-gray-600">单价: ¥{Number(record.unit_price).toFixed(2)}</Text>
                        {record.need_upstairs && (
                          <Text className="text-xs text-orange-600">
                            上楼: ¥{Number(record.upstairs_price).toFixed(2)}
                          </Text>
                        )}
                        {record.need_sorting && record.sorting_quantity > 0 && (
                          <Text className="text-xs text-blue-600">
                            分拣: {record.sorting_quantity}件×¥
                            {Number(record.sorting_unit_price).toFixed(2)}
                          </Text>
                        )}
                      </View>
                      <Text className="text-sm text-green-600 font-medium">
                        ¥{Number(record.total_amount).toFixed(2)}
                      </Text>
                    </View>

                    {record.notes && (
                      <View className="pt-2 border-t border-gray-200">
                        <Text className="text-xs text-gray-500">{record.notes}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View className="text-center py-8">
                <View className="i-mdi-package-variant-closed text-gray-300 text-5xl mb-2" />
                <Text className="text-gray-400 text-sm block">暂无计件记录</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default DataSummary
