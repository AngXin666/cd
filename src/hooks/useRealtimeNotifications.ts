import type {RealtimeChannel} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef} from 'react'
import {supabase} from '@/client/supabase'
import type {Notification} from './useNotifications'

interface NotificationOptions {
  userId: string
  userRole: 'driver' | 'manager' | 'super_admin'
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
        }
      }
    },
    [shouldShowNotification, onNewNotification]
  )

  // 设置实时订阅
  useEffect(() => {
    if (!userId) return

    // 清理旧的订阅
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // 创建新的订阅通道
    const channel = supabase.channel(`notifications_${userId}`)

    // 管理员和超级管理员：监听新的请假申请
    if (userRole === 'manager' || userRole === 'super_admin') {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leave_applications'
        },
        (payload) => {
          console.log('新的请假申请:', payload)
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
        (payload) => {
          console.log('请假申请已更新:', payload)
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
          console.log('新的离职申请:', payload)
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
        (payload) => {
          console.log('离职申请已更新:', payload)
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
        (payload) => {
          console.log('新的打卡记录:', payload)
          onAttendanceChange?.()
        }
      )
    }

    // 司机：监听自己的申请状态变化
    if (userRole === 'driver') {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leave_applications',
          filter: `driver_id=eq.${userId}`
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
          filter: `driver_id=eq.${userId}`
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
    channel.subscribe((status) => {
      console.log('实时通知订阅状态:', status)
    })

    channelRef.current = channel

    // 清理函数
    return () => {
      if (channelRef.current) {
        console.log('清理实时通知订阅')
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, userRole, showNotification, onLeaveApplicationChange, onResignationApplicationChange, onAttendanceChange])

  return {
    // 可以添加一些控制方法，比如暂停/恢复通知
  }
}
