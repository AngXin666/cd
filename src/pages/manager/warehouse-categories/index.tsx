import {Button, Checkbox, CheckboxGroup, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  batchUpsertCategoryPrices,
  getAllCategories,
  getCategoryPricesByWarehouse,
  getManagerWarehouses,
  getWarehouseCategories,
  setWarehouseCategories
} from '@/db/api'
import type {CategoryPrice, PieceWorkCategory, Warehouse} from '@/db/types'

// 品类价格编辑状态
interface CategoryPriceEdit {
  categoryId: string
  driverPrice: string
  driverWithVehiclePrice: string
}

const WarehouseCategories: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0)
  const [warehouseCategoryIds, setWarehouseCategoryIds] = useState<string[]>([])
  const [categoryPrices, setCategoryPrices] = useState<CategoryPrice[]>([])
  const [priceEdits, setPriceEdits] = useState<Map<string, CategoryPriceEdit>>(new Map())

  // 获取当前选中的仓库
  const selectedWarehouse = warehouses[selectedWarehouseIndex]

  // 获取已配置价格的品类ID（从 category_prices 表）
  const categoryIdsWithPrice = categoryPrices.map((p) => p.category_id)

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

  // 加载仓库配置的品类
  const loadWarehouseCategories = useCallback(async () => {
    if (!selectedWarehouse) return
    const categoryIds = await getWarehouseCategories(selectedWarehouse.id)
    setWarehouseCategoryIds(categoryIds)
  }, [selectedWarehouse])

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
    loadWarehouseCategories()
    loadCategoryPrices()
  }, [loadWarehouseCategories, loadCategoryPrices])

  useDidShow(() => {
    loadWarehouses()
    loadCategories()
    loadWarehouseCategories()
    loadCategoryPrices()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadWarehouses(), loadCategories(), loadWarehouseCategories(), loadCategoryPrices()])
    Taro.stopPullDownRefresh()
  })

  // 获取仓库配置的品类列表
  // 合并两个来源：warehouse_categories 表 和 category_prices 表
  const allConfiguredCategoryIds = Array.from(new Set([...warehouseCategoryIds, ...categoryIdsWithPrice]))
  const warehouseCategories = categories.filter((c) => c.is_active && allConfiguredCategoryIds.includes(c.id))

  // 品类选择变化
  const handleCategoryChange = (e: any) => {
    setWarehouseCategoryIds(e.detail.value)
  }

  // 保存仓库品类配置
  const handleSaveWarehouseCategories = async () => {
    if (!selectedWarehouse) {
      Taro.showToast({
        title: '请选择仓库',
        icon: 'none'
      })
      return
    }

    const success = await setWarehouseCategories(selectedWarehouse.id, warehouseCategoryIds)

    if (success) {
      Taro.showToast({
        title: '保存成功',
        icon: 'success'
      })
      loadWarehouseCategories()
    } else {
      Taro.showToast({
        title: '保存失败',
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
      loadWarehouseCategories()
    } else {
      Taro.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
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

          {/* 仓库选择器 */}
          {warehouses.length > 0 ? (
            <View className="bg-white rounded-lg p-4 mb-4 shadow">
              <View className="flex items-center mb-3">
                <View className="i-mdi-warehouse text-green-600 text-xl mr-2" />
                <Text className="text-gray-800 text-base font-bold">选择仓库</Text>
              </View>
              <Picker
                mode="selector"
                range={warehouses.map((w) => w.name)}
                value={selectedWarehouseIndex}
                onChange={(e) => setSelectedWarehouseIndex(Number(e.detail.value))}>
                <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <Text className="text-gray-800 text-sm">
                    {selectedWarehouse ? selectedWarehouse.name : '请选择仓库'}
                  </Text>
                  <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                </View>
              </Picker>
            </View>
          ) : (
            <View className="bg-white rounded-lg p-6 mb-4 shadow text-center">
              <View className="i-mdi-alert-circle text-orange-400 text-4xl mb-2 mx-auto" />
              <Text className="text-gray-600 text-sm block">您还没有管理的仓库</Text>
              <Text className="text-gray-400 text-xs block mt-1">请联系超级管理员分配仓库</Text>
            </View>
          )}

          {/* 仓库品类配置 */}
          {selectedWarehouse && (
            <View className="bg-white rounded-lg p-4 mb-4 shadow">
              <View className="flex items-center mb-3">
                <View className="i-mdi-tag-multiple text-green-600 text-xl mr-2" />
                <Text className="text-gray-800 text-base font-bold">{selectedWarehouse.name} - 品类配置</Text>
              </View>
              <Text className="text-gray-500 text-xs mb-3">选择该仓库可以操作的品类</Text>

              {categories.filter((c) => c.is_active).length > 0 ? (
                <View>
                  <CheckboxGroup onChange={handleCategoryChange}>
                    {categories
                      .filter((c) => c.is_active)
                      .map((category) => (
                        <View key={category.id} className="flex items-center py-3 border-b border-gray-100">
                          <Checkbox value={category.id} checked={allConfiguredCategoryIds.includes(category.id)} />
                          <Text className="text-gray-800 text-sm ml-3">{category.name}</Text>
                        </View>
                      ))}
                  </CheckboxGroup>

                  {/* 保存按钮 */}
                  <View className="mt-4">
                    <Button
                      size="default"
                      className="w-full bg-green-600 text-white py-3 rounded-lg text-base break-keep"
                      onClick={handleSaveWarehouseCategories}>
                      保存品类配置
                    </Button>
                  </View>
                </View>
              ) : (
                <View className="text-center py-8">
                  <View className="i-mdi-information-outline text-gray-300 text-4xl mb-2 mx-auto" />
                  <Text className="text-gray-400 text-sm block">暂无启用的品类</Text>
                </View>
              )}
            </View>
          )}

          {/* 品类价格配置 */}
          {selectedWarehouse && warehouseCategories.length > 0 && (
            <View className="bg-white rounded-lg p-4 shadow">
              <View className="flex items-center mb-3">
                <View className="i-mdi-currency-cny text-green-600 text-xl mr-2" />
                <Text className="text-gray-800 text-base font-bold">{selectedWarehouse.name} - 品类价格配置</Text>
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
                        <Input
                          type="digit"
                          className="bg-gray-50 rounded px-2 py-1 text-sm text-center"
                          placeholder="0"
                          value={priceEdit.driverPrice}
                          onInput={(e) => updatePriceEdit(category.id, 'driverPrice', e.detail.value)}
                        />
                      </View>
                      <View className="w-24 px-1">
                        <Input
                          type="digit"
                          className="bg-gray-50 rounded px-2 py-1 text-sm text-center"
                          placeholder="0"
                          value={priceEdit.driverWithVehiclePrice}
                          onInput={(e) => updatePriceEdit(category.id, 'driverWithVehiclePrice', e.detail.value)}
                        />
                      </View>
                    </View>
                  )
                })}

                {/* 保存按钮 */}
                <View className="mt-4">
                  <Button
                    size="default"
                    className="w-full bg-green-600 text-white py-3 rounded-lg text-base break-keep"
                    onClick={handleSavePrices}>
                    保存价格配置
                  </Button>
                </View>
              </View>
            </View>
          )}

          {/* 提示信息 */}
          {selectedWarehouse && warehouseCategories.length === 0 && (
            <View className="bg-white rounded-lg p-6 shadow text-center">
              <View className="i-mdi-alert-circle text-orange-400 text-4xl mb-2 mx-auto" />
              <Text className="text-gray-600 text-sm block">请先为该仓库配置品类</Text>
              <Text className="text-gray-400 text-xs block mt-1">配置品类后才能设置价格</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default WarehouseCategories
