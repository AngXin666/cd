import {Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  deletePieceWorkRecord,
  getActiveCategories,
  getAllWarehouses,
  getCurrentUserProfile,
  getDriverProfiles,
  getManagerWarehouses,
  getPieceWorkRecordsByUser,
  getPieceWorkRecordsByWarehouse
} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, Profile, Warehouse} from '@/db/types'

const DataSummary: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [_profile, setProfile] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])

  // 筛选条件
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [selectedDriverIndex, setSelectedDriverIndex] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 初始化日期范围（默认当月）
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const firstDay = `${year}-${month}-01`
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
    const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    setStartDate(firstDay)
    setEndDate(lastDayStr)
  }, [])

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user?.id) return

    // 加载当前用户信息
    const profileData = await getCurrentUserProfile()
    setProfile(profileData)

    // 加载品类
    const categoriesData = await getActiveCategories()
    setCategories(categoriesData)

    // 加载司机列表
    const driverList = await getDriverProfiles()
    setDrivers(driverList)

    // 根据角色加载仓库
    if (profileData?.role === 'super_admin') {
      // 超级管理员可以看到所有仓库
      const allWarehouses = await getAllWarehouses()
      setWarehouses(allWarehouses)
    } else if (profileData?.role === 'manager') {
      // 普通管理员只能看到管辖的仓库
      const managerWarehouses = await getManagerWarehouses(user.id)
      setWarehouses(managerWarehouses)
    }
  }, [user?.id])

  // 加载计件记录
  const loadRecords = useCallback(async () => {
    if (!startDate || !endDate || warehouses.length === 0) return

    let data: PieceWorkRecord[] = []

    // 如果选择了"所有仓库"
    if (selectedWarehouseIndex === 0) {
      // 如果选择了"所有司机"
      if (selectedDriverIndex === 0) {
        // 获取所有管辖仓库的所有司机的计件记录
        const allRecords = await Promise.all(
          warehouses.map((w) => getPieceWorkRecordsByWarehouse(w.id, startDate, endDate))
        )
        data = allRecords.flat()
      } else {
        // 获取指定司机在所有管辖仓库的计件记录
        const driver = drivers[selectedDriverIndex - 1]
        if (driver) {
          data = await getPieceWorkRecordsByUser(driver.id, startDate, endDate)
          // 筛选出管辖仓库的记录
          const warehouseIds = warehouses.map((w) => w.id)
          data = data.filter((r) => warehouseIds.includes(r.warehouse_id))
        }
      }
    } else {
      // 选择了特定仓库
      const warehouse = warehouses[selectedWarehouseIndex - 1]
      if (warehouse) {
        if (selectedDriverIndex === 0) {
          // 获取该仓库所有司机的计件记录
          data = await getPieceWorkRecordsByWarehouse(warehouse.id, startDate, endDate)
        } else {
          // 获取指定司机在该仓库的计件记录
          const driver = drivers[selectedDriverIndex - 1]
          if (driver) {
            const allRecords = await getPieceWorkRecordsByUser(driver.id, startDate, endDate)
            data = allRecords.filter((r) => r.warehouse_id === warehouse.id)
          }
        }
      }
    }

    setRecords(data)
  }, [startDate, endDate, warehouses, drivers, selectedWarehouseIndex, selectedDriverIndex])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useDidShow(() => {
    loadData()
  })

  // 删除记录
  const handleDelete = async (id: string) => {
    const result = await Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条计件记录吗？',
      confirmText: '删除',
      confirmColor: '#EF4444'
    })

    if (result.confirm) {
      const success = await deletePieceWorkRecord(id)

      if (success) {
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        })
        loadRecords()
      } else {
        Taro.showToast({
          title: '删除失败',
          icon: 'error'
        })
      }
    }
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
  const driverOptions = ['所有司机', ...drivers.map((d) => d.name || d.phone || '未命名')]

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">数据汇总</Text>
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

            {/* 司机选择 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-700 block mb-2">司机</Text>
              <Picker
                mode="selector"
                range={driverOptions}
                value={selectedDriverIndex}
                onChange={(e) => setSelectedDriverIndex(Number(e.detail.value))}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-gray-800">{driverOptions[selectedDriverIndex]}</Text>
                  <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                </View>
              </Picker>
            </View>

            {/* 日期范围 */}
            <View className="grid grid-cols-2 gap-3">
              <View>
                <Text className="text-sm text-gray-700 block mb-2">开始日期</Text>
                <Picker mode="date" value={startDate} onChange={(e) => setStartDate(e.detail.value)}>
                  <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                    <Text className="text-sm text-gray-800">{startDate}</Text>
                    <View className="i-mdi-calendar text-gray-400 text-lg" />
                  </View>
                </Picker>
              </View>
              <View>
                <Text className="text-sm text-gray-700 block mb-2">结束日期</Text>
                <Picker mode="date" value={endDate} onChange={(e) => setEndDate(e.detail.value)}>
                  <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                    <Text className="text-sm text-gray-800">{endDate}</Text>
                    <View className="i-mdi-calendar text-gray-400 text-lg" />
                  </View>
                </Picker>
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
              <View className="ml-auto">
                <Text className="text-xs text-gray-500">共 {records.length} 条</Text>
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
                        <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded">
                          <Text className="text-xs text-blue-600">需上楼</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex items-center justify-between mb-2">
                      <View className="flex items-center">
                        <Text className="text-xs text-gray-600 mr-3">数量: {record.quantity}</Text>
                        <Text className="text-xs text-gray-600 mr-3">
                          单价: ¥{Number(record.unit_price).toFixed(2)}
                        </Text>
                        {record.need_upstairs && (
                          <Text className="text-xs text-gray-600">
                            上楼: ¥{Number(record.upstairs_price).toFixed(2)}
                          </Text>
                        )}
                      </View>
                      <Text className="text-sm text-green-600 font-medium">
                        ¥{Number(record.total_amount).toFixed(2)}
                      </Text>
                    </View>

                    {record.notes && (
                      <View className="mb-2 pt-2 border-t border-gray-200">
                        <Text className="text-xs text-gray-500">{record.notes}</Text>
                      </View>
                    )}

                    <View className="flex items-center justify-end pt-2 border-t border-gray-200">
                      <View
                        className="flex items-center bg-red-50 px-3 py-1 rounded"
                        onClick={() => handleDelete(record.id)}>
                        <View className="i-mdi-delete text-red-600 text-sm mr-1" />
                        <Text className="text-xs text-red-600">删除</Text>
                      </View>
                    </View>
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
