import {Button, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {createLease, deleteLease, getLeasesByTenantId} from '@/db/api'
import type {CreateLeaseInput, ExpireActionType, Lease} from '@/db/types'

export default function TenantLeaseManagement() {
  const router = useRouter()
  const {tenantId, tenantName} = router.params
  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

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
    if (!tenantId) return

    try {
      setLoading(true)
      const data = await getLeasesByTenantId(tenantId)
      setLeases(data)
    } catch (error) {
      console.error('加载租期数据失败:', error)
      Taro.showToast({title: '加载失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    loadData()
  })

  const handleAddLease = () => {
    setShowAddForm(true)
  }

  const handleSubmit = async () => {
    if (!tenantId) {
      Taro.showToast({title: '租户ID不存在', icon: 'none'})
      return
    }

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
            <Text className="text-2xl font-bold text-primary">{decodeURIComponent(tenantName || '未命名')}</Text>
            <View className="mt-1">
              <Text className="text-sm text-muted-foreground">管理该老板账号的租赁期限</Text>
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
            <View className="bg-white rounded-lg p-8 shadow-sm">
              <View className="flex items-center justify-center">
                <View className="i-mdi-calendar-blank text-6xl text-gray-300 mb-4" />
              </View>
              <Text className="text-center text-muted-foreground">暂无租期记录</Text>
              <Text className="text-center text-sm text-muted-foreground mt-2">点击上方按钮添加租期</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {leases.map((lease) => (
                <View key={lease.id} className="bg-white rounded-lg p-4 shadow-sm">
                  {/* 状态标识 */}
                  <View className="flex flex-row items-center justify-between mb-3">
                    <View className={`px-3 py-1 rounded ${getStatusBgColor(lease.status)}`}>
                      <Text className={`text-sm font-semibold ${getStatusColor(lease.status)}`}>
                        {getStatusLabel(lease.status)}
                      </Text>
                    </View>
                    <Text className="text-xs text-muted-foreground">创建于 {formatDate(lease.created_at)}</Text>
                  </View>

                  {/* 租期信息 */}
                  <View className="space-y-2 mb-3">
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
                    <View className="flex flex-row items-start gap-2">
                      <View className="i-mdi-cog text-base text-muted-foreground mt-0.5" />
                      <Text className="text-sm text-muted-foreground flex-1">
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
                      删除租期
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
