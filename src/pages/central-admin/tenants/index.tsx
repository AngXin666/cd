/**
 * 租户列表页面
 * 中央管理系统 - 租户管理
 */

import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {activateTenant, deleteTenant, getAllTenants, suspendTenant, updateTenantExpiry} from '@/db/central-admin-api'
import type {Tenant} from '@/db/types'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')

  // 加载租户列表
  const loadTenants = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllTenants()
      setTenants(data)
    } catch (error) {
      console.error('加载租户列表失败:', error)
      Taro.showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [])

  // 页面显示时加载数据
  useDidShow(() => {
    loadTenants()
  })

  // 搜索过滤
  const filteredTenants = tenants.filter((tenant) => {
    if (!searchText) return true
    const search = searchText.toLowerCase()
    return (
      tenant.company_name.toLowerCase().includes(search) ||
      tenant.tenant_code.toLowerCase().includes(search) ||
      tenant.boss_name?.toLowerCase().includes(search) ||
      tenant.boss_phone?.toLowerCase().includes(search)
    )
  })

  // 跳转到创建租户页面
  const handleCreate = () => {
    Taro.navigateTo({url: '/pages/central-admin/tenant-create/index'})
  }

  // 编辑租期
  const handleEditExpiry = async (tenant: Tenant) => {
    const currentDate = tenant.expired_at ? tenant.expired_at.split('T')[0] : ''

    Taro.showModal({
      title: '编辑租期',
      editable: true,
      placeholderText: '请输入到期日期（YYYY-MM-DD）',
      content: currentDate,
      success: async (res) => {
        if (res.confirm && res.content) {
          const newExpiry = res.content.trim()

          // 验证日期格式
          if (!/^\d{4}-\d{2}-\d{2}$/.test(newExpiry)) {
            Taro.showToast({title: '日期格式错误', icon: 'error'})
            return
          }

          const success = await updateTenantExpiry(tenant.id, newExpiry)
          if (success) {
            Taro.showToast({title: '租期更新成功', icon: 'success'})
            loadTenants()
          } else {
            Taro.showToast({title: '租期更新失败', icon: 'error'})
          }
        }
      }
    })
  }

  // 停用/启用租户
  const handleToggleStatus = async (tenant: Tenant) => {
    const isActive = tenant.status === 'active'
    const action = isActive ? '停用' : '启用'

    Taro.showModal({
      title: `确认${action}`,
      content: `确定要${action}租户"${tenant.company_name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          const success = isActive ? await suspendTenant(tenant.id) : await activateTenant(tenant.id)

          if (success) {
            Taro.showToast({title: `${action}成功`, icon: 'success'})
            loadTenants()
          } else {
            Taro.showToast({title: `${action}失败`, icon: 'error'})
          }
        }
      }
    })
  }

  // 删除租户
  const handleDelete = async (tenant: Tenant) => {
    Taro.showModal({
      title: '确认删除',
      content: `删除租户"${tenant.company_name}"将删除所有数据，此操作不可恢复！确定要删除吗？`,
      confirmText: '确认删除',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({title: '删除中...'})
          const success = await deleteTenant(tenant.id)
          Taro.hideLoading()

          if (success) {
            Taro.showToast({title: '删除成功', icon: 'success'})
            loadTenants()
          } else {
            Taro.showToast({title: '删除失败', icon: 'error'})
          }
        }
      }
    })
  }

  // 获取租户状态显示
  const getStatusDisplay = (tenant: Tenant) => {
    if (tenant.status === 'suspended') {
      return {text: '已停用', color: 'text-gray-500', icon: '⏸️'}
    }

    if (tenant.expired_at) {
      const expiredDate = new Date(tenant.expired_at)
      const now = new Date()
      const daysLeft = Math.ceil((expiredDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysLeft < 0) {
        return {text: '已过期', color: 'text-red-500', icon: '❌'}
      } else if (daysLeft <= 7) {
        return {text: `即将到期 (${daysLeft}天)`, color: 'text-orange-500', icon: '⚠️'}
      }
    }

    return {text: '正常', color: 'text-green-500', icon: '✅'}
  }

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return dateStr.split('T')[0]
  }

  return (
    <View className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 头部 */}
      <View className="bg-primary text-white p-6 pb-8">
        <View className="flex items-center justify-between">
          <View>
            <Text className="text-2xl font-bold block mb-2">租户管理</Text>
            <Text className="text-sm opacity-90 block">共 {filteredTenants.length} 个租户</Text>
          </View>
          <Button
            className="bg-white text-primary px-6 py-3 rounded-lg font-medium break-keep text-base"
            size="default"
            onClick={handleCreate}>
            + 创建租户
          </Button>
        </View>
      </View>

      {/* 搜索框 */}
      <View className="px-4 -mt-4 mb-4">
        <View className="bg-white rounded-lg shadow-sm p-3" style={{overflow: 'hidden'}}>
          <Input
            className="w-full text-base"
            placeholder="搜索公司名称、租户代码、老板姓名或手机号"
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
        </View>
      </View>

      {/* 租户列表 */}
      <ScrollView scrollY className="flex-1 px-4 pb-6 box-border">
        {loading ? (
          <View className="text-center py-12">
            <Text className="text-gray-400">加载中...</Text>
          </View>
        ) : filteredTenants.length === 0 ? (
          <View className="text-center py-12">
            <Text className="text-gray-400 block mb-2">暂无租户</Text>
            <Text className="text-sm text-gray-300 block">点击右上角"创建租户"按钮添加</Text>
          </View>
        ) : (
          filteredTenants.map((tenant) => {
            const status = getStatusDisplay(tenant)
            return (
              <View key={tenant.id} className="bg-white rounded-lg shadow-sm p-4 mb-4">
                {/* 公司名称和状态 */}
                <View className="flex items-center justify-between mb-3">
                  <Text className="text-lg font-bold text-gray-800">
                    {status.icon} {tenant.company_name}
                  </Text>
                  <Text className={`text-sm font-medium ${status.color}`}>{status.text}</Text>
                </View>

                {/* 租户信息 */}
                <View className="space-y-2 mb-4">
                  <View>
                    <Text className="text-sm text-gray-500 block">租户代码：{tenant.tenant_code}</Text>
                  </View>
                  <View>
                    <Text className="text-sm text-gray-500 block">
                      到期时间：{formatDate(tenant.expired_at)}
                      {tenant.expired_at && (
                        <Text className="text-blue-500 ml-2" onClick={() => handleEditExpiry(tenant)}>
                          [修改]
                        </Text>
                      )}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm text-gray-500 block">
                      老板：{tenant.boss_name || '-'} ({tenant.boss_phone || '-'})
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm text-gray-500 block">创建时间：{formatDate(tenant.created_at)}</Text>
                  </View>
                </View>

                {/* 操作按钮 */}
                <View className="flex gap-2">
                  <Button
                    className="flex-1 bg-blue-500 text-white py-2 rounded break-keep text-sm"
                    size="default"
                    onClick={() => handleEditExpiry(tenant)}>
                    编辑租期
                  </Button>
                  <Button
                    className={`flex-1 py-2 rounded break-keep text-sm ${
                      tenant.status === 'active' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                    }`}
                    size="default"
                    onClick={() => handleToggleStatus(tenant)}>
                    {tenant.status === 'active' ? '停用' : '启用'}
                  </Button>
                  <Button
                    className="flex-1 bg-red-500 text-white py-2 rounded break-keep text-sm"
                    size="default"
                    onClick={() => handleDelete(tenant)}>
                    删除
                  </Button>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}
