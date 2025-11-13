/**
 * 修改手机号页面
 * 允许用户修改绑定的手机号
 */

import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getCurrentUserProfile, updateProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const ChangePhonePage: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [newPhone, setNewPhone] = useState('')
  const [loading, setLoading] = useState(false)

  // 加载个人资料
  const loadProfile = useCallback(async () => {
    try {
      const data = await getCurrentUserProfile()
      setProfile(data)
    } catch (error) {
      console.error('加载个人资料失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  }, [])

  useDidShow(() => {
    loadProfile()
  })

  // 隐藏手机号中间4位
  const maskPhone = (phone: string | null) => {
    if (!phone) return '未设置'
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }

  // 保存手机号
  const handleSave = async () => {
    if (!user) return

    if (!newPhone.trim()) {
      Taro.showToast({
        title: '请输入新手机号',
        icon: 'none'
      })
      return
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(newPhone)) {
      Taro.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    // 检查是否与当前手机号相同
    if (newPhone === profile?.phone) {
      Taro.showToast({
        title: '新手机号与当前手机号相同',
        icon: 'none'
      })
      return
    }

    setLoading(true)
    Taro.showLoading({title: '保存中...'})
    try {
      await updateProfile(user.id, {phone: newPhone})
      Taro.showToast({
        title: '修改成功',
        icon: 'success',
        duration: 2000
      })
      setTimeout(() => {
        Taro.navigateBack()
      }, 2000)
    } catch (error) {
      console.error('保存失败:', error)
      Taro.showToast({
        title: '保存失败，请重试',
        icon: 'none',
        duration: 2000
      })
    } finally {
      setLoading(false)
      Taro.hideLoading()
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 当前手机号 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-phone text-blue-900 text-xl mr-2" />
              <Text className="text-base font-bold text-gray-800">当前手机号</Text>
            </View>
            <View className="bg-gray-50 rounded-lg p-4">
              <Text className="text-lg text-gray-700 text-center">{maskPhone(profile?.phone)}</Text>
            </View>
          </View>

          {/* 新手机号输入 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-phone-plus text-blue-900 text-xl mr-2" />
              <Text className="text-base font-bold text-gray-800">新手机号</Text>
            </View>
            <View style={{overflow: 'hidden'}}>
              <Input
                type="number"
                maxlength={11}
                placeholder="请输入新手机号"
                value={newPhone}
                onInput={(e) => setNewPhone(e.detail.value)}
                className="bg-gray-50 text-gray-800 px-4 py-3 rounded-lg border border-gray-200 w-full"
              />
            </View>
            <View className="mt-3">
              <Text className="text-xs text-gray-500 block">• 请输入11位手机号码</Text>
              <Text className="text-xs text-gray-500 block mt-1">• 修改后请使用新手机号登录</Text>
            </View>
          </View>

          {/* 温馨提示 */}
          <View className="bg-blue-50 rounded-xl p-4 mb-4">
            <View className="flex items-start">
              <View className="i-mdi-information text-blue-600 text-xl mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-blue-900 block mb-2">温馨提示</Text>
                <Text className="text-xs text-blue-700 block mb-1">• 修改手机号后，请使用新手机号登录</Text>
                <Text className="text-xs text-blue-700 block mb-1">• 请确保新手机号未被其他账户绑定</Text>
                <Text className="text-xs text-blue-700 block">• 如有问题，请联系管理员</Text>
              </View>
            </View>
          </View>

          {/* 保存按钮 */}
          <Button
            className="w-full bg-blue-900 text-white py-4 rounded-xl break-keep text-base font-medium"
            size="default"
            disabled={loading}
            onClick={handleSave}>
            {loading ? '保存中...' : '保存修改'}
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

export default ChangePhonePage
