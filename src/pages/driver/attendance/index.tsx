import {Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getMonthlyAttendance} from '@/db/api'
import type {AttendanceRecord} from '@/db/types'

const Attendance: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [yearRange, setYearRange] = useState<number[]>([])
  const [monthRange] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

  // 生成年份范围（当前年份前后各2年）
  useEffect(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push(i)
    }
    setYearRange(years)
  }, [])

  // 加载考勤记录
  const loadRecords = useCallback(async () => {
    if (!user?.id) return
    const data = await getMonthlyAttendance(user.id, selectedYear, selectedMonth)
    setRecords(data)
  }, [user?.id, selectedYear, selectedMonth])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useDidShow(() => {
    loadRecords()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadRecords()])
    Taro.stopPullDownRefresh()
  })

  // 年份选择
  const handleYearChange = (e: {detail: {value: string | number}}) => {
    const index = typeof e.detail.value === 'string' ? Number.parseInt(e.detail.value, 10) : e.detail.value
    setSelectedYear(yearRange[index])
  }

  // 月份选择
  const handleMonthChange = (e: {detail: {value: string | number}}) => {
    const index = typeof e.detail.value === 'string' ? Number.parseInt(e.detail.value, 10) : e.detail.value
    setSelectedMonth(monthRange[index])
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const weekDay = weekDays[date.getDay()]
    return `${month}/${day} 周${weekDay}`
  }

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    const statusMap = {
      normal: {text: '正常', color: 'text-green-600', bg: 'bg-green-50'},
      late: {text: '迟到', color: 'text-orange-600', bg: 'bg-orange-50'},
      early: {text: '早退', color: 'text-yellow-600', bg: 'bg-yellow-50'},
      absent: {text: '缺勤', color: 'text-red-600', bg: 'bg-red-50'}
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.normal
  }

  // 计算统计数据
  const stats = {
    totalDays: records.length,
    normalDays: records.filter((r) => r.status === 'normal').length,
    lateDays: records.filter((r) => r.status === 'late').length,
    totalHours: records.reduce((sum, r) => sum + (r.work_hours || 0), 0)
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 月份选择器 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-3">选择月份</Text>
            <View className="flex gap-2">
              <Picker
                mode="selector"
                range={yearRange}
                value={yearRange.indexOf(selectedYear)}
                onChange={handleYearChange}>
                <View className="flex-1 bg-blue-50 rounded-lg p-3 text-center">
                  <Text className="text-blue-900 font-medium">{selectedYear}年</Text>
                </View>
              </Picker>
              <Picker
                mode="selector"
                range={monthRange}
                value={monthRange.indexOf(selectedMonth)}
                onChange={handleMonthChange}>
                <View className="flex-1 bg-blue-50 rounded-lg p-3 text-center">
                  <Text className="text-blue-900 font-medium">{selectedMonth}月</Text>
                </View>
              </Picker>
            </View>
          </View>

          {/* 统计卡片 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-3">本月统计</Text>
            <View className="grid grid-cols-2 gap-3">
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">出勤天数</Text>
                <Text className="text-2xl font-bold text-blue-900 block">{stats.totalDays}</Text>
              </View>
              <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">正常天数</Text>
                <Text className="text-2xl font-bold text-green-600 block">{stats.normalDays}</Text>
              </View>
              <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">迟到次数</Text>
                <Text className="text-2xl font-bold text-orange-600 block">{stats.lateDays}</Text>
              </View>
              <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                <Text className="text-xs text-gray-600 block mb-1">工作时长</Text>
                <Text className="text-2xl font-bold text-purple-600 block">{stats.totalHours.toFixed(1)}h</Text>
              </View>
            </View>
          </View>

          {/* 考勤记录列表 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <Text className="text-lg font-bold text-gray-800 block mb-3">考勤记录</Text>

            {records.length === 0 ? (
              <View className="text-center py-8">
                <View className="i-mdi-calendar-blank text-6xl text-gray-300 mb-2" />
                <Text className="text-sm text-gray-400">暂无考勤记录</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {records.map((record) => {
                  const statusInfo = getStatusDisplay(record.status)
                  return (
                    <View key={record.id} className="border border-gray-200 rounded-lg p-3">
                      {/* 日期和状态 */}
                      <View className="flex justify-between items-center mb-2">
                        <Text className="text-base font-bold text-gray-800">{formatDate(record.work_date)}</Text>
                        <View className={`${statusInfo.bg} px-2 py-1 rounded`}>
                          <Text className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.text}</Text>
                        </View>
                      </View>

                      {/* 打卡时间 */}
                      <View className="grid grid-cols-2 gap-2 mb-2">
                        <View className="flex items-center">
                          <View className="i-mdi-login text-blue-900 text-lg mr-1" />
                          <Text className="text-sm text-gray-600">上班：{formatTime(record.clock_in_time)}</Text>
                        </View>
                        {record.clock_out_time && (
                          <View className="flex items-center">
                            <View className="i-mdi-logout text-orange-600 text-lg mr-1" />
                            <Text className="text-sm text-gray-600">下班：{formatTime(record.clock_out_time)}</Text>
                          </View>
                        )}
                      </View>

                      {/* 工作时长 */}
                      {record.work_hours && (
                        <View className="flex items-center">
                          <View className="i-mdi-timer text-gray-500 text-sm mr-1" />
                          <Text className="text-xs text-gray-500">工作时长：{record.work_hours.toFixed(1)} 小时</Text>
                        </View>
                      )}

                      {/* 备注 */}
                      {record.notes && (
                        <View className="mt-2 pt-2 border-t border-gray-100">
                          <Text className="text-xs text-gray-500">备注：{record.notes}</Text>
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default Attendance
