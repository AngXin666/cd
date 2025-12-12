import {Button, Input, Picker, ScrollView, Switch, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {showLoading, showToast, hideLoading} from '@/utils/taroCompat'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import PasswordVerifyModal from '@/components/common/PasswordVerifyModal'
import * as AttendanceAPI from '@/db/api/attendance'
import * as WarehousesAPI from '@/db/api/warehouses'

import type {AttendanceRule, WarehouseWithRule} from '@/db/types'
import {confirmDelete} from '@/utils/confirm'

const WarehouseManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [warehouses, setWarehouses] = useState<WarehouseWithRule[]>([])
  const [showAddWarehouse, setShowAddWarehouse] = useState(false)
  const [showEditWarehouse, setShowEditWarehouse] = useState(false)
  const [currentWarehouse, _setCurrentWarehouse] = useState<WarehouseWithRule | null>(null)
  const [currentRule, _setCurrentRule] = useState<AttendanceRule | null>(null)

  // 新仓库表单
  const [newWarehouseName, setNewWarehouseName] = useState('')

  // 编辑仓库表单
  const [editWarehouseName, setEditWarehouseName] = useState('')
  const [editWarehouseActive, setEditWarehouseActive] = useState(true)
  const [editMaxLeaveDays, setEditMaxLeaveDays] = useState('7')
  const [editResignationNoticeDays, setEditResignationNoticeDays] = useState('30')

  // 考勤规则表单
  const [ruleStartTime, setRuleStartTime] = useState('09:00')
  const [ruleEndTime, setRuleEndTime] = useState('18:00')
  const [ruleLateThreshold, setRuleLateThreshold] = useState('15')
  const [ruleEarlyThreshold, setRuleEarlyThreshold] = useState('15')
  const [ruleRequireClockOut, setRuleRequireClockOut] = useState(true)
  const [ruleActive, setRuleActive] = useState(true)

  // 密码验证
  const [showPasswordVerify, setShowPasswordVerify] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null)

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    showLoading({title: '加载中...'})
    const data = await WarehousesAPI.getAllWarehousesWithRules()
    setWarehouses(data)
    hideLoading()
  }, [])

  useDidShow(() => {
    loadWarehouses()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadWarehouses()])
    Taro.stopPullDownRefresh()
  })

  // 显示添加仓库对话框
  const handleShowAddWarehouse = () => {
    setNewWarehouseName('')
    setShowAddWarehouse(true)
  }

  // 添加仓库
  const handleAddWarehouse = async () => {
    if (!newWarehouseName.trim()) {
      showToast({
        title: '请输入仓库名称',
        icon: 'none',
        duration: 2000
      })
      return
    }

    try {
      showLoading({title: '创建中...'})

      const warehouse = await WarehousesAPI.createWarehouse({
        name: newWarehouseName.trim()
      })

      if (warehouse) {
        // 为新仓库创建默认考勤规则
        await AttendanceAPI.createAttendanceRule({
          warehouse_id: warehouse.id,
          clock_in_time: '09:00:00',
          clock_out_time: '18:00:00',
          work_start_time: '09:00:00',
          work_end_time: '18:00:00',
          late_threshold: 15,
          early_threshold: 15,
          require_clock_out: true
        })

        showToast({
          title: '创建成功',
          icon: 'success',
          duration: 1500
        })

        setShowAddWarehouse(false)
        await loadWarehouses()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建失败'
      showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
      })
    } finally {
      hideLoading()
    }
  }

  // 跳转到编辑仓库页面
  const handleShowEditWarehouse = (warehouse: WarehouseWithRule) => {
    Taro.navigateTo({
      url: `/pages/super-admin/warehouse-edit/index?id=${warehouse.id}`
    })
  }

  // 查看仓库详情
  const handleViewWarehouseDetail = (warehouse: WarehouseWithRule) => {
    Taro.navigateTo({
      url: `/pages/super-admin/warehouse-detail/index?id=${warehouse.id}`
    })
  }

  // 请求密码验证
  const requestPasswordVerify = (action: () => Promise<void>) => {
    setPendingAction(() => action)
    setShowPasswordVerify(true)
  }

  // 密码验证成功
  const handlePasswordVerifySuccess = async () => {
    setShowPasswordVerify(false)
    if (pendingAction) {
      await pendingAction()
      setPendingAction(null)
    }
  }

  // 密码验证取消
  const handlePasswordVerifyCancel = () => {
    setShowPasswordVerify(false)
    setPendingAction(null)
  }

  // 更新仓库（验证前检查）
  const handleUpdateWarehouse = () => {
    if (!currentWarehouse) return

    if (!editWarehouseName.trim()) {
      showToast({
        title: '请输入仓库名称',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 验证请假天数和离职提前天数
    const maxLeaveDays = Number.parseInt(editMaxLeaveDays, 10)
    const resignationNoticeDays = Number.parseInt(editResignationNoticeDays, 10)

    if (Number.isNaN(maxLeaveDays) || maxLeaveDays < 1 || maxLeaveDays > 365) {
      showToast({
        title: '月度请假天数必须在1-365之间',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (Number.isNaN(resignationNoticeDays) || resignationNoticeDays < 1 || resignationNoticeDays > 365) {
      showToast({
        title: '离职提前天数必须在1-365之间',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 验证考勤规则
    const lateThreshold = Number.parseInt(ruleLateThreshold, 10)
    const earlyThreshold = Number.parseInt(ruleEarlyThreshold, 10)

    if (Number.isNaN(lateThreshold) || lateThreshold < 0) {
      showToast({
        title: '迟到阈值必须大于等于0',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (Number.isNaN(earlyThreshold) || earlyThreshold < 0) {
      showToast({
        title: '早退阈值必须大于等于0',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 请求密码验证
    requestPasswordVerify(async () => {
      try {
        showLoading({title: '保存中...'})

        // 1. 更新仓库基本信息
        const success = await WarehousesAPI.updateWarehouse(currentWarehouse.id, {
          name: editWarehouseName.trim(),
          is_active: editWarehouseActive
        })

        if (!success) {
          throw new Error('更新仓库信息失败')
        }

        // 2. 更新请假和离职设置
        await WarehousesAPI.updateWarehouseSettings(currentWarehouse.id, {
          max_leave_days: maxLeaveDays,
          resignation_notice_days: resignationNoticeDays
        })

        // 3. 更新或创建考勤规则
        if (currentRule) {
          // 更新现有规则
          await AttendanceAPI.updateAttendanceRule(currentRule.id, {
            clock_in_time: ruleStartTime,
            clock_out_time: ruleEndTime,
            work_start_time: ruleStartTime,
            work_end_time: ruleEndTime,
            late_threshold: lateThreshold,
            early_threshold: earlyThreshold,
            require_clock_out: ruleRequireClockOut,
            is_active: ruleActive
          })
        } else {
          // 创建新规则
          await AttendanceAPI.createAttendanceRule({
            warehouse_id: currentWarehouse.id,
            clock_in_time: ruleStartTime,
            clock_out_time: ruleEndTime,
            work_start_time: ruleStartTime,
            work_end_time: ruleEndTime,
            late_threshold: lateThreshold,
            early_threshold: earlyThreshold,
            require_clock_out: ruleRequireClockOut,
            is_active: ruleActive
          })
        }

        showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        })

        setShowEditWarehouse(false)
        await loadWarehouses()
      } catch (_error) {
        showToast({
          title: '保存失败',
          icon: 'none',
          duration: 2000
        })
      } finally {
        hideLoading()
      }
    })
  }

  // 删除仓库
  const handleDeleteWarehouse = async (warehouse: WarehouseWithRule) => {
    // 检查是否是最后一个仓库
    if (warehouses.length <= 1) {
      showToast({
        title: '无法删除：每个老板号必须保留至少一个仓库',
        icon: 'none',
        duration: 3000
      })
      return
    }

    const confirmed = await confirmDelete(
      '确认删除',
      `确定要删除仓库"${warehouse.name}"吗？\n\n删除后相关考勤规则和打卡记录也将被删除，此操作无法恢复。`
    )

    if (!confirmed) return

    // 请求密码验证
    requestPasswordVerify(async () => {
      try {
        showLoading({title: '删除中...'})

        const success = await WarehousesAPI.deleteWarehouse(warehouse.id)

        if (success) {
          showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          })

          await loadWarehouses()
        } else {
          showToast({
            title: '删除失败',
            icon: 'none',
            duration: 2000
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '删除失败'
        showToast({
          title: errorMessage,
          icon: 'none',
          duration: 2000
        })
      } finally {
        hideLoading()
      }
    })
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)', minHeight: '100vh'}}>
      <ScrollView scrollY style={{background: 'transparent'}} className="box-border">
        <View className="p-5">
          {/* 页面标题区域 - 简约大气 */}
          <View className="mb-6 pt-2">
            <View className="flex items-center justify-between mb-6">
              <View>
                <Text className="text-gray-900 text-3xl font-bold block mb-1">仓库管理</Text>
                <Text className="text-gray-500 text-sm block">Warehouse Management</Text>
              </View>
              <View className="i-mdi-warehouse text-gray-300 text-5xl" />
            </View>

            {/* 统计卡片 */}
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <View className="flex items-center justify-around">
                <View className="text-center flex-1">
                  <Text className="text-gray-500 text-xs block mb-1">总仓库数</Text>
                  <Text className="text-gray-900 text-2xl font-bold block">{warehouses.length}</Text>
                </View>
                <View className="w-px h-10 bg-gray-200" />
                <View className="text-center flex-1">
                  <Text className="text-gray-500 text-xs block mb-1">启用中</Text>
                  <Text className="text-green-600 text-2xl font-bold block">
                    {warehouses.filter((w) => w.is_active).length}
                  </Text>
                </View>
                <View className="w-px h-10 bg-gray-200" />
                <View className="text-center flex-1">
                  <Text className="text-gray-500 text-xs block mb-1">已禁用</Text>
                  <Text className="text-gray-400 text-2xl font-bold block">
                    {warehouses.filter((w) => !w.is_active).length}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 添加仓库按钮 - 简约设计 */}
          <View
            onClick={handleShowAddWarehouse}
            className="bg-white rounded-2xl p-4 mb-5 shadow-sm border border-gray-100 active:bg-gray-50 transition-all">
            <View className="flex items-center justify-center">
              <View className="i-mdi-plus-circle text-blue-600 text-2xl mr-3" />
              <Text className="text-gray-800 text-base font-bold">添加新仓库</Text>
            </View>
          </View>

          {/* 仓库列表 - 卡片式设计 */}
          {warehouses.length === 0 ? (
            <View className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <View className="i-mdi-warehouse-off text-gray-300 text-7xl mb-4" />
              <Text className="text-gray-400 text-base block mb-1">暂无仓库</Text>
              <Text className="text-gray-300 text-xs block">点击上方按钮添加第一个仓库</Text>
            </View>
          ) : (
            <View className="space-y-4">
              {warehouses.map((warehouse) => (
                <View
                  key={warehouse.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* 仓库头部 */}
                  <View className={`p-4 ${warehouse.is_active ? 'bg-blue-50/50' : 'bg-gray-50'}`}>
                    <View className="flex items-center justify-between">
                      <View className="flex items-center flex-1">
                        <View
                          className={`w-12 h-12 rounded-xl flex items-center justify-center mr-3 ${
                            warehouse.is_active ? 'bg-blue-100' : 'bg-gray-200'
                          }`}>
                          <View
                            className={`i-mdi-warehouse text-2xl ${warehouse.is_active ? 'text-blue-600' : 'text-gray-400'}`}
                          />
                        </View>
                        <View className="flex-1">
                          <View className="flex items-center gap-2 mb-1">
                            <Text
                              className={`text-xl font-bold block ${warehouse.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                              {warehouse.name}
                            </Text>
                            {!warehouse.is_active && (
                              <View className="bg-red-500 px-2 py-0.5 rounded-full">
                                <Text className="text-white text-xs">已禁用</Text>
                              </View>
                            )}
                          </View>
                          <View className="flex items-center gap-2">
                            <View
                              className={`w-2 h-2 rounded-full ${warehouse.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                            />
                            <Text className="text-gray-500 text-xs">{warehouse.is_active ? '运营中' : '已停用'}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 考勤规则信息 */}
                  <View className="p-4 border-t border-gray-100">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-clock-outline text-blue-600 text-lg mr-2" />
                      <Text className="text-gray-700 text-sm font-bold">考勤规则</Text>
                    </View>
                    {warehouse.rule ? (
                      <View className="grid grid-cols-2 gap-3">
                        <View className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <Text className="text-gray-400 text-xs block mb-1">上班时间</Text>
                          <Text className="text-gray-900 text-sm font-bold block">
                            {warehouse.rule.work_start_time}
                          </Text>
                        </View>
                        <View className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <Text className="text-gray-400 text-xs block mb-1">下班时间</Text>
                          <Text className="text-gray-900 text-sm font-bold block">{warehouse.rule.work_end_time}</Text>
                        </View>
                        <View className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <Text className="text-gray-400 text-xs block mb-1">迟到阈值</Text>
                          <Text className="text-orange-600 text-sm font-bold block">
                            {warehouse.rule.late_threshold}分钟
                          </Text>
                        </View>
                        <View className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <Text className="text-gray-400 text-xs block mb-1">早退阈值</Text>
                          <Text className="text-orange-600 text-sm font-bold block">
                            {warehouse.rule.early_threshold}分钟
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                        <Text className="text-gray-400 text-xs">未设置考勤规则</Text>
                      </View>
                    )}
                  </View>

                  {/* 操作按钮 */}
                  <View className="p-4 bg-gray-50 border-t border-gray-100">
                    <View className="grid grid-cols-3 gap-2">
                      <View
                        onClick={() => handleViewWarehouseDetail(warehouse)}
                        className="bg-white rounded-lg py-2.5 flex items-center justify-center active:bg-gray-100 transition-all border border-gray-200">
                        <View className="i-mdi-information-outline text-blue-600 text-lg mr-1.5" />
                        <Text className="text-blue-600 text-sm font-medium">详情</Text>
                      </View>
                      <View
                        onClick={() => handleShowEditWarehouse(warehouse)}
                        className="bg-white rounded-lg py-2.5 flex items-center justify-center active:bg-gray-100 transition-all border border-gray-200">
                        <View className="i-mdi-pencil-outline text-green-600 text-lg mr-1.5" />
                        <Text className="text-green-600 text-sm font-medium">编辑</Text>
                      </View>
                      <View
                        onClick={() => handleDeleteWarehouse(warehouse)}
                        className="bg-white rounded-lg py-2.5 flex items-center justify-center active:bg-gray-100 transition-all border border-gray-200">
                        <View className="i-mdi-delete-outline text-red-600 text-lg mr-1.5" />
                        <Text className="text-red-600 text-sm font-medium">删除</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 底部安全距离 */}
          <View className="h-6" />
        </View>
      </ScrollView>

      {/* 添加仓库对话框 - 优化设计 */}
      {showAddWarehouse && (
        <View className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            {/* 标题 */}
            <View className="flex items-center mb-6">
              <View className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mr-3">
                <View className="i-mdi-warehouse-plus text-blue-600 text-2xl" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 text-xl font-bold block">添加仓库</Text>
                <Text className="text-gray-400 text-xs block">Create New Warehouse</Text>
              </View>
            </View>

            {/* 表单 */}
            <View className="mb-6">
              <Text className="text-gray-700 text-sm font-medium block mb-2">仓库名称</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border-2 border-gray-200 focus:border-blue-500 transition-all"
                  placeholder="请输入仓库名称"
                  value={newWarehouseName}
                  onInput={(e) => setNewWarehouseName(e.detail.value)}
                />
              </View>
            </View>

            {/* 按钮 */}
            <View className="flex gap-3">
              <View
                onClick={() => setShowAddWarehouse(false)}
                className="flex-1 bg-gray-100 rounded-xl py-3.5 flex items-center justify-center active:bg-gray-200 transition-all">
                <Text className="text-gray-700 text-base font-medium">取消</Text>
              </View>
              <View
                onClick={handleAddWarehouse}
                className="flex-1 bg-blue-600 rounded-xl py-3.5 flex items-center justify-center active:bg-blue-700 transition-all shadow-sm">
                <View className="i-mdi-check text-white text-lg mr-1.5" />
                <Text className="text-white text-base font-medium">确定</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 编辑仓库对话框（合并考勤规则） */}
      {showEditWarehouse && currentWarehouse && (
        <View className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <View className="bg-white rounded-lg p-6 m-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <Text className="text-gray-800 text-lg font-bold block mb-4">编辑仓库信息</Text>

            {/* 基本信息 */}
            <View className="mb-4">
              <Text className="text-gray-800 text-base font-bold block mb-3">基本信息</Text>

              <View className="mb-3">
                <Text className="text-gray-700 text-sm block mb-2">仓库名称</Text>
                <Input
                  className="bg-gray-50 rounded-lg p-3 text-gray-800"
                  placeholder="请输入仓库名称"
                  value={editWarehouseName}
                  onInput={(e) => setEditWarehouseName(e.detail.value)}
                />
              </View>

              <View className="flex items-center justify-between">
                <Text className="text-gray-700 text-sm">启用状态</Text>
                <Switch checked={editWarehouseActive} onChange={(e) => setEditWarehouseActive(e.detail.value)} />
              </View>
            </View>

            {/* 考勤规则 */}
            <View className="mb-4 border-t border-gray-200 pt-4">
              <Text className="text-gray-800 text-base font-bold block mb-3">考勤规则</Text>

              <View className="mb-3">
                <Text className="text-gray-700 text-sm block mb-2">上班时间</Text>
                <Picker mode="time" value={ruleStartTime} onChange={(e) => setRuleStartTime(e.detail.value)}>
                  <View className="bg-gray-50 rounded-lg p-3">
                    <Text className="text-gray-800">{ruleStartTime}</Text>
                  </View>
                </Picker>
              </View>

              <View className="mb-3">
                <Text className="text-gray-700 text-sm block mb-2">下班时间</Text>
                <Picker mode="time" value={ruleEndTime} onChange={(e) => setRuleEndTime(e.detail.value)}>
                  <View className="bg-gray-50 rounded-lg p-3">
                    <Text className="text-gray-800">{ruleEndTime}</Text>
                  </View>
                </Picker>
              </View>

              <View className="mb-3">
                <Text className="text-gray-700 text-sm block mb-2">迟到阈值（分钟）</Text>
                <Input
                  className="bg-gray-50 rounded-lg p-3 text-gray-800"
                  type="number"
                  placeholder="请输入迟到阈值"
                  value={ruleLateThreshold}
                  onInput={(e) => setRuleLateThreshold(e.detail.value)}
                />
              </View>

              <View className="mb-3">
                <Text className="text-gray-700 text-sm block mb-2">早退阈值（分钟）</Text>
                <Input
                  className="bg-gray-50 rounded-lg p-3 text-gray-800"
                  type="number"
                  placeholder="请输入早退阈值"
                  value={ruleEarlyThreshold}
                  onInput={(e) => setRuleEarlyThreshold(e.detail.value)}
                />
              </View>

              <View className="mb-3 flex items-center justify-between">
                <Text className="text-gray-700 text-sm">需要打下班卡</Text>
                <Switch checked={ruleRequireClockOut} onChange={(e) => setRuleRequireClockOut(e.detail.value)} />
              </View>

              <View className="flex items-center justify-between">
                <Text className="text-gray-700 text-sm">启用考勤规则</Text>
                <Switch checked={ruleActive} onChange={(e) => setRuleActive(e.detail.value)} />
              </View>
            </View>

            {/* 请假与离职设置 */}
            <View className="mb-4 border-t border-gray-200 pt-4">
              <Text className="text-gray-800 text-base font-bold block mb-3">请假与离职设置</Text>

              <View className="mb-3">
                <Text className="text-gray-700 text-sm block mb-2">月度请假天数上限</Text>
                <Input
                  className="bg-gray-50 rounded-lg p-3 text-gray-800"
                  type="number"
                  placeholder="请输入天数(1-365)"
                  value={editMaxLeaveDays}
                  onInput={(e) => setEditMaxLeaveDays(e.detail.value)}
                />
                <Text className="text-gray-400 text-xs block mt-1">司机每月请假总天数不能超过此上限</Text>
              </View>

              <View className="mb-0">
                <Text className="text-gray-700 text-sm block mb-2">离职申请提前天数</Text>
                <Input
                  className="bg-gray-50 rounded-lg p-3 text-gray-800"
                  type="number"
                  placeholder="请输入天数(1-365)"
                  value={editResignationNoticeDays}
                  onInput={(e) => setEditResignationNoticeDays(e.detail.value)}
                />
                <Text className="text-gray-400 text-xs block mt-1">司机离职申请需提前此天数提交</Text>
              </View>
            </View>

            <View className="flex gap-3">
              <Button
                size="default"
                className="flex-1 bg-gray-200 text-gray-700 text-base break-keep"
                onClick={() => setShowEditWarehouse(false)}>
                取消
              </Button>
              <Button
                size="default"
                className="flex-1 bg-blue-600 text-white text-base break-keep"
                onClick={handleUpdateWarehouse}>
                保存
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 密码验证弹窗 */}
      <PasswordVerifyModal
        visible={showPasswordVerify}
        onCancel={handlePasswordVerifyCancel}
        onSuccess={handlePasswordVerifySuccess}
        title="安全验证"
        description="此操作需要验证您的登录密码以确保安全"
      />
    </View>
  )
}

export default WarehouseManagement
