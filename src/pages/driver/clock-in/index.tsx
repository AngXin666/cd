import {Button, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  createClockIn,
  getAttendanceRuleByWarehouseId,
  getTodayAttendance,
  getWarehousesWithRules,
  updateClockOut
} from '@/db/api'
import type {AttendanceRecord, AttendanceStatus, WarehouseWithRule} from '@/db/types'

const ClockIn: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [warehouses, setWarehouses] = useState<WarehouseWithRule[]>([])
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)

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

  // 页面显示时刷新数据
  useDidShow(() => {
    loadWarehouses()
    loadTodayRecord()
  })

  // 判断考勤状态
  const determineAttendanceStatus = (
    clockTime: Date,
    workStartTime: string,
    workEndTime: string,
    lateThreshold: number,
    earlyThreshold: number,
    isClockOut: boolean
  ): AttendanceStatus => {
    const [startHour, startMinute] = workStartTime.split(':').map(Number)
    const [endHour, endMinute] = workEndTime.split(':').map(Number)

    const clockHour = clockTime.getHours()
    const clockMinute = clockTime.getMinutes()

    if (!isClockOut) {
      // 上班打卡
      const clockMinutes = clockHour * 60 + clockMinute
      const startMinutes = startHour * 60 + startMinute
      const diff = clockMinutes - startMinutes

      if (diff > lateThreshold) {
        return 'late' // 迟到
      }
      return 'normal' // 正常
    }

    // 下班打卡
    const clockMinutes = clockHour * 60 + clockMinute
    const endMinutes = endHour * 60 + endMinute
    const diff = endMinutes - clockMinutes

    if (diff > earlyThreshold) {
      return 'early' // 早退
    }
    return 'normal' // 正常
  }

  // 上班打卡
  const handleClockIn = async () => {
    if (!user?.id) return

    // 检查是否选择了仓库
    if (warehouses.length === 0) {
      showToast({
        title: '暂无可用仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    const selectedWarehouse = warehouses[selectedWarehouseIndex]
    if (!selectedWarehouse) {
      showToast({
        title: '请选择仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 检查是否已经打过卡
    if (todayRecord?.clock_in_time) {
      showToast({
        title: '今日已打过上班卡',
        icon: 'none',
        duration: 2000
      })
      return
    }

    try {
      setLoading(true)
      showLoading({title: '打卡中...'})

      // 获取考勤规则
      const rule = await getAttendanceRuleByWarehouseId(selectedWarehouse.id)
      if (!rule) {
        throw new Error('未找到考勤规则')
      }

      // 判断考勤状态
      const now = new Date()
      const status = determineAttendanceStatus(
        now,
        rule.work_start_time,
        rule.work_end_time,
        rule.late_threshold,
        rule.early_threshold,
        false
      )

      // 创建打卡记录
      const record = await createClockIn({
        user_id: user.id,
        warehouse_id: selectedWarehouse.id,
        status
      })

      Taro.hideLoading()

      if (record) {
        setTodayRecord(record)

        // 显示打卡结果
        const statusText = status === 'late' ? '迟到' : '正常'
        await showModal({
          title: '打卡成功',
          content: `上班打卡成功\n状态：${statusText}\n仓库：${selectedWarehouse.name}`,
          showCancel: false
        })
      } else {
        throw new Error('打卡失败')
      }
    } catch (error) {
      Taro.hideLoading()
      const errorMessage = error instanceof Error ? error.message : '打卡失败'
      showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }

  // 下班打卡
  const handleClockOut = async () => {
    if (!user?.id || !todayRecord) return

    // 检查是否需要打下班卡
    const selectedWarehouse = warehouses.find((w) => w.id === todayRecord.warehouse_id)
    if (!selectedWarehouse?.rule?.require_clock_out) {
      showToast({
        title: '该仓库不需要打下班卡',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 检查是否已经打过下班卡
    if (todayRecord.clock_out_time) {
      showToast({
        title: '今日已打过下班卡',
        icon: 'none',
        duration: 2000
      })
      return
    }

    try {
      setLoading(true)
      showLoading({title: '打卡中...'})

      // 获取考勤规则
      const rule = await getAttendanceRuleByWarehouseId(todayRecord.warehouse_id!)
      if (!rule) {
        throw new Error('未找到考勤规则')
      }

      // 判断考勤状态
      const now = new Date()
      const status = determineAttendanceStatus(
        now,
        rule.work_start_time,
        rule.work_end_time,
        rule.late_threshold,
        rule.early_threshold,
        true
      )

      // 计算工作时长
      const clockInTime = new Date(todayRecord.clock_in_time)
      const workHours = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

      // 更新打卡记录
      const success = await updateClockOut(todayRecord.id, {
        clock_out_time: now.toISOString(),
        work_hours: Number.parseFloat(workHours.toFixed(2)),
        status: todayRecord.status === 'late' ? 'late' : status // 如果上班迟到，保持迟到状态
      })

      Taro.hideLoading()

      if (success) {
        // 刷新记录
        await loadTodayRecord()

        // 显示打卡结果
        const statusText = status === 'early' ? '早退' : '正常'
        await showModal({
          title: '打卡成功',
          content: `下班打卡成功\n状态：${statusText}\n工作时长：${workHours.toFixed(2)}小时`,
          showCancel: false
        })
      } else {
        throw new Error('打卡失败')
      }
    } catch (error) {
      Taro.hideLoading()
      const errorMessage = error instanceof Error ? error.message : '打卡失败'
      showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }

  // 格式化时间
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  // 格式化日期
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const weekDay = weekDays[date.getDay()]
    return `${year}年${month}月${day}日 星期${weekDay}`
  }

  // 格式化打卡时间显示
  const formatClockTime = (timeStr: string): string => {
    const date = new Date(timeStr)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 获取状态文本和颜色
  const getStatusInfo = (status: AttendanceStatus) => {
    switch (status) {
      case 'normal':
        return {text: '正常', color: 'text-green-600', bgColor: 'bg-green-50'}
      case 'late':
        return {text: '迟到', color: 'text-red-600', bgColor: 'bg-red-50'}
      case 'early':
        return {text: '早退', color: 'text-orange-600', bgColor: 'bg-orange-50'}
      case 'absent':
        return {text: '缺勤', color: 'text-gray-600', bgColor: 'bg-gray-50'}
      default:
        return {text: '未知', color: 'text-gray-600', bgColor: 'bg-gray-50'}
    }
  }

  const hasClockIn = !!todayRecord?.clock_in_time
  const hasClockOut = !!todayRecord?.clock_out_time
  const selectedWarehouse = warehouses[selectedWarehouseIndex]
  const requireClockOut = selectedWarehouse?.rule?.require_clock_out ?? true

  return (
    <View style={{background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)', minHeight: '100vh'}}>
      <ScrollView scrollY style={{background: 'transparent'}} className="box-border">
        <View className="p-6">
          {/* 顶部时间显示 */}
          <View className="text-center mb-8">
            <Text className="text-white text-5xl font-bold block mb-2">{formatTime(currentTime)}</Text>
            <Text className="text-white/80 text-base block">{formatDate(currentTime)}</Text>
          </View>

          {/* 仓库选择 */}
          <View className="bg-white rounded-lg p-4 mb-6 shadow-lg">
            <View className="flex items-center mb-3">
              <View className="i-mdi-warehouse text-blue-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">选择仓库</Text>
            </View>
            <Picker
              mode="selector"
              range={warehouses.map((w) => w.name)}
              value={selectedWarehouseIndex}
              onChange={(e) => setSelectedWarehouseIndex(Number(e.detail.value))}>
              <View className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                <Text className="text-blue-800 text-base">{selectedWarehouse?.name || '请选择仓库'}</Text>
                <View className="i-mdi-chevron-down text-blue-600 text-xl" />
              </View>
            </Picker>
            {selectedWarehouse?.rule && (
              <View className="mt-3 bg-gray-50 rounded p-3">
                <Text className="text-gray-600 text-xs block mb-1">
                  上班时间：{selectedWarehouse.rule.work_start_time}
                </Text>
                <Text className="text-gray-600 text-xs block mb-1">
                  下班时间：{selectedWarehouse.rule.work_end_time}
                </Text>
                <Text className="text-gray-600 text-xs block">{requireClockOut ? '需要打下班卡' : '无需打下班卡'}</Text>
              </View>
            )}
          </View>

          {/* 打卡按钮 */}
          <View className="flex justify-center gap-6 mb-6">
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
                !hasClockIn || hasClockOut || !requireClockOut
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-white text-orange-600'
              }`}
              disabled={!hasClockIn || hasClockOut || loading || !requireClockOut}
              onClick={handleClockOut}>
              {hasClockOut ? '✓ 已打卡' : '下班打卡'}
            </Button>
          </View>

          {/* 今日打卡记录 */}
          {todayRecord && (
            <View className="bg-white rounded-lg p-6 shadow-lg">
              <Text className="text-gray-800 text-lg font-bold mb-4 block">今日打卡记录</Text>

              {/* 上班打卡 */}
              <View className="mb-4 pb-4 border-b border-gray-200">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-gray-600 text-sm">上班打卡</Text>
                  {todayRecord.clock_in_time && (
                    <View className={`px-3 py-1 rounded-full ${getStatusInfo(todayRecord.status).bgColor}`}>
                      <Text className={`text-xs ${getStatusInfo(todayRecord.status).color}`}>
                        {getStatusInfo(todayRecord.status).text}
                      </Text>
                    </View>
                  )}
                </View>
                {todayRecord.clock_in_time && (
                  <View>
                    <Text className="text-gray-800 text-base font-bold block mb-1">
                      {formatClockTime(todayRecord.clock_in_time)}
                    </Text>
                    <Text className="text-gray-500 text-xs block">
                      {warehouses.find((w) => w.id === todayRecord.warehouse_id)?.name || '未知仓库'}
                    </Text>
                  </View>
                )}
              </View>

              {/* 下班打卡 */}
              {requireClockOut && (
                <View>
                  <View className="flex items-center justify-between mb-2">
                    <Text className="text-gray-600 text-sm">下班打卡</Text>
                    {todayRecord.clock_out_time && todayRecord.status === 'early' && (
                      <View className={`px-3 py-1 rounded-full ${getStatusInfo('early').bgColor}`}>
                        <Text className={`text-xs ${getStatusInfo('early').color}`}>{getStatusInfo('early').text}</Text>
                      </View>
                    )}
                  </View>
                  {todayRecord.clock_out_time ? (
                    <View>
                      <Text className="text-gray-800 text-base font-bold block mb-1">
                        {formatClockTime(todayRecord.clock_out_time)}
                      </Text>
                      {todayRecord.work_hours && (
                        <Text className="text-gray-500 text-xs block">
                          工作时长：{todayRecord.work_hours.toFixed(2)} 小时
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text className="text-gray-400 text-sm">未打卡</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* 使用说明 */}
          <View className="bg-white/10 rounded-lg p-4 mt-6">
            <View className="flex items-center mb-2">
              <View className="i-mdi-information text-white text-xl mr-2" />
              <Text className="text-white text-sm font-bold">使用说明</Text>
            </View>
            <Text className="text-white/80 text-xs leading-relaxed block mb-1">1. 选择您所在的仓库</Text>
            <Text className="text-white/80 text-xs leading-relaxed block mb-1">2. 点击"上班打卡"按钮进行上班打卡</Text>
            <Text className="text-white/80 text-xs leading-relaxed block mb-1">
              3. 下班时点击"下班打卡"按钮（如需要）
            </Text>
            <Text className="text-white/80 text-xs leading-relaxed block">4. 系统会自动判断迟到、早退等状态</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ClockIn
