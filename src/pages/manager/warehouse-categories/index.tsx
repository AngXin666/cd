import {Button, Input, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  batchUpsertCategoryPrices,
  getAllCategories,
  getCategoryPricesByWarehouse,
  getManagerWarehouses,
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

              {/* 品类价格配置 */}
              {warehouseCategories.length > 0 ? (
                <View className="bg-white rounded-lg p-4 shadow">
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-currency-cny text-green-600 text-xl mr-2" />
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
                        className="w-full bg-green-600 text-white py-3 rounded-lg text-base break-keep"
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
                  <Text className="text-gray-400 text-xs block mt-1">请联系超级管理员配置品类</Text>
                </View>
              )}
            </View>
          ) : (
            <View className="bg-white rounded-lg p-6 mb-4 shadow text-center">
              <View className="i-mdi-alert-circle text-orange-400 text-4xl mb-2 mx-auto" />
              <Text className="text-gray-600 text-sm block">您还没有管理的仓库</Text>
              <Text className="text-gray-400 text-xs block mt-1">请联系超级管理员分配仓库</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default WarehouseCategories
