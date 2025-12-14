import {Button, Checkbox, Input, Text, View} from '@tarojs/components'
import Taro, {getStorageSync, reLaunch, setStorageSync, showToast, switchTab} from '@tarojs/taro'
import type React from 'react'
import {useEffect, useState} from 'react'
import TopNavBar from '@/components/TopNavBar'

// 检测当前运行环境
const isH5 = process.env.TARO_ENV === 'h5'

// 背景图片列表 - 使用静态资源路径
const BG_IMAGES = ['/assets/images/login-bg-1.jpg', '/assets/images/login-bg-2.jpg', '/assets/images/login-bg-3.jpg']

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

// 获取和设置背景图索引
const getBgIndex = (): number => {
  if (isH5) {
    const index = localStorage.getItem('login_bg_index')
    return index ? parseInt(index, 10) : 0
  } else {
    return getStorageSync('login_bg_index') || 0
  }
}

const setBgIndex = (index: number) => {
  if (isH5) {
    localStorage.setItem('login_bg_index', index.toString())
  } else {
    setStorageSync('login_bg_index', index)
  }
}

// 获取随机背景图索引（不重复上一次）
const getRandomBgIndex = (lastIndex: number): number => {
  const availableIndexes = BG_IMAGES.map((_, i) => i).filter((i) => i !== lastIndex)
  return availableIndexes[Math.floor(Math.random() * availableIndexes.length)]
}

// 清除旧的认证token（异步非阻塞）
const clearOldAuthTokens = () => {
  setTimeout(async () => {
    try {
      const appId = process.env.TARO_APP_APP_ID
      removeStorageAsyncCompat(`${appId}-auth-token`)
      removeStorageAsyncCompat(`${appId}-auth-token-code-verifier`)
      const {supabase} = await import('@/client/supabase')
      supabase.auth.signOut()
    } catch (_err) {}
  }, 100)
}

const Login: React.FC = () => {
  const [loginType, setLoginType] = useState<'otp' | 'password'>('password')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [bgIndex, setBgIndexState] = useState(0)

  useEffect(() => {
    try {
      const savedAccount = getStorageSync('saved_account')
      const savedPassword = getStorageSync('saved_password')
      const savedRemember = getStorageSync('remember_me')

      if (savedAccount) {
        setAccount(savedAccount)
        setPassword(savedPassword || '')
      }
      if (savedRemember !== undefined && savedRemember !== '') {
        setRememberMe(savedRemember)
      }

      // 获取上次的背景图索引
      const lastIndex = getBgIndex()

      // 随机选择一张不同的背景图
      const newIndex = getRandomBgIndex(lastIndex)
      setBgIndexState(newIndex)

      // 保存新的索引
      setBgIndex(newIndex)
    } catch (error) {
      console.error('读取保存的账号密码失败', error)
    }
    clearOldAuthTokens()
  }, [])

  const handleLoginSuccess = async () => {
    removeStorageCompat('loginSourcePage')
    removeStorageCompat('isTestLogin')
    try {
      switchTab({url: '/pages/index/index'})
    } catch (_e) {
      reLaunch({url: '/pages/index/index'})
    }
  }

  const validatePhone = (phone: string): boolean => {
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
      const {supabase} = await import('@/client/supabase')
      const {error} = await supabase.auth.signInWithOtp({
        phone: account,
        options: {channel: 'sms'}
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
    if (!validatePhone(account)) {
      showToast({title: '请输入正确的11位手机号', icon: 'none'})
      return
    }
    setLoading(true)
    try {
      const {supabase} = await import('@/client/supabase')
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
      const loginEmail = account.includes('@') ? account : `${account}@test.local`
      const {supabase} = await import('@/client/supabase')
      const result = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password
      })
      const error = result.error
      if (error) {
        console.error('[登录失败]', error)
        if (error.message.includes('Invalid login credentials')) {
          showToast({title: '账号或密码错误', icon: 'none', duration: 2000})
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
        } catch (err) {
          console.error('保存账号密码失败:', err)
        }
        showToast({title: '登录成功', icon: 'success'})
        await handleLoginSuccess()
      }
    } catch (err) {
      console.error('[登录异常]', err)
      showToast({title: '登录失败，请稍后重试', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <View
      className="min-h-screen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${BG_IMAGES[bgIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
      <TopNavBar backgroundColor="transparent" />
      {/* 上移容器 - 从顶部15%开始 */}
      <View className="flex flex-col items-center px-6" style={{paddingTop: '15vh'}}>
        {/* 页面标题 */}
        <View className="pb-4 text-center w-full">
          <Text className="text-3xl font-bold text-white block mb-2" style={{textShadow: '0 2px 4px rgba(0,0,0,0.3)'}}>
            车队管家
          </Text>
          <Text className="text-sm text-white block" style={{textShadow: '0 1px 2px rgba(0,0,0,0.3)'}}>
            专业的车队管理系统
          </Text>
        </View>

        {/* 登录表单卡片 - 50% 透明度，无毛玻璃 */}
        <View
          className="rounded-2xl p-6 shadow-lg w-full"
          style={{
            maxWidth: '400px',
            backgroundColor: 'rgba(255, 255, 255, 0.5)'
          }}>
          {/* 账号输入 - 45% 透明度 */}
          <View className="mb-4">
            <View
              className="flex items-center rounded-xl px-4 border-2 border-transparent"
              style={{backgroundColor: 'rgba(255, 255, 255, 0.45)'}}>
              <View className="i-mdi-account text-2xl text-primary mr-3" />
              <Input
                className="flex-1 py-4 text-base"
                type={loginType === 'otp' ? 'number' : 'text'}
                maxlength={loginType === 'otp' ? 11 : 50}
                placeholder={loginType === 'otp' ? '请输入手机号' : '请输入账号'}
                value={account}
                onInput={(e) => setAccount(e.detail.value)}
                style={{fontSize: '16px'}}
              />
              {account && (
                <View className="i-mdi-close-circle text-xl text-gray-400 ml-2" onClick={() => setAccount('')} />
              )}
            </View>
          </View>

          {/* 密码登录 */}
          {loginType === 'password' && (
            <>
              <View className="mb-4">
                <View
                  className="flex items-center rounded-xl px-4 border-2 border-transparent"
                  style={{backgroundColor: 'rgba(255, 255, 255, 0.45)'}}>
                  <View className="i-mdi-lock text-2xl text-primary mr-3" />
                  <Input
                    className="flex-1 py-4 text-base"
                    type="text"
                    password={!showPassword}
                    placeholder="请输入密码"
                    value={password}
                    onInput={(e) => setPassword(e.detail.value)}
                    style={{fontSize: '16px'}}
                  />
                  <View
                    className={`text-xl text-gray-400 ml-2 ${showPassword ? 'i-mdi-eye' : 'i-mdi-eye-off'}`}
                    onClick={() => setShowPassword(!showPassword)}
                  />
                  {password && (
                    <View className="i-mdi-close-circle text-xl text-gray-400 ml-2" onClick={() => setPassword('')} />
                  )}
                </View>
              </View>

              <View className="mb-6 flex items-center px-1">
                <Checkbox
                  value="remember"
                  checked={rememberMe}
                  onClick={() => setRememberMe(!rememberMe)}
                  color="#1E3A8A"
                  className="mr-2"
                />
                <Text className="text-sm text-gray-700" onClick={() => setRememberMe(!rememberMe)}>
                  记住账号密码
                </Text>
              </View>
            </>
          )}

          {/* 验证码登录 */}
          {loginType === 'otp' && (
            <>
              <View className="mb-4">
                <View
                  className="flex items-center rounded-xl px-4 border-2 border-transparent"
                  style={{backgroundColor: 'rgba(255, 255, 255, 0.45)'}}>
                  <View className="i-mdi-message-text text-2xl text-primary mr-3" />
                  <Input
                    className="flex-1 py-4 text-base"
                    type="number"
                    maxlength={6}
                    placeholder="请输入6位验证码"
                    value={otp}
                    onInput={(e) => setOtp(e.detail.value)}
                    style={{fontSize: '16px'}}
                  />
                  {otp && <View className="i-mdi-close-circle text-xl text-gray-400 ml-2" onClick={() => setOtp('')} />}
                </View>
              </View>
              <Button
                className="w-full text-base break-keep font-medium mb-6"
                size="default"
                disabled={countdown > 0 || loading}
                style={{
                  backgroundColor: countdown > 0 || loading ? 'rgba(229, 231, 235, 0.8)' : 'rgba(249, 115, 22, 0.9)',
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

          {/* 登录按钮 - 半透明 */}
          <View className="flex gap-3">
            <Button
              className="flex-1 text-base break-keep font-bold"
              size="default"
              disabled={loading}
              style={{
                backgroundColor:
                  loginType === 'password'
                    ? loading
                      ? 'rgba(147, 197, 253, 0.8)'
                      : 'rgba(30, 58, 138, 0.9)'
                    : 'rgba(243, 244, 246, 0.8)',
                color: loginType === 'password' ? 'white' : '#1E3A8A',
                borderRadius: '12px',
                border: loginType === 'password' ? 'none' : '2px solid rgba(229, 231, 235, 0.5)',
                padding: '14px 0'
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
                backgroundColor:
                  loginType === 'otp'
                    ? loading
                      ? 'rgba(147, 197, 253, 0.8)'
                      : 'rgba(30, 58, 138, 0.9)'
                    : 'rgba(243, 244, 246, 0.8)',
                color: loginType === 'otp' ? 'white' : '#1E3A8A',
                borderRadius: '12px',
                border: loginType === 'otp' ? 'none' : '2px solid rgba(229, 231, 235, 0.5)',
                padding: '14px 0'
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
      </View>
    </View>
  )
}

export default Login
