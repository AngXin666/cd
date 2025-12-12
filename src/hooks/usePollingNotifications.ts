import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef} from 'react'
import {getAllAttendanceRecords} from '@/db/api/attendance'
import {getAllLeaveApplications, getAllResignationApplications} from '@/db/api/leave'
import type {Notification} from './useNotifications'

// 前端角色类型（用于 UI 逻辑）
type FrontendUserRole = 'driver' | 'manager' | 'super_admin'

interface PollingNotificationOptions {
  userId: string
  userRole: FrontendUserRole
  onLeaveApplicationChange?: () => void
  onResignationApplicationChange?: () => void
  onAttendanceChange?: () => void
  onNewNotification?: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  pollingInterval?: number // 轮询间隔，默认 10 秒
}

/**
 * 轮询通知 Hook
 * 作为 Realtime 的降级方案，通过定时轮询检查数据变化
 */
export function usePollingNotifications(options: PollingNotificationOptions) {
  const {
    userId,
    userRole,
    onLeaveApplicationChange,
    onResignationApplicationChange,
    onAttendanceChange,
    onNewNotification,
    pollingInterval = 10000 // 默认 10 秒
  } = options

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckTime = useRef<number>(Date.now())
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

  // 检查新的请假申请（车队长和老板）
  const checkLeaveApplications = useCallback(async () => {
    try {
      const applications = await getAllLeaveApplications()
      const newApplications = applications.filter(
        (app) => new Date(app.created_at).getTime() > lastCheckTime.current && app.status === 'pending'
      )

      if (newApplications.length > 0) {
        showNotification(
          '收到新的请假申请',
          `有 ${newApplications.length} 条新的请假申请`,
          'leave_insert',
          'leave_application',
          {applicationId: newApplications[0].id}
        )
        onLeaveApplicationChange?.()
      }
    } catch (error) {
      console.error('❌ [轮询] 检查请假申请失败:', error)
    }
  }, [showNotification, onLeaveApplicationChange])

  // 检查请假申请状态变化（司机）
  const checkLeaveApplicationStatus = useCallback(async () => {
    try {
      const applications = await getAllLeaveApplications()
      const myApplications = applications.filter((app) => app.user_id === userId)
      const recentlyUpdated = myApplications.filter(
        (app) =>
          new Date(app.reviewed_at || app.created_at).getTime() > lastCheckTime.current &&
          (app.status === 'approved' || app.status === 'rejected')
      )

      if (recentlyUpdated.length > 0) {
        const app = recentlyUpdated[0]
        if (app.status === 'approved') {
          showNotification('您的请假申请已通过', '您的请假申请已通过审批', 'leave_approved', 'approval', {
            applicationId: app.id
          })
        } else if (app.status === 'rejected') {
          showNotification('您的请假申请已被驳回', '您的请假申请已被驳回', 'leave_rejected', 'approval', {
            applicationId: app.id
          })
        }
        onLeaveApplicationChange?.()
      }
    } catch (error) {
      console.error('❌ [轮询] 检查请假申请状态失败:', error)
    }
  }, [userId, showNotification, onLeaveApplicationChange])

  // 检查新的离职申请（车队长和老板）
  const checkResignationApplications = useCallback(async () => {
    try {
      const applications = await getAllResignationApplications()
      const newApplications = applications.filter(
        (app) => new Date(app.created_at).getTime() > lastCheckTime.current && app.status === 'pending'
      )

      if (newApplications.length > 0) {
        showNotification(
          '收到新的离职申请',
          `有 ${newApplications.length} 条新的离职申请`,
          'resignation_insert',
          'resignation_application',
          {applicationId: newApplications[0].id}
        )
        onResignationApplicationChange?.()
      }
    } catch (error) {
      console.error('❌ [轮询] 检查离职申请失败:', error)
    }
  }, [showNotification, onResignationApplicationChange])

  // 检查离职申请状态变化（司机）
  const checkResignationApplicationStatus = useCallback(async () => {
    try {
      const applications = await getAllResignationApplications()
      const myApplications = applications.filter((app) => app.user_id === userId)
      const recentlyUpdated = myApplications.filter(
        (app) =>
          new Date(app.reviewed_at || app.created_at).getTime() > lastCheckTime.current &&
          (app.status === 'approved' || app.status === 'rejected')
      )

      if (recentlyUpdated.length > 0) {
        const app = recentlyUpdated[0]
        if (app.status === 'approved') {
          showNotification('您的离职申请已通过', '您的离职申请已通过审批', 'resignation_approved', 'approval', {
            applicationId: app.id
          })
        } else if (app.status === 'rejected') {
          showNotification('您的离职申请已被驳回', '您的离职申请已被驳回', 'resignation_rejected', 'approval', {
            applicationId: app.id
          })
        }
        onResignationApplicationChange?.()
      }
    } catch (error) {
      console.error('❌ [轮询] 检查离职申请状态失败:', error)
    }
  }, [userId, showNotification, onResignationApplicationChange])

  // 检查新的打卡记录（车队长和老板）
  const checkAttendanceRecords = useCallback(async () => {
    try {
      const records = await getAllAttendanceRecords()
      const newRecords = records.filter((record) => new Date(record.created_at).getTime() > lastCheckTime.current)

      if (newRecords.length > 0) {
        onAttendanceChange?.()
      }
    } catch (error) {
      console.error('❌ [轮询] 检查打卡记录失败:', error)
    }
  }, [onAttendanceChange])

  // 执行轮询检查
  const poll = useCallback(async () => {
    if (userRole === 'manager' || userRole === 'super_admin') {
      await Promise.all([checkLeaveApplications(), checkResignationApplications(), checkAttendanceRecords()])
    } else if (userRole === 'driver') {
      await Promise.all([checkLeaveApplicationStatus(), checkResignationApplicationStatus()])
    }

    // 更新最后检查时间
    lastCheckTime.current = Date.now()
  }, [
    userRole,
    checkLeaveApplications,
    checkResignationApplications,
    checkAttendanceRecords,
    checkLeaveApplicationStatus,
    checkResignationApplicationStatus
  ])

  // 设置轮询
  useEffect(() => {
    if (!userId) return

    // 立即执行一次
    poll()

    // 设置定时轮询
    intervalRef.current = setInterval(poll, pollingInterval)

    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [userId, pollingInterval, poll])

  return {
    // 可以添加一些控制方法，比如暂停/恢复轮询
    poll // 手动触发一次轮询
  }
}
