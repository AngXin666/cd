import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {createTenant, getTenantById, updateTenant} from '@/db/api'

export default function TenantForm() {
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [tenantId, setTenantId] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company_name: '',
    lease_start_date: '',
    lease_end_date: '',
    monthly_fee: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  const loadTenant = async (id: string) => {
    const tenant = await getTenantById(id)
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        phone: tenant.phone || '',
        company_name: tenant.company_name || '',
        lease_start_date: tenant.lease_start_date || '',
        lease_end_date: tenant.lease_end_date || '',
        monthly_fee: tenant.monthly_fee?.toString() || '',
        notes: tenant.notes || ''
      })
    }
  }

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    if (params) {
      setMode((params.mode as 'create' | 'edit') || 'create')
      if (params.id) {
        setTenantId(params.id)
        loadTenant(params.id)
      }
    }
  }, [loadTenant])

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      Taro.showToast({title: '请填写必填项', icon: 'none'})
      return
    }

    setLoading(true)
    try {
      if (mode === 'create') {
        const result = await createTenant({
          name: formData.name,
          phone: formData.phone,
          email: null,
          role: 'super_admin',
          driver_type: null,
          avatar_url: null,
          nickname: null,
          address_province: null,
          address_city: null,
          address_district: null,
          address_detail: null,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          login_account: null,
          vehicle_plate: null,
          join_date: null,
          status: 'active',
          company_name: formData.company_name || null,
          lease_start_date: formData.lease_start_date || null,
          lease_end_date: formData.lease_end_date || null,
          monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null,
          notes: formData.notes || null
        })
        if (result) {
          Taro.showToast({title: '创建成功', icon: 'success'})
          setTimeout(() => Taro.navigateBack(), 1500)
        } else {
          Taro.showToast({title: '创建失败', icon: 'none'})
        }
      } else {
        const result = await updateTenant(tenantId, {
          name: formData.name,
          phone: formData.phone,
          company_name: formData.company_name || null,
          lease_start_date: formData.lease_start_date || null,
          lease_end_date: formData.lease_end_date || null,
          monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null,
          notes: formData.notes || null
        })
        if (result) {
          Taro.showToast({title: '更新成功', icon: 'success'})
          setTimeout(() => Taro.navigateBack(), 1500)
        } else {
          Taro.showToast({title: '更新失败', icon: 'none'})
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4">
          <View className="bg-white rounded-lg p-4 space-y-4">
            <View>
              <Text className="text-sm text-foreground mb-2">姓名 *</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input px-3 py-2 rounded border border-border w-full"
                  placeholder="请输入姓名"
                  value={formData.name}
                  onInput={(e) => setFormData({...formData, name: e.detail.value})}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm text-foreground mb-2">电话 *</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input px-3 py-2 rounded border border-border w-full"
                  placeholder="请输入电话"
                  value={formData.phone}
                  onInput={(e) => setFormData({...formData, phone: e.detail.value})}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm text-foreground mb-2">公司名称</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input px-3 py-2 rounded border border-border w-full"
                  placeholder="请输入公司名称"
                  value={formData.company_name}
                  onInput={(e) => setFormData({...formData, company_name: e.detail.value})}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm text-foreground mb-2">租赁开始日期</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input px-3 py-2 rounded border border-border w-full"
                  placeholder="YYYY-MM-DD"
                  value={formData.lease_start_date}
                  onInput={(e) => setFormData({...formData, lease_start_date: e.detail.value})}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm text-foreground mb-2">租赁结束日期</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input px-3 py-2 rounded border border-border w-full"
                  placeholder="YYYY-MM-DD"
                  value={formData.lease_end_date}
                  onInput={(e) => setFormData({...formData, lease_end_date: e.detail.value})}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm text-foreground mb-2">月租费用</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input px-3 py-2 rounded border border-border w-full"
                  placeholder="请输入月租费用"
                  type="digit"
                  value={formData.monthly_fee}
                  onInput={(e) => setFormData({...formData, monthly_fee: e.detail.value})}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm text-foreground mb-2">备注</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input px-3 py-2 rounded border border-border w-full"
                  placeholder="请输入备注"
                  value={formData.notes}
                  onInput={(e) => setFormData({...formData, notes: e.detail.value})}
                />
              </View>
            </View>

            <Button
              className="w-full bg-primary text-white py-3 rounded break-keep text-base"
              size="default"
              onClick={handleSubmit}
              loading={loading}>
              {mode === 'create' ? '创建' : '保存'}
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
