import {Button, Input, Picker, ScrollView, Switch, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  createPieceWorkRecord,
  deletePieceWorkRecord,
  getActiveCategories,
  getAllProfiles,
  getAllWarehouses,
  getCurrentUserProfile,
  getManagerWarehouses,
  getPieceWorkRecordsByWarehouse,
  updatePieceWorkRecord
} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, Profile, Warehouse} from '@/db/types'

const PieceWorkManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [_profile, setProfile] = useState<Profile | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])

  // 表单状态
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedDriverIndex, setSelectedDriverIndex] = useState(0)
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0)
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0])
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [needUpstairs, setNeedUpstairs] = useState(false)
  const [upstairsPrice, setUpstairsPrice] = useState('')
  const [notes, setNotes] = useState('')

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null)

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user?.id) return

    // 加载当前用户信息
    const profileData = await getCurrentUserProfile()
    setProfile(profileData)

    // 加载品类
    const categoriesData = await getActiveCategories()
    setCategories(categoriesData)

    // 加载司机列表
    const allProfiles = await getAllProfiles()
    const driverList = allProfiles.filter((p) => p.role === 'driver')
    setDrivers(driverList)

    // 根据角色加载仓库
    if (profileData?.role === 'super_admin') {
      // 超级管理员可以看到所有仓库
      const allWarehouses = await getAllWarehouses()
      setWarehouses(allWarehouses)
    } else if (profileData?.role === 'manager') {
      // 普通管理员只能看到管辖的仓库
      const managerWarehouses = await getManagerWarehouses(user.id)
      setWarehouses(managerWarehouses)
    }
  }, [user?.id])

  // 加载计件记录
  const loadRecords = useCallback(async () => {
    if (warehouses.length === 0) return

    const warehouseId = warehouses[selectedWarehouseIndex]?.id
    if (!warehouseId) return

    const data = await getPieceWorkRecordsByWarehouse(warehouseId)
    setRecords(data)
  }, [warehouses, selectedWarehouseIndex])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useDidShow(() => {
    loadData()
  })

  // 重置表单
  const resetForm = () => {
    setSelectedDriverIndex(0)
    setSelectedCategoryIndex(0)
    setWorkDate(new Date().toISOString().split('T')[0])
    setQuantity('')
    setUnitPrice('')
    setNeedUpstairs(false)
    setUpstairsPrice('')
    setNotes('')
    setEditingId(null)
  }

  // 添加计件记录
  const handleAdd = async () => {
    if (!quantity || !unitPrice) {
      Taro.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
      return
    }

    if (needUpstairs && !upstairsPrice) {
      Taro.showToast({
        title: '请填写上楼单价',
        icon: 'none'
      })
      return
    }

    const driver = drivers[selectedDriverIndex]
    const warehouse = warehouses[selectedWarehouseIndex]
    const category = categories[selectedCategoryIndex]

    if (!driver || !warehouse || !category) {
      Taro.showToast({
        title: '请选择完整信息',
        icon: 'none'
      })
      return
    }

    const quantityNum = Number.parseInt(quantity, 10)
    const unitPriceNum = Number.parseFloat(unitPrice)
    const upstairsPriceNum = needUpstairs ? Number.parseFloat(upstairsPrice) : 0

    const totalAmount = quantityNum * unitPriceNum + (needUpstairs ? quantityNum * upstairsPriceNum : 0)

    const success = await createPieceWorkRecord({
      user_id: driver.id,
      warehouse_id: warehouse.id,
      category_id: category.id,
      work_date: workDate,
      quantity: quantityNum,
      unit_price: unitPriceNum,
      need_upstairs: needUpstairs,
      upstairs_price: upstairsPriceNum,
      total_amount: totalAmount,
      notes: notes || null
    })

    if (success) {
      Taro.showToast({
        title: '添加成功',
        icon: 'success'
      })
      setShowAddForm(false)
      resetForm()
      loadRecords()
    } else {
      Taro.showToast({
        title: '添加失败',
        icon: 'error'
      })
    }
  }

  // 开始编辑
  const handleStartEdit = (record: PieceWorkRecord) => {
    setEditingId(record.id)
    setWorkDate(record.work_date)
    setQuantity(record.quantity.toString())
    setUnitPrice(record.unit_price.toString())
    setNeedUpstairs(record.need_upstairs)
    setUpstairsPrice(record.upstairs_price.toString())
    setNotes(record.notes || '')

    // 设置司机、仓库、品类的选择
    const driverIndex = drivers.findIndex((d) => d.id === record.user_id)
    if (driverIndex >= 0) setSelectedDriverIndex(driverIndex)

    const warehouseIndex = warehouses.findIndex((w) => w.id === record.warehouse_id)
    if (warehouseIndex >= 0) setSelectedWarehouseIndex(warehouseIndex)

    const categoryIndex = categories.findIndex((c) => c.id === record.category_id)
    if (categoryIndex >= 0) setSelectedCategoryIndex(categoryIndex)
  }

  // 保存编辑
  const handleSaveEdit = async (id: string) => {
    if (!quantity || !unitPrice) {
      Taro.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
      return
    }

    if (needUpstairs && !upstairsPrice) {
      Taro.showToast({
        title: '请填写上楼单价',
        icon: 'none'
      })
      return
    }

    const quantityNum = Number.parseInt(quantity, 10)
    const unitPriceNum = Number.parseFloat(unitPrice)
    const upstairsPriceNum = needUpstairs ? Number.parseFloat(upstairsPrice) : 0

    const totalAmount = quantityNum * unitPriceNum + (needUpstairs ? quantityNum * upstairsPriceNum : 0)

    const success = await updatePieceWorkRecord(id, {
      work_date: workDate,
      quantity: quantityNum,
      unit_price: unitPriceNum,
      need_upstairs: needUpstairs,
      upstairs_price: upstairsPriceNum,
      total_amount: totalAmount,
      notes: notes || null
    })

    if (success) {
      Taro.showToast({
        title: '更新成功',
        icon: 'success'
      })
      resetForm()
      loadRecords()
    } else {
      Taro.showToast({
        title: '更新失败',
        icon: 'error'
      })
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    resetForm()
  }

  // 删除记录
  const handleDelete = async (id: string) => {
    const result = await Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条计件记录吗？',
      confirmText: '删除',
      confirmColor: '#EF4444'
    })

    if (result.confirm) {
      const success = await deletePieceWorkRecord(id)

      if (success) {
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        })
        loadRecords()
      } else {
        Taro.showToast({
          title: '删除失败',
          icon: 'error'
        })
      }
    }
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">计件管理</Text>
            <Text className="text-orange-100 text-sm block">录入和管理计件工作数据</Text>
          </View>

          {/* 仓库选择 */}
          {warehouses.length > 0 && (
            <View className="bg-white rounded-lg p-4 mb-4 shadow">
              <View className="flex items-center mb-3">
                <View className="i-mdi-warehouse text-orange-600 text-xl mr-2" />
                <Text className="text-gray-800 text-base font-bold">选择仓库</Text>
              </View>
              <Picker
                mode="selector"
                range={warehouses.map((w) => w.name)}
                value={selectedWarehouseIndex}
                onChange={(e) => setSelectedWarehouseIndex(Number(e.detail.value))}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-gray-800">{warehouses[selectedWarehouseIndex]?.name || '请选择仓库'}</Text>
                  <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                </View>
              </Picker>
            </View>
          )}

          {/* 添加按钮 */}
          {!showAddForm && (
            <View className="mb-4">
              <Button
                size="default"
                className="w-full text-sm break-keep"
                style={{
                  backgroundColor: '#EA580C',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none'
                }}
                onClick={() => setShowAddForm(true)}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-plus-circle mr-2" />
                  <Text>添加计件记录</Text>
                </View>
              </Button>
            </View>
          )}

          {/* 添加表单 */}
          {showAddForm && (
            <View className="bg-white rounded-lg p-4 mb-4 shadow">
              <View className="flex items-center justify-between mb-4">
                <View className="flex items-center">
                  <View className="i-mdi-plus-circle text-orange-600 text-xl mr-2" />
                  <Text className="text-gray-800 text-base font-bold">添加计件记录</Text>
                </View>
                <Button
                  size="mini"
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs break-keep"
                  onClick={() => {
                    setShowAddForm(false)
                    resetForm()
                  }}>
                  取消
                </Button>
              </View>

              {/* 司机选择 */}
              <View className="mb-3">
                <Text className="text-sm text-gray-700 block mb-2">
                  司机 <Text className="text-red-500">*</Text>
                </Text>
                <Picker
                  mode="selector"
                  range={drivers.map((d) => d.name || d.phone || '未命名')}
                  value={selectedDriverIndex}
                  onChange={(e) => setSelectedDriverIndex(Number(e.detail.value))}>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                    <Text className="text-gray-800">
                      {drivers[selectedDriverIndex]?.name || drivers[selectedDriverIndex]?.phone || '请选择司机'}
                    </Text>
                    <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                  </View>
                </Picker>
              </View>

              {/* 品类选择 */}
              <View className="mb-3">
                <Text className="text-sm text-gray-700 block mb-2">
                  品类 <Text className="text-red-500">*</Text>
                </Text>
                <Picker
                  mode="selector"
                  range={categories.map((c) => c.name)}
                  value={selectedCategoryIndex}
                  onChange={(e) => setSelectedCategoryIndex(Number(e.detail.value))}>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                    <Text className="text-gray-800">{categories[selectedCategoryIndex]?.name || '请选择品类'}</Text>
                    <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                  </View>
                </Picker>
              </View>

              {/* 工作日期 */}
              <View className="mb-3">
                <Text className="text-sm text-gray-700 block mb-2">
                  工作日期 <Text className="text-red-500">*</Text>
                </Text>
                <Picker mode="date" value={workDate} onChange={(e) => setWorkDate(e.detail.value)}>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                    <Text className="text-gray-800">{workDate}</Text>
                    <View className="i-mdi-calendar text-gray-400 text-xl" />
                  </View>
                </Picker>
              </View>

              {/* 数量 */}
              <View className="mb-3">
                <Text className="text-sm text-gray-700 block mb-2">
                  数量 <Text className="text-red-500">*</Text>
                </Text>
                <Input
                  className="bg-gray-50 rounded-lg px-4 py-3 text-sm"
                  type="number"
                  placeholder="请输入数量"
                  value={quantity}
                  onInput={(e) => setQuantity(e.detail.value)}
                />
              </View>

              {/* 单价 */}
              <View className="mb-3">
                <Text className="text-sm text-gray-700 block mb-2">
                  单价（元） <Text className="text-red-500">*</Text>
                </Text>
                <Input
                  className="bg-gray-50 rounded-lg px-4 py-3 text-sm"
                  type="digit"
                  placeholder="请输入单价"
                  value={unitPrice}
                  onInput={(e) => setUnitPrice(e.detail.value)}
                />
              </View>

              {/* 是否需要上楼 */}
              <View className="mb-3">
                <View className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <Text className="text-sm text-gray-700">是否需要上楼</Text>
                  <Switch checked={needUpstairs} color="#EA580C" onChange={(e) => setNeedUpstairs(e.detail.value)} />
                </View>
              </View>

              {/* 上楼单价 */}
              {needUpstairs && (
                <View className="mb-3">
                  <Text className="text-sm text-gray-700 block mb-2">
                    上楼单价（元） <Text className="text-red-500">*</Text>
                  </Text>
                  <Input
                    className="bg-gray-50 rounded-lg px-4 py-3 text-sm"
                    type="digit"
                    placeholder="请输入上楼单价"
                    value={upstairsPrice}
                    onInput={(e) => setUpstairsPrice(e.detail.value)}
                  />
                </View>
              )}

              {/* 备注 */}
              <View className="mb-4">
                <Text className="text-sm text-gray-700 block mb-2">备注</Text>
                <Input
                  className="bg-gray-50 rounded-lg px-4 py-3 text-sm"
                  placeholder="请输入备注（可选）"
                  value={notes}
                  onInput={(e) => setNotes(e.detail.value)}
                />
              </View>

              {/* 提交按钮 */}
              <Button
                size="default"
                className="w-full text-sm break-keep"
                style={{
                  backgroundColor: '#EA580C',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none'
                }}
                onClick={handleAdd}>
                确认添加
              </Button>
            </View>
          )}

          {/* 计件记录列表 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-clipboard-list text-orange-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">计件记录</Text>
              <View className="ml-auto">
                <Text className="text-xs text-gray-500">共 {records.length} 条</Text>
              </View>
            </View>

            {records.length > 0 ? (
              <View className="space-y-2">
                {records.map((record) => {
                  const driver = drivers.find((d) => d.id === record.user_id)
                  const category = categories.find((c) => c.id === record.category_id)

                  return (
                    <View key={record.id} className="bg-gray-50 rounded-lg p-4">
                      {editingId === record.id ? (
                        <View>
                          {/* 编辑表单 */}
                          <View className="mb-3">
                            <Text className="text-sm text-gray-700 block mb-2">工作日期</Text>
                            <Picker mode="date" value={workDate} onChange={(e) => setWorkDate(e.detail.value)}>
                              <View className="bg-white rounded-lg px-3 py-2 flex items-center justify-between border border-gray-300">
                                <Text className="text-sm text-gray-800">{workDate}</Text>
                                <View className="i-mdi-calendar text-gray-400 text-lg" />
                              </View>
                            </Picker>
                          </View>

                          <View className="mb-3">
                            <Text className="text-sm text-gray-700 block mb-2">数量</Text>
                            <Input
                              className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                              type="number"
                              value={quantity}
                              onInput={(e) => setQuantity(e.detail.value)}
                            />
                          </View>

                          <View className="mb-3">
                            <Text className="text-sm text-gray-700 block mb-2">单价（元）</Text>
                            <Input
                              className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                              type="digit"
                              value={unitPrice}
                              onInput={(e) => setUnitPrice(e.detail.value)}
                            />
                          </View>

                          <View className="mb-3">
                            <View className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-300">
                              <Text className="text-sm text-gray-700">是否需要上楼</Text>
                              <Switch
                                checked={needUpstairs}
                                color="#EA580C"
                                onChange={(e) => setNeedUpstairs(e.detail.value)}
                              />
                            </View>
                          </View>

                          {needUpstairs && (
                            <View className="mb-3">
                              <Text className="text-sm text-gray-700 block mb-2">上楼单价（元）</Text>
                              <Input
                                className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                                type="digit"
                                value={upstairsPrice}
                                onInput={(e) => setUpstairsPrice(e.detail.value)}
                              />
                            </View>
                          )}

                          <View className="mb-3">
                            <Text className="text-sm text-gray-700 block mb-2">备注</Text>
                            <Input
                              className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                              value={notes}
                              onInput={(e) => setNotes(e.detail.value)}
                            />
                          </View>

                          <View className="flex items-center justify-end">
                            <Button
                              size="mini"
                              className="bg-gray-200 text-gray-700 px-4 py-1 rounded text-xs mr-2 break-keep"
                              onClick={handleCancelEdit}>
                              取消
                            </Button>
                            <Button
                              size="mini"
                              className="bg-orange-600 text-white px-4 py-1 rounded text-xs break-keep"
                              onClick={() => handleSaveEdit(record.id)}>
                              保存
                            </Button>
                          </View>
                        </View>
                      ) : (
                        <View>
                          <View className="flex items-center justify-between mb-2">
                            <View className="flex items-center">
                              <View className="i-mdi-account-circle text-blue-600 text-xl mr-2" />
                              <Text className="text-gray-800 text-sm font-medium">
                                {driver?.name || driver?.phone || '未知司机'}
                              </Text>
                            </View>
                            <Text className="text-xs text-gray-500">{formatDate(record.work_date)}</Text>
                          </View>

                          <View className="flex items-center mb-2">
                            <View className="i-mdi-tag text-orange-600 text-lg mr-2" />
                            <Text className="text-sm text-gray-700">{category?.name || '未知品类'}</Text>
                            {record.need_upstairs && (
                              <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded">
                                <Text className="text-xs text-blue-600">需上楼</Text>
                              </View>
                            )}
                          </View>

                          <View className="flex items-center justify-between mb-2">
                            <View className="flex items-center">
                              <Text className="text-xs text-gray-600 mr-3">数量: {record.quantity}</Text>
                              <Text className="text-xs text-gray-600 mr-3">
                                单价: ¥{Number(record.unit_price).toFixed(2)}
                              </Text>
                              {record.need_upstairs && (
                                <Text className="text-xs text-gray-600">
                                  上楼: ¥{Number(record.upstairs_price).toFixed(2)}
                                </Text>
                              )}
                            </View>
                            <Text className="text-sm text-green-600 font-medium">
                              ¥{Number(record.total_amount).toFixed(2)}
                            </Text>
                          </View>

                          {record.notes && (
                            <View className="mb-2 pt-2 border-t border-gray-200">
                              <Text className="text-xs text-gray-500">{record.notes}</Text>
                            </View>
                          )}

                          <View className="flex items-center justify-end pt-2 border-t border-gray-200">
                            <Button
                              size="mini"
                              className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs mr-2 break-keep"
                              onClick={() => handleStartEdit(record)}>
                              编辑
                            </Button>
                            <Button
                              size="mini"
                              className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs break-keep"
                              onClick={() => handleDelete(record.id)}>
                              删除
                            </Button>
                          </View>
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            ) : (
              <View className="text-center py-8">
                <View className="i-mdi-package-variant-closed text-gray-300 text-5xl mb-2" />
                <Text className="text-gray-400 text-sm block">暂无计件记录</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default PieceWorkManagement
