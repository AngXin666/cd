import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getAllAttendanceRecords, getAllLeaveApplications, getAllProfiles, getAllWarehouses} from '@/db/api'
import type {AttendanceRecord, LeaveApplication, Profile, Warehouse} from '@/db/types'

const DriverAttendanceDetail: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [driverId, setDriverId] = useState<string>('')
  const [driverName, setDriverName] = useState<string>('')

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return dateStr.split('T')[0]
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 获取仓库名称
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
  }

  // 判断是否迟到
  const isLate = (clockInTime: string): boolean => {
    const date = new Date(clockInTime)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return hours > 9 || (hours === 9 && minutes > 0)
  }

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user) return

    // 获取路由参数
    const instance = Taro.getCurrentInstance()
    const params = instance.router?.params
    const driverIdParam = params?.driverId || ''
    const driverNameParam = decodeURIComponent(params?.driverName || '')

    setDriverId(driverIdParam)
    setDriverName(driverNameParam)

    showLoading({title: '加载中...'})

    try {
      // 获取所有仓库信息
      const allWarehouses = await getAllWarehouses()
      setWarehouses(allWarehouses)

      // 获取司机信息
      const allProfiles = await getAllProfiles()
      const driver = allProfiles.find((p) => p.id === driverIdParam)
      setDriverProfile(driver || null)

      // 获取当前月份
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      // 加载打卡记录
      const records = await getAllAttendanceRecords(year, month)
      const driverRecords = records.filter((r) => r.user_id === driverIdParam)
      setAttendanceRecords(driverRecords)

      // 加载请假记录
      const leaves = await getAllLeaveApplications()
      const driverLeaves = leaves.filter((l) => l.user_id === driverIdParam)
      setLeaveApplications(driverLeaves)
    } finally {
      Taro.hideLoading()
    }
  }, [user])

  useDidShow(() => {
    loadData()
  })

  // 获取请假类型文本
  const getLeaveTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      sick: '病假',
      personal: '事假',
      annual: '年假',
      other: '其他'
    }
    return typeMap[type] || type
  }

  // 获取审批状态文本和样式
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, {text: string; bgColor: string; textColor: string}> = {
      pending: {text: '待审批', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700'},
      approved: {text: '已批准', bgColor: 'bg-green-100', textColor: 'text-green-700'},
      rejected: {text: '已拒绝', bgColor: 'bg-red-100', textColor: 'text-red-700'}
    }
    return statusMap[status] || {text: status, bgColor: 'bg-gray-100', textColor: 'text-gray-700'}
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4">
          {/* 司机信息卡片 */}
          <View className="bg-white rounded-lg p-4 shadow mb-4">
            <View className="flex items-center gap-3 mb-3">
              <View className="i-mdi-account-circle text-4xl text-blue-600" />
              <View className="flex-1">
                <View className="flex items-center gap-2 mb-1 flex-wrap">
                  <Text className="text-xl font-bold text-gray-800">{driverName}</Text>
                  {driverProfile?.driver_type && (
                    <View
                      className={`px-2 py-0.5 rounded ${
                        driverProfile.driver_type === 'with_vehicle' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                      <Text
                        className={`text-xs font-bold ${
                          driverProfile.driver_type === 'with_vehicle' ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                        {driverProfile.driver_type === 'with_vehicle' ? '带车司机' : '纯司机'}
                      </Text>
                    </View>
                  )}
                </View>
                {driverProfile?.phone && (
                  <Text className="text-sm text-gray-600 block">{driverProfile.phone}</Text>
                )}
                {driverProfile?.license_plate && (
                  <Text className="text-sm text-gray-600 block">车牌：{driverProfile.license_plate}</Text>
                )}
              </View>
            </View>
          </View>

          {/* 打卡记录 */}
          <View className="mb-4">
            <Text className="text-lg font-bold text-gray-800 block mb-3">打卡记录</Text>
            {attendanceRecords.length === 0 ? (
              <View className="bg-white rounded-lg p-8 text-center shadow">
                <View className="i-mdi-clock-alert-outline text-5xl text-gray-300 mb-3 mx-auto" />
                <Text className="text-gray-400 text-sm block">暂无打卡记录</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {attendanceRecords
                  .sort((a, b) => new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime())
                  .map((record) => (
                    <View key={record.id} className="bg-white rounded-lg p-4 shadow">
                      <View className="flex items-center justify-between mb-3">
                        <View className="flex items-center gap-2">
                          <View className="i-mdi-calendar text-lg text-blue-600" />
                          <Text className="text-base font-bold text-gray-800">
                            {formatDate(record.clock_in_time)}
                          </Text>
                        </View>
                        <View
                          className={`px-2 py-1 rounded ${
                            record.clock_out_time ? 'bg-green-100' : 'bg-yellow-100'
                          }`}>
                          <Text
                            className={`text-xs font-bold ${
                              record.clock_out_time ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                            {record.clock_out_time ? '已下班' : '未下班'}
                          </Text>
                        </View>
                      </View>

                      <View className="space-y-2">
                        <View className="flex items-center gap-2">
                          <View className="i-mdi-clock-in text-base text-gray-600" />
                          <Text className="text-sm text-gray-700">上班：{formatTime(record.clock_in_time)}</Text>
                          {isLate(record.clock_in_time) && (
                            <View className="px-2 py-0.5 rounded bg-red-100">
                              <Text className="text-xs font-bold text-red-700">迟到</Text>
                            </View>
                          )}
                        </View>

                        {record.clock_out_time && (
                          <View className="flex items-center gap-2">
                            <View className="i-mdi-clock-out text-base text-gray-600" />
                            <Text className="text-sm text-gray-700">
                              下班：{formatTime(record.clock_out_time)}
                            </Text>
                          </View>
                        )}

                        {record.warehouse_id && (
                          <View className="flex items-center gap-2">
                            <View className="i-mdi-warehouse text-base text-gray-600" />
                            <Text className="text-sm text-gray-700">
                              仓库：{getWarehouseName(record.warehouse_id)}
                            </Text>
                          </View>
                        )}

                        {record.location && (
                          <View className="flex items-center gap-2">
                            <View className="i-mdi-map-marker text-base text-gray-600" />
                            <Text className="text-sm text-gray-700">位置：{record.location}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
              </View>
            )}
          </View>

          {/* 请假记录 */}
          <View className="mb-4">
            <Text className="text-lg font-bold text-gray-800 block mb-3">请假记录</Text>
            {leaveApplications.length === 0 ? (
              <View className="bg-white rounded-lg p-8 text-center shadow">
                <View className="i-mdi-calendar-remove-outline text-5xl text-gray-300 mb-3 mx-auto" />
                <Text className="text-gray-400 text-sm block">暂无请假记录</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {leaveApplications
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((leave) => {
                    const statusInfo = getStatusInfo(leave.status)
                    return (
                      <View key={leave.id} className="bg-white rounded-lg p-4 shadow">
                        <View className="flex items-center justify-between mb-3">
                          <View className="flex items-center gap-2">
                            <View className="i-mdi-calendar-clock text-lg text-orange-600" />
                            <Text className="text-base font-bold text-gray-800">
                              {getLeaveTypeText(leave.type)}
                            </Text>
                          </View>
                          <View className={`px-2 py-1 rounded ${statusInfo.bgColor}`}>
                            <Text className={`text-xs font-bold ${statusInfo.textColor}`}>
                              {statusInfo.text}
                            </Text>
                          </View>
                        </View>

                        <View className="space-y-2">
                          <View className="flex items-center gap-2">
                            <View className="i-mdi-calendar-start text-base text-gray-600" />
                            <Text className="text-sm text-gray-700">
                              开始：{formatDate(leave.start_date)}
                            </Text>
                          </View>

                          <View className="flex items-center gap-2">
                            <View className="i-mdi-calendar-end text-base text-gray-600" />
                            <Text className="text-sm text-gray-700">结束：{formatDate(leave.end_date)}</Text>
                          </View>

                          {leave.reason && (
                            <View className="flex items-start gap-2">
                              <View className="i-mdi-text text-base text-gray-600 mt-0.5" />
                              <Text className="text-sm text-gray-700 flex-1">原因：{leave.reason}</Text>
                            </View>
                          )}

                          {leave.review_comment && (
                            <View className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-100">
                              <View className="i-mdi-comment-text text-base text-gray-600 mt-0.5" />
                              <Text className="text-sm text-gray-700 flex-1">
                                审批意见：{leave.review_comment}
                              </Text>
                            </View>
                          )}

                          {leave.reviewed_at && (
                            <View className="flex items-center gap-2">
                              <View className="i-mdi-clock-check text-base text-gray-600" />
                              <Text className="text-xs text-gray-500">
                                审批时间：{formatDate(leave.reviewed_at)} {formatTime(leave.reviewed_at)}
                              </Text>
                            </View>
                          )}
                        </View>
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

export default DriverAttendanceDetail
