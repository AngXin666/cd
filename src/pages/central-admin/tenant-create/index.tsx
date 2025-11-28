/**
 * 创建租户页面
 * 中央管理系统 - 自动化部署
 */

import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import {createTenant} from '@/db/central-admin-api'
import type {CreateTenantInput} from '@/db/types'

// 草稿存储的 key
const DRAFT_KEY = 'tenant_create_draft'

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
  const [hasDraft, setHasDraft] = useState(false)

  // 检查登录状态
  const checkAuth = useCallback(async () => {
    const {
      data: {session}
    } = await supabase.auth.getSession()

    if (!session) {
      console.log('❌ 未登录，跳转到登录页面')
      Taro.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      })
      setTimeout(() => {
        Taro.redirectTo({url: '/pages/login/index'})
      }, 2000)
      return false
    }

    console.log('✅ 已登录，session 有效')
    return true
  }, [])

  // 页面显示时检查登录状态
  useDidShow(() => {
    checkAuth()
  })

  // 页面加载时恢复草稿
  useEffect(() => {
    const loadDraft = () => {
      try {
        const draftStr = Taro.getStorageSync(DRAFT_KEY)
        if (draftStr) {
          const draft = JSON.parse(draftStr)
          setFormData(draft.formData)
          setConfirmPassword(draft.confirmPassword || '')
          setHasDraft(true)

          // 提示用户已恢复草稿
          Taro.showToast({
            title: '已恢复上次填写的内容',
            icon: 'none',
            duration: 2000
          })
        }
      } catch (error) {
        console.error('加载草稿失败:', error)
      }
    }

    loadDraft()
  }, [])

  // 保存草稿到本地存储
  const saveDraft = () => {
    try {
      const draft = {
        formData,
        confirmPassword,
        savedAt: new Date().toISOString()
      }
      Taro.setStorageSync(DRAFT_KEY, JSON.stringify(draft))
    } catch (error) {
      console.error('保存草稿失败:', error)
    }
  }

  // 清除草稿
  const clearDraft = () => {
    try {
      Taro.removeStorageSync(DRAFT_KEY)
      setHasDraft(false)
    } catch (error) {
      console.error('清除草稿失败:', error)
    }
  }

  // 更新表单字段（同时保存草稿）
  const updateField = (field: keyof CreateTenantInput, value: string) => {
    setFormData((prev) => {
      const newData = {...prev, [field]: value}
      // 延迟保存草稿，避免频繁写入
      setTimeout(() => {
        try {
          const draft = {
            formData: newData,
            confirmPassword,
            savedAt: new Date().toISOString()
          }
          Taro.setStorageSync(DRAFT_KEY, JSON.stringify(draft))
        } catch (error) {
          console.error('保存草稿失败:', error)
        }
      }, 500)
      return newData
    })
  }

  // 更新确认密码（同时保存草稿）
  const updateConfirmPassword = (value: string) => {
    setConfirmPassword(value)
    // 延迟保存草稿
    setTimeout(() => {
      try {
        const draft = {
          formData,
          confirmPassword: value,
          savedAt: new Date().toISOString()
        }
        Taro.setStorageSync(DRAFT_KEY, JSON.stringify(draft))
      } catch (error) {
        console.error('保存草稿失败:', error)
      }
    }, 500)
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

    // 提交前再次检查登录状态
    console.log('🔍 提交前检查登录状态...')
    const {
      data: {session}
    } = await supabase.auth.getSession()

    if (!session) {
      console.error('❌ 提交时未登录，session 为空')
      Taro.showModal({
        title: '登录状态已过期',
        content: '请重新登录。您填写的内容已自动保存为草稿，下次打开页面时会自动恢复。',
        showCancel: false,
        success: () => {
          // 保存草稿
          saveDraft()
          // 跳转到登录页面
          Taro.redirectTo({url: '/pages/login/index'})
        }
      })
      return
    }

    console.log('✅ 提交时登录状态有效')

    setLoading(true)
    Taro.showLoading({title: '创建中...', mask: true})

    try {
      const result = await createTenant(formData)

      Taro.hideLoading()

      if (result.success) {
        // 创建成功，清除草稿
        clearDraft()

        Taro.showModal({
          title: '创建成功',
          content: `租户"${formData.company_name}"创建成功！\n\n登录账号：${formData.boss_account}\n密码：${formData.boss_password}\n手机号：${formData.boss_phone}\n\n请妥善保管账号信息。`,
          showCancel: false,
          success: () => {
            Taro.navigateBack()
          }
        })
      } else {
        // 创建失败，保存草稿
        saveDraft()

        Taro.showModal({
          title: '创建失败',
          content: `${result.error || '未知错误'}\n\n您填写的内容已自动保存为草稿，下次打开页面时会自动恢复。`,
          showCancel: false
        })
      }
    } catch (error) {
      Taro.hideLoading()
      console.error('创建租户失败:', error)

      // 异常情况也保存草稿
      saveDraft()

      Taro.showModal({
        title: '创建失败',
        content: '网络错误或服务异常\n\n您填写的内容已自动保存为草稿，下次打开页面时会自动恢复。',
        showCancel: false
      })
    } finally {
      setLoading(false)
    }
  }

  // 取消创建
  const handleCancel = () => {
    // 如果有草稿，询问是否保留
    if (hasDraft || formData.company_name || formData.boss_name || formData.boss_phone) {
      Taro.showModal({
        title: '提示',
        content: '是否保留当前填写的内容？\n\n选择"保留"将在下次打开时自动恢复。',
        confirmText: '保留',
        cancelText: '清除',
        success: (res) => {
          if (res.confirm) {
            // 保留草稿
            saveDraft()
          } else {
            // 清除草稿
            clearDraft()
          }
          Taro.navigateBack()
        }
      })
    } else {
      Taro.navigateBack()
    }
  }

  // 手动清除草稿
  const handleClearDraft = () => {
    Taro.showModal({
      title: '确认清除',
      content: '确定要清除已保存的草稿吗？',
      success: (res) => {
        if (res.confirm) {
          clearDraft()
          setFormData({
            company_name: '',
            boss_name: '',
            boss_phone: '',
            boss_account: '',
            boss_password: ''
          })
          setConfirmPassword('')
          Taro.showToast({title: '草稿已清除', icon: 'success'})
        }
      }
    })
  }

  return (
    <View className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 头部 */}
      <View className="bg-primary text-white p-6 pb-8">
        <View className="flex flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold">创建新租户</Text>
          {hasDraft && (
            <View className="bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-xs text-white">已恢复草稿</Text>
            </View>
          )}
        </View>
        <Text className="text-sm opacity-90 block">填写租户信息，系统将自动完成部署</Text>
      </View>

      <ScrollView scrollY className="flex-1 px-4 pb-6 box-border" style={{marginTop: '-16px'}}>
        {/* 草稿提示 */}
        {hasDraft && (
          <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex flex-row items-start">
            <View className="i-mdi-information text-yellow-600 text-xl mr-2 flex-shrink-0" style={{marginTop: '2px'}} />
            <View className="flex-1">
              <Text className="text-sm text-yellow-800 block mb-2">已自动恢复上次填写的内容</Text>
              <Button
                className="bg-yellow-100 text-yellow-700 px-3 py-1 text-xs break-keep"
                size="mini"
                onClick={handleClearDraft}>
                清除草稿
              </Button>
            </View>
          </View>
        )}

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
                onInput={(e) => updateConfirmPassword(e.detail.value)}
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
