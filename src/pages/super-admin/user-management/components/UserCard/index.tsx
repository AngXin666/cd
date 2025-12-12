/**
 * 用户卡片组件
 *
 * @description 显示单个用户的基本信息，支持展开详情和操作按钮
 * @module components/UserCard
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * // 基本用法
 * <UserCard user={user} />
 *
 * // 带操作按钮
 * <UserCard
 *   user={user}
 *   showDetail={isExpanded}
 *   onExpand={handleExpand}
 *   onAssignWarehouse={handleAssignWarehouse}
 *   onToggleType={handleToggleType}
 * />
 * ```
 */

import {Text, View} from '@tarojs/components'
import React, {memo} from 'react'
import type {Profile} from '@/db/types'

/**
 * UserCard组件的Props接口
 */
export interface UserCardProps {
  /** 用户信息对象 */
  user: Profile & {real_name?: string}
  /** 是否显示详细信息，默认false */
  showDetail?: boolean
  /** 是否显示操作按钮，默认true */
  showActions?: boolean
  /** 编辑用户回调 */
  onEdit?: (user: Profile) => void
  /** 删除用户回调 */
  onDelete?: (user: Profile) => void
  /** 分配仓库回调 */
  onAssignWarehouse?: (user: Profile) => void
  /** 切换司机类型回调（仅司机角色有效） */
  onToggleType?: (user: Profile) => void
  /** 展开/收起详情回调 */
  onExpand?: (user: Profile) => void
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  showDetail = false,
  showActions = true,
  onEdit,
  onDelete,
  onAssignWarehouse,
  onToggleType,
  onExpand
}) => {
  // 获取角色标签
  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      BOSS: '老板',
      MANAGER: '车队长',
      DRIVER: '司机',
      PEER_ADMIN: '调度'
    }
    return roleMap[role] || role
  }

  // 获取司机类型标签
  const getDriverTypeLabel = (driverType?: string) => {
    if (driverType === 'with_vehicle') return '带车司机'
    if (driverType === 'pure') return '纯司机'
    return '-'
  }

  return (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
      {/* 基本信息 */}
      <View className="flex items-center justify-between">
        <View className="flex items-center">
          {/* 头像 */}
          <View className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
            <Text className="text-white text-lg font-bold">{user.name?.charAt(0) || '?'}</Text>
          </View>

          {/* 姓名和角色 */}
          <View className="ml-3">
            <Text className="text-base font-semibold">{(user as any).real_name || user.name}</Text>
            <Text className="text-sm text-gray-500">
              {getRoleLabel(user.role)} {user.phone ? `· ${user.phone}` : ''}
            </Text>
          </View>
        </View>

        {/* 操作按钮 */}
        {showActions && (
          <View className="flex gap-2">
            {onExpand && (
              <View className="px-3 py-1 bg-blue-500 rounded cursor-pointer" onClick={() => onExpand(user)}>
                <Text className="text-white text-sm">{showDetail ? '收起' : '详情'}</Text>
              </View>
            )}
            {onAssignWarehouse && (
              <View className="px-3 py-1 bg-green-500 rounded cursor-pointer" onClick={() => onAssignWarehouse(user)}>
                <Text className="text-white text-sm">仓库</Text>
              </View>
            )}
            {onToggleType && user.role === 'DRIVER' && (
              <View className="px-3 py-1 bg-orange-500 rounded cursor-pointer" onClick={() => onToggleType(user)}>
                <Text className="text-white text-sm">切换类型</Text>
              </View>
            )}
            {onEdit && (
              <View className="px-3 py-1 bg-purple-500 rounded cursor-pointer" onClick={() => onEdit(user)}>
                <Text className="text-white text-sm">编辑</Text>
              </View>
            )}
            {onDelete && (
              <View className="px-3 py-1 bg-red-500 rounded cursor-pointer" onClick={() => onDelete(user)}>
                <Text className="text-white text-sm">删除</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 详细信息 */}
      {showDetail && (
        <View className="mt-3 pt-3 border-t border-gray-200">
          <View className="flex justify-between mb-2">
            <Text className="text-sm text-gray-600">手机号:</Text>
            <Text className="text-sm">{user.phone || '-'}</Text>
          </View>
          <View className="flex justify-between mb-2">
            <Text className="text-sm text-gray-600">邮箱:</Text>
            <Text className="text-sm">{user.email || '-'}</Text>
          </View>
          <View className="flex justify-between mb-2">
            <Text className="text-sm text-gray-600">状态:</Text>
            <Text className="text-sm">{user.status === 'active' ? '激活' : '未激活'}</Text>
          </View>
          {user.role === 'DRIVER' && (
            <View className="flex justify-between mb-2">
              <Text className="text-sm text-gray-600">司机类型:</Text>
              <Text className="text-sm">{getDriverTypeLabel((user as any).driver_type)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export default memo(UserCard)
