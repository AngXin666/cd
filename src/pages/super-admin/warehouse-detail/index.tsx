import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh, useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import * as DashboardAPI from '@/db/api/dashboard'
import * as WarehousesAPI from '@/db/api/warehouses'

import type {AttendanceRule, Profile, WarehouseWithRule} from '@/db/types'

/**
 * 仓库详情页面
 * 显示仓库的完整信息，包括基本信息、考勤规则、请假规则、司机数量、管理员信息
 */
const WarehouseDetail: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const warehouseId = router.params.id || ''

  const [warehouse, setWarehouse] = useState<WarehouseWithRule | null>(null)
  const [rule, setRule] = useState<AttendanceRule | null>(null)
  const [driverCount, setDriverCount] = useState(0)
  const [manager, setManager] = useState<Profile | null>(null)
  const [showRuleDetail, setShowRuleDetail] = useState(false)
  const [showLeaveRuleDetail, setShowLeaveRuleDetail] = useState(false)

  // 加载仓库详情
  const loadWarehouseDetail = useCallback(async () => {
    if (!warehouseId) {
      Taro.showToast({
        title: '仓库ID不存在',
        icon: 'none',
        duration: 2000
      })
      return
    }

    Taro.showLoading({title: '加载中...'})

    try {
      // 获取仓库信息
      const warehouseData = await WarehousesAPI.getWarehouseWithRule(warehouseId)
      if (!warehouseData) {
        Taro.showToast({
          title: '仓库不存在',
          icon: 'none',
          duration: 2000
        })
        Taro.navigateBack()
        return
      }
      setWarehouse(warehouseData)

      // 获取考勤规则
      if (warehouseData.rule) {
        setRule(warehouseData.rule)
      }

      // 获取司机数量
      const count = await DashboardAPI.getWarehouseDriverCount(warehouseId)
      setDriverCount(count)

      // 获取管理员信息
      const managerData = await WarehousesAPI.getWarehouseManager(warehouseId)
      setManager(managerData)
    } catch (error) {
      console.error('加载仓库详情失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      Taro.hideLoading()
    }
  }, [warehouseId])

  useDidShow(() => {
    loadWarehouseDetail()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadWarehouseDetail()])
    Taro.stopPullDownRefresh()
  })

  if (!warehouse) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Text className="text-gray-400 text-base">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4 pb-20">
          {/* 基本信息卡片 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <View className="flex items-center mb-4">
              <View className="i-mdi-warehouse text-3xl text-blue-600 mr-2"></View>
              <Text className="text-gray-800 text-xl font-bold">{warehouse.name}</Text>
            </View>

            <View className="space-y-3">
              {/* 状态 */}
              <View className="flex items-center">
                <View
                  className="i-mdi-circle text-base mr-2"
                  style={{color: warehouse.is_active ? '#10B981' : '#EF4444'}}></View>
                <Text className="text-gray-600 text-sm flex-1">状态</Text>
                <Text className={`text-sm font-medium ${warehouse.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {warehouse.is_active ? '启用中' : '已停用'}
                </Text>
              </View>

              {/* 司机数量 */}
              <View className="flex items-center">
                <View className="i-mdi-account-group text-base text-blue-600 mr-2"></View>
                <Text className="text-gray-600 text-sm flex-1">绑定司机</Text>
                <Text className="text-gray-800 text-sm font-medium">{driverCount} 人</Text>
              </View>

              {/* 管理员 */}
              <View className="flex items-center">
                <View className="i-mdi-account-tie text-base text-purple-600 mr-2"></View>
                <Text className="text-gray-600 text-sm flex-1">主要管理员</Text>
                <Text className="text-gray-800 text-sm font-medium">{manager?.name || '未分配'}</Text>
              </View>

              {/* 创建时间 */}
              <View className="flex items-center">
                <View className="i-mdi-calendar text-base text-gray-400 mr-2"></View>
                <Text className="text-gray-600 text-sm flex-1">创建时间</Text>
                <Text className="text-gray-800 text-sm">{new Date(warehouse.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          </View>

          {/* 考勤规则卡片 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center">
                <View className="i-mdi-clock-outline text-2xl text-green-600 mr-2"></View>
                <Text className="text-gray-800 text-lg font-bold">考勤规则</Text>
              </View>
              {rule && (
                <View className="flex items-center cursor-pointer" onClick={() => setShowRuleDetail(true)}>
                  <Text className="text-blue-600 text-sm mr-1">查看详情</Text>
                  <View className="i-mdi-magnify-plus text-lg text-blue-600"></View>
                </View>
              )}
            </View>

            {rule ? (
              <View className="space-y-2">
                <View className="flex items-center">
                  <Text className="text-gray-600 text-sm flex-1">上班时间</Text>
                  <Text className="text-gray-800 text-sm font-medium">{rule.work_start_time}</Text>
                </View>
                <View className="flex items-center">
                  <Text className="text-gray-600 text-sm flex-1">下班时间</Text>
                  <Text className="text-gray-800 text-sm font-medium">{rule.work_end_time}</Text>
                </View>
                <View className="flex items-center">
                  <Text className="text-gray-600 text-sm flex-1">迟到阈值</Text>
                  <Text className="text-gray-800 text-sm font-medium">{rule.late_threshold} 分钟</Text>
                </View>
                <View className="flex items-center">
                  <Text className="text-gray-600 text-sm flex-1">早退阈值</Text>
                  <Text className="text-gray-800 text-sm font-medium">{rule.early_threshold} 分钟</Text>
                </View>
              </View>
            ) : (
              <Text className="text-gray-400 text-sm">未设置考勤规则</Text>
            )}
          </View>

          {/* 请假规则卡片 */}
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center">
                <View className="i-mdi-calendar-check text-2xl text-orange-600 mr-2"></View>
                <Text className="text-gray-800 text-lg font-bold">请假规则</Text>
              </View>
              <View className="flex items-center cursor-pointer" onClick={() => setShowLeaveRuleDetail(true)}>
                <Text className="text-blue-600 text-sm mr-1">查看详情</Text>
                <View className="i-mdi-magnify-plus text-lg text-blue-600"></View>
              </View>
            </View>

            <View className="space-y-2">
              <View className="flex items-center">
                <Text className="text-gray-600 text-sm flex-1">最大请假天数</Text>
                <Text className="text-gray-800 text-sm font-medium">{warehouse.max_leave_days || 7} 天</Text>
              </View>
              <View className="flex items-center">
                <Text className="text-gray-600 text-sm flex-1">离职提前天数</Text>
                <Text className="text-gray-800 text-sm font-medium">{warehouse.resignation_notice_days || 30} 天</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 考勤规则详情弹窗 */}
      {showRuleDetail && rule && (
        <View
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowRuleDetail(false)}>
          <View className="bg-white rounded-lg p-6 m-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <View className="flex items-center justify-between mb-4">
              <Text className="text-gray-800 text-lg font-bold">考勤规则详情</Text>
              <View
                className="i-mdi-close text-2xl text-gray-400 cursor-pointer"
                onClick={() => setShowRuleDetail(false)}></View>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-gray-600 text-sm block mb-1">上班时间</Text>
                <Text className="text-gray-800 text-base font-medium">{rule.work_start_time}</Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm block mb-1">下班时间</Text>
                <Text className="text-gray-800 text-base font-medium">{rule.work_end_time}</Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm block mb-1">迟到阈值</Text>
                <Text className="text-gray-800 text-base font-medium">{rule.late_threshold} 分钟</Text>
                <Text className="text-gray-400 text-xs block mt-1">超过此时间视为迟到</Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm block mb-1">早退阈值</Text>
                <Text className="text-gray-800 text-base font-medium">{rule.early_threshold} 分钟</Text>
                <Text className="text-gray-400 text-xs block mt-1">提前此时间下班视为早退</Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm block mb-1">下班打卡</Text>
                <Text className="text-gray-800 text-base font-medium">
                  {rule.require_clock_out ? '需要打卡' : '无需打卡'}
                </Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm block mb-1">规则状态</Text>
                <Text className={`text-base font-medium ${rule.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {rule.is_active ? '启用中' : '已停用'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 请假规则详情弹窗 */}
      {showLeaveRuleDetail && (
        <View
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowLeaveRuleDetail(false)}>
          <View className="bg-white rounded-lg p-6 m-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <View className="flex items-center justify-between mb-4">
              <Text className="text-gray-800 text-lg font-bold">请假规则详情</Text>
              <View
                className="i-mdi-close text-2xl text-gray-400 cursor-pointer"
                onClick={() => setShowLeaveRuleDetail(false)}></View>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-gray-600 text-sm block mb-1">最大请假天数上限</Text>
                <Text className="text-gray-800 text-base font-medium">{warehouse.max_leave_days || 7} 天</Text>
                <Text className="text-gray-400 text-xs block mt-1">司机单次请假不能超过此天数，超过需管理员补录</Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm block mb-1">离职申请提前天数</Text>
                <Text className="text-gray-800 text-base font-medium">
                  {warehouse.resignation_notice_days || 30} 天
                </Text>
                <Text className="text-gray-400 text-xs block mt-1">司机离职申请需提前此天数提交</Text>
              </View>

              <View className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <View className="flex items-start">
                  <View className="i-mdi-information text-xl text-blue-600 mr-2 mt-0.5"></View>
                  <View className="flex-1">
                    <Text className="text-blue-800 text-sm font-medium block mb-1">规则说明</Text>
                    <Text className="text-blue-700 text-xs block mb-1">
                      • 快捷请假：最多只能选择 {warehouse.max_leave_days || 7} 天
                    </Text>
                    <Text className="text-blue-700 text-xs block mb-1">• 补请假：可以超过上限，但需要管理员审批</Text>
                    <Text className="text-blue-700 text-xs block">
                      • 离职申请：必须提前 {warehouse.resignation_notice_days || 30} 天提交
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default WarehouseDetail
