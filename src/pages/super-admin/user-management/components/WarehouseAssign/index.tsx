/**
 * 仓库分配组件
 *
 * @description 管理用户的仓库分配，支持多选仓库
 * @module components/WarehouseAssign
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * <WarehouseAssign
 *   user={selectedUser}
 *   warehouses={warehouses}
 *   selectedIds={selectedWarehouseIds}
 *   onSelectedChange={setSelectedWarehouseIds}
 *   onSave={handleSaveAssignment}
 *   onCancel={() => setSelectedUser(null)}
 * />
 * ```
 */

import {Checkbox, CheckboxGroup, Text, View} from '@tarojs/components'
import React, {memo} from 'react'
import type {Profile, Warehouse} from '@/db/types'

/**
 * WarehouseAssign组件的Props接口
 */
export interface WarehouseAssignProps {
  /** 要分配仓库的用户 */
  user: Profile & {real_name?: string}
  /** 可选的仓库列表 */
  warehouses: Warehouse[]
  /** 已选中的仓库ID列表 */
  selectedIds: string[]
  /** 选中状态变化回调 */
  onSelectedChange: (ids: string[]) => void
  /** 保存分配回调 */
  onSave: () => void
  /** 取消操作回调 */
  onCancel: () => void
  /** 是否正在保存，默认false */
  loading?: boolean
}

const WarehouseAssign: React.FC<WarehouseAssignProps> = ({
  user,
  warehouses,
  selectedIds,
  onSelectedChange,
  onSave,
  onCancel,
  loading = false
}) => {
  const handleCheckboxChange = (e: {detail: {value: string[]}}) => {
    onSelectedChange(e.detail.value)
  }

  return (
    <View className="mt-3 pt-3 border-t border-gray-200">
      <Text className="font-bold mb-2">仓库分配 - {(user as any).real_name || user.name}</Text>

      {/* 仓库列表 */}
      <View className="mb-3">
        {warehouses.length === 0 ? (
          <Text className="text-sm text-gray-500">暂无可分配的仓库</Text>
        ) : (
          <CheckboxGroup onChange={handleCheckboxChange}>
            <View className="space-y-2">
              {warehouses.map((warehouse) => (
                <View key={warehouse.id} className="flex items-center">
                  <Checkbox value={warehouse.id} checked={selectedIds.includes(warehouse.id)} className="mr-2" />
                  <Text className="text-sm">{warehouse.name}</Text>
                </View>
              ))}
            </View>
          </CheckboxGroup>
        )}
      </View>

      {/* 已选择提示 */}
      <View className="mb-3">
        <Text className="text-sm text-gray-600">已选择 {selectedIds.length} 个仓库</Text>
      </View>

      {/* 操作按钮 */}
      <View className="flex gap-2">
        <View
          className={`flex-1 px-4 py-2 rounded text-center cursor-pointer ${loading ? 'bg-gray-400' : 'bg-blue-500'}`}
          onClick={loading ? undefined : onSave}>
          <Text className="text-white text-sm">{loading ? '保存中...' : '保存'}</Text>
        </View>
        <View className="flex-1 px-4 py-2 bg-gray-500 rounded text-center cursor-pointer" onClick={onCancel}>
          <Text className="text-white text-sm">取消</Text>
        </View>
      </View>
    </View>
  )
}

export default memo(WarehouseAssign)
