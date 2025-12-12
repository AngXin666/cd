/**
 * 账号管理页面
 * 功能：管理主账号和平级账号
 * - 显示主账号信息
 * - 显示所有平级账号列表
 * - 添加新的平级账号（最多3个）
 * - 删除平级账号
 */

import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showModal, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import * as PeerAccountsAPI from '@/db/api/peer-accounts'
import * as UsersAPI from '@/db/api/users'

import {supabase} from '@/db/supabase'
import type {Profile} from '@/db/types'

const AccountManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [_accounts, setAccounts] = useState<Profile[]>([])
  const [mainAccount, setMainAccount] = useState<Profile | null>(null)
  const [peerAccounts, setPeerAccounts] = useState<Profile[]>([])
  const [_loading, setLoading] = useState(false)

  // 添加平级账号相关状态
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountPhone, setNewAccountPhone] = useState('')
  const [newAccountEmail, setNewAccountEmail] = useState('')
  const [newAccountPassword, setNewAccountPassword] = useState('')
  const [adding, setAdding] = useState(false)

  // 加载账号列表
  const loadAccounts = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      // 获取当前用户信息
      const currentProfile = await UsersAPI.getCurrentUserProfile()
      setProfile(currentProfile)

      // 获取所有平级账号（包括主账号）
      const allAccounts = await PeerAccountsAPI.getPeerAccounts(user.id)
      setAccounts(allAccounts)

      // 分离主账号和平级账号
      const main = allAccounts.find((acc) => acc.main_account_id === null)
      const peers = allAccounts.filter((acc) => acc.main_account_id !== null)

      setMainAccount(main || null)
      setPeerAccounts(peers)
    } catch (error) {
      console.error('加载账号列表失败:', error)
      showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [user])

  useDidShow(() => {
    loadAccounts()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await loadAccounts()
    Taro.stopPullDownRefresh()
  })

  // 切换添加表单显示
  const toggleAddForm = () => {
    setShowAddForm(!showAddForm)
    if (!showAddForm) {
      // 重置表单
      setNewAccountName('')
      setNewAccountPhone('')
      setNewAccountEmail('')
      setNewAccountPassword('')
    }
  }

  // 添加平级账号
  const handleAddPeerAccount = async () => {
    // 验证输入
    if (!newAccountName.trim()) {
      showToast({title: '请输入账号名称', icon: 'none'})
      return
    }

    if (!newAccountPhone.trim()) {
      showToast({title: '请输入手机号', icon: 'none'})
      return
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(newAccountPhone.trim())) {
      showToast({title: '请输入正确的手机号', icon: 'none'})
      return
    }

    if (!newAccountPassword.trim()) {
      showToast({title: '请输入密码', icon: 'none'})
      return
    }

    // 验证密码长度
    if (newAccountPassword.trim().length < 6) {
      showToast({title: '密码至少6位', icon: 'none'})
      return
    }

    // 检查平级账号数量限制（最多3个）
    if (peerAccounts.length >= 3) {
      showToast({title: '最多只能创建3个平级账号', icon: 'none'})
      return
    }

    setAdding(true)
    showLoading({title: '创建中...'})

    try {
      // 确定主账号ID
      const primaryAccountId = profile?.main_account_id || user?.id
      if (!primaryAccountId) {
        showToast({title: '无法确定主账号', icon: 'error'})
        return
      }

      // 创建平级账号
      const result = await PeerAccountsAPI.createPeerAccount(
        primaryAccountId,
        {
          name: newAccountName.trim(),
          phone: newAccountPhone.trim()
        },
        newAccountEmail.trim() || null,
        newAccountPassword.trim()
      )

      Taro.hideLoading()

      if (result === 'EMAIL_EXISTS') {
        showToast({title: '邮箱或手机号已被注册', icon: 'none', duration: 2000})
        return
      }

      if (!result) {
        showToast({title: '创建失败，请重试', icon: 'error'})
        return
      }

      // 创建成功
      showToast({title: '创建成功', icon: 'success'})

      // 重置表单并关闭
      setShowAddForm(false)
      setNewAccountName('')
      setNewAccountPhone('')
      setNewAccountEmail('')
      setNewAccountPassword('')

      // 重新加载账号列表
      await loadAccounts()
    } catch (error) {
      console.error('创建平级账号失败:', error)
      Taro.hideLoading()
      showToast({title: '创建失败', icon: 'error'})
    } finally {
      setAdding(false)
    }
  }

  // 删除平级账号
  const handleDeletePeerAccount = (account: Profile) => {
    showModal({
      title: '确认删除',
      content: `确定要删除平级账号"${account.name}"吗？删除后该账号将无法登录。`,
      success: async (res) => {
        if (res.confirm) {
          showLoading({title: '删除中...'})
          try {
            // 删除认证用户
            const {error: deleteError} = await supabase.rpc('delete_user', {
              user_id: account.id
            })

            Taro.hideLoading()

            if (deleteError) {
              console.error('删除平级账号失败:', deleteError)
              showToast({title: '删除失败', icon: 'error'})
              return
            }

            showToast({title: '删除成功', icon: 'success'})

            // 重新加载账号列表
            await loadAccounts()
          } catch (error) {
            console.error('删除平级账号异常:', error)
            Taro.hideLoading()
            showToast({title: '删除失败', icon: 'error'})
          }
        }
      }
    })
  }

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设置'
    return dateStr.split('T')[0]
  }

  // 隐藏手机号中间4位
  const maskPhone = (phone: string | null) => {
    if (!phone) return '未设置'
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 主账号信息 */}
          {mainAccount && (
            <View className="bg-white rounded-xl p-4 mb-4 shadow">
              <View className="flex items-center mb-3">
                <View className="i-mdi-account-star text-2xl text-blue-600 mr-2" />
                <Text className="text-lg font-bold text-gray-800">主账号</Text>
              </View>

              <View className="space-y-3">
                {/* 账号名称 */}
                <View className="flex items-center">
                  <View className="i-mdi-account text-lg text-gray-600 mr-2" />
                  <Text className="text-sm text-gray-600 mr-2">姓名：</Text>
                  <Text className="text-sm text-gray-800 font-medium">{mainAccount.name || '未设置'}</Text>
                </View>

                {/* 手机号 */}
                <View className="flex items-center">
                  <View className="i-mdi-phone text-lg text-gray-600 mr-2" />
                  <Text className="text-sm text-gray-600 mr-2">手机号：</Text>
                  <Text className="text-sm text-gray-800">{maskPhone(mainAccount.phone)}</Text>
                </View>

                {/* 公司名称 */}
                {mainAccount.company_name && (
                  <View className="flex items-center">
                    <View className="i-mdi-office-building text-lg text-gray-600 mr-2" />
                    <Text className="text-sm text-gray-600 mr-2">公司：</Text>
                    <Text className="text-sm text-gray-800">{mainAccount.company_name}</Text>
                  </View>
                )}

                {/* 租期信息 */}
                {mainAccount.lease_start_date && mainAccount.lease_end_date && (
                  <View className="flex items-center">
                    <View className="i-mdi-calendar-range text-lg text-gray-600 mr-2" />
                    <Text className="text-sm text-gray-600 mr-2">租期：</Text>
                    <Text className="text-sm text-gray-800">
                      {formatDate(mainAccount.lease_start_date)} 至 {formatDate(mainAccount.lease_end_date)}
                    </Text>
                  </View>
                )}

                {/* 创建时间 */}
                <View className="flex items-center">
                  <View className="i-mdi-clock-outline text-lg text-gray-600 mr-2" />
                  <Text className="text-sm text-gray-600 mr-2">创建时间：</Text>
                  <Text className="text-sm text-gray-800">{formatDate(mainAccount.created_at)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* 平级账号列表 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow">
            <View className="flex items-center justify-between mb-3">
              <View className="flex items-center">
                <View className="i-mdi-account-multiple text-2xl text-green-600 mr-2" />
                <Text className="text-lg font-bold text-gray-800">平级账号</Text>
                <Text className="text-xs text-gray-500 ml-2">({peerAccounts.length}/3)</Text>
              </View>

              {/* 添加按钮 */}
              {peerAccounts.length < 3 && (
                <View
                  onClick={toggleAddForm}
                  className="flex items-center bg-blue-50 px-3 py-1.5 rounded-full active:scale-95 transition-all">
                  <View className={`${showAddForm ? 'i-mdi-close' : 'i-mdi-plus'} text-lg text-blue-600 mr-1`} />
                  <Text className="text-xs text-blue-600 font-medium">{showAddForm ? '取消' : '添加'}</Text>
                </View>
              )}
            </View>

            {/* 添加平级账号表单 */}
            {showAddForm && (
              <View className="bg-blue-50 rounded-lg p-4 mb-4">
                <Text className="text-sm font-bold text-gray-800 mb-3">添加平级账号</Text>

                {/* 账号名称 */}
                <View className="mb-3">
                  <Text className="text-xs text-gray-600 mb-1">账号名称 *</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-white text-foreground px-3 py-2 rounded border border-border w-full text-sm"
                      placeholder="请输入账号名称"
                      value={newAccountName}
                      onInput={(e) => setNewAccountName(e.detail.value)}
                    />
                  </View>
                </View>

                {/* 手机号 */}
                <View className="mb-3">
                  <Text className="text-xs text-gray-600 mb-1">手机号 *</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-white text-foreground px-3 py-2 rounded border border-border w-full text-sm"
                      placeholder="请输入手机号"
                      type="number"
                      maxlength={11}
                      value={newAccountPhone}
                      onInput={(e) => setNewAccountPhone(e.detail.value)}
                    />
                  </View>
                </View>

                {/* 邮箱（可选） */}
                <View className="mb-3">
                  <Text className="text-xs text-gray-600 mb-1">邮箱（可选）</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-white text-foreground px-3 py-2 rounded border border-border w-full text-sm"
                      placeholder="请输入邮箱"
                      type="text"
                      value={newAccountEmail}
                      onInput={(e) => setNewAccountEmail(e.detail.value)}
                    />
                  </View>
                </View>

                {/* 密码 */}
                <View className="mb-3">
                  <Text className="text-xs text-gray-600 mb-1">登录密码 *</Text>
                  <View style={{overflow: 'hidden'}}>
                    <Input
                      className="bg-white text-foreground px-3 py-2 rounded border border-border w-full text-sm"
                      placeholder="请输入密码（至少6位）"
                      type="text"
                      password
                      value={newAccountPassword}
                      onInput={(e) => setNewAccountPassword(e.detail.value)}
                    />
                  </View>
                </View>

                {/* 提交按钮 */}
                <Button
                  className="w-full bg-blue-600 text-white py-3 rounded break-keep text-sm"
                  size="default"
                  onClick={handleAddPeerAccount}
                  disabled={adding}>
                  {adding ? '创建中...' : '创建平级账号'}
                </Button>

                <Text className="text-xs text-gray-500 mt-2 block text-center">
                  平级账号与主账号拥有相同的权限和数据访问范围
                </Text>
              </View>
            )}

            {/* 平级账号列表 */}
            {peerAccounts.length === 0 && !showAddForm && (
              <View className="flex flex-col items-center justify-center py-8">
                <View className="i-mdi-account-off text-5xl text-gray-300 mb-2" />
                <Text className="text-sm text-gray-400">暂无平级账号</Text>
                <Text className="text-xs text-gray-400 mt-1">最多可创建3个平级账号</Text>
              </View>
            )}

            {peerAccounts.map((account, index) => (
              <View
                key={account.id}
                className={`border-t border-gray-100 pt-3 ${index === peerAccounts.length - 1 ? '' : 'pb-3'}`}>
                <View className="flex items-start justify-between">
                  <View className="flex-1">
                    {/* 账号名称 */}
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-account-circle text-lg text-green-600 mr-2" />
                      <Text className="text-sm font-medium text-gray-800">{account.name || '未设置'}</Text>
                      <View className="bg-green-100 px-2 py-0.5 rounded ml-2">
                        <Text className="text-xs text-green-700">平级账号</Text>
                      </View>
                    </View>

                    {/* 手机号 */}
                    <View className="flex items-center mb-1 ml-6">
                      <View className="i-mdi-phone text-sm text-gray-500 mr-1" />
                      <Text className="text-xs text-gray-600">{maskPhone(account.phone)}</Text>
                    </View>

                    {/* 创建时间 */}
                    <View className="flex items-center ml-6">
                      <View className="i-mdi-clock-outline text-sm text-gray-500 mr-1" />
                      <Text className="text-xs text-gray-500">创建于 {formatDate(account.created_at)}</Text>
                    </View>
                  </View>

                  {/* 删除按钮 */}
                  <View
                    onClick={() => handleDeletePeerAccount(account)}
                    className="flex items-center bg-red-50 px-2 py-1 rounded active:scale-95 transition-all ml-2">
                    <View className="i-mdi-delete text-base text-red-600" />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* 说明信息 */}
          <View className="bg-blue-50 rounded-xl p-4 shadow">
            <View className="flex items-start">
              <View className="i-mdi-information text-xl text-blue-600 mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm font-bold text-blue-900 mb-2 block">关于平级账号</Text>
                <Text className="text-xs text-blue-800 leading-relaxed block mb-1">
                  • 平级账号与主账号拥有相同的权限和数据访问范围
                </Text>
                <Text className="text-xs text-blue-800 leading-relaxed block mb-1">
                  • 每个主账号最多可创建3个平级账号
                </Text>
                <Text className="text-xs text-blue-800 leading-relaxed block mb-1">
                  • 平级账号可以独立登录，但共享主账号的所有数据
                </Text>
                <Text className="text-xs text-blue-800 leading-relaxed block">
                  • 删除平级账号后，该账号将无法登录，但不影响数据
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default AccountManagement
