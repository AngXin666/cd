import {Button, Input, ScrollView, Switch, Text, View} from '@tarojs/components'
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
  driverPrice: string
  driverWithVehiclePrice: string
}

const CategoryManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [categoryPrices, setCategoryPrices] = useState<CategoryPrice[]>([])
  const [priceEdits, setPriceEdits] = useState<Map<string, CategoryPriceEdit>>(new Map())
  const [newCategoryName, setNewCategoryName] = useState('')

  // 获取当前选中的仓库
  const selectedWarehouse = warehouses[selectedWarehouseIndex]

  // 获取已配置价格的品类ID（从 category_prices 表）
  const categoryIdsWithPrice = categoryPrices.map((p) => p.category_id)

  // 加载仓库列表
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
    // 初始化编辑状态
    const edits = new Map<string, CategoryPriceEdit>()
    data.forEach((price) => {
      edits.set(price.category_id, {
        categoryId: price.category_id,
        driverPrice: price.driver_price.toString(),
        driverWithVehiclePrice: price.driver_with_vehicle_price.toString()
      })
    })
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

  // 获取当前仓库已配置的品类列表（只显示有价格配置的品类）
  const warehouseCategories = categories.filter((c) => c.is_active && categoryIdsWithPrice.includes(c.id))

  // 添加品类
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Taro.showToast({
        title: '请输入品类名称',
        icon: 'none'
      })
      return
    }

    const success = await createCategory({
      name: newCategoryName.trim(),
      is_active: true
    })

    if (success) {
      Taro.showToast({
        title: '添加成功',
        icon: 'success'
      })
      setNewCategoryName('')
      loadCategories()
    } else {
      Taro.showToast({
        title: '添加失败',
        icon: 'error'
      })
    }
  }

  // 切换品类启用状态
  const handleToggleActive = async (category: PieceWorkCategory) => {
    const success = await updateCategory(category.id, {
      is_active: !category.is_active
    })

    if (success) {
      Taro.showToast({
        title: category.is_active ? '已禁用' : '已启用',
        icon: 'success'
      })
      loadCategories()
    } else {
      Taro.showToast({
        title: '操作失败',
        icon: 'error'
      })
    }
  }

  // 删除品类
  const handleDeleteCategory = async (category: PieceWorkCategory) => {
    const confirmed = await confirmDelete('删除品类', `确定要删除品类"${category.name}"吗？`)
    if (!confirmed) return

    const success = await deleteCategory(category.id)

    if (success) {
      Taro.showToast({
        title: '删除成功',
        icon: 'success'
      })
      loadCategories()
    } else {
      Taro.showToast({
        title: '删除失败',
        icon: 'error'
      })
    }
  }

  // 获取品类的价格编辑状态
  const getPriceEdit = (categoryId: string): CategoryPriceEdit => {
    return (
      priceEdits.get(categoryId) || {
        categoryId,
        driverPrice: '0',
        driverWithVehiclePrice: '0'
      }
    )
  }

  // 更新价格编辑状态
  const updatePriceEdit = (categoryId: string, field: 'driverPrice' | 'driverWithVehiclePrice', value: string) => {
    const newEdits = new Map(priceEdits)
    const current = getPriceEdit(categoryId)
    newEdits.set(categoryId, {
      ...current,
      [field]: value
    })
    setPriceEdits(newEdits)
  }

  // 保存所有价格配置
  const handleSavePrices = async () => {
    if (!selectedWarehouse) {
      Taro.showToast({
        title: '请选择仓库',
        icon: 'none'
      })
      return
    }

    // 验证价格输入 - 只处理仓库配置的品类
    const inputs: Array<{
      warehouse_id: string
      category_id: string
      driver_price: number
      driver_with_vehicle_price: number
    }> = []

    for (const category of warehouseCategories) {
      const edit = getPriceEdit(category.id)
      const driverPrice = Number.parseFloat(edit.driverPrice)
      const driverWithVehiclePrice = Number.parseFloat(edit.driverWithVehiclePrice)

      if (Number.isNaN(driverPrice) || driverPrice < 0) {
        Taro.showToast({
          title: `${category.name}的纯司机价格无效`,
          icon: 'none'
        })
        return
      }

      if (Number.isNaN(driverWithVehiclePrice) || driverWithVehiclePrice < 0) {
        Taro.showToast({
          title: `${category.name}的带车司机价格无效`,
          icon: 'none'
        })
        return
      }

      inputs.push({
        warehouse_id: selectedWarehouse.id,
        category_id: category.id,
        driver_price: driverPrice,
        driver_with_vehicle_price: driverWithVehiclePrice
      })
    }

    const success = await batchUpsertCategoryPrices(inputs)

    if (success) {
      // 同时保存品类配置到 warehouse_categories 表
      const categoryIds = inputs.map((input) => input.category_id)
      await setWarehouseCategories(selectedWarehouse.id, categoryIds)

      Taro.showToast({
        title: '保存成功',
        icon: 'success'
      })
      loadCategoryPrices()
    } else {
      Taro.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
  }

  // 处理仓库切换
  const handleWarehouseChange = (index: number) => {
    setSelectedWarehouseIndex(index)
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">品类价格管理</Text>
            <Text className="text-blue-100 text-sm block">管理品类和设置仓库价格</Text>
          </View>

          {/* 品类管理区域 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-tag-multiple text-blue-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">品类管理</Text>
            </View>

            {/* 添加品类 */}
            <View className="mb-4">
              <View className="flex items-center gap-2">
                <View className="flex-1" style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-gray-50 rounded px-3 py-2 text-sm"
                    placeholder="输入新品类名称"
                    value={newCategoryName}
                    onInput={(e) => setNewCategoryName(e.detail.value)}
                  />
                </View>
                <Button
                  size="default"
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm break-keep"
                  onClick={handleAddCategory}>
                  添加
                </Button>
              </View>
            </View>

            {/* 品类列表 */}
            {categories.length > 0 ? (
              <View>
                <Text className="text-gray-500 text-xs mb-2 block">已有品类</Text>
                {categories.map((category) => (
                  <View key={category.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                    <View className="flex items-center flex-1">
                      <Text className={`text-sm ${category.is_active ? 'text-gray-800' : 'text-gray-400'}`}>
                        {category.name}
                      </Text>
                      {!category.is_active && <Text className="text-xs text-gray-400 ml-2">(已禁用)</Text>}
                    </View>
                    <View className="flex items-center gap-2">
                      <Switch checked={category.is_active} onChange={() => handleToggleActive(category)} />
                      <Button
                        size="mini"
                        className="bg-red-500 text-white px-3 py-1 rounded text-xs break-keep"
                        onClick={() => handleDeleteCategory(category)}>
                        删除
                      </Button>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="text-center py-8">
                <View className="i-mdi-information-outline text-gray-300 text-4xl mb-2 mx-auto" />
                <Text className="text-gray-400 text-sm block">暂无品类</Text>
              </View>
            )}
          </View>

          {/* 仓库列表 */}
          {warehouses.length > 0 ? (
            <View>
              {/* 仓库指示器 */}
              <View className="bg-white rounded-lg p-4 mb-4 shadow">
                <View className="flex items-center justify-center mb-2">
                  <View className="i-mdi-warehouse text-blue-600 text-xl mr-2" />
                  <Text className="text-gray-800 text-base font-bold">
                    {selectedWarehouse ? selectedWarehouse.name : ''}
                  </Text>
                </View>
                {warehouses.length > 1 && (
                  <View className="flex items-center justify-center">
                    <Text className="text-gray-400 text-xs mb-2">点击圆点切换仓库</Text>
                    <View className="flex items-center">
                      {warehouses.map((_warehouse, index) => (
                        <View
                          key={index}
                          className={`w-3 h-3 rounded-full mx-1 ${
                            index === selectedWarehouseIndex ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          onClick={() => handleWarehouseChange(index)}
                          style={{cursor: 'pointer'}}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 品类价格配置 */}
              {warehouseCategories.length > 0 ? (
                <View className="bg-white rounded-lg p-4 shadow">
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-currency-cny text-blue-600 text-xl mr-2" />
                    <Text className="text-gray-800 text-base font-bold">品类价格配置</Text>
                  </View>

                  <View>
                    {/* 表头 */}
                    <View className="flex items-center bg-gray-50 rounded-lg p-3 mb-2">
                      <View className="flex-1">
                        <Text className="text-gray-600 text-xs font-bold">品类名称</Text>
                      </View>
                      <View className="w-24 text-center">
                        <Text className="text-gray-600 text-xs font-bold">纯司机</Text>
                      </View>
                      <View className="w-24 text-center">
                        <Text className="text-gray-600 text-xs font-bold">带车司机</Text>
                      </View>
                    </View>

                    {/* 价格列表 */}
                    {warehouseCategories.map((category) => {
                      const priceEdit = getPriceEdit(category.id)
                      return (
                        <View key={category.id} className="flex items-center py-3 border-b border-gray-100">
                          <View className="flex-1">
                            <Text className="text-gray-800 text-sm">{category.name}</Text>
                          </View>
                          <View className="w-24 px-1">
                            <View style={{overflow: 'hidden'}}>
                              <Input
                                type="digit"
                                className="bg-gray-50 rounded px-2 py-1 text-sm text-center"
                                placeholder="0"
                                value={priceEdit.driverPrice}
                                onInput={(e) => updatePriceEdit(category.id, 'driverPrice', e.detail.value)}
                              />
                            </View>
                          </View>
                          <View className="w-24 px-1">
                            <View style={{overflow: 'hidden'}}>
                              <Input
                                type="digit"
                                className="bg-gray-50 rounded px-2 py-1 text-sm text-center"
                                placeholder="0"
                                value={priceEdit.driverWithVehiclePrice}
                                onInput={(e) => updatePriceEdit(category.id, 'driverWithVehiclePrice', e.detail.value)}
                              />
                            </View>
                          </View>
                        </View>
                      )
                    })}

                    {/* 保存按钮 */}
                    <View className="mt-4">
                      <Button
                        size="default"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg text-base break-keep"
                        onClick={handleSavePrices}>
                        保存价格配置
                      </Button>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="bg-white rounded-lg p-6 shadow text-center">
                  <View className="i-mdi-alert-circle text-orange-400 text-4xl mb-2 mx-auto" />
                  <Text className="text-gray-600 text-sm block">该仓库暂无品类配置</Text>
                  <Text className="text-gray-400 text-xs block mt-1">请先添加品类并配置价格</Text>
                </View>
              )}
            </View>
          ) : (
            <View className="bg-white rounded-lg p-6 mb-4 shadow text-center">
              <View className="i-mdi-alert-circle text-orange-400 text-4xl mb-2 mx-auto" />
              <Text className="text-gray-600 text-sm block">暂无仓库</Text>
              <Text className="text-gray-400 text-xs block mt-1">请先添加仓库</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default CategoryManagement
