import type {RealtimeChannel} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef} from 'react'
import {supabase} from '@/client/supabase'
import type {Notification} from './useNotifications'

/**
 * 实时通知系统说明
 *
 * 本系统尝试使用 Supabase Realtime (WebSocket) 实现实时通知功能。
 *
 * 工作原理：
 * 1. 优先尝试建立 WebSocket 连接，实现真正的实时推送
 * 2. 如果 WebSocket 连接失败（常见于小程序环境），会记录警告但不影响应用运行
 * 3. 即使实时通知不可用，数据仍会在以下情况下更新：
 *    - 用户手动刷新页面
 *    - 页面重新加载
 *    - 用户切换页面后返回
 *
 * 注意事项：
 * - WebSocket 在某些环境下可能不可用（如小程序、某些网络环境）
 * - 这是正常现象，不影响应用核心功能
 * - 控制台的 WebSocket 警告可以忽略
 */

interface NotificationOptions {
  userId: string
  userRole: 'DRIVER' | 'MANAGER' | 'BOSS'
  onLeaveApplicationChange?: () => void
  onResignationApplicationChange?: () => void
  onAttendanceChange?: () => void
  onNewNotification?: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
}

/**
 * 实时通知 Hook
 * 监听数据库变化并显示通知
 */
export function useRealtimeNotifications(options: NotificationOptions) {
  const {
    userId,
    userRole,
    onLeaveApplicationChange,
    onResignationApplicationChange,
    onAttendanceChange,
    onNewNotification
  } = options

  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastNotificationTime = useRef<{[key: string]: number}>({})

  // 防抖通知：避免短时间内重复通知
  const shouldShowNotification = useCallback((key: string, minInterval = 3000) => {
    const now = Date.now()
    const lastTime = lastNotificationTime.current[key] || 0

    if (now - lastTime < minInterval) {
      return false
    }

    lastNotificationTime.current[key] = now
    return true
  }, [])

  // 显示通知
  const showNotification = useCallback(
    (title: string, content: string, key: string, type: Notification['type'], data?: any) => {
      if (shouldShowNotification(key)) {
        // 显示 Toast 通知
        Taro.showToast({
          title,
          icon: 'none',
          duration: 2000
        })

        // 震动反馈
        Taro.vibrateShort({type: 'light'})

        // 添加到通知栏
        if (onNewNotification) {
          onNewNotification({
            type,
            title,
            content,
            data
          })
        } else {
        }
      } else {
      }
    },
    [shouldShowNotification, onNewNotification]
  )

  // 设置实时订阅
  useEffect(() => {
    if (!userId) {
      return
    }

    // 清理旧的订阅
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // 创建新的订阅通道
    const channel = supabase.channel(`notifications_${userId}`)

    // 车队长和老板：监听新的请假申请
    if (userRole === 'MANAGER' || userRole === 'BOSS') {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leave_applications'
        },
        (payload) => {
          const record = payload.new as any
          showNotification('收到新的请假申请', `司机提交了新的请假申请`, 'leave_insert', 'leave_application', {
            applicationId: record.id
          })
          onLeaveApplicationChange?.()
        }
      )

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leave_applications'
        },
        (_payload) => {
          onLeaveApplicationChange?.()
        }
      )

      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'resignation_applications'
        },
        (payload) => {
          const record = payload.new as any
          showNotification(
            '收到新的离职申请',
            `司机提交了新的离职申请`,
            'resignation_insert',
            'resignation_application',
            {applicationId: record.id}
          )
          onResignationApplicationChange?.()
        }
      )

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'resignation_applications'
        },
        (_payload) => {
          onResignationApplicationChange?.()
        }
      )

      // 监听新的打卡记录
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance'
        },
        (_payload) => {
          onAttendanceChange?.()
        }
      )
    }

    // 司机：监听自己的申请状态变化
    if (userRole === 'DRIVER') {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leave_applications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const record = payload.new as any
          if (record.status === 'approved') {
            showNotification('您的请假申请已通过', `您的请假申请已通过审批`, 'leave_approved', 'approval', {
              applicationId: record.id
            })
          } else if (record.status === 'rejected') {
            showNotification('您的请假申请已被驳回', `您的请假申请已被驳回`, 'leave_rejected', 'approval', {
              applicationId: record.id
            })
          }
          onLeaveApplicationChange?.()
        }
      )

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'resignation_applications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const record = payload.new as any
          if (record.status === 'approved') {
            showNotification('您的离职申请已通过', `您的离职申请已通过审批`, 'resignation_approved', 'approval', {
              applicationId: record.id
            })
          } else if (record.status === 'rejected') {
            showNotification('您的离职申请已被驳回', `您的离职申请已被驳回`, 'resignation_rejected', 'approval', {
              applicationId: record.id
            })
          }
          onResignationApplicationChange?.()
        }
      )
    }

    // 订阅通道
    channel.subscribe((status, _err) => {
      if (status === 'SUBSCRIBED') {
      } else if (status === 'CHANNEL_ERROR') {
      } else if (status === 'TIMED_OUT') {
      } else if (status === 'CLOSED') {
      }
    })

    channelRef.current = channel

    // 清理函数
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, userRole, showNotification, onLeaveApplicationChange, onResignationApplicationChange, onAttendanceChange])

  return {
    // 可以添加一些控制方法，比如暂停/恢复通知
  }
}
