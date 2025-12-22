/**
 * Realtime 缓存失效器
 * 监听 Supabase Realtime 数据变更事件，自动触发相关 Repository 的缓存失效
 *
 * 该模块实现了 Realtime 订阅与缓存失效的协同机制：
 * - 监听 notifications 表的 INSERT/UPDATE 事件（高实时性需求）
 * - 监听 vehicles 表的 UPDATE 事件（状态变更）
 * - 收到事件时清除相关 Repository 的缓存
 * - 触发 eventBus 事件通知 UI 更新
 *
 * 使用场景：
 * - 用户登录成功后初始化订阅
 * - 用户登出时清理订阅
 *
 * @module db/realtime/RealtimeCacheInvalidator
 */

import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/client/supabase'
import { eventBus } from '@/utils/eventBus'
import { createLogger } from '@/utils/logger'

// 创建日志记录器
const logger = createLogger('RealtimeCacheInvalidator')

// ==================== 类型定义 ====================

/**
 * 通知表变更事件的数据类型
 */
interface NotificationChangePayload {
  id: string
  recipient_id: string
  is_read?: boolean
  type?: string
  [key: string]: unknown
}

/**
 * 车辆表变更事件的数据类型
 */
interface VehicleChangePayload {
  id: string
  user_id?: string
  status?: string
  review_status?: string
  [key: string]: unknown
}

// ==================== RealtimeCacheInvalidator 类 ====================

/**
 * Realtime 缓存失效器类
 * 管理 Supabase Realtime 订阅，自动触发缓存失效
 *
 * @example
 * ```typescript
 * import { realtimeCacheInvalidator } from '@/db/realtime/RealtimeCacheInvalidator'
 *
 * // 用户登录成功后初始化
 * await realtimeCacheInvalidator.initialize(userId)
 *
 * // 用户登出时清理
 * await realtimeCacheInvalidator.cleanup()
 * ```
 */
class RealtimeCacheInvalidator {
  /** Realtime 频道实例 */
  private channel: RealtimeChannel | null = null

  /** 当前订阅的用户 ID */
  private currentUserId: string | null = null

  /** 是否已初始化 */
  private initialized = false

  /** Repository 实例（延迟加载，避免循环依赖） */
  private repositories: {
    notificationsRepository: { clearAllCache: () => void; clearCacheByUser: (userId: string) => void } | null
    vehiclesRepository: { clearAllCache: () => void } | null
  } = {
    notificationsRepository: null,
    vehiclesRepository: null
  }

  /**
   * 延迟加载 Repository 实例
   * 避免循环依赖问题
   */
  private async loadRepositories(): Promise<void> {
    if (this.repositories.notificationsRepository && this.repositories.vehiclesRepository) {
      return
    }

    try {
      const { notificationsRepository, vehiclesRepository } = await import('@/db/repositories')
      this.repositories.notificationsRepository = notificationsRepository
      this.repositories.vehiclesRepository = vehiclesRepository
      logger.debug('Repository 实例已加载')
    } catch (error) {
      logger.error('加载 Repository 实例失败', error)
    }
  }

  /**
   * 初始化 Realtime 订阅
   * 在用户登录成功后调用
   *
   * @param userId - 当前登录用户的 ID
   *
   * @example
   * ```typescript
   * // 在 AuthProvider 中，用户登录成功后调用
   * await realtimeCacheInvalidator.initialize(user.id)
   * ```
   */
  async initialize(userId: string): Promise<void> {
    // 防止重复初始化
    if (this.initialized && this.currentUserId === userId) {
      logger.warn('Realtime 订阅已初始化，跳过重复初始化', { userId })
      return
    }

    // 如果已有订阅但用户不同，先清理旧订阅
    if (this.initialized && this.currentUserId !== userId) {
      logger.info('用户变更，清理旧的 Realtime 订阅', {
        oldUserId: this.currentUserId,
        newUserId: userId
      })
      await this.cleanup()
    }

    // 加载 Repository 实例
    await this.loadRepositories()

    // 创建 Realtime 频道
    const channelName = `cache-invalidation-${userId}`
    logger.info('初始化 Realtime 缓存失效订阅', { userId, channelName })

    try {
      this.channel = supabase
        .channel(channelName)
        // 监听 notifications 表的 INSERT 事件（新通知）
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${userId}`
          },
          (payload: RealtimePostgresChangesPayload<NotificationChangePayload>) => {
            this.handleNotificationInsert(payload)
          }
        )
        // 监听 notifications 表的 UPDATE 事件（通知状态变更）
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${userId}`
          },
          (payload: RealtimePostgresChangesPayload<NotificationChangePayload>) => {
            this.handleNotificationUpdate(payload)
          }
        )
        // 监听 vehicles 表的 UPDATE 事件（车辆状态变更）
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'vehicles'
          },
          (payload: RealtimePostgresChangesPayload<VehicleChangePayload>) => {
            this.handleVehicleUpdate(payload)
          }
        )
        .subscribe((status) => {
          logger.info('Realtime 订阅状态变更', { status, channelName })
        })

      this.currentUserId = userId
      this.initialized = true
      logger.info('Realtime 缓存失效订阅初始化完成', { userId })
    } catch (error) {
      logger.error('初始化 Realtime 订阅失败', { userId, error })
      throw error
    }
  }

  /**
   * 处理通知 INSERT 事件
   * 清除通知缓存，触发 UI 更新
   *
   * @param payload - Realtime 事件数据
   */
  private handleNotificationInsert(
    payload: RealtimePostgresChangesPayload<NotificationChangePayload>
  ): void {
    const newRecord = payload.new as NotificationChangePayload
    logger.debug('收到通知 INSERT 事件', {
      notificationId: newRecord?.id,
      recipientId: newRecord?.recipient_id,
      type: newRecord?.type
    })

    // 清除通知缓存
    if (this.repositories.notificationsRepository) {
      this.repositories.notificationsRepository.clearAllCache()
      logger.debug('通知缓存已清除（INSERT 事件）')
    }

    // 触发 eventBus 事件，通知 UI 更新
    eventBus.publish('notification:created', {
      notificationId: newRecord?.id,
      recipientId: newRecord?.recipient_id
    })
  }

  /**
   * 处理通知 UPDATE 事件
   * 清除通知缓存，触发 UI 更新
   *
   * @param payload - Realtime 事件数据
   */
  private handleNotificationUpdate(
    payload: RealtimePostgresChangesPayload<NotificationChangePayload>
  ): void {
    const newRecord = payload.new as NotificationChangePayload
    const oldRecord = payload.old as NotificationChangePayload
    logger.debug('收到通知 UPDATE 事件', {
      notificationId: newRecord?.id,
      isRead: newRecord?.is_read,
      wasRead: oldRecord?.is_read
    })

    // 清除通知缓存
    if (this.repositories.notificationsRepository) {
      this.repositories.notificationsRepository.clearAllCache()
      logger.debug('通知缓存已清除（UPDATE 事件）')
    }

    // 判断是否是标记已读操作
    if (newRecord?.is_read && !oldRecord?.is_read) {
      eventBus.publish('notification:read', {
        notificationId: newRecord?.id
      })
    }
  }

  /**
   * 处理车辆 UPDATE 事件
   * 清除车辆缓存，触发 UI 更新
   *
   * @param payload - Realtime 事件数据
   */
  private handleVehicleUpdate(
    payload: RealtimePostgresChangesPayload<VehicleChangePayload>
  ): void {
    const newRecord = payload.new as VehicleChangePayload
    const oldRecord = payload.old as VehicleChangePayload
    logger.debug('收到车辆 UPDATE 事件', {
      vehicleId: newRecord?.id,
      newStatus: newRecord?.status,
      oldStatus: oldRecord?.status,
      newReviewStatus: newRecord?.review_status,
      oldReviewStatus: oldRecord?.review_status
    })

    // 清除车辆缓存
    if (this.repositories.vehiclesRepository) {
      this.repositories.vehiclesRepository.clearAllCache()
      logger.debug('车辆缓存已清除（UPDATE 事件）')
    }

    // 根据状态变更触发不同的事件
    const vehicleId = newRecord?.id

    // 检查审核状态变更
    if (newRecord?.review_status !== oldRecord?.review_status) {
      const reviewStatus = newRecord?.review_status
      if (reviewStatus === 'approved') {
        eventBus.publish('vehicle:approved', { vehicleId })
      } else if (reviewStatus === 'pending') {
        eventBus.publish('vehicle:review_submitted', { vehicleId })
      } else if (reviewStatus === 'supplement_required') {
        eventBus.publish('vehicle:supplement_required', { vehicleId })
      }
    }

    // 检查车辆状态变更
    if (newRecord?.status !== oldRecord?.status) {
      const status = newRecord?.status
      if (status === 'returned') {
        eventBus.publish('vehicle:returned', { vehicleId })
      } else {
        eventBus.publish('vehicle:updated', { vehicleId })
      }
    }
  }

  /**
   * 清理 Realtime 订阅
   * 在用户登出时调用
   *
   * @example
   * ```typescript
   * // 在 smartLogout 函数中调用
   * await realtimeCacheInvalidator.cleanup()
   * ```
   */
  async cleanup(): Promise<void> {
    if (!this.initialized || !this.channel) {
      logger.debug('Realtime 订阅未初始化，跳过清理')
      return
    }

    logger.info('清理 Realtime 缓存失效订阅', { userId: this.currentUserId })

    try {
      // 移除 Realtime 频道
      await supabase.removeChannel(this.channel)
      logger.debug('Realtime 频道已移除')
    } catch (error) {
      logger.error('移除 Realtime 频道失败', error)
    }

    // 重置状态
    this.channel = null
    this.currentUserId = null
    this.initialized = false

    logger.info('Realtime 缓存失效订阅已清理')
  }

  /**
   * 检查是否已初始化
   *
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * 获取当前订阅的用户 ID
   *
   * @returns 当前用户 ID，如果未初始化则返回 null
   */
  getCurrentUserId(): string | null {
    return this.currentUserId
  }
}

// ==================== 单例导出 ====================

/**
 * RealtimeCacheInvalidator 单例实例
 * 推荐使用此实例而非创建新实例
 */
export const realtimeCacheInvalidator = new RealtimeCacheInvalidator()

/**
 * 导出类（用于测试或特殊场景）
 */
export { RealtimeCacheInvalidator }
