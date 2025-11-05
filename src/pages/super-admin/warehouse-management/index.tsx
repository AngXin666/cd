import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {
  createAttendanceRule,
  createWarehouse,
  deleteWarehouse,
  getAllWarehouses,
  getAttendanceRuleByWarehouseId,
  updateWarehouse
} from '@/db/api'
import type {AttendanceRule, Warehouse} from '@/db/types'

interface WarehouseWithRule extends Warehouse {
  rule?: AttendanceRule
}

const WarehouseManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [warehouses, setWarehouses] = useState<WarehouseWithRule[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius: '500',
    workStartTime: '09:00',
    workEndTime: '18:00',
    lateThreshold: '15',
    earlyThreshold: '15'
  })

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    showLoading({title: '加载中...'})
    const data = await getAllWarehouses()

    // 加载每个仓库的规则
    const warehousesWithRules = await Promise.all(
      data.map(async (warehouse) => {
        const rule = await getAttendanceRuleByWarehouseId(warehouse.id)
        return {...warehouse, rule}
      })
    )

    setWarehouses(warehousesWithRules)
    Taro.hideLoading()
  }, [])

  useDidShow(() => {
    loadWarehouses()
  })

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      radius: '500',
      workStartTime: '09:00',
      workEndTime: '18:00',
      lateThreshold: '15',
      earlyThreshold: '15'
    })
    setEditingWarehouse(null)
    setShowAddForm(false)
  }

  // 显示添加表单
  const handleShowAddForm = () => {
    resetForm()
    setShowAddForm(true)
  }

  // 显示编辑表单
  const handleShowEditForm = (warehouse: WarehouseWithRule) => {
    setEditingWarehouse(warehouse)
    setFormData({
      name: warehouse.name,
      address: warehouse.address,
      latitude: warehouse.latitude.toString(),
      longitude: warehouse.longitude.toString(),
      radius: warehouse.radius.toString(),
      workStartTime: warehouse.rule?.work_start_time || '09:00',
      workEndTime: warehouse.rule?.work_end_time || '18:00',
      lateThreshold: warehouse.rule?.late_threshold.toString() || '15',
      earlyThreshold: warehouse.rule?.early_threshold.toString() || '15'
    })
    setShowAddForm(true)
  }

  // 保存仓库
  const handleSave = async () => {
    // 验证表单
    if (!formData.name || !formData.address || !formData.latitude || !formData.longitude) {
      showToast({title: '请填写完整信息', icon: 'none'})
      return
    }

    const lat = Number.parseFloat(formData.latitude)
    const lon = Number.parseFloat(formData.longitude)
    const radius = Number.parseFloat(formData.radius)

    if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(radius)) {
      showToast({title: '经纬度或范围格式错误', icon: 'none'})
      return
    }

    showLoading({title: '保存中...'})

    if (editingWarehouse) {
      // 更新仓库
      const success = await updateWarehouse(editingWarehouse.id, {
        name: formData.name,
        address: formData.address,
        latitude: lat,
        longitude: lon,
        radius
      })

      if (success) {
        showToast({title: '更新成功', icon: 'success'})
        resetForm()
        await loadWarehouses()
      } else {
        showToast({title: '更新失败', icon: 'none'})
      }
    } else {
      // 创建仓库
      const warehouse = await createWarehouse({
        name: formData.name,
        address: formData.address,
        latitude: lat,
        longitude: lon,
        radius
      })

      if (warehouse) {
        // 创建考勤规则
        await createAttendanceRule({
          warehouse_id: warehouse.id,
          work_start_time: formData.workStartTime,
          work_end_time: formData.workEndTime,
          late_threshold: Number.parseInt(formData.lateThreshold, 10),
          early_threshold: Number.parseInt(formData.earlyThreshold, 10)
        })

        showToast({title: '创建成功', icon: 'success'})
        resetForm()
        await loadWarehouses()
      } else {
        showToast({title: '创建失败', icon: 'none'})
      }
    }

    Taro.hideLoading()
  }

  // 删除仓库
  const handleDelete = async (warehouse: Warehouse) => {
    const res = await showModal({
      title: '确认删除',
      content: `确定要删除仓库"${warehouse.name}"吗？删除后无法恢复。`
    })

    if (res.confirm) {
      showLoading({title: '删除中...'})
      const success = await deleteWarehouse(warehouse.id)
      Taro.hideLoading()

      if (success) {
        showToast({title: '删除成功', icon: 'success'})
        await loadWarehouses()
      } else {
        showToast({title: '删除失败', icon: 'none'})
      }
    }
  }

  // 切换仓库状态
  const handleToggleStatus = async (warehouse: Warehouse) => {
    showLoading({title: '更新中...'})
    const success = await updateWarehouse(warehouse.id, {
      is_active: !warehouse.is_active
    })
    Taro.hideLoading()

    if (success) {
      showToast({title: '更新成功', icon: 'success'})
      await loadWarehouses()
    } else {
      showToast({title: '更新失败', icon: 'none'})
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY style={{background: 'transparent'}} className="box-border">
        <View className="p-4">
          {/* 添加按钮 */}
          {!showAddForm && (
            <Button size="default" className="bg-blue-600 text-white mb-4 text-base" onClick={handleShowAddForm}>
              + 添加仓库
            </Button>
          )}

          {/* 添加/编辑表单 */}
          {showAddForm && (
            <View className="bg-white rounded-lg p-4 mb-4 shadow">
              <Text className="text-gray-800 text-lg font-bold mb-4 block">
                {editingWarehouse ? '编辑仓库' : '添加仓库'}
              </Text>

              <View className="mb-3">
                <Text className="text-gray-700 text-sm mb-1 block">仓库名称</Text>
                <Input
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="请输入仓库名称"
                  value={formData.name}
                  onInput={(e) => setFormData({...formData, name: e.detail.value})}
                />
              </View>

              <View className="mb-3">
                <Text className="text-gray-700 text-sm mb-1 block">仓库地址</Text>
                <Input
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="请输入仓库地址"
                  value={formData.address}
                  onInput={(e) => setFormData({...formData, address: e.detail.value})}
                />
              </View>

              <View className="flex gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-gray-700 text-sm mb-1 block">纬度</Text>
                  <Input
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="39.9042"
                    type="digit"
                    value={formData.latitude}
                    onInput={(e) => setFormData({...formData, latitude: e.detail.value})}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 text-sm mb-1 block">经度</Text>
                  <Input
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="116.4074"
                    type="digit"
                    value={formData.longitude}
                    onInput={(e) => setFormData({...formData, longitude: e.detail.value})}
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-gray-700 text-sm mb-1 block">打卡范围（米）</Text>
                <Input
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="500"
                  type="number"
                  value={formData.radius}
                  onInput={(e) => setFormData({...formData, radius: e.detail.value})}
                />
              </View>

              {!editingWarehouse && (
                <>
                  <View className="border-t border-gray-200 my-4" />
                  <Text className="text-gray-800 text-base font-bold mb-3 block">考勤规则</Text>

                  <View className="flex gap-2 mb-3">
                    <View className="flex-1">
                      <Text className="text-gray-700 text-sm mb-1 block">上班时间</Text>
                      <Input
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                        placeholder="09:00"
                        value={formData.workStartTime}
                        onInput={(e) => setFormData({...formData, workStartTime: e.detail.value})}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-700 text-sm mb-1 block">下班时间</Text>
                      <Input
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                        placeholder="18:00"
                        value={formData.workEndTime}
                        onInput={(e) => setFormData({...formData, workEndTime: e.detail.value})}
                      />
                    </View>
                  </View>

                  <View className="flex gap-2 mb-3">
                    <View className="flex-1">
                      <Text className="text-gray-700 text-sm mb-1 block">迟到阈值（分钟）</Text>
                      <Input
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                        placeholder="15"
                        type="number"
                        value={formData.lateThreshold}
                        onInput={(e) => setFormData({...formData, lateThreshold: e.detail.value})}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-700 text-sm mb-1 block">早退阈值（分钟）</Text>
                      <Input
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                        placeholder="15"
                        type="number"
                        value={formData.earlyThreshold}
                        onInput={(e) => setFormData({...formData, earlyThreshold: e.detail.value})}
                      />
                    </View>
                  </View>
                </>
              )}

              <View className="flex gap-2">
                <Button size="default" className="flex-1 bg-gray-300 text-gray-700 text-sm" onClick={resetForm}>
                  取消
                </Button>
                <Button size="default" className="flex-1 bg-blue-600 text-white text-sm" onClick={handleSave}>
                  保存
                </Button>
              </View>
            </View>
          )}

          {/* 仓库列表 */}
          <View>
            {warehouses.map((warehouse) => (
              <View key={warehouse.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-gray-800 text-lg font-bold">{warehouse.name}</Text>
                  <View className={`px-2 py-1 rounded ${warehouse.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Text className={`text-xs ${warehouse.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                      {warehouse.is_active ? '启用' : '禁用'}
                    </Text>
                  </View>
                </View>

                <Text className="text-gray-600 text-sm mb-1 block">📍 {warehouse.address}</Text>
                <Text className="text-gray-500 text-xs mb-1 block">
                  坐标：{warehouse.latitude.toFixed(6)}, {warehouse.longitude.toFixed(6)}
                </Text>
                <Text className="text-gray-500 text-xs mb-3 block">打卡范围：{warehouse.radius}米</Text>

                {warehouse.rule && (
                  <View className="bg-blue-50 p-3 rounded mb-3">
                    <Text className="text-blue-800 text-xs font-bold mb-1 block">考勤规则</Text>
                    <Text className="text-blue-600 text-xs block">
                      上班：{warehouse.rule.work_start_time} | 下班：{warehouse.rule.work_end_time}
                    </Text>
                    <Text className="text-blue-600 text-xs block">
                      迟到阈值：{warehouse.rule.late_threshold}分钟 | 早退阈值：{warehouse.rule.early_threshold}分钟
                    </Text>
                  </View>
                )}

                <View className="flex gap-2">
                  <Button
                    size="default"
                    className="flex-1 bg-blue-50 text-blue-600 text-xs"
                    onClick={() => handleShowEditForm(warehouse)}>
                    编辑
                  </Button>
                  <Button
                    size="default"
                    className={`flex-1 text-xs ${
                      warehouse.is_active ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                    }`}
                    onClick={() => handleToggleStatus(warehouse)}>
                    {warehouse.is_active ? '禁用' : '启用'}
                  </Button>
                  <Button
                    size="default"
                    className="flex-1 bg-red-50 text-red-600 text-xs"
                    onClick={() => handleDelete(warehouse)}>
                    删除
                  </Button>
                </View>
              </View>
            ))}

            {warehouses.length === 0 && !showAddForm && (
              <View className="bg-white rounded-lg p-8 text-center">
                <Text className="text-gray-400 text-sm">暂无仓库，点击上方按钮添加</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default WarehouseManagement
