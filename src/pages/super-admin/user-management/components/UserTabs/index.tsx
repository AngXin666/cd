/**
 * 用户标签页组件
 *
 * @description 提供司机/管理员标签页切换功能
 * @module components/UserTabs
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * <UserTabs
 *   activeTab={activeTab}
 *   onTabChange={(tab) => setActiveTab(tab)}
 * />
 * ```
 */

import {Text, View} from '@tarojs/components'
import type React from 'react'
import {memo} from 'react'

/**
 * UserTabs组件的Props接口
 */
export interface UserTabsProps {
  /** 当前激活的标签页 */
  activeTab: 'DRIVER' | 'MANAGER'
  /** 标签页切换回调 */
  onTabChange: (tab: 'DRIVER' | 'MANAGER') => void
}

const UserTabs: React.FC<UserTabsProps> = ({activeTab, onTabChange}) => {
  const tabs = [
    {key: 'DRIVER' as const, label: '司机管理', icon: '👷'},
    {key: 'MANAGER' as const, label: '管理员管理', icon: '👔'}
  ]

  return (
    <View className="flex bg-white border-b">
      {tabs.map((tab) => (
        <View
          key={tab.key}
          className={`flex-1 text-center py-3 cursor-pointer ${
            activeTab === tab.key ? 'border-b-2 border-blue-500' : ''
          }`}
          onClick={() => onTabChange(tab.key)}>
          <Text className={activeTab === tab.key ? 'text-blue-500 font-bold' : 'text-gray-600'}>
            {tab.icon} {tab.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

export default memo(UserTabs)
