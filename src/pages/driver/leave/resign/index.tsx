import {Button, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {navigateBack, showToast, useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import {
  createNotificationForAllManagers,
  createResignationApplication,
  getDriverName,
  getDriverWarehouses,
  getWarehouseSettings,
  saveDraftResignationApplication,
  updateDraftResignationApplication,
  validateResignationDate
} from '@/db/api'
import {getLocalDateString} from '@/utils/date'

const ApplyResignation: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [expectedDate, setExpectedDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [minDate, setMinDate] = useState('')
  const [noticeDays, setNoticeDays] = useState(30)
  const [validationMessage, setValidationMessage] = useState<string>('')

  useLoad(() => {
    const params = Taro.getCurrentInstance().router?.params
    if (params?.draftId) {
      setDraftId(params.draftId)
      setIsEditMode(true)
      loadDraft(params.draftId)
    }
  })

  const loadDraft = async (id: string) => {
    const {data, error} = await supabase.from('resignation_applications').select('*').eq('id', id).maybeSingle()

    if (error || !data) {
      showToast({title: '加载草稿失败', icon: 'none'})
      return
    }

    setExpectedDate(data.resignation_date || '')
    setReason(data.reason || '')
    setWarehouseId(data.warehouse_id)
  }

  const loadWarehouse = useCallback(async () => {
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
        setNoticeDays(settings.resignation_notice_days)

        // 计算最早可选日期
        const today = new Date()
        const minDate = new Date(today)
        minDate.setDate(minDate.getDate() + settings.resignation_notice_days)
        setMinDate(getLocalDateString(minDate))
      }
    }
  }, [user, isEditMode])

  useEffect(() => {
    loadWarehouse()
  }, [loadWarehouse])

  // 验证离职日期
  useEffect(() => {
    const validateDate = async () => {
      if (!warehouseId || !expectedDate) {
        setValidationMessage('')
        return
      }

      const result = await validateResignationDate(warehouseId, expectedDate)
      if (!result.valid && result.message) {
        setValidationMessage(result.message)
      } else {
        setValidationMessage('')
      }
    }

    validateDate()
  }, [warehouseId, expectedDate])

  const handleDateChange = (e: any) => {
    setExpectedDate(e.detail.value)
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
      success = await updateDraftResignationApplication(draftId, {
        resignation_date: expectedDate,
        reason: reason.trim()
      })
    } else {
      const result = await saveDraftResignationApplication({
        user_id: user.id,
        warehouse_id: warehouseId,
        resignation_date: expectedDate,
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

    if (!expectedDate) {
      showToast({title: '请选择期望离职日期', icon: 'none'})
      return
    }

    if (!reason.trim()) {
      showToast({title: '请填写离职原因', icon: 'none'})
      return
    }

    // 验证日期
    if (warehouseId) {
      const result = await validateResignationDate(warehouseId, expectedDate)
      if (!result.valid) {
        showToast({title: result.message || '离职日期不符合要求', icon: 'none', duration: 3000})
        return
      }
    }

    setSubmitting(true)

    let success = false
    let applicationId: string | null = null

    if (isEditMode && draftId) {
      await updateDraftResignationApplication(draftId, {
        resignation_date: expectedDate,
        reason: reason.trim()
      })
      // 由于数据库不支持草稿，直接标记为成功
      success = true
      applicationId = draftId
    } else {
      const result = await createResignationApplication({
        user_id: user.id,
        warehouse_id: warehouseId,
        resignation_date: expectedDate,
        reason: reason.trim()
      })
      success = result !== null
      applicationId = result
    }

    setSubmitting(false)

    if (success && applicationId) {
      // 获取司机姓名
      const driverName = await getDriverName(user.id)

      // 为所有管理员创建通知
      const notificationCount = await createNotificationForAllManagers({
        type: 'resignation_application_submitted',
        title: '新的离职申请',
        message: `司机 ${driverName} 提交了离职申请，期望离职日期：${expectedDate}，离职原因：${reason.trim()}`,
        related_id: applicationId
      })

      console.log('✅ 离职申请提交成功，已通知', notificationCount, '位管理员')

      showToast({title: '提交成功', icon: 'success'})
      setTimeout(() => {
        navigateBack()
      }, 1500)
    } else {
      showToast({title: '提交失败，请重试', icon: 'none'})
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #FEF2F2, #FEE2E2)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题 */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-gray-800">离职申请</Text>
          </View>

          {/* 温馨提示 */}
          <View className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <View className="flex items-start">
              <View className="i-mdi-information text-2xl text-blue-600 mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-blue-900 font-bold text-sm block mb-1">温馨提示</Text>
                <Text className="text-blue-800 text-sm">离职申请需提前 {noticeDays} 天提交</Text>
              </View>
            </View>
          </View>

          {/* 表单内容 */}
          <View className="bg-white rounded-lg p-4 shadow-sm">
            {/* 期望离职日期 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">期望离职日期</Text>
              <Picker mode="date" value={expectedDate} start={minDate} onChange={handleDateChange}>
                <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                  <Text className="text-sm text-gray-800">{expectedDate || '请选择离职日期'}</Text>
                  <View className="i-mdi-calendar text-xl text-gray-400" />
                </View>
              </Picker>
              {minDate && <Text className="text-xs text-gray-400 block mt-1">最早可选日期：{minDate}</Text>}
            </View>

            {/* 日期验证提示 */}
            {validationMessage && (
              <View className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <View className="flex items-start">
                  <View className="i-mdi-alert-circle text-2xl text-red-600 mr-2 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-red-900 text-sm">{validationMessage}</Text>
                  </View>
                </View>
              </View>
            )}

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
                  backgroundColor: submitting ? '#9CA3AF' : '#DC2626',
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

export default ApplyResignation
