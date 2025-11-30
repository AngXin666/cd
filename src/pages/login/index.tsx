import {Button, Checkbox, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {getStorageSync, reLaunch, setStorageSync, showToast, switchTab} from '@tarojs/taro'
import type React from 'react'
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

const Login: React.FC = () => {
  const [loginType, setLoginType] = useState<'otp' | 'password'>('password')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [rememberMe, setRememberMe] = useState(false)
  const [showTestAccounts, setShowTestAccounts] = useState(false)
  const [_testAccounts, setTestAccounts] = useState<TestAccount[]>([])
  const [testLoading, setTestLoading] = useState(false)

  // 页面加载时读取保存的账号密码
  useEffect(() => {
    try {
      const savedAccount = getStorageSync('saved_account')
      const savedPassword = getStorageSync('saved_password')
      const savedRemember = getStorageSync('remember_me')

      if (savedRemember && savedAccount) {
        setAccount(savedAccount)
        setPassword(savedPassword || '')
        setRememberMe(true)
      }
    } catch (error) {
      console.error('读取保存的账号密码失败:', error)
    }
  }, [])

  const handleLoginSuccess = async () => {
    // 清除登录来源标记（表示用户是通过正常登录进入的）
    Taro.removeStorageSync('loginSourcePage')
    Taro.removeStorageSync('isTestLogin') // 兼容旧标记

    // 登录成功后跳转到工作台首页，由首页根据角色自动跳转
    try {
      switchTab({url: '/pages/index/index'})
    } catch (_e) {
      reLaunch({url: '/pages/index/index'})
    }
  }

  // 获取角色名称
  const getRoleName = useCallback((role: string): string => {
    const roleMap: Record<string, string> = {
      super_admin: '老板',
      manager: '车队长',
      peer_admin: '平级账号',
      driver: '司机'
    }
    return roleMap[role] || role
  }, [])

  // 加载测试账号列表
  const _loadTestAccounts = useCallback(async () => {
    console.log('🔍 开始加载测试账号列表...')

    // 检查当前用户状态
    const {
      data: {session}
    } = await supabase.auth.getSession()
    console.log('📌 当前登录状态:', session ? '已登录' : '未登录（匿名）')

    try {
      // 单用户架构：从 users 和 user_roles 表查询
      const {data: users, error: usersError} = await supabase
        .from('users')
        .select('id, name, phone, email')
        .order('created_at', {ascending: true})
        .limit(20)

      if (usersError) {
        console.error('❌ 获取测试账号列表失败:', usersError)
        console.error('❌ 错误详情:', JSON.stringify(usersError))
        Taro.showToast({
          title: `加载失败: ${usersError.message}`,
          icon: 'none',
          duration: 3000
        })
        return
      }

      // 获取用户角色
      const userIds = users?.map((u) => u.id) || []
      const {data: roles} = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds)

      // 合并用户和角色数据
      const data = users?.map((user) => ({
        ...user,
        role: roles?.find((r) => r.user_id === user.id)?.role || 'DRIVER'
      }))

      console.log('✅ 获取到账号数据:', data?.length || 0, '个')

      const accountsWithRoleName = (data || []).map((account) => ({
        ...account,
        role_name: getRoleName(account.role)
      }))

      setTestAccounts(accountsWithRoleName)
      console.log('✅ 测试账号列表加载完成')
    } catch (error) {
      console.error('❌ 获取测试账号列表异常:', error)
      Taro.showToast({
        title: '加载账号列表异常',
        icon: 'none',
        duration: 2000
      })
    }
  }, [getRoleName])

  // 测试账号快速登录
  const _handleTestLogin = async (testAccount: TestAccount) => {
    if (testLoading) return

    setTestLoading(true)

    try {
      // 使用手机号登录（默认密码：123456）
      const {data, error} = await supabase.auth.signInWithPassword({
        phone: testAccount.phone,
        password: '123456'
      })

      if (error) {
        console.error('登录失败', error)
        Taro.showToast({
          title: `登录失败：${error.message}`,
          icon: 'none',
          duration: 3000
        })
        setTestLoading(false)
        return
      }

      if (data.user) {
        // 设置登录来源页面为测试登录
        Taro.setStorageSync('loginSourcePage', '/pages/login/index')

        Taro.showToast({
          title: `登录成功：${testAccount.role_name}`,
          icon: 'success'
        })

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          // 根据角色跳转到对应的首页
          if (testAccount.role === 'DRIVER') {
            Taro.switchTab({url: '/pages/driver/index'})
          } else if (testAccount.role === 'MANAGER') {
            Taro.switchTab({url: '/pages/manager/index'})
          } else if (testAccount.role === 'BOSS') {
            Taro.switchTab({url: '/pages/super-admin/index'})
          } else {
            Taro.switchTab({url: '/pages/driver/index'})
          }
          setTestLoading(false)
        }, 1000)
      }
    } catch (error) {
      console.error('登录异常', error)
      Taro.showToast({title: '登录异常', icon: 'none'})
      setTestLoading(false)
    }
  }

  // 获取角色颜色
  const _getRoleColor = (role: string): string => {
    const colorMap: Record<string, string> = {
      super_admin: '#EF4444',
      manager: '#3B82F6',
      peer_admin: '#A855F7',
      driver: '#6B7280'
    }
    return colorMap[role] || '#6B7280'
  }

  // 验证手机号格式
  const validatePhone = (phone: string): boolean => {
    return /^1[3-9]\d{9}$/.test(phone)
  }

  const handleSendOtp = async () => {
    if (!account) {
      showToast({title: '请输入手机号', icon: 'none'})
      return
    }

    // 验证手机号格式
    if (!validatePhone(account)) {
      showToast({title: '请输入正确的11位手机号', icon: 'none'})
      return
    }

    if (countdown > 0) return

    setLoading(true)
    try {
      const {error} = await supabase.auth.signInWithOtp({
        phone: account,
        options: {
          channel: 'sms'
        }
      })

      if (error) {
        showToast({title: error.message || '发送验证码失败', icon: 'none'})
      } else {
        showToast({title: '验证码已发送', icon: 'success'})
        setCountdown(60)
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch (_err) {
      showToast({title: '发送验证码失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handleOtpLogin = async () => {
    if (!account || !otp) {
      showToast({title: '请输入手机号和验证码', icon: 'none'})
      return
    }

    // 验证手机号格式
    if (!validatePhone(account)) {
      showToast({title: '请输入正确的11位手机号', icon: 'none'})
      return
    }

    setLoading(true)
    try {
      const {error} = await supabase.auth.verifyOtp({
        phone: account,
        token: otp,
        type: 'sms'
      })

      if (error) {
        showToast({title: error.message || '登录失败，请检查验证码', icon: 'none'})
      } else {
        showToast({title: '登录成功', icon: 'success'})
        await handleLoginSuccess()
      }
    } catch (_err) {
      showToast({title: '登录失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async () => {
    if (!account || !password) {
      showToast({title: '请输入账号和密码', icon: 'none'})
      return
    }

    setLoading(true)
    try {
      // 账号名到手机号的映射（单用户系统测试账号）
      const accountMapping: Record<string, string> = {
        admin: '13800000000', // 老板
        admin1: '13800000001', // 车队长
        admin2: '13800000002', // 司机
        admin3: '13800000003' // 平级账号
      }

      // 判断输入的是手机号还是账号名
      const isPhoneNumber = validatePhone(account)

      // 如果是账号名，转换为对应的手机号或邮箱
      let actualAccount = account
      if (!isPhoneNumber && accountMapping[account.toLowerCase()]) {
        actualAccount = accountMapping[account.toLowerCase()]
      }

      // 判断最终账号是手机号还是邮箱
      const isFinalPhone = validatePhone(actualAccount)

      let error
      if (isFinalPhone) {
        // 使用手机号登录
        const result = await supabase.auth.signInWithPassword({
          phone: actualAccount,
          password
        })
        error = result.error
      } else {
        // 使用邮箱登录
        // 如果输入的不是完整邮箱，添加 @fleet.local 后缀
        const email = actualAccount.includes('@') ? actualAccount : `${actualAccount}@fleet.local`
        const result = await supabase.auth.signInWithPassword({
          email,
          password
        })
        error = result.error
      }

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showToast({title: '账号或密码错误', icon: 'none', duration: 2000})
        } else {
          showToast({title: error.message || '登录失败', icon: 'none', duration: 2000})
        }
      } else {
        // 登录成功，保存账号密码（如果勾选了记住密码）
        try {
          if (rememberMe) {
            setStorageSync('saved_account', account)
            setStorageSync('saved_password', password)
            setStorageSync('remember_me', true)
          } else {
            // 如果没有勾选，清除保存的信息
            Taro.removeStorageSync('saved_account')
            Taro.removeStorageSync('saved_password')
            Taro.removeStorageSync('remember_me')
          }
        } catch (error) {
          console.error('保存账号密码失败:', error)
        }

        showToast({title: '登录成功', icon: 'success'})
        await handleLoginSuccess()
      }
    } catch (_err) {
      showToast({title: '登录失败，请稍后重试', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #1E3A8A, #3B82F6)'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="pt-16 pb-8 text-center">
          <Text className="text-3xl font-bold text-white block mb-2">车队管家</Text>
          <Text className="text-sm text-blue-100 block">专业的车队管理系统</Text>
        </View>

        <View className="px-6 pb-8">
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            {/* 账号输入 - 优化输入体验 */}
            <View className="mb-4">
              <View className="flex items-center bg-gray-50 rounded-xl px-4 border-2 border-transparent focus-within:border-primary transition-all">
                <View className="i-mdi-account text-2xl text-primary mr-3" />
                <Input
                  className="flex-1 py-4 text-base"
                  type={loginType === 'otp' ? 'number' : 'text'}
                  maxlength={loginType === 'otp' ? 11 : 50}
                  placeholder={loginType === 'otp' ? '请输入11位手机号' : '请输入手机号或账号'}
                  value={account}
                  onInput={(e) => setAccount(e.detail.value)}
                  focus={false}
                  style={{fontSize: '16px'}}
                />
                {account && (
                  <View className="i-mdi-close-circle text-xl text-gray-400 ml-2" onClick={() => setAccount('')} />
                )}
              </View>
              {/* 输入提示 */}
              {loginType === 'password' && (
                <View className="mt-2 px-1">
                  <Text className="text-xs text-gray-500">支持：11位手机号、账号名</Text>
                </View>
              )}
            </View>

            {/* 密码登录 */}
            {loginType === 'password' && (
              <>
                <View className="mb-4">
                  <View className="flex items-center bg-gray-50 rounded-xl px-4 border-2 border-transparent focus-within:border-primary transition-all">
                    <View className="i-mdi-lock text-2xl text-primary mr-3" />
                    <Input
                      className="flex-1 py-4 text-base"
                      type="text"
                      password
                      placeholder="请输入密码"
                      value={password}
                      onInput={(e) => setPassword(e.detail.value)}
                      focus={false}
                      style={{fontSize: '16px'}}
                    />
                    {password && (
                      <View className="i-mdi-close-circle text-xl text-gray-400 ml-2" onClick={() => setPassword('')} />
                    )}
                  </View>
                </View>

                {/* 记住密码选项 */}
                <View className="mb-6 flex items-center px-1">
                  <Checkbox
                    value="remember"
                    checked={rememberMe}
                    onClick={() => setRememberMe(!rememberMe)}
                    color="#1E3A8A"
                    className="mr-2"
                  />
                  <Text className="text-sm text-gray-600" onClick={() => setRememberMe(!rememberMe)}>
                    记住账号密码
                  </Text>
                </View>
              </>
            )}

            {/* 验证码登录 */}
            {loginType === 'otp' && (
              <>
                <View className="mb-4">
                  <View className="flex items-center bg-gray-50 rounded-xl px-4 border-2 border-transparent focus-within:border-primary transition-all">
                    <View className="i-mdi-message-text text-2xl text-primary mr-3" />
                    <Input
                      className="flex-1 py-4 text-base"
                      type="number"
                      maxlength={6}
                      placeholder="请输入6位验证码"
                      value={otp}
                      onInput={(e) => setOtp(e.detail.value)}
                      focus={false}
                      style={{fontSize: '16px'}}
                    />
                    {otp && (
                      <View className="i-mdi-close-circle text-xl text-gray-400 ml-2" onClick={() => setOtp('')} />
                    )}
                  </View>
                </View>
                <Button
                  className="w-full text-base break-keep font-medium mb-6"
                  size="default"
                  disabled={countdown > 0 || loading}
                  style={{
                    backgroundColor: countdown > 0 || loading ? '#E5E7EB' : '#F97316',
                    color: 'white',
                    borderRadius: '12px',
                    border: 'none',
                    padding: '14px 0'
                  }}
                  onClick={handleSendOtp}>
                  {countdown > 0 ? `${countdown}秒后重试` : '发送验证码'}
                </Button>
              </>
            )}

            {/* 登录按钮组 - 将切换按钮改造成登录按钮 */}
            <View className="flex gap-3">
              <Button
                className="flex-1 text-base break-keep font-bold"
                size="default"
                disabled={loading}
                style={{
                  backgroundColor: loginType === 'password' ? (loading ? '#93C5FD' : '#1E3A8A') : '#F3F4F6',
                  color: loginType === 'password' ? 'white' : '#6B7280',
                  borderRadius: '12px',
                  border: loginType === 'password' ? 'none' : '2px solid #E5E7EB',
                  padding: '14px 0',
                  boxShadow: loginType === 'password' ? '0 4px 12px rgba(30, 58, 138, 0.3)' : 'none'
                }}
                onClick={() => {
                  if (loginType === 'password') {
                    handlePasswordLogin()
                  } else {
                    setLoginType('password')
                  }
                }}>
                {loginType === 'password' ? (loading ? '登录中...' : '密码登录') : '密码登录'}
              </Button>

              <Button
                className="flex-1 text-base break-keep font-bold"
                size="default"
                disabled={loading}
                style={{
                  backgroundColor: loginType === 'otp' ? (loading ? '#93C5FD' : '#1E3A8A') : '#F3F4F6',
                  color: loginType === 'otp' ? 'white' : '#6B7280',
                  borderRadius: '12px',
                  border: loginType === 'otp' ? 'none' : '2px solid #E5E7EB',
                  padding: '14px 0',
                  boxShadow: loginType === 'otp' ? '0 4px 12px rgba(30, 58, 138, 0.3)' : 'none'
                }}
                onClick={() => {
                  if (loginType === 'otp') {
                    handleOtpLogin()
                  } else {
                    setLoginType('otp')
                  }
                }}>
                {loginType === 'otp' ? (loading ? '登录中...' : '验证码登录') : '验证码登录'}
              </Button>
            </View>
          </View>

          {/* 测试账号快速登录（开发测试用） */}
          <View className="mt-8">
            <View className="bg-white bg-opacity-10 rounded-lg p-4">
              <View
                className="flex flex-row items-center justify-between"
                onClick={() => {
                  const newShowState = !showTestAccounts
                  setShowTestAccounts(newShowState)
                }}>
                <Text className="text-xs text-white font-bold">🧪 开发测试 - 快速登录</Text>
                <Text className="text-xs text-white">{showTestAccounts ? '▲ 收起' : '▼ 展开'}</Text>
              </View>

              {showTestAccounts && (
                <View className="mt-3">
                  {testLoading ? (
                    <Text className="text-xs text-blue-100 block text-center py-4">登录中...</Text>
                  ) : (
                    <View>
                      {/* 单用户系统测试账号 */}
                      <View className="mb-2">
                        <Text className="text-xs text-white font-bold mb-2">🚗 车队管家测试账号</Text>
                        <View className="space-y-2">
                          {/* admin - 老板 */}
                          <View
                            className="bg-white bg-opacity-20 rounded-lg p-3"
                            onClick={() => {
                              setAccount('admin')
                              setPassword('admin123')
                              setLoginType('password')
                            }}>
                            <View className="flex flex-row items-center justify-between">
                              <View className="flex-1">
                                <View className="flex flex-row items-center mb-1">
                                  <View className="px-2 py-1 rounded" style={{backgroundColor: '#EF4444'}}>
                                    <Text className="text-xs text-white font-bold">老板</Text>
                                  </View>
                                  <Text className="text-xs text-white ml-2">admin</Text>
                                </View>
                                <Text className="text-xs text-blue-100">13800000000 / admin123</Text>
                              </View>
                              <Text className="text-xs text-white">点击填充 →</Text>
                            </View>
                          </View>

                          {/* admin1 - 车队长 */}
                          <View
                            className="bg-white bg-opacity-20 rounded-lg p-3"
                            onClick={() => {
                              setAccount('admin1')
                              setPassword('admin123')
                              setLoginType('password')
                            }}>
                            <View className="flex flex-row items-center justify-between">
                              <View className="flex-1">
                                <View className="flex flex-row items-center mb-1">
                                  <View className="px-2 py-1 rounded" style={{backgroundColor: '#3B82F6'}}>
                                    <Text className="text-xs text-white font-bold">车队长</Text>
                                  </View>
                                  <Text className="text-xs text-white ml-2">admin1</Text>
                                </View>
                                <Text className="text-xs text-blue-100">13800000001 / admin123</Text>
                              </View>
                              <Text className="text-xs text-white">点击填充 →</Text>
                            </View>
                          </View>

                          {/* admin2 - 司机 */}
                          <View
                            className="bg-white bg-opacity-20 rounded-lg p-3"
                            onClick={() => {
                              setAccount('admin2')
                              setPassword('admin123')
                              setLoginType('password')
                            }}>
                            <View className="flex flex-row items-center justify-between">
                              <View className="flex-1">
                                <View className="flex flex-row items-center mb-1">
                                  <View className="px-2 py-1 rounded" style={{backgroundColor: '#6B7280'}}>
                                    <Text className="text-xs text-white font-bold">司机</Text>
                                  </View>
                                  <Text className="text-xs text-white ml-2">admin2</Text>
                                </View>
                                <Text className="text-xs text-blue-100">13800000002 / admin123</Text>
                              </View>
                              <Text className="text-xs text-white">点击填充 →</Text>
                            </View>
                          </View>

                          {/* admin3 - 平级账号 */}
                          <View
                            className="bg-white bg-opacity-20 rounded-lg p-3"
                            onClick={() => {
                              setAccount('admin3')
                              setPassword('admin123')
                              setLoginType('password')
                            }}>
                            <View className="flex flex-row items-center justify-between">
                              <View className="flex-1">
                                <View className="flex flex-row items-center mb-1">
                                  <View className="px-2 py-1 rounded" style={{backgroundColor: '#A855F7'}}>
                                    <Text className="text-xs text-white font-bold">平级账号</Text>
                                  </View>
                                  <Text className="text-xs text-white ml-2">admin3</Text>
                                </View>
                                <Text className="text-xs text-blue-100">13800000003 / admin123</Text>
                              </View>
                              <Text className="text-xs text-white">点击填充 →</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* 使用说明 */}
                      <View className="mt-3 bg-white bg-opacity-10 rounded-lg p-3">
                        <Text className="text-xs text-blue-100 mb-2">💡 使用说明：</Text>
                        <Text className="text-xs text-blue-100">1. 点击账号卡片自动填充账号密码</Text>
                        <Text className="text-xs text-blue-100">2. 点击"密码登录"按钮完成登录</Text>
                        <Text className="text-xs text-blue-100">3. 首次登录需要先注册账号</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* 功能说明 */}
          <View className="mt-4">
            <View className="bg-white bg-opacity-10 rounded-lg p-4">
              <Text className="text-xs text-white block mb-2 font-bold">登录方式说明：</Text>
              <View className="mb-1">
                <Text className="text-xs text-blue-100 block">• 密码登录：支持手机号或账号名 + 密码</Text>
              </View>
              <View className="mb-1">
                <Text className="text-xs text-blue-100 block">• 验证码登录：仅支持手机号 + 验证码</Text>
              </View>
              <View className="mt-2 pt-2 border-t border-white border-opacity-20">
                <Text className="text-xs text-blue-100 block mb-1">测试账号（默认密码：admin123）：</Text>
                <Text className="text-xs text-blue-100 block">• admin - 老板（13800000000）</Text>
                <Text className="text-xs text-blue-100 block">• admin1 - 车队长（13800000001）</Text>
                <Text className="text-xs text-blue-100 block">• admin2 - 司机（13800000002）</Text>
                <Text className="text-xs text-blue-100 block">• admin3 - 平级账号（13800000003）</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default Login
