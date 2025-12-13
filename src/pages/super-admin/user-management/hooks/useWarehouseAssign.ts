/**
 * 仓库分配逻辑 Hook
 *
 * @description 封装仓库分配相关逻辑，包括加载仓库列表、加载用户已分配仓库、保存分配
 * @module hooks/useWarehouseAssign
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * const {
 *   warehouses,         // 仓库列表
 *   selectedIds,        // 已选中的仓库ID
 *   setSelectedIds,     // 设置选中的仓库
 *   loadUserWarehouses, // 加载用户已分配的仓库
 *   saveAssignment      // 保存仓库分配
 * } = useWarehouseAssign()
 *
 * // 加载用户已分配的仓库
 * await loadUserWarehouses(userId, userRole)
 *
 * // 保存仓库分配
 * const success = await saveAssignment(userId, userRole, userName)
 * ```
 */

import Taro, {showLoading, showToast} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import * as UsersAPI from '@/db/api/users'
import * as WarehousesAPI from '@/db/api/warehouses'
import {createNotifications} from '@/db/notificationApi'
import {supabase} from '@/db/supabase'
import type {Warehouse} from '@/db/types'
import {createLogger} from '@/utils/logger'

const logger = createLogger('WarehouseAssign')

/** 辅助函数：判断是否是管理员角色（boss） */
const isAdminRole = (role: string | undefined) => {
  return role === 'BOSS'
}

/**
 * useWarehouseAssign Hook的返回值类型
 */
export interface UseWarehouseAssignReturn {
  /** 可用仓库列表 */
  warehouses: Warehouse[]
  /** 已选中的仓库ID列表 */
  selectedIds: string[]
  /** 是否正在加载 */
  loading: boolean

  /** 加载仓库列表 */
  loadWarehouses: () => Promise<void>
  /** 加载用户已分配的仓库 */
  loadUserWarehouses: (userId: string, userRole: string) => Promise<void>
  /** 设置选中的仓库ID列表 */
  setSelectedIds: (ids: string[]) => void
  /** 保存仓库分配 @returns 是否保存成功 */
  saveAssignment: (userId: string, userRole: string, userName: string) => Promise<boolean>
}

export const useWarehouseAssign = (): UseWarehouseAssignReturn => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, _setLoading] = useState(false)

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    try {
      const data = await WarehousesAPI.getAllWarehouses()
      setWarehouses(data.filter((w) => w.is_active))
    } catch (error) {
      logger.error('加载仓库列表失败', error)
      showToast({title: '加载仓库失败', icon: 'error'})
    }
  }, [])

  // 加载用户已分配的仓库
  const loadUserWarehouses = useCallback(async (userId: string, userRole: string) => {
    showLoading({title: '加载中...'})
    try {
      let assignments: Array<{warehouse_id: string}> = []

      if (userRole === 'DRIVER') {
        assignments = await WarehousesAPI.getWarehouseAssignmentsByDriver(userId)
      } else if (userRole === 'MANAGER' || isAdminRole(userRole)) {
        assignments = await WarehousesAPI.getWarehouseAssignmentsByManager(userId)
      }

      setSelectedIds(assignments.map((a) => a.warehouse_id))
    } catch (error) {
      logger.error('加载用户仓库失败', error)
      showToast({title: '加载失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [])

  // 保存仓库分配
  const saveAssignment = useCallback(
    async (userId: string, userRole: string, userName: string) => {
      // 获取选中的仓库名称
      const selectedWarehouseNames = warehouses
        .filter((w) => selectedIds.includes(w.id))
        .map((w) => w.name)
        .join('、')

      const warehouseText = selectedIds.length > 0 ? selectedWarehouseNames : '无'

      // 二次确认
      const result = await Taro.showModal({
        title: '确认保存仓库分配',
        content: `确定要为 ${userName} 分配以下仓库吗？\n\n${warehouseText}\n\n${selectedIds.length === 0 ? '（将清除该用户的所有仓库分配）' : ''}`,
        confirmText: '确定',
        cancelText: '取消'
      })

      if (!result.confirm) {
        return false
      }

      showLoading({title: '保存中...'})

      try {
        // 获取之前的仓库分配
        let previousAssignments: Array<{warehouse_id: string}> = []
        if (userRole === 'DRIVER') {
          previousAssignments = await WarehousesAPI.getWarehouseAssignmentsByDriver(userId)
        } else if (userRole === 'MANAGER' || isAdminRole(userRole)) {
          previousAssignments = await WarehousesAPI.getWarehouseAssignmentsByManager(userId)
        }
        const previousWarehouseIds = previousAssignments.map((a) => a.warehouse_id)

        // 删除所有仓库分配
        if (userRole === 'DRIVER') {
          await WarehousesAPI.deleteWarehouseAssignmentsByDriver(userId)
        } else if (userRole === 'MANAGER' || isAdminRole(userRole)) {
          await supabase.from('warehouse_assignments').delete().eq('user_id', userId)
        }

        // 添加新的仓库分配
        for (const warehouseId of selectedIds) {
          if (userRole === 'DRIVER') {
            await WarehousesAPI.insertWarehouseAssignment({user_id: userId, warehouse_id: warehouseId})
          } else if (userRole === 'MANAGER' || isAdminRole(userRole)) {
            await WarehousesAPI.insertManagerWarehouseAssignment({manager_id: userId, warehouse_id: warehouseId})
          }
        }

        Taro.hideLoading()
        showToast({title: '保存成功', icon: 'success'})

        // 发送通知
        try {
          const notifications: Array<{
            userId: string
            type: 'warehouse_assigned' | 'warehouse_unassigned'
            title: string
            message: string
            relatedId?: string
          }> = []

          const addedWarehouseIds = selectedIds.filter((id) => !previousWarehouseIds.includes(id))
          const removedWarehouseIds = previousWarehouseIds.filter((id) => !selectedIds.includes(id))

          if (addedWarehouseIds.length > 0 || removedWarehouseIds.length > 0) {
            const addedWarehouseNames = warehouses
              .filter((w) => addedWarehouseIds.includes(w.id))
              .map((w) => w.name)
              .join('、')
            const removedWarehouseNames = warehouses
              .filter((w) => removedWarehouseIds.includes(w.id))
              .map((w) => w.name)
              .join('、')

            let message = ''
            if (addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0) {
              message = `您的仓库分配已更新：\n新增：${addedWarehouseNames}\n移除：${removedWarehouseNames}`
            } else if (addedWarehouseIds.length > 0) {
              message = `您已被分配到新仓库：${addedWarehouseNames}`
            } else {
              message = `您已从以下仓库移除：${removedWarehouseNames}`
            }

            notifications.push({
              userId: userId,
              type: addedWarehouseIds.length > 0 ? 'warehouse_assigned' : 'warehouse_unassigned',
              title: '仓库分配变更通知',
              message: message,
              relatedId: userId
            })
          }

          // 通知相关管理员
          const currentUserProfile = await UsersAPI.getCurrentUserWithRealName()
          if (currentUserProfile && isAdminRole(currentUserProfile.role)) {
            const affectedWarehouseIds = [...new Set([...addedWarehouseIds, ...removedWarehouseIds])]
            const managersSet = new Set<string>()

            for (const warehouseId of affectedWarehouseIds) {
              const managers = await WarehousesAPI.getWarehouseManagers(warehouseId)
              for (const m of managers) {
                managersSet.add(m.id)
              }
            }

            for (const managerId of managersSet) {
              const warehouseNames = warehouses
                .filter((w) => affectedWarehouseIds.includes(w.id))
                .map((w) => w.name)
                .join('、')

              notifications.push({
                userId: managerId,
                type: 'warehouse_assigned',
                title: '仓库分配操作通知',
                message: `老板修改了 ${userName} 的仓库分配，涉及仓库：${warehouseNames}`,
                relatedId: userId
              })
            }
          }

          if (notifications.length > 0) {
            await createNotifications(notifications)
          }
        } catch (error) {
          logger.error('发送通知失败', error)
        }

        return true
      } catch (error) {
        Taro.hideLoading()
        logger.error('保存仓库分配失败', error)
        showToast({title: '保存失败', icon: 'error'})
        return false
      }
    },
    [warehouses, selectedIds]
  )

  // 初始加载仓库列表
  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  return {
    warehouses,
    selectedIds,
    loading,
    loadWarehouses,
    loadUserWarehouses,
    setSelectedIds,
    saveAssignment
  }
}
