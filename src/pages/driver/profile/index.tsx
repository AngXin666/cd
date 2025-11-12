/**
 * 司机个人信息页面
 * 显示司机的个人资料和基本信息
 */

import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getCurrentUserProfile, updateProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const DriverProfile: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)

  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: ''
  })

  // 加载个人资料
  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCurrentUserProfile()
      setProfile(data)
      // 初始化编辑表单
      setEditForm({
        name: data?.name || '',
        phone: data?.phone || '',
        email: data?.email || ''
      })
    } catch (error) {
      console.error('加载个人资料失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    loadProfile()
  })

  // 开始编辑
  const handleStartEdit = () => {
    setEditing(true)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditing(false)
    // 恢复原始数据
    setEditForm({
      name: profile?.name || '',
      phone: profile?.phone || '',
      email: profile?.email || ''
    })
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!user) return

    // 验证必填项
    if (!editForm.name.trim()) {
      Taro.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return
    }

    Taro.showLoading({title: '保存中...'})
    try {
      const success = await updateProfile(user.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null
      })

      if (success) {
        Taro.showToast({
          title: '保存成功',
          icon: 'success'
        })
        setEditing(false)
        loadProfile()
      } else {
        Taro.showToast({
          title: '保存失败',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('保存个人资料失败:', error)
      Taro.showToast({
        title: '保存失败',
        icon: 'error'
      })
    } finally {
      Taro.hideLoading()
    }
  }

  // 返回上一页
  const handleGoBack = () => {
    Taro.navigateBack()
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex items-center justify-between">
              <View className="flex-1">
                <View className="flex items-center mb-2">
                  <View className="i-mdi-account-circle text-3xl text-white mr-3" />
                  <Text className="text-2xl font-bold text-white">个人信息</Text>
                </View>
                <Text className="text-blue-100 text-sm">查看和编辑您的个人资料</Text>
              </View>
              <View
                className="bg-white/20 backdrop-blur rounded-full p-3 active:scale-95 transition-all"
                onClick={handleGoBack}>
                <View className="i-mdi-arrow-left text-white text-2xl" />
              </View>
            </View>
          </View>

          {loading ? (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-loading animate-spin text-5xl text-blue-600 mb-4" />
              <Text className="text-gray-600 font-medium">加载中...</Text>
            </View>
          ) : (
            <>
              {/* 个人信息卡片 */}
              <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                <View className="flex items-center justify-between mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-card-account-details text-blue-600 text-xl mr-2" />
                    <Text className="text-lg font-bold text-gray-800">基本信息</Text>
                  </View>
                  {!editing && (
                    <View
                      className="flex items-center bg-blue-50 rounded-lg px-3 py-2 active:scale-95 transition-all"
                      onClick={handleStartEdit}>
                      <View className="i-mdi-pencil text-blue-600 text-base mr-1" />
                      <Text className="text-blue-600 text-sm font-medium">编辑</Text>
                    </View>
                  )}
                </View>

                {/* 信息项 */}
                <View className="space-y-4">
                  {/* 姓名 */}
                  <View>
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-account text-gray-500 text-base mr-2" />
                      <Text className="text-gray-600 text-sm">姓名</Text>
                      <Text className="text-red-500 text-sm ml-1">*</Text>
                    </View>
                    {editing ? (
                      <View style={{overflow: 'hidden'}}>
                        <Input
                          type="text"
                          value={editForm.name}
                          onInput={(e) => setEditForm({...editForm, name: e.detail.value})}
                          placeholder="请输入姓名"
                          className="bg-gray-50 text-gray-800 px-4 py-3 rounded-lg border border-gray-200 w-full text-base"
                        />
                      </View>
                    ) : (
                      <View className="bg-gray-50 px-4 py-3 rounded-lg">
                        <Text className="text-gray-800 text-base">{profile?.name || '未设置'}</Text>
                      </View>
                    )}
                  </View>

                  {/* 手机号 */}
                  <View>
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-phone text-gray-500 text-base mr-2" />
                      <Text className="text-gray-600 text-sm">手机号</Text>
                    </View>
                    {editing ? (
                      <View style={{overflow: 'hidden'}}>
                        <Input
                          type="text"
                          value={editForm.phone}
                          onInput={(e) => setEditForm({...editForm, phone: e.detail.value})}
                          placeholder="请输入手机号"
                          className="bg-gray-50 text-gray-800 px-4 py-3 rounded-lg border border-gray-200 w-full text-base"
                        />
                      </View>
                    ) : (
                      <View className="bg-gray-50 px-4 py-3 rounded-lg">
                        <Text className="text-gray-800 text-base">{profile?.phone || '未设置'}</Text>
                      </View>
                    )}
                  </View>

                  {/* 邮箱 */}
                  <View>
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-email text-gray-500 text-base mr-2" />
                      <Text className="text-gray-600 text-sm">邮箱</Text>
                    </View>
                    {editing ? (
                      <View style={{overflow: 'hidden'}}>
                        <Input
                          type="text"
                          value={editForm.email}
                          onInput={(e) => setEditForm({...editForm, email: e.detail.value})}
                          placeholder="请输入邮箱"
                          className="bg-gray-50 text-gray-800 px-4 py-3 rounded-lg border border-gray-200 w-full text-base"
                        />
                      </View>
                    ) : (
                      <View className="bg-gray-50 px-4 py-3 rounded-lg">
                        <Text className="text-gray-800 text-base">{profile?.email || '未设置'}</Text>
                      </View>
                    )}
                  </View>

                  {/* 角色 */}
                  <View>
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-shield-account text-gray-500 text-base mr-2" />
                      <Text className="text-gray-600 text-sm">角色</Text>
                    </View>
                    <View className="bg-gray-50 px-4 py-3 rounded-lg">
                      <Text className="text-gray-800 text-base">
                        {profile?.role === 'driver'
                          ? '司机'
                          : profile?.role === 'manager'
                            ? '管理员'
                            : profile?.role === 'super_admin'
                              ? '超级管理员'
                              : '未知'}
                      </Text>
                    </View>
                  </View>

                  {/* 注册时间 */}
                  <View>
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-calendar text-gray-500 text-base mr-2" />
                      <Text className="text-gray-600 text-sm">注册时间</Text>
                    </View>
                    <View className="bg-gray-50 px-4 py-3 rounded-lg">
                      <Text className="text-gray-800 text-base">
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })
                          : '未知'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 编辑模式下的操作按钮 */}
                {editing && (
                  <View className="flex gap-3 mt-6">
                    <Button
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg break-keep text-base"
                      size="default"
                      onClick={handleCancelEdit}>
                      <View className="flex items-center justify-center">
                        <View className="i-mdi-close text-base mr-1" />
                        <Text className="font-medium">取消</Text>
                      </View>
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg break-keep text-base shadow-lg"
                      size="default"
                      onClick={handleSaveEdit}>
                      <View className="flex items-center justify-center">
                        <View className="i-mdi-check text-base mr-1" />
                        <Text className="font-medium">保存</Text>
                      </View>
                    </Button>
                  </View>
                )}
              </View>

              {/* 提示信息 */}
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <View className="flex items-start">
                  <View className="i-mdi-information text-blue-600 text-xl mr-2 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-blue-800 text-sm block mb-1 font-medium">温馨提示</Text>
                    <Text className="text-blue-700 text-xs block">
                      请确保您的个人信息准确无误，以便管理员能够及时联系到您。
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* 底部间距 */}
          <View className="h-8" />
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverProfile
