/**
 * 用户筛选组件
 *
 * @description 提供搜索框、刷新按钮和添加用户按钮
 * @module components/UserFilter
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * <UserFilter
 *   searchKeyword={keyword}
 *   onSearchChange={setKeyword}
 *   onAddUser={() => setShowAddModal(true)}
 *   onRefresh={() => loadUsers(true)}
 * />
 * ```
 */

import {Input, Text, View} from '@tarojs/components'
import React, {memo} from 'react'

/**
 * UserFilter组件的Props接口
 */
export interface UserFilterProps {
  /** 当前搜索关键词 */
  searchKeyword: string
  /** 搜索关键词变化回调 */
  onSearchChange: (keyword: string) => void
  /** 添加用户按钮点击回调 */
  onAddUser?: () => void
  /** 刷新按钮点击回调 */
  onRefresh?: () => void
  /** 是否显示搜索框，默认true */
  showSearch?: boolean
}

const UserFilter: React.FC<UserFilterProps> = ({
  searchKeyword,
  onSearchChange,
  onAddUser,
  onRefresh,
  showSearch = true
}) => {
  return (
    <View className="bg-white p-3 border-b">
      <View className="flex items-center gap-2">
        {/* 搜索框 */}
        {showSearch && (
          <View className="flex-1">
            <Input
              type="text"
              placeholder="搜索用户（姓名/手机号/邮箱）"
              value={searchKeyword}
              onInput={(e) => onSearchChange(e.detail.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </View>
        )}

        {/* 刷新按钮 */}
        {onRefresh && (
          <View className="px-3 py-2 bg-gray-500 text-white rounded cursor-pointer" onClick={onRefresh}>
            <Text className="text-sm">刷新</Text>
          </View>
        )}

        {/* 添加用户按钮 */}
        {onAddUser && (
          <View className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer" onClick={onAddUser}>
            <Text className="text-sm">添加用户</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default memo(UserFilter)
