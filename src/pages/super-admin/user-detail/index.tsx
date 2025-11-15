/**
 * 超级管理员 - 用户详情页面
 * 显示用户的完整个人信息
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getDriverVehicles, getDriverWarehouses, getUserById} from '@/db/api'
import type {Profile, Vehicle, Warehouse} from '@/db/types'
import {createLogger} from '@/utils/logger'

// 创建页面日志记录器
const logger = createLogger('SuperAdminUserDetail')

const UserDetail: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const userId = router.params.id || ''

  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<Profile | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  // 计算在职天数
  const calculateWorkDays = (joinDate: string | null) => {
    if (!joinDate) return 0
    const join = new Date(joinDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - join.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 加载用户信息
  const loadUserInfo = useCallback(async () => {
    if (!userId) {
      Taro.showToast({
        title: '用户ID不存在',
        icon: 'error'
      })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
      return
    }

    logger.info('开始加载用户信息', {userId})
    setLoading(true)
    try {
      const data = await getUserById(userId)
      if (data) {
        setUserInfo(data)
        logger.info('用户信息加载成功', {userId, name: data.name})

        // 如果是司机，加载车辆信息和仓库信息
        if (data.role === 'driver') {
          const vehicleData = await getDriverVehicles(userId)
          setVehicles(vehicleData)
          logger.info('司机车辆信息加载成功', {userId, vehicleCount: vehicleData.length})

          const warehouseData = await getDriverWarehouses(userId)
          setWarehouses(warehouseData)
          logger.info('司机仓库信息加载成功', {userId, warehouseCount: warehouseData.length})
        }
      } else {
        logger.warn('用户不存在', {userId})
        Taro.showToast({
          title: '用户不存在',
          icon: 'error'
        })
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      }
    } catch (error) {
      logger.error('加载用户信息失败', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadUserInfo()
  }, [loadUserInfo])

  // 获取角色显示文本
  const getRoleText = (role: string) => {
    switch (role) {
      case 'driver':
        return '司机'
      case 'manager':
        return '管理员'
      case 'admin':
        return '超级管理员'
      default:
        return '未知'
    }
  }

  // 获取角色颜色
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'driver':
        return {bg: 'bg-blue-100', text: 'text-blue-700', icon: 'i-mdi-steering'}
      case 'manager':
        return {bg: 'bg-purple-100', text: 'text-purple-700', icon: 'i-mdi-account-tie'}
      case 'admin':
        return {bg: 'bg-red-100', text: 'text-red-700', icon: 'i-mdi-shield-crown'}
      default:
        return {bg: 'bg-gray-100', text: 'text-gray-700', icon: 'i-mdi-account'}
    }
  }

  // 编辑用户
  const handleEdit = () => {
    Taro.navigateTo({
      url: `/pages/super-admin/edit-user/index?userId=${userId}`
    })
  }

  // 查看车辆详情
  const handleViewVehicle = (vehicleId: string) => {
    Taro.navigateTo({
      url: `/pages/driver/vehicle-detail/index?id=${vehicleId}`
    })
  }

  // 拨打电话
  const handleCall = (phone: string) => {
    Taro.makePhoneCall({
      phoneNumber: phone
    })
  }

  if (loading) {
    return (
      <View className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-blue-100">
        <View className="i-mdi-loading animate-spin text-5xl text-blue-600 mb-4"></View>
        <Text className="text-gray-600 font-medium">加载中...</Text>
      </View>
    )
  }

  if (!userInfo) {
    return (
      <View className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-blue-100">
        <View className="bg-blue-50 rounded-full p-6 mb-4">
          <View className="i-mdi-account-off text-6xl text-blue-300"></View>
        </View>
        <Text className="text-gray-800 text-lg font-medium">用户不存在</Text>
      </View>
    )
  }

  const roleColor = getRoleColor(userInfo.role)

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 用户头像和基本信息卡片 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-col items-center mb-6">
              {/* 头像 */}
              {userInfo.avatar_url ? (
                <Image src={userInfo.avatar_url} mode="aspectFill" className="w-24 h-24 rounded-full mb-4" />
              ) : (
                <View className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4">
                  <View className="i-mdi-account text-5xl text-white"></View>
                </View>
              )}

              {/* 姓名 */}
              <Text className="text-2xl font-bold text-gray-800 mb-2">{userInfo.name || '未设置姓名'}</Text>

              {/* 角色标签 */}
              <View className={`${roleColor.bg} rounded-full px-4 py-1.5 flex items-center`}>
                <View className={`${roleColor.icon} text-base ${roleColor.text} mr-1`}></View>
                <Text className={`text-sm font-medium ${roleColor.text}`}>{getRoleText(userInfo.role)}</Text>
              </View>
            </View>

            {/* 联系方式 */}
            <View className="space-y-3">
              {/* 手机号 */}
              {userInfo.phone && (
                <View className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
                  <View className="flex items-center flex-1">
                    <View className="bg-blue-200 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                      <View className="i-mdi-phone text-xl text-blue-700"></View>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-blue-600 mb-1 block">手机号码</Text>
                      <Text className="text-sm text-blue-900 font-medium block">{userInfo.phone}</Text>
                    </View>
                  </View>
                  <View
                    className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center active:scale-95 transition-all"
                    onClick={() => handleCall(userInfo.phone!)}>
                    <View className="i-mdi-phone-outgoing text-xl text-white"></View>
                  </View>
                </View>
              )}

              {/* 邮箱 */}
              {userInfo.email && (
                <View className="flex items-center bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4">
                  <View className="bg-purple-200 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                    <View className="i-mdi-email text-xl text-purple-700"></View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-purple-600 mb-1 block">电子邮箱</Text>
                    <Text className="text-sm text-purple-900 font-medium block">{userInfo.email}</Text>
                  </View>
                </View>
              )}

              {/* 登录账号 */}
              {userInfo.login_account && (
                <View className="flex items-center bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4">
                  <View className="bg-green-200 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                    <View className="i-mdi-account-key text-xl text-green-700"></View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-green-600 mb-1 block">登录账号</Text>
                    <Text className="text-sm text-green-900 font-medium block">{userInfo.login_account}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 详细信息卡片 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex items-center mb-4">
              <View className="i-mdi-information text-2xl text-blue-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">详细信息</Text>
            </View>

            <View className="space-y-3">
              {/* 入职日期 */}
              {userInfo.join_date && (
                <View className="flex items-center justify-between py-3 border-b border-gray-100">
                  <Text className="text-sm text-gray-600">入职日期</Text>
                  <Text className="text-sm text-gray-800 font-medium">{userInfo.join_date}</Text>
                </View>
              )}

              {/* 在职天数 */}
              {userInfo.join_date && (
                <View className="flex items-center justify-between py-3 border-b border-gray-100">
                  <Text className="text-sm text-gray-600">在职天数</Text>
                  <View className="flex items-center">
                    <View className="i-mdi-calendar-clock text-base text-blue-600 mr-1"></View>
                    <Text className="text-sm text-blue-600 font-bold">{calculateWorkDays(userInfo.join_date)}</Text>
                    <Text className="text-xs text-gray-500 ml-1">天</Text>
                  </View>
                </View>
              )}

              {/* 注册时间 */}
              <View className="flex items-center justify-between py-3 border-b border-gray-100">
                <Text className="text-sm text-gray-600">注册时间</Text>
                <Text className="text-sm text-gray-800 font-medium">
                  {new Date(userInfo.created_at).toLocaleString('zh-CN')}
                </Text>
              </View>

              {/* 更新时间 */}
              <View className="flex items-center justify-between py-3">
                <Text className="text-sm text-gray-600">更新时间</Text>
                <Text className="text-sm text-gray-800 font-medium">
                  {new Date(userInfo.updated_at).toLocaleString('zh-CN')}
                </Text>
              </View>
            </View>
          </View>

          {/* 车辆信息卡片（仅司机显示） */}
          {userInfo.role === 'driver' && (
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
              <View className="flex items-center justify-between mb-4">
                <View className="flex items-center">
                  <View className="i-mdi-car text-2xl text-blue-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">车辆信息</Text>
                </View>
                <View className="bg-blue-100 rounded-full px-3 py-1">
                  <Text className="text-xs text-blue-700 font-medium">{vehicles.length} 辆</Text>
                </View>
              </View>

              {vehicles.length === 0 ? (
                <View className="flex flex-col items-center justify-center py-8">
                  <View className="bg-gray-50 rounded-full p-4 mb-3">
                    <View className="i-mdi-car-off text-4xl text-gray-300"></View>
                  </View>
                  <Text className="text-gray-500 text-sm">暂无车辆信息</Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {vehicles.map((vehicle) => (
                    <View
                      key={vehicle.id}
                      className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 active:scale-98 transition-all"
                      onClick={() => handleViewVehicle(vehicle.id)}>
                      <View className="flex items-center justify-between">
                        <View className="flex-1">
                          <View className="flex items-center mb-2">
                            <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1 mr-2">
                              <Text className="text-white text-base font-bold">{vehicle.plate_number}</Text>
                            </View>
                            {vehicle.status === 'active' && (
                              <View className="bg-green-100 rounded-full px-2 py-0.5">
                                <Text className="text-xs text-green-600 font-medium">使用中</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-sm text-blue-900 font-medium block">
                            {vehicle.brand} {vehicle.model}
                          </Text>
                          {vehicle.color && <Text className="text-xs text-blue-700 block mt-1">{vehicle.color}</Text>}
                        </View>
                        <View className="i-mdi-chevron-right text-2xl text-blue-400"></View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 仓库信息卡片（仅司机显示） */}
          {userInfo.role === 'driver' && (
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
              <View className="flex items-center justify-between mb-4">
                <View className="flex items-center">
                  <View className="i-mdi-warehouse text-2xl text-purple-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">分配仓库</Text>
                </View>
                <View className="bg-purple-100 rounded-full px-3 py-1">
                  <Text className="text-xs text-purple-700 font-medium">{warehouses.length} 个</Text>
                </View>
              </View>

              {warehouses.length === 0 ? (
                <View className="flex flex-col items-center justify-center py-8">
                  <View className="bg-gray-50 rounded-full p-4 mb-3">
                    <View className="i-mdi-warehouse-off text-4xl text-gray-300"></View>
                  </View>
                  <Text className="text-gray-500 text-sm">暂未分配仓库</Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {warehouses.map((warehouse) => (
                    <View key={warehouse.id} className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4">
                      <View className="flex items-center justify-between">
                        <View className="flex-1">
                          <View className="flex items-center mb-2">
                            <View className="i-mdi-warehouse text-lg text-purple-600 mr-2"></View>
                            <Text className="text-base text-purple-900 font-bold">{warehouse.name}</Text>
                          </View>
                          {warehouse.address && (
                            <View className="flex items-center">
                              <View className="i-mdi-map-marker text-sm text-purple-600 mr-1"></View>
                              <Text className="text-xs text-purple-700 block">{warehouse.address}</Text>
                            </View>
                          )}
                          {warehouse.status && (
                            <View className="flex items-center mt-2">
                              <View
                                className={`rounded-full px-2 py-0.5 ${
                                  warehouse.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                <Text
                                  className={`text-xs font-medium ${
                                    warehouse.status === 'active' ? 'text-green-600' : 'text-gray-600'
                                  }`}>
                                  {warehouse.status === 'active' ? '使用中' : '已停用'}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 操作按钮 */}
          <View className="space-y-3 pb-6">
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl break-keep text-base font-medium"
              size="default"
              onClick={handleEdit}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-pencil text-lg text-white mr-2"></View>
                <Text className="text-white">编辑用户信息</Text>
              </View>
            </Button>

            <Button
              className="w-full bg-white text-gray-700 py-4 rounded-xl break-keep text-base font-medium border border-gray-200"
              size="default"
              onClick={() => Taro.navigateBack()}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-arrow-left text-lg text-gray-700 mr-2"></View>
                <Text className="text-gray-700">返回</Text>
              </View>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default UserDetail
