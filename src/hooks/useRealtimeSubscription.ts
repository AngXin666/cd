/**
 * Supabase Realtime 订阅 Hook
 * 提供简化的 Realtime 订阅接口，用于监听数据库表变更
 * 支持自动清理、重连和错误处理
 *
 * 增强功能：
 * - 集成 RealtimeConnectionManager 进行统一的连接状态管理
 * - 提供用户友好的错误提示
 * - 记录详细的错误日志
 * - 使用 useRef 存储回调函数，避免因回调变化导致的无限循环
 *
 * @module hooks/useRealtimeSubscription
 * @feature event-driven-data-refresh
 * @requirements 6.1, 6.2, 6.3, 9.1
 */

import type {RealtimeChannel} from '@supabase/supabase-js'
import {useCallback, useEffect, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'
import {createLogger} from '@/utils/logger'
import {handleConnectionError, updateConnectionStatus} from '@/utils/realtimeConnectionManager'

/** 创建日志实例 */
const logger = createLogger('useRealtimeSubscription')

// ==================== 类型定义 ====================

/**
 * Realtime 事件类型
 * 与 Supabase Realtime 的事件类型保持一致
 */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

/**
 * 订阅状态
 */
export type SubscriptionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'closed'

/**
 * 数据变更事件
 */
export interface DataChangeEvent<T = Record<string, unknown>> {
  /** 事件类型 */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  /** 表名 */
  table: string
  /** 新数据（INSERT 和 UPDATE 时有值） */
  new: T | null
  /** 旧数据（UPDATE 和 DELETE 时有值） */
  old: T | null
  /** 事件时间戳 */
  timestamp: string
}

/**
 * 订阅配置选项
 */
export interface RealtimeSubscriptionOptions<T = Record<string, unknown>> {
  /** 监听的表名 */
  table: string
  /** 监听的事件类型，默认为 '*'（所有事件） */
  event?: RealtimeEventType
  /** 过滤条件（可选），格式如 'user_id=eq.xxx' */
  filter?: string
  /** 数据变更回调 */
  onDataChange: (event: DataChangeEvent<T>) => void
  /** 错误回调（可选） */
  onError?: (error: Error) => void
  /** 连接状态变更回调（可选） */
  onStatusChange?: (status: SubscriptionStatus) => void
  /** 是否启用，默认为 true */
  enabled?: boolean
}

/**
 * Hook 返回值
 */
export interface UseRealtimeSubscriptionReturn {
  /** 当前订阅状态 */
  status: SubscriptionStatus
  /** 是否已连接 */
  isConnected: boolean
  /** 最后一次错误 */
  error: Error | null
  /** 手动重连 */
  reconnect: () => void
  /** 手动断开连接 */
  disconnect: () => void
}

// ==================== 常量定义 ====================

/** 重连延迟时间（毫秒） */
const RECONNECT_DELAY_MS = 3000

/** 最大重连次数 */
const MAX_RECONNECT_ATTEMPTS = 5

// ==================== Hook 实现 ====================

/**
 * Supabase Realtime 订阅 Hook
 * 用于监听数据库表的实时变更
 *
 * @param options - 订阅配置选项
 * @returns 订阅状态和控制方法
 *
 * @example
 * ```tsx
 * // 监听请假申请表的变更
 * const { status, isConnected } = useRealtimeSubscription({
 *   table: 'leave_applications',
 *   event: '*',
 *   onDataChange: (event) => {
 *     console.log('数据变更:', event);
 *     // 刷新数据
 *     refetchData();
 *   },
 *   onError: (error) => {
 *     console.error('订阅错误:', error);
 *   }
 * });
 * ```
 */
export function useRealtimeSubscription<T = Record<string, unknown>>(
  options: RealtimeSubscriptionOptions<T>
): UseRealtimeSubscriptionReturn {
  const {table, event = '*', filter, onDataChange, onError, onStatusChange, enabled = true} = options

  // ==================== 状态管理 ====================

  /** 订阅状态 */
  const [status, setStatus] = useState<SubscriptionStatus>('idle')

  /** 最后一次错误 */
  const [error, setError] = useState<Error | null>(null)

  /** 订阅通道引用 */
  const channelRef = useRef<RealtimeChannel | null>(null)

  /** 重连次数 */
  const reconnectAttemptsRef = useRef(0)

  /** 重连定时器 */
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 是否已卸载 */
  const isMountedRef = useRef(true)

  // ==================== 回调函数引用 ====================
  // 使用 useRef 存储回调函数，避免因回调变化导致 useEffect 重新执行
  // 这是解决无限循环问题的关键

  /** 数据变更回调引用 */
  const onDataChangeRef = useRef(onDataChange)
  onDataChangeRef.current = onDataChange

  /** 错误回调引用 */
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  /** 状态变更回调引用 */
  const onStatusChangeRef = useRef(onStatusChange)
  onStatusChangeRef.current = onStatusChange

  /** 配置参数引用（避免 useEffect 依赖变化） */
  const configRef = useRef({table, event, filter, enabled})
  configRef.current = {table, event, filter, enabled}

  // ==================== 状态更新辅助函数 ====================

  /**
   * 安全更新状态（检查组件是否已卸载）
   * 使用 ref 中的回调，避免依赖变化
   * @param newStatus - 新状态
   */
  const updateStatus = useCallback((newStatus: SubscriptionStatus) => {
    if (isMountedRef.current) {
      setStatus(newStatus)
      onStatusChangeRef.current?.(newStatus)
    }
  }, [])

  /**
   * 安全更新错误（检查组件是否已卸载）
   * 使用 ref 中的回调，避免依赖变化
   * @param newError - 新错误
   */
  const updateError = useCallback((newError: Error | null) => {
    if (isMountedRef.current) {
      setError(newError)
      if (newError) {
        onErrorRef.current?.(newError)
      }
    }
  }, [])

  // ==================== 订阅管理函数 ====================

  /**
   * 清理订阅资源
   */
  const cleanup = useCallback(() => {
    // 清除重连定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    // 移除订阅通道
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  /**
   * 安排重连（使用 ref 获取最新配置，避免依赖变化）
   */
  const scheduleReconnect = useCallback(() => {
    const {table: currentTable, enabled: currentEnabled} = configRef.current

    // 检查是否超过最大重连次数
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      logger.error(`已达到最大重连次数 (${MAX_RECONNECT_ATTEMPTS})，停止重连`, {
        table: currentTable,
        maxAttempts: MAX_RECONNECT_ATTEMPTS
      })
      // 通知连接管理器连接失败
      handleConnectionError(
        new Error(`Realtime 连接失败：已达到最大重连次数 (${MAX_RECONNECT_ATTEMPTS})`),
        reconnectAttemptsRef.current
      )
      return
    }

    // 清除已有的重连定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }

    // 计算重连延迟（指数退避）
    const delay = RECONNECT_DELAY_MS * 2 ** reconnectAttemptsRef.current
    reconnectAttemptsRef.current += 1

    logger.info(`将在 ${delay}ms 后尝试第 ${reconnectAttemptsRef.current} 次重连`, {
      table: currentTable,
      attempt: reconnectAttemptsRef.current,
      delay
    })

    // 更新全局连接状态为重连中
    updateConnectionStatus('reconnecting')

    // 设置重连定时器
    reconnectTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && currentEnabled) {
        // 触发重新订阅（通过更新状态）
        updateStatus('connecting')
      }
    }, delay)
  }, [updateStatus])

  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    console.log('[useRealtimeSubscription] 手动重连')
    reconnectAttemptsRef.current = 0 // 重置重连次数
    cleanup()
    updateStatus('connecting')
  }, [cleanup, updateStatus])

  /**
   * 手动断开连接
   */
  const disconnect = useCallback(() => {
    console.log('[useRealtimeSubscription] 手动断开连接')
    cleanup()
    updateStatus('closed')
  }, [cleanup, updateStatus])

  // ==================== 生命周期管理 ====================

  // 组件挂载时创建订阅
  // 注意：只依赖 table, event, filter, enabled 这些基本配置
  // 所有回调函数都通过 ref 访问，避免无限循环
  useEffect(() => {
    isMountedRef.current = true

    // 如果未启用，跳过
    if (!enabled) {
      return
    }

    // 清理旧订阅（直接执行清理逻辑，不依赖 cleanup 函数）
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // 更新状态为连接中
    setStatus('connecting')
    setError(null)

    // 生成唯一通道名称
    const channelName = `realtime-${table}-${Date.now()}`

    console.log(`[useRealtimeSubscription] 创建订阅: ${channelName}, 表: ${table}, 事件: ${event}`)

    // 创建订阅通道
    const channel = supabase.channel(channelName)

    // 监听数据变更
    // 使用与现有代码（useDriverDashboard, useRealtimeNotifications）相同的模式
    // 类型断言用于解决 Supabase 类型定义的兼容性问题
    ;(
      channel as unknown as {
        on: (
          type: string,
          config: {event: string; schema: string; table: string; filter?: string},
          callback: (payload: {eventType: string; table: string; new: unknown; old: unknown}) => void
        ) => void
      }
    ).on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        ...(filter ? {filter} : {})
      },
      (payload) => {
        console.log(`[useRealtimeSubscription] 收到 ${table} 表变更:`, payload.eventType)

        // 构造数据变更事件
        const changeEvent: DataChangeEvent<T> = {
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          table: payload.table,
          new: payload.new as T | null,
          old: payload.old as T | null,
          timestamp: new Date().toISOString()
        }

        // 调用回调（使用 ref 中的最新回调）
        onDataChangeRef.current(changeEvent)
      }
    )

    // 订阅通道
    channel.subscribe((subscribeStatus) => {
      logger.debug(`订阅状态变更: ${subscribeStatus}`, {table, event})

      switch (subscribeStatus) {
        case 'SUBSCRIBED':
          // 订阅成功
          if (isMountedRef.current) {
            setStatus('connected')
          }
          reconnectAttemptsRef.current = 0 // 重置重连次数
          logger.info(`已连接到 ${table} 表`, {table, event, filter})
          // 更新全局连接状态
          updateConnectionStatus('connected')
          break

        case 'CHANNEL_ERROR':
        case 'TIMED_OUT': {
          // 订阅失败
          const errorMessage = `Realtime 订阅失败: ${subscribeStatus}`
          const subscribeError = new Error(errorMessage)

          if (isMountedRef.current) {
            setStatus('error')
            setError(subscribeError)
            onErrorRef.current?.(subscribeError)
          }

          // 记录详细错误日志
          logger.error(`订阅错误: ${subscribeStatus}`, {
            table,
            event,
            filter,
            status: subscribeStatus,
            reconnectAttempts: reconnectAttemptsRef.current
          })

          // 通知连接管理器处理错误（会显示用户友好的提示）
          handleConnectionError(subscribeError, reconnectAttemptsRef.current)

          // 不再自动重连，避免无限循环
          // 用户可以通过 reconnect() 方法手动重连
          break
        }

        case 'CLOSED':
          // 订阅关闭
          if (isMountedRef.current) {
            setStatus('closed')
          }
          logger.info(`订阅已关闭: ${table}`, {table})
          // 更新全局连接状态
          updateConnectionStatus('disconnected')
          break
      }
    })

    // 保存通道引用
    channelRef.current = channel

    // 组件卸载时清理
    return () => {
      isMountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
    // 只依赖基本配置参数，不依赖任何函数
    // 这样可以彻底避免无限循环
  }, [enabled, table, event, filter])

  // ==================== 返回值 ====================

  return {
    status,
    isConnected: status === 'connected',
    error,
    reconnect,
    disconnect
  }
}

export default useRealtimeSubscription
