import {Button, Input, Text, View} from '@tarojs/components'
import {reLaunch, showToast, switchTab} from '@tarojs/taro'
import type React from 'react'
import {useState} from 'react'
import {supabase} from '@/client/supabase'

const Login: React.FC = () => {
  const [loginType, setLoginType] = useState<'otp' | 'password'>('password')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleLoginSuccess = async () => {
    // 登录成功后跳转到工作台首页，由首页根据角色自动跳转
    try {
      switchTab({url: '/pages/index/index'})
    } catch (_e) {
      reLaunch({url: '/pages/index/index'})
    }
  }

  const handleSendOtp = async () => {
    if (!account) {
      showToast({title: '请输入手机号', icon: 'none'})
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

    setLoading(true)
    try {
      const {error} = await supabase.auth.verifyOtp({
        phone: account,
        token: otp,
        type: 'sms'
      })

      if (error) {
        showToast({title: error.message || '登录失败', icon: 'none'})
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
      // 判断输入的是账号名还是手机号
      const isPhoneNumber = /^1[3-9]\d{9}$/.test(account)

      let error

      if (isPhoneNumber) {
        // 如果是手机号格式，使用 phone 登录
        const result = await supabase.auth.signInWithPassword({
          phone: account,
          password
        })
        error = result.error
      } else {
        // 如果是账号名，转换为邮箱格式
        const email = account.includes('@') ? account : `${account}@fleet.com`
        const result = await supabase.auth.signInWithPassword({
          email,
          password
        })
        error = result.error
      }

      if (error) {
        showToast({title: '登录失败，请检查账号密码', icon: 'none'})
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

  return (
    <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #1E3A8A, #3B82F6)'}}>
      <View className="pt-16 pb-8 text-center">
        <Text className="text-3xl font-bold text-white block mb-2">车队管家</Text>
        <Text className="text-sm text-blue-100 block">专业的车队管理系统</Text>
      </View>

      <View className="px-6">
        <View className="bg-white rounded-2xl p-6 shadow-lg">
          {/* 登录方式切换 */}
          <View className="flex mb-6">
            <View
              className={`flex-1 text-center py-3 rounded-lg transition-all ${
                loginType === 'password' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setLoginType('password')}>
              <Text className={`text-sm font-medium ${loginType === 'password' ? 'text-white' : 'text-gray-600'}`}>
                密码登录
              </Text>
            </View>
            <View className="w-2" />
            <View
              className={`flex-1 text-center py-3 rounded-lg transition-all ${
                loginType === 'otp' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setLoginType('otp')}>
              <Text className={`text-sm font-medium ${loginType === 'otp' ? 'text-white' : 'text-gray-600'}`}>
                验证码登录
              </Text>
            </View>
          </View>

          {/* 账号输入 */}
          <View className="mb-4">
            <View className="flex items-center bg-gray-50 rounded-lg px-4 py-3">
              <View className="i-mdi-account text-xl text-gray-400 mr-3" />
              <Input
                className="flex-1 text-sm"
                type="text"
                placeholder="请输入手机号或账号"
                value={account}
                onInput={(e) => setAccount(e.detail.value)}
              />
            </View>
          </View>

          {/* 密码登录 */}
          {loginType === 'password' && (
            <View className="mb-6">
              <View className="flex items-center bg-gray-50 rounded-lg px-4 py-3">
                <View className="i-mdi-lock text-xl text-gray-400 mr-3" />
                <Input
                  className="flex-1 text-sm"
                  type="text"
                  password
                  placeholder="请输入密码"
                  value={password}
                  onInput={(e) => setPassword(e.detail.value)}
                />
              </View>
            </View>
          )}

          {/* 验证码登录 */}
          {loginType === 'otp' && (
            <View className="mb-6">
              <View className="flex items-center bg-gray-50 rounded-lg px-4 py-3 mb-3">
                <View className="i-mdi-message-text text-xl text-gray-400 mr-3" />
                <Input
                  className="flex-1 text-sm"
                  type="text"
                  placeholder="请输入验证码"
                  value={otp}
                  onInput={(e) => setOtp(e.detail.value)}
                />
              </View>
              <Button
                className="w-full text-sm break-keep"
                size="default"
                disabled={countdown > 0 || loading}
                style={{
                  backgroundColor: countdown > 0 || loading ? '#E5E7EB' : '#F97316',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none'
                }}
                onClick={handleSendOtp}>
                {countdown > 0 ? `${countdown}秒后重试` : '发送验证码'}
              </Button>
            </View>
          )}

          {/* 登录按钮 */}
          <Button
            className="w-full text-sm break-keep"
            size="default"
            disabled={loading}
            style={{
              backgroundColor: loading ? '#93C5FD' : '#1E3A8A',
              color: 'white',
              borderRadius: '8px',
              border: 'none'
            }}
            onClick={loginType === 'password' ? handlePasswordLogin : handleOtpLogin}>
            {loading ? '登录中...' : '登录'}
          </Button>
        </View>

        {/* 测试账号提示 */}
        <View className="mt-8">
          <View className="bg-white bg-opacity-10 rounded-lg p-4">
            <Text className="text-xs text-white block mb-2 font-bold">测试账号：</Text>
            <View className="mb-2">
              <Text className="text-xs text-blue-100 block">司机账号：admin1 / 123456</Text>
            </View>
            <View className="mb-2">
              <Text className="text-xs text-blue-100 block">管理员账号：admin2 / 123456</Text>
            </View>
            <View>
              <Text className="text-xs text-blue-100 block">超级管理员：admin / 123456</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default Login
