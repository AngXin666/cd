import {ScrollView, Text, View} from '@tarojs/components'
import {useDidShow} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {getAllLeaseBills} from '@/db/api'
import type {LeaseBill} from '@/db/types'

export default function BillList() {
  const [bills, setBills] = useState<LeaseBill[]>([])
  const [loading, setLoading] = useState(true)

  const loadBills = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAllLeaseBills()
      setBills(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBills()
  }, [loadBills])

  useDidShow(() => {
    loadBills()
  })

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待核销'
      case 'verified':
        return '已核销'
      case 'cancelled':
        return '已取消'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-600'
      case 'verified':
        return 'bg-green-100 text-green-600'
      case 'cancelled':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4">
          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          ) : bills.length === 0 ? (
            <View className="flex items-center justify-center py-8">
              <Text className="text-muted-foreground">暂无账单</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {bills.map((bill) => (
                <View key={bill.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <View className="flex flex-row items-center justify-between mb-3">
                    <Text className="text-lg font-semibold text-foreground">账单月份：{bill.bill_month}</Text>
                    <View className={`px-2 py-1 rounded ${getStatusColor(bill.status)}`}>
                      <Text className="text-xs">{getStatusText(bill.status)}</Text>
                    </View>
                  </View>

                  <View className="space-y-1">
                    <View>
                      <Text className="text-sm text-muted-foreground">金额：¥{bill.amount}</Text>
                    </View>
                    {bill.verified_at && (
                      <View>
                        <Text className="text-sm text-muted-foreground">
                          核销时间：{new Date(bill.verified_at).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    {bill.notes && (
                      <View>
                        <Text className="text-sm text-muted-foreground">备注：{bill.notes}</Text>
                      </View>
                    )}
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
