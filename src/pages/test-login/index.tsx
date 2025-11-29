import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'

interface TestAccount {
  id: string
  name: string | null
  phone: string
  email: string
  role: string
  role_name: string
}

export default function TestLogin() {
  const [accounts, setAccounts] = useState<TestAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const getRoleName = useCallback((role: string): string => {
    const roleMap: Record<string, string> = {
      super_admin: '老板',
      manager: '车队长',
      peer_admin: '平级账号',

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
      // 单用户架构：从 users 和 user_roles 表查询
      const [{data: users, error: usersError}, {data: roles}] = await Promise.all([
        supabase.from('users').select('id, name, phone, email').order('created_at', {ascending: true}).limit(20),
        supabase.from('user_roles').select('user_id, role')
      ])

      if (usersError) {
        console.error('获取账号列表失败', usersError)
        Taro.showToast({title: '获取账号列表失败', icon: 'none'})
        return
      }

      // 合并用户和角色数据
      const data = users?.map((user) => ({
        ...user,
        role: roles?.find((r) => r.user_id === user.id)?.role || 'DRIVER'
      }))

      const accountsWithRoleName = (data || []).map((account) => ({
        ...account,
        role_name: getRoleName(account.role)
      }))

      setAccounts(accountsWithRoleName)
    } catch (error) {
      console.error('获取账号列表异常', error)
    }
  }, [getRoleName])

  useEffect(() => {
    loadAccounts()
    loadCurrentUser()
  }, [loadAccounts, loadCurrentUser])

  const getRoleColor = (role: string): string => {
    const colorMap: Record<string, string> = {
      super_admin: 'bg-red-500',
      manager: 'bg-blue-500',
      peer_admin: 'bg-purple-500',

      driver: 'bg-gray-500'
    }
    return colorMap[role] || 'bg-gray-500'
  }

  const handleQuickLogin = async (account: TestAccount) => {
    if (loading) return

    setLoading(true)

    try {
      // 使用手机号登录（默认密码：123456）
      const {data, error} = await supabase.auth.signInWithPassword({
        phone: account.phone,
        password: '123456'
      })

      if (error) {
        console.error('登录失败', error)
        Taro.showToast({
          title: `登录失败：${error.message}`,
          icon: 'none',
          duration: 3000
        })
        setLoading(false)
        return
      }

      if (data.user) {
        // 设置登录来源页面为旧的测试登录页面
        Taro.setStorageSync('loginSourcePage', '/pages/test-login/index')

        Taro.showToast({
          title: `登录成功：${account.role_name}`,
          icon: 'success'
        })

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          // 根据角色跳转到对应的首页
          if (account.role === 'DRIVER') {
            Taro.switchTab({url: '/pages/driver/index'})
          } else if (account.role === 'MANAGER') {
            Taro.switchTab({url: '/pages/manager/index'})
          } else if (account.role === 'BOSS') {
            Taro.switchTab({url: '/pages/super-admin/index'})
          } else {
            Taro.switchTab({url: '/pages/driver/index'})
          }
          setLoading(false)
        }, 1000)
      }
    } catch (error) {
      console.error('登录异常', error)
      Taro.showToast({title: '登录异常', icon: 'none'})
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

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题 */}
          <View className="mb-6">
            <Text className="text-3xl max-sm:text-2xl font-bold text-primary">测试账号快速登录</Text>
            <Text className="text-sm text-muted-foreground mt-2">点击账号卡片即可快速登录（默认密码：123456）</Text>
          </View>

          {/* 当前登录状态 */}
          {currentUserId && (
            <View className="mb-4 p-4 bg-card rounded-lg border border-border">
              <View className="flex flex-row items-center justify-between">
                <View>
                  <Text className="text-sm text-muted-foreground">当前登录账号</Text>
                  <Text className="text-base font-medium text-foreground mt-1">
                    {accounts.find((a) => a.id === currentUserId)?.name || '未知用户'}
                  </Text>
                </View>
                <Button
                  className="bg-destructive text-destructive-foreground px-4 py-2 rounded break-keep text-sm"
                  size="mini"
                  onClick={handleLogout}>
                  退出登录
                </Button>
              </View>
            </View>
          )}

          {/* 账号列表 */}
          <View className="space-y-3">
            {accounts.map((account) => (
              <View
                key={account.id}
                className="bg-card rounded-lg border border-border p-4 active:opacity-70 transition-all"
                onClick={() => handleQuickLogin(account)}>
                <View className="flex flex-row items-center justify-between mb-3">
                  <View className="flex flex-row items-center gap-2">
                    <View className={`${getRoleColor(account.role)} px-3 py-1 rounded-full`}>
                      <Text className="text-xs text-white font-medium">{account.role_name}</Text>
                    </View>
                    {account.id === currentUserId && (
                      <View className="bg-green-500 px-2 py-1 rounded-full">
                        <Text className="text-xs text-white">当前</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="space-y-2">
                  <View>
                    <Text className="text-base font-medium text-foreground">{account.name || '未设置姓名'}</Text>
                  </View>
                  <View>
                    <Text className="text-sm text-muted-foreground">手机号：{account.phone}</Text>
                  </View>
                  {account.email && (
                    <View>
                      <Text className="text-sm text-muted-foreground">邮箱：{account.email}</Text>
                    </View>
                  )}
                </View>

                <View className="mt-3 pt-3 border-t border-border">
                  <Text className="text-xs text-muted-foreground">点击登录 • 默认密码：123456</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 说明 */}
          <View className="mt-6 p-4 bg-muted rounded-lg">
            <Text className="text-sm text-muted-foreground font-medium mb-2">使用说明：</Text>
            <View>
              <Text className="text-sm text-muted-foreground">1. 点击任意账号卡片即可快速登录</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">2. 所有测试账号的默认密码都是：123456</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">3. 登录成功后会自动跳转到对应角色的首页</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">4. 如需退出登录，点击顶部的"退出登录"按钮</Text>
            </View>
          </View>

          {/* 刷新按钮 */}
          <View className="mt-4">
            <Button
              className="w-full bg-primary text-primary-foreground py-4 rounded break-keep text-base"
              size="default"
              onClick={loadAccounts}>
              刷新账号列表
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
