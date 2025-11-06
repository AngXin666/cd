import {Picker, ScrollView, Text, View} from '@tarojs/components'
import {getCurrentInstance, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  calculatePieceWorkStats,
  getActiveCategories,
  getAttendanceRecordsByUserAndWarehouse,
  getPieceWorkRecordsByUserAndWarehouse,
  getWarehouseById
} from '@/db/api'
import type {AttendanceRecord, PieceWorkCategory, PieceWorkRecord, PieceWorkStats, Warehouse} from '@/db/types'
import {getDaysAgoDateString, getFirstDayOfMonthString, getLocalDateString} from '@/utils/date'

const WarehouseStats: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [pieceWorkRecords, setPieceWorkRecords] = useState<PieceWorkRecord[]>([])
  const [pieceWorkStats, setPieceWorkStats] = useState<PieceWorkStats | null>(null)
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month')

  // 获取URL参数
  const instance = getCurrentInstance()
  const warehouseId = instance.router?.params?.warehouseId || ''

  // 计算日期范围
  const getDateRange = useCallback(() => {
    let startDate = ''

    if (dateRange === 'week') {
      startDate = getDaysAgoDateString(7)
    } else if (dateRange === 'month') {
      startDate = getFirstDayOfMonthString()
    }

    const endDate = getLocalDateString()
    return {startDate, endDate}
  }, [dateRange])

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user?.id || !warehouseId) return

    // 加载仓库信息
    const warehouseData = await getWarehouseById(warehouseId)
    setWarehouse(warehouseData)

    // 加载品类数据
    const categoriesData = await getActiveCategories()
    setCategories(categoriesData)

    const {startDate, endDate} = getDateRange()

    // 加载考勤记录
    const attendanceData = await getAttendanceRecordsByUserAndWarehouse(user.id, warehouseId, startDate, endDate)
    setAttendanceRecords(attendanceData)

    // 加载计件记录
    const pieceWorkData = await getPieceWorkRecordsByUserAndWarehouse(user.id, warehouseId, startDate, endDate)
    setPieceWorkRecords(pieceWorkData)

    // 计算计件统计
    const stats = await calculatePieceWorkStats(user.id, warehouseId, startDate, endDate)
    setPieceWorkStats(stats)
  }, [user?.id, warehouseId, getDateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  // 格式化工时
  const formatWorkHours = (hours: number | null) => {
    if (!hours) return '0小时'
    return `${hours.toFixed(1)}小时`
  }

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'normal':
        return {text: '正常', color: 'text-green-600', bgColor: 'bg-green-50'}
      case 'late':
        return {text: '迟到', color: 'text-orange-600', bgColor: 'bg-orange-50'}
      case 'early':
        return {text: '早退', color: 'text-red-600', bgColor: 'bg-red-50'}
      case 'absent':
        return {text: '缺勤', color: 'text-gray-600', bgColor: 'bg-gray-50'}
      default:
        return {text: '未知', color: 'text-gray-600', bgColor: 'bg-gray-50'}
    }
  }

  // 计算考勤统计
  const attendanceStats = {
    total: attendanceRecords.length,
    normal: attendanceRecords.filter((r) => r.status === 'normal').length,
    late: attendanceRecords.filter((r) => r.status === 'late').length,
    early: attendanceRecords.filter((r) => r.status === 'early').length,
    totalHours: attendanceRecords.reduce((sum, r) => sum + (Number(r.work_hours) || 0), 0)
  }

  // 日期范围选择器
  const dateRangeOptions = [
    {label: '最近一周', value: 'week'},
    {label: '本月', value: 'month'},
    {label: '全部', value: 'all'}
  ]

  const handleDateRangeChange = (e: any) => {
    const index = e.detail.value
    setDateRange(dateRangeOptions[index].value as 'week' | 'month' | 'all')
  }

  const currentRangeIndex = dateRangeOptions.findIndex((opt) => opt.value === dateRange)

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 仓库标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">{warehouse?.name || '仓库统计'}</Text>
            <Text className="text-blue-100 text-sm block">查看考勤和计件统计数据</Text>
          </View>

          {/* 日期范围选择 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center justify-between">
              <View className="flex items-center">
                <View className="i-mdi-calendar-range text-blue-600 text-xl mr-2" />
                <Text className="text-gray-800 text-base font-bold">时间范围</Text>
              </View>
              <Picker
                mode="selector"
                range={dateRangeOptions.map((o) => o.label)}
                value={currentRangeIndex}
                onChange={handleDateRangeChange}>
                <View className="flex items-center bg-blue-50 px-4 py-2 rounded-lg">
                  <Text className="text-blue-600 text-sm mr-2">{dateRangeOptions[currentRangeIndex].label}</Text>
                  <View className="i-mdi-chevron-down text-blue-600 text-lg" />
                </View>
              </Picker>
            </View>
          </View>

          {/* 考勤统计概览 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-clock-check text-blue-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">考勤统计</Text>
            </View>
            <View className="grid grid-cols-2 gap-3 mb-3">
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">出勤天数</Text>
                <Text className="text-2xl font-bold text-blue-900 block">{attendanceStats.total}</Text>
              </View>
              <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">正常天数</Text>
                <Text className="text-2xl font-bold text-green-600 block">{attendanceStats.normal}</Text>
              </View>
              <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">迟到次数</Text>
                <Text className="text-2xl font-bold text-orange-600 block">{attendanceStats.late}</Text>
              </View>
              <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">总工时</Text>
                <Text className="text-2xl font-bold text-purple-600 block">
                  {attendanceStats.totalHours.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* 考勤记录列表 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-format-list-bulleted text-blue-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">考勤记录</Text>
            </View>
            {attendanceRecords.length > 0 ? (
              <View className="space-y-2">
                {attendanceRecords.map((record) => {
                  const statusStyle = getStatusStyle(record.status)
                  return (
                    <View key={record.id} className="bg-gray-50 rounded-lg p-3">
                      <View className="flex items-center justify-between mb-2">
                        <Text className="text-gray-800 text-sm font-medium">{formatDate(record.work_date)}</Text>
                        <View className={`px-2 py-1 rounded ${statusStyle.bgColor}`}>
                          <Text className={`text-xs ${statusStyle.color}`}>{statusStyle.text}</Text>
                        </View>
                      </View>
                      <View className="flex items-center justify-between text-xs text-gray-600">
                        <View className="flex items-center">
                          <View className="i-mdi-login text-green-600 mr-1" />
                          <Text className="text-xs text-gray-600">{formatTime(record.clock_in_time)}</Text>
                        </View>
                        {record.clock_out_time && (
                          <View className="flex items-center">
                            <View className="i-mdi-logout text-red-600 mr-1" />
                            <Text className="text-xs text-gray-600">{formatTime(record.clock_out_time)}</Text>
                          </View>
                        )}
                        <View className="flex items-center">
                          <View className="i-mdi-clock-outline text-blue-600 mr-1" />
                          <Text className="text-xs text-gray-600">{formatWorkHours(record.work_hours)}</Text>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            ) : (
              <View className="text-center py-8">
                <View className="i-mdi-calendar-blank text-gray-300 text-5xl mb-2" />
                <Text className="text-gray-400 text-sm block">暂无考勤记录</Text>
              </View>
            )}
          </View>

          {/* 计件统计概览 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-package-variant text-orange-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">计件统计</Text>
            </View>
            {pieceWorkStats && (
              <View>
                <View className="grid grid-cols-3 gap-3 mb-3">
                  <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                    <Text className="text-xs text-gray-600 block mb-1">完成订单</Text>
                    <Text className="text-2xl font-bold text-orange-600 block">{pieceWorkStats.total_orders}</Text>
                  </View>
                  <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                    <Text className="text-xs text-gray-600 block mb-1">总数量</Text>
                    <Text className="text-2xl font-bold text-blue-900 block">{pieceWorkStats.total_quantity}</Text>
                  </View>
                  <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                    <Text className="text-xs text-gray-600 block mb-1">总金额</Text>
                    <Text className="text-2xl font-bold text-green-600 block">
                      ¥{pieceWorkStats.total_amount.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* 按类型统计 */}
                {pieceWorkStats.by_category.length > 0 && (
                  <View className="mt-3">
                    <Text className="text-sm text-gray-700 font-medium block mb-2">按品类统计</Text>
                    <View className="space-y-2">
                      {pieceWorkStats.by_category.map((item) => (
                        <View
                          key={item.category_id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <View className="flex items-center">
                            <View className="i-mdi-tag text-orange-600 text-lg mr-2" />
                            <Text className="text-sm text-gray-800">{item.category_name}</Text>
                          </View>
                          <View className="flex items-center">
                            <Text className="text-sm text-gray-600 mr-3">数量: {item.quantity}</Text>
                            <Text className="text-sm text-green-600 font-medium">¥{item.amount.toFixed(2)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 计件记录列表 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-clipboard-list text-orange-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">计件记录</Text>
            </View>
            {pieceWorkRecords.length > 0 ? (
              <View className="space-y-2">
                {pieceWorkRecords.map((record) => {
                  const category = categories.find((c) => c.id === record.category_id)
                  return (
                    <View key={record.id} className="bg-gray-50 rounded-lg p-3">
                      <View className="flex items-center justify-between mb-2">
                        <View className="flex items-center">
                          <View className="i-mdi-tag text-orange-600 text-lg mr-2" />
                          <Text className="text-gray-800 text-sm font-medium">{category?.name || '未知品类'}</Text>
                          {record.need_upstairs && (
                            <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded">
                              <Text className="text-xs text-blue-600">需上楼</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-gray-500">{formatDate(record.work_date)}</Text>
                      </View>
                      <View className="flex items-center justify-between">
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
                  )
                })}
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

export default WarehouseStats
