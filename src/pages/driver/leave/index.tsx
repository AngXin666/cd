import {Button, ScrollView, Text, View} from '@tarojs/components'
import {navigateTo, showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  deleteDraftLeaveApplication,
  deleteDraftResignationApplication,
  getCurrentUserProfile,
  getDraftLeaveApplications,
  getDraftResignationApplications,
  getLeaveApplicationsByUser,
  getResignationApplicationsByUser,
  submitDraftLeaveApplication,
  submitDraftResignationApplication
} from '@/db/api'
import type {LeaveApplication, Profile, ResignationApplication} from '@/db/types'

const DriverLeave: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [resignationApplications, setResignationApplications] = useState<ResignationApplication[]>([])
  const [leaveDrafts, setLeaveDrafts] = useState<LeaveApplication[]>([])
  const [resignationDrafts, setResignationDrafts] = useState<ResignationApplication[]>([])
  const [activeTab, setActiveTab] = useState<'leave' | 'resignation' | 'draft'>('leave')

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

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  const handleApplyLeave = () => {
    if (!profile) {
      showToast({title: '请先完善个人信息', icon: 'none'})
      return
    }
    navigateTo({url: '/pages/driver/leave/apply/index'})
  }

  const handleApplyResignation = () => {
    if (!profile) {
      showToast({title: '请先完善个人信息', icon: 'none'})
      return
    }
    navigateTo({url: '/pages/driver/leave/resign/index'})
  }

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

  const getLeaveTypeText = (type: string) => {
    switch (type) {
      case 'sick_leave':
        return '病假'
      case 'personal_leave':
        return '事假'
      case 'annual_leave':
        return '年假'
      case 'other':
        return '其他'
      default:
        return type
    }
  }

  const formatDate = (dateStr: string) => {
    return dateStr.split('T')[0]
  }

  const handleEditDraft = (draftId: string, type: 'leave' | 'resignation') => {
    if (type === 'leave') {
      navigateTo({url: `/pages/driver/leave/apply/index?draftId=${draftId}`})
    } else {
      navigateTo({url: `/pages/driver/leave/resign/index?draftId=${draftId}`})
    }
  }

  const handleDeleteDraft = async (draftId: string, type: 'leave' | 'resignation') => {
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

  const handleSubmitDraft = async (
    draftId: string,
    type: 'leave' | 'resignation',
    draft: LeaveApplication | ResignationApplication
  ) => {
    // 验证必填字段
    if (type === 'leave') {
      const leaveDraft = draft as LeaveApplication
      if (!leaveDraft.start_date || !leaveDraft.end_date || !leaveDraft.reason?.trim()) {
        showToast({title: '请先完善草稿信息', icon: 'none'})
        return
      }
    } else {
      const resignDraft = draft as ResignationApplication
      if (!resignDraft.expected_date || !resignDraft.reason?.trim()) {
        showToast({title: '请先完善草稿信息', icon: 'none'})
        return
      }
    }

    const result = await showModal({
      title: '确认提交',
      content: '确定要提交这个申请吗？提交后将无法修改。',
      confirmText: '提交',
      cancelText: '取消'
    })

    if (result.confirm) {
      let success = false
      if (type === 'leave') {
        success = await submitDraftLeaveApplication(draftId)
      } else {
        success = await submitDraftResignationApplication(draftId)
      }

      if (success) {
        showToast({title: '提交成功', icon: 'success'})
        loadData()
      } else {
        showToast({title: '提交失败', icon: 'none'})
      }
    }
  }

  const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 欢迎卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">请假与离职</Text>
            <Text className="text-blue-100 text-sm block">欢迎，{profile?.name || profile?.phone || '司机'}</Text>
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
              onClick={handleApplyLeave}>
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
              onClick={handleApplyResignation}>
              <View className="flex flex-col items-center">
                <View className="i-mdi-account-remove text-3xl mb-2" />
                <Text className="text-sm">申请离职</Text>
              </View>
            </Button>
          </View>

          {/* 标签切换 */}
          <View className="flex mb-4 bg-white rounded-lg p-1 shadow">
            <View
              className={`flex-1 text-center py-2 rounded-lg ${activeTab === 'leave' ? 'bg-blue-900' : ''}`}
              onClick={() => setActiveTab('leave')}>
              <Text className={`text-sm ${activeTab === 'leave' ? 'text-white font-bold' : 'text-gray-600'}`}>
                请假申请
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-2 rounded-lg ${activeTab === 'resignation' ? 'bg-orange-600' : ''}`}
              onClick={() => setActiveTab('resignation')}>
              <Text className={`text-sm ${activeTab === 'resignation' ? 'text-white font-bold' : 'text-gray-600'}`}>
                离职申请
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-2 rounded-lg ${activeTab === 'draft' ? 'bg-purple-600' : ''}`}
              onClick={() => setActiveTab('draft')}>
              <Text className={`text-sm ${activeTab === 'draft' ? 'text-white font-bold' : 'text-gray-600'}`}>
                草稿箱{' '}
                {leaveDrafts.length + resignationDrafts.length > 0 &&
                  `(${leaveDrafts.length + resignationDrafts.length})`}
              </Text>
            </View>
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
                    <View className="flex items-center justify-between mb-3">
                      <View className="flex items-center">
                        <View className="i-mdi-calendar-clock text-2xl text-blue-900 mr-2" />
                        <Text className="text-base font-bold text-gray-800">{getLeaveTypeText(app.type)}</Text>
                      </View>
                      <Text className={`text-sm font-bold ${getStatusColor(app.status)}`}>
                        {getStatusText(app.status)}
                      </Text>
                    </View>
                    <View className="space-y-2">
                      <View>
                        <Text className="text-sm text-gray-600">请假时间：</Text>
                        <Text className="text-sm text-gray-800">
                          {formatDate(app.start_date)} 至 {formatDate(app.end_date)} （共
                          {calculateDays(app.start_date, app.end_date)}天）
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
                        <Text className="text-xs text-gray-400">申请时间：{formatDate(app.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                ))
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
                    <View className="flex items-center justify-between mb-3">
                      <View className="flex items-center">
                        <View className="i-mdi-account-remove text-2xl text-orange-600 mr-2" />
                        <Text className="text-base font-bold text-gray-800">离职申请</Text>
                      </View>
                      <Text className={`text-sm font-bold ${getStatusColor(app.status)}`}>
                        {getStatusText(app.status)}
                      </Text>
                    </View>
                    <View className="space-y-2">
                      <View>
                        <Text className="text-sm text-gray-600">预计离职日期：</Text>
                        <Text className="text-sm text-gray-800">{formatDate(app.expected_date)}</Text>
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
                        <Text className="text-xs text-gray-400">申请时间：{formatDate(app.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* 草稿箱 */}
          {activeTab === 'draft' && (
            <View>
              {leaveDrafts.length === 0 && resignationDrafts.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-file-document-outline text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无草稿</Text>
                </View>
              ) : (
                <View>
                  {/* 请假草稿 */}
                  {leaveDrafts.length > 0 && (
                    <View className="mb-4">
                      <Text className="text-base font-bold text-gray-800 mb-2 block">请假草稿</Text>
                      {leaveDrafts.map((draft) => (
                        <View
                          key={draft.id}
                          className="bg-purple-50 rounded-lg p-4 mb-3 shadow border-2 border-purple-200">
                          <View className="flex items-center justify-between mb-3">
                            <View className="flex items-center">
                              <View className="i-mdi-file-document-edit text-2xl text-purple-600 mr-2" />
                              <Text className="text-base font-bold text-gray-800">{getLeaveTypeText(draft.type)}</Text>
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
                                  {formatDate(draft.start_date)} 至 {formatDate(draft.end_date)} （共
                                  {calculateDays(draft.start_date, draft.end_date)}天）
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
                              <Text className="text-xs text-gray-400">保存时间：{formatDate(draft.created_at)}</Text>
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
                              onClick={() => handleEditDraft(draft.id, 'leave')}>
                              继续编辑
                            </Button>
                            <Button
                              className="text-xs break-keep flex-1"
                              size="mini"
                              style={{
                                backgroundColor: '#10B981',
                                color: 'white',
                                borderRadius: '6px',
                                border: 'none'
                              }}
                              onClick={() => handleSubmitDraft(draft.id, 'leave', draft)}>
                              直接提交
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
                              onClick={() => handleDeleteDraft(draft.id, 'leave')}>
                              删除
                            </Button>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 离职草稿 */}
                  {resignationDrafts.length > 0 && (
                    <View>
                      <Text className="text-base font-bold text-gray-800 mb-2 block">离职草稿</Text>
                      {resignationDrafts.map((draft) => (
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
                                <Text className="text-sm text-gray-800">{formatDate(draft.expected_date)}</Text>
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
                              <Text className="text-xs text-gray-400">保存时间：{formatDate(draft.created_at)}</Text>
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
                              onClick={() => handleEditDraft(draft.id, 'resignation')}>
                              继续编辑
                            </Button>
                            <Button
                              className="text-xs break-keep flex-1"
                              size="mini"
                              style={{
                                backgroundColor: '#10B981',
                                color: 'white',
                                borderRadius: '6px',
                                border: 'none'
                              }}
                              onClick={() => handleSubmitDraft(draft.id, 'resignation', draft)}>
                              直接提交
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
                              onClick={() => handleDeleteDraft(draft.id, 'resignation')}>
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
