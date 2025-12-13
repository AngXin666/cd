/**
 * 用户列表组件
 *
 * @description 显示用户列表，内部管理展开状态，支持各种用户操作回调
 * @module components/UserList
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * <UserList
 *   users={filteredUsers}
 *   loading={isLoading}
 *   onWarehouseAssign={handleWarehouseAssign}
 *   onToggleUserType={handleToggleType}
 * />
 * ```
 */

import {Text, View} from '@tarojs/components'
import React, {memo, useState} from 'react'
import type {Profile} from '@/db/types'
import UserCard from '../UserCard'
import VirtualList from '@/components/VirtualList'

/**
 * UserList组件的Props接口
 */
export interface UserListProps {
  /** 用户列表数据 */
  users: (Profile & {real_name?: string})[]
  /** 是否正在加载，默认false */
  loading?: boolean
  /** 编辑用户回调 */
  onUserEdit?: (user: Profile) => void
  /** 删除用户回调 */
  onUserDelete?: (user: Profile) => void
  /** 分配仓库回调 */
  onWarehouseAssign?: (user: Profile) => void
  /** 切换用户类型回调 */
  onToggleUserType?: (user: Profile) => void
}

const UserList: React.FC<UserListProps> = ({
  users,
  loading = false,
  onUserEdit,
  onUserDelete,
  onWarehouseAssign,
  onToggleUserType
}) => {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  const handleExpand = (user: Profile) => {
    setExpandedUserId(expandedUserId === user.id ? null : user.id)
  }

  if (loading) {
    return (
      <View className="p-4 text-center text-gray-500">
        <Text>加载中...</Text>
      </View>
    )
  }

  if (users.length === 0) {
    return (
      <View className="p-4 text-center text-gray-500">
        <Text>暂无数据</Text>
      </View>
    )
  }

  // 使用虚拟滚动优化长列表性能
  // 当用户数量超过20时启用虚拟滚动
  const useVirtualScroll = users.length > 20

  if (useVirtualScroll) {
    return (
      <View className="p-4">
        <VirtualList
          data={users}
          itemHeight={120} // UserCard的大概高度
          height={600} // 容器高度，约5个卡片的高度
          getItemKey={(user) => user.id}
          renderItem={(user) => (
            <UserCard
              user={user}
              showDetail={expandedUserId === user.id}
              onExpand={handleExpand}
              onEdit={onUserEdit}
              onDelete={onUserDelete}
              onAssignWarehouse={onWarehouseAssign}
              onToggleType={onToggleUserType}
            />
          )}
        />
      </View>
    )
  }

  // 用户数量较少时使用普通列表
  return (
    <View className="p-4">
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          showDetail={expandedUserId === user.id}
          onExpand={handleExpand}
          onEdit={onUserEdit}
          onDelete={onUserDelete}
          onAssignWarehouse={onWarehouseAssign}
          onToggleType={onToggleUserType}
        />
      ))}
    </View>
  )
}

export default memo(UserList)
