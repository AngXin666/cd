import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getUserById, resetUserPassword, updateUserInfo} from '@/db/api'
import type {Profile, UserRole} from '@/db/types'

const EditUser: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const userId = router.params.userId || ''

  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('driver')

  // 角色选项
  const roleOptions = [
    {label: '司机', value: 'driver'},
    {label: '管理员', value: 'manager'},
    {label: '超级管理员', value: 'super_admin'}
  ]

  // 加载用户信息
  const loadUserInfo = useCallback(async () => {
    if (!userId) {
      Taro.showToast({title: '用户ID不存在', icon: 'error'})
      return
    }

    setLoading(true)
    try {
      const data = await getUserById(userId)
      if (data) {
        setUserInfo(data)
        setName(data.name || '')
        setPhone(data.phone || '')
        setEmail(data.email || '')
        setRole(data.role)
      } else {
        Taro.showToast({title: '用户不存在', icon: 'error'})
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      Taro.showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [userId])

  // 保存用户信息
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Taro.showToast({title: '请输入姓名', icon: 'none'})
      return
    }

    if (!phone.trim()) {
      Taro.showToast({title: '请输入手机号', icon: 'none'})
      return
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone.trim())) {
      Taro.showToast({title: '手机号格式不正确', icon: 'none'})
      return
    }

    // 验证邮箱格式（如果填写了）
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        Taro.showToast({title: '邮箱格式不正确', icon: 'none'})
        return
      }
    }

    Taro.showLoading({title: '保存中...'})
    try {
      const success = await updateUserInfo(userId, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        role
      })

      if (success) {
        Taro.showToast({title: '保存成功', icon: 'success'})
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        Taro.showToast({title: '保存失败', icon: 'error'})
      }
    } catch (error) {
      console.error('保存用户信息失败:', error)
      Taro.showToast({title: '保存失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [userId, name, phone, email, role])

  // 重置密码
  const handleResetPassword = useCallback(async () => {
    const {confirm} = await Taro.showModal({
      title: '重置密码',
      content: `确认将用户"${name || phone}"的密码重置为 123456 吗？`
    })

    if (!confirm) return

    Taro.showLoading({title: '重置中...'})
    try {
      const success = await resetUserPassword(userId)
      if (success) {
        Taro.showToast({title: '密码已重置为 123456', icon: 'success', duration: 3000})
      } else {
        Taro.showToast({title: '重置失败', icon: 'error'})
      }
    } catch (error) {
      console.error('重置密码失败:', error)
      Taro.showToast({title: '重置失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [userId, name, phone])

  // 角色选择变化
  const handleRoleChange = useCallback((e: any) => {
    const selectedIndex = Number(e.detail.value)
    setRole(roleOptions[selectedIndex].value as UserRole)
  }, [])

  // 页面加载时获取用户信息
  useEffect(() => {
    loadUserInfo()
  }, [loadUserInfo])

  if (loading) {
    return (
      <View
        className="min-h-screen flex items-center justify-center"
        style={{background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)'}}>
        <Text className="text-gray-500">加载中...</Text>
      </View>
    )
  }

  if (!userInfo) {
    return (
      <View
        className="min-h-screen flex items-center justify-center"
        style={{background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)'}}>
        <Text className="text-gray-500">用户不存在</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        {/* 页面标题 */}
        <View className="px-4 pt-6 pb-4">
          <Text className="text-2xl font-bold text-gray-800">编辑用户信息</Text>
          <Text className="text-sm text-gray-500 mt-1">修改用户的基本信息和角色</Text>
        </View>

        {/* 表单 */}
        <View className="px-4 pb-6">
          <View className="bg-white rounded-lg p-4 shadow-sm">
            {/* 姓名 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">姓名 *</Text>
              <Input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入姓名"
                value={name}
                onInput={(e) => setName(e.detail.value)}
              />
            </View>

            {/* 手机号 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">手机号 *</Text>
              <Input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入手机号"
                type="number"
                maxlength={11}
                value={phone}
                onInput={(e) => setPhone(e.detail.value)}
              />
            </View>

            {/* 邮箱 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">邮箱</Text>
              <Input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入邮箱（可选）"
                type="text"
                value={email}
                onInput={(e) => setEmail(e.detail.value)}
              />
            </View>

            {/* 角色 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">角色 *</Text>
              <Picker
                mode="selector"
                range={roleOptions.map((o) => o.label)}
                value={roleOptions.findIndex((o) => o.value === role)}
                onChange={handleRoleChange}>
                <View className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg">
                  <Text className="text-gray-800">{roleOptions.find((o) => o.value === role)?.label}</Text>
                  <Text className="text-gray-400">▼</Text>
                </View>
              </Picker>
            </View>

            {/* 用户ID（只读） */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">用户ID</Text>
              <View className="px-3 py-2 bg-gray-100 rounded-lg">
                <Text className="text-xs text-gray-500 break-all">{userId}</Text>
              </View>
            </View>

            {/* 创建时间（只读） */}
            {userInfo.created_at && (
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-2">创建时间</Text>
                <View className="px-3 py-2 bg-gray-100 rounded-lg">
                  <Text className="text-sm text-gray-700">{new Date(userInfo.created_at).toLocaleString('zh-CN')}</Text>
                </View>
              </View>
            )}
          </View>

          {/* 操作按钮 */}
          <View className="mt-4 space-y-3">
            {/* 保存按钮 */}
            <Button
              size="default"
              className="w-full text-base break-keep"
              style={{
                backgroundColor: '#3b82f6',
                color: '#fff',
                borderRadius: '8px',
                height: '44px',
                lineHeight: '44px'
              }}
              onClick={handleSave}>
              保存修改
            </Button>

            {/* 重置密码按钮 */}
            <Button
              size="default"
              className="w-full text-base break-keep"
              style={{
                backgroundColor: '#f97316',
                color: '#fff',
                borderRadius: '8px',
                height: '44px',
                lineHeight: '44px'
              }}
              onClick={handleResetPassword}>
              重置密码为 123456
            </Button>

            {/* 取消按钮 */}
            <Button
              size="default"
              className="w-full text-base break-keep"
              style={{
                backgroundColor: '#e5e7eb',
                color: '#374151',
                borderRadius: '8px',
                height: '44px',
                lineHeight: '44px'
              }}
              onClick={() => Taro.navigateBack()}>
              取消
            </Button>
          </View>

          {/* 提示信息 */}
          <View className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <Text className="text-xs text-yellow-800">
              ⚠️ 提示：
              {'\n'}• 修改用户信息后，用户需要重新登录
              {'\n'}• 重置密码后，用户可以使用新密码 123456 登录
              {'\n'}• 建议用户登录后立即修改密码
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default EditUser
