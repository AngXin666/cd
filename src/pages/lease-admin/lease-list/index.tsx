/**
 * 租期管理页面 - 累积模式
 * 每个租户只显示一条租期记录，添加租期时自动累积到现有租期
 */
import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {
  activateTenant,
  checkAndHandleExpiredLeases,
  createLease,
  getAllTenants,
  getLeasesByTenantId,
  reduceLease,
  suspendTenant
} from '@/db/api'
import type {CreateLeaseInput, ExpireActionType, Lease, Profile} from '@/db/types'

// 租户租期数据类型
interface TenantWithLease {
  tenant: Profile
  lease: Lease | null // 只保留最新的一条租期
}

export default function LeaseList() {
  const [tenantsWithLeases, setTenantsWithLeases] = useState<TenantWithLease[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState<string | null>(null) // 记录当前正在添加租期的租户ID
  const [showReduceForm, setShowReduceForm] = useState<string | null>(null) // 记录当前正在减少租期的租户ID

  // 表单状态
  const [selectedDurationIndex, setSelectedDurationIndex] = useState(0)
  const [selectedExpireActionIndex, setSelectedExpireActionIndex] = useState(0)
  const [selectedReduceMonthsIndex, setSelectedReduceMonthsIndex] = useState(0)

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

  // 减少租期选项
  const reduceMonthsOptions = [
    {label: '1个月', value: 1},
    {label: '3个月', value: 3},
    {label: '6个月', value: 6}
  ]

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // 先检查并处理到期的租期
      await checkAndHandleExpiredLeases()
      // 加载所有租户（只显示主账号）
      const tenantsData = await getAllTenants()
      const mainTenants = tenantsData.filter((t) => t.main_account_id === null)

      // 为每个租户加载其最新租期
      const tenantsWithLeasesData = await Promise.all(
        mainTenants.map(async (tenant) => {
          const leases = await getLeasesByTenantId(tenant.id)
          // 只保留最新的一条租期（按创建时间排序，取第一条）
          const latestLease = leases.length > 0 ? leases[0] : null
          return {tenant, lease: latestLease}
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

  const handleAddLease = (tenantId: string) => {
    setShowAddForm(tenantId)
    // 重置表单
    setSelectedDurationIndex(0)
    setSelectedExpireActionIndex(0)
  }

  // 显示租期时长选择
  const handleShowDurationPicker = async () => {
    try {
      const result = await Taro.showActionSheet({
        itemList: durationOptions.map((o) => o.label)
      })
      if (result.tapIndex !== undefined) {
        setSelectedDurationIndex(result.tapIndex)
      }
    } catch (_error) {
      // 用户取消选择
    }
  }

  // 显示到期操作选择
  const handleShowExpireActionPicker = async () => {
    try {
      const result = await Taro.showActionSheet({
        itemList: expireActionOptions.map((o) => o.label)
      })
      if (result.tapIndex !== undefined) {
        setSelectedExpireActionIndex(result.tapIndex)
      }
    } catch (_error) {
      // 用户取消选择
    }
  }

  // 显示减少月数选择
  const handleShowReduceMonthsPicker = async () => {
    try {
      const result = await Taro.showActionSheet({
        itemList: reduceMonthsOptions.map((o) => o.label)
      })
      if (result.tapIndex !== undefined) {
        setSelectedReduceMonthsIndex(result.tapIndex)
      }
    } catch (_error) {
      // 用户取消选择
    }
  }

  const handleSubmit = async (tenantId: string) => {
    try {
      const selectedDuration = durationOptions[selectedDurationIndex]
      const selectedExpireAction = expireActionOptions[selectedExpireActionIndex]

      console.log('添加租期 - 选中的索引:', selectedDurationIndex)
      console.log('添加租期 - 选中的时长:', selectedDuration)

      const input: CreateLeaseInput = {
        tenant_id: tenantId,
        start_date: new Date().toISOString().split('T')[0],
        duration_months: selectedDuration.value,
        expire_action: selectedExpireAction.value as ExpireActionType
      }

      console.log('添加租期 - 提交的数据:', input)

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

  const handleReduceSubmit = async (leaseId: string) => {
    try {
      const selectedReduceMonths = reduceMonthsOptions[selectedReduceMonthsIndex]
      const success = await reduceLease(leaseId, selectedReduceMonths.value)

      if (success) {
        Taro.showToast({title: '减少成功', icon: 'success'})
        setShowReduceForm(null)
        loadData()
      } else {
        Taro.showToast({title: '减少失败，请检查租期是否足够', icon: 'none', duration: 2000})
      }
    } catch (error) {
      console.error('减少租期失败:', error)
      Taro.showToast({title: '减少失败', icon: 'none'})
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

  // 计算从现在到到期日期的剩余月数
  const getRemainingMonths = (endDate: string) => {
    const now = new Date()
    const end = new Date(endDate)

    // 计算年份差和月份差
    const yearDiff = end.getFullYear() - now.getFullYear()
    const monthDiff = end.getMonth() - now.getMonth()
    const dayDiff = end.getDate() - now.getDate()

    // 总月数 = 年份差 * 12 + 月份差
    let totalMonths = yearDiff * 12 + monthDiff

    // 如果日期差为负（例如：现在是15号，到期日是10号），则减去一个月
    if (dayDiff < 0) {
      totalMonths -= 1
    }

    // 确保不返回负数
    return Math.max(0, totalMonths)
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
              {tenantsWithLeases.map(({tenant, lease}) => {
                const isAddingLease = showAddForm === tenant.id
                const isReducing = showReduceForm === tenant.id

                return (
                  <View key={tenant.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* 租户卡片 */}
                    <View className="p-4">
                      {/* 租户基本信息 */}
                      <View className="mb-3">
                        <View className="flex flex-row items-center gap-2 mb-2">
                          <Text className="text-lg font-semibold text-foreground">{tenant.name || '未命名'}</Text>
                          {/* 状态标识 */}
                          <View className={`px-2 py-1 rounded ${getTenantStatusBgColor(tenant.status || 'active')}`}>
                            <Text className={`text-xs ${getTenantStatusColor(tenant.status || 'active')}`}>
                              {getTenantStatusLabel(tenant.status || 'active')}
                            </Text>
                          </View>
                        </View>
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

                      {/* 租期信息 */}
                      {lease ? (
                        <View className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 mb-3">
                          <View className="flex flex-row items-center justify-between mb-3">
                            <Text className="text-base font-semibold text-foreground">租期信息</Text>
                            <View className={`px-2 py-1 rounded ${getStatusBgColor(lease.status)}`}>
                              <Text className={`text-xs font-semibold ${getStatusColor(lease.status)}`}>
                                {getStatusLabel(lease.status)}
                              </Text>
                            </View>
                          </View>

                          <View className="space-y-2">
                            {/* 到期时间 */}
                            <View className="flex flex-row items-center gap-2">
                              <View className="i-mdi-calendar-clock text-lg text-primary" />
                              <View className="flex-1">
                                <Text className="text-xs text-muted-foreground">到期时间</Text>
                                <Text className="text-base font-semibold text-foreground">
                                  {formatDate(lease.end_date)}
                                </Text>
                              </View>
                            </View>

                            {/* 剩余租期月数 */}
                            <View className="flex flex-row items-center gap-2">
                              <View className="i-mdi-clock-outline text-lg text-primary" />
                              <View className="flex-1">
                                <Text className="text-xs text-muted-foreground">剩余租期</Text>
                                <Text className="text-base font-semibold text-primary">
                                  {getDurationLabel(getRemainingMonths(lease.end_date))}
                                </Text>
                              </View>
                            </View>

                            {/* 到期操作 */}
                            <View className="flex flex-row items-start gap-2">
                              <View className="i-mdi-cog text-lg text-muted-foreground mt-0.5" />
                              <View className="flex-1">
                                <Text className="text-xs text-muted-foreground">到期后操作</Text>
                                <Text className="text-sm text-foreground">
                                  {getExpireActionLabel(lease.expire_action)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View className="bg-gray-100 rounded-lg p-4 mb-3">
                          <View className="flex items-center justify-center py-4">
                            <View className="i-mdi-calendar-blank text-4xl text-gray-300 mb-2" />
                            <Text className="text-sm text-muted-foreground">暂无租期</Text>
                          </View>
                        </View>
                      )}

                      {/* 添加租期表单 */}
                      {isAddingLease && (
                        <View className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                          <View className="mb-3">
                            <Text className="text-base font-semibold text-foreground">
                              {lease ? '续期' : '添加租期'}
                            </Text>
                          </View>

                          {/* 选择租期时长 */}
                          <View className="mb-3">
                            <Text className="text-sm text-muted-foreground mb-2">租期时长</Text>
                            <View
                              className="bg-white rounded-lg px-4 py-3 border border-border flex flex-row items-center justify-between"
                              onClick={handleShowDurationPicker}>
                              <Text className="text-foreground">{durationOptions[selectedDurationIndex].label}</Text>
                              <View className="i-mdi-chevron-down text-lg text-muted-foreground" />
                            </View>
                          </View>

                          {/* 选择到期操作 */}
                          <View className="mb-3">
                            <Text className="text-sm text-muted-foreground mb-2">到期后操作</Text>
                            <View
                              className="bg-white rounded-lg px-4 py-3 border border-border flex flex-row items-center justify-between"
                              onClick={handleShowExpireActionPicker}>
                              <Text className="text-foreground text-xs flex-1">
                                {expireActionOptions[selectedExpireActionIndex].label}
                              </Text>
                              <View className="i-mdi-chevron-down text-lg text-muted-foreground" />
                            </View>
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
                              确认{lease ? '续期' : '添加'}
                            </Button>
                          </View>
                        </View>
                      )}

                      {/* 减少租期表单 */}
                      {isReducing && lease && (
                        <View className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                          <View className="mb-3">
                            <Text className="text-base font-semibold text-foreground">减少租期</Text>
                          </View>

                          {/* 选择减少月数 */}
                          <View className="mb-3">
                            <Text className="text-sm text-muted-foreground mb-2">减少月数</Text>
                            <View
                              className="bg-white rounded-lg px-4 py-3 border border-border flex flex-row items-center justify-between"
                              onClick={handleShowReduceMonthsPicker}>
                              <Text className="text-foreground">
                                {reduceMonthsOptions[selectedReduceMonthsIndex].label}
                              </Text>
                              <View className="i-mdi-chevron-down text-lg text-muted-foreground" />
                            </View>
                          </View>

                          {/* 操作按钮 */}
                          <View className="flex flex-row gap-3">
                            <Button
                              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded break-keep text-sm"
                              size="mini"
                              onClick={() => setShowReduceForm(null)}>
                              取消
                            </Button>
                            <Button
                              className="flex-1 bg-orange-500 text-white py-2 rounded break-keep text-sm"
                              size="mini"
                              onClick={() => handleReduceSubmit(lease.id)}>
                              确认减少
                            </Button>
                          </View>
                        </View>
                      )}

                      {/* 操作按钮 */}
                      <View className="flex flex-row gap-2">
                        <Button
                          className="flex-1 bg-primary text-white py-2 rounded break-keep text-sm"
                          size="mini"
                          onClick={() => handleAddLease(tenant.id)}>
                          {lease ? '续期' : '添加租期'}
                        </Button>
                        {lease && (
                          <Button
                            className="flex-1 bg-orange-500 text-white py-2 rounded break-keep text-sm"
                            size="mini"
                            onClick={() => setShowReduceForm(tenant.id)}>
                            减少租期
                          </Button>
                        )}
                        {(tenant.status || 'active') === 'active' ? (
                          <Button
                            className="flex-1 bg-red-500 text-white py-2 rounded break-keep text-sm"
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
