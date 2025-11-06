import {Button, Picker, Text, Textarea, View} from '@tarojs/components'
import Taro, {navigateBack, showToast, useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import {
  createResignationApplication,
  getDriverWarehouses,
  saveDraftResignationApplication,
  updateDraftResignationApplication
} from '@/db/api'

const ApplyResignation: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [expectedDate, setExpectedDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)

  useLoad(() => {
    const params = Taro.getCurrentInstance().router?.params
    if (params?.draftId) {
      setDraftId(params.draftId)
      setIsEditMode(true)
      loadDraft(params.draftId)
    }
  })

  const loadDraft = async (id: string) => {
    const {data, error} = await supabase
      .from('resignation_applications')
      .select('*')
      .eq('id', id)
      .eq('is_draft', true)
      .maybeSingle()

    if (error || !data) {
      showToast({title: '加载草稿失败', icon: 'none'})
      return
    }

    setExpectedDate(data.expected_date || '')
    setReason(data.reason || '')
    setWarehouseId(data.warehouse_id)
  }

  const loadWarehouse = useCallback(async () => {
    if (!user) return
    const warehouses = await getDriverWarehouses(user.id)
    if (warehouses.length > 0) {
      setWarehouseId(warehouses[0].id)
    }
  }, [user])

  useEffect(() => {
    if (!isEditMode) {
      loadWarehouse()
    }
  }, [loadWarehouse, isEditMode])

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
        expected_date: expectedDate,
        reason: reason.trim()
      })
    } else {
      const result = await saveDraftResignationApplication({
        user_id: user.id,
        warehouse_id: warehouseId,
        expected_date: expectedDate,
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
      showToast({title: '请选择预计离职日期', icon: 'none'})
      return
    }

    if (!reason.trim()) {
      showToast({title: '请填写离职原因', icon: 'none'})
      return
    }

    setSubmitting(true)

    let success = false
    if (isEditMode && draftId) {
      // 更新草稿并提交
      await updateDraftResignationApplication(draftId, {
        expected_date: expectedDate,
        reason: reason.trim()
      })
      const {error} = await supabase.from('resignation_applications').update({is_draft: false}).eq('id', draftId)
      success = !error
    } else {
      const result = await createResignationApplication({
        user_id: user.id,
        warehouse_id: warehouseId,
        expected_date: expectedDate,
        reason: reason.trim(),
        is_draft: false
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

  const getCurrentDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleExpectedDateChange = (e: {detail: {value: string}}) => {
    setExpectedDate(e.detail.value)
  }

  const handleReasonChange = (e: {detail: {value: string}}) => {
    setReason(e.detail.value)
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #FEF2F2, #FEE2E2)', minHeight: '100vh'}}>
      <View className="p-4">
        {/* 标题卡片 */}
        <View className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg p-6 mb-4 shadow-lg">
          <Text className="text-white text-2xl font-bold block mb-2">{isEditMode ? '编辑离职申请' : '申请离职'}</Text>
          <Text className="text-orange-100 text-sm block">请填写以下信息</Text>
        </View>

        {/* 表单 */}
        <View className="bg-white rounded-lg p-4 shadow">
          {/* 预计离职日期 */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-700 mb-2 block">预计离职日期</Text>
            <Picker mode="date" value={expectedDate} start={getCurrentDate()} onChange={handleExpectedDateChange}>
              <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                <Text className={expectedDate ? 'text-gray-800' : 'text-gray-400'}>
                  {expectedDate || '请选择预计离职日期'}
                </Text>
                <View className="i-mdi-calendar text-xl text-gray-400" />
              </View>
            </Picker>
          </View>

          {/* 离职原因 */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-700 mb-2 block">离职原因</Text>
            <Textarea
              className="border border-gray-300 rounded-lg p-3 text-gray-800"
              placeholder="请输入离职原因"
              value={reason}
              onInput={handleReasonChange}
              maxlength={500}
              style={{minHeight: '120px'}}
            />
            <Text className="text-xs text-gray-400 mt-1 block">{reason.length}/500</Text>
          </View>

          {/* 按钮组 */}
          <View className="flex gap-3">
            <Button
              className="text-sm break-keep flex-1"
              size="default"
              style={{
                backgroundColor: '#7C3AED',
                color: 'white',
                borderRadius: '8px',
                border: 'none'
              }}
              onClick={handleSaveDraft}
              disabled={submitting}>
              {submitting ? '保存中...' : '保存草稿'}
            </Button>
            <Button
              className="text-sm break-keep flex-1"
              size="default"
              style={{
                backgroundColor: '#F97316',
                color: 'white',
                borderRadius: '8px',
                border: 'none'
              }}
              onClick={handleSubmit}
              disabled={submitting}>
              {submitting ? '提交中...' : '提交申请'}
            </Button>
          </View>
        </View>
      </View>
    </View>
  )
}

export default ApplyResignation
