import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {createPeerAccount, createTenant, getTenantById, updateTenant} from '@/db/api'

export default function TenantForm() {
  const [mode, setMode] = useState<'create' | 'edit' | 'create_peer'>('create')
  const [tenantId, setTenantId] = useState('')
  const [mainAccountId, setMainAccountId] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    company_name: '',
    lease_start_date: '',
    lease_end_date: '',
    monthly_fee: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  // 格式化日期为 YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 计算结束日期
  const calculateEndDate = (startDate: string, months: number): string => {
    if (!startDate) return ''
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + months)
    return formatDate(date)
  }

  // 初始化开始日期为当天
  useEffect(() => {
    if (mode === 'create' && !formData.lease_start_date) {
      const today = formatDate(new Date())
      setFormData((prev) => ({...prev, lease_start_date: today}))
    }
  }, [mode, formData.lease_start_date, formatDate])

  const loadTenant = async (id: string) => {
    const tenant = await getTenantById(id)
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        phone: tenant.phone || '',
        password: '',
        confirmPassword: '',
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
      const currentMode = (params.mode as 'create' | 'edit' | 'create_peer') || 'create'
      setMode(currentMode)

      if (params.id) {
        setTenantId(params.id)
        loadTenant(params.id)
      }

      if (params.mainAccountId) {
        setMainAccountId(params.mainAccountId)
      }
    }
  }, [loadTenant])

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      Taro.showToast({title: '请填写必填项', icon: 'none'})
      return
    }

    // 创建模式下必须填写密码
    if ((mode === 'create' || mode === 'create_peer') && !formData.password) {
      Taro.showToast({title: '请填写密码', icon: 'none'})
      return
    }

    // 验证密码长度
    if ((mode === 'create' || mode === 'create_peer') && formData.password.length < 6) {
      Taro.showToast({title: '密码至少6位', icon: 'none'})
      return
    }

    // 验证密码确认
    if ((mode === 'create' || mode === 'create_peer') && formData.password !== formData.confirmPassword) {
      Taro.showToast({title: '两次输入的密码不一致', icon: 'none'})
      return
    }

    setLoading(true)
    try {
      if (mode === 'create') {
        // 创建主账号
        const result = await createTenant(
          {
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
            notes: formData.notes || null,
            main_account_id: null,
            peer_account_permission: null,
            manager_permissions_enabled: null
          },
          null,
          formData.password
        )
        if (result === 'EMAIL_EXISTS') {
          Taro.showToast({title: '该手机号已被注册，请使用其他手机号', icon: 'none', duration: 2500})
        } else if (result) {
          Taro.showToast({title: '创建成功', icon: 'success'})
          setTimeout(() => {
            Taro.navigateBack()
          }, 1500)
        } else {
          Taro.showToast({title: '创建失败', icon: 'none'})
        }
      } else if (mode === 'create_peer') {
        // 创建平级账号
        if (!mainAccountId) {
          Taro.showToast({title: '缺少主账号ID', icon: 'none'})
          return
        }

        const result = await createPeerAccount(
          mainAccountId,
          {
            name: formData.name,
            phone: formData.phone,
            notes: formData.notes || null
          },
          null,
          formData.password
        )

        if (result === 'EMAIL_EXISTS') {
          Taro.showToast({title: '该手机号已被注册，请使用其他手机号', icon: 'none', duration: 2500})
        } else if (result) {
          Taro.showToast({title: '创建平级账号成功', icon: 'success'})
          setTimeout(() => {
            Taro.navigateBack()
          }, 1500)
        } else {
          Taro.showToast({title: '创建失败', icon: 'none'})
        }
      } else {
        // 编辑模式
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
          setTimeout(() => {
            Taro.navigateBack()
          }, 1500)
        } else {
          Taro.showToast({title: '更新失败', icon: 'none'})
        }
      }
    } catch (error) {
      console.error('提交失败:', error)
      Taro.showToast({title: '操作失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    if (mode === 'create') return '新增老板账号'
    if (mode === 'create_peer') return '新增老板账号（平级账号）'
    return '编辑老板账号'
  }

  // 处理快捷日期选择
  const handleQuickDate = (months: number) => {
    if (!formData.lease_start_date) {
      Taro.showToast({title: '请先选择开始日期', icon: 'none'})
      return
    }
    const endDate = calculateEndDate(formData.lease_start_date, months)
    setFormData({...formData, lease_end_date: endDate})
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4">
          {/* 页面标题 */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-primary">{getTitle()}</Text>
            {mode === 'create_peer' && (
              <View className="mt-1">
                <Text className="text-sm text-muted-foreground">创建的账号将与主账号共享同一个租户的数据</Text>
                <Text className="text-sm text-muted-foreground">公司名称和月租费用将自动继承主账号的设置</Text>
              </View>
            )}
          </View>

          {/* 表单 */}
          <View className="bg-white rounded-lg p-4 shadow-sm space-y-4">
            {/* 姓名 */}
            <View>
              <Text className="text-sm text-foreground mb-2">姓名 *</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input rounded-lg px-4 py-3 border border-border"
                  placeholder="请输入姓名"
                  value={formData.name}
                  onInput={(e) => setFormData({...formData, name: e.detail.value})}
                />
              </View>
            </View>

            {/* 电话 */}
            <View>
              <Text className="text-sm text-foreground mb-2">电话 *</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input rounded-lg px-4 py-3 border border-border"
                  placeholder="请输入电话"
                  value={formData.phone}
                  onInput={(e) => setFormData({...formData, phone: e.detail.value})}
                />
              </View>
            </View>

            {/* 密码（创建时必填） */}
            {(mode === 'create' || mode === 'create_peer') && (
              <View>
                <Text className="text-sm text-foreground mb-2">密码 *</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input rounded-lg px-4 py-3 border border-border"
                    placeholder="请输入密码（至少6位）"
                    password
                    value={formData.password}
                    onInput={(e) => setFormData({...formData, password: e.detail.value})}
                  />
                </View>
              </View>
            )}

            {/* 确认密码（创建时必填） */}
            {(mode === 'create' || mode === 'create_peer') && (
              <View>
                <Text className="text-sm text-foreground mb-2">确认密码 *</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input rounded-lg px-4 py-3 border border-border"
                    placeholder="请再次输入密码"
                    password
                    value={formData.confirmPassword}
                    onInput={(e) => setFormData({...formData, confirmPassword: e.detail.value})}
                  />
                </View>
              </View>
            )}

            {/* 公司名称（仅主账号创建和编辑时显示） */}
            {mode !== 'create_peer' && (
              <View>
                <Text className="text-sm text-foreground mb-2">公司名称</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input rounded-lg px-4 py-3 border border-border"
                    placeholder="请输入公司名称"
                    value={formData.company_name}
                    onInput={(e) => setFormData({...formData, company_name: e.detail.value})}
                  />
                </View>
              </View>
            )}

            {/* 租赁开始日期（仅主账号创建时显示） */}
            {mode === 'create' && (
              <View>
                <Text className="text-sm text-foreground mb-2">租赁开始日期</Text>
                <Picker
                  mode="date"
                  value={formData.lease_start_date}
                  onChange={(e) => setFormData({...formData, lease_start_date: e.detail.value})}>
                  <View className="bg-input rounded-lg px-4 py-3 border border-border">
                    <Text className={formData.lease_start_date ? 'text-foreground' : 'text-muted-foreground'}>
                      {formData.lease_start_date || '请选择开始日期'}
                    </Text>
                  </View>
                </Picker>
              </View>
            )}

            {/* 租赁结束日期（仅主账号创建时显示） */}
            {mode === 'create' && (
              <View>
                <Text className="text-sm text-foreground mb-2">租赁结束日期</Text>
                <Picker
                  mode="date"
                  value={formData.lease_end_date}
                  start={formData.lease_start_date || undefined}
                  onChange={(e) => setFormData({...formData, lease_end_date: e.detail.value})}>
                  <View className="bg-input rounded-lg px-4 py-3 border border-border">
                    <Text className={formData.lease_end_date ? 'text-foreground' : 'text-muted-foreground'}>
                      {formData.lease_end_date || '请选择结束日期'}
                    </Text>
                  </View>
                </Picker>

                {/* 快捷日期选择 */}
                <View className="mt-3">
                  <Text className="text-xs text-muted-foreground mb-2">快捷选择：</Text>
                  <View className="flex flex-row gap-2 flex-wrap">
                    <View className="px-3 py-2 rounded-lg bg-blue-100" onClick={() => handleQuickDate(1)}>
                      <Text className="text-sm text-blue-600">1个月</Text>
                    </View>
                    <View className="px-3 py-2 rounded-lg bg-blue-100" onClick={() => handleQuickDate(3)}>
                      <Text className="text-sm text-blue-600">3个月</Text>
                    </View>
                    <View className="px-3 py-2 rounded-lg bg-blue-100" onClick={() => handleQuickDate(6)}>
                      <Text className="text-sm text-blue-600">6个月</Text>
                    </View>
                    <View className="px-3 py-2 rounded-lg bg-blue-100" onClick={() => handleQuickDate(12)}>
                      <Text className="text-sm text-blue-600">1年</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 月租费用（仅主账号创建和编辑时显示） */}
            {mode !== 'create_peer' && (
              <View>
                <Text className="text-sm text-foreground mb-2">月租费用</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input rounded-lg px-4 py-3 border border-border"
                    placeholder="请输入月租费用"
                    type="digit"
                    value={formData.monthly_fee}
                    onInput={(e) => setFormData({...formData, monthly_fee: e.detail.value})}
                  />
                </View>
              </View>
            )}

            {/* 备注 */}
            <View>
              <Text className="text-sm text-foreground mb-2">备注</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input rounded-lg px-4 py-3 border border-border"
                  placeholder="请输入备注信息"
                  value={formData.notes}
                  onInput={(e) => setFormData({...formData, notes: e.detail.value})}
                />
              </View>
            </View>
          </View>

          {/* 提交按钮 */}
          <View className="mt-6">
            <Button
              className="w-full bg-primary text-white py-4 rounded-lg break-keep text-base"
              size="default"
              onClick={handleSubmit}
              disabled={loading}>
              {loading ? '提交中...' : '提交'}
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
