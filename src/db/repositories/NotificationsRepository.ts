/**
 * 通知数据 Repository
 * 提供通知的数据访问层，带有缓存支持
 *
 * 功能包括：
 * - 获取用户通知（带缓存，TTL 1 分钟）
 * - 获取未读通知数量（带缓存，TTL 1 分钟）
 * - 创建/标记已读时自动清除缓存
 *
 * @module db/repositories/NotificationsRepository
 */

import { BaseRepository, type BaseEntity, type QueryOptions } from './BaseRepository'
import type { Notification, NotificationInput, NotificationUpdate } from '../types'

// ==================== 缓存配置常量 ====================

/**
 * 通知缓存 TTL：1 分钟
 * 通知需要较高的实时性，使用较短的缓存时间
 */
const NOTIFICATIONS_CACHE_TTL = 1 * 60 * 1000

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = 'notifications'

// ==================== 类型定义 ====================

/**
 * 通知实体接口
 * 继承 BaseEntity 以支持 BaseRepository 的泛型约束
 */
interface NotificationEntity extends Omit<Notification, 'created_at'>, BaseEntity {}

// ==================== NotificationsRepository 类 ====================

/**
 * 通知数据 Repository
 * 提供通知的数据访问，带有缓存支持
 *
 * @example
 * ```typescript
 * import { notificationsRepository } from '@/db/repositories'
 *
 * // 获取用户通知
 * const notifications = await notificationsRepository.getByUser(userId, 20)
 *
 * // 获取未读通知数量
 * const unreadCount = await notificationsRepository.getUnreadCount(userId)
 *
 * // 标记通知为已读
 * await notificationsRepository.markAsRead(notificationId)
 *
 * // 标记所有通知为已读
 * await notificationsRepository.markAllAsRead(userId)
 * ```
 */
export class NotificationsRepository extends BaseRepository<NotificationEntity> {
  /**
   * 创建 NotificationsRepository 实例
   * 配置通知表和缓存设置
   */
  constructor() {
    super({
      tableName: 'notifications',
      cachePrefix: CACHE_PREFIX,
      defaultTTL: NOTIFICATIONS_CACHE_TTL,
      enableCache: true
    })
  }

  // ==================== 查询方法 ====================

  /**
   * 根据用户 ID 获取通知
   * 带缓存支持，TTL 1 分钟
   *
   * @param userId - 用户 ID
   * @param limit - 返回数量限制（默认 50）
   * @param options - 查询选项
   * @returns 用户的通知列表
   *
   * @example
   * ```typescript
   * // 获取用户最近 20 条通知
   * const notifications = await notificationsRepository.getByUser('user-123', 20)
   *
   * // 获取用户所有通知（不使用缓存）
   * const notifications = await notificationsRepository.getByUser('user-123', 100, { useCache: false })
   * ```
   */
  async getByUser(
    userId: string,
    limit: number = 50,
    options: QueryOptions = {}
  ): Promise<Notification[]> {
    const { useCache = true, cacheTTL = NOTIFICATIONS_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`user_${userId}_limit_${limit}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<Notification[]>(cacheKey)
      if (cached) {
        this.logger.debug('用户通知缓存命中', { userId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询用户通知', { userId, limit })
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error('获取用户通知失败', { userId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('用户通知已缓存', { userId, count: result.length })
    }

    return result as Notification[]
  }

  /**
   * 获取用户未读通知数量
   * 带缓存支持，TTL 1 分钟
   *
   * @param userId - 用户 ID
   * @param options - 查询选项
   * @returns 未读通知数量
   *
   * @example
   * ```typescript
   * const unreadCount = await notificationsRepository.getUnreadCount('user-123')
   * console.log(`有 ${unreadCount} 条未读通知`)
   * ```
   */
  async getUnreadCount(userId: string, options: QueryOptions = {}): Promise<number> {
    const { useCache = true, cacheTTL = NOTIFICATIONS_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`unread_count_${userId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<number>(cacheKey)
      if (cached !== null) {
        this.logger.debug('未读通知数量缓存命中', { userId, count: cached })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询未读通知数量', { userId })
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) {
      this.logger.error('获取未读通知数量失败', { userId, error: error.message })
      return 0
    }

    const result = count ?? 0

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('未读通知数量已缓存', { userId, count: result })
    }

    return result
  }

  /**
   * 获取用户未读通知列表
   *
   * @param userId - 用户 ID
   * @param limit - 返回数量限制
   * @param options - 查询选项
   * @returns 未读通知列表
   */
  async getUnreadByUser(
    userId: string,
    limit: number = 50,
    options: QueryOptions = {}
  ): Promise<Notification[]> {
    const { useCache = true, cacheTTL = NOTIFICATIONS_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`unread_${userId}_limit_${limit}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<Notification[]>(cacheKey)
      if (cached) {
        this.logger.debug('用户未读通知缓存命中', { userId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询用户未读通知', { userId, limit })
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error('获取用户未读通知失败', { userId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as Notification[]
  }

  /**
   * 根据 ID 获取通知
   *
   * @param id - 通知 ID
   * @param options - 查询选项
   * @returns 通知，如果不存在则返回 null
   */
  async getNotificationById(id: string, options: QueryOptions = {}): Promise<Notification | null> {
    const { useCache = true, cacheTTL = NOTIFICATIONS_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`id_${id}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<Notification>(cacheKey)
      if (cached) {
        this.logger.debug('通知缓存命中', { id })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询通知', { id })
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      this.logger.error('获取通知失败', { id, error: error.message })
      return null
    }

    // 缓存结果
    if (useCache && data) {
      this.setToCache(cacheKey, data, cacheTTL)
    }

    return data as Notification | null
  }

  // ==================== 写操作方法 ====================

  /**
   * 创建通知
   * 创建成功后自动清除相关缓存
   *
   * @param input - 通知输入数据
   * @returns 创建的通知，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const notification = await notificationsRepository.createNotification({
   *   title: '新消息',
   *   content: '您有一条新的消息',
   *   recipient_id: 'user-123',
   *   type: 'message'
   * })
   * ```
   */
  async createNotification(input: NotificationInput): Promise<Notification | null> {
    this.logger.debug('创建通知', { recipientId: input.recipient_id, title: input.title })

    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        title: input.title,
        content: input.content,
        type: input.type || 'system',
        sender_id: input.sender_id,
        recipient_id: input.recipient_id,
        related_id: input.related_id,
        approval_status: input.approval_status,
        batch_id: input.batch_id,
        parent_notification_id: input.parent_notification_id,
        is_read: false
      })
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('创建通知失败', { input, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('通知创建成功', { id: (data as Notification)?.id })
    return data as Notification | null
  }

  /**
   * 标记通知为已读
   * 更新成功后自动清除相关缓存
   *
   * @param id - 通知 ID
   * @returns 是否标记成功
   *
   * @example
   * ```typescript
   * const success = await notificationsRepository.markAsRead('notification-123')
   * ```
   */
  async markAsRead(id: string): Promise<boolean> {
    this.logger.debug('标记通知为已读', { id })

    const { error } = await this.supabase
      .from('notifications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      this.logger.error('标记通知为已读失败', { id, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('通知已标记为已读', { id })
    return true
  }

  /**
   * 标记用户所有通知为已读
   * 更新成功后自动清除相关缓存
   *
   * @param userId - 用户 ID
   * @returns 是否标记成功
   *
   * @example
   * ```typescript
   * const success = await notificationsRepository.markAllAsRead('user-123')
   * ```
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    this.logger.debug('标记用户所有通知为已读', { userId })

    const { error } = await this.supabase
      .from('notifications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) {
      this.logger.error('标记所有通知为已读失败', { userId, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('用户所有通知已标记为已读', { userId })
    return true
  }

  /**
   * 更新通知
   * 更新成功后自动清除相关缓存
   *
   * @param id - 通知 ID
   * @param update - 更新数据
   * @returns 更新后的通知，如果失败则返回 null
   */
  async updateNotification(id: string, update: NotificationUpdate): Promise<Notification | null> {
    this.logger.debug('更新通知', { id, update })

    const { data, error } = await this.supabase
      .from('notifications')
      .update({
        ...update,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('更新通知失败', { id, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('通知更新成功', { id })
    return data as Notification | null
  }

  /**
   * 删除通知
   * 删除成功后自动清除相关缓存
   *
   * @param id - 通知 ID
   * @returns 是否删除成功
   */
  async deleteNotification(id: string): Promise<boolean> {
    this.logger.debug('删除通知', { id })

    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      this.logger.error('删除通知失败', { id, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('通知删除成功', { id })
    return true
  }

  /**
   * 批量创建通知
   * 创建成功后自动清除相关缓存
   *
   * @param inputs - 通知输入数据数组
   * @returns 创建的通知数组
   */
  async createNotifications(inputs: NotificationInput[]): Promise<Notification[]> {
    if (inputs.length === 0) {
      return []
    }

    this.logger.debug('批量创建通知', { count: inputs.length })

    const notifications = inputs.map(input => ({
      title: input.title,
      content: input.content,
      type: input.type || 'system',
      sender_id: input.sender_id,
      recipient_id: input.recipient_id,
      related_id: input.related_id,
      approval_status: input.approval_status,
      batch_id: input.batch_id,
      parent_notification_id: input.parent_notification_id,
      is_read: false
    }))

    const { data, error } = await this.supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      this.logger.error('批量创建通知失败', { error: error.message })
      return []
    }

    // 清除相关缓存
    this.invalidateCache()

    const result = Array.isArray(data) ? data : []
    this.logger.info('批量创建通知成功', { count: result.length })
    return result as Notification[]
  }

  // ==================== 公开缓存管理方法 ====================

  /**
   * 清除所有通知缓存
   * 供外部调用（如 Realtime 事件处理器）
   */
  public clearAllCache(): void {
    this.invalidateCache()
    this.logger.info('通知缓存已清除（外部调用）')
  }

  /**
   * 清除特定用户的通知缓存
   *
   * @param userId - 用户 ID
   */
  public clearCacheByUser(userId: string): void {
    // 清除用户相关的缓存键
    const { clearCacheByPrefix } = require('@/utils/cache')
    clearCacheByPrefix(`${CACHE_PREFIX}_user_${userId}`)
    clearCacheByPrefix(`${CACHE_PREFIX}_unread_${userId}`)
    clearCacheByPrefix(`${CACHE_PREFIX}_unread_count_${userId}`)
    this.logger.info('用户通知缓存已清除', { userId })
  }
}

// ==================== 单例导出 ====================

/**
 * NotificationsRepository 单例实例
 * 推荐使用此实例而非创建新实例
 */
export const notificationsRepository = new NotificationsRepository()
