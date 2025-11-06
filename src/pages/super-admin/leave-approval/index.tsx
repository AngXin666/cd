import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
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

  // 筛选条件
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [filterLeaveType, setFilterLeaveType] = useState<string>('all')
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all')
  const [filterDriver, setFilterDriver] = useState<string>('all')
  const [filterReviewer, setFilterReviewer] = useState<string>('all')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')
  const [showAdvancedFilter, setShowAdvancedFilter] = useState<boolean>(false)

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

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  const calculateLeaveDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
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

  // 过滤申请 - 增强版
  const filteredLeaveApplications = leaveApplications.filter((app) => {
    // 状态过滤
    if (filterStatus !== 'all' && app.status !== filterStatus) return false

    // 请假类型过滤
    if (filterLeaveType !== 'all' && app.type !== filterLeaveType) return false

    // 仓库过滤
    if (filterWarehouse !== 'all' && app.warehouse_id !== filterWarehouse) return false

    // 司机过滤
    if (filterDriver !== 'all' && app.user_id !== filterDriver) return false

    // 审批人过滤
    if (filterReviewer !== 'all') {
      if (filterReviewer === 'unreviewed' && app.reviewer_id !== null) return false
      if (filterReviewer !== 'unreviewed' && app.reviewer_id !== filterReviewer) return false
    }

    // 时间范围过滤
    if (filterStartDate && app.start_date < filterStartDate) return false
    if (filterEndDate && app.end_date > filterEndDate) return false

    // 搜索过滤（姓名、仓库、事由）
    if (searchKeyword) {
      const userName = getUserName(app.user_id).toLowerCase()
      const warehouseName = getWarehouseName(app.warehouse_id).toLowerCase()
      const reason = app.reason.toLowerCase()
      const keyword = searchKeyword.toLowerCase()
      return userName.includes(keyword) || warehouseName.includes(keyword) || reason.includes(keyword)
    }

    return true
  })

  const filteredResignationApplications = resignationApplications.filter((app) => {
    // 状态过滤
    if (filterStatus !== 'all' && app.status !== filterStatus) return false

    // 仓库过滤
    if (filterWarehouse !== 'all' && app.warehouse_id !== filterWarehouse) return false

    // 司机过滤
    if (filterDriver !== 'all' && app.user_id !== filterDriver) return false

    // 审批人过滤
    if (filterReviewer !== 'all') {
      if (filterReviewer === 'unreviewed' && app.reviewer_id !== null) return false
      if (filterReviewer !== 'unreviewed' && app.reviewer_id !== filterReviewer) return false
    }

    // 时间范围过滤
    if (filterStartDate && app.expected_date < filterStartDate) return false
    if (filterEndDate && app.expected_date > filterEndDate) return false

    // 搜索过滤（姓名、仓库、原因）
    if (searchKeyword) {
      const userName = getUserName(app.user_id).toLowerCase()
      const warehouseName = getWarehouseName(app.warehouse_id).toLowerCase()
      const reason = app.reason.toLowerCase()
      const keyword = searchKeyword.toLowerCase()
      return userName.includes(keyword) || warehouseName.includes(keyword) || reason.includes(keyword)
    }

    return true
  })

  // 获取所有司机列表（用于筛选）
  const driverProfiles = profiles.filter((p) => p.role === 'driver')

  // 获取所有审批人列表（用于筛选）
  const reviewerProfiles = profiles.filter((p) => p.role === 'manager' || p.role === 'super_admin')

  // 清空所有筛选条件
  const clearAllFilters = () => {
    setFilterStatus('all')
    setSearchKeyword('')
    setFilterLeaveType('all')
    setFilterWarehouse('all')
    setFilterDriver('all')
    setFilterReviewer('all')
    setFilterStartDate('')
    setFilterEndDate('')
  }

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
            {/* 搜索框 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-700 font-bold block mb-2">快速搜索</Text>
              <View className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                <View className="i-mdi-magnify text-xl text-gray-400 mr-2" />
                <Input
                  className="flex-1 text-sm"
                  placeholder="搜索司机姓名、仓库或事由"
                  value={searchKeyword}
                  onInput={(e) => setSearchKeyword(e.detail.value)}
                />
                {searchKeyword && (
                  <View className="i-mdi-close text-xl text-gray-400" onClick={() => setSearchKeyword('')} />
                )}
              </View>
            </View>

            {/* 状态筛选 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-700 font-bold block mb-2">审批状态</Text>
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

            {/* 高级筛选切换按钮 */}
            <View
              className="flex items-center justify-between py-2 border-t border-gray-200"
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}>
              <View className="flex items-center">
                <View className="i-mdi-filter-variant text-lg text-blue-900 mr-2" />
                <Text className="text-sm text-blue-900 font-bold">高级筛选</Text>
              </View>
              <View className={`i-mdi-chevron-${showAdvancedFilter ? 'up' : 'down'} text-xl text-blue-900`} />
            </View>

            {/* 高级筛选选项 */}
            {showAdvancedFilter && (
              <View className="mt-3 pt-3 border-t border-gray-200">
                {/* 请假类型筛选（仅请假申请） */}
                {activeTab === 'leave' && (
                  <View className="mb-3">
                    <Text className="text-sm text-gray-700 font-bold block mb-2">请假类型</Text>
                    <View className="flex gap-2 flex-wrap">
                      <View
                        className={`px-3 py-2 rounded-lg border ${filterLeaveType === 'all' ? 'bg-blue-50 border-blue-900' : 'border-gray-300'}`}
                        onClick={() => setFilterLeaveType('all')}>
                        <Text
                          className={`text-xs ${filterLeaveType === 'all' ? 'text-blue-900 font-bold' : 'text-gray-600'}`}>
                          全部
                        </Text>
                      </View>
                      <View
                        className={`px-3 py-2 rounded-lg border ${filterLeaveType === 'sick_leave' ? 'bg-blue-50 border-blue-900' : 'border-gray-300'}`}
                        onClick={() => setFilterLeaveType('sick_leave')}>
                        <Text
                          className={`text-xs ${filterLeaveType === 'sick_leave' ? 'text-blue-900 font-bold' : 'text-gray-600'}`}>
                          病假
                        </Text>
                      </View>
                      <View
                        className={`px-3 py-2 rounded-lg border ${filterLeaveType === 'personal_leave' ? 'bg-blue-50 border-blue-900' : 'border-gray-300'}`}
                        onClick={() => setFilterLeaveType('personal_leave')}>
                        <Text
                          className={`text-xs ${filterLeaveType === 'personal_leave' ? 'text-blue-900 font-bold' : 'text-gray-600'}`}>
                          事假
                        </Text>
                      </View>
                      <View
                        className={`px-3 py-2 rounded-lg border ${filterLeaveType === 'annual_leave' ? 'bg-blue-50 border-blue-900' : 'border-gray-300'}`}
                        onClick={() => setFilterLeaveType('annual_leave')}>
                        <Text
                          className={`text-xs ${filterLeaveType === 'annual_leave' ? 'text-blue-900 font-bold' : 'text-gray-600'}`}>
                          年假
                        </Text>
                      </View>
                      <View
                        className={`px-3 py-2 rounded-lg border ${filterLeaveType === 'other' ? 'bg-blue-50 border-blue-900' : 'border-gray-300'}`}
                        onClick={() => setFilterLeaveType('other')}>
                        <Text
                          className={`text-xs ${filterLeaveType === 'other' ? 'text-blue-900 font-bold' : 'text-gray-600'}`}>
                          其他
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 仓库筛选 */}
                <View className="mb-3">
                  <Text className="text-sm text-gray-700 font-bold block mb-2">所属仓库</Text>
                  <Picker
                    mode="selector"
                    range={['全部仓库', ...warehouses.map((w) => w.name)]}
                    value={
                      filterWarehouse === 'all'
                        ? 0
                        : Math.max(0, warehouses.findIndex((w) => w.id === filterWarehouse) + 1)
                    }
                    onChange={(e) => {
                      const index = Number(e.detail.value)
                      setFilterWarehouse(index === 0 ? 'all' : warehouses[index - 1]?.id || 'all')
                    }}>
                    <View className="border border-gray-300 rounded-lg px-3 py-2">
                      <Text className="text-sm text-gray-800">
                        {filterWarehouse === 'all' ? '全部仓库' : getWarehouseName(filterWarehouse)}
                      </Text>
                    </View>
                  </Picker>
                </View>

                {/* 司机筛选 */}
                <View className="mb-3">
                  <Text className="text-sm text-gray-700 font-bold block mb-2">当事人（司机）</Text>
                  <Picker
                    mode="selector"
                    range={['全部司机', ...driverProfiles.map((p) => p.name || p.phone || '未知')]}
                    value={
                      filterDriver === 'all'
                        ? 0
                        : Math.max(0, driverProfiles.findIndex((p) => p.id === filterDriver) + 1)
                    }
                    onChange={(e) => {
                      const index = Number(e.detail.value)
                      setFilterDriver(index === 0 ? 'all' : driverProfiles[index - 1]?.id || 'all')
                    }}>
                    <View className="border border-gray-300 rounded-lg px-3 py-2">
                      <Text className="text-sm text-gray-800">
                        {filterDriver === 'all' ? '全部司机' : getUserName(filterDriver)}
                      </Text>
                    </View>
                  </Picker>
                </View>

                {/* 审批人筛选 */}
                <View className="mb-3">
                  <Text className="text-sm text-gray-700 font-bold block mb-2">审批人</Text>
                  <Picker
                    mode="selector"
                    range={['全部', '未审批', ...reviewerProfiles.map((p) => p.name || p.phone || '未知')]}
                    value={
                      filterReviewer === 'all'
                        ? 0
                        : filterReviewer === 'unreviewed'
                          ? 1
                          : Math.max(0, reviewerProfiles.findIndex((p) => p.id === filterReviewer) + 2)
                    }
                    onChange={(e) => {
                      const index = Number(e.detail.value)
                      if (index === 0) {
                        setFilterReviewer('all')
                      } else if (index === 1) {
                        setFilterReviewer('unreviewed')
                      } else {
                        setFilterReviewer(reviewerProfiles[index - 2]?.id || 'all')
                      }
                    }}>
                    <View className="border border-gray-300 rounded-lg px-3 py-2">
                      <Text className="text-sm text-gray-800">
                        {filterReviewer === 'all'
                          ? '全部'
                          : filterReviewer === 'unreviewed'
                            ? '未审批'
                            : getUserName(filterReviewer)}
                      </Text>
                    </View>
                  </Picker>
                </View>

                {/* 时间范围筛选 */}
                <View className="mb-3">
                  <Text className="text-sm text-gray-700 font-bold block mb-2">时间范围</Text>
                  <View className="flex gap-2">
                    <View className="flex-1">
                      <Picker mode="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.detail.value)}>
                        <View className="border border-gray-300 rounded-lg px-3 py-2">
                          <Text className="text-xs text-gray-600">{filterStartDate || '开始日期'}</Text>
                        </View>
                      </Picker>
                    </View>
                    <View className="flex items-center">
                      <Text className="text-gray-600">至</Text>
                    </View>
                    <View className="flex-1">
                      <Picker mode="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.detail.value)}>
                        <View className="border border-gray-300 rounded-lg px-3 py-2">
                          <Text className="text-xs text-gray-600">{filterEndDate || '结束日期'}</Text>
                        </View>
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* 清空筛选按钮 */}
                <Button
                  size="default"
                  className="w-full bg-gray-100 text-gray-700 text-sm break-keep"
                  onClick={clearAllFilters}>
                  清空所有筛选条件
                </Button>
              </View>
            )}
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
                  <Text className="text-gray-500 block">暂无符合条件的请假申请记录</Text>
                </View>
              ) : (
                filteredLeaveApplications.map((app) => (
                  <View key={app.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                    {/* 标题栏 */}
                    <View className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                      <View className="flex items-center">
                        <View className="i-mdi-calendar-clock text-2xl text-blue-900 mr-2" />
                        <Text className="text-base font-bold text-gray-800">{getLeaveTypeText(app.type)}</Text>
                      </View>
                      <View
                        className={`px-3 py-1 rounded-full ${app.status === 'pending' ? 'bg-orange-50' : app.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Text className={`text-xs font-bold ${getStatusColor(app.status)}`}>
                          {getStatusText(app.status)}
                        </Text>
                      </View>
                    </View>

                    {/* 核心信息区 */}
                    <View className="mb-4">
                      {/* 当事人信息 */}
                      <View className="bg-blue-50 rounded-lg p-3 mb-3">
                        <View className="flex items-center mb-2">
                          <View className="i-mdi-account text-lg text-blue-900 mr-2" />
                          <Text className="text-sm text-blue-900 font-bold">当事人（司机）</Text>
                        </View>
                        <View className="flex items-center justify-between">
                          <Text className="text-sm text-gray-800 font-bold">{getUserName(app.user_id)}</Text>
                          <Text className="text-xs text-gray-600">{getWarehouseName(app.warehouse_id)}</Text>
                        </View>
                      </View>

                      {/* 请假详情 */}
                      <View className="space-y-2">
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
                    </View>

                    {/* 审批历史区 */}
                    {(app.reviewer_id || app.review_comment || app.reviewed_at) && (
                      <View className="bg-gray-50 rounded-lg p-3 mb-3">
                        <View className="flex items-center mb-2">
                          <View className="i-mdi-clipboard-check text-lg text-gray-700 mr-2" />
                          <Text className="text-sm text-gray-700 font-bold">审批历史</Text>
                        </View>
                        <View className="space-y-2">
                          {app.reviewer_id && (
                            <View className="flex items-center">
                              <Text className="text-xs text-gray-500 w-20">审批人：</Text>
                              <Text className="text-xs text-gray-800 font-medium">{getUserName(app.reviewer_id)}</Text>
                            </View>
                          )}
                          {app.reviewed_at && (
                            <View className="flex items-center">
                              <Text className="text-xs text-gray-500 w-20">审批时间：</Text>
                              <Text className="text-xs text-gray-800">{formatDateTime(app.reviewed_at)}</Text>
                            </View>
                          )}
                          {app.review_comment && (
                            <View>
                              <Text className="text-xs text-gray-500 block mb-1">审批意见：</Text>
                              <Text className="text-xs text-gray-800 bg-white rounded px-2 py-1">
                                {app.review_comment}
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

          {/* 离职申请列表 */}
          {activeTab === 'resignation' && (
            <View>
              {filteredResignationApplications.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-account-remove text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无符合条件的离职申请记录</Text>
                </View>
              ) : (
                filteredResignationApplications.map((app) => (
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

                    {/* 核心信息区 */}
                    <View className="mb-4">
                      {/* 当事人信息 */}
                      <View className="bg-orange-50 rounded-lg p-3 mb-3">
                        <View className="flex items-center mb-2">
                          <View className="i-mdi-account text-lg text-orange-600 mr-2" />
                          <Text className="text-sm text-orange-600 font-bold">当事人（司机）</Text>
                        </View>
                        <View className="flex items-center justify-between">
                          <Text className="text-sm text-gray-800 font-bold">{getUserName(app.user_id)}</Text>
                          <Text className="text-xs text-gray-600">{getWarehouseName(app.warehouse_id)}</Text>
                        </View>
                      </View>

                      {/* 离职详情 */}
                      <View className="space-y-2">
                        <View className="flex items-start">
                          <View className="i-mdi-calendar-check text-lg text-gray-600 mr-2 mt-0.5" />
                          <View className="flex-1">
                            <Text className="text-xs text-gray-500 block mb-1">预计离职日期</Text>
                            <Text className="text-sm text-gray-800 font-medium">{formatDate(app.expected_date)}</Text>
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
                    </View>

                    {/* 审批历史区 */}
                    {(app.reviewer_id || app.review_comment || app.reviewed_at) && (
                      <View className="bg-gray-50 rounded-lg p-3 mb-3">
                        <View className="flex items-center mb-2">
                          <View className="i-mdi-clipboard-check text-lg text-gray-700 mr-2" />
                          <Text className="text-sm text-gray-700 font-bold">审批历史</Text>
                        </View>
                        <View className="space-y-2">
                          {app.reviewer_id && (
                            <View className="flex items-center">
                              <Text className="text-xs text-gray-500 w-20">审批人：</Text>
                              <Text className="text-xs text-gray-800 font-medium">{getUserName(app.reviewer_id)}</Text>
                            </View>
                          )}
                          {app.reviewed_at && (
                            <View className="flex items-center">
                              <Text className="text-xs text-gray-500 w-20">审批时间：</Text>
                              <Text className="text-xs text-gray-800">{formatDateTime(app.reviewed_at)}</Text>
                            </View>
                          )}
                          {app.review_comment && (
                            <View>
                              <Text className="text-xs text-gray-500 block mb-1">审批意见：</Text>
                              <Text className="text-xs text-gray-800 bg-white rounded px-2 py-1">
                                {app.review_comment}
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

export default SuperAdminLeaveApproval
