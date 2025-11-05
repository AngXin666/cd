import {Button, Input, ScrollView, Switch, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {createCategory, deleteCategory, getAllCategories, updateCategory} from '@/db/api'
import type {PieceWorkCategory} from '@/db/types'

const CategoryManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  // 加载品类列表
  const loadCategories = useCallback(async () => {
    const data = await getAllCategories()
    setCategories(data)
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useDidShow(() => {
    loadCategories()
  })

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

  // 开始编辑
  const handleStartEdit = (category: PieceWorkCategory) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  // 保存编辑
  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) {
      Taro.showToast({
        title: '品类名称不能为空',
        icon: 'none'
      })
      return
    }

    const success = await updateCategory(id, {name: editingName.trim()})

    if (success) {
      Taro.showToast({
        title: '更新成功',
        icon: 'success'
      })
      setEditingId(null)
      setEditingName('')
      loadCategories()
    } else {
      Taro.showToast({
        title: '更新失败',
        icon: 'error'
      })
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  // 切换启用状态
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const success = await updateCategory(id, {is_active: !currentActive})

    if (success) {
      Taro.showToast({
        title: currentActive ? '已禁用' : '已启用',
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
  const handleDelete = async (id: string, name: string) => {
    const result = await Taro.showModal({
      title: '确认删除',
      content: `确定要删除品类"${name}"吗？`,
      confirmText: '删除',
      confirmColor: '#EF4444'
    })

    if (result.confirm) {
      const success = await deleteCategory(id)

      if (success) {
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        })
        loadCategories()
      } else {
        Taro.showToast({
          title: '删除失败，可能有关联数据',
          icon: 'none'
        })
      }
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">计件品类管理</Text>
            <Text className="text-blue-100 text-sm block">管理计件工作的品类设置</Text>
          </View>

          {/* 添加品类 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-plus-circle text-blue-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">添加新品类</Text>
            </View>
            <View className="flex items-center">
              <Input
                className="flex-1 bg-gray-50 rounded-lg px-4 py-3 text-sm mr-3"
                placeholder="请输入品类名称"
                value={newCategoryName}
                onInput={(e) => setNewCategoryName(e.detail.value)}
              />
              <Button
                size="default"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm break-keep"
                onClick={handleAddCategory}>
                添加
              </Button>
            </View>
          </View>

          {/* 品类列表 */}
          <View className="bg-white rounded-lg p-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-format-list-bulleted text-blue-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">品类列表</Text>
              <View className="ml-auto">
                <Text className="text-xs text-gray-500">共 {categories.length} 个品类</Text>
              </View>
            </View>

            {categories.length > 0 ? (
              <View className="space-y-2">
                {categories.map((category) => (
                  <View key={category.id} className="bg-gray-50 rounded-lg p-4">
                    {editingId === category.id ? (
                      <View>
                        <Input
                          className="bg-white rounded-lg px-3 py-2 text-sm mb-3 border border-blue-300"
                          value={editingName}
                          onInput={(e) => setEditingName(e.detail.value)}
                        />
                        <View className="flex items-center justify-end">
                          <Button
                            size="mini"
                            className="bg-gray-200 text-gray-700 px-4 py-1 rounded text-xs mr-2 break-keep"
                            onClick={handleCancelEdit}>
                            取消
                          </Button>
                          <Button
                            size="mini"
                            className="bg-blue-600 text-white px-4 py-1 rounded text-xs break-keep"
                            onClick={() => handleSaveEdit(category.id)}>
                            保存
                          </Button>
                        </View>
                      </View>
                    ) : (
                      <View>
                        <View className="flex items-center justify-between mb-2">
                          <View className="flex items-center flex-1">
                            <View className="i-mdi-tag text-orange-600 text-xl mr-2" />
                            <Text className="text-gray-800 text-base font-medium">{category.name}</Text>
                          </View>
                          <View className="flex items-center">
                            <Switch
                              checked={category.is_active}
                              color="#3B82F6"
                              onChange={() => handleToggleActive(category.id, category.is_active)}
                            />
                          </View>
                        </View>
                        <View className="flex items-center justify-between">
                          <View className="flex items-center">
                            <View
                              className={`px-2 py-1 rounded ${category.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <Text className={`text-xs ${category.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                                {category.is_active ? '启用中' : '已禁用'}
                              </Text>
                            </View>
                            <Text className="text-xs text-gray-400 ml-3">
                              创建于 {new Date(category.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                          <View className="flex items-center">
                            <Button
                              size="mini"
                              className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs mr-2 break-keep"
                              onClick={() => handleStartEdit(category)}>
                              编辑
                            </Button>
                            <Button
                              size="mini"
                              className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs break-keep"
                              onClick={() => handleDelete(category.id, category.name)}>
                              删除
                            </Button>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View className="text-center py-8">
                <View className="i-mdi-tag-off text-gray-300 text-5xl mb-2" />
                <Text className="text-gray-400 text-sm block">暂无品类</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default CategoryManagement
