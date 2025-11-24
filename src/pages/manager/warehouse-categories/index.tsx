import {Button, Input, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  batchUpsertCategoryPrices,
  deleteCategory,
  getAllCategories,
  getCategoryPricesByWarehouse,
  getManagerWarehouses,
  updateCategory
} from '@/db/api'
import type {CategoryPrice, PieceWorkCategory, Warehouse} from '@/db/types'
import {confirmDelete} from '@/utils/confirm'

// 品类价格编辑状态
interface CategoryPriceEdit {
  categoryId: string
  categoryName: string
  unitPrice: string
  upstairsPrice: string
  sortingUnitPrice: string
  isNew?: boolean // 标记是否为新添加的品类
}

const WarehouseCategories: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [_categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [_categoryPrices, setCategoryPrices] = useState<CategoryPrice[]>([])
  const [priceEdits, setPriceEdits] = useState<CategoryPriceEdit[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  // 获取当前选中的仓库
  const selectedWarehouse = warehouses[selectedWarehouseIndex]

  // 加载管理员的仓库列表
  const loadWarehouses = useCallback(async () => {
    if (!user?.id) return
    const data = await getManagerWarehouses(user.id)
    setWarehouses(data)
  }, [user?.id])

  // 加载品类列表
  const loadCategories = useCallback(async () => {
    const data = await getAllCategories()
    setCategories(data)
  }, [])

  // 加载品类价格配置
  const loadCategoryPrices = useCallback(async () => {
    if (!selectedWarehouse) return
    const data = await getCategoryPricesByWarehouse(selectedWarehouse.id)
    setCategoryPrices(data)

    // 初始化编辑状态 - 显示当前仓库已配置的品类
    const edits: CategoryPriceEdit[] = data.map((price) => ({
      categoryId: price.id,
      categoryName: price.category_name,
      unitPrice: price.unit_price.toString(),
      upstairsPrice: price.upstairs_price.toString(),
      sortingUnitPrice: price.sorting_unit_price.toString(),
      isNew: false
    }))
    setPriceEdits(edits)
  }, [selectedWarehouse])

  useEffect(() => {
    loadWarehouses()
    loadCategories()
  }, [loadWarehouses, loadCategories])

  useEffect(() => {
    loadCategoryPrices()
  }, [loadCategoryPrices])

  useDidShow(() => {
    loadWarehouses()
    loadCategories()
    loadCategoryPrices()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadWarehouses(), loadCategories(), loadCategoryPrices()])
    Taro.stopPullDownRefresh()
  })

  // 添加新品类到当前仓库
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      Taro.showToast({
        title: '请输入品类名称',
        icon: 'none'
      })
      return
    }

    // 添加到编辑列表
    const newEdit: CategoryPriceEdit = {
      categoryId: `new_${Date.now()}`, // 临时ID
      categoryName: newCategoryName.trim(),
      unitPrice: '0',
      upstairsPrice: '0',
      sortingUnitPrice: '0',
      isNew: true
    }
    setPriceEdits([...priceEdits, newEdit])
    setNewCategoryName('')
  }

  // 更新价格编辑状态
  const updatePriceEdit = (index: number, field: keyof CategoryPriceEdit, value: string) => {
    const newEdits = [...priceEdits]
    newEdits[index] = {
      ...newEdits[index],
      [field]: value
    }
    setPriceEdits(newEdits)
  }

  // 删除品类
  const handleDeleteCategory = async (index: number) => {
    const edit = priceEdits[index]

    const confirmed = await confirmDelete('删除品类', `确定要删除品类"${edit.categoryName}"吗？`)
    if (!confirmed) return

    if (edit.isNew) {
      // 如果是新添加的，直接从列表中移除
      const newEdits = priceEdits.filter((_, i) => i !== index)
      setPriceEdits(newEdits)
      Taro.showToast({
        title: '已移除',
        icon: 'success'
      })
    } else {
      // 如果是已存在的品类，需要从数据库删除
      const success = await deleteCategory(edit.categoryId)
      if (success) {
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        })
        loadCategories()
        loadCategoryPrices()
      } else {
        Taro.showToast({
          title: '删除失败',
          icon: 'error'
        })
      }
    }
  }

  // 开始编辑品类名称
  const startEditCategoryName = (index: number) => {
    const edit = priceEdits[index]
    setEditingCategoryId(edit.categoryId)
    setEditingCategoryName(edit.categoryName)
  }

  // 保存品类名称
  const handleSaveCategoryName = async (index: number) => {
    const edit = priceEdits[index]

    if (!editingCategoryName.trim()) {
      Taro.showToast({
        title: '品类名称不能为空',
        icon: 'none'
      })
      return
    }

    if (edit.isNew) {
      // 如果是新品类，只更新本地状态
      updatePriceEdit(index, 'categoryName', editingCategoryName.trim())
      setEditingCategoryId(null)
      setEditingCategoryName('')
    } else {
      // 如果是已存在的品类，更新数据库
      const success = await updateCategory(edit.categoryId, {
        warehouse_id: selectedWarehouse.id,
        category_name: editingCategoryName.trim(),
        unit_price: Number.parseFloat(edit.unitPrice),
        upstairs_price: Number.parseFloat(edit.upstairsPrice),
        sorting_unit_price: Number.parseFloat(edit.sortingUnitPrice),
        is_active: true
      })

      if (success) {
        Taro.showToast({
          title: '修改成功',
          icon: 'success'
        })
        setEditingCategoryId(null)
        setEditingCategoryName('')
        loadCategories()
        loadCategoryPrices()
      } else {
        Taro.showToast({
          title: '修改失败',
          icon: 'error'
        })
      }
    }
  }

  // 保存所有品类和价格配置
  const handleSaveAll = async () => {
    if (!selectedWarehouse) {
      Taro.showToast({
        title: '请选择仓库',
        icon: 'none'
      })
      return
    }

    if (priceEdits.length === 0) {
      Taro.showToast({
        title: '请至少添加一个品类',
        icon: 'none'
      })
      return
    }

    // 验证所有输入
    for (const edit of priceEdits) {
      if (!edit.categoryName.trim()) {
        Taro.showToast({
          title: '品类名称不能为空',
          icon: 'none'
        })
        return
      }

      const unitPrice = Number.parseFloat(edit.unitPrice)
      const upstairsPrice = Number.parseFloat(edit.upstairsPrice)
      const sortingUnitPrice = Number.parseFloat(edit.sortingUnitPrice)

      if (Number.isNaN(unitPrice) || unitPrice < 0) {
        Taro.showToast({
          title: `${edit.categoryName}的单价无效`,
          icon: 'none'
        })
        return
      }

      if (Number.isNaN(upstairsPrice) || upstairsPrice < 0) {
        Taro.showToast({
          title: `${edit.categoryName}的上楼价格无效`,
          icon: 'none'
        })
        return
      }

      if (Number.isNaN(sortingUnitPrice) || sortingUnitPrice < 0) {
        Taro.showToast({
          title: `${edit.categoryName}的分拣单价无效`,
          icon: 'none'
        })
        return
      }
    }

    // 直接保存所有品类价格配置（新品类和已有品类都通过 upsert 处理）
    const priceInputs = priceEdits.map((edit) => ({
      warehouse_id: selectedWarehouse.id,
      category_name: edit.categoryName.trim(),
      unit_price: Number.parseFloat(edit.unitPrice),
      upstairs_price: Number.parseFloat(edit.upstairsPrice),
      sorting_unit_price: Number.parseFloat(edit.sortingUnitPrice),
      is_active: true
    }))

    const success = await batchUpsertCategoryPrices(priceInputs)

    if (success) {
      Taro.showToast({
        title: '保存成功',
        icon: 'success'
      })
      loadCategories()
      loadCategoryPrices()
    } else {
      Taro.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
  }

  // 处理仓库切换
  const handleWarehouseChange = (e: any) => {
    setSelectedWarehouseIndex(e.detail.current)
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #f0fdf4, #dcfce7)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-green-700 to-green-600 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">品类价格管理</Text>
            <Text className="text-green-100 text-sm block">为不同仓库的品类设置价格</Text>
          </View>

          {/* 仓库切换 */}
          {warehouses.length > 0 ? (
            <View>
              {/* 多个仓库显示 */}
              {warehouses.length > 1 && (
                <View className="mb-4">
                  <View className="flex items-center justify-between mb-2">
                    <Text className="text-gray-600 text-sm">当前仓库</Text>
                    <Text className="text-gray-500 text-xs">
                      ({selectedWarehouseIndex + 1}/{warehouses.length})
                    </Text>
                  </View>
                  <View className="bg-white rounded-xl shadow-md overflow-hidden">
                    <Swiper
                      className="h-16"
                      current={selectedWarehouseIndex}
                      onChange={handleWarehouseChange}
                      indicatorDots
                      indicatorColor="rgba(0, 0, 0, 0.2)"
                      indicatorActiveColor="#16A34A">
                      {warehouses.map((warehouse) => (
                        <SwiperItem key={warehouse.id}>
                          <View className="h-full flex items-center justify-center bg-gradient-to-r from-green-50 to-green-100">
                            <View className="i-mdi-warehouse text-2xl text-green-600 mr-2" />
                            <Text className="text-lg font-bold text-green-900">{warehouse.name}</Text>
                          </View>
                        </SwiperItem>
                      ))}
                    </Swiper>
                  </View>
                </View>
              )}

              {/* 单个仓库显示 */}
              {warehouses.length === 1 && (
                <View className="bg-white rounded-xl shadow-md p-4 mb-4">
                  <View className="flex items-center justify-center">
                    <View className="i-mdi-warehouse text-2xl text-green-600 mr-2" />
                    <Text className="text-lg font-bold text-green-900">{warehouses[0].name}</Text>
                  </View>
                </View>
              )}

              {/* 添加品类区域 */}
              <View className="bg-white rounded-lg p-4 mb-4 shadow">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-plus-circle text-green-600 text-xl mr-2" />
                  <Text className="text-gray-800 text-base font-bold">添加品类</Text>
                </View>
                <View className="flex items-center">
                  <View className="flex-1 mr-2" style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-gray-50 rounded px-3 py-2 text-sm"
                      placeholder="输入品类名称"
                      value={newCategoryName}
                      onInput={(e) => setNewCategoryName(e.detail.value)}
                    />
                  </View>
                  <Button
                    size="default"
                    className="bg-green-600 text-white px-6 py-2 rounded text-sm break-keep"
                    onClick={handleAddCategory}>
                    添加
                  </Button>
                </View>
              </View>

              {/* 品类列表 */}
              {priceEdits.length > 0 ? (
                <View className="bg-white rounded-lg p-4 shadow mb-4">
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-format-list-bulleted text-green-600 text-xl mr-2" />
                    <Text className="text-gray-800 text-base font-bold">品类列表</Text>
                  </View>

                  {/* 表头 */}
                  <View className="flex items-center bg-gray-50 rounded-lg p-3 mb-2">
                    <View className="flex-1">
                      <Text className="text-gray-600 text-xs font-bold">品类名称</Text>
                    </View>
                    <View className="w-16 text-center">
                      <Text className="text-gray-600 text-xs font-bold">单价</Text>
                    </View>
                    <View className="w-16 text-center">
                      <Text className="text-gray-600 text-xs font-bold">上楼</Text>
                    </View>
                    <View className="w-16 text-center">
                      <Text className="text-gray-600 text-xs font-bold">分拣</Text>
                    </View>
                    <View className="w-16 text-center">
                      <Text className="text-gray-600 text-xs font-bold">操作</Text>
                    </View>
                  </View>

                  {/* 品类列表 */}
                  {priceEdits.map((edit, index) => (
                    <View key={edit.categoryId} className="flex items-center py-3 border-b border-gray-100">
                      {/* 品类名称 */}
                      <View className="flex-1 pr-2">
                        {editingCategoryId === edit.categoryId ? (
                          <View className="flex items-center">
                            <View className="flex-1 mr-1" style={{overflow: 'hidden'}}>
                              <Input
                                className="bg-gray-50 rounded px-2 py-1 text-sm"
                                value={editingCategoryName}
                                onInput={(e) => setEditingCategoryName(e.detail.value)}
                              />
                            </View>
                            <View
                              className="i-mdi-check text-green-600 text-lg"
                              onClick={() => handleSaveCategoryName(index)}
                            />
                          </View>
                        ) : (
                          <View className="flex items-center">
                            <Text className="text-gray-800 text-sm flex-1">{edit.categoryName}</Text>
                            <View
                              className="i-mdi-pencil text-gray-400 text-base ml-1"
                              onClick={() => startEditCategoryName(index)}
                            />
                          </View>
                        )}
                      </View>

                      {/* 单价 */}
                      <View className="w-16 px-1">
                        <View style={{overflow: 'hidden'}}>
                          <Input
                            type="digit"
                            className="bg-gray-50 rounded px-2 py-1 text-xs text-center"
                            placeholder="0"
                            value={edit.unitPrice}
                            onInput={(e) => updatePriceEdit(index, 'unitPrice', e.detail.value)}
                          />
                        </View>
                      </View>

                      {/* 上楼价格 */}
                      <View className="w-16 px-1">
                        <View style={{overflow: 'hidden'}}>
                          <Input
                            type="digit"
                            className="bg-gray-50 rounded px-2 py-1 text-xs text-center"
                            placeholder="0"
                            value={edit.upstairsPrice}
                            onInput={(e) => updatePriceEdit(index, 'upstairsPrice', e.detail.value)}
                          />
                        </View>
                      </View>

                      {/* 分拣单价 */}
                      <View className="w-16 px-1">
                        <View style={{overflow: 'hidden'}}>
                          <Input
                            type="digit"
                            className="bg-gray-50 rounded px-2 py-1 text-xs text-center"
                            placeholder="0"
                            value={edit.sortingUnitPrice}
                            onInput={(e) => updatePriceEdit(index, 'sortingUnitPrice', e.detail.value)}
                          />
                        </View>
                      </View>

                      {/* 删除按钮 */}
                      <View className="w-16 flex justify-center">
                        <View
                          className="i-mdi-delete text-red-500 text-lg"
                          onClick={() => handleDeleteCategory(index)}
                        />
                      </View>
                    </View>
                  ))}

                  {/* 保存按钮 */}
                  <View className="mt-4">
                    <Button
                      size="default"
                      className="w-full bg-green-600 text-white py-3 rounded-lg text-base break-keep"
                      onClick={handleSaveAll}>
                      保存所有配置
                    </Button>
                  </View>
                </View>
              ) : (
                <View className="bg-white rounded-lg p-6 shadow text-center">
                  <View className="i-mdi-information text-blue-400 text-4xl mb-2 mx-auto" />
                  <Text className="text-gray-600 text-sm block">该仓库暂无品类</Text>
                  <Text className="text-gray-400 text-xs block mt-1">请使用上方的添加功能添加品类</Text>
                </View>
              )}
            </View>
          ) : (
            <View className="bg-white rounded-lg p-6 mb-4 shadow text-center">
              <View className="i-mdi-alert-circle text-orange-400 text-4xl mb-2 mx-auto" />
              <Text className="text-gray-600 text-sm block">您还没有管理的仓库</Text>
              <Text className="text-gray-400 text-xs block mt-1">请联系老板分配仓库</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default WarehouseCategories
