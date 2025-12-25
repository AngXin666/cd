/**
 * 管理员个人信息页面
 * 显示管理员（车队长/调度）的基本信息，提供重置密码功能
 * 
 * @module pages/super-admin/admin-profile
 */

import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {hideLoading, showLoading, showToast} from '@/utils/taroCompat'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {supabase} from '@/db/supabase'
import SafeAreaTop from '@/components/SafeAreaTop'
import TopNavBar from '@/components/TopNavBar'
import * as UsersAPI from '@/db/api/users'
import type {Profile} from '@/db/types'

/**
 * 管理员个人信息页面组件
 * 只包含重置密码功能
 */
const AdminProfile: React.FC = () => {
  // 使用 useAuth 进行页面守卫，确保用户已登录
  useAuth({guard: true})
  const router = useRouter()
  // 从路由参数获取用户ID和用户名
  const userId = router.params.userId || ''
  const userName = decodeURIComponent(router.params.userName || '')

  // 用户信息状态
  const [profile, setProfile] = useState<Profile | null>(null)
  const [_loading, setLoading] = useState(false)

  /**
   * 返回上一页
   */
  const goBack = () => {
    Taro.navigateBack()
  }

  /**
   * 加载用户信息
   */
  const loadProfile = useCallback(async () => {
    if (!userId) {
      showToast({title: '缺少用户ID', icon: 'none'})
      return
    }

    setLoading(true)
    showLoading({title: '加载中...'})
    try {
      const profileData = await UsersAPI.getProfileById(userId)
      setProfile(profileData)
    } catch (error) {
      console.error('加载用户信息失败:', error)
      showToast({title: '加载失败', icon: 'none'})
    } finally {
      setLoading(false)
      hideLoading()
    }
  }, [userId])

  // 页面显示时加载数据
  useDidShow(() => {
    loadProfile()
  })

  /**
   * 重置密码
   * 将用户密码重置为默认密码 123456
   */
  const handleResetPassword = useCallback(async () => {
    if (!userId || !profile) return

    const displayName = profile.name || userName || '该用户'
    
    // 二次确认
    const result = await Taro.showModal({
      title: '重置密码',
      content: `确定要将 ${displayName} 的密码重置为 123456 吗？`,
      confirmText: '确定',
      cancelText: '取消'
    })

    if (!result.confirm) return

    showLoading({title: '重置中...'})
    try {
      // 调用数据库函数重置密码
      const {error} = await supabase.rpc('reset_user_password', {
        target_user_id: userId,
        new_password: '123456'
      })

      if (error) {
        console.error('重置密码失败:', error)
        showToast({title: '重置失败', icon: 'error'})
        return
      }

      showToast({title: '密码已重置为 123456', icon: 'success'})
    } catch (error) {
      console.error('重置密码异常:', error)
      showToast({title: '操作失败', icon: 'error'})
    } finally {
      hideLoading()
    }
  }, [userId, profile, userName])

  /**
   * 获取角色显示文本
   */
  const getRoleText = (role: string | undefined): string => {
    switch (role) {
      case 'MANAGER':
        return '车队长'
      case 'PEER_ADMIN':
        return '调度'
      case 'BOSS':
        return '老板'
      case 'DRIVER':
        return '司机'
      default:
        return '未知'
    }
  }

  return (
    <View className="min-h-screen bg-gray-100">
      <SafeAreaTop />
      <TopNavBar />
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        {/* 返回按钮 */}
        <View className="px-4 pt-2 pb-2" onClick={goBack}>
          <View className="flex items-center">
            <View className="i-mdi-arrow-left text-2xl text-blue-900 mr-2" />
            <Text className="text-sm text-blue-900 font-bold">返回</Text>
          </View>
        </View>

        {/* 用户信息卡片 */}
        <View className="p-4">
          <View className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* 头部信息 */}
            <View className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
              <View className="flex items-center">
                {/* 头像 */}
                <View className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mr-4">
                  <View className="i-mdi-account text-white text-4xl" />
                </View>
                {/* 姓名和角色 */}
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold block">
                    {profile?.name || userName || '加载中...'}
                  </Text>
                  <View className="flex items-center mt-1">
                    <View className="bg-white/20 px-2 py-0.5 rounded">
                      <Text className="text-white/90 text-sm">
                        {getRoleText(profile?.role)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* 详细信息 */}
            <View className="p-4 space-y-4">
              {/* 手机号 */}
              <View className="flex items-center py-3 border-b border-gray-100">
                <View className="i-mdi-phone text-gray-400 text-xl mr-3" />
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs block">手机号</Text>
                  <Text className="text-gray-800 text-base">
                    {profile?.phone || '-'}
                  </Text>
                </View>
              </View>

              {/* 登录账号 */}
              <View className="flex items-center py-3 border-b border-gray-100">
                <View className="i-mdi-account-circle text-gray-400 text-xl mr-3" />
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs block">登录账号</Text>
                  <Text className="text-gray-800 text-base">
                    {profile?.phone ? `${profile.phone}@fleet.com` : '-'}
                  </Text>
                </View>
              </View>

              {/* 状态 */}
              <View className="flex items-center py-3">
                <View className="i-mdi-check-circle text-gray-400 text-xl mr-3" />
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs block">账号状态</Text>
                  <View className="flex items-center">
                    <View className={`w-2 h-2 rounded-full mr-2 ${profile?.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <Text className={`text-base ${profile?.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                      {profile?.status === 'active' ? '正常' : '已禁用'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 操作按钮 */}
          <View className="mt-6">
            <View
              onClick={handleResetPassword}
              className="bg-amber-500 rounded-xl py-4 flex items-center justify-center active:bg-amber-600 transition-all shadow-sm">
              <View className="i-mdi-lock-reset text-white text-2xl mr-2" />
              <Text className="text-white text-lg font-medium">重置密码</Text>
            </View>
            <Text className="text-gray-400 text-xs text-center mt-2 block">
              重置后密码将变为 123456
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default AdminProfile
