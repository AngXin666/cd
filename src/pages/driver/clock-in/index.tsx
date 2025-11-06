import {Button, Radio, RadioGroup, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  createClockIn,
  getAttendanceRuleByWarehouseId,
  getDriverWarehouses,
  getTodayAttendance,
  updateClockOut
} from '@/db/api'
import type {AttendanceRecord, AttendanceRule, AttendanceStatus, Warehouse} from '@/db/types'

const ClockIn: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')
  const [currentRule, setCurrentRule] = useState<AttendanceRule | null>(null)

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 加载仓库列表（只加载司机被分配的仓库）
  const loadWarehouses = useCallback(async () => {
    if (!user?.id) return
    const data = await getDriverWarehouses(user.id)
    // 只显示启用的仓库
    setWarehouses(data.filter((w) => w.is_active))
  }, [user?.id])

  // 加载今日打卡记录
  const loadTodayRecord = useCallback(async () => {
    if (!user?.id) return
    const record = await getTodayAttendance(user.id)
    setTodayRecord(record)
    // 如果已有打卡记录，自动选中对应的仓库
    if (record?.warehouse_id) {
      setSelectedWarehouseId(record.warehouse_id)
    }
  }, [user?.id])

  // 加载当前选中仓库的规则
  const loadCurrentRule = useCallback(async () => {
    if (!selectedWarehouseId) {
      setCurrentRule(null)
      return
    }
    const rule = await getAttendanceRuleByWarehouseId(selectedWarehouseId)
    setCurrentRule(rule)
  }, [selectedWarehouseId])

  useEffect(() => {
    loadWarehouses()
    loadTodayRecord()
  }, [loadWarehouses, loadTodayRecord])

  // 当选中的仓库变化时，加载对应的规则
  useEffect(() => {
    loadCurrentRule()
  }, [loadCurrentRule])

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

  // 智能打卡（根据当前状态自动判断是上班还是下班）
  const handleSmartClock = async () => {
    if (!user?.id) return

    const hasClockIn = !!todayRecord?.clock_in_time
    const hasClockOut = !!todayRecord?.clock_out_time

    if (!hasClockIn) {
      // 上班打卡
      await handleClockIn()
    } else if (!hasClockOut) {
      // 下班打卡
      await handleClockOut()
    }
  }

  // 上班打卡
  const handleClockIn = async () => {
    if (!user?.id) return

    // 检查是否已经打过卡
    if (todayRecord?.clock_in_time) {
      showToast({
        title: '您今日已完成考勤打卡，无需重复操作',
        icon: 'none',
        duration: 2500
      })
      return
    }

    // 检查是否选择了仓库
    if (!selectedWarehouseId) {
      showToast({
        title: '请选择仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId)
    if (!selectedWarehouse) {
      showToast({
        title: '请选择仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    try {
      setLoading(true)
      showLoading({title: '打卡中...'})

      // 再次检查今日是否已打卡（防止并发）
      const existingRecord = await getTodayAttendance(user.id)
      if (existingRecord?.clock_in_time) {
        Taro.hideLoading()
        setTodayRecord(existingRecord)
        showToast({
          title: '您今日已完成考勤打卡，无需重复操作',
          icon: 'none',
          duration: 2500
        })
        return
      }

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
          title: '✓ 上班打卡成功',
          content: `打卡时间：${formatTime(now)}\n状态：${statusText}\n仓库：${selectedWarehouse.name}`,
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
    const warehouseRule = await getAttendanceRuleByWarehouseId(todayRecord.warehouse_id!)
    if (!warehouseRule?.require_clock_out) {
      showToast({
        title: '该仓库不需要打下班卡',
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
          title: '✓ 下班打卡成功',
          content: `打卡时间：${formatTime(now)}\n状态：${statusText}\n工作时长：${workHours.toFixed(2)}小时`,
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
        return {text: '正常', color: 'text-green-600', bgColor: 'bg-green-50', icon: 'i-mdi-check-circle'}
      case 'late':
        return {text: '迟到', color: 'text-red-600', bgColor: 'bg-red-50', icon: 'i-mdi-alert-circle'}
      case 'early':
        return {text: '早退', color: 'text-orange-600', bgColor: 'bg-orange-50', icon: 'i-mdi-alert'}
      case 'absent':
        return {text: '缺勤', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: 'i-mdi-close-circle'}
      default:
        return {text: '未知', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: 'i-mdi-help-circle'}
    }
  }

  const hasClockIn = !!todayRecord?.clock_in_time
  const hasClockOut = !!todayRecord?.clock_out_time
  const requireClockOut = currentRule?.require_clock_out ?? true

  // 获取按钮文本和状态
  const getButtonInfo = () => {
    if (!hasClockIn) {
      return {
        text: '上班打卡',
        icon: 'i-mdi-login',
        disabled: !selectedWarehouseId || loading,
        bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
        disabledBgColor: 'bg-gray-300'
      }
    }
    if (!hasClockOut && requireClockOut) {
      return {
        text: '下班打卡',
        icon: 'i-mdi-logout',
        disabled: loading,
        bgColor: 'bg-gradient-to-br from-orange-500 to-orange-600',
        disabledBgColor: 'bg-gray-300'
      }
    }
    return {
      text: '今日已完成',
      icon: 'i-mdi-check-all',
      disabled: true,
      bgColor: 'bg-gradient-to-br from-green-500 to-green-600',
      disabledBgColor: 'bg-gray-300'
    }
  }

  const buttonInfo = getButtonInfo()

  return (
    <View style={{background: 'linear-gradient(to bottom, #F0F9FF, #E0F2FE)', minHeight: '100vh'}}>
      <ScrollView scrollY style={{background: 'transparent'}} className="box-border">
        <View className="p-4">
          {/* 顶部时间卡片 */}
          <View className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 mb-4 shadow-lg">
            <View className="text-center">
              <Text className="text-white/80 text-sm block mb-2">{formatDate(currentTime)}</Text>
              <Text className="text-white text-5xl font-bold block tracking-wider">{formatTime(currentTime)}</Text>
            </View>
          </View>

          {/* 今日打卡状态提示卡片 - 显著位置 */}
          {todayRecord?.clock_in_time && (
            <View className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 mb-4 shadow-lg">
              <View className="flex items-center justify-center mb-3">
                <View className="i-mdi-check-circle text-white text-3xl mr-2" />
                <Text className="text-white text-xl font-bold">今日已打卡</Text>
              </View>
              <View className="bg-white/20 rounded-xl p-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-white/90 text-sm">上班时间</Text>
                  <Text className="text-white text-lg font-bold">{formatClockTime(todayRecord.clock_in_time)}</Text>
                </View>
                {todayRecord.clock_out_time && (
                  <View className="flex items-center justify-between mb-2">
                    <Text className="text-white/90 text-sm">下班时间</Text>
                    <Text className="text-white text-lg font-bold">{formatClockTime(todayRecord.clock_out_time)}</Text>
                  </View>
                )}
                <View className="flex items-center justify-between">
                  <Text className="text-white/90 text-sm">考勤状态</Text>
                  <View className="flex items-center">
                    <View className={`${getStatusInfo(todayRecord.status).icon} text-white text-base mr-1`} />
                    <Text className="text-white text-base font-bold">{getStatusInfo(todayRecord.status).text}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 仓库选择卡片 */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-warehouse text-blue-600 text-2xl mr-2" />
              <Text className="text-gray-800 text-lg font-bold">选择仓库</Text>
              {!hasClockIn && <Text className="text-red-500 text-sm ml-2">*</Text>}
            </View>

            {warehouses.length === 0 ? (
              <View className="text-center py-8">
                <View className="i-mdi-alert-circle text-4xl text-gray-300 mb-2" />
                <Text className="text-sm text-gray-400 block">暂无可用仓库</Text>
              </View>
            ) : (
              <RadioGroup
                onChange={(e) => {
                  if (!hasClockIn) {
                    setSelectedWarehouseId(e.detail.value)
                  }
                }}>
                <View className="space-y-3">
                  {warehouses.map((warehouse) => {
                    const isSelected = selectedWarehouseId === warehouse.id
                    const isDisabled = hasClockIn && todayRecord?.warehouse_id !== warehouse.id
                    return (
                      <View
                        key={warehouse.id}
                        className={`border-2 rounded-xl p-4 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : isDisabled
                              ? 'border-gray-200 bg-gray-50 opacity-50'
                              : 'border-gray-200 bg-white'
                        }`}>
                        <Radio
                          value={warehouse.id}
                          checked={isSelected}
                          disabled={isDisabled}
                          className="flex items-center">
                          <View className="flex items-center justify-between w-full">
                            <View className="flex items-center flex-1">
                              <View
                                className={`i-mdi-warehouse text-2xl mr-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                              />
                              <View className="flex-1">
                                <Text
                                  className={`text-base font-bold block mb-1 ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                                  {warehouse.name}
                                </Text>
                                {isSelected && currentRule && (
                                  <View className="mt-2">
                                    <View className="flex items-center mb-1">
                                      <View className="i-mdi-clock-outline text-sm text-gray-500 mr-1" />
                                      <Text className="text-xs text-gray-600">
                                        上班：{currentRule.work_start_time} | 下班：{currentRule.work_end_time}
                                      </Text>
                                    </View>
                                    <View className="flex items-center">
                                      <View className="i-mdi-information-outline text-sm text-gray-500 mr-1" />
                                      <Text className="text-xs text-gray-600">
                                        {requireClockOut ? '需要打下班卡' : '无需打下班卡'}
                                      </Text>
                                    </View>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        </Radio>
                      </View>
                    )
                  })}
                </View>
              </RadioGroup>
            )}
          </View>

          {/* 智能打卡按钮 */}
          <View className="mb-4">
            <Button
              size="default"
              className={`w-full h-20 rounded-2xl text-xl font-bold break-keep shadow-lg ${
                buttonInfo.disabled ? buttonInfo.disabledBgColor : buttonInfo.bgColor
              } text-white`}
              disabled={buttonInfo.disabled}
              onClick={handleSmartClock}>
              <View className="flex items-center justify-center">
                <View className={`${buttonInfo.icon} text-3xl mr-3`} />
                <Text className="text-xl font-bold">{buttonInfo.text}</Text>
              </View>
            </Button>
          </View>

          {/* 今日打卡记录 */}
          {todayRecord && (
            <View className="bg-white rounded-2xl p-5 shadow-md">
              <View className="flex items-center mb-4">
                <View className="i-mdi-clipboard-text text-blue-600 text-2xl mr-2" />
                <Text className="text-gray-800 text-lg font-bold">今日打卡记录</Text>
              </View>

              {/* 上班打卡 */}
              <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 mb-3">
                <View className="flex items-center justify-between mb-3">
                  <View className="flex items-center">
                    <View className="i-mdi-login text-blue-600 text-xl mr-2" />
                    <Text className="text-gray-700 text-base font-bold">上班打卡</Text>
                  </View>
                  {todayRecord.clock_in_time && (
                    <View
                      className={`px-3 py-1 rounded-full ${getStatusInfo(todayRecord.status).bgColor} flex items-center`}>
                      <View className={`${getStatusInfo(todayRecord.status).icon} text-sm mr-1`} />
                      <Text className={`text-xs font-bold ${getStatusInfo(todayRecord.status).color}`}>
                        {getStatusInfo(todayRecord.status).text}
                      </Text>
                    </View>
                  )}
                </View>
                {todayRecord.clock_in_time && (
                  <View>
                    <Text className="text-blue-900 text-2xl font-bold block mb-2">
                      {formatClockTime(todayRecord.clock_in_time)}
                    </Text>
                    <View className="flex items-center">
                      <View className="i-mdi-warehouse text-sm text-gray-600 mr-1" />
                      <Text className="text-gray-600 text-sm">
                        {warehouses.find((w) => w.id === todayRecord.warehouse_id)?.name || '未知仓库'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* 下班打卡 */}
              {requireClockOut && (
                <View
                  className={`rounded-xl p-4 ${
                    todayRecord.clock_out_time
                      ? 'bg-gradient-to-br from-orange-50 to-orange-100'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100'
                  }`}>
                  <View className="flex items-center justify-between mb-3">
                    <View className="flex items-center">
                      <View
                        className={`i-mdi-logout text-xl mr-2 ${todayRecord.clock_out_time ? 'text-orange-600' : 'text-gray-400'}`}
                      />
                      <Text
                        className={`text-base font-bold ${todayRecord.clock_out_time ? 'text-gray-700' : 'text-gray-400'}`}>
                        下班打卡
                      </Text>
                    </View>
                    {todayRecord.clock_out_time && todayRecord.status === 'early' && (
                      <View className={`px-3 py-1 rounded-full ${getStatusInfo('early').bgColor} flex items-center`}>
                        <View className={`${getStatusInfo('early').icon} text-sm mr-1`} />
                        <Text className={`text-xs font-bold ${getStatusInfo('early').color}`}>
                          {getStatusInfo('early').text}
                        </Text>
                      </View>
                    )}
                  </View>
                  {todayRecord.clock_out_time ? (
                    <View>
                      <Text className="text-orange-900 text-2xl font-bold block mb-2">
                        {formatClockTime(todayRecord.clock_out_time)}
                      </Text>
                      {todayRecord.work_hours && (
                        <View className="flex items-center">
                          <View className="i-mdi-timer text-sm text-gray-600 mr-1" />
                          <Text className="text-gray-600 text-sm">
                            工作时长：{todayRecord.work_hours.toFixed(2)} 小时
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text className="text-gray-400 text-base">未打卡</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* 温馨提示 */}
          <View className="bg-blue-50 rounded-xl p-4 mt-4 border border-blue-200">
            <View className="flex items-center mb-2">
              <View className="i-mdi-lightbulb-on text-blue-600 text-xl mr-2" />
              <Text className="text-blue-900 text-sm font-bold">温馨提示</Text>
            </View>
            <Text className="text-blue-800 text-xs leading-relaxed block mb-1">• 请在打卡前选择您所在的仓库</Text>
            <Text className="text-blue-800 text-xs leading-relaxed block mb-1">• 系统会自动判断迟到、早退等状态</Text>
            <Text className="text-blue-800 text-xs leading-relaxed block mb-1">
              • 上班打卡后，按钮会自动切换为下班打卡
            </Text>
            <Text className="text-blue-800 text-xs leading-relaxed block">• 部分仓库可能不需要打下班卡</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ClockIn
