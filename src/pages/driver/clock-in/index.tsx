import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {getLocation, showLoading, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {createClockIn, getTodayAttendance, updateClockOut} from '@/db/api'
import type {AttendanceRecord} from '@/db/types'

const ClockIn: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 加载今日打卡记录
  const loadTodayRecord = useCallback(async () => {
    if (!user?.id) return
    const record = await getTodayAttendance(user.id)
    setTodayRecord(record)
  }, [user?.id])

  useEffect(() => {
    loadTodayRecord()
  }, [loadTodayRecord])

  useDidShow(() => {
    loadTodayRecord()
  })

  // 获取GPS位置
  const getGPSLocation = async (): Promise<{
    latitude: number
    longitude: number
    address: string
  } | null> => {
    try {
      showLoading({title: '获取位置中...'})
      const res = await getLocation({type: 'gcj02'})
      Taro.hideLoading()

      return {
        latitude: res.latitude,
        longitude: res.longitude,
        address: `${res.latitude.toFixed(6)}, ${res.longitude.toFixed(6)}`
      }
    } catch (_error) {
      Taro.hideLoading()
      showToast({title: '获取位置失败', icon: 'none'})
      return null
    }
  }

  // 上班打卡
  const handleClockIn = async () => {
    if (!user?.id) return
    if (todayRecord) {
      showToast({title: '今日已打卡', icon: 'none'})
      return
    }

    setLoading(true)
    const location = await getGPSLocation()
    if (!location) {
      setLoading(false)
      return
    }

    const record = await createClockIn({
      user_id: user.id,
      clock_in_location: location.address,
      clock_in_latitude: location.latitude,
      clock_in_longitude: location.longitude,
      work_date: new Date().toISOString().split('T')[0],
      status: 'normal'
    })

    setLoading(false)

    if (record) {
      showToast({title: '上班打卡成功', icon: 'success'})
      setTodayRecord(record)
    } else {
      showToast({title: '打卡失败', icon: 'none'})
    }
  }

  // 下班打卡
  const handleClockOut = async () => {
    if (!todayRecord) {
      showToast({title: '请先上班打卡', icon: 'none'})
      return
    }

    if (todayRecord.clock_out_time) {
      showToast({title: '今日已下班打卡', icon: 'none'})
      return
    }

    setLoading(true)
    const location = await getGPSLocation()
    if (!location) {
      setLoading(false)
      return
    }

    // 计算工作时长
    const clockInTime = new Date(todayRecord.clock_in_time)
    const clockOutTime = new Date()
    const workHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

    const success = await updateClockOut(todayRecord.id, {
      clock_out_time: clockOutTime.toISOString(),
      clock_out_location: location.address,
      clock_out_latitude: location.latitude,
      clock_out_longitude: location.longitude,
      work_hours: Number.parseFloat(workHours.toFixed(2))
    })

    setLoading(false)

    if (success) {
      showToast({title: '下班打卡成功', icon: 'success'})
      await loadTodayRecord()
    } else {
      showToast({title: '打卡失败', icon: 'none'})
    }
  }

  // 格式化时间
  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  // 格式化日期
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const weekDay = weekDays[date.getDay()]
    return `${year}年${month}月${day}日 星期${weekDay}`
  }

  // 格式化打卡时间显示
  const formatClockTime = (timeStr: string) => {
    const date = new Date(timeStr)
    return formatTime(date)
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #1E3A8A, #3B82F6)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 时间显示卡片 */}
          <View className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4 text-center">
            <Text className="text-white/80 text-sm block mb-2">{formatDate(currentTime)}</Text>
            <Text className="text-white text-5xl font-bold block mb-4">{formatTime(currentTime)}</Text>
            <View className="flex justify-center items-center">
              <View className="i-mdi-map-marker text-white/80 text-lg mr-1" />
              <Text className="text-white/80 text-xs">GPS定位打卡</Text>
            </View>
          </View>

          {/* 打卡按钮 */}
          <View className="grid grid-cols-2 gap-4 mb-4">
            <Button
              className="bg-white text-blue-900 font-bold py-8 rounded-xl shadow-lg"
              disabled={loading || !!todayRecord}
              onClick={handleClockIn}>
              <View className="flex flex-col items-center">
                <View className="i-mdi-login text-4xl mb-2" />
                <Text className="text-base">上班打卡</Text>
              </View>
            </Button>
            <Button
              className="bg-white text-orange-600 font-bold py-8 rounded-xl shadow-lg"
              disabled={loading || !todayRecord || !!todayRecord?.clock_out_time}
              onClick={handleClockOut}>
              <View className="flex flex-col items-center">
                <View className="i-mdi-logout text-4xl mb-2" />
                <Text className="text-base">下班打卡</Text>
              </View>
            </Button>
          </View>

          {/* 今日打卡记录 */}
          {todayRecord && (
            <View className="bg-white rounded-xl p-4 shadow-lg">
              <Text className="text-lg font-bold text-gray-800 block mb-4">今日打卡记录</Text>

              {/* 上班打卡信息 */}
              <View className="mb-4 pb-4 border-b border-gray-200">
                <View className="flex items-center mb-2">
                  <View className="i-mdi-login text-2xl text-blue-900 mr-2" />
                  <Text className="text-base font-bold text-gray-800">上班打卡</Text>
                </View>
                <View className="ml-8">
                  <View className="flex items-center mb-1">
                    <View className="i-mdi-clock text-sm text-gray-500 mr-1" />
                    <Text className="text-sm text-gray-600">时间：{formatClockTime(todayRecord.clock_in_time)}</Text>
                  </View>
                  <View className="flex items-center">
                    <View className="i-mdi-map-marker text-sm text-gray-500 mr-1" />
                    <Text className="text-sm text-gray-600">位置：{todayRecord.clock_in_location || '未记录'}</Text>
                  </View>
                </View>
              </View>

              {/* 下班打卡信息 */}
              {todayRecord.clock_out_time ? (
                <View>
                  <View className="flex items-center mb-2">
                    <View className="i-mdi-logout text-2xl text-orange-600 mr-2" />
                    <Text className="text-base font-bold text-gray-800">下班打卡</Text>
                  </View>
                  <View className="ml-8">
                    <View className="flex items-center mb-1">
                      <View className="i-mdi-clock text-sm text-gray-500 mr-1" />
                      <Text className="text-sm text-gray-600">时间：{formatClockTime(todayRecord.clock_out_time)}</Text>
                    </View>
                    <View className="flex items-center mb-1">
                      <View className="i-mdi-map-marker text-sm text-gray-500 mr-1" />
                      <Text className="text-sm text-gray-600">位置：{todayRecord.clock_out_location || '未记录'}</Text>
                    </View>
                    <View className="flex items-center">
                      <View className="i-mdi-timer text-sm text-gray-500 mr-1" />
                      <Text className="text-sm text-gray-600">
                        工作时长：{todayRecord.work_hours?.toFixed(1) || '0'} 小时
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="text-center py-4">
                  <Text className="text-sm text-gray-400">等待下班打卡...</Text>
                </View>
              )}
            </View>
          )}

          {/* 提示信息 */}
          {!todayRecord && (
            <View className="bg-white/10 backdrop-blur rounded-xl p-4 mt-4">
              <View className="flex items-start">
                <View className="i-mdi-information text-white text-xl mr-2 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-white text-sm block mb-1">打卡说明</Text>
                  <Text className="text-white/80 text-xs block">
                    • 打卡时会自动获取您的GPS位置信息{'\n'}• 请确保已开启位置权限{'\n'}• 每天只能打卡一次，请准时打卡
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default ClockIn
