import {Button, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getAllAttendanceRecords, getAllPieceWorkRecords, getAllWarehouses, getDriversByWarehouse} from '@/db/api'
import type {AttendanceRecord, PieceWorkRecord, Profile, Warehouse} from '@/db/types'

const DataReport: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [pieceWorkRecords, setPieceWorkRecords] = useState<PieceWorkRecord[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    const warehousesData = await getAllWarehouses()
    setWarehouses(warehousesData)
    if (warehousesData.length > 0) {
      setSelectedWarehouse(warehousesData[0])
    }
  }, [])

  // 加载数据
  const loadData = useCallback(async () => {
    if (!selectedWarehouse) return

    // 获取该仓库的司机
    const driversData = await getDriversByWarehouse(selectedWarehouse.id)
    setDrivers(driversData)

    // 获取所有计件记录
    const allPieceWorkRecords = await getAllPieceWorkRecords()
    // 筛选该仓库的计件记录
    const warehousePieceWorkRecords = allPieceWorkRecords.filter(
      (record) => record.warehouse_id === selectedWarehouse.id
    )
    setPieceWorkRecords(warehousePieceWorkRecords)

    // 获取所有考勤记录
    const allAttendanceRecords = await getAllAttendanceRecords()
    // 筛选该仓库的考勤记录
    const warehouseAttendanceRecords = allAttendanceRecords.filter(
      (record) => record.warehouse_id === selectedWarehouse.id
    )
    setAttendanceRecords(warehouseAttendanceRecords)
  }, [selectedWarehouse])

  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  // 处理仓库选择
  const handleWarehouseChange = (e: any) => {
    const index = e.detail.value
    setSelectedWarehouseIndex(index)
    setSelectedWarehouse(warehouses[index])
  }

  // 计算统计数据
  const totalPieceWorkAmount = pieceWorkRecords.reduce((sum, record) => sum + record.total_amount, 0)
  const totalPieceWorkQuantity = pieceWorkRecords.reduce((sum, record) => sum + record.quantity, 0)
  const totalAttendanceDays = attendanceRecords.filter((record) => record.status === 'normal').length
  const totalAbsenceDays = attendanceRecords.filter((record) => record.status === 'absent').length
  const totalLateDays = attendanceRecords.filter((record) => record.status === 'late').length

  // 按司机统计
  const driverStats = drivers.map((driver) => {
    const driverPieceWorkRecords = pieceWorkRecords.filter((record) => record.user_id === driver.id)
    const driverAttendanceRecords = attendanceRecords.filter((record) => record.user_id === driver.id)

    const pieceWorkAmount = driverPieceWorkRecords.reduce((sum, record) => sum + record.total_amount, 0)
    const pieceWorkQuantity = driverPieceWorkRecords.reduce((sum, record) => sum + record.quantity, 0)
    const normalDays = driverAttendanceRecords.filter((record) => record.status === 'normal').length
    const absentDays = driverAttendanceRecords.filter((record) => record.status === 'absent').length
    const lateDays = driverAttendanceRecords.filter((record) => record.status === 'late').length

    return {
      driver,
      pieceWorkAmount,
      pieceWorkQuantity,
      normalDays,
      absentDays,
      lateDays,
      totalSalary: pieceWorkAmount // 工资 = 计件金额
    }
  })

  // 导出数据
  const handleExport = () => {
    Taro.showToast({
      title: '导出功能开发中',
      icon: 'none'
    })
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">数据报表</Text>
            <Text className="text-blue-100 text-sm block">查看所有司机的计件、考勤和工资数据</Text>
          </View>

          {/* 仓库选择器 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-base font-semibold text-gray-800 block mb-3">选择仓库</Text>
            <Picker
              mode="selector"
              range={warehouses.map((w) => w.name)}
              value={selectedWarehouseIndex}
              onChange={handleWarehouseChange}>
              <View className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <Text className="text-gray-800">{selectedWarehouse?.name || '请选择仓库'}</Text>
                <View className="i-mdi-chevron-down text-xl text-gray-600" />
              </View>
            </Picker>
          </View>

          {/* 总体统计 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-4">总体统计</Text>
            <View className="grid grid-cols-2 gap-4">
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">司机总数</Text>
                  <View className="i-mdi-account-group text-2xl text-blue-900" />
                </View>
                <Text className="text-3xl font-bold text-blue-900 block">{drivers.length}</Text>
              </View>
              <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">计件总金额</Text>
                  <View className="i-mdi-currency-cny text-2xl text-orange-600" />
                </View>
                <Text className="text-3xl font-bold text-orange-600 block">¥{totalPieceWorkAmount.toFixed(2)}</Text>
              </View>
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">计件总数量</Text>
                  <View className="i-mdi-package-variant text-2xl text-blue-900" />
                </View>
                <Text className="text-3xl font-bold text-blue-900 block">{totalPieceWorkQuantity}</Text>
              </View>
              <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">正常出勤</Text>
                  <View className="i-mdi-calendar-check text-2xl text-orange-600" />
                </View>
                <Text className="text-3xl font-bold text-orange-600 block">{totalAttendanceDays}</Text>
              </View>
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">缺勤天数</Text>
                  <View className="i-mdi-calendar-remove text-2xl text-blue-900" />
                </View>
                <Text className="text-3xl font-bold text-blue-900 block">{totalAbsenceDays}</Text>
              </View>
              <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">迟到天数</Text>
                  <View className="i-mdi-calendar-clock text-2xl text-orange-600" />
                </View>
                <Text className="text-3xl font-bold text-orange-600 block">{totalLateDays}</Text>
              </View>
            </View>
          </View>

          {/* 按司机统计 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-800">按司机统计</Text>
              <Button
                className="text-xs break-keep"
                size="mini"
                style={{
                  backgroundColor: '#F97316',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none'
                }}
                onClick={handleExport}>
                <View className="flex items-center">
                  <View className="i-mdi-download mr-1" />
                  <Text>导出</Text>
                </View>
              </Button>
            </View>

            {driverStats.length === 0 ? (
              <View className="text-center py-8">
                <View className="i-mdi-account-off text-5xl text-gray-300 mb-2 mx-auto" />
                <Text className="text-gray-400 block">该仓库暂无司机</Text>
              </View>
            ) : (
              <View>
                {driverStats.map((stat, index) => (
                  <View
                    key={stat.driver.id}
                    className={`p-4 rounded-lg mb-3 ${index % 2 === 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    <View className="flex items-center justify-between mb-3">
                      <View className="flex items-center">
                        <View
                          className={`i-mdi-account-circle text-3xl ${index % 2 === 0 ? 'text-blue-900' : 'text-orange-600'} mr-2`}
                        />
                        <View>
                          <Text className="text-base font-semibold text-gray-800 block">
                            {stat.driver.name || stat.driver.phone}
                          </Text>
                          <Text className="text-xs text-gray-500 block">{stat.driver.phone}</Text>
                        </View>
                      </View>
                      <View className="text-right">
                        <Text className="text-xs text-gray-600 block">工资总额</Text>
                        <Text
                          className={`text-xl font-bold ${index % 2 === 0 ? 'text-blue-900' : 'text-orange-600'} block`}>
                          ¥{stat.totalSalary.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View className="grid grid-cols-3 gap-2">
                      <View className="bg-white rounded p-2">
                        <Text className="text-xs text-gray-600 block mb-1">计件金额</Text>
                        <Text className="text-sm font-semibold text-gray-800 block">
                          ¥{stat.pieceWorkAmount.toFixed(2)}
                        </Text>
                      </View>
                      <View className="bg-white rounded p-2">
                        <Text className="text-xs text-gray-600 block mb-1">计件数量</Text>
                        <Text className="text-sm font-semibold text-gray-800 block">{stat.pieceWorkQuantity}</Text>
                      </View>
                      <View className="bg-white rounded p-2">
                        <Text className="text-xs text-gray-600 block mb-1">正常出勤</Text>
                        <Text className="text-sm font-semibold text-gray-800 block">{stat.normalDays}</Text>
                      </View>
                      <View className="bg-white rounded p-2">
                        <Text className="text-xs text-gray-600 block mb-1">缺勤天数</Text>
                        <Text className="text-sm font-semibold text-gray-800 block">{stat.absentDays}</Text>
                      </View>
                      <View className="bg-white rounded p-2">
                        <Text className="text-xs text-gray-600 block mb-1">迟到天数</Text>
                        <Text className="text-sm font-semibold text-gray-800 block">{stat.lateDays}</Text>
                      </View>
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

export default DataReport
