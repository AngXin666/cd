/**
 * QuickActions 组件类型定义
 * 快捷功能入口组件，用于三端首页功能按钮网格展示
 * 
 * @module components/QuickActions
 */

/**
 * 快捷功能项
 */
export interface QuickAction {
  /** 唯一标识，用于点击事件回调 */
  key: string
  /** 图标（emoji 或图标类名） */
  icon: string
  /** 显示文本 */
  text: string
  /** 颜色主题，对应渐变背景色 */
  color: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red' | 'cyan'
  /** 徽章数量（可选，大于 0 时显示） */
  badge?: number
}

/**
 * QuickActions 组件属性
 */
export interface QuickActionsProps {
  /** 功能列表 */
  actions: QuickAction[]
  /** 列数（默认 2） */
  columns?: 2 | 3 | 4
  /** 紧凑模式（用于司机端 4 列布局，图标和间距更小） */
  compact?: boolean
}
