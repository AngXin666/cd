import {View} from '@tarojs/components'
import {reLaunch, switchTab} from '@tarojs/taro'
import {LoginPanel} from 'miaoda-auth-taro'
import type React from 'react'
import {getCurrentUserProfile} from '@/db/api'

const Login: React.FC = () => {
  const handleLoginSuccess = async () => {
    const profile = await getCurrentUserProfile()

    let path = '/pages/driver/index'
    if (profile?.role === 'super_admin') {
      path = '/pages/super-admin/index'
    } else if (profile?.role === 'manager') {
      path = '/pages/manager/index'
    }

    try {
      switchTab({url: path})
    } catch (_e) {
      reLaunch({url: path})
    }
  }

  return (
    <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #1E3A8A, #3B82F6)'}}>
      <LoginPanel onLoginSuccess={handleLoginSuccess} />
    </View>
  )
}

export default Login
