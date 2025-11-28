/**
 * 创建租户页面
 * 中央管理系统 - 自动化部署
 */

import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {createTenant} from '@/db/central-admin-api'
import type {CreateTenantInput} from '@/db/types'

export default function TenantCreatePage() {
  const [formData, setFormData] = useState<CreateTenantInput>({
    company_name: '',
    boss_name: '',
    boss_phone: '',
    boss_account: '',
    boss_password: ''
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // 更新表单字段
  const updateField = (field: keyof CreateTenantInput, value: string) => {
    setFormData((prev) => ({...prev, [field]: value}))
  }

  // 验证表单
  const validateForm = (): boolean => {
    if (!formData.company_name.trim()) {
      Taro.showToast({title: '请输入公司名称', icon: 'none'})
      return false
    }

    if (!formData.boss_name.trim()) {
      Taro.showToast({title: '请输入老板姓名', icon: 'none'})
      return false
    }

    if (!formData.boss_phone.trim()) {
      Taro.showToast({title: '请输入老板电话', icon: 'none'})
      return false
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(formData.boss_phone)) {
      Taro.showToast({title: '手机号格式不正确', icon: 'none'})
      return false
    }

    if (!formData.boss_account?.trim()) {
      Taro.showToast({title: '请输入登录账号', icon: 'none'})
      return false
    }

    // 验证登录账号格式（只允许字母、数字、下划线，4-20位）
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(formData.boss_account)) {
      Taro.showToast({title: '登录账号格式不正确（4-20位字母、数字或下划线）', icon: 'none'})
      return false
    }

    if (!formData.boss_password.trim()) {
      Taro.showToast({title: '请输入登录密码', icon: 'none'})
      return false
    }

    if (formData.boss_password.length < 6) {
      Taro.showToast({title: '密码至少6位', icon: 'none'})
      return false
    }

    if (!confirmPassword.trim()) {
      Taro.showToast({title: '请确认密码', icon: 'none'})
      return false
    }

    if (formData.boss_password !== confirmPassword) {
      Taro.showToast({title: '两次输入的密码不一致', icon: 'none'})
      return false
    }

    return true
  }

  // 提交创建
  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    Taro.showLoading({title: '创建中...', mask: true})

    try {
      const result = await createTenant(formData)

      Taro.hideLoading()

      if (result.success) {
        Taro.showModal({
          title: '创建成功',
          content: `租户"${formData.company_name}"创建成功！\n\n登录账号：${formData.boss_account}\n密码：${formData.boss_password}\n手机号：${formData.boss_phone}\n\n请妥善保管账号信息。`,
          showCancel: false,
          success: () => {
            Taro.navigateBack()
          }
        })
      } else {
        Taro.showModal({
          title: '创建失败',
          content: result.error || '未知错误',
          showCancel: false
        })
      }
    } catch (error) {
      Taro.hideLoading()
      console.error('创建租户失败:', error)
      Taro.showToast({title: '创建失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }

  // 取消创建
  const handleCancel = () => {
    Taro.navigateBack()
  }

  return (
    <View className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 头部 */}
      <View className="bg-primary text-white p-6 pb-8">
        <Text className="text-2xl font-bold block mb-2">创建新租户</Text>
        <Text className="text-sm opacity-90 block">填写租户信息，系统将自动完成部署</Text>
      </View>

      <ScrollView scrollY className="flex-1 px-4 pb-6 box-border" style={{marginTop: '-16px'}}>
        {/* 基本信息 */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-lg font-bold text-gray-800 block mb-4">基本信息</Text>

          <View className="mb-4">
            <Text className="text-sm text-gray-600 block mb-2">
              公司名称 <Text className="text-red-500">*</Text>
            </Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请输入公司名称"
                value={formData.company_name}
                onInput={(e) => updateField('company_name', e.detail.value)}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray-600 block mb-2">
              老板姓名 <Text className="text-red-500">*</Text>
            </Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请输入老板姓名"
                value={formData.boss_name}
                onInput={(e) => updateField('boss_name', e.detail.value)}
              />
            </View>
          </View>

          <View>
            <Text className="text-sm text-gray-600 block mb-2">
              老板电话 <Text className="text-red-500">*</Text>
            </Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请输入手机号"
                type="number"
                maxlength={11}
                value={formData.boss_phone}
                onInput={(e) => updateField('boss_phone', e.detail.value)}
              />
            </View>
            <Text className="text-xs text-gray-400 block mt-1">用于接收通知和验证码登录</Text>
          </View>
        </View>

        {/* 登录信息 */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-lg font-bold text-gray-800 block mb-4">登录信息</Text>

          <View className="mb-4">
            <Text className="text-sm text-gray-600 block mb-2">
              登录账号 <Text className="text-red-500">*</Text>
            </Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请输入登录账号（4-20位字母、数字或下划线）"
                value={formData.boss_account}
                onInput={(e) => updateField('boss_account', e.detail.value)}
              />
            </View>
            <Text className="text-xs text-gray-400 block mt-1">用于账号密码登录</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray-600 block mb-2">
              登录密码 <Text className="text-red-500">*</Text>
            </Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请输入密码（至少6位）"
                password
                value={formData.boss_password}
                onInput={(e) => updateField('boss_password', e.detail.value)}
              />
            </View>
            <Text className="text-xs text-gray-400 block mt-1">密码至少6位</Text>
          </View>

          <View>
            <Text className="text-sm text-gray-600 block mb-2">
              确认密码 <Text className="text-red-500">*</Text>
            </Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请再次输入密码"
                password
                value={confirmPassword}
                onInput={(e) => setConfirmPassword(e.detail.value)}
              />
            </View>
            <Text className="text-xs text-gray-400 block mt-1">请再次输入密码以确认</Text>
          </View>
        </View>

        {/* 提示信息 */}
        <View className="bg-blue-50 rounded-lg p-4 mb-4">
          <Text className="text-sm text-blue-600 block mb-2">📌 自动化部署说明</Text>
          <Text className="text-xs text-blue-500 block mb-1">• 系统将自动创建独立的数据库 Schema</Text>
          <Text className="text-xs text-blue-500 block mb-1">• 自动克隆第一个租户的系统架构（表、函数、策略等）</Text>
          <Text className="text-xs text-blue-500 block mb-1">• 自动创建老板账号并设置权限</Text>
          <Text className="text-xs text-blue-500 block mb-1">• 自动创建默认仓库</Text>
          <Text className="text-xs text-blue-500 block">• 整个过程约需 3-5 秒</Text>
        </View>

        {/* 操作按钮 */}
        <View className="flex gap-3 mb-6">
          <Button
            className="flex-1 bg-gray-200 text-gray-700 py-4 rounded break-keep text-base"
            size="default"
            onClick={handleCancel}
            disabled={loading}>
            取消
          </Button>
          <Button
            className="flex-1 bg-primary text-white py-4 rounded break-keep text-base"
            size="default"
            onClick={handleSubmit}
            disabled={loading}>
            {loading ? '创建中...' : '创建租户'}
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
