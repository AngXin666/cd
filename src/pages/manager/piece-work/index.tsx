import {Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  deletePieceWorkRecord,
  getActiveCategories,
  getCurrentUserProfile,
  getDriverProfiles,
  getManagerWarehouses,
  getPieceWorkRecordsByWarehouse
} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, Profile, Warehouse} from '@/db/types'
import {getFirstDayOfMonthString, getLocalDateString, getMondayDateString, getYesterdayDateString} from '@/utils/date'
import {matchWithPinyin} from '@/utils/pinyin'

const ManagerPieceWork: React.FC = () => {
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

  // 详情弹窗
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<PieceWorkRecord | null>(null)

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

  // 页面显示时刷新数据（从其他页面返回时也会触发）
  useDidShow(() => {
    loadData()
    loadRecords() // 修复：添加计件记录刷新，确保数据实时更新
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

  // 添加记录
  const handleAddRecord = () => {
    if (warehouses.length === 0) {
      Taro.showToast({
        title: '您没有管辖的仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 跳转到添加页面，传递仓库信息
    const warehouseId = selectedWarehouseIndex > 0 ? warehouses[selectedWarehouseIndex - 1].id : warehouses[0].id
    navigateTo({
      url: `/pages/manager/piece-work-form/index?warehouseId=${warehouseId}&mode=add`
    })
  }

  // 删除记录
  const handleDeleteRecord = async (record: PieceWorkRecord) => {
    const result = await Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条计件记录吗？此操作不可恢复。'
    })

    if (result.confirm) {
      try {
        await deletePieceWorkRecord(record.id)
        Taro.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 2000
        })
        loadRecords()
      } catch (error) {
        console.error('删除记录失败:', error)
        Taro.showToast({
          title: '删除失败',
          icon: 'error',
          duration: 2000
        })
      }
    }
  }

  // 查看详情
  const handleViewDetail = (record: PieceWorkRecord) => {
    setSelectedRecord(record)
    setShowDetailModal(true)
  }

  // 关闭详情弹窗
  const handleCloseDetail = () => {
    setShowDetailModal(false)
    setSelectedRecord(null)
  }

  // 获取仓库名称
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
  }

  // 获取品类名称
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.category_name || '未知品类'
  }

  // 获取司机名称
  const getDriverName = (userId: string) => {
    const driver = drivers.find((d) => d.id === userId)
    return driver?.name || driver?.phone || '未知司机'
  }

  // 格式化日期时间
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  // 计算统计数据
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0)
  const totalAmount = records.reduce((sum, r) => sum + Number(r.total_amount), 0)

  // 仓库选项
  const warehouseOptions = ['所有仓库', ...warehouses.map((w) => w.name)]

  // 司机选项
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
            <Text className="text-white text-2xl font-bold block mb-2">计件管理</Text>
            <Text className="text-blue-100 text-sm block">管理和查看计件记录</Text>
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
                <View className="i-mdi-currency-cny text-2xl text-orange-600" />
              </View>
              <Text className="text-3xl font-bold text-orange-600 block">¥{totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* 添加按钮 */}
          <View className="mb-4">
            <View
              onClick={handleAddRecord}
              className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-4 shadow-lg flex items-center justify-center">
              <View className="i-mdi-plus-circle text-white text-2xl mr-2" />
              <Text className="text-white text-base font-bold">添加计件记录</Text>
            </View>
          </View>

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
                  <View
                    key={record.id}
                    onClick={() => handleViewDetail(record)}
                    className="bg-gray-50 rounded-lg p-3 mb-2">
                    {/* 记录头部 */}
                    <View className="flex items-center justify-between mb-2">
                      <View className="flex items-center flex-1">
                        <View className="i-mdi-account-circle text-2xl text-blue-900 mr-2" />
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-800 block">
                            {getDriverName(record.user_id)}
                          </Text>
                          <Text className="text-xs text-gray-500 block">{record.work_date}</Text>
                        </View>
                      </View>
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRecord(record)
                        }}
                        className="bg-red-100 rounded-lg px-2 py-1">
                        <View className="i-mdi-delete text-red-600 text-base" />
                      </View>
                    </View>

                    {/* 记录详情 */}
                    <View className="space-y-1">
                      <View className="flex items-center">
                        <View className="i-mdi-warehouse text-gray-500 text-sm mr-1" />
                        <Text className="text-xs text-gray-600">{getWarehouseName(record.warehouse_id)}</Text>
                      </View>
                      <View className="flex items-center">
                        <View className="i-mdi-tag text-gray-500 text-sm mr-1" />
                        <Text className="text-xs text-gray-600">{getCategoryName(record.category_id)}</Text>
                        {record.need_upstairs && (
                          <View className="ml-2 bg-orange-100 px-2 py-0.5 rounded">
                            <Text className="text-xs text-orange-600">需上楼</Text>
                          </View>
                        )}
                        {record.need_sorting && (
                          <View className="ml-2 bg-green-100 px-2 py-0.5 rounded">
                            <Text className="text-xs text-green-600">需分拣</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* 费用信息 */}
                    <View className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <View className="flex items-center gap-3">
                        <View className="flex items-center">
                          <Text className="text-xs text-gray-600">数量: </Text>
                          <Text className="text-sm font-medium text-gray-800">{record.quantity}</Text>
                        </View>
                        <View className="flex items-center">
                          <Text className="text-xs text-gray-600">单价: </Text>
                          <Text className="text-sm font-medium text-gray-800">
                            ¥{Number(record.unit_price).toFixed(2)}
                          </Text>
                        </View>
                        {record.need_upstairs && (
                          <View className="flex items-center">
                            <Text className="text-xs text-gray-600">上楼: </Text>
                            <Text className="text-sm font-medium text-orange-600">
                              ¥{Number(record.upstairs_price).toFixed(2)}
                            </Text>
                          </View>
                        )}
                        {record.need_sorting && record.sorting_quantity > 0 && (
                          <View className="flex items-center">
                            <Text className="text-xs text-gray-600">分拣: </Text>
                            <Text className="text-sm font-medium text-green-600">
                              ¥{(record.sorting_quantity * Number(record.sorting_unit_price)).toFixed(2)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View className="flex items-center">
                        <Text className="text-sm font-bold text-blue-900">
                          ¥{Number(record.total_amount).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    {record.notes && (
                      <View className="mt-2 pt-2 border-t border-gray-200">
                        <Text className="text-xs text-gray-500">备注: {record.notes}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View className="text-center py-8">
                <View className="i-mdi-package-variant-closed text-5xl text-gray-300 mx-auto mb-2" />
                <Text className="text-gray-400 text-sm block">暂无计件记录</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 详情弹窗 */}
      {showDetailModal && selectedRecord && (
        <View
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseDetail}>
          <View className="bg-white rounded-lg p-6 m-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* 弹窗标题 */}
            <View className="flex items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-800">计件记录详情</Text>
              <View onClick={handleCloseDetail} className="i-mdi-close text-2xl text-gray-500" />
            </View>

            {/* 详情内容 */}
            <View className="space-y-3">
              {/* 司机信息 */}
              <View className="bg-blue-50 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">司机</Text>
                <Text className="text-base font-medium text-gray-800">{getDriverName(selectedRecord.user_id)}</Text>
              </View>

              {/* 工作日期 */}
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">工作日期</Text>
                <Text className="text-base font-medium text-gray-800">{selectedRecord.work_date}</Text>
              </View>

              {/* 仓库 */}
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">仓库</Text>
                <Text className="text-base font-medium text-gray-800">
                  {getWarehouseName(selectedRecord.warehouse_id)}
                </Text>
              </View>

              {/* 品类 */}
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">品类</Text>
                <View className="flex items-center">
                  <Text className="text-base font-medium text-gray-800">
                    {getCategoryName(selectedRecord.category_id)}
                  </Text>
                  {selectedRecord.need_upstairs && (
                    <View className="ml-2 bg-orange-100 px-2 py-1 rounded">
                      <Text className="text-xs text-orange-600">需上楼</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 费用明细 */}
              <View className="bg-blue-50 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-2">费用明细</Text>
                <View className="space-y-2">
                  <View className="flex items-center justify-between">
                    <Text className="text-sm text-gray-700">数量</Text>
                    <Text className="text-sm font-medium text-gray-800">{selectedRecord.quantity} 件</Text>
                  </View>
                  <View className="flex items-center justify-between">
                    <Text className="text-sm text-gray-700">单价</Text>
                    <Text className="text-sm font-medium text-gray-800">
                      ¥{Number(selectedRecord.unit_price).toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex items-center justify-between">
                    <Text className="text-sm text-gray-700">基础费用</Text>
                    <Text className="text-sm font-medium text-gray-800">
                      ¥{(selectedRecord.quantity * Number(selectedRecord.unit_price)).toFixed(2)}
                    </Text>
                  </View>
                  {selectedRecord.need_upstairs && (
                    <View className="flex items-center justify-between">
                      <Text className="text-sm text-gray-700">上楼费</Text>
                      <Text className="text-sm font-medium text-orange-600">
                        ¥{Number(selectedRecord.upstairs_price).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {selectedRecord.need_sorting && selectedRecord.sorting_quantity > 0 && (
                    <View className="flex items-center justify-between">
                      <Text className="text-sm text-gray-700">分拣费</Text>
                      <Text className="text-sm font-medium text-green-600">
                        ¥{(selectedRecord.sorting_quantity * Number(selectedRecord.sorting_unit_price)).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View className="border-t border-blue-200 pt-2 mt-2">
                    <View className="flex items-center justify-between">
                      <Text className="text-base font-bold text-gray-800">总金额</Text>
                      <Text className="text-lg font-bold text-blue-900">
                        ¥{Number(selectedRecord.total_amount).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 备注 */}
              {selectedRecord.notes && (
                <View className="bg-gray-50 rounded-lg p-3">
                  <Text className="text-xs text-gray-600 block mb-1">备注</Text>
                  <Text className="text-sm text-gray-800">{selectedRecord.notes}</Text>
                </View>
              )}

              {/* 创建时间 */}
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">创建时间</Text>
                <Text className="text-sm text-gray-800">{formatDateTime(selectedRecord.created_at)}</Text>
              </View>
            </View>

            {/* 关闭按钮 */}
            <View className="mt-4">
              <View onClick={handleCloseDetail} className="bg-gray-200 rounded-lg p-3 text-center">
                <Text className="text-gray-800 font-medium">关闭</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default ManagerPieceWork
