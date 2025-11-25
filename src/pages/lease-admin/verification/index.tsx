import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import {useCallback, useEffect, useState} from 'react'
import {getPendingLeaseBills, verifyLeaseBill} from '@/db/api'
import type {LeaseBill} from '@/db/types'

export default function Verification() {
  const {user} = useAuth({guard: true})
  const [bills, setBills] = useState<LeaseBill[]>([])
  const [loading, setLoading] = useState(true)

  const loadBills = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getPendingLeaseBills()
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

  const handleVerify = async (billId: string) => {
    if (!user) return

    const result = await Taro.showModal({
      title: '确认核销',
      content: '确定要核销该账单吗？'
    })

    if (result.confirm) {
      const success = await verifyLeaseBill(billId, user.id)
      if (success) {
        Taro.showToast({title: '核销成功', icon: 'success'})
        loadBills()
      } else {
        Taro.showToast({title: '核销失败', icon: 'none'})
      }
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
              <Text className="text-muted-foreground">暂无待核销账单</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {bills.map((bill) => (
                <View key={bill.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <View className="flex flex-row items-center justify-between mb-3">
                    <Text className="text-lg font-semibold text-foreground">账单月份：{bill.bill_month}</Text>
                    <View className="px-2 py-1 rounded bg-orange-100">
                      <Text className="text-xs text-orange-600">待核销</Text>
                    </View>
                  </View>

                  <View className="space-y-1 mb-3">
                    <View>
                      <Text className="text-sm text-muted-foreground">金额：¥{bill.amount}</Text>
                    </View>
                    {bill.notes && (
                      <View>
                        <Text className="text-sm text-muted-foreground">备注：{bill.notes}</Text>
                      </View>
                    )}
                  </View>

                  <Button
                    className="w-full bg-green-500 text-white py-2 rounded break-keep text-sm"
                    size="default"
                    onClick={() => handleVerify(bill.id)}>
                    核销
                  </Button>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
