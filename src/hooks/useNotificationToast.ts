/**
 * 通知 Toast 弹窗 Hook
 * 当收到新通知时，自动弹出 Toast 提示用户
 *
 * 功能：
 * - 订阅实时通知（复用 subscribeToNotifications）
 * - 收到新通知时弹出 Toast
 * - 统一使用通知的 content 字段作为 Toast 消息（消息已在创建时通过 notificationMessageBuilder 组装）
 * - 支持防抖合并，多条通知整合显示
 * - 使用通知 ID 去重，避免重复显示
 *
 * v1.3.18 更新：
 * - 移除硬编码的消息映射，统一使用 content 字段
 * - 所有通知消息格式由 notificationMessageBuilder 在创建时组装
 *
 * @module hooks/useNotificationToast
 */

import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef} from 'react'
import type {Notification} from '@/db/notificationApi'
import {subscribeToNotifications} from '@/db/notificationApi'
import {createLogger} from '@/utils/logger'

const logger = createLogger('NotificationToast')

/** 防抖时间（毫秒），在此时间内的通知会被合并 */
const DEBOUNCE_MS = 2000

/** 已处理的通知 ID 集合，用于去重（5分钟内不重复显示同一通知） */
const processedNotificationIds = new Set<string>()

/** 清理已处理通知 ID 的定时器 */
let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * 初始化清理定时器
 * 每 5 分钟清理一次已处理的通知 ID
 */
function initCleanupTimer(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(
    () => {
      processedNotificationIds.clear()
      console.log('🧹 [NotificationToast] 清理已处理通知 ID 缓存')
    },
    5 * 60 * 1000
  ) // 5 分钟
}

/**
 * 检查通知是否已处理过
 * @param notificationId - 通知 ID
 * @returns 是否已处理
 */
function isNotificationProcessed(notificationId: string): boolean {
  return processedNotificationIds.has(notificationId)
}

/**
 * 标记通知为已处理
 * @param notificationId - 通知 ID
 */
function markNotificationAsProcessed(notificationId: string): void {
  processedNotificationIds.add(notificationId)
}

/**
 * 通知类型分组配置
 * 用于合并显示时的分类
 */
const NOTIFICATION_GROUPS = {
  // 司机端 - 审批结果
  leave_result: ['leave_approved', 'leave_rejected'],
  resignation_result: ['resignation_approved', 'resignation_rejected'],
  vehicle_result: ['vehicle_review_approved', 'vehicle_review_need_supplement'],
  // 管理端 - 新申请
  leave_application: ['leave_application_submitted'],
  resignation_application: ['resignation_application_submitted'],
  vehicle_application: ['vehicle_review_pending']
} as const

/**
 * 根据通知类型获取分组名称
 * @param type - 通知类型
 * @returns 分组名称
 */
function getNotificationGroup(type: string): string {
  for (const [group, types] of Object.entries(NOTIFICATION_GROUPS)) {
    if ((types as readonly string[]).includes(type)) {
      return group
    }
  }
  return 'other'
}

/**
 * 根据单条通知获取 Toast 提示内容
 *
 * 统一使用通知的 content 字段作为 Toast 消息
 * 所有通知消息已在创建时通过 notificationMessageBuilder 组装完成
 * 包含完整的司机信息、审批人信息、操作者信息等
 *
 * @param notification - 通知对象
 * @returns Toast 提示内容
 */
function getSingleToastMessage(notification: Notification): string {
  // 优先使用 content 字段（包含完整的格式化消息）
  // 所有通知消息已在创建时通过 notificationMessageBuilder 组装
  if (notification.content) {
    return notification.content
  }

  // 如果 content 为空，使用 title 作为备用
  if (notification.title) {
    return notification.title
  }

  // 最后的兜底消息
  return '您有新的通知'
}

/**
 * 根据多条通知生成合并后的 Toast 提示内容
 * @param notifications - 通知列表
 * @returns 合并后的提示内容
 */
function getMergedToastMessage(notifications: Notification[]): string {
  // 只有一条通知，直接返回单条消息
  if (notifications.length === 1) {
    return getSingleToastMessage(notifications[0])
  }

  // 按分组统计通知数量
  const groupCounts = new Map<string, number>()
  for (const notification of notifications) {
    const group = getNotificationGroup(notification.type)
    groupCounts.set(group, (groupCounts.get(group) || 0) + 1)
  }

  // 生成合并消息
  const messages: string[] = []

  // 司机端消息
  if (groupCounts.has('leave_result')) {
    messages.push('请假审批结果')
  }
  if (groupCounts.has('resignation_result')) {
    messages.push('离职审批结果')
  }
  if (groupCounts.has('vehicle_result')) {
    messages.push('车辆审核结果')
  }

  // 管理端消息
  const leaveCount = groupCounts.get('leave_application') || 0
  const resignationCount = groupCounts.get('resignation_application') || 0
  const vehicleCount = groupCounts.get('vehicle_application') || 0

  if (leaveCount > 0) {
    messages.push(leaveCount > 1 ? `${leaveCount}条请假申请` : '请假申请')
  }
  if (resignationCount > 0) {
    messages.push(resignationCount > 1 ? `${resignationCount}条离职申请` : '离职申请')
  }
  if (vehicleCount > 0) {
    messages.push(vehicleCount > 1 ? `${vehicleCount}条车辆审核` : '车辆审核')
  }

  // 其他通知
  const otherCount = groupCounts.get('other') || 0
  if (otherCount > 0) {
    messages.push(`${otherCount}条其他通知`)
  }

  // 组合消息
  if (messages.length === 0) {
    return `您有${notifications.length}条新通知`
  }

  return `您有新的${messages.join('、')}`
}

/**
 * Toast 队列管理器
 * 使用类来封装状态，避免模块级变量在组件间共享导致的问题
 */
class ToastQueueManager {
  /** 待处理的通知队列 */
  private pendingNotifications: Notification[] = []

  /** 防抖定时器 */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 执行 Toast 显示
   * 将队列中的通知合并显示
   */
  flush(): void {
    if (this.pendingNotifications.length === 0) {
      return
    }

    // 获取合并后的消息
    const message = getMergedToastMessage(this.pendingNotifications)

    // 标记所有通知为已处理
    this.pendingNotifications.forEach((n) => markNotificationAsProcessed(n.id))

    // 显示 Toast（不使用 icon，避免与 loading 冲突）
    Taro.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    })

    logger.info('显示通知 Toast', {
      count: this.pendingNotifications.length,
      types: this.pendingNotifications.map((n) => n.type),
      message
    })
    console.log('🔔 [NotificationToast] 显示 Toast:', message)

    // 清空队列
    this.pendingNotifications = []
  }

  /**
   * 添加通知到队列并启动防抖
   * @param notification - 通知对象
   * @returns 是否成功添加（如果已处理过则返回 false）
   */
  queue(notification: Notification): boolean {
    // 检查是否已处理过该通知
    if (isNotificationProcessed(notification.id)) {
      console.log('⏭️ [NotificationToast] 跳过已处理的通知:', notification.id)
      return false
    }

    // 检查队列中是否已存在该通知
    if (this.pendingNotifications.some((n) => n.id === notification.id)) {
      console.log('⏭️ [NotificationToast] 跳过队列中已存在的通知:', notification.id)
      return false
    }

    // 添加到队列
    this.pendingNotifications.push(notification)

    logger.info('通知加入队列', {
      type: notification.type,
      queueLength: this.pendingNotifications.length
    })
    console.log('📬 [NotificationToast] 通知加入队列:', notification.type, notification.id)

    // 清除之前的定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // 设置新的防抖定时器
    this.debounceTimer = setTimeout(() => {
      this.flush()
      this.debounceTimer = null
    }, DEBOUNCE_MS)

    return true
  }

  /**
   * 清理队列和定时器
   */
  clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.pendingNotifications = []
  }
}

/**
 * 通知 Toast Hook
 * 在组件中使用此 Hook 来订阅通知并自动弹出 Toast
 *
 * @param userId - 用户 ID
 * @param enabled - 是否启用，默认 true
 *
 * @example
 * ```tsx
 * // 在需要显示通知 Toast 的页面中使用
 * const { user } = useAuth()
 * useNotificationToast(user?.id)
 * ```
 */
export function useNotificationToast(userId: string | undefined, enabled: boolean = true): void {
  // 使用 ref 存储取消订阅函数
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // 使用 ref 存储队列管理器，确保每个 Hook 实例有独立的队列
  const queueManagerRef = useRef<ToastQueueManager | null>(null)

  // 初始化队列管理器
  if (!queueManagerRef.current) {
    queueManagerRef.current = new ToastQueueManager()
  }

  // 处理新通知的回调
  const handleNewNotification = useCallback((notification: Notification) => {
    console.log('🔔 [NotificationToast] 收到新通知', {
      id: notification.id,
      type: notification.type,
      title: notification.title
    })
    // 加入队列，防抖合并显示
    queueManagerRef.current?.queue(notification)
  }, [])

  // 处理通知更新的回调（不再触发 Toast，避免重复）
  const handleNotificationUpdate = useCallback((notification: Notification) => {
    console.log('🔔 [NotificationToast] 收到通知更新（不触发 Toast）', {
      id: notification.id,
      type: notification.type,
      status: notification.approval_status
    })
    // 注意：UPDATE 事件不再触发 Toast，因为 INSERT 已经触发过了
    // 如果需要在审批结果变化时通知用户，应该由审批操作创建新的通知
  }, [])

  useEffect(() => {
    // 初始化清理定时器
    initCleanupTimer()

    // 如果未启用或没有用户 ID，不订阅
    if (!enabled || !userId) {
      logger.info('通知 Toast 未启用', {enabled, userId: userId || '(无)'})
      console.log('🔕 [NotificationToast] 未启用', {enabled, userId: userId || '(无)'})
      return
    }

    // 如果已有订阅，先取消
    if (unsubscribeRef.current) {
      logger.info('取消旧的通知订阅')
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    logger.info('🔔 开始订阅通知 Toast', {userId})
    console.log('🔔 [NotificationToast] 开始订阅通知 Toast', {userId})

    // 使用 subscribeToNotifications 函数订阅
    // 使用 'toast' 后缀来区分与通知页面的订阅
    const unsubscribe = subscribeToNotifications(
      userId,
      handleNewNotification,
      handleNotificationUpdate,
      'toast' // 使用固定的后缀，确保 Toast 订阅是唯一的
    )

    unsubscribeRef.current = unsubscribe

    // 清理函数
    return () => {
      // 清理队列管理器
      queueManagerRef.current?.clear()

      if (unsubscribeRef.current) {
        logger.info('🔕 取消通知 Toast 订阅')
        console.log('🔕 [NotificationToast] 取消订阅')
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [userId, enabled, handleNewNotification, handleNotificationUpdate])
}

export default useNotificationToast
