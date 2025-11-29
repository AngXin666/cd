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
    console.log('🔔 [通知系统] 开始发送仓库分配通知', {
      司机: driver.name,
      司机ID: driver.id,
      之前的仓库: previousWarehouseIds,
      新的仓库: newWarehouseIds,
      操作者: operatorProfile?.name || '未知',
      操作者角色: operatorProfile?.role || '未知'
    })

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

    console.log('📊 [通知系统] 仓库变更情况', {
      新增的仓库: addedWarehouseIds,
      取消的仓库: removedWarehouseIds,
      是否有变更: addedWarehouseIds.length > 0 || removedWarehouseIds.length > 0
    })

    // 如果没有任何变更，不发送通知
    if (addedWarehouseIds.length === 0 && removedWarehouseIds.length === 0) {
      console.log('ℹ️ [通知系统] 仓库没有变更，不发送通知')
      return true
    }

    // 1. 通知司机（新增仓库）
    if (addedWarehouseIds.length > 0) {
      const addedWarehouseNames = allWarehouses
        .filter((w) => addedWarehouseIds.includes(w.id))
        .map((w) => w.name)
        .join('、')

      console.log('📝 [通知系统] 准备通知司机（新增仓库）', {
        司机ID: driver.id,
        仓库: addedWarehouseNames
      })

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

      console.log('📝 [通知系统] 准备通知司机（取消仓库）', {
        司机ID: driver.id,
        仓库: removedWarehouseNames
      })

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
        console.log('👤 [通知系统] 操作者是普通管理员，准备通知所有超级管理员')

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

        console.log('📝 [通知系统] 准备通知超级管理员', {
          超级管理员数量: superAdmins.length,
          操作描述: operationDesc
        })

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
        console.log('👤 [通知系统] 操作者是超级管理员，准备通知相关仓库的管理员')

        const affectedWarehouseIds = [...new Set([...addedWarehouseIds, ...removedWarehouseIds])]

        console.log('📦 [通知系统] 受影响的仓库', {
          仓库ID列表: affectedWarehouseIds,
          仓库数量: affectedWarehouseIds.length
        })

        const managersSet = new Set<string>()

        for (const warehouseId of affectedWarehouseIds) {
          const managers = await getWarehouseManagers(warehouseId)
          console.log(`📦 [通知系统] 仓库 ${warehouseId} 的管理员`, {
            管理员数量: managers.length,
            管理员: managers.map((m) => m.name)
          })
          for (const m of managers) {
            managersSet.add(m.id)
          }
        }

        console.log('👥 [通知系统] 需要通知的管理员总数', {
          管理员数量: managersSet.size
        })

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

        console.log('📝 [通知系统] 准备通知管理员', {
          管理员数量: managersSet.size,
          操作描述: operationDesc
        })

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
      console.warn('⚠️ [通知系统] 操作者信息为空，无法通知管理员')
    }

    // 批量发送通知
    if (notifications.length > 0) {
      console.log('📤 [通知系统] 准备发送通知', {
        通知数量: notifications.length,
        通知列表: notifications.map((n) => ({
          接收者ID: n.userId,
          类型: n.type,
          标题: n.title,
          消息: n.message
        }))
      })

      const success = await createNotifications(notifications)
      if (success) {
        console.log(`✅ [通知系统] 已成功发送 ${notifications.length} 条仓库分配通知`)
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
    console.log('ℹ️ [通知系统] 没有需要发送的通知（可能是操作者信息缺失）')
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
