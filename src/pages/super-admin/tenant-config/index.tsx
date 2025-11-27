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
import Taro from '@tarojs/taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import type {TenantConfig} from '@/client/tenantSupabaseManager'
import {
  activateTenant,
  type CreateTenantConfigInput,
  createTenantConfig,
  deleteTenantConfig,
  getAllTenantConfigs,
  suspendTenant,
  type UpdateTenantConfigInput,
  updateTenantConfig
} from '@/db/tenantConfigApi'

const TenantConfigManagement: React.FC = () => {
  const [tenants, setTenants] = useState<TenantConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTenant, setEditingTenant] = useState<TenantConfig | null>(null)

  // 表单状态
  const [formData, setFormData] = useState<CreateTenantConfigInput>({
    tenant_name: '',
    schema_name: '',
    supabase_url: '',
    supabase_anon_key: ''
  })

  /**
   * 加载租户列表
   */
  const loadTenants = useCallback(async () => {
    try {
      setIsLoading(true)
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

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  /**
   * 创建租户
   */
  const handleCreate = async () => {
    if (!formData.tenant_name || !formData.schema_name) {
      Taro.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    try {
      await createTenantConfig(formData)
      Taro.showToast({
        title: '创建成功',
        icon: 'success'
      })
      setShowCreateForm(false)
      setFormData({
        tenant_name: '',
        schema_name: '',
        supabase_url: '',
        supabase_anon_key: ''
      })
      loadTenants()
    } catch (error) {
      console.error('创建租户失败:', error)
      Taro.showToast({
        title: '创建失败',
        icon: 'none'
      })
    }
  }

  /**
   * 更新租户
   */
  const handleUpdate = async () => {
    if (!editingTenant) {
      return
    }

    try {
      const updateData: UpdateTenantConfigInput = {
        tenant_name: formData.tenant_name,
        supabase_url: formData.supabase_url,
        supabase_anon_key: formData.supabase_anon_key
      }

      await updateTenantConfig(editingTenant.id, updateData)
      Taro.showToast({
        title: '更新成功',
        icon: 'success'
      })
      setEditingTenant(null)
      setFormData({
        tenant_name: '',
        schema_name: '',
        supabase_url: '',
        supabase_anon_key: ''
      })
      loadTenants()
    } catch (error) {
      console.error('更新租户失败:', error)
      Taro.showToast({
        title: '更新失败',
        icon: 'none'
      })
    }
  }

  /**
   * 暂停租户
   */
  const handleSuspend = async (tenantId: string) => {
    try {
      await Taro.showModal({
        title: '确认暂停',
        content: '确定要暂停该租户吗？'
      })

      await suspendTenant(tenantId)
      Taro.showToast({
        title: '已暂停',
        icon: 'success'
      })
      loadTenants()
    } catch (error) {
      if (error !== 'cancel') {
        console.error('暂停租户失败:', error)
        Taro.showToast({
          title: '操作失败',
          icon: 'none'
        })
      }
    }
  }

  /**
   * 激活租户
   */
  const handleActivate = async (tenantId: string) => {
    try {
      await activateTenant(tenantId)
      Taro.showToast({
        title: '已激活',
        icon: 'success'
      })
      loadTenants()
    } catch (error) {
      console.error('激活租户失败:', error)
      Taro.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  }

  /**
   * 删除租户
   */
  const handleDelete = async (tenantId: string) => {
    try {
      await Taro.showModal({
        title: '确认删除',
        content: '确定要删除该租户吗？此操作不可恢复！'
      })

      await deleteTenantConfig(tenantId)
      Taro.showToast({
        title: '已删除',
        icon: 'success'
      })
      loadTenants()
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除租户失败:', error)
        Taro.showToast({
          title: '操作失败',
          icon: 'none'
        })
      }
    }
  }

  /**
   * 开始编辑
   */
  const startEdit = (tenant: TenantConfig) => {
    setEditingTenant(tenant)
    setFormData({
      tenant_name: tenant.tenant_name,
      schema_name: tenant.schema_name,
      supabase_url: tenant.supabase_url,
      supabase_anon_key: tenant.supabase_anon_key
    })
  }

  /**
   * 取消编辑
   */
  const cancelEdit = () => {
    setEditingTenant(null)
    setShowCreateForm(false)
    setFormData({
      tenant_name: '',
      schema_name: '',
      supabase_url: '',
      supabase_anon_key: ''
    })
  }

  /**
   * 获取状态标签
   */
  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: {text: '活跃', color: 'text-green-600 bg-green-100'},
      suspended: {text: '暂停', color: 'text-yellow-600 bg-yellow-100'},
      deleted: {text: '已删除', color: 'text-red-600 bg-red-100'}
    }
    const config = statusMap[status] || statusMap.active
    return (
      <View className={`px-2 py-1 rounded text-xs ${config.color}`}>
        <Text>{config.text}</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-background">
      {/* 头部 */}
      <View className="bg-primary text-white p-4">
        <Text className="text-xl font-bold">租户配置管理</Text>
        <Text className="text-sm opacity-90 mt-1">管理所有租户的数据库配置</Text>
      </View>

      <ScrollView scrollY className="h-screen box-border" style={{paddingBottom: '100px'}}>
        <View className="p-4">
          {/* 创建按钮 */}
          {!showCreateForm && !editingTenant && (
            <Button
              className="w-full bg-primary text-white py-3 rounded mb-4 break-keep text-base"
              size="default"
              onClick={() => setShowCreateForm(true)}>
              创建新租户
            </Button>
          )}

          {/* 创建/编辑表单 */}
          {(showCreateForm || editingTenant) && (
            <View className="bg-card rounded-lg p-4 mb-4 shadow">
              <Text className="text-lg font-bold mb-4">{editingTenant ? '编辑租户' : '创建新租户'}</Text>

              <View className="mb-3">
                <Text className="text-sm text-muted-foreground mb-1">租户名称</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    value={formData.tenant_name}
                    onInput={(e) => setFormData({...formData, tenant_name: e.detail.value})}
                    placeholder="请输入租户名称"
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-sm text-muted-foreground mb-1">Schema 名称</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    value={formData.schema_name}
                    onInput={(e) => setFormData({...formData, schema_name: e.detail.value})}
                    placeholder="请输入 Schema 名称"
                    disabled={!!editingTenant}
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-sm text-muted-foreground mb-1">Supabase URL</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    value={formData.supabase_url}
                    onInput={(e) => setFormData({...formData, supabase_url: e.detail.value})}
                    placeholder="请输入 Supabase URL"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm text-muted-foreground mb-1">Supabase Anon Key</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                    value={formData.supabase_anon_key}
                    onInput={(e) => setFormData({...formData, supabase_anon_key: e.detail.value})}
                    placeholder="请输入 Supabase Anon Key"
                  />
                </View>
              </View>

              <View className="flex gap-2">
                <Button
                  className="flex-1 bg-primary text-white py-3 rounded break-keep text-base"
                  size="default"
                  onClick={editingTenant ? handleUpdate : handleCreate}>
                  {editingTenant ? '保存' : '创建'}
                </Button>
                <Button
                  className="flex-1 bg-muted text-foreground py-3 rounded break-keep text-base"
                  size="default"
                  onClick={cancelEdit}>
                  取消
                </Button>
              </View>
            </View>
          )}

          {/* 租户列表 */}
          {isLoading ? (
            <View className="text-center py-8">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          ) : tenants.length === 0 ? (
            <View className="text-center py-8">
              <Text className="text-muted-foreground">暂无租户</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {tenants.map((tenant) => (
                <View key={tenant.id} className="bg-card rounded-lg p-4 shadow">
                  <View className="flex justify-between items-start mb-2">
                    <View>
                      <Text className="text-lg font-bold">{tenant.tenant_name}</Text>
                      <Text className="text-sm text-muted-foreground mt-1">Schema: {tenant.schema_name}</Text>
                    </View>
                    {getStatusBadge(tenant.status)}
                  </View>

                  <View className="mt-3 flex gap-2 flex-wrap">
                    <Button
                      className="bg-primary text-white px-4 py-2 rounded text-sm break-keep"
                      size="mini"
                      onClick={() => startEdit(tenant)}>
                      编辑
                    </Button>

                    {tenant.status === 'active' && (
                      <Button
                        className="bg-yellow-500 text-white px-4 py-2 rounded text-sm break-keep"
                        size="mini"
                        onClick={() => handleSuspend(tenant.id)}>
                        暂停
                      </Button>
                    )}

                    {tenant.status === 'suspended' && (
                      <Button
                        className="bg-green-500 text-white px-4 py-2 rounded text-sm break-keep"
                        size="mini"
                        onClick={() => handleActivate(tenant.id)}>
                        激活
                      </Button>
                    )}

                    <Button
                      className="bg-red-500 text-white px-4 py-2 rounded text-sm break-keep"
                      size="mini"
                      onClick={() => handleDelete(tenant.id)}>
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

export default TenantConfigManagement
