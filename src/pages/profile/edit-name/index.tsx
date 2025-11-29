import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import {navigateBack, showToast} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import * as NotificationsAPI from '@/db/api/notifications'
import * as UsersAPI from '@/db/api/users'

import type {Profile} from '@/db/types'

const EditNamePage: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  // 加载当前用户信息
  const loadProfile = useCallback(async () => {
    const data = await UsersAPI.getCurrentUserProfile()
    setProfile(data)
    if (data) {
      setName(data.name || '')
      setPhone(data.phone || '')
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // 验证手机号格式
  const validatePhone = (phoneNumber: string) => {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phoneNumber)
  }

  // 提交更新
  const handleSubmit = async () => {
    if (!user || !profile) return

    // 验证姓名
    if (!name.trim()) {
      showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return
    }

    // 验证手机号
    if (!phone.trim()) {
      showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return
    }

    if (!validatePhone(phone)) {
      showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    // 检查是否有实际修改
    const nameChanged = name.trim() !== (profile.name || '')
    const phoneChanged = phone.trim() !== (profile.phone || '')

    if (!nameChanged && !phoneChanged) {
      showToast({
        title: '没有修改任何信息',
        icon: 'none'
      })
      return
    }

    setLoading(true)

    try {
      // 只更新修改过的字段
      const updateData: {name?: string; phone?: string} = {}
      if (nameChanged) {
        updateData.name = name.trim()
      }
      if (phoneChanged) {
        updateData.phone = phone.trim()
      }

      // 更新用户信息
      const success = await UsersAPI.updateUserProfile(user.id, updateData)

      if (success) {
        // 如果是车队长，通知所有老板
        if (profile.role === 'MANAGER') {
          await NotificationsAPI.createNotificationForAllSuperAdmins({
            type: 'system_notice',
            title: '车队长信息更新',
            message: `车队长 ${name.trim()} (${phone.trim()}) 更新了实名信息，请审核确认。`
          })
        }

        showToast({
          title: '保存成功',
          icon: 'success'
        })

        setTimeout(() => {
          navigateBack()
        }, 1500)
      } else {
        showToast({
          title: '保存失败，请重试',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 提示信息 */}
          <View className="bg-blue-50 rounded-lg p-4 mb-4 flex items-start">
            <View className="i-mdi-information text-blue-600 text-xl mr-2 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm text-blue-900 block mb-1 font-medium">温馨提示</Text>
              <Text className="text-xs text-blue-700 block">请填写真实姓名和手机号，以便系统管理和联系。</Text>
              {profile?.role === 'MANAGER' && (
                <Text className="text-xs text-blue-700 block mt-1">修改后将通知老板审核。</Text>
              )}
            </View>
          </View>

          {/* 表单卡片 */}
          <View className="bg-white rounded-xl p-4 shadow">
            {/* 姓名输入 */}
            <View className="mb-4">
              <View className="flex items-center mb-2">
                <View className="i-mdi-account text-blue-900 text-lg mr-2" />
                <Text className="text-gray-800 text-sm font-medium">真实姓名</Text>
                <Text className="text-red-500 text-sm ml-1">*</Text>
              </View>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 text-foreground px-4 py-3 rounded-lg border border-gray-200 w-full text-sm"
                  placeholder="请输入真实姓名"
                  value={name}
                  onInput={(e) => setName(e.detail.value)}
                  maxlength={20}
                />
              </View>
            </View>

            {/* 手机号输入 */}
            <View className="mb-6">
              <View className="flex items-center mb-2">
                <View className="i-mdi-phone text-blue-900 text-lg mr-2" />
                <Text className="text-gray-800 text-sm font-medium">手机号码</Text>
                <Text className="text-red-500 text-sm ml-1">*</Text>
              </View>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-gray-50 text-foreground px-4 py-3 rounded-lg border border-gray-200 w-full text-sm"
                  placeholder="请输入手机号码"
                  value={phone}
                  onInput={(e) => setPhone(e.detail.value)}
                  type="number"
                  maxlength={11}
                />
              </View>
            </View>

            {/* 提交按钮 */}
            <Button
              className="w-full bg-primary text-white py-4 rounded-lg break-keep text-base font-medium"
              size="default"
              onClick={handleSubmit}
              loading={loading}
              disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </View>

          {/* 说明文字 */}
          <View className="mt-4 px-2">
            <Text className="text-xs text-gray-500 block text-center">您的个人信息将被严格保密，仅用于系统管理</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default EditNamePage
