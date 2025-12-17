/**
 * 车辆实时订阅 Hook
 * 提供车辆数据的实时监听能力，支持多端实时通讯
 *
 * 功能：
 * - 监听 vehicles 表的数据变化（INSERT/UPDATE/DELETE）
 * - 根据用户角色过滤事件（司机只收到自己的车辆变化）
 * - 提供审核状态变更的专门回调
 * - 自动重连和错误处理
 *
 * @module hooks/useVehicleRealtime
 * @feature vehicle-realtime-sync
 */

import type {RealtimeChannel} from '@supabase/supabase-js'
import {useCallback, useEffect, useRef, useState} from 'react'
import {supabase} from '@/client/supabase'

// ==================== 类型定义 ====================

/**
 * 用户角色类型
 */
export type UserRole = 'DRIVER' | 'MANAGER' | 'BOSS'

/**
 * 车辆变更事件类型
 */
export type VehicleEventType = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * 车辆审核状态
 */
export type VehicleReviewStatus = 'pending_review' | 'approved' | 'rejected' | 'needs_supplement'

/**
 * 车辆状态
 */
export type VehicleStatus = 'active' | 'returned' | 'inactive'

/**
 * 车辆变更事件载荷
 * 包含车辆变更的基本信息
 */
export interface VehicleChangePayload {
  /** 车辆ID */
  id: string
  /** 车牌号 */
  plate_number?: string
  /** 用户ID（司机） */
  user_id?: string
  /** 车辆状态 */
  status?: VehicleStatus
  /** 审核状态 */
  review_status?: VehicleReviewStatus
  /** 事件类型 */
  eventType: VehicleEventType
  /** 原始数据（更新前） */
  oldRecord?: Record<string, unknown>
  /** 新数据（更新后） */
  newRecord?: Record<string, unknown>
}

/**
 * 审核状态变更载荷
 * 专门用于审核状态变化的通知
 */
export interface ReviewStatusChangePayload {
  /** 车辆ID */
  vehicleId: string
  /** 车牌号 */
  plateNumber: string
  /** 原审核状态 */
  oldStatus?: VehicleReviewStatus
  /** 新审核状态 */
  newStatus: VehicleReviewStatus
  /** 审核备注 */
  reviewNotes?: string
  /** 需要补充的照片列表 */
  requiredPhotos?: string[]
}

/**
 * Hook 配置选项
 */
export interface UseVehicleRealtimeOptions {
  /** 用户ID（用于过滤特定用户的车辆，司机角色必填） */
  userId?: string
  /** 用户角色 */
  userRole: UserRole
  /** 是否启用实时订阅，默认 true */
  enabled?: boolean
  /** 车辆创建回调 */
  onVehicleCreated?: (payload: VehicleChangePayload) => void
  /** 车辆更新回调 */
  onVehicleUpdated?: (payload: VehicleChangePayload) => void
  /** 车辆删除回调 */
  onVehicleDeleted?: (payload: VehicleChangePayload) => void
  /** 审核状态变更回调 */
  onReviewStatusChanged?: (payload: ReviewStatusChangePayload) => void
  /** 通用数据变更回调（用于刷新列表） */
  onDataChange?: () => void
}

/**
 * Hook 返回值
 */
export interface UseVehicleRealtimeReturn {
  /** 连接状态 */
  isConnected: boolean
  /** 连接错误 */
  error: Error | null
  /** 手动重连 */
  reconnect: () => void
}

// ==================== 常量定义 ====================

/** 日志前缀 */
const LOG_PREFIX = '[useVehicleRealtime]'

/** 初始重连延迟（毫秒） */
const INITIAL_RECONNECT_DELAY = 1000

/** 最大重连延迟（毫秒） */
const MAX_RECONNECT_DELAY = 30000

// ==================== Hook 实现 ====================

/**
 * 车辆实时订阅 Hook
 *
 * @param options - Hook 配置选项
 * @returns Hook 返回值
 *
 * @example
 * ```typescript
 * // 司机端使用
 * const {isConnected, error} = useVehicleRealtime({
 *   userId: currentUser.id,
 *   userRole: 'DRIVER',
 *   onReviewStatusChanged: (payload) => {
 *     if (payload.newStatus === 'approved') {
 *       showToast('车辆审核已通过')
 *     }
 *   },
 *   onDataChange: () => {
 *     refreshVehicleList()
 *   }
 * })
 *
 * // 管理端使用
 * const {isConnected} = useVehicleRealtime({
 *   userRole: 'MANAGER',
 *   onVehicleCreated: (payload) => {
 *     showNotification(`收到新车辆提交: ${payload.plate_number}`)
 *   },
 *   onDataChange: () => {
 *     refreshVehicleList()
 *   }
 * })
 * ```
 */
export function useVehicleRealtime(options: UseVehicleRealtimeOptions): UseVehicleRealtimeReturn {
  const {
    userId,
    userRole,
    enabled = true,
    onVehicleCreated,
    onVehicleUpdated,
    onVehicleDeleted,
    onReviewStatusChanged,
    onDataChange
  } = options

  // ==================== 状态管理 ====================

  /** 连接状态 */
  const [isConnected, setIsConnected] = useState(false)

  /** 连接错误 */
  const [error, setError] = useState<Error | null>(null)

  // ==================== Ref 引用 ====================

  /** Realtime 通道引用 */
  const channelRef = useRef<RealtimeChannel | null>(null)

  /** 重连定时器引用 */
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)

  /** 当前重连延迟 */
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY)

  /** 组件是否已挂载 */
  const isMountedRef = useRef(true)

  // 使用 ref 存储回调函数，避免依赖变化导致重新订阅
  const callbacksRef = useRef({
    onVehicleCreated,
    onVehicleUpdated,
    onVehicleDeleted,
    onReviewStatusChanged,
    onDataChange
  })

  // 更新回调函数引用
  useEffect(() => {
    callbacksRef.current = {
      onVehicleCreated,
      onVehicleUpdated,
      onVehicleDeleted,
      onReviewStatusChanged,
      onDataChange
    }
  }, [onVehicleCreated, onVehicleUpdated, onVehicleDeleted, onReviewStatusChanged, onDataChange])

  // ==================== 事件处理 ====================

  /**
   * 处理车辆变更事件
   * @param eventType - 事件类型
   * @param newRecord - 新数据
   * @param oldRecord - 旧数据
   */
  const handleVehicleChange = useCallback(
    (eventType: VehicleEventType, newRecord: Record<string, unknown> | null, oldRecord: Record<string, unknown> | null) => {
      // 构建变更载荷
      const payload: VehicleChangePayload = {
        id: (newRecord?.id || oldRecord?.id) as string,
        plate_number: (newRecord?.plate_number || oldRecord?.plate_number) as string | undefined,
        user_id: (newRecord?.user_id || oldRecord?.user_id) as string | undefined,
        status: newRecord?.status as VehicleStatus | undefined,
        review_status: newRecord?.review_status as VehicleReviewStatus | undefined,
        eventType,
        oldRecord: oldRecord || undefined,
        newRecord: newRecord || undefined
      }

      console.log(`${LOG_PREFIX} 收到车辆变更事件:`, eventType, payload.plate_number || payload.id)

      // 根据事件类型触发对应回调
      switch (eventType) {
        case 'INSERT':
          callbacksRef.current.onVehicleCreated?.(payload)
          break
        case 'UPDATE':
          callbacksRef.current.onVehicleUpdated?.(payload)
          // 检查审核状态是否变化
          if (oldRecord && newRecord && oldRecord.review_status !== newRecord.review_status) {
            const reviewPayload: ReviewStatusChangePayload = {
              vehicleId: payload.id,
              plateNumber: payload.plate_number || '',
              oldStatus: oldRecord.review_status as VehicleReviewStatus | undefined,
              newStatus: newRecord.review_status as VehicleReviewStatus,
              reviewNotes: newRecord.review_notes as string | undefined,
              requiredPhotos: newRecord.required_photos as string[] | undefined
            }
            console.log(`${LOG_PREFIX} 审核状态变更:`, reviewPayload.oldStatus, '->', reviewPayload.newStatus)
            callbacksRef.current.onReviewStatusChanged?.(reviewPayload)
          }
          break
        case 'DELETE':
          callbacksRef.current.onVehicleDeleted?.(payload)
          break
      }

      // 触发通用数据变更回调
      callbacksRef.current.onDataChange?.()
    },
    []
  )

  // ==================== 订阅管理 ====================

  /**
   * 清理订阅资源
   */
  const cleanup = useCallback(() => {
    // 清理重连定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    // 清理 Realtime 通道
    if (channelRef.current) {
      console.log(`${LOG_PREFIX} 清理订阅通道`)
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  /**
   * 安排重连
   */
  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return

    // 清理现有定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }

    console.log(`${LOG_PREFIX} 安排重连，延迟: ${reconnectDelayRef.current}ms`)

    reconnectTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        // 指数退避增加延迟
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY)
        // 触发重新订阅（通过更新状态）
        setError(null)
      }
    }, reconnectDelayRef.current)
  }, [])

  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    console.log(`${LOG_PREFIX} 手动重连`)
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY
    cleanup()
    setError(null)
  }, [cleanup])

  // ==================== 订阅逻辑 ====================

  useEffect(() => {
    // 标记组件已挂载
    isMountedRef.current = true

    // 如果禁用或缺少必要参数，不建立订阅
    if (!enabled) {
      console.log(`${LOG_PREFIX} 订阅已禁用`)
      return
    }

    // 司机角色必须提供 userId
    if (userRole === 'DRIVER' && !userId) {
      console.warn(`${LOG_PREFIX} 司机角色必须提供 userId`)
      return
    }

    // 清理旧的订阅
    cleanup()

    // 生成唯一的通道名称
    const channelName = `vehicle_realtime_${userRole}_${userId || 'all'}_${Date.now()}`
    console.log(`${LOG_PREFIX} 创建订阅通道: ${channelName}`)

    // 创建订阅通道
    const channel = supabase.channel(channelName)

    // 根据角色配置订阅
    if (userRole === 'DRIVER') {
      // 司机：只监听自己的车辆更新
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          handleVehicleChange('UPDATE', payload.new as Record<string, unknown>, payload.old as Record<string, unknown>)
        }
      )
    } else if (userRole === 'MANAGER') {
      // 管理员：监听所有车辆的 INSERT 和 UPDATE
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'vehicles'
          },
          (payload) => {
            handleVehicleChange('INSERT', payload.new as Record<string, unknown>, null)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'vehicles'
          },
          (payload) => {
            handleVehicleChange('UPDATE', payload.new as Record<string, unknown>, payload.old as Record<string, unknown>)
          }
        )
    } else if (userRole === 'BOSS') {
      // 超级管理员：监听所有事件
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'vehicles'
          },
          (payload) => {
            handleVehicleChange('INSERT', payload.new as Record<string, unknown>, null)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'vehicles'
          },
          (payload) => {
            handleVehicleChange('UPDATE', payload.new as Record<string, unknown>, payload.old as Record<string, unknown>)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'vehicles'
          },
          (payload) => {
            handleVehicleChange('DELETE', null, payload.old as Record<string, unknown>)
          }
        )
    }

    // 订阅通道
    channel.subscribe((status, err) => {
      if (!isMountedRef.current) return

      if (status === 'SUBSCRIBED') {
        console.log(`${LOG_PREFIX} 订阅成功`)
        setIsConnected(true)
        setError(null)
        // 重置重连延迟
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY
      } else if (status === 'CHANNEL_ERROR') {
        console.warn(`${LOG_PREFIX} 订阅错误:`, err)
        setIsConnected(false)
        setError(err || new Error('订阅错误'))
        // 不影响应用正常运行，安排重连
        scheduleReconnect()
      } else if (status === 'TIMED_OUT') {
        console.warn(`${LOG_PREFIX} 订阅超时`)
        setIsConnected(false)
        setError(new Error('订阅超时'))
        // 安排重连
        scheduleReconnect()
      } else if (status === 'CLOSED') {
        console.log(`${LOG_PREFIX} 订阅已关闭`)
        setIsConnected(false)
      }
    })

    channelRef.current = channel

    // 清理函数
    return () => {
      isMountedRef.current = false
      cleanup()
    }
  }, [enabled, userId, userRole, handleVehicleChange, cleanup, scheduleReconnect])

  return {
    isConnected,
    error,
    reconnect
  }
}
