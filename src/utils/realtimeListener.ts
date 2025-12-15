/**
 * 实时更新监听器
 * 监听 Supabase Realtime 事件，触发缓存更新
 *
 * @module utils/realtimeListener
 * @feature user-list-cache-optimization
 */

import type {RealtimeChannel} from '@supabase/supabase-js'
import {supabase} from '@/client/supabase'

/**
 * 实时事件类型
 */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * 实时事件接口
 */
export interface RealtimeEvent {
  /** 事件类型 */
  type: RealtimeEventType
  /** 表名 */
  table: string
  /** 变更的数据 */
  record: any
  /** 旧数据（UPDATE 和 DELETE 时） */
  old?: any
}

/**
 * 实时监听器配置选项
 */
export interface RealtimeListenerOptions {
  /** 监听的表名数组 */
  tables: string[]
  /** 变更回调函数 */
  onChange: (event: RealtimeEvent) => void
  /** 错误回调函数 */
  onError?: (error: Error) => void
}

/**
 * 实时更新监听器类
 * 监听 Supabase Realtime 事件
 */
export class RealtimeListener {
  /** Realtime 订阅通道 */
  private subscription: RealtimeChannel | null = null

  /** 是否正在监听 */
  private isActive = false

  /** Realtime 重连定时器 */
  private reconnectTimer: NodeJS.Timeout | null = null

  /** 配置选项 */
  private options: RealtimeListenerOptions

  /**
   * 构造函数
   * @param options - 监听器配置选项
   */
  constructor(options: RealtimeListenerOptions) {
    this.options = options
  }

  /**
   * 开始监听
   */
  start(): void {
    if (this.isActive) {
      console.log('[RealtimeListener] 已在监听中，跳过')
      return
    }

    this.isActive = true
    console.log('[RealtimeListener] 开始监听...')

    // 启动 Realtime 监听
    try {
      this.startRealtime()
    } catch (error) {
      console.error('[RealtimeListener] Realtime 启动失败:', error)
      this.options.onError?.(error as Error)
    }
  }

  /**
   * 停止监听
   * 清理所有订阅和定时器
   */
  stop(): void {
    if (!this.isActive) {
      return
    }

    this.isActive = false
    console.log('[RealtimeListener] 停止监听')

    // 停止 Realtime 监听
    if (this.subscription) {
      supabase.removeChannel(this.subscription)
      this.subscription = null
    }

    // 停止重连定时器
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * 检查是否正在监听
   * @returns 是否正在监听
   */
  isListening(): boolean {
    return this.isActive
  }

  /**
   * 启动 Realtime 监听
   * @private
   */
  private startRealtime(): void {
    console.log('[RealtimeListener] 启动 Realtime 监听')

    // 创建通道
    const channelName = `data-changes-${Date.now()}`
    const channel = supabase.channel(channelName)

    // 监听所有表的变更
    this.options.tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table
        },
        (payload) => {
          console.log(`[RealtimeListener] 收到 ${table} 表变更:`, payload.eventType)

          const event: RealtimeEvent = {
            type: payload.eventType as RealtimeEventType,
            table: payload.table,
            record: payload.new,
            old: payload.old
          }

          this.options.onChange(event)
        }
      )
    })

    // 订阅通道
    channel.subscribe((status) => {
      // 减少日志输出，只在状态变化时记录
      if (status !== 'SUBSCRIBED') {
        console.log(`[RealtimeListener] 订阅状态: ${status}`)
      }

      if (status === 'SUBSCRIBED') {
        console.log('[RealtimeListener] Realtime 已连接')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        // 处理 CLOSED 状态，避免无限重试
        if (status === 'CLOSED') {
          console.log('[RealtimeListener] 订阅已关闭，不再重试')
          return
        }

        console.error(`[RealtimeListener] Realtime 连接错误: ${status}`)

        // 定期尝试重新连接 Realtime
        this.scheduleReconnect()
      }
    })

    this.subscription = channel
  }

  /**
   * 安排 Realtime 重连
   * @private
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }

    // 5 分钟后尝试重连
    const reconnectInterval = 5 * 60 * 1000

    console.log(`[RealtimeListener] 将在 ${reconnectInterval}ms 后尝试重新连接 Realtime`)

    this.reconnectTimer = setInterval(() => {
      if (this.isActive) {
        console.log('[RealtimeListener] 尝试重新连接 Realtime')

        // 停止当前订阅
        if (this.subscription) {
          supabase.removeChannel(this.subscription)
          this.subscription = null
        }

        // 尝试重新启动 Realtime
        try {
          this.startRealtime()
        } catch (error) {
          console.error('[RealtimeListener] 重新连接失败:', error)
        }
      }
    }, reconnectInterval)
  }
}
