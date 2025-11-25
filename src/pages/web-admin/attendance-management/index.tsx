import {Picker, ScrollView, Text, View} from '@tarojs/components'
import {navigateBack, useDidShow} from '@tarojs/taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getAllWarehouses, getAttendanceRecordsByWarehouse} from '@/db/api'
import type {AttendanceRecord, Warehouse} from '@/db/types'
import {useAdminAuth} from '@/hooks/useAdminAuth'

// 扩展考勤记录类型，包含司机信息
interface AttendanceRecordWithDriver extends AttendanceRecord {
  driver_name?: string
  driver_phone?: string
}

/**
 * 考勤管理页面（电脑端）
 * 仅允许管理员和超级管理员访问
 */
const AttendanceManagement: React.FC = () => {
  const {isAuthorized, isLoading} = useAdminAuth()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordWithDriver[]>([])
  const [selectedDate, setSelectedDate] = useState('')

  // 生成日期选项（最近30天）
  const generateDateOptions = () => {
    const dates: string[] = []
    const now = new Date()
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      dates.push(`${year}-${month}-${day}`)
    }
    return dates
  }

  const dateOptions = generateDateOptions()

  // 加载数据
  const loadData = useCallback(async () => {
    const warehouseList = await getAllWarehouses()
    setWarehouses(warehouseList)

    // 设置默认日期为今天
    if (!selectedDate) {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      setSelectedDate(today)
    }

    // 加载考勤记录
    if (warehouseList.length > 0 && selectedDate) {
      const records = await getAttendanceRecordsByWarehouse(
        warehouseList[selectedWarehouseIndex]?.id,
        selectedDate,
        selectedDate
      )
      setAttendanceRecords(records as AttendanceRecordWithDriver[])
    }
  }, [selectedWarehouseIndex, selectedDate])

  useDidShow(() => {
    loadData()
  })

  // 切换仓库
  const handleWarehouseChange = (e: any) => {
    setSelectedWarehouseIndex(e.detail.value)
  }

  // 切换日期
  const handleDateChange = (e: any) => {
    const date = dateOptions[e.detail.value]
    setSelectedDate(date)
  }

  // 格式化时间
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-'
    return new Date(timeStr).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 计算工作时长
  const calculateWorkHours = (clockIn: string | null, clockOut: string | null) => {
    if (!clockIn || !clockOut) return '-'
    const start = new Date(clockIn).getTime()
    const end = new Date(clockOut).getTime()
    const hours = (end - start) / (1000 * 60 * 60)
    return `${hours.toFixed(1)} 小时`
  }

  // 如果正在加载或未授权，显示提示
  if (isLoading || !isAuthorized) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <View className="text-center">
          <View className="i-mdi-shield-lock text-6xl text-gray-400 mb-4" />
          <Text className="text-xl text-gray-600">正在验证权限...</Text>
        </View>
      </View>
    )
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
              <Text className="text-xl font-bold text-gray-800">考勤管理</Text>
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

            {/* 日期选择 */}
            <View className="flex-1">
              <Text className="text-sm text-gray-600 mb-2">选择日期</Text>
              <Picker
                mode="selector"
                range={dateOptions}
                value={dateOptions.indexOf(selectedDate)}
                onChange={handleDateChange}>
                <View className="border border-gray-300 rounded px-4 py-2 bg-white">
                  <Text className="text-sm">{selectedDate || '请选择日期'}</Text>
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
                <Text className="text-sm text-gray-600">出勤人数</Text>
                <View className="i-mdi-account-check text-xl text-green-600" />
              </View>
              <Text className="text-2xl font-bold text-green-600">
                {attendanceRecords.filter((r) => r.clock_in_time).length}
              </Text>
            </View>

            <View className="bg-white rounded-lg shadow-md p-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">已下班</Text>
                <View className="i-mdi-clock-check text-xl text-blue-600" />
              </View>
              <Text className="text-2xl font-bold text-blue-600">
                {attendanceRecords.filter((r) => r.clock_out_time).length}
              </Text>
            </View>

            <View className="bg-white rounded-lg shadow-md p-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">未下班</Text>
                <View className="i-mdi-clock-alert text-xl text-orange-600" />
              </View>
              <Text className="text-2xl font-bold text-orange-600">
                {attendanceRecords.filter((r) => r.clock_in_time && !r.clock_out_time).length}
              </Text>
            </View>

            <View className="bg-white rounded-lg shadow-md p-4">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm text-gray-600">缺勤人数</Text>
                <View className="i-mdi-account-off text-xl text-red-600" />
              </View>
              <Text className="text-2xl font-bold text-red-600">
                {attendanceRecords.filter((r) => !r.clock_in_time).length}
              </Text>
            </View>
          </View>

          {/* 考勤记录表格 */}
          <View className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* 表格头部 */}
            <View className="hidden md:grid md:grid-cols-12 gap-4 bg-gray-50 px-6 py-3 border-b border-gray-200">
              <Text className="col-span-2 text-sm font-semibold text-gray-700">司机姓名</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">手机号</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">上班时间</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">下班时间</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">工作时长</Text>
              <Text className="col-span-2 text-sm font-semibold text-gray-700">状态</Text>
            </View>

            {/* 表格内容 */}
            {attendanceRecords.length === 0 ? (
              <View className="py-12 text-center">
                <View className="i-mdi-calendar-blank text-6xl text-gray-300 mb-4" />
                <Text className="text-gray-500">暂无考勤记录</Text>
              </View>
            ) : (
              attendanceRecords.map((record) => (
                <View
                  key={record.id}
                  className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                  {/* 电脑端表格行 */}
                  <View className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
                    <Text className="col-span-2 text-sm text-gray-800 font-medium">{record.user_id || '-'}</Text>
                    <Text className="col-span-2 text-sm text-gray-600">{'-'}</Text>
                    <Text className="col-span-2 text-sm text-gray-800">{formatTime(record.clock_in_time)}</Text>
                    <Text className="col-span-2 text-sm text-gray-800">{formatTime(record.clock_out_time)}</Text>
                    <Text className="col-span-2 text-sm text-gray-600">
                      {calculateWorkHours(record.clock_in_time, record.clock_out_time)}
                    </Text>
                    <View className="col-span-2">
                      {record.clock_in_time && record.clock_out_time ? (
                        <View className="inline-block px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                          <Text>已完成</Text>
                        </View>
                      ) : record.clock_in_time ? (
                        <View className="inline-block px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                          <Text>工作中</Text>
                        </View>
                      ) : (
                        <View className="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          <Text>未打卡</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* 移动端卡片 */}
                  <View className="md:hidden p-4">
                    <View className="flex items-center justify-between mb-2">
                      <Text className="text-base font-bold text-gray-800">{record.user_id || '-'}</Text>
                      {record.clock_in_time && record.clock_out_time ? (
                        <View className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                          <Text>已完成</Text>
                        </View>
                      ) : record.clock_in_time ? (
                        <View className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                          <Text>工作中</Text>
                        </View>
                      ) : (
                        <View className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          <Text>未打卡</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-gray-600 mb-2">手机：{'-'}</Text>
                    <View className="grid grid-cols-2 gap-2">
                      <View>
                        <Text className="text-xs text-gray-500">上班时间</Text>
                        <Text className="text-sm font-medium text-gray-800">{formatTime(record.clock_in_time)}</Text>
                      </View>
                      <View>
                        <Text className="text-xs text-gray-500">下班时间</Text>
                        <Text className="text-sm font-medium text-gray-800">{formatTime(record.clock_out_time)}</Text>
                      </View>
                      <View className="col-span-2">
                        <Text className="text-xs text-gray-500">工作时长</Text>
                        <Text className="text-sm font-medium text-gray-800">
                          {calculateWorkHours(record.clock_in_time, record.clock_out_time)}
                        </Text>
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

export default AttendanceManagement
