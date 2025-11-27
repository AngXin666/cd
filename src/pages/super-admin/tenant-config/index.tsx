/**
 * 租户配置管理页面
 *
 * 功能：
 * 1. 查看所有租户配置
 * 2. 创建新租户
 * 3. 编辑租户配置
 * 4. 暂停/激活租户
 * 5. 删除租户
 */

import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import type {TenantConfig} from '@/client/tenantSupabaseManager'
import {
  activateTenant,
  createTenantConfig,
  deleteTenantConfig,
  getAllTenantConfigs,
  suspendTenant,
  type TenantConfigInput,
  updateTenantConfig
} from '@/db/tenantConfigApi'

const TenantConfigManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [tenants, setTenants] = useState<TenantConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingTenant, setEditingTenant] = useState<TenantConfig | null>(null)
  const [formData, setFormData] = useState<TenantConfigInput>({
    tenant_name: '',
    schema_name: '',
    supabase_url: '',
    supabase_anon_key: ''
  })

  // 加载租户列表
  const loadTenants = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getAllTenantConfigs()
      setTenants(data)
    } catch (error) {
      console.error('加载租户列表失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 页面显示时加载数据
  useDidShow(() => {
    loadTenants()
  })

  // 处理表单输入
  const handleInputChange = (field: keyof TenantConfigInput, value: string) => {
    setFormData((prev) => ({...prev, [field]: value}))
  }

  // 提交表单
  const handleSubmit = async () => {
    // 验证表单
    if (!formData.tenant_name || !formData.schema_name || !formData.supabase_url || !formData.supabase_anon_key) {
      Taro.showToast({
        title: '请填写所有字段',
        icon: 'none'
      })
      return
    }

    setIsLoading(true)
    try {
      if (editingTenant) {
        // 更新租户
        await updateTenantConfig(editingTenant.id, formData)
        Taro.showToast({
          title: '更新成功',
          icon: 'success'
        })
      } else {
        // 创建租户
        await createTenantConfig(formData)
        Taro.showToast({
          title: '创建成功',
          icon: 'success'
        })
      }

      // 重置表单
      setFormData({
        tenant_name: '',
        schema_name: '',
        supabase_url: '',
        supabase_anon_key: ''
      })
      setShowForm(false)
      setEditingTenant(null)

      // 重新加载列表
      await loadTenants()
    } catch (error) {
      console.error('操作失败:', error)
      Taro.showToast({
        title: '操作失败',
        icon: 'none'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 编辑租户
  const handleEdit = (tenant: TenantConfig) => {
    setEditingTenant(tenant)
    setFormData({
      tenant_name: tenant.tenant_name,
      schema_name: tenant.schema_name,
      supabase_url: tenant.supabase_url,
      supabase_anon_key: tenant.supabase_anon_key
    })
    setShowForm(true)
  }

  // 暂停租户
  const handleSuspend = async (tenantId: string) => {
    const result = await Taro.showModal({
      title: '确认暂停',
      content: '确定要暂停此租户吗？'
    })

    if (result.confirm) {
      setIsLoading(true)
      try {
        await suspendTenant(tenantId)
        Taro.showToast({
          title: '暂停成功',
          icon: 'success'
        })
        await loadTenants()
      } catch (error) {
        console.error('暂停失败:', error)
        Taro.showToast({
          title: '暂停失败',
          icon: 'none'
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  // 激活租户
  const handleActivate = async (tenantId: string) => {
    setIsLoading(true)
    try {
      await activateTenant(tenantId)
      Taro.showToast({
        title: '激活成功',
        icon: 'success'
      })
      await loadTenants()
    } catch (error) {
      console.error('激活失败:', error)
      Taro.showToast({
        title: '激活失败',
        icon: 'none'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 删除租户
  const handleDelete = async (tenantId: string) => {
    const result = await Taro.showModal({
      title: '确认删除',
      content: '确定要删除此租户吗？此操作不可恢复！'
    })

    if (result.confirm) {
      setIsLoading(true)
      try {
        await deleteTenantConfig(tenantId)
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        })
        await loadTenants()
      } catch (error) {
        console.error('删除失败:', error)
        Taro.showToast({
          title: '删除失败',
          icon: 'none'
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  // 取消编辑
  const handleCancel = () => {
    setShowForm(false)
    setEditingTenant(null)
    setFormData({
      tenant_name: '',
      schema_name: '',
      supabase_url: '',
      supabase_anon_key: ''
    })
  }

  // 获取状态标签样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800'
      case 'deleted':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃'
      case 'suspended':
        return '暂停'
      case 'deleted':
        return '已删除'
      default:
        return '未知'
    }
  }

  if (!user) {
    return null
  }

  return (
    <View className="min-h-screen bg-background">
      {/* 头部 */}
      <View className="bg-primary text-white p-6">
        <Text className="text-2xl font-bold">租户配置管理</Text>
        <Text className="text-sm mt-2 opacity-90">管理所有租户的配置信息</Text>
      </View>

      <ScrollView scrollY className="flex-1 box-border" style={{height: 'calc(100vh - 120px)'}}>
        <View className="p-4">
          {/* 创建按钮 */}
          {!showForm && (
            <Button
              className="w-full bg-primary text-white py-4 rounded mb-4 break-keep text-base"
              size="default"
              onClick={() => setShowForm(true)}>
              创建新租户
            </Button>
          )}

          {/* 表单 */}
          {showForm && (
            <View className="bg-card rounded-lg p-4 mb-4 shadow">
              <Text className="text-lg font-bold mb-4">{editingTenant ? '编辑租户' : '创建租户'}</Text>

              <View className="mb-4">
                <Text className="text-sm text-muted-foreground mb-2">租户名称</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    value={formData.tenant_name}
                    onInput={(e) => handleInputChange('tenant_name', e.detail.value)}
                    placeholder="请输入租户名称"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm text-muted-foreground mb-2">Schema 名称</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    value={formData.schema_name}
                    onInput={(e) => handleInputChange('schema_name', e.detail.value)}
                    placeholder="请输入 Schema 名称"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm text-muted-foreground mb-2">Supabase URL</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    value={formData.supabase_url}
                    onInput={(e) => handleInputChange('supabase_url', e.detail.value)}
                    placeholder="https://xxx.supabase.co"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm text-muted-foreground mb-2">Supabase Anon Key</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    value={formData.supabase_anon_key}
                    onInput={(e) => handleInputChange('supabase_anon_key', e.detail.value)}
                    placeholder="请输入 Anon Key"
                  />
                </View>
              </View>

              <View className="flex flex-row gap-2">
                <Button
                  className="flex-1 bg-primary text-white py-3 rounded break-keep text-base"
                  size="default"
                  onClick={handleSubmit}
                  disabled={isLoading}>
                  {editingTenant ? '更新' : '创建'}
                </Button>
                <Button
                  className="flex-1 bg-muted text-foreground py-3 rounded break-keep text-base"
                  size="default"
                  onClick={handleCancel}
                  disabled={isLoading}>
                  取消
                </Button>
              </View>
            </View>
          )}

          {/* 租户列表 */}
          <View className="space-y-4">
            {tenants.map((tenant) => (
              <View key={tenant.id} className="bg-card rounded-lg p-4 shadow">
                <View className="flex flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground">{tenant.tenant_name}</Text>
                    <Text className="text-sm text-muted-foreground mt-1">Schema: {tenant.schema_name}</Text>
                  </View>
                  <View className={`px-3 py-1 rounded ${getStatusStyle(tenant.status)}`}>
                    <Text className="text-xs font-medium">{getStatusText(tenant.status)}</Text>
                  </View>
                </View>

                <View className="mb-3">
                  <Text className="text-xs text-muted-foreground">URL: {tenant.supabase_url}</Text>
                </View>

                <View className="flex flex-row gap-2 flex-wrap">
                  <Button
                    className="bg-primary text-white px-4 py-2 rounded break-keep text-sm"
                    size="mini"
                    onClick={() => handleEdit(tenant)}>
                    编辑
                  </Button>

                  {tenant.status === 'active' && (
                    <Button
                      className="bg-yellow-500 text-white px-4 py-2 rounded break-keep text-sm"
                      size="mini"
                      onClick={() => handleSuspend(tenant.id)}>
                      暂停
                    </Button>
                  )}

                  {tenant.status === 'suspended' && (
                    <Button
                      className="bg-green-500 text-white px-4 py-2 rounded break-keep text-sm"
                      size="mini"
                      onClick={() => handleActivate(tenant.id)}>
                      激活
                    </Button>
                  )}

                  {tenant.status !== 'deleted' && (
                    <Button
                      className="bg-red-500 text-white px-4 py-2 rounded break-keep text-sm"
                      size="mini"
                      onClick={() => handleDelete(tenant.id)}>
                      删除
                    </Button>
                  )}
                </View>
              </View>
            ))}

            {tenants.length === 0 && !isLoading && (
              <View className="text-center py-12">
                <Text className="text-muted-foreground">暂无租户配置</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default TenantConfigManagement
