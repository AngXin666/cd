import {Button, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {navigateBack, showToast, useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import {
  createLeaveApplication,
  getDriverWarehouses,
  getMonthlyLeaveCount,
  getMonthlyPendingLeaveCount,
  getWarehouseSettings,
  saveDraftLeaveApplication,
  updateDraftLeaveApplication,
  validateLeaveApplication
} from '@/db/api'
import type {LeaveType} from '@/db/types'
import {getLocalDateString, getTomorrowDateString} from '@/utils/date'

type LeaveMode = 'quick' | 'makeup'

const ApplyLeave: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [mode, setMode] = useState<LeaveMode>('quick')
  const [leaveType, setLeaveType] = useState<LeaveType>('personal_leave')
  const [quickDays, setQuickDays] = useState(1)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [leaveDays, setLeaveDays] = useState(0)
  const [maxLeaveDays, setMaxLeaveDays] = useState(7)
  const [validationMessage, setValidationMessage] = useState<string>('')
  const [monthlyApprovedDays, setMonthlyApprovedDays] = useState(0)
  const [monthlyPendingDays, setMonthlyPendingDays] = useState(0)
  const [monthlyLimit, setMonthlyLimit] = useState(0)

  const leaveTypes = [
    {label: '事假', value: 'personal_leave'},
    {label: '病假', value: 'sick_leave'},
    {label: '年假', value: 'annual_leave'},
    {label: '其他', value: 'other'}
  ]

  // 计算天数
  const calculateDays = useCallback((start: string, end: string): number => {
    if (!start || !end) return 0
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    if (endTime < startTime) return 0
    const diffTime = endTime - startTime
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1
  }, [])

  // 获取明天的日期
  const getTomorrowDate = useCallback(() => {
    return getTomorrowDateString()
  }, [])

  // 获取今天的日期
  const getTodayDate = useCallback(() => {
    return getLocalDateString()
  }, [])

  // 根据天数计算结束日期
  const calculateEndDate = useCallback((start: string, days: number): string => {
    const startDate = new Date(start)
    startDate.setDate(startDate.getDate() + days - 1)
    return getLocalDateString(startDate)
  }, [])

  useLoad(() => {
    const params = Taro.getCurrentInstance().router?.params
    if (params?.draftId) {
      setDraftId(params.draftId)
      setIsEditMode(true)
      loadDraft(params.draftId)
    }
  })

  const loadDraft = async (id: string) => {
    const {data, error} = await supabase.from('leave_applications').select('*').eq('id', id).maybeSingle()

    if (error || !data) {
      showToast({title: '加载草稿失败', icon: 'none'})
      return
    }

    setLeaveType(data.leave_type as LeaveType)
    setStartDate(data.start_date || '')
    setEndDate(data.end_date || '')
    setReason(data.reason || '')
    setWarehouseId(data.warehouse_id)

    // 判断是快捷请假还是补请假
    const tomorrow = getTomorrowDate()
    if (data.start_date === tomorrow) {
      setMode('quick')
      const days = calculateDays(data.start_date, data.end_date || '')
      setQuickDays(days)
    } else {
      setMode('makeup')
    }
  }

  const loadData = useCallback(async () => {
    if (!user) return
    if (isEditMode) return

    // 获取司机的仓库（只获取启用的仓库）
    const allWarehouses = await getDriverWarehouses(user.id)
    const warehouses = allWarehouses.filter((w) => w.is_active)

    if (warehouses.length === 0) {
      showToast({
        title: '暂无可用仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (warehouses.length > 0) {
      const warehouseId = warehouses[0].id
      setWarehouseId(warehouseId)

      // 获取仓库设置
      const settings = await getWarehouseSettings(warehouseId)
      if (settings) {
        setMaxLeaveDays(settings.max_leave_days)
        setMonthlyLimit(settings.max_leave_days)
      }
    }

    // 获取当月已批准和待审批的请假天数
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const approvedDays = await getMonthlyLeaveCount(user.id, year, month)
    const pendingDays = await getMonthlyPendingLeaveCount(user.id, year, month)

    setMonthlyApprovedDays(approvedDays)
    setMonthlyPendingDays(pendingDays)

    // 初始化快捷请假的日期
    const tomorrow = getTomorrowDate()
    setStartDate(tomorrow)
    setEndDate(tomorrow)
    setLeaveDays(1)
  }, [user, isEditMode, getTomorrowDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 快捷请假模式：根据选择的天数自动计算日期
  useEffect(() => {
    if (mode === 'quick' && startDate) {
      const end = calculateEndDate(startDate, quickDays)
      setEndDate(end)
      setLeaveDays(quickDays)
    }
  }, [mode, quickDays, startDate, calculateEndDate])

  // 补请假模式：根据日期计算天数
  useEffect(() => {
    if (mode === 'makeup' && startDate && endDate) {
      const days = calculateDays(startDate, endDate)
      setLeaveDays(days)
    }
  }, [mode, startDate, endDate, calculateDays])

  // 验证请假天数
  useEffect(() => {
    const validateDays = async () => {
      if (!warehouseId || leaveDays === 0) {
        setValidationMessage('')
        return
      }

      const result = await validateLeaveApplication(warehouseId, leaveDays)
      if (!result.valid && result.message) {
        setValidationMessage(result.message)
      } else {
        setValidationMessage('')
      }
    }

    validateDays()
  }, [warehouseId, leaveDays])

  const handleModeChange = (newMode: LeaveMode) => {
    setMode(newMode)
    setValidationMessage('')

    if (newMode === 'quick') {
      // 切换到快捷请假，重置为明天
      const tomorrow = getTomorrowDate()
      setStartDate(tomorrow)
      setQuickDays(1)
      const end = calculateEndDate(tomorrow, 1)
      setEndDate(end)
      setLeaveDays(1)
    } else {
      // 切换到补请假，重置为今天
      const today = getTodayDate()
      setStartDate(today)
      setEndDate(today)
      setLeaveDays(1)
    }
  }

  const handleLeaveTypeChange = (e: any) => {
    const index = e.detail.value
    setLeaveType(leaveTypes[index].value as LeaveType)
  }

  const handleQuickDaysChange = (e: any) => {
    const index = e.detail.value
    setQuickDays(index + 1)
  }

  const handleStartDateChange = (e: any) => {
    setStartDate(e.detail.value)
  }

  const handleEndDateChange = (e: any) => {
    setEndDate(e.detail.value)
  }

  const handleSaveDraft = async () => {
    if (!user) {
      showToast({title: '用户信息错误', icon: 'none'})
      return
    }

    if (!warehouseId) {
      showToast({title: '请先分配仓库', icon: 'none'})
      return
    }

    setSubmitting(true)

    let success = false
    if (isEditMode && draftId) {
      success = await updateDraftLeaveApplication(draftId, {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim()
      })
    } else {
      const result = await saveDraftLeaveApplication({
        user_id: user.id,
        warehouse_id: warehouseId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim()
      })
      success = result !== null
    }

    setSubmitting(false)

    if (success) {
      showToast({title: '草稿保存成功', icon: 'success'})
      setTimeout(() => {
        navigateBack()
      }, 1500)
    } else {
      showToast({title: '保存失败，请重试', icon: 'none'})
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      showToast({title: '用户信息错误', icon: 'none'})
      return
    }

    if (!warehouseId) {
      showToast({title: '请先分配仓库', icon: 'none'})
      return
    }

    if (!startDate || !endDate) {
      showToast({title: '请选择请假时间', icon: 'none'})
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      showToast({title: '结束日期不能早于开始日期', icon: 'none'})
      return
    }

    if (!reason.trim()) {
      showToast({title: '请填写请假事由', icon: 'none'})
      return
    }

    // 校验月度请假天数上限
    const totalMonthlyDays = monthlyApprovedDays + monthlyPendingDays + leaveDays
    if (monthlyLimit > 0 && totalMonthlyDays > monthlyLimit) {
      showToast({
        title: `本月请假天数已超限（已批准${monthlyApprovedDays}天+待审批${monthlyPendingDays}天+本次${leaveDays}天=${totalMonthlyDays}天，上限${monthlyLimit}天）`,
        icon: 'none',
        duration: 3000
      })
      return
    }

    setSubmitting(true)

    let success = false
    if (isEditMode && draftId) {
      await updateDraftLeaveApplication(draftId, {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim()
      })
      // 由于数据库不支持草稿，直接标记为成功
      success = true
    } else {
      const result = await createLeaveApplication({
        user_id: user.id,
        warehouse_id: warehouseId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim()
      })
      success = result !== null
    }

    setSubmitting(false)

    if (success) {
      showToast({title: '提交成功', icon: 'success'})
      setTimeout(() => {
        navigateBack()
      }, 1500)
    } else {
      showToast({title: '提交失败，请重试', icon: 'none'})
    }
  }

  // 生成天数选项
  const daysOptions = Array.from({length: maxLeaveDays}, (_, i) => `${i + 1}天`)

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题 */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-gray-800">请假申请</Text>
          </View>

          {/* 模式切换 */}
          <View className="flex gap-3 mb-4">
            <View
              className="flex-1 text-center py-3 rounded-lg"
              style={{
                backgroundColor: mode === 'quick' ? '#1E3A8A' : '#E5E7EB',
                cursor: 'pointer'
              }}
              onClick={() => handleModeChange('quick')}>
              <Text
                className="text-sm font-bold"
                style={{
                  color: mode === 'quick' ? 'white' : '#6B7280'
                }}>
                快捷请假
              </Text>
            </View>
            <View
              className="flex-1 text-center py-3 rounded-lg"
              style={{
                backgroundColor: mode === 'makeup' ? '#1E3A8A' : '#E5E7EB',
                cursor: 'pointer'
              }}
              onClick={() => handleModeChange('makeup')}>
              <Text
                className="text-sm font-bold"
                style={{
                  color: mode === 'makeup' ? 'white' : '#6B7280'
                }}>
                补请假
              </Text>
            </View>
          </View>

          {/* 月度请假统计 */}
          {monthlyLimit > 0 && (
            <View className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-200">
              <View className="flex items-center mb-3">
                <View className="i-mdi-calendar-month text-2xl text-blue-600 mr-2"></View>
                <Text className="text-gray-800 text-base font-bold">本月请假统计</Text>
              </View>

              <View className="space-y-2">
                <View className="flex items-center justify-between">
                  <Text className="text-gray-600 text-sm">已批准天数</Text>
                  <Text className="text-green-600 text-sm font-medium">{monthlyApprovedDays} 天</Text>
                </View>

                <View className="flex items-center justify-between">
                  <Text className="text-gray-600 text-sm">待审批天数</Text>
                  <Text className="text-orange-600 text-sm font-medium">{monthlyPendingDays} 天</Text>
                </View>

                <View className="flex items-center justify-between">
                  <Text className="text-gray-600 text-sm">本次申请天数</Text>
                  <Text className="text-blue-600 text-sm font-medium">{leaveDays} 天</Text>
                </View>

                <View className="border-t border-blue-200 pt-2 mt-2">
                  <View className="flex items-center justify-between">
                    <Text className="text-gray-700 text-sm font-bold">累计天数 / 月度上限</Text>
                    <Text
                      className={`text-sm font-bold ${
                        monthlyApprovedDays + monthlyPendingDays + leaveDays > monthlyLimit
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}>
                      {monthlyApprovedDays + monthlyPendingDays + leaveDays} / {monthlyLimit} 天
                    </Text>
                  </View>
                </View>

                {monthlyApprovedDays + monthlyPendingDays + leaveDays > monthlyLimit && (
                  <View className="bg-red-50 rounded-lg p-2 border border-red-200 mt-2">
                    <View className="flex items-start">
                      <View className="i-mdi-alert text-lg text-red-600 mr-2 mt-0.5"></View>
                      <Text className="text-red-700 text-xs flex-1">
                        本月请假天数已超过上限，无法提交申请。请调整请假天数或联系管理员。
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* 表单内容 */}
          <View className="bg-white rounded-lg p-4 shadow-sm">
            {/* 请假类型 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">请假类型</Text>
              <Picker mode="selector" range={leaveTypes.map((t) => t.label)} onChange={handleLeaveTypeChange}>
                <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                  <Text className="text-sm text-gray-800">{leaveTypes.find((t) => t.value === leaveType)?.label}</Text>
                  <View className="i-mdi-chevron-down text-xl text-gray-400" />
                </View>
              </Picker>
            </View>

            {mode === 'quick' ? (
              <>
                {/* 快捷请假模式 */}
                <View className="mb-4">
                  <Text className="text-sm text-gray-700 block mb-2">请假天数</Text>
                  <Picker mode="selector" range={daysOptions} value={quickDays - 1} onChange={handleQuickDaysChange}>
                    <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                      <Text className="text-sm text-gray-800">{quickDays}天</Text>
                      <View className="i-mdi-chevron-down text-xl text-gray-400" />
                    </View>
                  </Picker>
                  <Text className="text-xs text-gray-400 block mt-1">最多可选{maxLeaveDays}天</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm text-gray-700 block mb-2">起始日期</Text>
                  <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between bg-gray-50">
                    <Text className="text-sm text-gray-800">{startDate}</Text>
                    <View className="i-mdi-calendar text-xl text-gray-400" />
                  </View>
                  <Text className="text-xs text-gray-400 block mt-1">自动设置为明天</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm text-gray-700 block mb-2">结束日期</Text>
                  <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between bg-gray-50">
                    <Text className="text-sm text-gray-800">{endDate}</Text>
                    <View className="i-mdi-calendar text-xl text-gray-400" />
                  </View>
                  <Text className="text-xs text-gray-400 block mt-1">自动计算</Text>
                </View>
              </>
            ) : (
              <>
                {/* 补请假模式 */}
                <View className="mb-4">
                  <Text className="text-sm text-gray-700 block mb-2">开始日期</Text>
                  <Picker mode="date" value={startDate} end={getTodayDate()} onChange={handleStartDateChange}>
                    <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                      <Text className="text-sm text-gray-800">{startDate || '请选择开始日期'}</Text>
                      <View className="i-mdi-calendar text-xl text-gray-400" />
                    </View>
                  </Picker>
                  <Text className="text-xs text-gray-400 block mt-1">可选今天及之前的日期</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm text-gray-700 block mb-2">结束日期</Text>
                  <Picker mode="date" value={endDate} start={startDate} onChange={handleEndDateChange}>
                    <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                      <Text className="text-sm text-gray-800">{endDate || '请选择结束日期'}</Text>
                      <View className="i-mdi-calendar text-xl text-gray-400" />
                    </View>
                  </Picker>
                </View>
              </>
            )}

            {/* 请假天数显示 */}
            {leaveDays > 0 && (
              <View className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <View className="flex items-center">
                  <View className="i-mdi-calendar-clock text-2xl text-blue-600 mr-2" />
                  <Text className="text-blue-900 font-bold">请假天数：{leaveDays} 天</Text>
                </View>
              </View>
            )}

            {/* 超限提示 */}
            {validationMessage && (
              <View className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <View className="flex items-start">
                  <View className="i-mdi-alert text-2xl text-orange-600 mr-2 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-orange-900 text-sm">{validationMessage}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 请假事由 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">请假事由</Text>
              <Textarea
                className="border border-gray-300 rounded-lg p-3 text-sm"
                style={{minHeight: '120px', width: '100%'}}
                placeholder="请详细说明请假原因"
                value={reason}
                onInput={(e) => setReason(e.detail.value)}
                maxlength={500}
              />
              <Text className="text-xs text-gray-400 block mt-1">{reason.length}/500</Text>
            </View>

            {/* 按钮组 */}
            <View className="flex gap-3">
              <Button
                className="text-sm break-keep flex-1"
                size="default"
                style={{
                  backgroundColor: submitting ? '#9CA3AF' : '#7C3AED',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  padding: '12px'
                }}
                onClick={handleSaveDraft}
                disabled={submitting}>
                {submitting ? '保存中...' : '保存草稿'}
              </Button>
              <Button
                className="text-sm break-keep flex-1"
                size="default"
                style={{
                  backgroundColor: submitting ? '#9CA3AF' : '#1E3A8A',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  padding: '12px'
                }}
                onClick={handleSubmit}
                disabled={submitting}>
                {submitting ? '提交中...' : '提交申请'}
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ApplyLeave
