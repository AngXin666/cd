/**
 * 用户详情组件
 *
 * @description 显示用户的详细信息，包括基本信息、驾驶证信息等
 * @module components/UserDetail
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * <UserDetail
 *   user={selectedUser}
 *   detail={driverDetail}
 *   onClose={() => setSelectedUser(null)}
 * />
 * ```
 */

import {Text, View} from '@tarojs/components'
import {navigateTo} from '@tarojs/taro'
import React, {memo} from 'react'
import type {Profile} from '@/db/types'

/**
 * UserDetail组件的Props接口
 */
export interface UserDetailProps {
  /** 用户信息对象 */
  user: Profile & {real_name?: string}
  /** 司机详细信息（驾驶证、车辆等） */
  detail?: any
  /** 关闭详情回调 */
  onClose?: () => void
}

const UserDetail: React.FC<UserDetailProps> = ({user, detail, onClose}) => {
  const handleViewProfile = () => {
    navigateTo({
      url: `/pages/manager/driver-profile/index?driverId=${user.id}`
    })
  }

  const handleViewVehicles = () => {
    navigateTo({
      url: `/pages/driver/vehicle-list/index?driverId=${user.id}`
    })
  }

  return (
    <View className="mt-3 pt-3 border-t border-gray-200">
      <Text className="font-bold mb-2">详细信息</Text>

      {/* 基本信息 */}
      <View className="space-y-2 mb-3">
        <View className="flex justify-between">
          <Text className="text-sm text-gray-600">用户ID:</Text>
          <Text className="text-sm">{user.id}</Text>
        </View>
        <View className="flex justify-between">
          <Text className="text-sm text-gray-600">姓名:</Text>
          <Text className="text-sm">{(user as any).real_name || user.name}</Text>
        </View>
        <View className="flex justify-between">
          <Text className="text-sm text-gray-600">手机号:</Text>
          <Text className="text-sm">{user.phone || '-'}</Text>
        </View>
        <View className="flex justify-between">
          <Text className="text-sm text-gray-600">邮箱:</Text>
          <Text className="text-sm">{user.email || '-'}</Text>
        </View>
        <View className="flex justify-between">
          <Text className="text-sm text-gray-600">状态:</Text>
          <Text className="text-sm">{user.status === 'active' ? '激活' : '未激活'}</Text>
        </View>
        {user.role === 'DRIVER' && (
          <View className="flex justify-between">
            <Text className="text-sm text-gray-600">司机类型:</Text>
            <Text className="text-sm">{(user as any).driver_type === 'with_vehicle' ? '带车司机' : '纯司机'}</Text>
          </View>
        )}
      </View>

      {/* 操作按钮 */}
      <View className="flex gap-2">
        <View className="flex-1 px-3 py-2 bg-blue-500 rounded text-center cursor-pointer" onClick={handleViewProfile}>
          <Text className="text-white text-sm">查看档案</Text>
        </View>
        {user.role === 'DRIVER' && (
          <View
            className="flex-1 px-3 py-2 bg-green-500 rounded text-center cursor-pointer"
            onClick={handleViewVehicles}>
            <Text className="text-white text-sm">车辆管理</Text>
          </View>
        )}
        {onClose && (
          <View className="flex-1 px-3 py-2 bg-gray-500 rounded text-center cursor-pointer" onClick={onClose}>
            <Text className="text-white text-sm">关闭</Text>
          </View>
        )}
      </View>

      {/* 司机详细信息 */}
      {detail && user.role === 'DRIVER' && (
        <View className="mt-3 pt-3 border-t">
          <Text className="font-bold mb-2">驾驶证信息</Text>
          {detail.license && (
            <View className="space-y-2">
              <View className="flex justify-between">
                <Text className="text-sm text-gray-600">证件姓名:</Text>
                <Text className="text-sm">{detail.license.id_card_name || '-'}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-sm text-gray-600">驾驶证号:</Text>
                <Text className="text-sm">{detail.license.license_number || '-'}</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export default memo(UserDetail)
