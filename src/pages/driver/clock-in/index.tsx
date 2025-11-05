import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  createClockIn,
  findNearestWarehouse,
  getAttendanceRuleByWarehouseId,
  getTodayAttendance,
  getWarehousesWithRules,
  isWithinWarehouseRange,
  updateClockOut
} from '@/db/api'
import type {AttendanceRecord, AttendanceStatus, WarehouseWithRule} from '@/db/types'
import {getSmartLocation, LocationMethod} from '@/utils/geocoding'
import {checkLocationReady} from '@/utils/permission'

const ClockIn: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [warehouses, setWarehouses] = useState<WarehouseWithRule[]>([])
  const [locationMethod, setLocationMethod] = useState<LocationMethod | null>(null) // 记录使用的定位方式

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    const data = await getWarehousesWithRules()
    setWarehouses(data)
  }, [])

  // 加载今日打卡记录
  const loadTodayRecord = useCallback(async () => {
    if (!user?.id) return
    const record = await getTodayAttendance(user.id)
    setTodayRecord(record)
  }, [user?.id])

  useEffect(() => {
    loadWarehouses()
    loadTodayRecord()
  }, [loadWarehouses, loadTodayRecord])

  useDidShow(() => {
    loadWarehouses()
    loadTodayRecord()
  })

  // 获取GPS位置和详细地址（智能切换）
  const getGPSLocation = async (): Promise<{
    latitude: number
    longitude: number
    address: string
    method: LocationMethod
  } | null> => {
    try {
      // 1. 先检查定位权限和GPS状态
      const locationCheck = await checkLocationReady()
      if (!locationCheck.ready) {
        showToast({
          title: locationCheck.message || '定位检查失败',
          icon: 'none',
          duration: 2000
        })
        return null
      }

      // 2. 开始智能定位
      showLoading({title: '智能定位中...'})

      // 使用智能定位功能（自动切换百度API和本机GPS）
      const location = await getSmartLocation()

      Taro.hideLoading()

      // 记录使用的定位方式
      setLocationMethod(location.method)

      // 显示定位方式提示
      const methodName = location.method === LocationMethod.BAIDU ? '百度地图' : 'GPS坐标'
      console.log(`定位成功，使用方式：${methodName}`)

      return {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        method: location.method
      }
    } catch (error) {
      Taro.hideLoading()

      // 显示详细的错误信息
      const errorMessage = error instanceof Error ? error.message : '获取位置失败'

      showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      })

      return null
    }
  }

  // 判断考勤状态
  const determineAttendanceStatus = (
    clockTime: Date,
    workStartTime: string,
    lateThreshold: number
  ): AttendanceStatus => {
    const [hours, minutes] = workStartTime.split(':').map(Number)
    const workStart = new Date(clockTime)
    workStart.setHours(hours, minutes, 0, 0)

    const diffMinutes = (clockTime.getTime() - workStart.getTime()) / 1000 / 60

    if (diffMinutes <= lateThreshold) {
      return 'normal'
    }
    return 'late'
  }

  // 上班打卡
  const handleClockIn = async () => {
    if (!user?.id) return

    if (todayRecord) {
      showToast({title: '今日已打卡', icon: 'none'})
      return
    }

    if (warehouses.length === 0) {
      showToast({title: '暂无可用仓库，请联系管理员', icon: 'none', duration: 2000})
      return
    }

    setLoading(true)

    // 获取当前位置
    const location = await getGPSLocation()
    if (!location) {
      setLoading(false)
      return
    }

    // 查找最近的仓库
    const nearest = await findNearestWarehouse(location.latitude, location.longitude)

    if (!nearest) {
      setLoading(false)
      showToast({title: '未找到可用仓库', icon: 'none'})
      return
    }

    const {warehouse, distance} = nearest

    // 检查是否在范围内
    if (!isWithinWarehouseRange(location.latitude, location.longitude, warehouse)) {
      setLoading(false)
      showModal({
        title: '打卡失败',
        content: `您距离最近的仓库"${warehouse.name}"还有${Math.round(distance)}米，超出打卡范围（${warehouse.radius}米）。请到仓库附近打卡。`,
        showCancel: false
      })
      return
    }

    // 获取考勤规则
    const rule = await getAttendanceRuleByWarehouseId(warehouse.id)
    let status: AttendanceStatus = 'normal'

    if (rule) {
      status = determineAttendanceStatus(new Date(), rule.work_start_time, rule.late_threshold)
    }

    // 创建打卡记录
    const record = await createClockIn({
      user_id: user.id,
      warehouse_id: warehouse.id,
      clock_in_location: `${warehouse.name} (${location.address})`,
      clock_in_latitude: location.latitude,
      clock_in_longitude: location.longitude,
      work_date: new Date().toISOString().split('T')[0],
      status
    })

    setLoading(false)

    if (record) {
      const statusText = status === 'late' ? '（迟到）' : ''
      showToast({
        title: `上班打卡成功${statusText}`,
        icon: 'success',
        duration: 2000
      })
      setTodayRecord(record)
    } else {
      showToast({title: '打卡失败，请重试', icon: 'none'})
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

    // 获取当前位置
    const location = await getGPSLocation()
    if (!location) {
      setLoading(false)
      return
    }

    // 检查是否在仓库范围内
    if (todayRecord.warehouse_id) {
      const nearest = await findNearestWarehouse(location.latitude, location.longitude)

      if (nearest) {
        const {warehouse, distance} = nearest

        if (!isWithinWarehouseRange(location.latitude, location.longitude, warehouse)) {
          setLoading(false)
          showModal({
            title: '打卡失败',
            content: `您距离最近的仓库"${warehouse.name}"还有${Math.round(distance)}米，超出打卡范围（${warehouse.radius}米）。请到仓库附近打卡。`,
            showCancel: false
          })
          return
        }
      }
    }

    // 计算工作时长
    const clockInTime = new Date(todayRecord.clock_in_time)
    const clockOutTime = new Date()
    const workHours = (clockOutTime.getTime() - clockInTime.getTime()) / 1000 / 60 / 60

    // 更新打卡记录
    const success = await updateClockOut(todayRecord.id, {
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
      showToast({title: '打卡失败，请重试', icon: 'none'})
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

  const hasClockIn = !!todayRecord
  const hasClockOut = !!todayRecord?.clock_out_time

  return (
    <View style={{background: 'linear-gradient(to bottom, #1E3A8A, #3B82F6)', minHeight: '100vh'}}>
      <ScrollView scrollY style={{background: 'transparent'}} className="box-border">
        <View className="p-6">
          {/* 时间显示 */}
          <View className="text-center mb-8">
            <Text className="text-white text-lg mb-2 block">{formatDate(currentTime)}</Text>
            <Text className="text-white text-5xl font-bold mb-4 block">{formatTime(currentTime)}</Text>
            <Text className="text-white/80 text-sm block">📍 GPS定位打卡</Text>
          </View>

          {/* 仓库选择提示 */}
          {warehouses.length > 0 && (
            <View className="bg-white/10 rounded-lg p-4 mb-6">
              <Text className="text-white text-sm mb-2 block">💡 打卡提示</Text>
              <Text className="text-white/80 text-xs block">
                系统将自动选择您最近的仓库进行打卡，请确保在仓库打卡范围内（{warehouses[0]?.radius || 500}米）
              </Text>
            </View>
          )}

          {/* 打卡按钮 */}
          <View className="flex justify-around mb-8">
            <Button
              size="default"
              className={`w-36 h-36 rounded-2xl text-lg font-bold break-keep ${
                hasClockIn ? 'bg-gray-300 text-gray-500' : 'bg-white text-blue-600'
              }`}
              disabled={hasClockIn || loading}
              onClick={handleClockIn}>
              {hasClockIn ? '✓ 已打卡' : '上班打卡'}
            </Button>

            <Button
              size="default"
              className={`w-36 h-36 rounded-2xl text-lg font-bold break-keep ${
                !hasClockIn || hasClockOut ? 'bg-gray-300 text-gray-500' : 'bg-white text-orange-600'
              }`}
              disabled={!hasClockIn || hasClockOut || loading}
              onClick={handleClockOut}>
              {hasClockOut ? '✓ 已打卡' : '下班打卡'}
            </Button>
          </View>

          {/* 定位方式说明 */}
          <View className="bg-white/10 rounded-lg p-4 mb-6">
            <View className="flex items-center mb-2">
              <View className="i-mdi-map-marker text-white text-xl mr-2" />
              <Text className="text-white text-sm font-bold">智能定位系统</Text>
            </View>
            <Text className="text-white/80 text-xs leading-relaxed">系统将自动尝试以下定位方式：</Text>
            <Text className="text-white/80 text-xs leading-relaxed ml-2">1. 百度地图API（详细地址）</Text>
            <Text className="text-white/80 text-xs leading-relaxed ml-2">2. 本机GPS定位（坐标）</Text>
            {locationMethod && (
              <View className="mt-2 bg-white/20 rounded px-3 py-2">
                <Text className="text-white text-xs">
                  当前使用：{locationMethod === LocationMethod.BAIDU ? '百度地图API' : '本机GPS定位'}
                </Text>
              </View>
            )}
          </View>

          {/* 权限说明 */}
          <View className="bg-blue-50 rounded-lg p-4 mb-6">
            <View className="flex items-center mb-2">
              <View className="i-mdi-shield-check text-blue-600 text-xl mr-2" />
              <Text className="text-blue-800 text-sm font-bold">位置权限说明</Text>
            </View>
            <Text className="text-blue-700 text-xs leading-relaxed mb-2">打卡功能需要获取您的位置信息，用于：</Text>
            <Text className="text-blue-600 text-xs leading-relaxed ml-2">• 记录上下班打卡位置</Text>
            <Text className="text-blue-600 text-xs leading-relaxed ml-2">• 验证是否在仓库范围内</Text>
            <Text className="text-blue-600 text-xs leading-relaxed ml-2">• 自动选择最近的仓库</Text>
            <View className="mt-3 bg-blue-100 rounded px-3 py-2">
              <Text className="text-blue-800 text-xs">💡 首次打卡时会请求位置权限，请点击"允许"</Text>
            </View>
          </View>

          {/* 今日打卡记录 */}
          {todayRecord && (
            <View className="bg-white rounded-lg p-6 shadow-lg">
              <Text className="text-gray-800 text-lg font-bold mb-4 block">今日打卡记录</Text>

              {/* 上班打卡 */}
              <View className="mb-4">
                <View className="flex items-center mb-2">
                  <Text className="text-green-600 text-base font-bold mr-2">✓ 上班打卡</Text>
                  {todayRecord.status === 'late' && (
                    <View className="bg-orange-100 px-2 py-1 rounded">
                      <Text className="text-orange-600 text-xs">迟到</Text>
                    </View>
                  )}
                </View>
                <Text className="text-gray-600 text-sm mb-1 block">
                  时间：{formatClockTime(todayRecord.clock_in_time)}
                </Text>
                {todayRecord.clock_in_location && (
                  <Text className="text-gray-500 text-xs block">位置：{todayRecord.clock_in_location}</Text>
                )}
              </View>

              {/* 下班打卡 */}
              {todayRecord.clock_out_time ? (
                <View>
                  <Text className="text-green-600 text-base font-bold mb-2 block">✓ 下班打卡</Text>
                  <Text className="text-gray-600 text-sm mb-1 block">
                    时间：{formatClockTime(todayRecord.clock_out_time)}
                  </Text>
                  {todayRecord.clock_out_location && (
                    <Text className="text-gray-500 text-xs mb-2 block">位置：{todayRecord.clock_out_location}</Text>
                  )}
                  <View className="bg-blue-50 p-3 rounded mt-2">
                    <Text className="text-blue-600 text-sm font-bold">
                      工作时长：{todayRecord.work_hours?.toFixed(1) || '0.0'} 小时
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="bg-gray-50 p-4 rounded">
                  <Text className="text-gray-400 text-sm text-center">等待下班打卡...</Text>
                </View>
              )}
            </View>
          )}

          {/* 无打卡记录提示 */}
          {!todayRecord && (
            <View className="bg-white/10 rounded-lg p-6">
              <Text className="text-white/60 text-sm text-center">今日尚未打卡</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default ClockIn
