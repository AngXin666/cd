import {Picker, ScrollView, Text, View} from '@tarojs/components'
import {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getActiveCategories, getDriverWarehouses, getPieceWorkRecordsByUser} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, Warehouse} from '@/db/types'

const DriverPieceWork: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [records, setRecords] = useState<PieceWorkRecord[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
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

    // 加载司机的仓库
    const driverWarehouses = await getDriverWarehouses(user.id)
    setWarehouses(driverWarehouses)

    // 加载品类
    const categoriesData = await getActiveCategories()
    setCategories(categoriesData)
  }, [user?.id])

  // 加载计件记录
  const loadRecords = useCallback(async () => {
    if (!user?.id || !startDate || !endDate) return

    const data = await getPieceWorkRecordsByUser(user.id, startDate, endDate)

    // 如果选择了仓库，进行筛选
    if (selectedWarehouseIndex > 0) {
      const selectedWarehouse = warehouses[selectedWarehouseIndex - 1]
      if (selectedWarehouse) {
        const filtered = data.filter((r) => r.warehouse_id === selectedWarehouse.id)
        setRecords(filtered)
        return
      }
    }

    setRecords(data)
  }, [user?.id, startDate, endDate, selectedWarehouseIndex, warehouses])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useDidShow(() => {
    loadData()
  })

  // 计算统计数据
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0)
  const totalAmount = records.reduce((sum, r) => sum + Number(r.total_amount), 0)

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

  // 获取品类名称
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || '未知品类'
  }

  // 仓库选择器选项（添加"全部仓库"选项）
  const warehouseOptions = ['全部仓库', ...warehouses.map((w) => w.name)]

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">我的计件</Text>
            <Text className="text-orange-100 text-sm block">查看计件工作记录和收入统计</Text>
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
                <Text className="text-sm text-gray-600">总收入</Text>
                <View className="i-mdi-currency-cny text-2xl text-green-600" />
              </View>
              <Text className="text-3xl font-bold text-green-600 block">¥{totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* 计件记录列表 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-clipboard-list text-orange-600 text-xl mr-2" />
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
                        <View className="i-mdi-warehouse text-blue-600 text-lg mr-2" />
                        <Text className="text-sm text-gray-800 font-medium">
                          {getWarehouseName(record.warehouse_id)}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500">{formatDate(record.work_date)}</Text>
                    </View>

                    <View className="flex items-center mb-2">
                      <View className="i-mdi-tag text-orange-600 text-lg mr-2" />
                      <Text className="text-sm text-gray-700">{getCategoryName(record.category_id)}</Text>
                      {record.need_upstairs && (
                        <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded">
                          <Text className="text-xs text-blue-600">需上楼</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex items-center justify-between pt-2 border-t border-gray-200">
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
                      <View className="mt-2 pt-2 border-t border-gray-200">
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

export default DriverPieceWork
