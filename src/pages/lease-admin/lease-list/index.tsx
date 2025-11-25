import {Button, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {
  activateTenant,
  checkAndHandleExpiredLeases,
  createLease,
  deleteLease,
  getAllTenants,
  getLeasesByTenantId,
  suspendTenant
} from '@/db/api'
import type {CreateLeaseInput, ExpireActionType, Lease, Profile} from '@/db/types'

// 租户租期数据类型
interface TenantWithLeases {
  tenant: Profile
  leases: Lease[]
}

export default function LeaseList() {
  const [tenantsWithLeases, setTenantsWithLeases] = useState<TenantWithLeases[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTenantIds, setExpandedTenantIds] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState<string | null>(null) // 记录当前正在添加租期的租户ID

  // 表单状态
  const [selectedDurationIndex, setSelectedDurationIndex] = useState(0)
  const [selectedExpireActionIndex, setSelectedExpireActionIndex] = useState(0)

  // 租期选项
  const durationOptions = [
    {label: '1个月', value: 1},
    {label: '3个月', value: 3},
    {label: '6个月', value: 6},
    {label: '1年', value: 12}
  ]

  // 到期操作选项
  const expireActionOptions = [
    {label: '停用所有账号（主账号+平级账号+车队长）', value: 'suspend_all'},
    {label: '仅停用主账号', value: 'suspend_main'},
    {label: '停用平级账号', value: 'suspend_peer'},
    {label: '停用车队长', value: 'suspend_manager'}
  ]

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // 先检查并处理到期的租期
      await checkAndHandleExpiredLeases()
      // 加载所有租户（只显示主账号）
      const tenantsData = await getAllTenants()
      const mainTenants = tenantsData.filter((t) => t.main_account_id === null)

      // 为每个租户加载其租期
      const tenantsWithLeasesData = await Promise.all(
        mainTenants.map(async (tenant) => {
          const leases = await getLeasesByTenantId(tenant.id)
          return {tenant, leases}
        })
      )

      setTenantsWithLeases(tenantsWithLeasesData)
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({title: '加载失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  const handleToggleExpand = (tenantId: string) => {
    const newExpandedIds = new Set(expandedTenantIds)
    if (newExpandedIds.has(tenantId)) {
      newExpandedIds.delete(tenantId)
    } else {
      newExpandedIds.add(tenantId)
    }
    setExpandedTenantIds(newExpandedIds)
  }

  const handleAddLease = (tenantId: string) => {
    setShowAddForm(tenantId)
    // 重置表单
    setSelectedDurationIndex(0)
    setSelectedExpireActionIndex(0)
  }

  const handleSubmit = async (tenantId: string) => {
    try {
      const selectedDuration = durationOptions[selectedDurationIndex]
      const selectedExpireAction = expireActionOptions[selectedExpireActionIndex]

      const input: CreateLeaseInput = {
        tenant_id: tenantId,
        start_date: new Date().toISOString().split('T')[0],
        duration_months: selectedDuration.value,
        expire_action: selectedExpireAction.value as ExpireActionType
      }

      const success = await createLease(input)
      if (success) {
        Taro.showToast({title: '添加成功', icon: 'success'})
        setShowAddForm(null)
        loadData()
      } else {
        Taro.showToast({title: '添加失败', icon: 'none'})
      }
    } catch (error) {
      console.error('添加租期失败:', error)
      Taro.showToast({title: '添加失败', icon: 'none'})
    }
  }

  const handleDelete = async (leaseId: string) => {
    const result = await Taro.showModal({
      title: '确认删除',
      content: '确定要删除该租期记录吗？'
    })

    if (result.confirm) {
      const success = await deleteLease(leaseId)
      if (success) {
        Taro.showToast({title: '删除成功', icon: 'success'})
        loadData()
      } else {
        Taro.showToast({title: '删除失败', icon: 'none'})
      }
    }
  }

  const handleSuspend = async (tenantId: string) => {
    const result = await Taro.showModal({
      title: '确认停用',
      content: '确定要停用该老板账号吗？'
    })

    if (result.confirm) {
      const success = await suspendTenant(tenantId)
      if (success) {
        Taro.showToast({title: '停用成功', icon: 'success'})
        loadData()
      } else {
        Taro.showToast({title: '停用失败', icon: 'none'})
      }
    }
  }

  const handleActivate = async (tenantId: string) => {
    const success = await activateTenant(tenantId)
    if (success) {
      Taro.showToast({title: '启用成功', icon: 'success'})
      loadData()
    } else {
      Taro.showToast({title: '启用失败', icon: 'none'})
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  }

  const getDurationLabel = (months: number) => {
    if (months === 12) return '1年'
    return `${months}个月`
  }

  const getExpireActionLabel = (action: string) => {
    const option = expireActionOptions.find((o) => o.value === action)
    return option ? option.label : action
  }

  const getStatusLabel = (status: string) => {
    return status === 'active' ? '生效中' : '已过期'
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'text-green-600' : 'text-orange-600'
  }

  const getStatusBgColor = (status: string) => {
    return status === 'active' ? 'bg-green-100' : 'bg-orange-100'
  }

  const getTenantStatusLabel = (status: string) => {
    return status === 'active' ? '正常' : '停用'
  }

  const getTenantStatusColor = (status: string) => {
    return status === 'active' ? 'text-green-600' : 'text-orange-600'
  }

  const getTenantStatusBgColor = (status: string) => {
    return status === 'active' ? 'bg-green-100' : 'bg-orange-100'
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4">
          {/* 页面标题 */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-primary">租期管理</Text>
            <View className="mt-1">
              <Text className="text-sm text-muted-foreground">管理所有老板账号的租赁期限和状态</Text>
            </View>
          </View>

          {/* 租户列表 */}
          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          ) : tenantsWithLeases.length === 0 ? (
            <View className="bg-white rounded-lg p-8 shadow-sm">
              <View className="flex items-center justify-center">
                <View className="i-mdi-account-off text-6xl text-gray-300 mb-4" />
              </View>
              <Text className="text-center text-muted-foreground">暂无老板账号</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {tenantsWithLeases.map(({tenant, leases}) => {
                const isExpanded = expandedTenantIds.has(tenant.id)
                const isAddingLease = showAddForm === tenant.id

                return (
                  <View key={tenant.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* 租户卡片头部 */}
                    <View className="p-4 border-b border-gray-200">
                      <View
                        className="flex flex-row items-center justify-between mb-3"
                        onClick={() => handleToggleExpand(tenant.id)}>
                        <View className="flex flex-row items-center gap-2 flex-1">
                          {/* 展开/收起图标 */}
                          <View
                            className={`${isExpanded ? 'i-mdi-chevron-down' : 'i-mdi-chevron-right'} text-xl text-gray-600 transition-all`}
                          />
                          <Text className="text-lg font-semibold text-foreground">{tenant.name || '未命名'}</Text>
                          {/* 状态标识 */}
                          <View className={`px-2 py-1 rounded ${getTenantStatusBgColor(tenant.status || 'active')}`}>
                            <Text className={`text-xs ${getTenantStatusColor(tenant.status || 'active')}`}>
                              {getTenantStatusLabel(tenant.status || 'active')}
                            </Text>
                          </View>
                          {/* 租期数量 */}
                          <View className="px-2 py-1 rounded bg-blue-100">
                            <Text className="text-xs text-blue-600">{leases.length}个租期</Text>
                          </View>
                        </View>
                      </View>

                      {/* 租户基本信息 */}
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
                      </View>

                      {/* 操作按钮 */}
                      <View className="flex flex-row gap-2">
                        <Button
                          className="flex-1 bg-primary text-white py-2 rounded break-keep text-sm"
                          size="mini"
                          onClick={() => handleAddLease(tenant.id)}>
                          添加租期
                        </Button>
                        {(tenant.status || 'active') === 'active' ? (
                          <Button
                            className="flex-1 bg-orange-500 text-white py-2 rounded break-keep text-sm"
                            size="mini"
                            onClick={() => handleSuspend(tenant.id)}>
                            停用账号
                          </Button>
                        ) : (
                          <Button
                            className="flex-1 bg-green-500 text-white py-2 rounded break-keep text-sm"
                            size="mini"
                            onClick={() => handleActivate(tenant.id)}>
                            启用账号
                          </Button>
                        )}
                      </View>
                    </View>

                    {/* 添加租期表单 */}
                    {isAddingLease && (
                      <View className="bg-gray-50 p-4 border-b border-gray-200">
                        <View className="mb-3">
                          <Text className="text-base font-semibold text-foreground">添加新租期</Text>
                        </View>

                        {/* 选择租期时长 */}
                        <View className="mb-3">
                          <Text className="text-sm text-muted-foreground mb-2">租期时长</Text>
                          <Picker
                            mode="selector"
                            range={durationOptions.map((o) => o.label)}
                            value={selectedDurationIndex}
                            onChange={(e) => setSelectedDurationIndex(Number(e.detail.value))}>
                            <View className="bg-white rounded-lg px-4 py-3 border border-border">
                              <Text className="text-foreground">{durationOptions[selectedDurationIndex].label}</Text>
                            </View>
                          </Picker>
                        </View>

                        {/* 选择到期操作 */}
                        <View className="mb-3">
                          <Text className="text-sm text-muted-foreground mb-2">到期后操作</Text>
                          <Picker
                            mode="selector"
                            range={expireActionOptions.map((o) => o.label)}
                            value={selectedExpireActionIndex}
                            onChange={(e) => setSelectedExpireActionIndex(Number(e.detail.value))}>
                            <View className="bg-white rounded-lg px-4 py-3 border border-border">
                              <Text className="text-foreground text-xs">
                                {expireActionOptions[selectedExpireActionIndex].label}
                              </Text>
                            </View>
                          </Picker>
                        </View>

                        {/* 操作按钮 */}
                        <View className="flex flex-row gap-3">
                          <Button
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded break-keep text-sm"
                            size="mini"
                            onClick={() => setShowAddForm(null)}>
                            取消
                          </Button>
                          <Button
                            className="flex-1 bg-primary text-white py-2 rounded break-keep text-sm"
                            size="mini"
                            onClick={() => handleSubmit(tenant.id)}>
                            确认添加
                          </Button>
                        </View>
                      </View>
                    )}

                    {/* 展开的租期列表 */}
                    {isExpanded && (
                      <View className="bg-gray-50 p-4">
                        {leases.length === 0 ? (
                          <View className="py-8">
                            <View className="flex items-center justify-center">
                              <View className="i-mdi-calendar-blank text-4xl text-gray-300 mb-2" />
                            </View>
                            <Text className="text-center text-sm text-muted-foreground">暂无租期记录</Text>
                          </View>
                        ) : (
                          <View className="space-y-3">
                            {leases.map((lease) => (
                              <View key={lease.id} className="bg-white rounded-lg p-3 shadow-sm">
                                {/* 状态标识 */}
                                <View className="flex flex-row items-center justify-between mb-2">
                                  <View className={`px-2 py-1 rounded ${getStatusBgColor(lease.status)}`}>
                                    <Text className={`text-xs font-semibold ${getStatusColor(lease.status)}`}>
                                      {getStatusLabel(lease.status)}
                                    </Text>
                                  </View>
                                  <Text className="text-xs text-muted-foreground">
                                    创建于 {formatDate(lease.created_at)}
                                  </Text>
                                </View>

                                {/* 租期信息 */}
                                <View className="space-y-1 mb-2">
                                  <View className="flex flex-row items-center gap-2">
                                    <View className="i-mdi-calendar text-sm text-muted-foreground" />
                                    <Text className="text-xs text-muted-foreground">
                                      {formatDate(lease.start_date)} 至 {formatDate(lease.end_date)}
                                    </Text>
                                  </View>
                                  <View className="flex flex-row items-center gap-2">
                                    <View className="i-mdi-clock-outline text-sm text-muted-foreground" />
                                    <Text className="text-xs text-muted-foreground">
                                      租期：{getDurationLabel(lease.duration_months)}
                                    </Text>
                                  </View>
                                  <View className="flex flex-row items-start gap-2">
                                    <View className="i-mdi-cog text-sm text-muted-foreground mt-0.5" />
                                    <Text className="text-xs text-muted-foreground flex-1">
                                      到期操作：{getExpireActionLabel(lease.expire_action)}
                                    </Text>
                                  </View>
                                </View>

                                {/* 操作按钮 */}
                                <Button
                                  className="w-full bg-red-500 text-white py-1 rounded break-keep text-xs"
                                  size="mini"
                                  onClick={() => handleDelete(lease.id)}>
                                  删除租期
                                </Button>
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
