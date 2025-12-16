/**
 * 通知防抖工具函数
 * 用于防止短时间内多个 Realtime 事件触发多次通知
 *
 * 使用场景：
 * - 管理员收到多个司机同时提交的请假申请
 * - 司机收到多个审批结果通知
 * - 批量操作触发的多个数据变更事件
 *
 * @module utils/notificationDebounce
 */

import {showInfo, showSuccess, showWarning} from './toast'

/** 默认防抖时间：3秒 */
const DEFAULT_DEBOUNCE_MS = 3000

/** 通知类型定义 */
export type NotificationType =
  | 'leave_application' // 请假申请
  | 'resignation_application' // 离职申请
  | 'vehicle_review' // 车辆审核
  | 'warehouse_assignment' // 仓库分配
  | 'attendance' // 考勤记录
  | 'piece_work' // 计件记录
  | 'permission_update' // 权限更新
  | 'general' // 通用通知

/** 通知配置接口 */
export interface NotificationConfig {
  /** 通知类型 */
  type: NotificationType
  /** 通知消息（单条） */
  message: string
  /** 批量通知消息模板（用于多条合并时，{count} 会被替换为数量） */
  batchMessage?: string
  /** Toast 类型 */
  toastType?: 'success' | 'info' | 'warning'
}

/** 待处理通知存储 */
interface PendingNotification {
  /** 通知配置 */
  config: NotificationConfig
  /** 累计数量 */
  count: number
  /** 定时器 ID */
  timerId: ReturnType<typeof setTimeout> | null
}

/** 按通知类型存储待处理通知 */
const pendingNotifications: Map<NotificationType, PendingNotification> = new Map()

/**
 * 显示 Toast 通知
 * @param message - 通知消息
 * @param toastType - Toast 类型
 */
function displayToast(message: string, toastType: 'success' | 'info' | 'warning' = 'info'): void {
  switch (toastType) {
    case 'success':
      showSuccess(message)
      break
    case 'warning':
      showWarning(message)
      break
    default:
      showInfo(message)
      break
  }
}

/**
 * 执行通知显示
 * 根据累计数量决定显示单条消息还是批量消息
 * @param type - 通知类型
 */
function flushNotification(type: NotificationType): void {
  const pending = pendingNotifications.get(type)
  if (!pending) {
    return
  }

  const {config, count} = pending

  // 根据数量决定显示的消息
  let message: string
  if (count > 1 && config.batchMessage) {
    // 多条通知，使用批量消息模板
    message = config.batchMessage.replace('{count}', String(count))
  } else {
    // 单条通知，使用普通消息
    message = config.message
  }

  // 显示 Toast
  displayToast(message, config.toastType)

  // 清理待处理通知
  pendingNotifications.delete(type)

  console.log(`📬 [NotificationDebounce] 显示通知: ${type}, 数量: ${count}, 消息: ${message}`)
}

/**
 * 发送防抖通知
 * 在防抖时间内的多个相同类型通知会被合并
 *
 * @param config - 通知配置
 * @param debounceMs - 防抖时间（毫秒），默认 3000ms
 *
 * @example
 * ```typescript
 * // 单条通知
 * sendDebouncedNotification({
 *   type: 'leave_application',
 *   message: '收到新的请假申请',
 *   batchMessage: '收到 {count} 条新的请假申请',
 *   toastType: 'info'
 * })
 *
 * // 如果 3 秒内再次调用，会合并显示
 * sendDebouncedNotification({
 *   type: 'leave_application',
 *   message: '收到新的请假申请',
 *   batchMessage: '收到 {count} 条新的请假申请',
 *   toastType: 'info'
 * })
 * // 最终显示: "收到 2 条新的请假申请"
 * ```
 */
export function sendDebouncedNotification(config: NotificationConfig, debounceMs: number = DEFAULT_DEBOUNCE_MS): void {
  const {type} = config
  const existing = pendingNotifications.get(type)

  if (existing) {
    // 已有待处理通知，增加计数
    existing.count += 1
    existing.config = config // 更新配置（使用最新的消息）

    console.log(`📥 [NotificationDebounce] 合并通知: ${type}, 当前数量: ${existing.count}`)
  } else {
    // 创建新的待处理通知
    const pending: PendingNotification = {
      config,
      count: 1,
      timerId: null
    }

    // 设置定时器，在防抖时间后显示通知
    pending.timerId = setTimeout(() => {
      flushNotification(type)
    }, debounceMs)

    pendingNotifications.set(type, pending)

    console.log(`📥 [NotificationDebounce] 新建通知: ${type}, 防抖时间: ${debounceMs}ms`)
  }
}

/**
 * 立即显示指定类型的待处理通知
 * 用于需要立即显示通知的场景（如页面卸载前）
 *
 * @param type - 通知类型
 */
export function flushNotificationImmediately(type: NotificationType): void {
  const pending = pendingNotifications.get(type)
  if (pending?.timerId) {
    clearTimeout(pending.timerId)
    pending.timerId = null
  }
  flushNotification(type)
}

/**
 * 立即显示所有待处理通知
 * 用于需要立即显示所有通知的场景（如应用退出前）
 */
export function flushAllNotificationsImmediately(): void {
  for (const [type, pending] of pendingNotifications.entries()) {
    if (pending.timerId) {
      clearTimeout(pending.timerId)
      pending.timerId = null
    }
    flushNotification(type)
  }
}

/**
 * 取消指定类型的待处理通知
 * 用于取消不再需要的通知
 *
 * @param type - 通知类型
 */
export function cancelPendingNotification(type: NotificationType): void {
  const pending = pendingNotifications.get(type)
  if (pending?.timerId) {
    clearTimeout(pending.timerId)
  }
  pendingNotifications.delete(type)

  console.log(`🚫 [NotificationDebounce] 取消通知: ${type}`)
}

/**
 * 取消所有待处理通知
 * 用于清理所有待处理通知
 */
export function cancelAllPendingNotifications(): void {
  for (const [_type, pending] of pendingNotifications.entries()) {
    if (pending.timerId) {
      clearTimeout(pending.timerId)
    }
  }
  pendingNotifications.clear()

  console.log(`🚫 [NotificationDebounce] 取消所有通知`)
}

/**
 * 获取指定类型的待处理通知数量
 * 用于调试和测试
 *
 * @param type - 通知类型
 * @returns 待处理通知数量，如果没有则返回 0
 */
export function getPendingNotificationCount(type: NotificationType): number {
  return pendingNotifications.get(type)?.count ?? 0
}

/**
 * 检查是否有指定类型的待处理通知
 *
 * @param type - 通知类型
 * @returns 是否有待处理通知
 */
export function hasPendingNotification(type: NotificationType): boolean {
  return pendingNotifications.has(type)
}

// ==================== 预定义通知配置 ====================

/**
 * 预定义的通知配置
 * 提供常用场景的快捷方法
 */
export const NotificationPresets = {
  /**
   * 新请假申请通知（管理员收到）
   */
  newLeaveApplication: (): NotificationConfig => ({
    type: 'leave_application',
    message: '收到新的请假申请',
    batchMessage: '收到 {count} 条新的请假申请',
    toastType: 'info'
  }),

  /**
   * 新离职申请通知（管理员收到）
   */
  newResignationApplication: (): NotificationConfig => ({
    type: 'resignation_application',
    message: '收到新的离职申请',
    batchMessage: '收到 {count} 条新的离职申请',
    toastType: 'info'
  }),

  /**
   * 新车辆审核请求通知（管理员收到）
   */
  newVehicleReview: (): NotificationConfig => ({
    type: 'vehicle_review',
    message: '收到新的车辆审核请求',
    batchMessage: '收到 {count} 条新的车辆审核请求',
    toastType: 'info'
  }),

  /**
   * 车辆审核结果通知（司机收到）
   * @param status - 审核状态：'approved' | 'supplement_required'
   */
  vehicleReviewResult: (status: 'approved' | 'supplement_required'): NotificationConfig => ({
    type: 'vehicle_review',
    message: status === 'approved' ? '您的车辆审核已通过' : '您的车辆需要补录信息',
    toastType: status === 'approved' ? 'success' : 'warning'
  }),

  /**
   * 仓库分配变更通知（司机收到）
   */
  warehouseAssignmentChanged: (): NotificationConfig => ({
    type: 'warehouse_assignment',
    message: '您的仓库分配已更新',
    toastType: 'info'
  }),

  /**
   * 权限更新通知
   */
  permissionUpdated: (): NotificationConfig => ({
    type: 'permission_update',
    message: '您的权限已更新',
    toastType: 'info'
  }),

  /**
   * 通用数据更新通知
   * @param message - 自定义消息
   */
  dataUpdated: (message: string): NotificationConfig => ({
    type: 'general',
    message,
    toastType: 'info'
  })
}

/**
 * 导出默认防抖时间常量
 */
export const NOTIFICATION_DEBOUNCE_MS = DEFAULT_DEBOUNCE_MS

/**
 * 导出通知防抖工具对象
 */
export const notificationDebounce = {
  send: sendDebouncedNotification,
  flush: flushNotificationImmediately,
  flushAll: flushAllNotificationsImmediately,
  cancel: cancelPendingNotification,
  cancelAll: cancelAllPendingNotifications,
  getPendingCount: getPendingNotificationCount,
  hasPending: hasPendingNotification,
  presets: NotificationPresets
}

export default notificationDebounce
