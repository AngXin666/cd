import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showModal, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  deleteDraftLeaveApplication,
  deleteDraftResignationApplication,
  getCurrentUserProfile,
  getDraftLeaveApplications,
  getDraftResignationApplications,
  getDriverAttendanceStats,
  getDriverWarehouses,
  getLeaveApplicationsByUser,
  getResignationApplicationsByUser
} from '@/db/api'
import type {LeaveApplication, Profile, ResignationApplication} from '@/db/types'

const DriverLeave: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [_leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [_resignationApplications, setResignationApplications] = useState<ResignationApplication[]>([])
  const [_leaveDrafts, setLeaveDrafts] = useState<LeaveApplication[]>([])
  const [_resignationDrafts, setResignationDrafts] = useState<ResignationApplication[]>([])
  const [_activeTab, _setActiveTab] = useState<'leave' | 'resignation' | 'draft'>('leave')

  // 统计数据
  const [_stats, setStats] = useState({
    attendanceDays: 0,
    leaveDays: 0,
    remainingDays: 0,
    monthlyLimit: 0
  })
  const [_loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return

    const profileData = await getCurrentUserProfile()
    setProfile(profileData)

    const leaveData = await getLeaveApplicationsByUser(user.id)
    setLeaveApplications(leaveData)

    const resignationData = await getResignationApplicationsByUser(user.id)
    setResignationApplications(resignationData)

    const leaveDraftData = await getDraftLeaveApplications(user.id)
    setLeaveDrafts(leaveDraftData)

    const resignationDraftData = await getDraftResignationApplications(user.id)
    setResignationDrafts(resignationDraftData)
  }, [user])

  // 加载统计数据
  const loadStats = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // 获取本月的日期范围
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const firstDay = `${year}-${month}-01`
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
      const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

      // 获取本月考勤数据
      const attendanceData = await getDriverAttendanceStats(user.id, firstDay, lastDayStr)

      // 获取司机的仓库信息（用于获取月度请假上限）
      const warehouses = await getDriverWarehouses(user.id)
      let monthlyLimit = 0
      if (warehouses.length > 0) {
        // 使用第一个仓库的月度请假上限
        monthlyLimit = warehouses[0].max_leave_days || 0
      }

      // 计算剩余申请天数
      const remainingDays = Math.max(0, monthlyLimit - attendanceData.leaveDays)

      setStats({
        attendanceDays: attendanceData.attendanceDays,
        leaveDays: attendanceData.leaveDays,
        remainingDays,
        monthlyLimit
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
      showToast({
        title: '加载数据失败',
        icon: 'error',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadData()
    loadStats()
  }, [loadData, loadStats])

  useDidShow(() => {
    loadData()
    loadStats()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadData(), loadStats()])
    Taro.stopPullDownRefresh()
  })

  const _calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1
  }

  const _handleApplyLeave = () => {
    if (!profile) {
      showToast({title: '请先完善个人信息', icon: 'none'})
      return
    }
    navigateTo({url: '/pages/driver/leave/apply/index'})
  }

  const _handleApplyResignation = () => {
    if (!profile) {
      showToast({title: '请先完善个人信息', icon: 'none'})
      return
    }
    navigateTo({url: '/pages/driver/leave/resign/index'})
  }

  const _getStatusText = (status: string) => {
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

  const _getStatusColor = (status: string) => {
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

  const _getLeaveTypeText = (type: string) => {
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

  const _formatDate = (dateStr: string) => {
    return dateStr.split('T')[0]
  }

  const _handleEditDraft = (draftId: string, type: 'leave' | 'resignation') => {
    if (type === 'leave') {
      navigateTo({url: `/pages/driver/leave/apply/index?draftId=${draftId}`})
    } else {
      navigateTo({url: `/pages/driver/leave/resign/index?draftId=${draftId}`})
    }
  }

  const _handleDeleteDraft = async (draftId: string, type: 'leave' | 'resignation') => {
    const result = await showModal({
      title: '确认删除',
      content: '确定要删除这个草稿吗？',
      confirmText: '删除',
      cancelText: '取消'
    })

    if (result.confirm) {
      let success = false
      if (type === 'leave') {
        success = await deleteDraftLeaveApplication(draftId)
      } else {
        success = await deleteDraftResignationApplication(draftId)
      }

      if (success) {
        showToast({title: '删除成功', icon: 'success'})
        loadData()
      } else {
        showToast({title: '删除失败', icon: 'none'})
      }
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #fef2f2, #fee2e2)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 欢迎卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">请假与离职</Text>
            <Text className="text-blue-100 text-sm block">欢迎，{profile?.name || profile?.phone || '司机'}</Text>
          </View>

          {/* 数据仪表盘 */}
          <View className="mb-4">
            <View className="flex items-center mb-3">
              <View className="i-mdi-chart-box text-xl text-blue-900 mr-2" />
              <Text className="text-lg font-bold text-gray-800">本月数据统计</Text>
            </View>
            {_loading ? (
              <View className="bg-white rounded-xl p-8 shadow-md flex items-center justify-center">
                <Text className="text-gray-500">加载中...</Text>
              </View>
            ) : (
              <View className="bg-white rounded-xl p-4 shadow-md">
                <View className="grid grid-cols-3 gap-3">
                  {/* 本月出勤天数 */}
                  <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <View className="i-mdi-calendar-check text-2xl text-green-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">本月出勤</Text>
                    <Text className="text-2xl font-bold text-green-900 block">{_stats.attendanceDays}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">天</Text>
                  </View>

                  {/* 本月请假天数 */}
                  <View className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                    <View className="i-mdi-calendar-remove text-2xl text-orange-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">本月请假</Text>
                    <Text className="text-2xl font-bold text-orange-900 block">{_stats.leaveDays}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">天</Text>
                  </View>

                  {/* 剩余申请天数 */}
                  <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <View className="i-mdi-calendar-plus text-2xl text-blue-600 mb-2" />
                    <Text className="text-xs text-gray-600 block mb-1">剩余额度</Text>
                    <Text className="text-2xl font-bold text-blue-900 block">{_stats.remainingDays}</Text>
                    <Text className="text-xs text-gray-400 block mt-1">天</Text>
                  </View>
                </View>
                {_stats.monthlyLimit > 0 && (
                  <View className="mt-3 pt-3 border-t border-gray-200">
                    <Text className="text-xs text-gray-500 text-center block">
                      月度请假上限：{_stats.monthlyLimit} 天
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 快捷操作按钮 */}
          <View className="grid grid-cols-2 gap-4 mb-4">
            <Button
              className="text-sm break-keep"
              size="default"
              style={{
                backgroundColor: '#1E3A8A',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                padding: '16px'
              }}
              onClick={_handleApplyLeave}>
              <View className="flex flex-col items-center">
                <View className="i-mdi-calendar-clock text-3xl mb-2" />
                <Text className="text-sm">申请请假</Text>
              </View>
            </Button>
            <Button
              className="text-sm break-keep"
              size="default"
              style={{
                backgroundColor: '#F97316',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                padding: '16px'
              }}
              onClick={_handleApplyResignation}>
              <View className="flex flex-col items-center">
                <View className="i-mdi-account-remove text-3xl mb-2" />
                <Text className="text-sm">申请离职</Text>
              </View>
            </Button>
          </View>

          {/* 标签切换 */}
          <View className="flex mb-4 bg-white rounded-lg p-1 shadow">
            <View
              className={`flex-1 text-center py-2 rounded-lg ${_activeTab === 'leave' ? 'bg-blue-900' : ''}`}
              onClick={() => _setActiveTab('leave')}>
              <Text className={`text-sm ${_activeTab === 'leave' ? 'text-white font-bold' : 'text-gray-600'}`}>
                请假申请
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-2 rounded-lg ${_activeTab === 'resignation' ? 'bg-orange-600' : ''}`}
              onClick={() => _setActiveTab('resignation')}>
              <Text className={`text-sm ${_activeTab === 'resignation' ? 'text-white font-bold' : 'text-gray-600'}`}>
                离职申请
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-2 rounded-lg ${_activeTab === 'draft' ? 'bg-purple-600' : ''}`}
              onClick={() => _setActiveTab('draft')}>
              <Text className={`text-sm ${_activeTab === 'draft' ? 'text-white font-bold' : 'text-gray-600'}`}>
                草稿箱{' '}
                {_leaveDrafts.length + _resignationDrafts.length > 0 &&
                  `(${_leaveDrafts.length + _resignationDrafts.length})`}
              </Text>
            </View>
          </View>

          {/* 请假申请列表 */}
          {_activeTab === 'leave' && (
            <View>
              {_leaveApplications.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-calendar-blank text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无请假申请记录</Text>
                </View>
              ) : (
                _leaveApplications.map((app) => (
                  <View key={app.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                    <View className="flex items-center justify-between mb-3">
                      <View className="flex items-center">
                        <View className="i-mdi-calendar-clock text-2xl text-blue-900 mr-2" />
                        <Text className="text-base font-bold text-gray-800">{_getLeaveTypeText(app.leave_type)}</Text>
                      </View>
                      <Text className={`text-sm font-bold ${_getStatusColor(app.status)}`}>
                        {_getStatusText(app.status)}
                      </Text>
                    </View>
                    <View className="space-y-2">
                      <View>
                        <Text className="text-sm text-gray-600">请假时间：</Text>
                        <Text className="text-sm text-gray-800">
                          {_formatDate(app.start_date)} 至 {_formatDate(app.end_date)} （共
                          {_calculateDays(app.start_date, app.end_date)}天）
                        </Text>
                      </View>
                      <View>
                        <Text className="text-sm text-gray-600">请假事由：</Text>
                        <Text className="text-sm text-gray-800">{app.reason}</Text>
                      </View>
                      {app.review_comment && (
                        <View>
                          <Text className="text-sm text-gray-600">审批意见：</Text>
                          <Text className="text-sm text-gray-800">{app.review_comment}</Text>
                        </View>
                      )}
                      <View>
                        <Text className="text-xs text-gray-400">申请时间：{_formatDate(app.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* 离职申请列表 */}
          {_activeTab === 'resignation' && (
            <View>
              {_resignationApplications.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-account-remove text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无离职申请记录</Text>
                </View>
              ) : (
                _resignationApplications.map((app) => (
                  <View key={app.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                    <View className="flex items-center justify-between mb-3">
                      <View className="flex items-center">
                        <View className="i-mdi-account-remove text-2xl text-orange-600 mr-2" />
                        <Text className="text-base font-bold text-gray-800">离职申请</Text>
                      </View>
                      <Text className={`text-sm font-bold ${_getStatusColor(app.status)}`}>
                        {_getStatusText(app.status)}
                      </Text>
                    </View>
                    <View className="space-y-2">
                      <View>
                        <Text className="text-sm text-gray-600">预计离职日期：</Text>
                        <Text className="text-sm text-gray-800">{_formatDate(app.expected_date)}</Text>
                      </View>
                      <View>
                        <Text className="text-sm text-gray-600">离职原因：</Text>
                        <Text className="text-sm text-gray-800">{app.reason}</Text>
                      </View>
                      {app.review_comment && (
                        <View>
                          <Text className="text-sm text-gray-600">审批意见：</Text>
                          <Text className="text-sm text-gray-800">{app.review_comment}</Text>
                        </View>
                      )}
                      <View>
                        <Text className="text-xs text-gray-400">申请时间：{_formatDate(app.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* 草稿箱 */}
          {_activeTab === 'draft' && (
            <View>
              {_leaveDrafts.length === 0 && _resignationDrafts.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-file-document-outline text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无草稿</Text>
                </View>
              ) : (
                <View>
                  {/* 请假草稿 */}
                  {_leaveDrafts.length > 0 && (
                    <View className="mb-4">
                      <Text className="text-base font-bold text-gray-800 mb-2 block">请假草稿</Text>
                      {_leaveDrafts.map((draft) => (
                        <View
                          key={draft.id}
                          className="bg-purple-50 rounded-lg p-4 mb-3 shadow border-2 border-purple-200">
                          <View className="flex items-center justify-between mb-3">
                            <View className="flex items-center">
                              <View className="i-mdi-file-document-edit text-2xl text-purple-600 mr-2" />
                              <Text className="text-base font-bold text-gray-800">
                                {_getLeaveTypeText(draft.leave_type)}
                              </Text>
                            </View>
                            <View className="bg-purple-600 px-2 py-1 rounded">
                              <Text className="text-xs text-white">草稿</Text>
                            </View>
                          </View>
                          <View className="space-y-2 mb-3">
                            {draft.start_date && draft.end_date ? (
                              <View>
                                <Text className="text-sm text-gray-600">请假时间：</Text>
                                <Text className="text-sm text-gray-800">
                                  {_formatDate(draft.start_date)} 至 {_formatDate(draft.end_date)} （共
                                  {_calculateDays(draft.start_date, draft.end_date)}天）
                                </Text>
                              </View>
                            ) : (
                              <Text className="text-sm text-gray-500">请假时间：未填写</Text>
                            )}
                            {draft.reason ? (
                              <View>
                                <Text className="text-sm text-gray-600">请假事由：</Text>
                                <Text className="text-sm text-gray-800">{draft.reason}</Text>
                              </View>
                            ) : (
                              <Text className="text-sm text-gray-500">请假事由：未填写</Text>
                            )}
                            <View>
                              <Text className="text-xs text-gray-400">保存时间：{_formatDate(draft.created_at)}</Text>
                            </View>
                          </View>
                          <View className="flex gap-2">
                            <Button
                              className="text-xs break-keep flex-1"
                              size="mini"
                              style={{
                                backgroundColor: '#7C3AED',
                                color: 'white',
                                borderRadius: '6px',
                                border: 'none'
                              }}
                              onClick={() => _handleEditDraft(draft.id, 'leave')}>
                              继续编辑
                            </Button>
                            <Button
                              className="text-xs break-keep flex-1"
                              size="mini"
                              style={{
                                backgroundColor: '#EF4444',
                                color: 'white',
                                borderRadius: '6px',
                                border: 'none'
                              }}
                              onClick={() => _handleDeleteDraft(draft.id, 'leave')}>
                              删除
                            </Button>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 离职草稿 */}
                  {_resignationDrafts.length > 0 && (
                    <View>
                      <Text className="text-base font-bold text-gray-800 mb-2 block">离职草稿</Text>
                      {_resignationDrafts.map((draft) => (
                        <View
                          key={draft.id}
                          className="bg-purple-50 rounded-lg p-4 mb-3 shadow border-2 border-purple-200">
                          <View className="flex items-center justify-between mb-3">
                            <View className="flex items-center">
                              <View className="i-mdi-file-document-edit text-2xl text-purple-600 mr-2" />
                              <Text className="text-base font-bold text-gray-800">离职申请</Text>
                            </View>
                            <View className="bg-purple-600 px-2 py-1 rounded">
                              <Text className="text-xs text-white">草稿</Text>
                            </View>
                          </View>
                          <View className="space-y-2 mb-3">
                            {draft.expected_date ? (
                              <View>
                                <Text className="text-sm text-gray-600">预计离职日期：</Text>
                                <Text className="text-sm text-gray-800">{_formatDate(draft.expected_date)}</Text>
                              </View>
                            ) : (
                              <Text className="text-sm text-gray-500">预计离职日期：未填写</Text>
                            )}
                            {draft.reason ? (
                              <View>
                                <Text className="text-sm text-gray-600">离职原因：</Text>
                                <Text className="text-sm text-gray-800">{draft.reason}</Text>
                              </View>
                            ) : (
                              <Text className="text-sm text-gray-500">离职原因：未填写</Text>
                            )}
                            <View>
                              <Text className="text-xs text-gray-400">保存时间：{_formatDate(draft.created_at)}</Text>
                            </View>
                          </View>
                          <View className="flex gap-2">
                            <Button
                              className="text-xs break-keep flex-1"
                              size="mini"
                              style={{
                                backgroundColor: '#7C3AED',
                                color: 'white',
                                borderRadius: '6px',
                                border: 'none'
                              }}
                              onClick={() => _handleEditDraft(draft.id, 'resignation')}>
                              继续编辑
                            </Button>
                            <Button
                              className="text-xs break-keep flex-1"
                              size="mini"
                              style={{
                                backgroundColor: '#EF4444',
                                color: 'white',
                                borderRadius: '6px',
                                border: 'none'
                              }}
                              onClick={() => _handleDeleteDraft(draft.id, 'resignation')}>
                              删除
                            </Button>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverLeave
