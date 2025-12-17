/**
 * 组件模块导出
 * 集中导出所有公共组件
 *
 * @module components
 */

// 全局通知提供者组件
export {default as GlobalNotificationProvider} from './GlobalNotificationProvider'
export type {GlobalNotificationProviderProps} from './GlobalNotificationProvider'

// 补录标记徽章组件
export {SupplementedBadge, default as SupplementedBadgeDefault} from './SupplementedBadge'
export type {SupplementedBadgeProps} from './SupplementedBadge'
