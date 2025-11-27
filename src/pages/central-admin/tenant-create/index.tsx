/**
 * 创建租户页面
 * 中央管理系统 - 自动化部署
 */

import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {createTenant} from '@/db/central-admin-api'
import type {CreateTenantInput} from '@/db/types'

export default function TenantCreatePage() {
  const [formData, setFormData] = useState<CreateTenantInput>({
    company_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    expired_at: '',
    boss_name: '',
    boss_phone: '',
    boss_email: '',
    boss_password: ''
  })
  const [loading, setLoading] = useState(false)

  // 更新表单字段
  const updateField = (field: keyof CreateTenantInput, value: string) => {
    setFormData((prev) => ({...prev, [field]: value}))
  }

  // 选择日期
  const handleDateChange = (e: any) => {
    updateField('expired_at', e.detail.value)
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
      Taro.showToast({title: '请输入老板手机号', icon: 'none'})
      return false
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(formData.boss_phone)) {
      Taro.showToast({title: '手机号格式不正确', icon: 'none'})
      return false
    }

    if (!formData.boss_password.trim()) {
      Taro.showToast({title: '请输入老板账号密码', icon: 'none'})
      return false
    }

    if (formData.boss_password.length < 6) {
      Taro.showToast({title: '密码至少6位', icon: 'none'})
      return false
    }

    // 验证日期格式（如果填写了）
    if (formData.expired_at && !/^\d{4}-\d{2}-\d{2}$/.test(formData.expired_at)) {
      Taro.showToast({title: '日期格式不正确', icon: 'none'})
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
          content: `租户"${formData.company_name}"创建成功！\n\n老板账号：${formData.boss_phone}\n密码：${formData.boss_password}\n\n请妥善保管账号信息。`,
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
            <Text className="text-sm text-gray-600 block mb-2">联系人</Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请输入联系人姓名"
                value={formData.contact_name}
                onInput={(e) => updateField('contact_name', e.detail.value)}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray-600 block mb-2">联系电话</Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请输入联系电话"
                type="number"
                value={formData.contact_phone}
                onInput={(e) => updateField('contact_phone', e.detail.value)}
              />
            </View>
          </View>

          <View>
            <Text className="text-sm text-gray-600 block mb-2">联系邮箱</Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请输入联系邮箱"
                value={formData.contact_email}
                onInput={(e) => updateField('contact_email', e.detail.value)}
              />
            </View>
          </View>
        </View>

        {/* 租期设置 */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-lg font-bold text-gray-800 block mb-4">租期设置</Text>

          <View>
            <Text className="text-sm text-gray-600 block mb-2">有效期至</Text>
            <Picker mode="date" value={formData.expired_at} onChange={handleDateChange}>
              <View className="w-full border border-border rounded px-3 py-2">
                <Text className={formData.expired_at ? 'text-gray-800' : 'text-gray-400'}>
                  {formData.expired_at || '请选择到期日期（可选）'}
                </Text>
              </View>
            </Picker>
            <Text className="text-xs text-gray-400 block mt-1">不设置则永久有效</Text>
          </View>
        </View>

        {/* 老板账号 */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-lg font-bold text-gray-800 block mb-4">老板账号</Text>

          <View className="mb-4">
            <Text className="text-sm text-gray-600 block mb-2">
              姓名 <Text className="text-red-500">*</Text>
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

          <View className="mb-4">
            <Text className="text-sm text-gray-600 block mb-2">
              手机号 <Text className="text-red-500">*</Text>
            </Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请输入手机号（用于登录）"
                type="number"
                maxlength={11}
                value={formData.boss_phone}
                onInput={(e) => updateField('boss_phone', e.detail.value)}
              />
            </View>
            <Text className="text-xs text-gray-400 block mt-1">手机号将作为登录账号</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray-600 block mb-2">邮箱</Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full border border-border rounded px-3 py-2 text-base"
                placeholder="请输入邮箱（可选）"
                value={formData.boss_email}
                onInput={(e) => updateField('boss_email', e.detail.value)}
              />
            </View>
          </View>

          <View>
            <Text className="text-sm text-gray-600 block mb-2">
              密码 <Text className="text-red-500">*</Text>
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
        </View>

        {/* 提示信息 */}
        <View className="bg-blue-50 rounded-lg p-4 mb-4">
          <Text className="text-sm text-blue-600 block mb-2">📌 自动化部署说明</Text>
          <Text className="text-xs text-blue-500 block mb-1">• 系统将自动创建独立的数据库 Schema</Text>
          <Text className="text-xs text-blue-500 block mb-1">• 自动初始化所有业务表结构</Text>
          <Text className="text-xs text-blue-500 block mb-1">• 自动创建老板账号并设置权限</Text>
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
