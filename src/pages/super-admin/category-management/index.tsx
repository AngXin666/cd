import {Button, Input, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  batchUpsertCategoryPrices,
  createCategory,
  deleteCategory,
  getAllCategories,
  getAllWarehouses,
  getCategoryPricesByWarehouse,
  setWarehouseCategories,
  updateCategory
} from '@/db/api'
import type {CategoryPrice, PieceWorkCategory, Warehouse} from '@/db/types'
import {confirmDelete} from '@/utils/confirm'

// 品类价格编辑状态
interface CategoryPriceEdit {
  categoryId: string
  categoryName: string
  driverPrice: string
  driverWithVehiclePrice: string
  isNew?: boolean // 标记是否为新添加的品类
}

const CategoryManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [_categoryPrices, setCategoryPrices] = useState<CategoryPrice[]>([])
  const [priceEdits, setPriceEdits] = useState<CategoryPriceEdit[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  // 获取当前选中的仓库
  const selectedWarehouse = warehouses[selectedWarehouseIndex]

  // 加载所有仓库列表（超级管理员）
  const loadWarehouses = useCallback(async () => {
    const data = await getAllWarehouses()
    setWarehouses(data)
  }, [])

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

    // 初始化编辑状态 - 只显示当前仓库已配置的品类
    const edits: CategoryPriceEdit[] = data.map((price) => {
      const category = categories.find((c) => c.id === price.category_id)
      return {
        categoryId: price.category_id,
        categoryName: category?.name || '',
        driverPrice: price.driver_price.toString(),
        driverWithVehiclePrice: price.driver_with_vehicle_price.toString(),
        isNew: false
      }
    })
    setPriceEdits(edits)
  }, [selectedWarehouse, categories])

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
      driverPrice: '0',
      driverWithVehiclePrice: '0',
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
        name: editingCategoryName.trim()
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

      const driverPrice = Number.parseFloat(edit.driverPrice)
      const driverWithVehiclePrice = Number.parseFloat(edit.driverWithVehiclePrice)

      if (Number.isNaN(driverPrice) || driverPrice < 0) {
        Taro.showToast({
          title: `${edit.categoryName}的纯司机价格无效`,
          icon: 'none'
        })
        return
      }

      if (Number.isNaN(driverWithVehiclePrice) || driverWithVehiclePrice < 0) {
        Taro.showToast({
          title: `${edit.categoryName}的带车司机价格无效`,
          icon: 'none'
        })
        return
      }
    }

    // 处理新品类：先创建品类
    const categoryIds: string[] = []
    for (const edit of priceEdits) {
      if (edit.isNew) {
        const newCategory = await createCategory({
          name: edit.categoryName.trim(),
          is_active: true
        })
        if (newCategory) {
          categoryIds.push(newCategory.id)
          // 更新编辑状态中的ID
          edit.categoryId = newCategory.id
          edit.isNew = false
        } else {
          Taro.showToast({
            title: `创建品类"${edit.categoryName}"失败`,
            icon: 'error'
          })
          return
        }
      } else {
        categoryIds.push(edit.categoryId)
      }
    }

    // 保存价格配置
    const priceInputs = priceEdits.map((edit) => ({
      warehouse_id: selectedWarehouse.id,
      category_id: edit.categoryId,
      driver_price: Number.parseFloat(edit.driverPrice),
      driver_with_vehicle_price: Number.parseFloat(edit.driverWithVehiclePrice)
    }))

    const success = await batchUpsertCategoryPrices(priceInputs)

    if (success) {
      // 保存品类配置到 warehouse_categories 表
      await setWarehouseCategories(selectedWarehouse.id, categoryIds)

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
          <View className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">品类价格管理</Text>
            <Text className="text-blue-100 text-sm block">为不同仓库的品类设置价格</Text>
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
                          <View className="h-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100">
                            <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                            <Text className="text-lg font-bold text-blue-900">{warehouse.name}</Text>
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
                    <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                    <Text className="text-lg font-bold text-blue-900">{warehouses[0].name}</Text>
                  </View>
                </View>
              )}

              {/* 添加品类区域 */}
              <View className="bg-white rounded-lg p-4 mb-4 shadow">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-plus-circle text-blue-600 text-xl mr-2" />
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
                    className="bg-blue-600 text-white px-6 py-2 rounded text-sm break-keep"
                    onClick={handleAddCategory}>
                    添加
                  </Button>
                </View>
              </View>

              {/* 品类列表 */}
              {priceEdits.length > 0 ? (
                <View className="bg-white rounded-lg p-4 shadow mb-4">
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-format-list-bulleted text-blue-600 text-xl mr-2" />
                    <Text className="text-gray-800 text-base font-bold">品类列表</Text>
                  </View>

                  {/* 表头 */}
                  <View className="flex items-center bg-gray-50 rounded-lg p-3 mb-2">
                    <View className="flex-1">
                      <Text className="text-gray-600 text-xs font-bold">品类名称</Text>
                    </View>
                    <View className="w-20 text-center">
                      <Text className="text-gray-600 text-xs font-bold">纯司机</Text>
                    </View>
                    <View className="w-20 text-center">
                      <Text className="text-gray-600 text-xs font-bold">带车司机</Text>
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
                              className="i-mdi-check text-blue-600 text-lg"
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

                      {/* 纯司机价格 */}
                      <View className="w-20 px-1">
                        <View style={{overflow: 'hidden'}}>
                          <Input
                            type="digit"
                            className="bg-gray-50 rounded px-2 py-1 text-xs text-center"
                            placeholder="0"
                            value={edit.driverPrice}
                            onInput={(e) => updatePriceEdit(index, 'driverPrice', e.detail.value)}
                          />
                        </View>
                      </View>

                      {/* 带车司机价格 */}
                      <View className="w-20 px-1">
                        <View style={{overflow: 'hidden'}}>
                          <Input
                            type="digit"
                            className="bg-gray-50 rounded px-2 py-1 text-xs text-center"
                            placeholder="0"
                            value={edit.driverWithVehiclePrice}
                            onInput={(e) => updatePriceEdit(index, 'driverWithVehiclePrice', e.detail.value)}
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
                      className="w-full bg-blue-600 text-white py-3 rounded-lg text-base break-keep"
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
              <Text className="text-gray-600 text-sm block">暂无仓库</Text>
              <Text className="text-gray-400 text-xs block mt-1">请先在仓库管理中添加仓库</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default CategoryManagement
