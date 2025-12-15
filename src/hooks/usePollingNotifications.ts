/**
 * 事件驱动通知 Hook
 * 通过 Supabase Realtime 和事件总线订阅数据变化
 *
 * 工作原理：
 * - 订阅 Supabase Realtime 监听数据库表变化（leave_applications, resignation_applications, attendance）
 * - 同时订阅事件总线的相关事件作为备用
 * - 当数据变化时，执行相应的回调函数刷新仪表盘
 *
 * @module hooks/usePollingNotifications
 */

import {useCallback, useEffect, useRef} from 'react'
import {supabase} from '@/client/supabase'
import {subscribe} from '@/utils/eventBus'
import type {Notification} from './useNotifications'

/** 前端角色类型（用于 UI 逻辑） */
type FrontendUserRole = 'driver' | 'manager' | 'super_admin'

/**
 * 事件驱动通知配置选项
 */
interface PollingNotificationOptions {
  /** 用户 ID */
  userId: string
  /** 用户角色 */
  userRole: FrontendUserRole
  /** 请假申请变化回调 */
  onLeaveApplicationChange?: () => void
  /** 离职申请变化回调 */
  onResignationApplicationChange?: () => void
  /** 考勤变化回调 */
  onAttendanceChange?: () => void
  /** 新通知回调 */
  onNewNotification?: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
}

/**
 * 事件驱动通知 Hook
 * 订阅事件总线的数据变化事件，替代定时轮询
 *
 * @param options - 配置选项
 * @returns 手动刷新方法
 */
export function usePollingNotifications(options: PollingNotificationOptions) {
  const {userId, userRole, onLeaveApplicationChange, onResignationApplicationChange, onAttendanceChange, onNewNotification} =
    options

  // 使用 ref 存储回调函数，避免依赖变化导致 effect 重新执行
  const callbacksRef = useRef({
    onLeaveApplicationChange,
    onResignationApplicationChange,
    onAttendanceChange,
    onNewNotification
  })

  // 更新 ref 中的回调函数
  useEffect(() => {
    callbacksRef.current = {
      onLeaveApplicationChange,
      onResignationApplicationChange,
      onAttendanceChange,
      onNewNotification
    }
  }, [onLeaveApplicationChange, onResignationApplicationChange, onAttendanceChange, onNewNotification])

  /**
   * 手动刷新数据
   * 可以在需要时手动调用
   */
  const refresh = useCallback(() => {
    console.log('📢 [usePollingNotifications] 手动刷新数据')
    callbacksRef.current.onLeaveApplicationChange?.()
    callbacksRef.current.onResignationApplicationChange?.()
    callbacksRef.current.onAttendanceChange?.()
  }, [])

  // 订阅 Supabase Realtime 数据库变化
  useEffect(() => {
    if (!userId) return

    console.log('📢 [usePollingNotifications] 订阅 Supabase Realtime，角色:', userRole)

    // 创建唯一的 channel 名称
    const channelName = `dashboard:${userId}:${userRole}`

    // 创建 Realtime channel
    const channel = supabase.channel(channelName)

    // 管理员和老板：订阅申请表的变化
    if (userRole === 'manager' || userRole === 'super_admin') {
      // 监听请假申请表变化
      channel.on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件（INSERT, UPDATE, DELETE）
          schema: 'public',
          table: 'leave_applications'
        },
        (payload) => {
          console.log('📢 [Realtime] leave_applications 变化:', payload.eventType)
          callbacksRef.current.onLeaveApplicationChange?.()
        }
      )

      // 监听离职申请表变化
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resignation_applications'
        },
        (payload) => {
          console.log('📢 [Realtime] resignation_applications 变化:', payload.eventType)
          callbacksRef.current.onResignationApplicationChange?.()
        }
      )

      // 监听考勤表变化
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance'
        },
        (payload) => {
          console.log('📢 [Realtime] attendance 变化:', payload.eventType)
          callbacksRef.current.onAttendanceChange?.()
        }
      )
    }

    // 司机：监听自己的申请状态变化
    if (userRole === 'driver') {
      // 监听请假申请表变化（筛选自己的申请）
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leave_applications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📢 [Realtime] 我的请假申请更新:', payload)
          callbacksRef.current.onLeaveApplicationChange?.()
        }
      )

      // 监听离职申请表变化（筛选自己的申请）
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'resignation_applications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📢 [Realtime] 我的离职申请更新:', payload)
          callbacksRef.current.onResignationApplicationChange?.()
        }
      )
    }

    // 订阅 channel
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ [Realtime] 仪表盘订阅成功:', channelName)
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ [Realtime] 仪表盘订阅错误:', err)
      } else if (status === 'TIMED_OUT') {
        console.warn('⏰ [Realtime] 仪表盘订阅超时')
      } else {
        console.log('📢 [Realtime] 仪表盘订阅状态:', status)
      }
    })

    // 清理订阅
    return () => {
      console.log('📢 [Realtime] 取消仪表盘订阅:', channelName)
      channel.unsubscribe()
    }
  }, [userId, userRole])

  // 订阅事件总线的数据变化事件（作为备用）
  useEffect(() => {
    if (!userId) return

    console.log('📢 [usePollingNotifications] 订阅事件总线（备用），角色:', userRole)

    const unsubscribes: (() => void)[] = []

    // 管理员和老板：订阅新申请事件
    if (userRole === 'manager' || userRole === 'super_admin') {
      // 请假申请创建
      unsubscribes.push(
        subscribe('leave:created', (data) => {
          console.log('📢 [EventBus] 收到 leave:created 事件', data)
          callbacksRef.current.onLeaveApplicationChange?.()
        })
      )

      // 离职申请创建
      unsubscribes.push(
        subscribe('resignation:created', (data) => {
          console.log('📢 [EventBus] 收到 resignation:created 事件', data)
          callbacksRef.current.onResignationApplicationChange?.()
        })
      )

      // 打卡记录创建
      unsubscribes.push(
        subscribe('attendance:created', () => {
          console.log('📢 [EventBus] 收到 attendance:created 事件')
          callbacksRef.current.onAttendanceChange?.()
        })
      )

      // 计件记录创建/更新
      unsubscribes.push(
        subscribe('piece_work:created', () => {
          console.log('📢 [EventBus] 收到 piece_work:created 事件')
          callbacksRef.current.onAttendanceChange?.()
        })
      )
      unsubscribes.push(
        subscribe('piece_work:updated', () => {
          console.log('📢 [EventBus] 收到 piece_work:updated 事件')
          callbacksRef.current.onAttendanceChange?.()
        })
      )
    }

    // 司机：订阅申请状态变化事件
    if (userRole === 'driver') {
      // 请假申请审批
      unsubscribes.push(
        subscribe('leave:updated', (data: unknown) => {
          console.log('📢 [EventBus] 收到 leave:updated 事件', data)
          callbacksRef.current.onLeaveApplicationChange?.()
        })
      )

      // 离职申请审批
      unsubscribes.push(
        subscribe('resignation:updated', (data: unknown) => {
          console.log('📢 [EventBus] 收到 resignation:updated 事件', data)
          callbacksRef.current.onResignationApplicationChange?.()
        })
      )
    }

    // 通用数据刷新事件
    unsubscribes.push(
      subscribe('data:refresh', () => {
        console.log('📢 [EventBus] 收到 data:refresh 事件')
        refresh()
      })
    )

    // 清理订阅
    return () => {
      console.log('📢 [EventBus] 取消订阅事件总线')
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [userId, userRole, refresh])

  return {
    /** 手动触发数据刷新 */
    poll: refresh,
    /** 手动触发数据刷新（别名） */
    refresh
  }
}
