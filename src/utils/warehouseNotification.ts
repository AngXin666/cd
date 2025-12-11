/**
 * 仓库分配通知工具函数
 * 用于在不同页面发送仓库分配相关的通知
 */

import {showToast} from '@tarojs/taro'
import {getAllSuperAdmins, getWarehouseManagers} from '@/db/api'
import {createNotifications} from '@/db/notificationApi'
import type {Profile, Warehouse} from '@/db/types'

/**
 * 发送仓库分配通知
 * @param driver 司机信息
 * @param previousWarehouseIds 之前的仓库ID列表
 * @param newWarehouseIds 新的仓库ID列表
 * @param allWarehouses 所有仓库列表
 * @param operatorProfile 操作者信息
 */
export const sendWarehouseAssignmentNotifications = async (
  driver: Profile,
  previousWarehouseIds: string[],
  newWarehouseIds: string[],
  allWarehouses: Warehouse[],
  operatorProfile: Profile | null
) => {
  try {
    const notifications: Array<{
      userId: string
      type: 'warehouse_assigned' | 'warehouse_unassigned'
      title: string
      message: string
      relatedId?: string
    }> = []

    // 判断是新增还是取消仓库
    const addedWarehouseIds = newWarehouseIds.filter((id) => !previousWarehouseIds.includes(id))
    const removedWarehouseIds = previousWarehouseIds.filter((id) => !newWarehouseIds.includes(id))

    // 如果没有任何变更，不发送通知
    if (addedWarehouseIds.length === 0 && removedWarehouseIds.length === 0) {
      return true
    }

    // 1. 通知司机（新增仓库）
    if (addedWarehouseIds.length > 0) {
      const addedWarehouseNames = allWarehouses
        .filter((w) => addedWarehouseIds.includes(w.id))
        .map((w) => w.name)
        .join('、')

      notifications.push({
        userId: driver.id,
        type: 'warehouse_assigned',
        title: '仓库分配通知',
        message: `您已被分配到新的仓库：${addedWarehouseNames}`,
        relatedId: driver.id
      })
    }

    // 2. 通知司机（取消仓库）
    if (removedWarehouseIds.length > 0) {
      const removedWarehouseNames = allWarehouses
        .filter((w) => removedWarehouseIds.includes(w.id))
        .map((w) => w.name)
        .join('、')

      notifications.push({
        userId: driver.id,
        type: 'warehouse_unassigned',
        title: '仓库取消分配通知',
        message: `您已被取消以下仓库的分配：${removedWarehouseNames}`,
        relatedId: driver.id
      })
    }

    // 3. 通知相关管理员
    if (operatorProfile) {
      if (operatorProfile.role === 'MANAGER') {
        // 普通管理员操作 → 通知所有超级管理员

        const superAdmins = await getAllSuperAdmins()
        const operationDesc =
          addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0
            ? '修改了仓库分配'
            : addedWarehouseIds.length > 0
              ? '分配了新仓库'
              : '取消了仓库分配'

        const warehouseDesc =
          addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0
            ? `新增：${allWarehouses
                .filter((w) => addedWarehouseIds.includes(w.id))
                .map((w) => w.name)
                .join('、')}；取消：${allWarehouses
                .filter((w) => removedWarehouseIds.includes(w.id))
                .map((w) => w.name)
                .join('、')}`
            : addedWarehouseIds.length > 0
              ? allWarehouses
                  .filter((w) => addedWarehouseIds.includes(w.id))
                  .map((w) => w.name)
                  .join('、')
              : allWarehouses
                  .filter((w) => removedWarehouseIds.includes(w.id))
                  .map((w) => w.name)
                  .join('、')

        for (const admin of superAdmins) {
          notifications.push({
            userId: admin.id,
            type: 'warehouse_assigned',
            title: '仓库分配操作通知',
            message: `管理员 ${operatorProfile.name} ${operationDesc}：司机 ${driver.name}，仓库 ${warehouseDesc}`,
            relatedId: driver.id
          })
        }
      } else if (operatorProfile.role === 'BOSS') {
        // 超级管理员操作 → 通知相关仓库的普通管理员

        const affectedWarehouseIds = [...new Set([...addedWarehouseIds, ...removedWarehouseIds])]

        const managersSet = new Set<string>()

        for (const warehouseId of affectedWarehouseIds) {
          const managers = await getWarehouseManagers(warehouseId)
          for (const m of managers) {
            managersSet.add(m.id)
          }
        }

        const operationDesc =
          addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0
            ? '修改了仓库分配'
            : addedWarehouseIds.length > 0
              ? '分配了新仓库'
              : '取消了仓库分配'

        const warehouseDesc =
          addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0
            ? `新增：${allWarehouses
                .filter((w) => addedWarehouseIds.includes(w.id))
                .map((w) => w.name)
                .join('、')}；取消：${allWarehouses
                .filter((w) => removedWarehouseIds.includes(w.id))
                .map((w) => w.name)
                .join('、')}`
            : addedWarehouseIds.length > 0
              ? allWarehouses
                  .filter((w) => addedWarehouseIds.includes(w.id))
                  .map((w) => w.name)
                  .join('、')
              : allWarehouses
                  .filter((w) => removedWarehouseIds.includes(w.id))
                  .map((w) => w.name)
                  .join('、')

        for (const managerId of managersSet) {
          notifications.push({
            userId: managerId,
            type: 'warehouse_assigned',
            title: '仓库分配操作通知',
            message: `超级管理员 ${operatorProfile.name} ${operationDesc}：司机 ${driver.name}，仓库 ${warehouseDesc}`,
            relatedId: driver.id
          })
        }
      }
    } else {
    }

    // 批量发送通知
    if (notifications.length > 0) {
      const success = await createNotifications(notifications)
      if (success) {
        return true
      }
      console.error('❌ [通知系统] 发送通知失败')
      showToast({
        title: '通知发送失败',
        icon: 'none',
        duration: 2000
      })
      return false
    }
    return true
  } catch (error) {
    console.error('❌ [通知系统] 发送通知异常', error)
    showToast({
      title: '通知发送异常',
      icon: 'none',
      duration: 2000
    })
    return false
  }
}
