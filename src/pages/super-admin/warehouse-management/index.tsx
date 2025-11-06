import {Button, Input, Picker, ScrollView, Switch, Text, View} from '@tarojs/components'
import Taro, {showLoading, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import PasswordVerifyModal from '@/components/common/PasswordVerifyModal'
import {
  createAttendanceRule,
  createWarehouse,
  deleteWarehouse,
  getWarehousesWithRules,
  updateAttendanceRule,
  updateWarehouse,
  updateWarehouseSettings
} from '@/db/api'
import type {AttendanceRule, WarehouseWithRule} from '@/db/types'
import {confirmDelete} from '@/utils/confirm'

const WarehouseManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [warehouses, setWarehouses] = useState<WarehouseWithRule[]>([])
  const [showAddWarehouse, setShowAddWarehouse] = useState(false)
  const [showEditWarehouse, setShowEditWarehouse] = useState(false)
  const [currentWarehouse, setCurrentWarehouse] = useState<WarehouseWithRule | null>(null)
  const [currentRule, setCurrentRule] = useState<AttendanceRule | null>(null)

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
    const data = await getWarehousesWithRules()
    setWarehouses(data)
    Taro.hideLoading()
  }, [])

  useDidShow(() => {
    loadWarehouses()
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

      const warehouse = await createWarehouse({
        name: newWarehouseName.trim()
      })

      if (warehouse) {
        // 为新仓库创建默认考勤规则
        await createAttendanceRule({
          warehouse_id: warehouse.id,
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
    } catch (_error) {
      showToast({
        title: '创建失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      Taro.hideLoading()
    }
  }

  // 显示编辑仓库对话框（合并考勤规则）
  const handleShowEditWarehouse = (warehouse: WarehouseWithRule) => {
    setCurrentWarehouse(warehouse)
    setEditWarehouseName(warehouse.name)
    setEditWarehouseActive(warehouse.is_active)
    setEditMaxLeaveDays(String(warehouse.max_leave_days || 7))
    setEditResignationNoticeDays(String(warehouse.resignation_notice_days || 30))

    // 加载考勤规则数据
    if (warehouse.rule) {
      setCurrentRule(warehouse.rule)
      setRuleStartTime(warehouse.rule.work_start_time)
      setRuleEndTime(warehouse.rule.work_end_time)
      setRuleLateThreshold(String(warehouse.rule.late_threshold))
      setRuleEarlyThreshold(String(warehouse.rule.early_threshold))
      setRuleRequireClockOut(warehouse.rule.require_clock_out ?? true)
      setRuleActive(warehouse.rule.is_active)
    } else {
      // 如果没有规则，使用默认值
      setCurrentRule(null)
      setRuleStartTime('09:00')
      setRuleEndTime('18:00')
      setRuleLateThreshold('15')
      setRuleEarlyThreshold('15')
      setRuleRequireClockOut(true)
      setRuleActive(true)
    }

    setShowEditWarehouse(true)
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
        const success = await updateWarehouse(currentWarehouse.id, {
          name: editWarehouseName.trim(),
          is_active: editWarehouseActive
        })

        if (!success) {
          throw new Error('更新仓库信息失败')
        }

        // 2. 更新请假和离职设置
        await updateWarehouseSettings(currentWarehouse.id, {
          max_leave_days: maxLeaveDays,
          resignation_notice_days: resignationNoticeDays
        })

        // 3. 更新或创建考勤规则
        if (currentRule) {
          // 更新现有规则
          await updateAttendanceRule(currentRule.id, {
            work_start_time: ruleStartTime,
            work_end_time: ruleEndTime,
            late_threshold: lateThreshold,
            early_threshold: earlyThreshold,
            require_clock_out: ruleRequireClockOut,
            is_active: ruleActive
          })
        } else {
          // 创建新规则
          await createAttendanceRule({
            warehouse_id: currentWarehouse.id,
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
        Taro.hideLoading()
      }
    })
  }

  // 删除仓库
  const handleDeleteWarehouse = async (warehouse: WarehouseWithRule) => {
    const confirmed = await confirmDelete(
      '确认删除',
      `确定要删除仓库"${warehouse.name}"吗？\n\n删除后相关考勤规则和打卡记录也将被删除，此操作无法恢复。`
    )

    if (!confirmed) return

    // 请求密码验证
    requestPasswordVerify(async () => {
      try {
        showLoading({title: '删除中...'})

        const success = await deleteWarehouse(warehouse.id)

        if (success) {
          showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          })

          await loadWarehouses()
        }
      } catch (_error) {
        showToast({
          title: '删除失败',
          icon: 'none',
          duration: 2000
        })
      } finally {
        Taro.hideLoading()
      }
    })
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #f8fafc, #e2e8f0)', minHeight: '100vh'}}>
      <ScrollView scrollY style={{background: 'transparent'}} className="box-border">
        <View className="p-6">
          {/* 页面标题 */}
          <View className="mb-6">
            <Text className="text-gray-800 text-2xl font-bold block mb-2">仓库管理</Text>
            <Text className="text-gray-600 text-sm block">管理仓库信息和考勤规则</Text>
          </View>

          {/* 添加仓库按钮 */}
          <Button
            size="default"
            className="w-full bg-blue-600 text-white text-base font-bold mb-6 break-keep"
            onClick={handleShowAddWarehouse}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-plus text-xl mr-2" />
              <Text>添加仓库</Text>
            </View>
          </Button>

          {/* 仓库列表 */}
          {warehouses.length === 0 ? (
            <View className="bg-white rounded-lg p-8 text-center">
              <View className="i-mdi-warehouse text-gray-300 text-6xl mb-4" />
              <Text className="text-gray-400 text-base block">暂无仓库</Text>
            </View>
          ) : (
            <View className="space-y-4">
              {warehouses.map((warehouse) => (
                <View key={warehouse.id} className="bg-white rounded-lg p-4 shadow">
                  {/* 仓库信息 */}
                  <View className="flex items-center justify-between mb-3">
                    <View className="flex items-center flex-1">
                      <View className="i-mdi-warehouse text-blue-600 text-2xl mr-3" />
                      <View className="flex-1">
                        <Text className="text-gray-800 text-lg font-bold block">{warehouse.name}</Text>
                        <Text className="text-gray-500 text-xs block">{warehouse.is_active ? '启用中' : '已禁用'}</Text>
                      </View>
                    </View>
                    <View className="flex gap-2">
                      <Button
                        size="mini"
                        className="bg-purple-50 text-purple-600 text-xs break-keep"
                        onClick={() => handleViewWarehouseDetail(warehouse)}>
                        详情
                      </Button>
                      <Button
                        size="mini"
                        className="bg-blue-50 text-blue-600 text-xs break-keep"
                        onClick={() => handleShowEditWarehouse(warehouse)}>
                        编辑
                      </Button>
                      <Button
                        size="mini"
                        className="bg-red-50 text-red-600 text-xs break-keep"
                        onClick={() => handleDeleteWarehouse(warehouse)}>
                        删除
                      </Button>
                    </View>
                  </View>

                  {/* 考勤规则 */}
                  <View className="bg-gray-50 rounded-lg p-3">
                    <View className="mb-2">
                      <Text className="text-gray-700 text-sm font-bold">考勤规则</Text>
                    </View>
                    {warehouse.rule ? (
                      <View>
                        <Text className="text-gray-600 text-xs block mb-1">
                          上班时间：{warehouse.rule.work_start_time}
                        </Text>
                        <Text className="text-gray-600 text-xs block mb-1">
                          下班时间：{warehouse.rule.work_end_time}
                        </Text>
                        <Text className="text-gray-600 text-xs block mb-1">
                          迟到阈值：{warehouse.rule.late_threshold}分钟
                        </Text>
                        <Text className="text-gray-600 text-xs block mb-1">
                          早退阈值：{warehouse.rule.early_threshold}分钟
                        </Text>
                        <Text className="text-gray-600 text-xs block">
                          {warehouse.rule.require_clock_out ? '需要打下班卡' : '无需打下班卡'}
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-gray-400 text-xs">未设置考勤规则</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 添加仓库对话框 */}
      {showAddWarehouse && (
        <View className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <View className="bg-white rounded-lg p-6 m-6 w-full max-w-md">
            <Text className="text-gray-800 text-lg font-bold block mb-4">添加仓库</Text>

            <View className="mb-4">
              <Text className="text-gray-700 text-sm block mb-2">仓库名称</Text>
              <Input
                className="bg-gray-50 rounded-lg p-3 text-gray-800"
                placeholder="请输入仓库名称"
                value={newWarehouseName}
                onInput={(e) => setNewWarehouseName(e.detail.value)}
              />
            </View>

            <View className="flex gap-3">
              <Button
                size="default"
                className="flex-1 bg-gray-200 text-gray-700 text-base break-keep"
                onClick={() => setShowAddWarehouse(false)}>
                取消
              </Button>
              <Button
                size="default"
                className="flex-1 bg-blue-600 text-white text-base break-keep"
                onClick={handleAddWarehouse}>
                确定
              </Button>
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
