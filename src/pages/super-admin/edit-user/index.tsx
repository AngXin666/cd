import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import * as UsersAPI from '@/db/api/users'

import type {Profile, UserRole} from '@/db/types'

import TopNavBar from '@/components/TopNavBar'
const EditUser: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const userId = router.params.userId || ''

  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loginAccount, setLoginAccount] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [joinDate, setJoinDate] = useState('')
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0)

  // 角色选项（根据需求限定为三种）
  const roleOptions = [
    {label: '纯司机', value: 'DRIVER' as UserRole, description: '不带车的司机'},
    {label: '带车司机', value: 'DRIVER' as UserRole, description: '自带车辆的司机'},
    {label: '管理员', value: 'MANAGER' as UserRole, description: '仓库管理员'}
  ]

  // 加载用户信息
  const loadUserInfo = useCallback(async () => {
    if (!userId) {
      Taro.showToast({title: '用户ID不存在', icon: 'error'})
      return
    }

    setLoading(true)
    try {
      const data = await UsersAPI.getUserById(userId)

      if (data) {
        setUserInfo(data)
        setName(data.name || '')
        setPhone(data.phone || '')
        setLoginAccount(data.login_account || '')
        setVehiclePlate(data.vehicle_plate || '')
        setJoinDate(data.join_date || '')

        // 设置角色索引：根据 role 和 driver_type 来判断
        let roleIndex = 0
        let _roleLabel = ''

        if (data.role === 'DRIVER') {
          // 司机角色：根据 driver_type 来区分
          if (data.driver_type === 'with_vehicle') {
            // 带车司机（索引1）
            roleIndex = 1
            _roleLabel = '带车司机'
          } else {
            // 纯司机（索引0）
            roleIndex = 0
            _roleLabel = '纯司机'
          }
        } else if (data.role === 'MANAGER') {
          // 管理员（索引2）
          roleIndex = 2
          _roleLabel = '管理员'
        }

        setSelectedRoleIndex(roleIndex)
      } else {
        console.error('❌ 用户不存在')
        Taro.showToast({title: '用户不存在', icon: 'error'})
      }
    } catch (error) {
      console.error('❌ 加载用户信息失败:', error)
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

    if (!loginAccount.trim()) {
      Taro.showToast({title: '请输入登录账号', icon: 'none'})
      return
    }

    if (!joinDate) {
      Taro.showToast({title: '请选择入职时间', icon: 'none'})
      return
    }

    Taro.showLoading({title: '保存中...'})
    try {
      const selectedRole = roleOptions[selectedRoleIndex].value
      const selectedLabel = roleOptions[selectedRoleIndex].label

      // 根据选择的角色类型决定 driver_type 和 vehicle_plate 的值
      let finalDriverType: 'pure' | 'with_vehicle' | null = null
      let finalVehiclePlate: string | null = null

      if (selectedLabel === '纯司机') {
        // 纯司机：driver_type = 'pure'，vehicle_plate 保留用户输入
        finalDriverType = 'pure'
        const trimmedPlate = vehiclePlate.trim()
        finalVehiclePlate = trimmedPlate || null
      } else if (selectedLabel === '带车司机') {
        // 带车司机：driver_type = 'with_vehicle'，vehicle_plate 保留用户输入
        finalDriverType = 'with_vehicle'
        const trimmedPlate = vehiclePlate.trim()
        finalVehiclePlate = trimmedPlate || null
      } else if (selectedLabel === '管理员') {
        // 管理员：driver_type = null，vehicle_plate = null
        finalDriverType = null
        finalVehiclePlate = null
      }

      const updateData = {
        name: name.trim(),
        phone: phone.trim(),
        login_account: loginAccount.trim(),
        driver_type: finalDriverType,
        vehicle_plate: finalVehiclePlate,
        join_date: joinDate,
        role: selectedRole
      }

      const success = await UsersAPI.updateUserInfo(userId, updateData)

      if (success) {
        Taro.showToast({title: '保存成功', icon: 'success', duration: 2000})

        // 延迟返回，让用户看到成功提示
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        console.error('❌ 保存失败: updateUserInfo 返回 false')
        Taro.showToast({title: '保存失败', icon: 'error'})
      }
    } catch (error) {
      console.error('❌ 保存用户信息异常:', error)
      console.error('异常详情:', JSON.stringify(error, null, 2))
      Taro.showToast({title: '保存失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [
    userId,
    name,
    phone,
    loginAccount,
    vehiclePlate,
    joinDate,
    selectedRoleIndex,
    roleOptions[selectedRoleIndex].label,
    roleOptions[selectedRoleIndex].value
  ])

  // 角色选择变化
  const handleRoleChange = useCallback((e: any) => {
    setSelectedRoleIndex(Number(e.detail.value))
  }, [])

  // 日期选择变化
  const handleDateChange = useCallback((e: any) => {
    setJoinDate(e.detail.value)
  }, [])

  // 页面加载时获取用户信息
  useEffect(() => {
    loadUserInfo()
  }, [loadUserInfo])

  if (loading) {
    return (
      <View
        className="min-h-screen flex items-center justify-center"
        style={{background: 'linear-gradient(to bottom, #1e3a8a, #3b82f6)'}}>
      {/* 顶部导航栏 */}
      <TopNavBar />
        <Text className="text-white">加载中...</Text>
      </View>
    )
  }

  if (!userInfo) {
    return (
      <View
        className="min-h-screen flex items-center justify-center"
        style={{background: 'linear-gradient(to bottom, #1e3a8a, #3b82f6)'}}>
        <Text className="text-white">用户不存在</Text>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #1e3a8a, #3b82f6)', minHeight: '100vh'}}>
      <ScrollView scrollY style={{background: 'transparent'}} className="box-border">
        <View className="p-4">
          {/* 页面标题 */}
          <View className="mb-6">
            <Text className="text-white text-2xl font-bold block mb-2">编辑用户信息</Text>
            <Text className="text-blue-100 text-sm block">老板工作台</Text>
          </View>

          {/* 表单卡片 */}
          <View className="bg-white rounded-lg p-4 shadow-lg">
            {/* 姓名 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-bold block mb-2">
                姓名 <Text className="text-red-500">*</Text>
              </Text>
              <Input
                className="w-full bg-gray-50 px-3 py-2 rounded-lg text-sm"
                placeholder="请输入姓名"
                value={name}
                onInput={(e) => setName(e.detail.value)}
              />
            </View>

            {/* 手机号 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-bold block mb-2">
                手机号 <Text className="text-red-500">*</Text>
              </Text>
              <Input
                className="w-full bg-gray-50 px-3 py-2 rounded-lg text-sm"
                placeholder="请输入手机号"
                type="number"
                maxlength={11}
                value={phone}
                onInput={(e) => setPhone(e.detail.value)}
              />
            </View>

            {/* 登录账号 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-bold block mb-2">
                登录账号 <Text className="text-red-500">*</Text>
              </Text>
              <Input
                className="w-full bg-gray-50 px-3 py-2 rounded-lg text-sm"
                placeholder="请输入登录账号"
                value={loginAccount}
                onInput={(e) => setLoginAccount(e.detail.value)}
              />
              <Text className="text-xs text-gray-500 mt-1">登录账号作为用户登录系统的唯一凭证</Text>
            </View>

            {/* 角色 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-bold block mb-2">
                角色 <Text className="text-red-500">*</Text>
              </Text>
              <Picker
                mode="selector"
                range={roleOptions.map((r) => r.label)}
                value={selectedRoleIndex}
                onChange={handleRoleChange}>
                <View className="w-full bg-gray-50 px-3 py-2 rounded-lg flex items-center justify-between">
                  <Text className="text-sm text-gray-800">{roleOptions[selectedRoleIndex].label}</Text>
                  <View className="i-mdi-chevron-down text-gray-500" />
                </View>
              </Picker>
              <Text className="text-xs text-gray-500 mt-1">{roleOptions[selectedRoleIndex].description}</Text>
            </View>

            {/* 车牌号码 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-bold block mb-2">车牌号码</Text>
              <Input
                className="w-full bg-gray-50 px-3 py-2 rounded-lg text-sm"
                placeholder="请输入车牌号码（选填）"
                value={vehiclePlate}
                onInput={(e) => setVehiclePlate(e.detail.value.toUpperCase())}
              />
              <Text className="text-xs text-gray-500 mt-1">如：京A12345</Text>
            </View>

            {/* 入职时间 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 font-bold block mb-2">
                入职时间 <Text className="text-red-500">*</Text>
              </Text>
              <Picker mode="date" value={joinDate} onChange={handleDateChange}>
                <View className="w-full bg-gray-50 px-3 py-2 rounded-lg flex items-center justify-between">
                  <Text className="text-sm text-gray-800">{joinDate || '请选择入职时间'}</Text>
                  <View className="i-mdi-calendar text-gray-500" />
                </View>
              </Picker>
            </View>

            {/* 操作按钮 */}
            <View className="flex gap-3 mt-6">
              <Button
                size="default"
                className="flex-1 text-sm break-keep"
                style={{
                  backgroundColor: '#6b7280',
                  color: '#fff',
                  borderRadius: '8px'
                }}
                onClick={() => Taro.navigateBack()}>
                取消
              </Button>
              <Button
                size="default"
                className="flex-1 text-sm break-keep"
                style={{
                  backgroundColor: '#10b981',
                  color: '#fff',
                  borderRadius: '8px'
                }}
                onClick={handleSave}>
                保存
              </Button>
            </View>
          </View>

          {/* 用户ID和创建时间信息 */}
          <View className="mt-4 bg-white bg-opacity-20 rounded-lg p-3">
            <Text className="text-xs text-white block">用户ID: {userInfo.id}</Text>
            <Text className="text-xs text-white block mt-1">
              创建时间: {new Date(userInfo.created_at).toLocaleString('zh-CN')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default EditUser
