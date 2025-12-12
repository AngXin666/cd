import {Button, Checkbox, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {getStorageSync, reLaunch, setStorageSync, showToast, switchTab} from '@tarojs/taro'
import type React from 'react'
import {useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'

// 检测当前运行环�?const isH5 = process.env.TARO_ENV === 'h5'

// 存储工具函数，兼容H5和小程序
const removeStorageCompat = (key: string) => {
  if (isH5) {
    localStorage.removeItem(key)
  } else {
    Taro.removeStorageSync(key)
  }
}

const removeStorageAsyncCompat = async (key: string) => {
  if (isH5) {
    localStorage.removeItem(key)
  } else {
    await Taro.removeStorage({key})
  }
}

// 清除旧的认证token
const clearOldAuthTokens = async () => {
  try {
    const appId = process.env.TARO_APP_APP_ID
    await removeStorageAsyncCompat(`${appId}-auth-token`)
    await removeStorageAsyncCompat(`${appId}-auth-token-code-verifier`)
    await supabase.auth.signOut()
  } catch (_err) {}
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

  // 页面加载时清除旧token并读取保存的账号密码
  useEffect(() => {
    // 先清除旧token
    clearOldAuthTokens().then(() => {
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
        console.error('读取保存的账号密码失�?', error)
      }
    })
  }, [])

  const handleLoginSuccess = async () => {
    // 清除登录来源标记
    removeStorageCompat('loginSourcePage')
    removeStorageCompat('isTestLogin')

    // 登录成功后跳转到工作台首�?    try {
      switchTab({url: '/pages/index/index'})
    } catch (_e) {
      reLaunch({url: '/pages/index/index'})
    }
  }

  // 验证手机号格�?  const validatePhone = (phone: string): boolean => {
    return /^1[3-9]\d{9}$/.test(phone)
  }

  const handleSendOtp = async () => {
    if (!account) {
      showToast({title: '请输入手机号', icon: 'none'})
      return
    }

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
        showToast({title: '验证码已发�?, icon: 'success'})
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
      // 直接使用账号@test.local登录，无需查询
      const loginEmail = account.includes('@') ? account : `${account}@test.local`

      const result = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password
      })

      const error = result.error
      const _authData = result.data

      if (error) {
        console.error('�?[登录失败]', error)
        if (error.message.includes('Invalid login credentials')) {
          showToast({title: '账号或密码错�?, icon: 'none', duration: 2000})
        } else {
          showToast({title: error.message || '登录失败', icon: 'none', duration: 2000})
        }
      } else {
        try {
          if (rememberMe) {
            setStorageSync('saved_account', account)
            setStorageSync('saved_password', password)
            setStorageSync('remember_me', true)
          } else {
            removeStorageCompat('saved_account')
            removeStorageCompat('saved_password')
            removeStorageCompat('remember_me')
          }
        } catch (error) {
          console.error('保存账号密码失败:', error)
        }

        showToast({title: '登录成功', icon: 'success'})
        await handleLoginSuccess()
      }
    } catch (err) {
      console.error('�?[登录异常]', err)
      showToast({title: '登录失败，请稍后重试', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #1E3A8A, #3B82F6)'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        {/* 页面标题 */}
        <View className="pt-16 pb-8 text-center">
          <Text className="text-3xl font-bold text-white block mb-2">车队管家</Text>
          <Text className="text-sm text-blue-100 block">专业的车队管理系�?/Text>
        </View>

        <View className="px-6 pb-8">
          {/* 登录表单卡片 */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            {/* 账号输入 */}
            <View className="mb-4">
              <View className="flex items-center bg-gray-50 rounded-xl px-4 border-2 border-transparent">
                <View className="i-mdi-account text-2xl text-primary mr-3" />
                <Input
                  className="flex-1 py-4 text-base"
                  type={loginType === 'otp' ? 'number' : 'text'}
                  maxlength={loginType === 'otp' ? 11 : 50}
                  placeholder={loginType === 'otp' ? '请输�?1位手机号' : '请输入手机号或账�?}
                  value={account}
                  onInput={(e) => setAccount(e.detail.value)}
                  style={{fontSize: '16px'}}
                />
                {account && (
                  <View className="i-mdi-close-circle text-xl text-gray-400 ml-2" onClick={() => setAccount('')} />
                )}
              </View>
              {loginType === 'password' && (
                <View className="mt-2 px-1">
                  <Text className="text-xs text-gray-500">支持�?1位手机号、账号名</Text>
                </View>
              )}
            </View>

            {/* 密码登录 */}
            {loginType === 'password' && (
              <>
                <View className="mb-4">
                  <View className="flex items-center bg-gray-50 rounded-xl px-4 border-2 border-transparent">
                    <View className="i-mdi-lock text-2xl text-primary mr-3" />
                    <Input
                      className="flex-1 py-4 text-base"
                      type="text"
                      password
                      placeholder="请输入密�?
                      value={password}
                      onInput={(e) => setPassword(e.detail.value)}
                      style={{fontSize: '16px'}}
                    />
                    {password && (
                      <View className="i-mdi-close-circle text-xl text-gray-400 ml-2" onClick={() => setPassword('')} />
                    )}
                  </View>
                </View>

                {/* 记住密码 */}
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

            {/* 验证码登�?*/}
            {loginType === 'otp' && (
              <>
                <View className="mb-4">
                  <View className="flex items-center bg-gray-50 rounded-xl px-4 border-2 border-transparent">
                    <View className="i-mdi-message-text text-2xl text-primary mr-3" />
                    <Input
                      className="flex-1 py-4 text-base"
                      type="number"
                      maxlength={6}
                      placeholder="请输�?位验证码"
                      value={otp}
                      onInput={(e) => setOtp(e.detail.value)}
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

            {/* 登录按钮�?*/}
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
                {loginType === 'password' ? (loading ? '登录�?..' : '密码登录') : '密码登录'}
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
                {loginType === 'otp' ? (loading ? '登录�?..' : '验证码登�?) : '验证码登�?}
              </Button>
            </View>
          </View>

          {/* 测试账号快速登�?*/}
          <View className="mt-8">
            <View className="bg-white bg-opacity-10 rounded-lg p-4">
              <View
                className="flex flex-row items-center justify-between"
                onClick={() => setShowTestAccounts(!showTestAccounts)}>
                <Text className="text-xs text-white font-bold">🧪 开发测�?- 快速登�?/Text>
                <Text className="text-xs text-white">{showTestAccounts ? '�?收起' : '�?展开'}</Text>
              </View>

              {showTestAccounts && (
                <View className="mt-3">
                  <View className="mb-2">
                    <Text className="text-xs text-white font-bold mb-2">🚗 车队管家测试账号</Text>
                    <View className="space-y-2">
                      {/* admin1 - 老板账号 */}
                      <View
                        className="bg-white bg-opacity-20 rounded-lg p-3 mb-2"
                        onClick={() => {
                          setAccount('admin1')
                          setPassword('123456')
                          setLoginType('password')
                        }}>
                        <View className="flex flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex flex-row items-center mb-1">
                              <View className="px-2 py-1 rounded" style={{backgroundColor: '#EF4444'}}>
                                <Text className="text-xs text-white font-bold">老板</Text>
                              </View>
                              <Text className="text-xs text-white ml-2">admin1</Text>
                            </View>
                            <Text className="text-xs text-blue-100">老板账号 / 123456</Text>
                          </View>
                          <Text className="text-xs text-white">点击填充 �?/Text>
                        </View>
                      </View>

                      {/* admin11 - 平级账号 */}
                      <View
                        className="bg-white bg-opacity-20 rounded-lg p-3 mb-2"
                        onClick={() => {
                          setAccount('admin11')
                          setPassword('123456')
                          setLoginType('password')
                        }}>
                        <View className="flex flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex flex-row items-center mb-1">
                              <View className="px-2 py-1 rounded" style={{backgroundColor: '#A855F7'}}>
                                <Text className="text-xs text-white font-bold">平级账号</Text>
                              </View>
                              <Text className="text-xs text-white ml-2">admin11</Text>
                            </View>
                            <Text className="text-xs text-blue-100">平级账号 / 123456</Text>
                          </View>
                          <Text className="text-xs text-white">点击填充 �?/Text>
                        </View>
                      </View>

                      {/* admin111 - 车队长账�?*/}
                      <View
                        className="bg-white bg-opacity-20 rounded-lg p-3 mb-2"
                        onClick={() => {
                          setAccount('admin111')
                          setPassword('123456')
                          setLoginType('password')
                        }}>
                        <View className="flex flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex flex-row items-center mb-1">
                              <View className="px-2 py-1 rounded" style={{backgroundColor: '#3B82F6'}}>
                                <Text className="text-xs text-white font-bold">车队�?/Text>
                              </View>
                              <Text className="text-xs text-white ml-2">admin111</Text>
                            </View>
                            <Text className="text-xs text-blue-100">车队长账�?/ 123456</Text>
                          </View>
                          <Text className="text-xs text-white">点击填充 �?/Text>
                        </View>
                      </View>

                      {/* admin1111 - 司机账号 */}
                      <View
                        className="bg-white bg-opacity-20 rounded-lg p-3 mb-2"
                        onClick={() => {
                          setAccount('admin1111')
                          setPassword('123456')
                          setLoginType('password')
                        }}>
                        <View className="flex flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex flex-row items-center mb-1">
                              <View className="px-2 py-1 rounded" style={{backgroundColor: '#6B7280'}}>
                                <Text className="text-xs text-white font-bold">司机</Text>
                              </View>
                              <Text className="text-xs text-white ml-2">admin1111</Text>
                            </View>
                            <Text className="text-xs text-blue-100">司机账号 / 123456</Text>
                          </View>
                          <Text className="text-xs text-white">点击填充 �?/Text>
                        </View>
                      </View>

                      {/* admin1112 - 调度账号 */}
                      <View
                        className="bg-white bg-opacity-20 rounded-lg p-3"
                        onClick={() => {
                          setAccount('admin1112')
                          setPassword('123456')
                          setLoginType('password')
                        }}>
                        <View className="flex flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex flex-row items-center mb-1">
                              <View className="px-2 py-1 rounded" style={{backgroundColor: '#10B981'}}>
                                <Text className="text-xs text-white font-bold">调度</Text>
                              </View>
                              <Text className="text-xs text-white ml-2">admin1112</Text>
                            </View>
                            <Text className="text-xs text-blue-100">调度账号 / 123456</Text>
                          </View>
                          <Text className="text-xs text-white">点击填充 �?/Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 使用说明 */}
                  <View className="mt-3 bg-white bg-opacity-10 rounded-lg p-3">
                    <Text className="text-xs text-blue-100 mb-2">💡 使用说明�?/Text>
                    <Text className="text-xs text-blue-100">1. 点击账号卡片自动填充账号密码</Text>
                    <Text className="text-xs text-blue-100">2. 点击"密码登录"按钮完成登录</Text>
                    <Text className="text-xs text-blue-100">3. 首次登录需要先注册账号</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 功能说明 */}
          <View className="mt-4">
            <View className="bg-white bg-opacity-10 rounded-lg p-4">
              <Text className="text-xs text-white block mb-2 font-bold">登录方式说明�?/Text>
              <View className="mb-1">
                <Text className="text-xs text-blue-100 block">�?密码登录：支持手机号或账号名 + 密码</Text>
              </View>
              <View className="mb-1">
                <Text className="text-xs text-blue-100 block">�?验证码登录：仅支持手机号 + 验证�?/Text>
              </View>
              <View className="mt-2 pt-2 border-t border-white border-opacity-20">
                <Text className="text-xs text-blue-100 block mb-1">测试账号（默认密码：123456）：</Text>
                <Text className="text-xs text-blue-100 block">�?admin1 - 老板账号</Text>
                <Text className="text-xs text-blue-100 block">�?admin11 - 平级账号</Text>
                <Text className="text-xs text-blue-100 block">�?admin111 - 车队长账�?/Text>
                <Text className="text-xs text-blue-100 block">�?admin1111 - 司机账号</Text>
                <Text className="text-xs text-blue-100 block">�?admin1112 - 调度账号</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default Login
