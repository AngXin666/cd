import {Button, Checkbox, CheckboxGroup, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getActiveCategories, getWarehouseCategories, setWarehouseCategories} from '@/db/api'
import type {PieceWorkCategory} from '@/db/types'

const WarehouseCategories: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const {warehouseId, warehouseName} = router.params

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  // 加载数据
  const loadData = useCallback(async () => {
    if (!warehouseId) return

    setLoading(true)
    try {
      // 加载所有品类
      const categoryData = await getActiveCategories()
      setCategories(categoryData)

      // 加载仓库已配置的品类
      const categoryIds = await getWarehouseCategories(warehouseId)
      setSelectedCategoryIds(categoryIds)
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [warehouseId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 品类选择变化
  const handleCategoryChange = useCallback((e: any) => {
    setSelectedCategoryIds(e.detail.value)
  }, [])

  // 保存配置
  const handleSave = useCallback(async () => {
    if (!warehouseId) return

    Taro.showLoading({title: '保存中...'})
    try {
      const success = await setWarehouseCategories(warehouseId, selectedCategoryIds)

      if (success) {
        Taro.showToast({title: '保存成功', icon: 'success'})
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        Taro.showToast({title: '保存失败', icon: 'error'})
      }
    } catch (error) {
      console.error('保存失败:', error)
      Taro.showToast({title: '保存失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [warehouseId, selectedCategoryIds])

  return (
    <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #f0fdf4, #dcfce7)'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        {/* 页面标题 */}
        <View className="px-4 pt-6 pb-4">
          <Text className="text-2xl font-bold text-gray-800">仓库品类配置</Text>
          <Text className="text-sm text-gray-500 mt-1">
            为 {decodeURIComponent(warehouseName || '')} 配置可操作的品类
          </Text>
        </View>

        {loading ? (
          <View className="text-center py-8">
            <Text className="text-gray-500">加载中...</Text>
          </View>
        ) : (
          <>
            {/* 品类选择 */}
            <View className="px-4 mb-4">
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-tag-multiple text-xl text-green-600 mr-2" />
                  <Text className="text-lg font-semibold text-gray-800">选择品类</Text>
                </View>
                <Text className="text-sm text-gray-500 mb-3">勾选该仓库可以操作的商品品类</Text>

                {categories.length === 0 ? (
                  <Text className="text-sm text-gray-400 text-center py-4">暂无品类数据</Text>
                ) : (
                  <CheckboxGroup onChange={handleCategoryChange}>
                    {categories.map((category) => (
                      <View key={category.id} className="flex items-center py-3 border-b border-gray-100 last:border-0">
                        <Checkbox
                          value={category.id}
                          checked={selectedCategoryIds.includes(category.id)}
                          className="mr-3"
                        />
                        <View className="flex-1">
                          <Text className="text-base text-gray-800">{category.name}</Text>
                        </View>
                      </View>
                    ))}
                  </CheckboxGroup>
                )}
              </View>
            </View>

            {/* 保存按钮 */}
            <View className="px-4 pb-6">
              <Button
                size="default"
                className="w-full text-base break-keep"
                style={{
                  backgroundColor: '#10b981',
                  color: '#fff',
                  borderRadius: '8px',
                  height: '48px',
                  lineHeight: '48px'
                }}
                onClick={handleSave}>
                保存配置
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

export default WarehouseCategories
