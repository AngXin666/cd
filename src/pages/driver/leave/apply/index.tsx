import {Button, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import {navigateBack, showToast} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {createLeaveApplication, getCurrentUserProfile, getDriverWarehouses} from '@/db/api'
import type {LeaveType, Profile} from '@/db/types'

const ApplyLeave: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [leaveType, setLeaveType] = useState<LeaveType>('personal_leave')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const leaveTypes = [
    {label: '事假', value: 'personal_leave'},
    {label: '病假', value: 'sick_leave'},
    {label: '年假', value: 'annual_leave'},
    {label: '其他', value: 'other'}
  ]

  const loadData = useCallback(async () => {
    if (!user) return

    const profileData = await getCurrentUserProfile()
    setProfile(profileData)

    // 获取司机的仓库
    const warehouses = await getDriverWarehouses(user.id)
    if (warehouses.length > 0) {
      setWarehouseId(warehouses[0].id)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleLeaveTypeChange = (e: any) => {
    const index = e.detail.value
    setLeaveType(leaveTypes[index].value as LeaveType)
  }

  const handleStartDateChange = (e: any) => {
    setStartDate(e.detail.value)
  }

  const handleEndDateChange = (e: any) => {
    setEndDate(e.detail.value)
  }

  const handleSubmit = async () => {
    if (!user || !profile) {
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

    setSubmitting(true)

    const result = await createLeaveApplication({
      user_id: user.id,
      warehouse_id: warehouseId,
      type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim()
    })

    setSubmitting(false)

    if (result) {
      showToast({title: '提交成功', icon: 'success'})
      setTimeout(() => {
        navigateBack()
      }, 1500)
    } else {
      showToast({title: '提交失败，请重试', icon: 'none'})
    }
  }

  const getCurrentDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const selectedLeaveTypeLabel = leaveTypes.find((t) => t.value === leaveType)?.label || '事假'

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">申请请假</Text>
            <Text className="text-blue-100 text-sm block">请填写以下信息提交请假申请</Text>
          </View>

          {/* 表单 */}
          <View className="bg-white rounded-lg p-4 shadow">
            {/* 请假类型 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">请假类型</Text>
              <Picker mode="selector" range={leaveTypes.map((t) => t.label)} onChange={handleLeaveTypeChange}>
                <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                  <Text className="text-sm text-gray-800">{selectedLeaveTypeLabel}</Text>
                  <View className="i-mdi-chevron-down text-xl text-gray-400" />
                </View>
              </Picker>
            </View>

            {/* 开始日期 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">开始日期</Text>
              <Picker mode="date" value={startDate} start={getCurrentDate()} onChange={handleStartDateChange}>
                <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                  <Text className="text-sm text-gray-800">{startDate || '请选择开始日期'}</Text>
                  <View className="i-mdi-calendar text-xl text-gray-400" />
                </View>
              </Picker>
            </View>

            {/* 结束日期 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">结束日期</Text>
              <Picker mode="date" value={endDate} start={startDate || getCurrentDate()} onChange={handleEndDateChange}>
                <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                  <Text className="text-sm text-gray-800">{endDate || '请选择结束日期'}</Text>
                  <View className="i-mdi-calendar text-xl text-gray-400" />
                </View>
              </Picker>
            </View>

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

            {/* 提交按钮 */}
            <Button
              className="text-sm break-keep"
              size="default"
              style={{
                backgroundColor: submitting ? '#9CA3AF' : '#1E3A8A',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                padding: '12px',
                width: '100%'
              }}
              onClick={handleSubmit}
              disabled={submitting}>
              <Text className="text-sm">{submitting ? '提交中...' : '提交申请'}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ApplyLeave
