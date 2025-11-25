import {Picker, ScrollView, Text, View} from '@tarojs/components'
import {navigateBack, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getAllWarehouses, getPieceWorkRecordsByWarehouse} from '@/db/api'
import type {PieceWorkRecord, Warehouse} from '@/db/types'

/**
 * 件数报表页面（电脑端）
 */
const PieceWorkReport: React.FC = () => {
  useAuth({guard: true})
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [reportData, setReportData] = useState<PieceWorkRecord[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')

  // 生成月份选项（最近12个月）
  const generateMonthOptions = () => {
    const months: string[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      months.push(`${year}-${month}`)
    }
    return months
  }

  const monthOptions = generateMonthOptions()

  // 加载数据
  const loadData = useCallback(async () => {
    const warehouseList = await getAllWarehouses()
    setWarehouses(warehouseList)

    // 设置默认月份为当前月
    if (!selectedMonth) {
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      setSelectedMonth(currentMonth)
    }

    // 加载报表数据
    if (warehouseList.length > 0 && selectedMonth) {
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate()
      const endDate = `${year}-${month}-${lastDay}`
      const data = await getPieceWorkRecordsByWarehouse(warehouseList[selectedWarehouseIndex]?.id, startDate, endDate)
      setReportData(data)
    }
  }, [selectedWarehouseIndex, selectedMonth])

  useDidShow(() => {
    loadData()
  })

  // 切换仓库
  const handleWarehouseChange = (e: any) => {
    setSelectedWarehouseIndex(e.detail.value)
  }

  // 切换月份
  const handleMonthChange = (e: any) => {
    const month = monthOptions[e.detail.value]
    setSelectedMonth(month)
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <View className="bg-white shadow-sm border-b border-gray-200">
        <View className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <View className="flex items-center justify-between">
            <View className="flex items-center">
              <View
                onClick={() => navigateBack()}
                className="i-mdi-arrow-left text-2xl text-gray-600 mr-3 cursor-pointer hover:text-primary"
              />
              <Text className="text-xl font-bold text-gray-800">件数报表</Text>
            </View>
          </View>

          {/* 筛选条件 */}
          <View className="mt-4 flex flex-col md:flex-row gap-4">
            {/* 仓库选择 */}
            <View className="flex-1">
              <Text className="text-sm text-gray-600 mb-2">选择仓库</Text>
              <Picker
                mode="selector"
                range={warehouses.map((w) => w.name)}
                value={selectedWarehouseIndex}
                onChange={handleWarehouseChange}>
                <View className="border border-gray-300 rounded px-4 py-2 bg-white">
                  <Text className="text-sm">{warehouses[selectedWarehouseIndex]?.name || '请选择仓库'}</Text>
                </View>
              </Picker>
            </View>

            {/* 月份选择 */}
            <View className="flex-1">
              <Text className="text-sm text-gray-600 mb-2">选择月份</Text>
              <Picker
                mode="selector"
                range={monthOptions}
                value={monthOptions.indexOf(selectedMonth)}
                onChange={handleMonthChange}>
                <View className="border border-gray-300 rounded px-4 py-2 bg-white">
                  <Text className="text-sm">{selectedMonth || '请选择月份'}</Text>
                </View>
              </Picker>
            </View>
          </View>
        </View>
      </View>

      {/* 主内容区域 */}
      <ScrollView scrollY className="h-screen box-border">
        <View className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          {/* 统计卡片 */}
          <View className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <View className="bg-white rounded-lg shadow-md p-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">总件数</Text>
                <View className="i-mdi-package-variant text-xl text-blue-600" />
              </View>
              <Text className="text-2xl font-bold text-blue-600">
                {reportData.reduce((sum, item) => sum + (item.quantity || 0), 0)}
              </Text>
            </View>

            <View className="bg-white rounded-lg shadow-md p-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">总金额</Text>
                <View className="i-mdi-currency-cny text-xl text-green-600" />
              </View>
              <Text className="text-2xl font-bold text-green-600">
                ¥{reportData.reduce((sum, item) => sum + (item.total_amount || 0), 0).toFixed(2)}
              </Text>
            </View>

            <View className="bg-white rounded-lg shadow-md p-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">参与人数</Text>
                <View className="i-mdi-account-group text-xl text-orange-600" />
              </View>
              <Text className="text-2xl font-bold text-orange-600">{reportData.length}</Text>
            </View>

            <View className="bg-white rounded-lg shadow-md p-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">平均件数</Text>
                <View className="i-mdi-chart-line text-xl text-purple-600" />
              </View>
              <Text className="text-2xl font-bold text-purple-600">
                {reportData.length > 0
                  ? Math.round(reportData.reduce((sum, item) => sum + (item.quantity || 0), 0) / reportData.length)
                  : 0}
              </Text>
            </View>
          </View>

          {/* 报表数据表格 */}
          <View className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* 表格头部 */}
            <View className="hidden md:grid md:grid-cols-12 gap-4 bg-gray-50 px-6 py-3 border-b border-gray-200">
              <Text className="col-span-2 text-sm font-semibold text-gray-700">日期</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">司机ID</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">件数</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">单价</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">金额</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">备注</Text>
            </View>

            {/* 表格内容 */}
            {reportData.length === 0 ? (
              <View className="py-12 text-center">
                <View className="i-mdi-chart-box-outline text-6xl text-gray-300 mb-4" />
                <Text className="text-gray-500">暂无报表数据</Text>
              </View>
            ) : (
              reportData.map((item, index) => (
                <View
                  key={index}
                  className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                  {/* 电脑端表格行 */}
                  <View className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
                    <Text className="col-span-2 text-sm text-gray-800">{item.work_date}</Text>
                    <Text className="col-span-2 text-sm text-gray-600">{item.user_id.substring(0, 8)}...</Text>
                    <Text className="col-span-2 text-sm text-gray-800 font-semibold">{item.quantity || 0}</Text>
                    <Text className="col-span-2 text-sm text-gray-600">¥{(item.unit_price || 0).toFixed(2)}</Text>
                    <Text className="col-span-2 text-sm text-green-600 font-semibold">
                      ¥{(item.total_amount || 0).toFixed(2)}
                    </Text>
                    <Text className="col-span-2 text-sm text-gray-500">{item.notes || '-'}</Text>
                  </View>

                  {/* 移动端卡片 */}
                  <View className="md:hidden p-4">
                    <View className="flex items-center justify-between mb-2">
                      <Text className="text-base font-bold text-gray-800">{item.work_date}</Text>
                      <Text className="text-sm text-green-600 font-semibold">
                        ¥{(item.total_amount || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View className="grid grid-cols-2 gap-2">
                      <View>
                        <Text className="text-xs text-gray-500">件数</Text>
                        <Text className="text-base font-semibold text-gray-800">{item.quantity || 0}</Text>
                      </View>
                      <View>
                        <Text className="text-xs text-gray-500">单价</Text>
                        <Text className="text-base font-semibold text-gray-600">
                          ¥{(item.unit_price || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View className="col-span-2">
                        <Text className="text-xs text-gray-500">备注</Text>
                        <Text className="text-sm text-gray-600">{item.notes || '-'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default PieceWorkReport
