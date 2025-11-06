import {Button, Input, Picker, ScrollView, Switch, Text, Textarea, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  createPieceWorkRecord,
  deletePieceWorkRecord,
  getActiveCategories,
  getDriverWarehouses,
  getPieceWorkRecordsByUser,
  updatePieceWorkRecord
} from '@/db/api'
import type {PieceWorkCategory, PieceWorkRecord, PieceWorkRecordInput, Warehouse} from '@/db/types'

const PieceWorkEntry: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])

  // 表单数据
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0)
  const [workDate, setWorkDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [needUpstairs, setNeedUpstairs] = useState(false)
  const [upstairsPrice, setUpstairsPrice] = useState('')
  const [notes, setNotes] = useState('')

  // 编辑状态
  const [editingRecord, setEditingRecord] = useState<PieceWorkRecord | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // 初始化日期为今天
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setWorkDate(`${year}-${month}-${day}`)
  }, [])

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user?.id) return

    // 加载司机的仓库
    const driverWarehouses = await getDriverWarehouses(user.id)
    setWarehouses(driverWarehouses)

    // 加载品类
    const categoriesData = await getActiveCategories()
    setCategories(categoriesData)

    // 加载本月的计件记录
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const firstDay = `${year}-${month}-01`
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
    const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

    const recordsData = await getPieceWorkRecordsByUser(user.id, firstDay, lastDayStr)
    setRecords(recordsData)
  }, [user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  // 重置表单
  const resetForm = () => {
    setSelectedWarehouseIndex(0)
    setSelectedCategoryIndex(0)
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setWorkDate(`${year}-${month}-${day}`)
    setQuantity('')
    setUnitPrice('')
    setNeedUpstairs(false)
    setUpstairsPrice('')
    setNotes('')
    setEditingRecord(null)
    setIsEditing(false)
  }

  // 提交表单
  const handleSubmit = async () => {
    // 验证用户登录状态
    if (!user?.id) {
      Taro.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 验证表单
    if (warehouses.length === 0) {
      Taro.showToast({
        title: '请先分配仓库',
        icon: 'none'
      })
      return
    }

    if (categories.length === 0) {
      Taro.showToast({
        title: '暂无可用品类',
        icon: 'none'
      })
      return
    }

    if (!quantity || Number(quantity) <= 0) {
      Taro.showToast({
        title: '请输入有效数量',
        icon: 'none'
      })
      return
    }

    if (!unitPrice || Number(unitPrice) < 0) {
      Taro.showToast({
        title: '请输入有效单价',
        icon: 'none'
      })
      return
    }

    if (needUpstairs && (!upstairsPrice || Number(upstairsPrice) < 0)) {
      Taro.showToast({
        title: '请输入有效上楼单价',
        icon: 'none'
      })
      return
    }

    const warehouse = warehouses[selectedWarehouseIndex]
    const category = categories[selectedCategoryIndex]

    if (!warehouse || !category) {
      Taro.showToast({
        title: '请选择仓库和品类',
        icon: 'none'
      })
      return
    }

    const input: PieceWorkRecordInput = {
      user_id: user.id,
      warehouse_id: warehouse.id,
      category_id: category.id,
      work_date: workDate,
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
      total_amount:
        Number(quantity) * Number(unitPrice) + (needUpstairs ? Number(quantity) * Number(upstairsPrice) : 0),
      need_upstairs: needUpstairs,
      upstairs_price: needUpstairs ? Number(upstairsPrice) : 0,
      notes: notes.trim() || undefined
    }

    let success = false

    if (isEditing && editingRecord) {
      // 更新记录
      success = await updatePieceWorkRecord(editingRecord.id, input)
      if (success) {
        Taro.showToast({
          title: '更新成功',
          icon: 'success'
        })
      } else {
        Taro.showToast({
          title: '更新失败',
          icon: 'error'
        })
      }
    } else {
      // 创建新记录
      const newRecord = await createPieceWorkRecord(input)
      if (newRecord) {
        success = true
        Taro.showToast({
          title: '录入成功',
          icon: 'success'
        })
      } else {
        Taro.showToast({
          title: '录入失败',
          icon: 'error'
        })
      }
    }

    if (success) {
      resetForm()
      loadData()
    }
  }

  // 编辑记录
  const handleEdit = (record: PieceWorkRecord) => {
    setEditingRecord(record)
    setIsEditing(true)

    // 填充表单
    const warehouseIndex = warehouses.findIndex((w) => w.id === record.warehouse_id)
    setSelectedWarehouseIndex(warehouseIndex >= 0 ? warehouseIndex : 0)

    const categoryIndex = categories.findIndex((c) => c.id === record.category_id)
    setSelectedCategoryIndex(categoryIndex >= 0 ? categoryIndex : 0)

    setWorkDate(record.work_date)
    setQuantity(String(record.quantity))
    setUnitPrice(String(record.unit_price))
    setNeedUpstairs(record.need_upstairs)
    setUpstairsPrice(record.need_upstairs ? String(record.upstairs_price) : '')
    setNotes(record.notes || '')

    // 滚动到顶部
    Taro.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
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
        loadData()
      } else {
        Taro.showToast({
          title: '删除失败',
          icon: 'error'
        })
      }
    }
  }

  // 计算总金额
  const calculateTotal = () => {
    if (!quantity || Number(quantity) <= 0 || !unitPrice || Number(unitPrice) < 0) return 0

    const baseAmount = Number(quantity) * Number(unitPrice)
    const upstairsAmount = needUpstairs && upstairsPrice ? Number(quantity) * Number(upstairsPrice) : 0

    return baseAmount + upstairsAmount
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 获取仓库名称
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId)
    return warehouse?.name || '未知仓库'
  }

  // 获取品类名称
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || '未知品类'
  }

  const warehouseOptions = warehouses.map((w) => w.name)
  const categoryOptions = categories.map((c) => c.name)

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">{isEditing ? '编辑计件' : '计件录入'}</Text>
            <Text className="text-orange-100 text-sm block">录入和管理您的计件工作数据</Text>
          </View>

          {/* 录入表单 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center mb-4">
              <View className="i-mdi-clipboard-edit text-orange-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">{isEditing ? '编辑记录' : '录入信息'}</Text>
              {isEditing && (
                <View className="ml-auto">
                  <Button
                    size="mini"
                    className="text-xs"
                    style={{
                      backgroundColor: '#6B7280',
                      color: 'white',
                      borderRadius: '6px',
                      border: 'none'
                    }}
                    onClick={resetForm}>
                    取消编辑
                  </Button>
                </View>
              )}
            </View>

            {/* 仓库选择 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-700 block mb-2">
                仓库 <Text className="text-red-500">*</Text>
              </Text>
              {warehouses.length > 0 ? (
                <Picker
                  mode="selector"
                  range={warehouseOptions}
                  value={selectedWarehouseIndex}
                  onChange={(e) => setSelectedWarehouseIndex(Number(e.detail.value))}>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                    <Text className="text-gray-800">{warehouseOptions[selectedWarehouseIndex]}</Text>
                    <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                  </View>
                </Picker>
              ) : (
                <View className="bg-gray-50 rounded-lg px-4 py-3">
                  <Text className="text-gray-400 text-sm">暂无可用仓库</Text>
                </View>
              )}
            </View>

            {/* 品类选择 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-700 block mb-2">
                品类 <Text className="text-red-500">*</Text>
              </Text>
              {categories.length > 0 ? (
                <Picker
                  mode="selector"
                  range={categoryOptions}
                  value={selectedCategoryIndex}
                  onChange={(e) => setSelectedCategoryIndex(Number(e.detail.value))}>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                    <Text className="text-gray-800">{categoryOptions[selectedCategoryIndex]}</Text>
                    <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                  </View>
                </Picker>
              ) : (
                <View className="bg-gray-50 rounded-lg px-4 py-3">
                  <Text className="text-gray-400 text-sm">暂无可用品类</Text>
                </View>
              )}
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
                type="number"
                value={quantity}
                onInput={(e) => setQuantity(e.detail.value)}
                placeholder="请输入数量"
                className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800"
              />
            </View>

            {/* 单价 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-700 block mb-2">
                单价（元/件） <Text className="text-red-500">*</Text>
              </Text>
              <Input
                type="digit"
                value={unitPrice}
                onInput={(e) => setUnitPrice(e.detail.value)}
                placeholder="请输入单价"
                className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800"
              />
            </View>

            {/* 是否需要上楼 */}
            <View className="mb-3">
              <View className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <Text className="text-sm text-gray-700">是否需要上楼</Text>
                <Switch checked={needUpstairs} onChange={(e) => setNeedUpstairs(e.detail.value)} color="#F97316" />
              </View>
            </View>

            {/* 上楼单价 */}
            {needUpstairs && (
              <View className="mb-3">
                <Text className="text-sm text-gray-700 block mb-2">
                  上楼单价（元/件） <Text className="text-red-500">*</Text>
                </Text>
                <Input
                  type="digit"
                  value={upstairsPrice}
                  onInput={(e) => setUpstairsPrice(e.detail.value)}
                  placeholder="请输入上楼单价"
                  className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800"
                />
              </View>
            )}

            {/* 备注 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-700 block mb-2">备注</Text>
              <Textarea
                value={notes}
                onInput={(e) => setNotes(e.detail.value)}
                placeholder="选填，可添加备注信息"
                maxlength={200}
                className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800"
                style={{height: '80px'}}
              />
            </View>

            {/* 预计金额 */}
            <View className="bg-green-50 rounded-lg p-3 mb-4">
              <View className="flex items-center justify-between">
                <Text className="text-sm text-gray-700">预计金额</Text>
                <Text className="text-xl font-bold text-green-600">¥{calculateTotal().toFixed(2)}</Text>
              </View>
            </View>

            {/* 提交按钮 */}
            <Button
              className="w-full text-base break-keep"
              size="default"
              style={{
                backgroundColor: '#F97316',
                color: 'white',
                borderRadius: '8px',
                border: 'none'
              }}
              onClick={handleSubmit}>
              {isEditing ? '保存修改' : '提交录入'}
            </Button>
          </View>

          {/* 本月记录 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-history text-blue-900 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">本月记录</Text>
              <View className="ml-auto">
                <Text className="text-xs text-gray-500">共 {records.length} 条</Text>
              </View>
            </View>

            {records.length > 0 ? (
              <View className="space-y-2">
                {records.map((record) => (
                  <View key={record.id} className="bg-gray-50 rounded-lg p-4">
                    <View className="flex items-center justify-between mb-2">
                      <View className="flex items-center">
                        <View className="i-mdi-warehouse text-blue-600 text-lg mr-2" />
                        <Text className="text-sm text-gray-800 font-medium">
                          {getWarehouseName(record.warehouse_id)}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500">{formatDate(record.work_date)}</Text>
                    </View>

                    <View className="flex items-center mb-2">
                      <View className="i-mdi-tag text-orange-600 text-lg mr-2" />
                      <Text className="text-sm text-gray-700">{getCategoryName(record.category_id)}</Text>
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

                    <View className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                      <View
                        className="flex items-center bg-blue-50 px-3 py-1 rounded"
                        onClick={() => handleEdit(record)}>
                        <View className="i-mdi-pencil text-blue-600 text-sm mr-1" />
                        <Text className="text-xs text-blue-600">编辑</Text>
                      </View>
                      <View
                        className="flex items-center bg-red-50 px-3 py-1 rounded"
                        onClick={() => handleDelete(record.id)}>
                        <View className="i-mdi-delete text-red-600 text-sm mr-1" />
                        <Text className="text-xs text-red-600">删除</Text>
                      </View>
                    </View>
                  </View>
                ))}
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

export default PieceWorkEntry
