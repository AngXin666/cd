/**
 * 司机离职申请页面
 * 支持选择仓库、期望离职日期和填写离职原因
 *
 * v1.3.18 更新：移除重复的通知发送代码
 * 通知发送已在 LeaveAPI.createResignationApplication 中统一处理
 * 使用 buildSubmissionMessage 组装消息格式
 */
import {Button, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {navigateBack, showToast, useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import SafeAreaTop from '@/components/SafeAreaTop'
import TopNavBar from '@/components/TopNavBar'
import * as LeaveAPI from '@/db/api/leave'
import type {LeaveApplication} from '@/db/types'
import * as WarehousesAPI from '@/db/api/warehouses'
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
  const [warehouses, setWarehouses] = useState<Array<{id: string; name: string}>>([])
  const [approvedLeaves, setApprovedLeaves] = useState<LeaveApplication[]>([]) // 已批准/待审批的请假记录
  const [dateAutoAdjusted, setDateAutoAdjusted] = useState(false) // 日期是否被自动调整

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
    const allWarehouses = await WarehousesAPI.getDriverWarehouses(user.id)
    const activeWarehouses = allWarehouses.filter((w) => w.is_active)

    if (activeWarehouses.length === 0) {
      showToast({
        title: '暂无可用仓库',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 保存仓库列表
    setWarehouses(activeWarehouses.map((w) => ({id: w.id, name: w.name})))

    // 获取已批准/待审批的请假记录
    const leaves = await LeaveAPI.getApprovedAndPendingLeaves(user.id)
    setApprovedLeaves(leaves)

    // 如果只有一个仓库，自动选择
    if (activeWarehouses.length === 1) {
      const warehouseId = activeWarehouses[0].id
      setWarehouseId(warehouseId)

      // 获取仓库设置
      const settings = await WarehousesAPI.getWarehouseSettings(warehouseId)
      if (settings) {
        setNoticeDays(settings.resignation_notice_days)

        // 计算最早可选日期（考虑已批准的请假）
        const today = new Date()
        const baseMinDate = new Date(today)
        baseMinDate.setDate(baseMinDate.getDate() + settings.resignation_notice_days)
        const baseMinDateStr = getLocalDateString(baseMinDate)
        setMinDate(baseMinDateStr)

        // 计算最早可用的离职日期（跳过已批准的请假）
        const earliestDate = await LeaveAPI.getEarliestAvailableResignationDate(user.id, settings.resignation_notice_days)
        setExpectedDate(earliestDate)

        // 检查日期是否被自动调整
        if (earliestDate !== baseMinDateStr) {
          setDateAutoAdjusted(true)
        }
      }
    } else {
      // 如果有多个仓库，尝试读取上次选择的仓库
      try {
        const lastWarehouseId = Taro.getStorageSync(`resignation_application_last_warehouse_${user.id}`)
        if (lastWarehouseId) {
          // 检查上次选择的仓库是否在当前可用仓库列表中
          const isWarehouseAvailable = activeWarehouses.some((w) => w.id === lastWarehouseId)
          if (isWarehouseAvailable) {
            setWarehouseId(lastWarehouseId)

            // 获取仓库设置
            const settings = await WarehousesAPI.getWarehouseSettings(lastWarehouseId)
            if (settings) {
              setNoticeDays(settings.resignation_notice_days)

              // 计算最早可选日期（考虑已批准的请假）
              const today = new Date()
              const baseMinDate = new Date(today)
              baseMinDate.setDate(baseMinDate.getDate() + settings.resignation_notice_days)
              const baseMinDateStr = getLocalDateString(baseMinDate)
              setMinDate(baseMinDateStr)

              // 计算最早可用的离职日期（跳过已批准的请假）
              const earliestDate = await LeaveAPI.getEarliestAvailableResignationDate(user.id, settings.resignation_notice_days)
              setExpectedDate(earliestDate)

              // 检查日期是否被自动调整
              if (earliestDate !== baseMinDateStr) {
                setDateAutoAdjusted(true)
              }
            }
          }
        }
      } catch (_error) {}
    }
  }, [user, isEditMode])

  useEffect(() => {
    loadWarehouse()
  }, [loadWarehouse])

  // 当仓库变化时，更新仓库设置
  useEffect(() => {
    const updateWarehouseSettings = async () => {
      if (!warehouseId || !user) return

      const settings = await WarehousesAPI.getWarehouseSettings(warehouseId)
      if (settings) {
        setNoticeDays(settings.resignation_notice_days)

        // 计算最早可选日期（考虑已批准的请假）
        const today = new Date()
        const baseMinDate = new Date(today)
        baseMinDate.setDate(baseMinDate.getDate() + settings.resignation_notice_days)
        const baseMinDateStr = getLocalDateString(baseMinDate)
        setMinDate(baseMinDateStr)

        // 计算最早可用的离职日期（跳过已批准的请假）
        const earliestDate = await LeaveAPI.getEarliestAvailableResignationDate(user.id, settings.resignation_notice_days)
        
        // 只有在日期为空或需要更新时才设置
        if (!expectedDate || expectedDate < earliestDate) {
          setExpectedDate(earliestDate)
        }

        // 检查日期是否被自动调整
        if (earliestDate !== baseMinDateStr) {
          setDateAutoAdjusted(true)
        } else {
          setDateAutoAdjusted(false)
        }
      }
    }

    updateWarehouseSettings()
  }, [warehouseId, user, expectedDate])

  // 验证离职日期
  useEffect(() => {
    const validateDate = async () => {
      if (!warehouseId || !expectedDate) {
        setValidationMessage('')
        return
      }

      const result = await LeaveAPI.validateResignationDate(warehouseId, expectedDate)
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

  const handleWarehouseChange = (e: any) => {
    const index = e.detail.value
    const selectedWarehouseId = warehouses[index].id
    setWarehouseId(selectedWarehouseId)

    // 保存用户的选择到本地存储
    if (user) {
      try {
        Taro.setStorageSync(`resignation_application_last_warehouse_${user.id}`, selectedWarehouseId)
      } catch (_error) {}
    }
  }

  const handleSaveDraft = async () => {
    if (!user) {
      showToast({title: '用户信息错误', icon: 'none'})
      return
    }

    if (!warehouseId) {
      showToast({title: warehouses.length > 1 ? '请选择仓库' : '请先分配仓库', icon: 'none'})
      return
    }

    setSubmitting(true)

    let success = false
    if (isEditMode && draftId) {
      success = await LeaveAPI.updateDraftResignationApplication(draftId, {
        resignation_date: expectedDate,
        reason: reason.trim()
      })
    } else {
      const result = await LeaveAPI.saveDraftResignationApplication({
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
      showToast({title: warehouses.length > 1 ? '请选择仓库' : '请先分配仓库', icon: 'none'})
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
      const result = await LeaveAPI.validateResignationDate(warehouseId, expectedDate)
      if (!result.valid) {
        showToast({title: result.message || '离职日期不符合要求', icon: 'none', duration: 3000})
        return
      }
    }

    setSubmitting(true)

    let success = false
    let applicationId: string | null = null

    if (isEditMode && draftId) {
      await LeaveAPI.updateDraftResignationApplication(draftId, {
        resignation_date: expectedDate,
        reason: reason.trim()
      })
      // 由于数据库不支持草稿，直接标记为成功
      success = true
      applicationId = draftId
    } else {
      const result = await LeaveAPI.createResignationApplication({
        user_id: user.id,
        warehouse_id: warehouseId,
        resignation_date: expectedDate,
        reason: reason.trim()
      })
      success = result !== null
      applicationId = result?.id || null
    }

    setSubmitting(false)

    if (success && applicationId) {
      // 显示成功提示
      // 注意：通知发送已在 LeaveAPI.createResignationApplication 中统一处理
      // 使用 buildSubmissionMessage 组装消息格式：{仓库名} {司机类型} {姓名} 提交了{申请类型}申请
      showToast({title: '提交成功', icon: 'success'})

      // 返回上一页
      setTimeout(() => {
        navigateBack()
      }, 1500)
    } else {
      showToast({title: '提交失败，请重试', icon: 'none'})
    }
  }

  return (
    <>
      <SafeAreaTop />
      <View style={{background: 'linear-gradient(to bottom, #FEF2F2, #FEE2E2)', minHeight: '100vh'}}>
        {/* 顶部导航栏 */}
        <TopNavBar />
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

            {/* 日期自动调整提示 - 当有已批准的请假导致日期延后时显示 */}
            {dateAutoAdjusted && approvedLeaves.length > 0 && (
              <View className="mb-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                <View className="flex items-start">
                  <View className="i-mdi-calendar-alert text-2xl text-orange-600 mr-2 mt-0.5"></View>
                  <View className="flex-1">
                    <Text className="text-orange-900 font-bold text-sm block mb-1">日期已自动调整</Text>
                    <Text className="text-orange-800 text-xs">
                      由于您有已批准或待审批的请假，系统已自动将离职日期调整为 {expectedDate}（最早可用日期）
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 表单内容 */}
            <View className="bg-white rounded-lg p-4 shadow-sm">
              {/* 仓库选择（只在有多个仓库时显示） */}
              {warehouses.length > 1 && (
                <View className="mb-4">
                  <Text className="text-sm text-gray-700 block mb-2">选择仓库 *</Text>
                  <Picker
                    mode="selector"
                    range={warehouses.map((w) => w.name)}
                    value={warehouses.findIndex((w) => w.id === warehouseId)}
                    onChange={handleWarehouseChange}>
                    <View className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                      <Text className="text-sm text-gray-800">
                        {warehouseId ? warehouses.find((w) => w.id === warehouseId)?.name : '请选择仓库'}
                      </Text>
                      <View className="i-mdi-chevron-down text-xl text-gray-400" />
                    </View>
                  </Picker>
                  <Text className="text-xs text-red-500 block mt-1">请选择您要离职的仓库</Text>
                </View>
              )}

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
    </>
  )
}

export default ApplyResignation
