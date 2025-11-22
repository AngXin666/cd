import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'

// 通知类型
export type NotificationType =
  | 'leave_application' // 请假申请
  | 'resignation_application' // 离职申请
  | 'attendance' // 打卡
  | 'approval' // 审批结果
  | 'system' // 系统通知

// 通知项
export interface Notification {
  id: string
  type: NotificationType
  title: string
  content: string
  timestamp: number
  read: boolean
  data?: any // 额外数据，用于跳转等
}

const STORAGE_KEY = 'app_notifications'
const MAX_NOTIFICATIONS = 50 // 最多保存50条通知

/**
 * 通知管理 Hook
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // 从本地存储加载通知
  const loadNotifications = useCallback(() => {
    try {
      const stored = Taro.getStorageSync(STORAGE_KEY)
      if (stored && Array.isArray(stored)) {
        setNotifications(stored)
        const unread = stored.filter((n) => !n.read).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error('加载通知失败:', err)
    }
  }, [])

  // 保存通知到本地存储
  const saveNotifications = useCallback((notifs: Notification[]) => {
    try {
      // 只保存最新的 MAX_NOTIFICATIONS 条
      const toSave = notifs.slice(0, MAX_NOTIFICATIONS)
      Taro.setStorageSync(STORAGE_KEY, toSave)
    } catch (err) {
      console.error('保存通知失败:', err)
    }
  }, [])

  // 添加新通知
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        read: false
      }

      console.log('📢 添加新通知:', newNotification)

      setNotifications((prev) => {
        const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS)
        saveNotifications(updated)
        console.log('📋 当前通知列表:', updated)
        return updated
      })

      setUnreadCount((prev) => prev + 1)
    },
    [saveNotifications]
  )

  // 标记通知为已读
  const markAsRead = useCallback(
    (notificationId: string) => {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === notificationId ? {...n, read: true} : n))
        saveNotifications(updated)
        return updated
      })

      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
    [saveNotifications]
  )

  // 标记所有通知为已读
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({...n, read: true}))
      saveNotifications(updated)
      return updated
    })

    setUnreadCount(0)
  }, [saveNotifications])

  // 清除所有通知
  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
    try {
      Taro.removeStorageSync(STORAGE_KEY)
    } catch (err) {
      console.error('清除通知失败:', err)
    }
  }, [])

  // 删除单个通知
  const deleteNotification = useCallback(
    (notificationId: string) => {
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId)
        const updated = prev.filter((n) => n.id !== notificationId)
        saveNotifications(updated)

        if (notification && !notification.read) {
          setUnreadCount((count) => Math.max(0, count - 1))
        }

        return updated
      })
    },
    [saveNotifications]
  )

  // 获取未读通知
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter((n) => !n.read)
  }, [notifications])

  // 获取最近的通知
  const getRecentNotifications = useCallback(
    (count: number = 5) => {
      return notifications.slice(0, count)
    },
    [notifications]
  )

  // 初始化时加载通知
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
    getUnreadNotifications,
    getRecentNotifications
  }
}
