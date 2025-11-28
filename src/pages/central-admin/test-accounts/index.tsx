/**
 * 测试账号管理页面
 * 中央管理系统 - 按租户分组显示测试账号，方便测试数据隔离
 */

import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {usePullDownRefresh} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'

interface TestAccount {
  id: string
  name: string | null
  phone: string
  email: string
  role: string
  role_name: string
  tenant_id: string | null
  tenant_name: string | null
}

interface TenantGroup {
  tenant_id: string | null
  tenant_name: string
  accounts: TestAccount[]
}

export default function TestAccountsPage() {
  const [tenantGroups, setTenantGroups] = useState<TenantGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const getRoleName = useCallback((role: string): string => {
    const roleMap: Record<string, string> = {
      super_admin: '老板',
      manager: '车队长',
      peer_admin: '平级账号',
      lease_admin: '租赁管理员',
      driver: '司机'
    }
    return roleMap[role] || role
  }, [])

  const loadCurrentUser = useCallback(async () => {
    const {
      data: {user}
    } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }, [])

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true)

      // 查询所有账号及其关联的租户信息
      const {data: credentials, error: credError} = await supabase
        .from('user_credentials')
        .select(
          `
          id,
          name,
          phone,
          email,
          role,
          tenant_id,
          tenants:tenant_id (
            id,
            company_name
          )
        `
        )
        .order('created_at', {ascending: true})

      if (credError) {
        console.error('获取账号列表失败', credError)
        Taro.showToast({title: '获取账号列表失败', icon: 'none'})
        return
      }

      // 转换数据格式
      const accounts: TestAccount[] = (credentials || []).map((cred: any) => ({
        id: cred.id,
        name: cred.name,
        phone: cred.phone || '',
        email: cred.email || '',
        role: cred.role,
        role_name: getRoleName(cred.role),
        tenant_id: cred.tenant_id,
        tenant_name: cred.tenants?.company_name || null
      }))

      // 按租户分组
      const groupMap = new Map<string, TenantGroup>()

      accounts.forEach((account) => {
        const tenantKey = account.tenant_id || 'no-tenant'
        const tenantName = account.tenant_name || '未分配租户'

        if (!groupMap.has(tenantKey)) {
          groupMap.set(tenantKey, {
            tenant_id: account.tenant_id,
            tenant_name: tenantName,
            accounts: []
          })
        }

        groupMap.get(tenantKey)?.accounts.push(account)
      })

      // 转换为数组并排序（有租户的在前，未分配的在后）
      const groups = Array.from(groupMap.values()).sort((a, b) => {
        if (a.tenant_id === null) return 1
        if (b.tenant_id === null) return -1
        return a.tenant_name.localeCompare(b.tenant_name)
      })

      setTenantGroups(groups)
    } catch (error) {
      console.error('获取账号列表异常', error)
      Taro.showToast({title: '加载失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [getRoleName])

  useEffect(() => {
    loadAccounts()
    loadCurrentUser()
  }, [loadAccounts, loadCurrentUser])

  usePullDownRefresh(() => {
    loadAccounts().finally(() => {
      Taro.stopPullDownRefresh()
    })
  })

  const getRoleColor = (role: string): string => {
    const colorMap: Record<string, string> = {
      super_admin: 'bg-red-500',
      manager: 'bg-blue-500',
      peer_admin: 'bg-purple-500',
      lease_admin: 'bg-green-500',
      driver: 'bg-gray-500'
    }
    return colorMap[role] || 'bg-gray-500'
  }

  const handleQuickLogin = async (account: TestAccount) => {
    if (loading) return

    try {
      setLoading(true)

      // 使用手机号或邮箱登录
      const loginIdentifier = account.phone || account.email
      if (!loginIdentifier) {
        Taro.showToast({title: '账号信息不完整', icon: 'none'})
        return
      }

      // 默认密码为 123456
      const {data, error} = await supabase.auth.signInWithPassword({
        phone: account.phone || undefined,
        email: account.email || undefined,
        password: '123456'
      })

      if (error) {
        console.error('登录失败', error)
        Taro.showToast({title: `登录失败: ${error.message}`, icon: 'none'})
        return
      }

      if (data.user) {
        // 设置测试登录标记
        Taro.setStorageSync('isTestLogin', 'true')

        Taro.showToast({
          title: `登录成功：${account.role_name}`,
          icon: 'success'
        })

        // 根据角色跳转到对应的首页
        setTimeout(() => {
          const rolePageMap: Record<string, string> = {
            super_admin: '/pages/super-admin/index',
            manager: '/pages/manager/index',
            peer_admin: '/pages/super-admin/index',
            lease_admin: '/pages/lease-admin/index',
            driver: '/pages/driver/index'
          }

          const targetPage = rolePageMap[account.role] || '/pages/home/index'
          Taro.reLaunch({url: targetPage})
        }, 1000)
      }
    } catch (error) {
      console.error('登录异常', error)
      Taro.showToast({title: '登录失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setCurrentUserId(null)
      Taro.showToast({title: '已退出登录', icon: 'success'})
    } catch (error) {
      console.error('退出登录失败', error)
    }
  }

  const handleBack = () => {
    Taro.navigateBack()
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-primary">测试账号管理</Text>
            <Text className="text-sm text-muted-foreground mt-1">按租户分组显示，方便测试数据隔离</Text>
          </View>

          {/* 当前登录状态 */}
          {currentUserId && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <View className="flex items-center justify-between">
                <View>
                  <Text className="text-sm font-medium text-yellow-800">当前已登录</Text>
                  <Text className="text-xs text-yellow-600 mt-1">用户ID: {currentUserId.slice(0, 8)}...</Text>
                </View>
                <Button
                  size="mini"
                  className="bg-yellow-500 text-white px-3 py-1 rounded text-xs break-keep"
                  onClick={handleLogout}>
                  退出登录
                </Button>
              </View>
            </View>
          )}

          {/* 操作提示 */}
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <Text className="text-sm text-blue-800">💡 点击账号卡片即可快速登录</Text>
            <Text className="text-xs text-blue-600 mt-1">默认密码：123456</Text>
          </View>

          {/* 加载状态 */}
          {loading && tenantGroups.length === 0 && (
            <View className="text-center py-8">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          )}

          {/* 租户分组列表 */}
          {tenantGroups.map((group) => (
            <View key={group.tenant_id || 'no-tenant'} className="mb-6">
              {/* 租户标题 */}
              <View className="mb-3">
                <View className="flex items-center">
                  <View className="w-1 h-5 bg-primary rounded mr-2" />
                  <Text className="text-lg font-bold text-foreground">{group.tenant_name}</Text>
                  <View className="ml-2 bg-muted px-2 py-0.5 rounded">
                    <Text className="text-xs text-muted-foreground">{group.accounts.length} 个账号</Text>
                  </View>
                </View>
              </View>

              {/* 账号列表 */}
              <View className="space-y-2">
                {group.accounts.map((account) => (
                  <View
                    key={account.id}
                    className="bg-card border border-border rounded-lg p-3 active:bg-muted transition-colors"
                    onClick={() => handleQuickLogin(account)}>
                    <View className="flex items-start justify-between">
                      <View className="flex-1">
                        <View className="flex items-center mb-2">
                          <View className={`${getRoleColor(account.role)} px-2 py-0.5 rounded mr-2`}>
                            <Text className="text-xs text-white font-medium">{account.role_name}</Text>
                          </View>
                          <Text className="text-base font-medium text-foreground">{account.name || '未命名'}</Text>
                        </View>
                        <View className="space-y-1">
                          {account.phone && <Text className="text-sm text-muted-foreground">📱 {account.phone}</Text>}
                          {account.email && <Text className="text-sm text-muted-foreground">📧 {account.email}</Text>}
                        </View>
                      </View>
                      <View className="i-mdi-chevron-right text-2xl text-muted-foreground" />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* 空状态 */}
          {!loading && tenantGroups.length === 0 && (
            <View className="text-center py-12">
              <View className="i-mdi-account-off text-6xl text-muted-foreground mb-4" />
              <Text className="text-muted-foreground">暂无测试账号</Text>
            </View>
          )}

          {/* 返回按钮 */}
          <View className="mt-6">
            <Button
              size="default"
              className="w-full bg-muted text-foreground py-3 rounded break-keep text-base"
              onClick={handleBack}>
              返回
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
