import {Button, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {checkAndHandleExpiredLeases, createLease, deleteLease, getAllLeases, getAllTenants} from '@/db/api'
import type {CreateLeaseInput, LeaseWithTenant, Profile} from '@/db/types'

export default function LeaseList() {
  const [leases, setLeases] = useState<LeaseWithTenant[]>([])
  const [tenants, setTenants] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  // 表单状态
  const [selectedTenantIndex, setSelectedTenantIndex] = useState(0)
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
      // 加载租期列表和租户列表
      const [leasesData, tenantsData] = await Promise.all([getAllLeases(), getAllTenants()])
      setLeases(leasesData)
      // 只显示主账号（main_account_id 为 null）
      setTenants(tenantsData.filter((t) => t.main_account_id === null))
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

  const handleAddLease = () => {
    if (tenants.length === 0) {
      Taro.showToast({title: '暂无可用的老板账号', icon: 'none'})
      return
    }
    setShowAddForm(true)
  }

  const handleSubmit = async () => {
    try {
      const selectedTenant = tenants[selectedTenantIndex]
      const selectedDuration = durationOptions[selectedDurationIndex]
      const selectedExpireAction = expireActionOptions[selectedExpireActionIndex]

      if (!selectedTenant) {
        Taro.showToast({title: '请选择老板账号', icon: 'none'})
        return
      }

      const input: CreateLeaseInput = {
        tenant_id: selectedTenant.id,
        start_date: new Date().toISOString().split('T')[0],
        duration_months: selectedDuration.value,
        expire_action: selectedExpireAction.value as any
      }

      const success = await createLease(input)
      if (success) {
        Taro.showToast({title: '添加成功', icon: 'success'})
        setShowAddForm(false)
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

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4">
          {/* 页面标题 */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-primary">租期管理</Text>
            <View className="mt-1">
              <Text className="text-sm text-muted-foreground">管理老板账号的租赁期限</Text>
            </View>
          </View>

          {/* 添加租期按钮 */}
          <View className="mb-4">
            <Button
              className="w-full bg-primary text-white py-3 rounded-lg break-keep text-base"
              size="default"
              onClick={handleAddLease}>
              添加租期
            </Button>
          </View>

          {/* 添加租期表单 */}
          {showAddForm && (
            <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <View className="mb-4">
                <Text className="text-lg font-semibold text-foreground mb-3">添加新租期</Text>
              </View>

              {/* 选择老板账号 */}
              <View className="mb-4">
                <Text className="text-sm text-muted-foreground mb-2">选择老板账号</Text>
                <Picker
                  mode="selector"
                  range={tenants.map((t) => `${t.name || '未命名'} (${t.phone || '无电话'})`)}
                  value={selectedTenantIndex}
                  onChange={(e) => setSelectedTenantIndex(Number(e.detail.value))}>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 border border-border">
                    <Text className="text-foreground">
                      {tenants[selectedTenantIndex]
                        ? `${tenants[selectedTenantIndex].name || '未命名'} (${tenants[selectedTenantIndex].phone || '无电话'})`
                        : '请选择老板账号'}
                    </Text>
                  </View>
                </Picker>
              </View>

              {/* 选择租期时长 */}
              <View className="mb-4">
                <Text className="text-sm text-muted-foreground mb-2">租期时长</Text>
                <Picker
                  mode="selector"
                  range={durationOptions.map((o) => o.label)}
                  value={selectedDurationIndex}
                  onChange={(e) => setSelectedDurationIndex(Number(e.detail.value))}>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 border border-border">
                    <Text className="text-foreground">{durationOptions[selectedDurationIndex].label}</Text>
                  </View>
                </Picker>
              </View>

              {/* 选择到期操作 */}
              <View className="mb-4">
                <Text className="text-sm text-muted-foreground mb-2">到期后操作</Text>
                <Picker
                  mode="selector"
                  range={expireActionOptions.map((o) => o.label)}
                  value={selectedExpireActionIndex}
                  onChange={(e) => setSelectedExpireActionIndex(Number(e.detail.value))}>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 border border-border">
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
                  onClick={() => setShowAddForm(false)}>
                  取消
                </Button>
                <Button
                  className="flex-1 bg-primary text-white py-2 rounded break-keep text-sm"
                  size="mini"
                  onClick={handleSubmit}>
                  确认添加
                </Button>
              </View>
            </View>
          )}

          {/* 租期列表 */}
          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          ) : leases.length === 0 ? (
            <View className="flex items-center justify-center py-8">
              <Text className="text-muted-foreground">暂无租期记录</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {leases.map((lease) => (
                <View key={lease.id} className="bg-white rounded-lg p-4 shadow-sm">
                  {/* 租户信息 */}
                  <View className="flex flex-row items-center justify-between mb-3">
                    <View className="flex flex-row items-center gap-2">
                      <View className="i-mdi-account text-xl text-primary" />
                      <Text className="text-lg font-semibold text-foreground">{lease.tenant?.name || '未命名'}</Text>
                      {/* 状态标识 */}
                      <View className={`px-2 py-1 rounded ${getStatusBgColor(lease.status)}`}>
                        <Text className={`text-xs ${getStatusColor(lease.status)}`}>
                          {getStatusLabel(lease.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 租期信息 */}
                  <View className="space-y-2 mb-3">
                    {lease.tenant?.phone && (
                      <View className="flex flex-row items-center gap-2">
                        <View className="i-mdi-phone text-base text-muted-foreground" />
                        <Text className="text-sm text-muted-foreground">{lease.tenant.phone}</Text>
                      </View>
                    )}
                    {lease.tenant?.company_name && (
                      <View className="flex flex-row items-center gap-2">
                        <View className="i-mdi-office-building text-base text-muted-foreground" />
                        <Text className="text-sm text-muted-foreground">{lease.tenant.company_name}</Text>
                      </View>
                    )}
                    <View className="flex flex-row items-center gap-2">
                      <View className="i-mdi-calendar text-base text-muted-foreground" />
                      <Text className="text-sm text-muted-foreground">
                        {formatDate(lease.start_date)} 至 {formatDate(lease.end_date)}
                      </Text>
                    </View>
                    <View className="flex flex-row items-center gap-2">
                      <View className="i-mdi-clock-outline text-base text-muted-foreground" />
                      <Text className="text-sm text-muted-foreground">
                        租期：{getDurationLabel(lease.duration_months)}
                      </Text>
                    </View>
                    <View className="flex flex-row items-center gap-2">
                      <View className="i-mdi-cog text-base text-muted-foreground" />
                      <Text className="text-sm text-muted-foreground">
                        到期操作：{getExpireActionLabel(lease.expire_action)}
                      </Text>
                    </View>
                  </View>

                  {/* 操作按钮 */}
                  <View className="flex flex-row gap-2">
                    <Button
                      className="flex-1 bg-red-500 text-white py-2 rounded break-keep text-sm"
                      size="mini"
                      onClick={() => handleDelete(lease.id)}>
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
