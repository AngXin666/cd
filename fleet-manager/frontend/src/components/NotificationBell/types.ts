/**
 * 通知铃铛组件类型定义
 * 
 * @module components/NotificationBell/types
 */

/**
 * 通知铃铛组件 Props
 */
export interface NotificationBellProps {
  /** 用户ID，用于获取未读通知数量 */
  userId?: string
}

/**
 * 通知铃铛组件暴露的方法
 */
export interface NotificationBellExpose {
  /** 刷新未读数量 */
  refresh: () => Promise<void>
}
