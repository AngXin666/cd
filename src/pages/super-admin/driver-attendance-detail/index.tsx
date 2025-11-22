import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {
  getAllAttendanceRecords,
  getAllLeaveApplications,
  getAllProfiles,
  getAllWarehouses,
  reviewLeaveApplication
} from '@/db/api'
import type {AttendanceRecord, LeaveApplication, Profile, Warehouse} from '@/db/types'

const DriverAttendanceDetail: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [_driverId, setDriverId] = useState<string>('')
  const [driverName, setDriverName] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance')

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

  // 审批请假申请
  const handleReviewLeave = useCallback(
    async (leaveId: string, status: 'approved' | 'rejected') => {
      if (!user) return

      const actionText = status === 'approved' ? '批准' : '拒绝'

      try {
        const result = await showModal({
          title: `确认${actionText}`,
          content: `确定要${actionText}这条请假申请吗？`,
          confirmText: '确定',
          cancelText: '取消'
        })

        if (!result.confirm) return

        showLoading({title: '处理中...'})

        const success = await reviewLeaveApplication(leaveId, {
          status,
          reviewed_by: user.id,
          review_notes: undefined,
          reviewed_at: new Date().toISOString()
        })

        Taro.hideLoading()

        if (success) {
          await showToast({
            title: `${actionText}成功`,
            icon: 'success',
            duration: 2000
          })
          // 重新加载数据
          await loadData()
        } else {
          await showToast({
            title: `${actionText}失败`,
            icon: 'error',
            duration: 2000
          })
        }
      } catch (error) {
        Taro.hideLoading()
        console.error('审批请假申请失败:', error)
        await showToast({
          title: '操作失败',
          icon: 'error',
          duration: 2000
        })
      }
    },
    [user, loadData]
  )

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4">
          {/* 司机信息卡片 */}
          <View className="bg-white rounded-2xl p-5 shadow-lg mb-4">
            <View className="flex items-center gap-3">
              <View className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <View className="i-mdi-account text-4xl text-white" />
              </View>
              <View className="flex-1">
                <View className="flex items-center gap-2 mb-2 flex-wrap">
                  <Text className="text-2xl font-bold text-gray-800">{driverName}</Text>
                  {driverProfile?.driver_type && (
                    <View
                      className={`px-3 py-1 rounded-full ${
                        driverProfile.driver_type === 'with_vehicle' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                      <Text
                        className={`text-sm font-bold ${
                          driverProfile.driver_type === 'with_vehicle' ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                        {driverProfile.driver_type === 'with_vehicle' ? '带车司机' : '纯司机'}
                      </Text>
                    </View>
                  )}
                </View>
                {driverProfile?.phone && (
                  <View className="flex items-center gap-2 mb-1">
                    <View className="i-mdi-phone text-lg text-gray-500" />
                    <Text className="text-base text-gray-600">{driverProfile.phone}</Text>
                  </View>
                )}
                {driverProfile?.license_plate && (
                  <View className="flex items-center gap-2">
                    <View className="i-mdi-car text-lg text-gray-500" />
                    <Text className="text-base text-gray-600">{driverProfile.license_plate}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* 标签页切换 */}
          <View className="bg-white rounded-2xl shadow-lg mb-4 overflow-hidden">
            <View className="flex">
              <View
                className={`flex-1 py-4 text-center cursor-pointer transition-all ${
                  activeTab === 'attendance' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-white'
                }`}
                onClick={() => setActiveTab('attendance')}>
                <View className="flex items-center justify-center gap-2">
                  <View
                    className={`i-mdi-clock-check-outline text-2xl ${
                      activeTab === 'attendance' ? 'text-white' : 'text-gray-400'
                    }`}
                  />
                  <Text className={`text-lg font-bold ${activeTab === 'attendance' ? 'text-white' : 'text-gray-500'}`}>
                    打卡记录
                  </Text>
                </View>
              </View>
              <View
                className={`flex-1 py-4 text-center cursor-pointer transition-all ${
                  activeTab === 'leave' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-white'
                }`}
                onClick={() => setActiveTab('leave')}>
                <View className="flex items-center justify-center gap-2">
                  <View
                    className={`i-mdi-calendar-clock text-2xl ${
                      activeTab === 'leave' ? 'text-white' : 'text-gray-400'
                    }`}
                  />
                  <Text className={`text-lg font-bold ${activeTab === 'leave' ? 'text-white' : 'text-gray-500'}`}>
                    请假记录
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 打卡记录内容 */}
          {activeTab === 'attendance' && (
            <View>
              {attendanceRecords.length === 0 ? (
                <View className="bg-white rounded-2xl p-12 text-center shadow-lg">
                  <View className="i-mdi-clock-alert-outline text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-400 text-lg block">暂无打卡记录</Text>
                </View>
              ) : (
                <View className="space-y-4">
                  {attendanceRecords
                    .sort((a, b) => new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime())
                    .map((record) => (
                      <View key={record.id} className="bg-white rounded-2xl p-5 shadow-lg">
                        <View className="flex items-center justify-between mb-4">
                          <View className="flex items-center gap-3">
                            <View className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <View className="i-mdi-calendar text-2xl text-blue-600" />
                            </View>
                            <Text className="text-xl font-bold text-gray-800">{formatDate(record.clock_in_time)}</Text>
                          </View>
                          <View
                            className={`px-4 py-2 rounded-full ${
                              record.clock_out_time ? 'bg-green-100' : 'bg-yellow-100'
                            }`}>
                            <Text
                              className={`text-sm font-bold ${
                                record.clock_out_time ? 'text-green-700' : 'text-yellow-700'
                              }`}>
                              {record.clock_out_time ? '已下班' : '未下班'}
                            </Text>
                          </View>
                        </View>

                        <View className="space-y-3">
                          <View className="flex items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <View className="i-mdi-login text-xl text-green-600" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm text-gray-500 block mb-1">上班时间</Text>
                              <View className="flex items-center gap-2">
                                <Text className="text-lg font-bold text-gray-800">
                                  {formatTime(record.clock_in_time)}
                                </Text>
                                {isLate(record.clock_in_time) && (
                                  <View className="px-3 py-1 rounded-full bg-red-100">
                                    <Text className="text-sm font-bold text-red-700">迟到</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>

                          {record.clock_out_time && (
                            <View className="flex items-center gap-3">
                              <View className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <View className="i-mdi-logout text-xl text-orange-600" />
                              </View>
                              <View className="flex-1">
                                <Text className="text-sm text-gray-500 block mb-1">下班时间</Text>
                                <Text className="text-lg font-bold text-gray-800">
                                  {formatTime(record.clock_out_time)}
                                </Text>
                              </View>
                            </View>
                          )}

                          {record.warehouse_id && (
                            <View className="flex items-center gap-3">
                              <View className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <View className="i-mdi-warehouse text-xl text-purple-600" />
                              </View>
                              <View className="flex-1">
                                <Text className="text-sm text-gray-500 block mb-1">工作仓库</Text>
                                <Text className="text-lg font-bold text-gray-800">
                                  {getWarehouseName(record.warehouse_id)}
                                </Text>
                              </View>
                            </View>
                          )}

                          {record.location && (
                            <View className="flex items-center gap-3">
                              <View className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                                <View className="i-mdi-map-marker text-xl text-pink-600" />
                              </View>
                              <View className="flex-1">
                                <Text className="text-sm text-gray-500 block mb-1">打卡位置</Text>
                                <Text className="text-base text-gray-700">{record.location}</Text>
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}

          {/* 请假记录内容 */}
          {activeTab === 'leave' && (
            <View>
              {leaveApplications.length === 0 ? (
                <View className="bg-white rounded-2xl p-12 text-center shadow-lg">
                  <View className="i-mdi-calendar-remove-outline text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-400 text-lg block">暂无请假记录</Text>
                </View>
              ) : (
                <View className="space-y-4">
                  {leaveApplications
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((leave) => {
                      const statusInfo = getStatusInfo(leave.status)
                      return (
                        <View key={leave.id} className="bg-white rounded-2xl p-5 shadow-lg">
                          <View className="flex items-center justify-between mb-4">
                            <View className="flex items-center gap-3">
                              <View className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                <View className="i-mdi-calendar-clock text-2xl text-orange-600" />
                              </View>
                              <Text className="text-xl font-bold text-gray-800">
                                {getLeaveTypeText(leave.leave_type)}
                              </Text>
                            </View>
                            <View className={`px-4 py-2 rounded-full ${statusInfo.bgColor}`}>
                              <Text className={`text-sm font-bold ${statusInfo.textColor}`}>{statusInfo.text}</Text>
                            </View>
                          </View>

                          <View className="space-y-3">
                            <View className="flex items-center gap-3">
                              <View className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <View className="i-mdi-calendar-start text-xl text-green-600" />
                              </View>
                              <View className="flex-1">
                                <Text className="text-sm text-gray-500 block mb-1">开始日期</Text>
                                <Text className="text-lg font-bold text-gray-800">{formatDate(leave.start_date)}</Text>
                              </View>
                            </View>

                            <View className="flex items-center gap-3">
                              <View className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <View className="i-mdi-calendar-end text-xl text-red-600" />
                              </View>
                              <View className="flex-1">
                                <Text className="text-sm text-gray-500 block mb-1">结束日期</Text>
                                <Text className="text-lg font-bold text-gray-800">{formatDate(leave.end_date)}</Text>
                              </View>
                            </View>

                            {leave.reason && (
                              <View className="flex items-start gap-3 pt-3 border-t border-gray-100">
                                <View className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                                  <View className="i-mdi-text text-xl text-blue-600" />
                                </View>
                                <View className="flex-1">
                                  <Text className="text-sm text-gray-500 block mb-1">请假原因</Text>
                                  <Text className="text-base text-gray-700">{leave.reason}</Text>
                                </View>
                              </View>
                            )}

                            {leave.review_notes && (
                              <View className="flex items-start gap-3 pt-3 border-t border-gray-100">
                                <View className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mt-1">
                                  <View className="i-mdi-comment-text text-xl text-purple-600" />
                                </View>
                                <View className="flex-1">
                                  <Text className="text-sm text-gray-500 block mb-1">审批意见</Text>
                                  <Text className="text-base text-gray-700">{leave.review_notes}</Text>
                                </View>
                              </View>
                            )}

                            {leave.reviewed_at && (
                              <View className="flex items-center gap-3 pt-3 border-t border-gray-100">
                                <View className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                  <View className="i-mdi-clock-check text-xl text-gray-600" />
                                </View>
                                <View className="flex-1">
                                  <Text className="text-sm text-gray-500 block mb-1">审批时间</Text>
                                  <Text className="text-base text-gray-700">
                                    {formatDate(leave.reviewed_at)} {formatTime(leave.reviewed_at)}
                                  </Text>
                                </View>
                              </View>
                            )}

                            {/* 审批按钮 - 仅待审批状态显示 */}
                            {leave.status === 'pending' && (
                              <View className="flex items-center gap-3 pt-4 border-t border-gray-100 mt-3">
                                <Button
                                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl py-3 break-keep text-base"
                                  size="default"
                                  onClick={() => handleReviewLeave(leave.id, 'approved')}>
                                  批准
                                </Button>
                                <Button
                                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl py-3 break-keep text-base"
                                  size="default"
                                  onClick={() => handleReviewLeave(leave.id, 'rejected')}>
                                  拒绝
                                </Button>
                              </View>
                            )}
                          </View>
                        </View>
                      )
                    })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverAttendanceDetail
