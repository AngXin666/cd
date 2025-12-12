/**
 * 添加用户弹窗组件
 *
 * @description 提供添加新用户的表单弹窗，支持选择角色、司机类型和仓库分配
 * @module components/AddUserModal
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * <AddUserModal
 *   visible={showAddUser}
 *   warehouses={warehouses}
 *   onClose={() => setShowAddUser(false)}
 *   onSubmit={handleAddUser}
 * />
 * ```
 */

import {Checkbox, CheckboxGroup, Input, Picker, Text, View} from '@tarojs/components'
import {showToast} from '@tarojs/taro'
import React, {memo, useState} from 'react'
import type {Warehouse} from '@/db/types'

/**
 * 添加用户的数据结构
 */
export interface AddUserData {
  /** 手机号 */
  phone: string
  /** 姓名 */
  name: string
  /** 角色 */
  role: 'DRIVER' | 'MANAGER' | 'BOSS'
  /** 司机类型（仅司机角色需要） */
  driverType?: 'pure' | 'with_vehicle'
  /** 分配的仓库ID列表 */
  warehouseIds: string[]
}

/**
 * AddUserModal组件的Props接口
 */
export interface AddUserModalProps {
  /** 是否显示弹窗 */
  visible: boolean
  /** 可选的仓库列表 */
  warehouses: Warehouse[]
  /** 关闭弹窗回调 */
  onClose: () => void
  /** 提交表单回调 */
  onSubmit: (data: AddUserData) => Promise<void>
}

const AddUserModal: React.FC<AddUserModalProps> = ({visible, warehouses, onClose, onSubmit}) => {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'DRIVER' | 'MANAGER' | 'BOSS'>('DRIVER')
  const [driverType, setDriverType] = useState<'pure' | 'with_vehicle'>('pure')
  const [warehouseIds, setWarehouseIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const roleOptions = [
    {label: '司机', value: 'DRIVER'},
    {label: '管理员', value: 'MANAGER'},
    {label: '老板（平级账号）', value: 'BOSS'}
  ]

  const driverTypeOptions = [
    {label: '纯司机', value: 'pure'},
    {label: '带车司机', value: 'with_vehicle'}
  ]

  const handleSubmit = async () => {
    // 验证输入
    if (!phone.trim()) {
      showToast({title: '请输入手机号', icon: 'none'})
      return
    }
    if (!name.trim()) {
      showToast({title: '请输入姓名', icon: 'none'})
      return
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone.trim())) {
      showToast({title: '请输入正确的手机号', icon: 'none'})
      return
    }

    // 验证仓库选择
    if (role !== 'BOSS' && warehouseIds.length === 0) {
      const roleText = role === 'DRIVER' ? '司机' : '管理员'
      showToast({title: `请为${roleText}至少选择一个仓库`, icon: 'none'})
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        phone: phone.trim(),
        name: name.trim(),
        role,
        driverType: role === 'DRIVER' ? driverType : undefined,
        warehouseIds
      })

      // 重置表单
      setPhone('')
      setName('')
      setRole('DRIVER')
      setDriverType('pure')
      setWarehouseIds([])
      onClose()
    } catch (error: any) {
      const errorMsg = error?.message || String(error)
      showToast({title: errorMsg || '添加失败', icon: 'error'})
    } finally {
      setSubmitting(false)
    }
  }

  const handleWarehouseChange = (e: {detail: {value: string[]}}) => {
    setWarehouseIds(e.detail.value)
  }

  if (!visible) return null

  return (
    <View className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <View className="bg-white rounded-lg p-6 w-11/12 max-w-md max-h-5/6 overflow-y-auto">
        <Text className="text-lg font-bold mb-4">添加用户</Text>

        {/* 手机号 */}
        <View className="mb-3">
          <Text className="text-sm font-semibold mb-1">手机号 *</Text>
          <Input
            type="number"
            placeholder="请输入手机号"
            value={phone}
            onInput={(e) => setPhone(e.detail.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </View>

        {/* 姓名 */}
        <View className="mb-3">
          <Text className="text-sm font-semibold mb-1">姓名 *</Text>
          <Input
            type="text"
            placeholder="请输入姓名"
            value={name}
            onInput={(e) => setName(e.detail.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </View>

        {/* 角色选择 */}
        <View className="mb-3">
          <Text className="text-sm font-semibold mb-1">角色 *</Text>
          <Picker
            mode="selector"
            range={roleOptions}
            rangeKey="label"
            value={roleOptions.findIndex((r) => r.value === role)}
            onChange={(e) => setRole(roleOptions[e.detail.value].value as any)}>
            <View className="px-3 py-2 border rounded">
              <Text>{roleOptions.find((r) => r.value === role)?.label}</Text>
            </View>
          </Picker>
        </View>

        {/* 司机类型（仅司机角色显示） */}
        {role === 'DRIVER' && (
          <View className="mb-3">
            <Text className="text-sm font-semibold mb-1">司机类型 *</Text>
            <Picker
              mode="selector"
              range={driverTypeOptions}
              rangeKey="label"
              value={driverTypeOptions.findIndex((d) => d.value === driverType)}
              onChange={(e) => setDriverType(driverTypeOptions[e.detail.value].value as any)}>
              <View className="px-3 py-2 border rounded">
                <Text>{driverTypeOptions.find((d) => d.value === driverType)?.label}</Text>
              </View>
            </Picker>
          </View>
        )}

        {/* 仓库分配（老板角色不需要） */}
        {role !== 'BOSS' && (
          <View className="mb-3">
            <Text className="text-sm font-semibold mb-1">仓库分配 *</Text>
            <CheckboxGroup onChange={handleWarehouseChange}>
              <View className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                {warehouses.map((warehouse) => (
                  <View key={warehouse.id} className="flex items-center">
                    <Checkbox value={warehouse.id} checked={warehouseIds.includes(warehouse.id)} className="mr-2" />
                    <Text className="text-sm">{warehouse.name}</Text>
                  </View>
                ))}
              </View>
            </CheckboxGroup>
            <Text className="text-xs text-gray-500 mt-1">已选择 {warehouseIds.length} 个仓库</Text>
          </View>
        )}

        {/* 操作按钮 */}
        <View className="flex gap-2 mt-4">
          <View
            className={`flex-1 px-4 py-2 rounded text-center cursor-pointer ${
              submitting ? 'bg-gray-400' : 'bg-blue-500'
            }`}
            onClick={submitting ? undefined : handleSubmit}>
            <Text className="text-white">{submitting ? '添加中...' : '确定'}</Text>
          </View>
          <View className="flex-1 px-4 py-2 bg-gray-500 rounded text-center cursor-pointer" onClick={onClose}>
            <Text className="text-white">取消</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default memo(AddUserModal)
