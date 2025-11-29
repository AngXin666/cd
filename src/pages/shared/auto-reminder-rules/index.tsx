import {Button, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import {showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {
  createAutoReminderRule,
  deleteAutoReminderRule,
  getAllWarehouses,
  getAutoReminderRules,
  updateAutoReminderRule
} from '@/db/api'
import type {AutoReminderRuleWithWarehouse, Warehouse} from '@/db/types'

/**
 * 自动提醒规则管理页面
 */
const AutoReminderRules: React.FC = () => {
  const {user} = useAuth({guard: true})

  const [rules, setRules] = useState<AutoReminderRuleWithWarehouse[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AutoReminderRuleWithWarehouse | null>(null)

  // 表单数据
  const [ruleName, setRuleName] = useState('')
  const [ruleType, setRuleType] = useState<string>('attendance')
  const [checkTime, setCheckTime] = useState('09:00')
  const [reminderContent, setReminderContent] = useState('')
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(true)

  const ruleTypes = [
    {value: 'attendance', label: '打卡提醒'},
    {value: 'piece_work', label: '计件提醒'}
  ]

  // 加载规则
  const loadRules = useCallback(async () => {
    const data = await getAutoReminderRules()
    setRules(data)
  }, [])

  // 加载仓库
  const loadWarehouses = useCallback(async () => {
    const data = await getAllWarehouses()
    setWarehouses(data)
  }, [])

  useDidShow(() => {
    loadRules()
    loadWarehouses()
  })

  // 打开新建表单
  const handleCreate = () => {
    setEditingRule(null)
    setRuleName('')
    setRuleType('attendance')
    setCheckTime('09:00')
    setReminderContent('')
    setWarehouseId(null)
    setIsActive(true)
    setShowForm(true)
  }

  // 打开编辑表单
  const handleEdit = (rule: AutoReminderRuleWithWarehouse) => {
    setEditingRule(rule)
    setRuleName(rule.rule_name)
    setRuleType(rule.rule_type)
    setCheckTime(rule.check_time)
    setReminderContent(rule.reminder_content)
    setWarehouseId(rule.warehouse_id)
    setIsActive(rule.is_active)
    setShowForm(true)
  }

  // 保存规则
  const handleSave = async () => {
    if (!ruleName.trim()) {
      showToast({title: '请输入规则名称', icon: 'none'})
      return
    }
    if (!reminderContent.trim()) {
      showToast({title: '请输入提醒内容', icon: 'none'})
      return
    }

    try {
      if (editingRule) {
        // 更新
        const success = await updateAutoReminderRule(editingRule.id, {
          rule_name: ruleName,
          rule_type: ruleType,
          check_time: checkTime,
          reminder_content: reminderContent,
          warehouse_id: warehouseId,
          is_active: isActive
        })

        if (success) {
          showToast({title: '更新成功', icon: 'success'})
          setShowForm(false)
          loadRules()
        } else {
          showToast({title: '更新失败', icon: 'error'})
        }
      } else {
        // 创建
        const result = await createAutoReminderRule({
          rule_name: ruleName,
          rule_type: ruleType,
          check_time: checkTime,
          reminder_content: reminderContent,
          reminder_time: checkTime, // 使用 check_time 作为 reminder_time
          message: reminderContent, // 使用 reminder_content 作为 message
          warehouse_id: warehouseId,
          is_active: isActive,
          created_by: user?.id
        })

        if (result) {
          showToast({title: '创建成功', icon: 'success'})
          setShowForm(false)
          loadRules()
        } else {
          showToast({title: '创建失败', icon: 'error'})
        }
      }
    } catch (error) {
      console.error('保存规则失败:', error)
      showToast({title: '操作失败', icon: 'error'})
    }
  }

  // 删除规则
  const handleDelete = async (rule: AutoReminderRuleWithWarehouse) => {
    const res = await showModal({
      title: '确认删除',
      content: `确定要删除规则"${rule.rule_name}"吗？`
    })

    if (res.confirm) {
      const success = await deleteAutoReminderRule(rule.id)
      if (success) {
        showToast({title: '删除成功', icon: 'success'})
        loadRules()
      } else {
        showToast({title: '删除失败', icon: 'error'})
      }
    }
  }

  // 切换启用状态
  const handleToggleActive = async (rule: AutoReminderRuleWithWarehouse) => {
    const success = await updateAutoReminderRule(rule.id, {
      is_active: !rule.is_active
    })

    if (success) {
      showToast({
        title: rule.is_active ? '已禁用' : '已启用',
        icon: 'success'
      })
      loadRules()
    }
  }

  const getRuleTypeLabel = (type: string) => {
    return ruleTypes.find((t) => t.value === type)?.label || '打卡提醒'
  }

  if (showForm) {
    return (
      <View style={{background: 'linear-gradient(to bottom, #fce7f3, #fbcfe8)', minHeight: '100vh'}}>
        <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
          <View className="p-4">
            {/* 表单标题 */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-800 mb-4">{editingRule ? '编辑规则' : '新建规则'}</Text>

              <View className="mb-3">
                <Text className="text-sm text-gray-700 mb-2">规则名称</Text>
                <View style={{overflow: 'hidden'}}>
                  <Textarea
                    value={ruleName}
                    onInput={(e) => setRuleName(e.detail.value)}
                    placeholder="请输入规则名称"
                    maxlength={50}
                    className="bg-gray-50 text-foreground px-3 py-2 rounded border border-border w-full"
                    style={{height: '60px'}}
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-sm text-gray-700 mb-2">规则类型</Text>
                <Picker
                  mode="selector"
                  range={ruleTypes}
                  rangeKey="label"
                  value={ruleTypes.findIndex((t) => t.value === ruleType)}
                  onChange={(e) => {
                    const index = e.detail.value
                    setRuleType(ruleTypes[index].value as any)
                  }}>
                  <View className="bg-gray-50 px-3 py-3 rounded border border-border flex items-center justify-between">
                    <Text className="text-sm text-gray-700">{getRuleTypeLabel(ruleType)}</Text>
                    <View className="i-mdi-chevron-down text-lg text-gray-500" />
                  </View>
                </Picker>
              </View>

              <View className="mb-3">
                <Text className="text-sm text-gray-700 mb-2">检查时间</Text>
                <Picker mode="time" value={checkTime} onChange={(e) => setCheckTime(e.detail.value)}>
                  <View className="bg-gray-50 px-3 py-3 rounded border border-border flex items-center justify-between">
                    <Text className="text-sm text-gray-700">{checkTime}</Text>
                    <View className="i-mdi-clock text-lg text-gray-500" />
                  </View>
                </Picker>
              </View>

              <View className="mb-3">
                <Text className="text-sm text-gray-700 mb-2">提醒内容</Text>
                <View style={{overflow: 'hidden'}}>
                  <Textarea
                    value={reminderContent}
                    onInput={(e) => setReminderContent(e.detail.value)}
                    placeholder="请输入提醒内容"
                    maxlength={200}
                    className="bg-gray-50 text-foreground px-3 py-2 rounded border border-border w-full"
                    style={{height: '100px'}}
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-sm text-gray-700 mb-2">适用仓库（不选则为全局规则）</Text>
                <Picker
                  mode="selector"
                  range={[{id: null, name: '全局规则'}, ...warehouses]}
                  rangeKey="name"
                  value={
                    warehouseId
                      ? (() => {
                          const idx = warehouses.findIndex((w) => w.id === warehouseId)
                          return idx >= 0 ? idx + 1 : 0
                        })()
                      : 0
                  }
                  onChange={(e) => {
                    const index = Number(e.detail.value)
                    setWarehouseId(index === 0 ? null : warehouses[index - 1]?.id || null)
                  }}>
                  <View className="bg-gray-50 px-3 py-3 rounded border border-border flex items-center justify-between">
                    <Text className="text-sm text-gray-700">
                      {warehouseId ? warehouses.find((w) => w.id === warehouseId)?.name : '全局规则'}
                    </Text>
                    <View className="i-mdi-chevron-down text-lg text-gray-500" />
                  </View>
                </Picker>
              </View>

              <View
                onClick={() => setIsActive(!isActive)}
                className="flex items-center justify-between bg-gray-50 px-3 py-3 rounded active:bg-gray-100">
                <Text className="text-sm text-gray-700">启用规则</Text>
                <View className={`w-12 h-6 rounded-full transition-all ${isActive ? 'bg-purple-500' : 'bg-gray-300'}`}>
                  <View
                    className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-all ${isActive ? 'ml-6' : 'ml-0.5'}`}
                  />
                </View>
              </View>
            </View>

            {/* 操作按钮 */}
            <View className="flex gap-3">
              <View className="flex-1">
                <Button
                  onClick={() => setShowForm(false)}
                  className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl break-keep text-base"
                  size="default">
                  取消
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  onClick={handleSave}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-xl break-keep text-base font-bold"
                  size="default">
                  保存
                </Button>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #fce7f3, #fbcfe8)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 新建按钮 */}
          <View className="mb-4">
            <Button
              onClick={handleCreate}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-xl break-keep text-base font-bold"
              size="default">
              <View className="flex items-center justify-center">
                <View className="i-mdi-plus text-xl mr-2" />
                <Text>新建规则</Text>
              </View>
            </Button>
          </View>

          {/* 规则列表 */}
          {rules.length === 0 ? (
            <View className="bg-white rounded-xl p-8 text-center shadow-sm">
              <View className="i-mdi-bell-ring-outline text-6xl text-gray-300 mb-4 mx-auto" />
              <Text className="text-gray-500">暂无自动提醒规则</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {rules.map((rule) => (
                <View key={rule.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-800 mb-1">{rule.rule_name}</Text>
                      <View className="flex items-center gap-2 mb-2">
                        <View
                          className={`inline-block px-2 py-1 rounded ${rule.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Text className={`text-xs ${rule.is_active ? 'text-green-700' : 'text-gray-500'}`}>
                            {rule.is_active ? '已启用' : '已禁用'}
                          </Text>
                        </View>
                        <View className="inline-block bg-purple-100 px-2 py-1 rounded">
                          <Text className="text-xs text-purple-700">{getRuleTypeLabel(rule.rule_type)}</Text>
                        </View>
                      </View>
                    </View>

                    <View onClick={() => handleToggleActive(rule)} className="p-2 active:bg-gray-100 rounded">
                      <View
                        className={`w-10 h-5 rounded-full transition-all ${rule.is_active ? 'bg-purple-500' : 'bg-gray-300'}`}>
                        <View
                          className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-all ${rule.is_active ? 'ml-5' : 'ml-0.5'}`}
                        />
                      </View>
                    </View>
                  </View>

                  <Text className="text-sm text-gray-600 mb-2">{rule.reminder_content}</Text>

                  <View className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <View className="flex items-center">
                      <View className="i-mdi-clock-outline text-base mr-1" />
                      <Text>检查时间：{rule.check_time}</Text>
                    </View>
                    <View className="flex items-center">
                      <View className="i-mdi-warehouse text-base mr-1" />
                      <Text>{rule.warehouse?.name || '全局规则'}</Text>
                    </View>
                  </View>

                  <View className="flex gap-2">
                    <View className="flex-1">
                      <Button
                        onClick={() => handleEdit(rule)}
                        className="w-full bg-purple-50 text-purple-600 py-2 rounded-lg break-keep text-sm"
                        size="default">
                        编辑
                      </Button>
                    </View>
                    <View className="flex-1">
                      <Button
                        onClick={() => handleDelete(rule)}
                        className="w-full bg-red-50 text-red-600 py-2 rounded-lg break-keep text-sm"
                        size="default">
                        删除
                      </Button>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default AutoReminderRules
