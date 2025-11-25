import {Button, Input, ScrollView, Text, Textarea, View} from '@tarojs/components'
import {navigateBack, showModal, showToast, useDidShow} from '@tarojs/taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {createWarehouse, deleteWarehouse, getAllWarehouses, updateWarehouse} from '@/db/api'
import type {Warehouse} from '@/db/types'
import {useAdminAuth} from '@/hooks/useAdminAuth'

/**
 * 仓库配置页面（电脑端）
 * 仅允许管理员和超级管理员访问
 */
const WarehouseConfig: React.FC = () => {
  const {isAuthorized, isLoading} = useAdminAuth()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [name, setName] = useState('')

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    const data = await getAllWarehouses()
    setWarehouses(data)
  }, [])

  useDidShow(() => {
    loadWarehouses()
  })

  // 打开新建表单
  const handleCreate = () => {
    setEditingWarehouse(null)
    setName('')
    setShowForm(true)
  }

  // 打开编辑表单
  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse)
    setName(warehouse.name)
    setShowForm(true)
  }

  // 保存仓库
  const handleSave = async () => {
    if (!name.trim()) {
      showToast({title: '请输入仓库名称', icon: 'none'})
      return
    }

    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, {
          name: name.trim()
        })
        showToast({title: '更新成功', icon: 'success'})
      } else {
        await createWarehouse({
          name: name.trim()
        })
        showToast({title: '创建成功', icon: 'success'})
      }
      setShowForm(false)
      loadWarehouses()
    } catch (_error) {
      showToast({title: '操作失败', icon: 'error'})
    }
  }

  // 禁用/启用仓库
  const handleToggleStatus = async (warehouse: Warehouse) => {
    const newStatus = !warehouse.is_active
    const action = newStatus ? '启用' : '禁用'

    const res = await showModal({
      title: '确认操作',
      content: `确定要${action}仓库"${warehouse.name}"吗？`
    })

    if (res.confirm) {
      try {
        await updateWarehouse(warehouse.id, {is_active: newStatus})
        showToast({title: `${action}成功`, icon: 'success'})
        loadWarehouses()
      } catch (_error) {
        showToast({title: `${action}失败`, icon: 'error'})
      }
    }
  }

  // 删除仓库
  const handleDelete = async (warehouse: Warehouse) => {
    const res = await showModal({
      title: '确认删除',
      content: `确定要删除仓库"${warehouse.name}"吗？此操作不可恢复！`
    })

    if (res.confirm) {
      try {
        await deleteWarehouse(warehouse.id)
        showToast({title: '删除成功', icon: 'success'})
        loadWarehouses()
      } catch (_error) {
        showToast({title: '删除失败', icon: 'error'})
      }
    }
  }

  // 如果正在加载或未授权，显示提示
  if (isLoading || !isAuthorized) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <View className="text-center">
          <View className="i-mdi-shield-lock text-6xl text-gray-400 mb-4" />
          <Text className="text-xl text-gray-600">正在验证权限...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <View className="bg-white shadow-sm border-b border-gray-200">
        <View className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
          <View className="flex items-center">
            <View
              onClick={() => navigateBack()}
              className="i-mdi-arrow-left text-2xl text-gray-600 mr-3 cursor-pointer hover:text-primary"
            />
            <Text className="text-xl font-bold text-gray-800">仓库配置</Text>
          </View>
          <Button
            onClick={handleCreate}
            className="bg-primary text-white px-6 py-2 rounded break-keep text-sm"
            size="default">
            新建仓库
          </Button>
        </View>
      </View>

      {/* 主内容区域 */}
      <ScrollView scrollY className="h-screen box-border">
        <View className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          {/* 仓库列表 */}
          <View className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* 表格头部 */}
            <View className="hidden md:grid md:grid-cols-12 gap-4 bg-gray-50 px-6 py-3 border-b border-gray-200">
              <Text className="col-span-2 text-sm font-semibold text-gray-700">仓库名称</Text>
              <Text className="col-span-3 text-sm font-semibold text-gray-700">地址</Text>
              <Text className="col-span-3 text-sm font-semibold text-gray-700">描述</Text>
              <Text className="col-span-1 text-sm font-semibold text-gray-700">状态</Text>
              <Text className="col-span-3 text-sm font-semibold text-gray-700 text-center">操作</Text>
            </View>

            {/* 表格内容 */}
            {warehouses.length === 0 ? (
              <View className="py-12 text-center">
                <View className="i-mdi-warehouse text-6xl text-gray-300 mb-4" />
                <Text className="text-gray-500">暂无仓库数据</Text>
              </View>
            ) : (
              warehouses.map((warehouse) => (
                <View
                  key={warehouse.id}
                  className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                  {/* 电脑端表格行 */}
                  <View className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
                    <Text className="col-span-2 text-sm text-gray-800 font-medium">{warehouse.name}</Text>
                    <View className="col-span-1">
                      <View
                        className={`inline-block px-2 py-1 rounded text-xs ${
                          warehouse.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        <Text>{warehouse.is_active ? '启用' : '禁用'}</Text>
                      </View>
                    </View>
                    <View className="col-span-3 flex items-center justify-center gap-2">
                      <Button
                        onClick={() => handleEdit(warehouse)}
                        className="bg-blue-500 text-white px-4 py-1 rounded break-keep text-xs"
                        size="mini">
                        编辑
                      </Button>
                      <Button
                        onClick={() => handleToggleStatus(warehouse)}
                        className={`${
                          warehouse.is_active ? 'bg-orange-500' : 'bg-green-500'
                        } text-white px-4 py-1 rounded break-keep text-xs`}
                        size="mini">
                        {warehouse.is_active ? '禁用' : '启用'}
                      </Button>
                      <Button
                        onClick={() => handleDelete(warehouse)}
                        className="bg-red-500 text-white px-4 py-1 rounded break-keep text-xs"
                        size="mini">
                        删除
                      </Button>
                    </View>
                  </View>

                  {/* 移动端卡片 */}
                  <View className="md:hidden p-4">
                    <View className="flex items-center justify-between mb-2">
                      <Text className="text-base font-bold text-gray-800">{warehouse.name}</Text>
                      <View
                        className={`px-2 py-1 rounded text-xs ${
                          warehouse.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        <Text>{warehouse.is_active ? '启用' : '禁用'}</Text>
                      </View>
                    </View>
                    <View className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(warehouse)}
                        className="flex-1 bg-blue-500 text-white py-2 rounded break-keep text-xs"
                        size="mini">
                        编辑
                      </Button>
                      <Button
                        onClick={() => handleToggleStatus(warehouse)}
                        className={`flex-1 ${
                          warehouse.is_active ? 'bg-orange-500' : 'bg-green-500'
                        } text-white py-2 rounded break-keep text-xs`}
                        size="mini">
                        {warehouse.is_active ? '禁用' : '启用'}
                      </Button>
                      <Button
                        onClick={() => handleDelete(warehouse)}
                        className="flex-1 bg-red-500 text-white py-2 rounded break-keep text-xs"
                        size="mini">
                        删除
                      </Button>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* 编辑表单弹窗 */}
      {showForm && (
        <View className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <View className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] overflow-hidden">
            {/* 表单头部 */}
            <View className="bg-primary text-white px-6 py-4 flex items-center justify-between">
              <Text className="text-lg font-bold">{editingWarehouse ? '编辑仓库' : '新建仓库'}</Text>
              <View
                onClick={() => setShowForm(false)}
                className="i-mdi-close text-2xl cursor-pointer hover:bg-white hover:bg-opacity-20 rounded p-1"
              />
            </View>

            {/* 表单内容 */}
            <ScrollView scrollY className="max-h-[60vh] box-border">
              <View className="p-6">
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    仓库名称 <Text className="text-red-500">*</Text>
                  </Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      value={name}
                      onInput={(e) => setName(e.detail.value)}
                      placeholder="请输入仓库名称"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">地址</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      placeholder="请输入仓库地址"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">描述</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Textarea
                      placeholder="请输入仓库描述"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      maxlength={200}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* 表单底部按钮 */}
            <View className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <Button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded break-keep text-sm"
                size="default">
                取消
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-primary text-white py-3 rounded break-keep text-sm"
                size="default">
                保存
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default WarehouseConfig
