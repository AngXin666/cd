import {Button, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  getAllAttendanceRecords,
  getAllLeaveApplications,
  getAllProfiles,
  getAllResignationApplications,
  getAllWarehouses,
  reviewLeaveApplication,
  reviewResignationApplication
} from '@/db/api'
import type {AttendanceRecord, LeaveApplication, Profile, ResignationApplication, Warehouse} from '@/db/types'

const DriverLeaveDetail: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [driverId, setDriverId] = useState<string>('')
  const [driver, setDriver] = useState<Profile | null>(null)
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [resignationApplications, setResignationApplications] = useState<ResignationApplication[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [activeTab, setActiveTab] = useState<'leave' | 'attendance' | 'resignation'>('leave')
  const [filterMonth, setFilterMonth] = useState<string>('')

  useEffect(() => {
    // 从路由参数获取司机ID
    const instance = Taro.getCurrentInstance()
    const params = instance.router?.params
    if (params?.driverId) {
      setDriverId(params.driverId)
    }
  }, [])

  // 加载数据
  const loadData = useCallback(async () => {
    if (!driverId) return

    // 获取所有仓库信息
    const allWarehouses = await getAllWarehouses()
    setWarehouses(allWarehouses)

    // 获取所有用户信息
    const allProfiles = await getAllProfiles()
    setProfiles(allProfiles)

    // 找到当前司机
    const currentDriver = allProfiles.find((p) => p.id === driverId)
    setDriver(currentDriver || null)

    // 获取该司机的所有请假申请
    const allLeaveApps = await getAllLeaveApplications()
    const driverLeaveApps = allLeaveApps.filter((app) => app.user_id === driverId)
    setLeaveApplications(driverLeaveApps)

    // 获取该司机的所有离职申请
    const allResignationApps = await getAllResignationApplications()
    const driverResignationApps = allResignationApps.filter((app) => app.user_id === driverId)
    setResignationApplications(driverResignationApps)

    // 获取该司机的所有打卡记录
    const allAttendanceRecords = await getAllAttendanceRecords()
    const driverAttendanceRecords = allAttendanceRecords.filter((record) => record.user_id === driverId)
    setAttendanceRecords(driverAttendanceRecords)
  }, [driverId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadData()])
    Taro.stopPullDownRefresh()
  })

  // 获取用户姓名
  const getUserName = (userId: string) => {
    const profile = profiles.find((p) => p.id === userId)
    return profile?.name || profile?.phone || '未知'
  }

  // 获取仓库名称
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return dateStr.split('T')[0]
  }

  // 格式化日期时间
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  // 计算请假天数
  const calculateLeaveDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  // 获取请假类型文本
  const getLeaveTypeText = (type: string) => {
    switch (type) {
      case 'sick':
        return '病假'
      case 'personal':
        return '事假'
      case 'annual':
        return '年假'
      case 'other':
        return '其他'
      default:
        return type
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待审批'
      case 'approved':
        return '已通过'
      case 'rejected':
        return '已驳回'
      default:
        return status
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-orange-600'
      case 'approved':
        return 'text-green-600'
      case 'rejected':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // 初始化当前月份
  const initCurrentMonth = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }, [])

  // 格式化时间显示
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--'
    const date = new Date(timeStr)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 获取打卡状态信息
  const getAttendanceStatusInfo = (record: AttendanceRecord) => {
    switch (record.status) {
      case 'late':
        return {text: '迟到', color: 'text-orange-600', bg: 'bg-orange-50'}
      case 'early':
        return {text: '早退', color: 'text-yellow-600', bg: 'bg-yellow-50'}
      case 'absent':
        return {text: '缺勤', color: 'text-red-600', bg: 'bg-red-50'}
      default:
        return {text: '正常', color: 'text-green-600', bg: 'bg-green-50'}
    }
  }

  // 生成月份选项
  const generateMonthOptions = () => {
    const options: string[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      options.push(`${year}-${month}`)
    }
    return options
  }

  // 获取可见的打卡记录
  const getVisibleAttendanceRecords = () => {
    let visible = attendanceRecords
    if (filterMonth) {
      visible = visible.filter((record) => record.work_date.startsWith(filterMonth))
    }
    return visible.sort((a, b) => b.work_date.localeCompare(a.work_date))
  }

  // 计算打卡统计数据
  const calculateAttendanceStats = () => {
    const visible = getVisibleAttendanceRecords()
    return {
      totalRecords: visible.length,
      normalCount: visible.filter((r) => r.status === 'normal').length,
      lateCount: visible.filter((r) => r.status === 'late').length,
      earlyCount: visible.filter((r) => r.status === 'early').length
    }
  }

  // 初始化月份筛选
  useEffect(() => {
    if (!filterMonth) {
      setFilterMonth(initCurrentMonth())
    }
  }, [filterMonth, initCurrentMonth])

  // 审批请假申请
  const handleApproveLeave = async (applicationId: string) => {
    if (!user) return

    const result = await Taro.showModal({
      title: '确认通过',
      content: '确定要通过这个请假申请吗？'
    })

    if (!result.confirm) return

    const success = await reviewLeaveApplication(applicationId, {
      status: 'approved',
      reviewer_id: user.id,
      review_comment: '已通过',
      reviewed_at: new Date().toISOString()
    })

    if (success) {
      Taro.showToast({title: '已通过', icon: 'success'})
      loadData()
    } else {
      Taro.showToast({title: '操作失败', icon: 'none'})
    }
  }

  // 驳回请假申请
  const handleRejectLeave = async (applicationId: string) => {
    if (!user) return

    const result = await Taro.showModal({
      title: '确认驳回',
      content: '确定要驳回这个请假申请吗？'
    })

    if (!result.confirm) return

    const success = await reviewLeaveApplication(applicationId, {
      status: 'rejected',
      reviewer_id: user.id,
      review_comment: '已驳回',
      reviewed_at: new Date().toISOString()
    })

    if (success) {
      Taro.showToast({title: '已驳回', icon: 'success'})
      loadData()
    } else {
      Taro.showToast({title: '操作失败', icon: 'none'})
    }
  }

  // 审批离职申请
  const handleApproveResignation = async (applicationId: string) => {
    if (!user) return

    const result = await Taro.showModal({
      title: '确认通过',
      content: '确定要通过这个离职申请吗？'
    })

    if (!result.confirm) return

    const success = await reviewResignationApplication(applicationId, {
      status: 'approved',
      reviewer_id: user.id,
      review_comment: '已通过',
      reviewed_at: new Date().toISOString()
    })

    if (success) {
      Taro.showToast({title: '已通过', icon: 'success'})
      loadData()
    } else {
      Taro.showToast({title: '操作失败', icon: 'none'})
    }
  }

  // 驳回离职申请
  const handleRejectResignation = async (applicationId: string) => {
    if (!user) return

    const result = await Taro.showModal({
      title: '确认驳回',
      content: '确定要驳回这个离职申请吗？'
    })

    if (!result.confirm) return

    const success = await reviewResignationApplication(applicationId, {
      status: 'rejected',
      reviewer_id: user.id,
      review_comment: '已驳回',
      reviewed_at: new Date().toISOString()
    })

    if (success) {
      Taro.showToast({title: '已驳回', icon: 'success'})
      loadData()
    } else {
      Taro.showToast({title: '操作失败', icon: 'none'})
    }
  }

  // 返回上一页
  const goBack = () => {
    Taro.navigateBack()
  }

  // 统计数据
  const totalLeaveDays = leaveApplications
    .filter((app) => app.status === 'approved')
    .reduce((sum, app) => sum + calculateLeaveDays(app.start_date, app.end_date), 0)
  const pendingLeaveCount = leaveApplications.filter((app) => app.status === 'pending').length
  const pendingResignationCount = resignationApplications.filter((app) => app.status === 'pending').length

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 返回按钮 */}
          <View className="mb-4" onClick={goBack}>
            <View className="flex items-center">
              <View className="i-mdi-arrow-left text-2xl text-blue-900 mr-2" />
              <Text className="text-sm text-blue-900 font-bold">返回</Text>
            </View>
          </View>

          {/* 司机信息卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <View className="flex items-center mb-3">
              <View className="i-mdi-account-circle text-5xl text-white mr-4" />
              <View>
                <Text className="text-white text-2xl font-bold block mb-1">
                  {driver?.name || driver?.phone || '未知司机'}
                </Text>
                <Text className="text-blue-100 text-sm block">司机详细记录</Text>
              </View>
            </View>
            <View className="grid grid-cols-3 gap-3 mt-4">
              <View className="text-center">
                <Text className="text-3xl font-bold text-white block">{totalLeaveDays}</Text>
                <Text className="text-xs text-blue-100">请假天数</Text>
              </View>
              <View className="text-center">
                <Text className="text-3xl font-bold text-white block">{leaveApplications.length}</Text>
                <Text className="text-xs text-blue-100">请假次数</Text>
              </View>
              <View className="text-center">
                <Text className="text-3xl font-bold text-white block">{resignationApplications.length}</Text>
                <Text className="text-xs text-blue-100">离职申请</Text>
              </View>
            </View>
          </View>

          {/* 待审批提示 */}
          {(pendingLeaveCount > 0 || pendingResignationCount > 0) && (
            <View className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <View className="flex items-center">
                <View className="i-mdi-alert-circle text-2xl text-orange-600 mr-3" />
                <View>
                  <Text className="text-sm text-orange-800 font-bold block">有待审批的申请</Text>
                  <Text className="text-xs text-orange-600">
                    请假申请 {pendingLeaveCount} 条，离职申请 {pendingResignationCount} 条
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 标签切换 */}
          <View
            className={`flex mb-4 bg-white rounded-lg p-1 shadow ${resignationApplications.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <View
              className={`flex-1 text-center py-3 rounded-lg ${activeTab === 'leave' ? 'bg-blue-900' : ''}`}
              onClick={() => setActiveTab('leave')}>
              <Text className={`text-sm font-bold ${activeTab === 'leave' ? 'text-white' : 'text-gray-600'}`}>
                请假申请 ({leaveApplications.length})
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-3 rounded-lg ${activeTab === 'attendance' ? 'bg-green-600' : ''}`}
              onClick={() => setActiveTab('attendance')}>
              <Text className={`text-sm font-bold ${activeTab === 'attendance' ? 'text-white' : 'text-gray-600'}`}>
                打卡记录 ({attendanceRecords.length})
              </Text>
            </View>
            {resignationApplications.length > 0 && (
              <View
                className={`flex-1 text-center py-3 rounded-lg ${activeTab === 'resignation' ? 'bg-orange-600' : ''}`}
                onClick={() => setActiveTab('resignation')}>
                <Text className={`text-sm font-bold ${activeTab === 'resignation' ? 'text-white' : 'text-gray-600'}`}>
                  离职申请 ({resignationApplications.length})
                </Text>
              </View>
            )}
          </View>

          {/* 请假申请列表 */}
          {activeTab === 'leave' && (
            <View>
              {leaveApplications.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-calendar-blank text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无请假申请记录</Text>
                </View>
              ) : (
                leaveApplications.map((app) => (
                  <View key={app.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                    {/* 标题栏 */}
                    <View className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                      <View className="flex items-center">
                        <View className="i-mdi-calendar-clock text-2xl text-blue-900 mr-2" />
                        <Text className="text-base font-bold text-gray-800">{getLeaveTypeText(app.leave_type)}</Text>
                      </View>
                      <View
                        className={`px-3 py-1 rounded-full ${app.status === 'pending' ? 'bg-orange-50' : app.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Text className={`text-xs font-bold ${getStatusColor(app.status)}`}>
                          {getStatusText(app.status)}
                        </Text>
                      </View>
                    </View>

                    {/* 请假详情 */}
                    <View className="space-y-2 mb-3">
                      <View className="flex items-start">
                        <View className="i-mdi-warehouse text-lg text-gray-600 mr-2 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 block mb-1">所属仓库</Text>
                          <Text className="text-sm text-gray-800">{getWarehouseName(app.warehouse_id)}</Text>
                        </View>
                      </View>

                      <View className="flex items-start">
                        <View className="i-mdi-calendar-range text-lg text-gray-600 mr-2 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 block mb-1">请假时间</Text>
                          <Text className="text-sm text-gray-800 font-medium">
                            {formatDate(app.start_date)} 至 {formatDate(app.end_date)}
                          </Text>
                          <Text className="text-xs text-blue-600 mt-1">
                            共 {calculateLeaveDays(app.start_date, app.end_date)} 天
                          </Text>
                        </View>
                      </View>

                      <View className="flex items-start">
                        <View className="i-mdi-text-box text-lg text-gray-600 mr-2 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 block mb-1">请假事由</Text>
                          <Text className="text-sm text-gray-800">{app.reason}</Text>
                        </View>
                      </View>

                      <View className="flex items-start">
                        <View className="i-mdi-clock-outline text-lg text-gray-600 mr-2 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 block mb-1">申请时间</Text>
                          <Text className="text-sm text-gray-800">{formatDateTime(app.created_at)}</Text>
                        </View>
                      </View>
                    </View>

                    {/* 审批历史区 */}
                    {(app.reviewed_by || app.review_notes || app.reviewed_at) && (
                      <View className="bg-gray-50 rounded-lg p-3 mb-3">
                        <View className="flex items-center mb-2">
                          <View className="i-mdi-clipboard-check text-lg text-gray-700 mr-2" />
                          <Text className="text-sm text-gray-700 font-bold">审批记录</Text>
                        </View>
                        <View className="space-y-2">
                          {app.reviewed_by && (
                            <View className="flex items-center">
                              <Text className="text-xs text-gray-500 w-20">审批人：</Text>
                              <Text className="text-xs text-gray-800 font-medium">{getUserName(app.reviewed_by)}</Text>
                            </View>
                          )}
                          {app.reviewed_at && (
                            <View className="flex items-center">
                              <Text className="text-xs text-gray-500 w-20">审批时间：</Text>
                              <Text className="text-xs text-gray-800">{formatDateTime(app.reviewed_at)}</Text>
                            </View>
                          )}
                          {app.review_notes && (
                            <View>
                              <Text className="text-xs text-gray-500 block mb-1">审批意见：</Text>
                              <Text className="text-xs text-gray-800 bg-white rounded px-2 py-1">
                                {app.review_notes}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* 操作按钮 */}
                    {app.status === 'pending' && (
                      <View className="flex gap-2">
                        <Button
                          className="text-xs break-keep"
                          size="default"
                          style={{
                            flex: 1,
                            backgroundColor: '#10B981',
                            color: 'white',
                            borderRadius: '8px',
                            border: 'none',
                            padding: '8px'
                          }}
                          onClick={() => handleApproveLeave(app.id)}>
                          <Text className="text-xs">通过</Text>
                        </Button>
                        <Button
                          className="text-xs break-keep"
                          size="default"
                          style={{
                            flex: 1,
                            backgroundColor: '#EF4444',
                            color: 'white',
                            borderRadius: '8px',
                            border: 'none',
                            padding: '8px'
                          }}
                          onClick={() => handleRejectLeave(app.id)}>
                          <Text className="text-xs">驳回</Text>
                        </Button>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* 打卡记录列表 */}
          {activeTab === 'attendance' && (
            <View>
              {/* 月份筛选 */}
              <View className="bg-white rounded-lg p-4 mb-4 shadow">
                <Text className="text-sm text-gray-700 font-bold block mb-2">选择月份</Text>
                <Picker
                  mode="selector"
                  range={generateMonthOptions()}
                  value={Math.max(0, generateMonthOptions().indexOf(filterMonth))}
                  onChange={(e) => {
                    const index = Number(e.detail.value)
                    setFilterMonth(generateMonthOptions()[index] || initCurrentMonth())
                  }}>
                  <View className="border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between">
                    <Text className="text-sm text-gray-800">{filterMonth || '请选择月份'}</Text>
                    <View className="i-mdi-chevron-down text-xl text-gray-400" />
                  </View>
                </Picker>
              </View>

              {/* 打卡统计 */}
              <View className="bg-white rounded-lg p-4 mb-4 shadow">
                <Text className="text-sm text-gray-700 font-bold block mb-3">打卡统计</Text>
                <View className="grid grid-cols-4 gap-3">
                  <View className="text-center">
                    <Text className="text-2xl font-bold text-blue-600 block">
                      {calculateAttendanceStats().totalRecords}
                    </Text>
                    <Text className="text-xs text-gray-500">总次数</Text>
                  </View>
                  <View className="text-center">
                    <Text className="text-2xl font-bold text-green-600 block">
                      {calculateAttendanceStats().normalCount}
                    </Text>
                    <Text className="text-xs text-gray-500">正常</Text>
                  </View>
                  <View className="text-center">
                    <Text className="text-2xl font-bold text-orange-600 block">
                      {calculateAttendanceStats().lateCount}
                    </Text>
                    <Text className="text-xs text-gray-500">迟到</Text>
                  </View>
                  <View className="text-center">
                    <Text className="text-2xl font-bold text-yellow-600 block">
                      {calculateAttendanceStats().earlyCount}
                    </Text>
                    <Text className="text-xs text-gray-500">早退</Text>
                  </View>
                </View>
              </View>

              {/* 打卡记录列表 */}
              {getVisibleAttendanceRecords().length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-clock-outline text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无打卡记录</Text>
                </View>
              ) : (
                getVisibleAttendanceRecords().map((record) => {
                  const statusInfo = getAttendanceStatusInfo(record)
                  return (
                    <View key={record.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                      {/* 日期和状态 */}
                      <View className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <View className="flex items-center">
                          <View className="i-mdi-calendar text-2xl text-blue-900 mr-2" />
                          <Text className="text-base font-bold text-gray-800">{record.work_date}</Text>
                        </View>
                        <View className={`px-3 py-1 rounded-full ${statusInfo.bg}`}>
                          <Text className={`text-xs font-bold ${statusInfo.color}`}>{statusInfo.text}</Text>
                        </View>
                      </View>

                      {/* 打卡时间信息 */}
                      <View className="space-y-2">
                        <View className="flex items-center justify-between">
                          <View className="flex items-center">
                            <View className="i-mdi-clock-in text-lg text-green-600 mr-2" />
                            <Text className="text-sm text-gray-600">上班打卡</Text>
                          </View>
                          <Text className="text-sm font-bold text-gray-800">{formatTime(record.clock_in_time)}</Text>
                        </View>
                        <View className="flex items-center justify-between">
                          <View className="flex items-center">
                            <View className="i-mdi-clock-out text-lg text-orange-600 mr-2" />
                            <Text className="text-sm text-gray-600">下班打卡</Text>
                          </View>
                          <Text className="text-sm font-bold text-gray-800">{formatTime(record.clock_out_time)}</Text>
                        </View>
                        {record.warehouse_id && (
                          <View className="flex items-center justify-between">
                            <View className="flex items-center">
                              <View className="i-mdi-warehouse text-lg text-blue-600 mr-2" />
                              <Text className="text-sm text-gray-600">仓库</Text>
                            </View>
                            <Text className="text-sm font-bold text-gray-800">
                              {getWarehouseName(record.warehouse_id)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )
                })
              )}
            </View>
          )}

          {/* 离职申请列表 */}
          {activeTab === 'resignation' && (
            <View>
              {resignationApplications.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-account-remove text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无离职申请记录</Text>
                </View>
              ) : (
                resignationApplications.map((app) => (
                  <View key={app.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                    {/* 标题栏 */}
                    <View className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                      <View className="flex items-center">
                        <View className="i-mdi-account-remove text-2xl text-orange-600 mr-2" />
                        <Text className="text-base font-bold text-gray-800">离职申请</Text>
                      </View>
                      <View
                        className={`px-3 py-1 rounded-full ${app.status === 'pending' ? 'bg-orange-50' : app.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Text className={`text-xs font-bold ${getStatusColor(app.status)}`}>
                          {getStatusText(app.status)}
                        </Text>
                      </View>
                    </View>

                    {/* 离职详情 */}
                    <View className="space-y-2 mb-3">
                      <View className="flex items-start">
                        <View className="i-mdi-warehouse text-lg text-gray-600 mr-2 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 block mb-1">所属仓库</Text>
                          <Text className="text-sm text-gray-800">{getWarehouseName(app.warehouse_id)}</Text>
                        </View>
                      </View>

                      <View className="flex items-start">
                        <View className="i-mdi-calendar-check text-lg text-gray-600 mr-2 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 block mb-1">预计离职日期</Text>
                          <Text className="text-sm text-gray-800 font-medium">{formatDate(app.resignation_date)}</Text>
                        </View>
                      </View>

                      <View className="flex items-start">
                        <View className="i-mdi-text-box text-lg text-gray-600 mr-2 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 block mb-1">离职原因</Text>
                          <Text className="text-sm text-gray-800">{app.reason}</Text>
                        </View>
                      </View>

                      <View className="flex items-start">
                        <View className="i-mdi-clock-outline text-lg text-gray-600 mr-2 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 block mb-1">申请时间</Text>
                          <Text className="text-sm text-gray-800">{formatDateTime(app.created_at)}</Text>
                        </View>
                      </View>
                    </View>

                    {/* 审批历史区 */}
                    {(app.reviewed_by || app.review_notes || app.reviewed_at) && (
                      <View className="bg-gray-50 rounded-lg p-3 mb-3">
                        <View className="flex items-center mb-2">
                          <View className="i-mdi-clipboard-check text-lg text-gray-700 mr-2" />
                          <Text className="text-sm text-gray-700 font-bold">审批记录</Text>
                        </View>
                        <View className="space-y-2">
                          {app.reviewed_by && (
                            <View className="flex items-center">
                              <Text className="text-xs text-gray-500 w-20">审批人：</Text>
                              <Text className="text-xs text-gray-800 font-medium">{getUserName(app.reviewed_by)}</Text>
                            </View>
                          )}
                          {app.reviewed_at && (
                            <View className="flex items-center">
                              <Text className="text-xs text-gray-500 w-20">审批时间：</Text>
                              <Text className="text-xs text-gray-800">{formatDateTime(app.reviewed_at)}</Text>
                            </View>
                          )}
                          {app.review_notes && (
                            <View>
                              <Text className="text-xs text-gray-500 block mb-1">审批意见：</Text>
                              <Text className="text-xs text-gray-800 bg-white rounded px-2 py-1">
                                {app.review_notes}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* 操作按钮 */}
                    {app.status === 'pending' && (
                      <View className="flex gap-2">
                        <Button
                          className="text-xs break-keep"
                          size="default"
                          style={{
                            flex: 1,
                            backgroundColor: '#10B981',
                            color: 'white',
                            borderRadius: '8px',
                            border: 'none',
                            padding: '8px'
                          }}
                          onClick={() => handleApproveResignation(app.id)}>
                          <Text className="text-xs">通过</Text>
                        </Button>
                        <Button
                          className="text-xs break-keep"
                          size="default"
                          style={{
                            flex: 1,
                            backgroundColor: '#EF4444',
                            color: 'white',
                            borderRadius: '8px',
                            border: 'none',
                            padding: '8px'
                          }}
                          onClick={() => handleRejectResignation(app.id)}>
                          <Text className="text-xs">驳回</Text>
                        </Button>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverLeaveDetail
