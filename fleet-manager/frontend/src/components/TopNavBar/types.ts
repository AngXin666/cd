/**
 * 顶部导航栏组件类型定义
 * 
 * @module components/TopNavBar/types
 */

/**
 * 导航栏操作按钮
 */
export interface NavAction {
  /** 图标（Emoji 或图标类名） */
  icon: string
  /** 点击回调 */
  onClick: () => void
}

/**
 * 顶部导航栏组件 Props
 */
export interface TopNavBarProps {
  /** 页面标题 */
  title?: string
  /** 是否显示返回按钮 */
  showBack?: boolean
  /** 右侧操作按钮 */
  rightActions?: NavAction[]
  /** 背景颜色 */
  backgroundColor?: string
  /** 标题颜色 */
  titleColor?: string
}

/**
 * 顶部导航栏组件 Emits
 */
export interface TopNavBarEmits {
  /** 返回事件 */
  (e: 'back'): void
}
