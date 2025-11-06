import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import {showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  getAllLeaveApplications,
  getAllProfiles,
  getAllResignationApplications,
  getAllWarehouses,
  reviewLeaveApplication,
  reviewResignationApplication
} from '@/db/api'
import type {LeaveApplication, Profile, ResignationApplication, Warehouse} from '@/db/types'

const SuperAdminLeaveApproval: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [resignationApplications, setResignationApplications] = useState<ResignationApplication[]>([])
  const [activeTab, setActiveTab] = useState<'leave' | 'resignation'>('leave')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState<string>('')

  const loadData = useCallback(async () => {
    // 获取所有仓库信息
    const allWarehouses = await getAllWarehouses()
    setWarehouses(allWarehouses)

    // 获取所有用户信息
    const allProfiles = await getAllProfiles()
    setProfiles(allProfiles)

    // 获取所有请假申请
    const allLeaveApps = await getAllLeaveApplications()
    setLeaveApplications(allLeaveApps)

    // 获取所有离职申请
    const allResignationApps = await getAllResignationApplications()
    setResignationApplications(allResignationApps)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  const getUserName = (userId: string) => {
    const profile = profiles.find((p) => p.id === userId)
    return profile?.name || profile?.phone || '未知用户'
  }

  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
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

  const handleApproveLeave = async (applicationId: string) => {
    if (!user) return

    const result = await showModal({
      title: '确认通过',
      content: '确定要通过这个请假申请吗？'
    })

    if (!result.confirm) return

    const success = await reviewLeaveApplication(applicationId, {
      status: 'approved',
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString()
    })

    if (success) {
      showToast({title: '审批成功', icon: 'success'})
      loadData()
    } else {
      showToast({title: '审批失败', icon: 'none'})
    }
  }

  const handleRejectLeave = async (applicationId: string) => {
    if (!user) return

    const result = await showModal({
      title: '驳回申请',
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
      showToast({title: '已驳回', icon: 'success'})
      loadData()
    } else {
      showToast({title: '操作失败', icon: 'none'})
    }
  }

  const handleApproveResignation = async (applicationId: string) => {
    if (!user) return

    const result = await showModal({
      title: '确认通过',
      content: '确定要通过这个离职申请吗？'
    })

    if (!result.confirm) return

    const success = await reviewResignationApplication(applicationId, {
      status: 'approved',
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString()
    })

    if (success) {
      showToast({title: '审批成功', icon: 'success'})
      loadData()
    } else {
      showToast({title: '审批失败', icon: 'none'})
    }
  }

  const handleRejectResignation = async (applicationId: string) => {
    if (!user) return

    const result = await showModal({
      title: '驳回申请',
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
      showToast({title: '已驳回', icon: 'success'})
      loadData()
    } else {
      showToast({title: '操作失败', icon: 'none'})
    }
  }

  // 过滤申请
  const filteredLeaveApplications = leaveApplications.filter((app) => {
    // 状态过滤
    if (filterStatus !== 'all' && app.status !== filterStatus) return false

    // 搜索过滤
    if (searchKeyword) {
      const userName = getUserName(app.user_id).toLowerCase()
      const warehouseName = getWarehouseName(app.warehouse_id).toLowerCase()
      const keyword = searchKeyword.toLowerCase()
      return userName.includes(keyword) || warehouseName.includes(keyword)
    }

    return true
  })

  const filteredResignationApplications = resignationApplications.filter((app) => {
    // 状态过滤
    if (filterStatus !== 'all' && app.status !== filterStatus) return false

    // 搜索过滤
    if (searchKeyword) {
      const userName = getUserName(app.user_id).toLowerCase()
      const warehouseName = getWarehouseName(app.warehouse_id).toLowerCase()
      const keyword = searchKeyword.toLowerCase()
      return userName.includes(keyword) || warehouseName.includes(keyword)
    }

    return true
  })

  // 统计数据
  const leaveStats = {
    total: leaveApplications.length,
    pending: leaveApplications.filter((a) => a.status === 'pending').length,
    approved: leaveApplications.filter((a) => a.status === 'approved').length,
    rejected: leaveApplications.filter((a) => a.status === 'rejected').length
  }

  const resignationStats = {
    total: resignationApplications.length,
    pending: resignationApplications.filter((a) => a.status === 'pending').length,
    approved: resignationApplications.filter((a) => a.status === 'approved').length,
    rejected: resignationApplications.filter((a) => a.status === 'rejected').length
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">请假离职审批</Text>
            <Text className="text-blue-100 text-sm block">超级管理员审批工作台</Text>
          </View>

          {/* 统计卡片 */}
          <View className="grid grid-cols-2 gap-4 mb-4">
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">请假申请</Text>
              <Text className="text-3xl font-bold text-blue-900 block mb-2">{leaveStats.total}</Text>
              <View className="flex gap-2 text-xs">
                <Text className="text-orange-600">待审{leaveStats.pending}</Text>
                <Text className="text-green-600">已通过{leaveStats.approved}</Text>
                <Text className="text-red-600">已驳回{leaveStats.rejected}</Text>
              </View>
            </View>
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">离职申请</Text>
              <Text className="text-3xl font-bold text-orange-600 block mb-2">{resignationStats.total}</Text>
              <View className="flex gap-2 text-xs">
                <Text className="text-orange-600">待审{resignationStats.pending}</Text>
                <Text className="text-green-600">已通过{resignationStats.approved}</Text>
                <Text className="text-red-600">已驳回{resignationStats.rejected}</Text>
              </View>
            </View>
          </View>

          {/* 搜索和筛选 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="mb-3">
              <Text className="text-sm text-gray-700 block mb-2">搜索</Text>
              <View className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                <View className="i-mdi-magnify text-xl text-gray-400 mr-2" />
                <Input
                  className="flex-1 text-sm"
                  placeholder="搜索姓名或仓库"
                  value={searchKeyword}
                  onInput={(e) => setSearchKeyword(e.detail.value)}
                />
                {searchKeyword && (
                  <View className="i-mdi-close text-xl text-gray-400" onClick={() => setSearchKeyword('')} />
                )}
              </View>
            </View>

            <View>
              <Text className="text-sm text-gray-700 block mb-2">状态筛选</Text>
              <View className="flex gap-2">
                <View
                  className={`flex-1 text-center py-2 rounded-lg border ${filterStatus === 'all' ? 'bg-blue-900 border-blue-900' : 'border-gray-300'}`}
                  onClick={() => setFilterStatus('all')}>
                  <Text className={`text-xs ${filterStatus === 'all' ? 'text-white font-bold' : 'text-gray-600'}`}>
                    全部
                  </Text>
                </View>
                <View
                  className={`flex-1 text-center py-2 rounded-lg border ${filterStatus === 'pending' ? 'bg-orange-600 border-orange-600' : 'border-gray-300'}`}
                  onClick={() => setFilterStatus('pending')}>
                  <Text className={`text-xs ${filterStatus === 'pending' ? 'text-white font-bold' : 'text-gray-600'}`}>
                    待审批
                  </Text>
                </View>
                <View
                  className={`flex-1 text-center py-2 rounded-lg border ${filterStatus === 'approved' ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}
                  onClick={() => setFilterStatus('approved')}>
                  <Text className={`text-xs ${filterStatus === 'approved' ? 'text-white font-bold' : 'text-gray-600'}`}>
                    已通过
                  </Text>
                </View>
                <View
                  className={`flex-1 text-center py-2 rounded-lg border ${filterStatus === 'rejected' ? 'bg-red-600 border-red-600' : 'border-gray-300'}`}
                  onClick={() => setFilterStatus('rejected')}>
                  <Text className={`text-xs ${filterStatus === 'rejected' ? 'text-white font-bold' : 'text-gray-600'}`}>
                    已驳回
                  </Text>
                </View>
              </View>
            </View>
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
          </View>

          {/* 请假申请列表 */}
          {activeTab === 'leave' && (
            <View>
              {filteredLeaveApplications.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-calendar-blank text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无请假申请记录</Text>
                </View>
              ) : (
                filteredLeaveApplications.map((app) => (
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
                    <View className="space-y-2 mb-3">
                      <View>
                        <Text className="text-sm text-gray-600">申请人：</Text>
                        <Text className="text-sm text-gray-800">{getUserName(app.user_id)}</Text>
                      </View>
                      <View>
                        <Text className="text-sm text-gray-600">所属仓库：</Text>
                        <Text className="text-sm text-gray-800">{getWarehouseName(app.warehouse_id)}</Text>
                      </View>
                      <View>
                        <Text className="text-sm text-gray-600">请假时间：</Text>
                        <Text className="text-sm text-gray-800">
                          {formatDate(app.start_date)} 至 {formatDate(app.end_date)}
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
                      {app.reviewer_id && (
                        <View>
                          <Text className="text-sm text-gray-600">审批人：</Text>
                          <Text className="text-sm text-gray-800">{getUserName(app.reviewer_id)}</Text>
                        </View>
                      )}
                    </View>
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

          {/* 离职申请列表 */}
          {activeTab === 'resignation' && (
            <View>
              {filteredResignationApplications.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-account-remove text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无离职申请记录</Text>
                </View>
              ) : (
                filteredResignationApplications.map((app) => (
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
                    <View className="space-y-2 mb-3">
                      <View>
                        <Text className="text-sm text-gray-600">申请人：</Text>
                        <Text className="text-sm text-gray-800">{getUserName(app.user_id)}</Text>
                      </View>
                      <View>
                        <Text className="text-sm text-gray-600">所属仓库：</Text>
                        <Text className="text-sm text-gray-800">{getWarehouseName(app.warehouse_id)}</Text>
                      </View>
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
                      {app.reviewer_id && (
                        <View>
                          <Text className="text-sm text-gray-600">审批人：</Text>
                          <Text className="text-sm text-gray-800">{getUserName(app.reviewer_id)}</Text>
                        </View>
                      )}
                    </View>
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

export default SuperAdminLeaveApproval
