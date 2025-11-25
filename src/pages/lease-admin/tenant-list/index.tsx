import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {activateTenant, deleteTenant, getAllTenants, getManagersByTenantId, suspendTenant} from '@/db/api'
import type {Profile} from '@/db/types'

export default function TenantList() {
  const [tenants, setTenants] = useState<Profile[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Profile[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [loading, setLoading] = useState(true)
  // 展开状态：记录哪些老板账号被展开了
  const [expandedTenantIds, setExpandedTenantIds] = useState<Set<string>>(new Set())
  // 车队长数据：记录每个老板下的车队长列表
  const [managersMap, setManagersMap] = useState<Map<string, Profile[]>>(new Map())
  // 加载中的老板ID
  const [loadingManagerIds, setLoadingManagerIds] = useState<Set<string>>(new Set())

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

  // 切换展开/收起老板账号
  const handleToggleExpand = async (tenantId: string) => {
    const newExpandedIds = new Set(expandedTenantIds)

    if (newExpandedIds.has(tenantId)) {
      // 收起
      newExpandedIds.delete(tenantId)
      setExpandedTenantIds(newExpandedIds)
    } else {
      // 展开
      newExpandedIds.add(tenantId)
      setExpandedTenantIds(newExpandedIds)

      // 如果还没有加载过车队长数据，则加载
      if (!managersMap.has(tenantId)) {
        setLoadingManagerIds(new Set(loadingManagerIds).add(tenantId))
        try {
          const managers = await getManagersByTenantId(tenantId)
          setManagersMap(new Map(managersMap).set(tenantId, managers))
        } catch (error) {
          console.error('加载车队长列表失败:', error)
          Taro.showToast({title: '加载车队长失败', icon: 'none'})
        } finally {
          const newLoadingIds = new Set(loadingManagerIds)
          newLoadingIds.delete(tenantId)
          setLoadingManagerIds(newLoadingIds)
        }
      }
    }
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

  const handleAddPeerAccount = (mainAccountId: string) => {
    Taro.navigateTo({url: `/pages/lease-admin/tenant-form/index?mode=create_peer&mainAccountId=${mainAccountId}`})
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
              {filteredTenants.map((tenant) => {
                const isExpanded = expandedTenantIds.has(tenant.id)
                const managers = managersMap.get(tenant.id) || []
                const isLoadingManagers = loadingManagerIds.has(tenant.id)

                return (
                  <View key={tenant.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* 老板账号主卡片 */}
                    <View className="p-4">
                      <View
                        className="flex flex-row items-center justify-between mb-3"
                        onClick={() => handleToggleExpand(tenant.id)}>
                        <View className="flex flex-row items-center gap-2 flex-1">
                          {/* 展开/收起图标 */}
                          <View
                            className={`${isExpanded ? 'i-mdi-chevron-down' : 'i-mdi-chevron-right'} text-xl text-gray-600 transition-all`}
                          />
                          <Text className="text-lg font-semibold text-foreground">{tenant.name || '未命名'}</Text>
                          {/* 主账号/平级账号标识 */}
                          {tenant.main_account_id === null ? (
                            <View className="px-2 py-1 rounded bg-blue-100">
                              <Text className="text-xs text-blue-600">主账号</Text>
                            </View>
                          ) : (
                            <View className="px-2 py-1 rounded bg-purple-100">
                              <Text className="text-xs text-purple-600">平级账号</Text>
                            </View>
                          )}
                          {/* 状态标识 */}
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

                      {/* 操作按钮 */}
                      <View className="flex flex-row gap-2 mb-2">
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

                      {/* 如果是主账号，显示"新增老板账号"按钮 */}
                      {tenant.main_account_id === null && (
                        <View className="mt-2">
                          <Button
                            className="w-full bg-purple-500 text-white py-2 rounded break-keep text-sm"
                            size="mini"
                            onClick={() => handleAddPeerAccount(tenant.id)}>
                            新增老板账号
                          </Button>
                        </View>
                      )}
                    </View>

                    {/* 展开的车队长列表 */}
                    {isExpanded && (
                      <View className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                        <View className="flex flex-row items-center mb-2">
                          <View className="i-mdi-account-group text-lg text-blue-600 mr-2" />
                          <Text className="text-sm font-semibold text-gray-700">车队长列表</Text>
                          <Text className="text-xs text-gray-500 ml-2">({managers.length}人)</Text>
                        </View>

                        {isLoadingManagers ? (
                          <View className="flex items-center justify-center py-4">
                            <Text className="text-sm text-gray-500">加载中...</Text>
                          </View>
                        ) : managers.length === 0 ? (
                          <View className="flex items-center justify-center py-4">
                            <Text className="text-sm text-gray-500">暂无车队长</Text>
                          </View>
                        ) : (
                          <View className="space-y-2">
                            {managers.map((manager) => (
                              <View key={manager.id} className="bg-white rounded-lg p-3 border border-gray-200">
                                <View className="flex flex-row items-center justify-between mb-2">
                                  <View className="flex flex-row items-center gap-2">
                                    <View className="i-mdi-account-tie text-lg text-blue-600" />
                                    <Text className="text-sm font-medium text-gray-900">
                                      {manager.name || '未命名'}
                                    </Text>
                                    {/* 状态标识 */}
                                    <View
                                      className={`px-2 py-0.5 rounded ${(manager.status || 'active') === 'active' ? 'bg-green-100' : 'bg-orange-100'}`}>
                                      <Text
                                        className={`text-xs ${(manager.status || 'active') === 'active' ? 'text-green-600' : 'text-orange-600'}`}>
                                        {(manager.status || 'active') === 'active' ? '正常' : '停用'}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                                {manager.phone && (
                                  <View className="mb-1">
                                    <Text className="text-xs text-gray-600">电话：{manager.phone}</Text>
                                  </View>
                                )}
                                {manager.login_account && (
                                  <View>
                                    <Text className="text-xs text-gray-600">账号：{manager.login_account}</Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
