import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {activateTenant, deleteTenant, getAllTenants, suspendTenant} from '@/db/api'
import type {Profile} from '@/db/types'

export default function TenantList() {
  const [tenants, setTenants] = useState<Profile[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Profile[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [loading, setLoading] = useState(true)

  const filterTenants = useCallback((data: Profile[], search: string, status: string) => {
    let filtered = data

    if (search) {
      filtered = filtered.filter(
        (t) => t.name?.includes(search) || t.phone?.includes(search) || t.company_name?.includes(search)
      )
    }

    if (status !== 'all') {
      filtered = filtered.filter((t) => (t.status || 'active') === status)
    }

    setFilteredTenants(filtered)
  }, [])

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAllTenants()
      setTenants(data)
      filterTenants(data, searchText, statusFilter)
    } catch (error) {
      console.error('加载老板账号列表失败:', error)
      Taro.showToast({title: '加载失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [searchText, statusFilter, filterTenants])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  useDidShow(() => {
    loadTenants()
  })

  useEffect(() => {
    filterTenants(tenants, searchText, statusFilter)
  }, [tenants, searchText, statusFilter, filterTenants])

  const handleSearch = (value: string) => {
    setSearchText(value)
  }

  const handleStatusFilter = (status: 'all' | 'active' | 'suspended') => {
    setStatusFilter(status)
  }

  const handleSuspend = async (id: string) => {
    const result = await Taro.showModal({
      title: '确认停用',
      content: '确定要停用该老板账号吗？停用后该账号将无法登录。'
    })

    if (result.confirm) {
      const success = await suspendTenant(id)
      if (success) {
        Taro.showToast({title: '停用成功', icon: 'success'})
        loadTenants()
      } else {
        Taro.showToast({title: '停用失败', icon: 'none'})
      }
    }
  }

  const handleActivate = async (id: string) => {
    const success = await activateTenant(id)
    if (success) {
      Taro.showToast({title: '启用成功', icon: 'success'})
      loadTenants()
    } else {
      Taro.showToast({title: '启用失败', icon: 'none'})
    }
  }

  const handleDelete = async (id: string) => {
    const result = await Taro.showModal({
      title: '确认删除',
      content: '确定要删除该老板账号吗？此操作不可恢复！'
    })

    if (result.confirm) {
      const success = await deleteTenant(id)
      if (success) {
        Taro.showToast({title: '删除成功', icon: 'success'})
        loadTenants()
      } else {
        Taro.showToast({title: '删除失败', icon: 'none'})
      }
    }
  }

  const handleEdit = (id: string) => {
    Taro.navigateTo({url: `/pages/lease-admin/tenant-form/index?mode=edit&id=${id}`})
  }

  const handleDetail = (id: string) => {
    Taro.navigateTo({url: `/pages/lease-admin/tenant-detail/index?id=${id}`})
  }

  const handleCreate = () => {
    Taro.navigateTo({url: '/pages/lease-admin/tenant-form/index?mode=create'})
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4">
          {/* 搜索栏 */}
          <View className="mb-4">
            <View style={{overflow: 'hidden'}}>
              <Input
                className="bg-white rounded-lg px-4 py-3 border border-border"
                placeholder="搜索姓名、电话或公司名称"
                value={searchText}
                onInput={(e) => handleSearch(e.detail.value)}
              />
            </View>
          </View>

          {/* 状态筛选 */}
          <View className="flex flex-row gap-2 mb-4">
            <View
              className={`px-4 py-2 rounded-lg ${statusFilter === 'all' ? 'bg-primary text-white' : 'bg-white text-foreground'}`}
              onClick={() => handleStatusFilter('all')}>
              <Text className={statusFilter === 'all' ? 'text-white' : 'text-foreground'}>全部</Text>
            </View>
            <View
              className={`px-4 py-2 rounded-lg ${statusFilter === 'active' ? 'bg-primary text-white' : 'bg-white text-foreground'}`}
              onClick={() => handleStatusFilter('active')}>
              <Text className={statusFilter === 'active' ? 'text-white' : 'text-foreground'}>正常</Text>
            </View>
            <View
              className={`px-4 py-2 rounded-lg ${statusFilter === 'suspended' ? 'bg-primary text-white' : 'bg-white text-foreground'}`}
              onClick={() => handleStatusFilter('suspended')}>
              <Text className={statusFilter === 'suspended' ? 'text-white' : 'text-foreground'}>停用</Text>
            </View>
          </View>

          {/* 新增按钮 */}
          <View className="mb-4">
            <Button
              className="w-full bg-primary text-white py-3 rounded-lg break-keep text-base"
              size="default"
              onClick={handleCreate}>
              新增老板账号
            </Button>
          </View>

          {/* 老板账号列表 */}
          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          ) : filteredTenants.length === 0 ? (
            <View className="flex items-center justify-center py-8">
              <Text className="text-muted-foreground">暂无数据</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {filteredTenants.map((tenant) => (
                <View key={tenant.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <View className="flex flex-row items-center justify-between mb-3">
                    <View className="flex flex-row items-center gap-2">
                      <Text className="text-lg font-semibold text-foreground">{tenant.name || '未命名'}</Text>
                      <View
                        className={`px-2 py-1 rounded ${(tenant.status || 'active') === 'active' ? 'bg-green-100' : 'bg-orange-100'}`}>
                        <Text
                          className={`text-xs ${(tenant.status || 'active') === 'active' ? 'text-green-600' : 'text-orange-600'}`}>
                          {(tenant.status || 'active') === 'active' ? '正常' : '停用'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="space-y-1 mb-3">
                    {tenant.phone && (
                      <View>
                        <Text className="text-sm text-muted-foreground">电话：{tenant.phone}</Text>
                      </View>
                    )}
                    {tenant.company_name && (
                      <View>
                        <Text className="text-sm text-muted-foreground">公司：{tenant.company_name}</Text>
                      </View>
                    )}
                    {tenant.monthly_fee && (
                      <View>
                        <Text className="text-sm text-muted-foreground">月租：¥{tenant.monthly_fee}</Text>
                      </View>
                    )}
                  </View>

                  <View className="flex flex-row gap-2">
                    <Button
                      className="flex-1 bg-blue-500 text-white py-2 rounded break-keep text-sm"
                      size="mini"
                      onClick={() => handleDetail(tenant.id)}>
                      详情
                    </Button>
                    <Button
                      className="flex-1 bg-green-500 text-white py-2 rounded break-keep text-sm"
                      size="mini"
                      onClick={() => handleEdit(tenant.id)}>
                      编辑
                    </Button>
                    {(tenant.status || 'active') === 'active' ? (
                      <Button
                        className="flex-1 bg-orange-500 text-white py-2 rounded break-keep text-sm"
                        size="mini"
                        onClick={() => handleSuspend(tenant.id)}>
                        停用
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 bg-green-500 text-white py-2 rounded break-keep text-sm"
                        size="mini"
                        onClick={() => handleActivate(tenant.id)}>
                        启用
                      </Button>
                    )}
                    <Button
                      className="flex-1 bg-red-500 text-white py-2 rounded break-keep text-sm"
                      size="mini"
                      onClick={() => handleDelete(tenant.id)}>
                      删除
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
