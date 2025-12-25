/**
 * 实时通知栏组件类型定义
 * 
 * @module components/RealNotificationBar/types
 */

/**
 * 通知类型
 */
export type NotificationType = 'system' | 'leave' | 'attendance' | 'piece_work'

/**
 * 通知数据
 */
export interface Notification {
  /** 通知ID */
  id: string
  /** 通知类型 */
  type: NotificationType
  /** 通知标题 */
  title: string
  /** 通知内容 */
  content: string
  /** 创建时间 */
  createdAt: string
  /** 跳转目标URL */
  targetUrl?: string
}

/**
 * 实时通知栏组件 Props
 */
export interface RealNotificationBarProps {
  /** 是否自动播放 */
  autoplay?: boolean
  /** 自动切换间隔（毫秒） */
  interval?: number
}

/**
 * 实时通知栏组件暴露的方法
 */
export interface RealNotificationBarExpose {
  /** 刷新通知 */
  refresh: () => Promise<void>
  /** 添加通知 */
  addNotification: (notification: Notification) => void
  /** 清空通知 */
  clearNotifications: () => void
}
