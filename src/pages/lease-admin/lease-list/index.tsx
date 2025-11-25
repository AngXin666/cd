import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {useTenant} from '@/contexts/TenantContext'
import {deleteVehicleLease, getAllVehicleLeases} from '@/db/api'
import type {VehicleLease} from '@/db/types'

/**
 * 租赁列表页面
 */
const LeaseList: React.FC = () => {
  const {user} = useAuth({guard: true})
  const {isLeaseAdmin} = useTenant()
  const [leases, setLeases] = useState<VehicleLease[]>([])
  const [filteredLeases, setFilteredLeases] = useState<VehicleLease[]>([])
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all')
  const [loading, setLoading] = useState(false)

  /**
   * 过滤租赁列表
   */
  const filterLeases = useCallback((data: VehicleLease[], search: string, status: 'all' | 'active' | 'expired') => {
    let filtered = data

    // 按状态过滤
    if (status !== 'all') {
      const now = new Date()
      filtered = filtered.filter((lease) => {
        const isActive = !lease.end_date || new Date(lease.end_date) >= now
        return status === 'active' ? isActive : !isActive
      })
    }

    // 按搜索文本过滤
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (lease) =>
          lease.vehicle_id?.toLowerCase().includes(searchLower) || lease.driver_id?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredLeases(filtered)
  }, [])

  /**
   * 加载租赁列表
   */
  const loadLeases = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const data = await getAllVehicleLeases()
      setLeases(data)
      filterLeases(data, searchText, filterStatus)
    } catch (error) {
      console.error('加载租赁列表失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id, searchText, filterStatus, filterLeases])

  // 页面显示时加载数据
  useDidShow(() => {
    loadLeases()
  })

  /**
   * 搜索处理
   */
  const handleSearch = (value: string) => {
    setSearchText(value)
    filterLeases(leases, value, filterStatus)
  }

  /**
   * 状态过滤处理
   */
  const handleFilterStatus = (status: 'all' | 'active' | 'expired') => {
    setFilterStatus(status)
    filterLeases(leases, searchText, status)
  }

  /**
   * 查看租赁详情
   */
  const viewDetail = (leaseId: string) => {
    Taro.navigateTo({
      url: `/pages/lease-admin/lease-detail/index?id=${leaseId}`
    })
  }

  /**
   * 编辑租赁
   */
  const editLease = (leaseId: string) => {
    Taro.navigateTo({
      url: `/pages/lease-admin/edit-lease/index?id=${leaseId}`
    })
  }

  /**
   * 删除租赁
   */
  const handleDelete = async (leaseId: string) => {
    const result = await Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条租赁记录吗？此操作不可恢复。'
    })

    if (!result.confirm) return

    try {
      await deleteVehicleLease(leaseId)
      Taro.showToast({
        title: '删除成功',
        icon: 'success'
      })
      loadLeases()
    } catch (error) {
      console.error('删除租赁失败:', error)
      Taro.showToast({
        title: '删除失败',
        icon: 'error'
      })
    }
  }

  /**
   * 添加租赁
   */
  const goToAddLease = () => {
    Taro.navigateTo({
      url: '/pages/lease-admin/add-lease/index'
    })
  }

  // 权限检查
  if (!isLeaseAdmin) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background p-4">
        <View className="text-center">
          <View className="i-mdi-alert-circle text-6xl text-destructive mb-4" />
          <Text className="text-lg font-medium text-foreground mb-2">无权访问</Text>
          <Text className="text-muted-foreground">您没有权限访问租赁列表</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #f8fafc, #e2e8f0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{background: 'transparent', minHeight: '100vh'}}>
        <View className="p-4">
          {/* 搜索栏 */}
          <View className="bg-white rounded-lg p-3 mb-4 shadow-sm">
            <View style={{overflow: 'hidden'}}>
              <Input
                className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                placeholder="搜索车牌号或司机..."
                value={searchText}
                onInput={(e) => handleSearch(e.detail.value)}
              />
            </View>
          </View>

          {/* 状态过滤 */}
          <View className="flex items-center gap-2 mb-4">
            <Button
              className={`flex-1 py-2 rounded break-keep text-sm ${
                filterStatus === 'all' ? 'bg-primary text-white' : 'bg-white text-foreground border border-border'
              }`}
              size="default"
              onClick={() => handleFilterStatus('all')}>
              全部
            </Button>
            <Button
              className={`flex-1 py-2 rounded break-keep text-sm ${
                filterStatus === 'active' ? 'bg-primary text-white' : 'bg-white text-foreground border border-border'
              }`}
              size="default"
              onClick={() => handleFilterStatus('active')}>
              活跃
            </Button>
            <Button
              className={`flex-1 py-2 rounded break-keep text-sm ${
                filterStatus === 'expired' ? 'bg-primary text-white' : 'bg-white text-foreground border border-border'
              }`}
              size="default"
              onClick={() => handleFilterStatus('expired')}>
              已过期
            </Button>
          </View>

          {/* 租赁列表 */}
          {loading ? (
            <View className="bg-white rounded-lg p-8 text-center shadow-sm">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          ) : filteredLeases.length === 0 ? (
            <View className="bg-white rounded-lg p-8 text-center shadow-sm">
              <View className="i-mdi-file-document-outline text-6xl text-muted-foreground mb-3" />
              <Text className="text-muted-foreground mb-4">暂无租赁记录</Text>
              <Button
                className="bg-primary text-white py-3 px-6 rounded break-keep text-sm"
                size="default"
                onClick={goToAddLease}>
                添加租赁
              </Button>
            </View>
          ) : (
            <View className="space-y-3">
              {filteredLeases.map((lease) => {
                const isActive = !lease.end_date || new Date(lease.end_date) >= new Date()
                return (
                  <View key={lease.id} className="bg-white rounded-lg p-4 shadow-sm">
                    {/* 头部 */}
                    <View className="flex items-center justify-between mb-3">
                      <Text className="text-base font-medium text-foreground">
                        车牌号：{lease.vehicle_id || '未知'}
                      </Text>
                      <View
                        className={`px-2 py-1 rounded text-xs ${
                          isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        <Text>{isActive ? '活跃' : '已过期'}</Text>
                      </View>
                    </View>

                    {/* 租赁信息 */}
                    <View className="space-y-2 mb-3">
                      <View className="flex items-center text-sm text-muted-foreground">
                        <View className="i-mdi-calendar text-base mr-2" />
                        <Text>开始日期：{lease.start_date}</Text>
                      </View>
                      {lease.end_date && (
                        <View className="flex items-center text-sm text-muted-foreground">
                          <View className="i-mdi-calendar-end text-base mr-2" />
                          <Text>结束日期：{lease.end_date}</Text>
                        </View>
                      )}
                      <View className="flex items-center text-sm text-muted-foreground">
                        <View className="i-mdi-currency-cny text-base mr-2" />
                        <Text>月租金：¥{lease.monthly_rent?.toLocaleString() || 0}</Text>
                      </View>
                      {lease.deposit && (
                        <View className="flex items-center text-sm text-muted-foreground">
                          <View className="i-mdi-cash text-base mr-2" />
                          <Text>押金：¥{lease.deposit.toLocaleString()}</Text>
                        </View>
                      )}
                    </View>

                    {/* 操作按钮 */}
                    <View className="flex items-center gap-2 pt-3 border-t border-border">
                      <Button
                        className="flex-1 bg-primary text-white py-2 rounded break-keep text-xs"
                        size="default"
                        onClick={() => viewDetail(lease.id)}>
                        查看详情
                      </Button>
                      <Button
                        className="flex-1 bg-secondary text-white py-2 rounded break-keep text-xs"
                        size="default"
                        onClick={() => editLease(lease.id)}>
                        编辑
                      </Button>
                      <Button
                        className="flex-1 bg-destructive text-white py-2 rounded break-keep text-xs"
                        size="default"
                        onClick={() => handleDelete(lease.id)}>
                        删除
                      </Button>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* 添加按钮 */}
          {filteredLeases.length > 0 && (
            <View className="mt-4">
              <Button
                className="w-full bg-primary text-white py-4 rounded break-keep text-base"
                size="default"
                onClick={goToAddLease}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-plus-circle text-xl mr-2" />
                  <Text>添加租赁</Text>
                </View>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default LeaseList
