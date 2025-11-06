import {Button, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import {navigateBack, showToast} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {createResignationApplication, getCurrentUserProfile, getDriverWarehouses} from '@/db/api'
import type {Profile} from '@/db/types'

const ApplyResignation: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [expectedDate, setExpectedDate] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

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

  const handleExpectedDateChange = (e: any) => {
    setExpectedDate(e.detail.value)
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

    if (!expectedDate) {
      showToast({title: '请选择预计离职日期', icon: 'none'})
      return
    }

    if (!reason.trim()) {
      showToast({title: '请填写离职原因', icon: 'none'})
      return
    }

    setSubmitting(true)

    const result = await createResignationApplication({
      user_id: user.id,
      warehouse_id: warehouseId,
      expected_date: expectedDate,
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

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题卡片 */}
          <View className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">申请离职</Text>
            <Text className="text-orange-100 text-sm block">请填写以下信息提交离职申请</Text>
          </View>

          {/* 提示信息 */}
          <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <View className="flex items-start">
              <View className="i-mdi-alert text-2xl text-yellow-600 mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm text-yellow-800 block mb-1 font-bold">重要提示</Text>
                <Text className="text-xs text-yellow-700 block">
                  离职申请提交后将由管理员审核，请确保填写的信息准确无误。审核通过后，请按照公司规定办理离职手续。
                </Text>
              </View>
            </View>
          </View>

          {/* 表单 */}
          <View className="bg-white rounded-lg p-4 shadow">
            {/* 预计离职日期 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">预计离职日期</Text>
              <Picker mode="date" value={expectedDate} start={getCurrentDate()} onChange={handleExpectedDateChange}>
                <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                  <Text className="text-sm text-gray-800">{expectedDate || '请选择预计离职日期'}</Text>
                  <View className="i-mdi-calendar text-xl text-gray-400" />
                </View>
              </Picker>
            </View>

            {/* 离职原因 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">离职原因</Text>
              <Textarea
                className="border border-gray-300 rounded-lg p-3 text-sm"
                style={{minHeight: '150px', width: '100%'}}
                placeholder="请详细说明离职原因"
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
                backgroundColor: submitting ? '#9CA3AF' : '#F97316',
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

export default ApplyResignation
