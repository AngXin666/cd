import {ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {getTenantById} from '@/db/api'
import type {Profile} from '@/db/types'

export default function TenantDetail() {
  const [tenant, setTenant] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTenant = async (id: string) => {
    try {
      setLoading(true)
      const data = await getTenantById(id)
      setTenant(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    if (params?.id) {
      loadTenant(params.id)
    }
  }, [loadTenant])

  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  if (!tenant) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Text className="text-muted-foreground">未找到数据</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4">
          <View className="bg-white rounded-lg p-4 space-y-3">
            <View>
              <Text className="text-sm text-muted-foreground">姓名</Text>
              <Text className="text-base text-foreground">{tenant.name || '-'}</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">电话</Text>
              <Text className="text-base text-foreground">{tenant.phone || '-'}</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">公司名称</Text>
              <Text className="text-base text-foreground">{tenant.company_name || '-'}</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">状态</Text>
              <Text className="text-base text-foreground">
                {(tenant.status || 'active') === 'active' ? '正常' : '停用'}
              </Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">月租费用</Text>
              <Text className="text-base text-foreground">¥{tenant.monthly_fee || 0}</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">租赁开始日期</Text>
              <Text className="text-base text-foreground">{tenant.lease_start_date || '-'}</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">租赁结束日期</Text>
              <Text className="text-base text-foreground">{tenant.lease_end_date || '-'}</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">备注</Text>
              <Text className="text-base text-foreground">{tenant.notes || '-'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
