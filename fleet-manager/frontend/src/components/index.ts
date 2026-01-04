/**
 * 公共组件模块入口
 * 导出所有公共组件
 * 
 * @module components
 */

// 顶部导航栏组件（与主项目一致）
export { default as TopNavBar } from './TopNavBar/index.vue'
export type { NavAction, TopNavBarProps } from './TopNavBar/types'

// 通知铃铛组件
export { default as NotificationBell } from './NotificationBell/index.vue'
export type { NotificationBellProps } from './NotificationBell/types'

// 实时通知栏组件
export { default as RealNotificationBar } from './RealNotificationBar/index.vue'
export type {
  Notification,
  NotificationType,
  RealNotificationBarProps
} from './RealNotificationBar/types'

// 仓库切换器组件
export { default as WarehouseSwitcher } from './WarehouseSwitcher/index.vue'
export type {
  Warehouse,
  WarehouseSwitcherProps
} from './WarehouseSwitcher/types'

// 数据仪表盘组件
export { default as Dashboard } from './Dashboard/index.vue'
export type {
  DashboardStats,
  CardType,
  DashboardProps
} from './Dashboard/types'

// 司机实时状态统计组件
export { default as DriverStats } from './DriverStats/index.vue'
export type {
  DriverStatsData,
  DriverStatsProps
} from './DriverStats/types'

// 加载组件
export { default as Loading } from './Loading/index.vue'

// 空状态组件
export { default as Empty } from './Empty/index.vue'

// 缓存图片组件
export { default as CachedImage } from './CachedImage/index.vue'

// 相册连续选择器组件
export { default as AlbumMultiSelector } from './AlbumMultiSelector/index.vue'

// 导出相册选择器类型
export type { PhotoItem, AlbumMultiSelectorProps } from './AlbumMultiSelector/types'

// 照片对比组件
export { default as PhotoCompare } from './PhotoCompare/index.vue'

// 导出照片对比组件类型
export type {
  PhotoItem as ComparePhotoItem,
  PhotoCompareProps,
  PhotoAngle,
  PhotoSource,
  CompareMode,
  CompareSelection
} from './PhotoCompare/types'
export { ANGLE_LABELS, SOURCE_LABELS } from './PhotoCompare/types'

// 考勤管理公共组件
export { default as AttendancePage } from './AttendancePage/index.vue'

// 请假详情公共组件
export { default as LeaveDetail } from './LeaveDetail/index.vue'

// 欢迎卡片组件
export { default as WelcomeCard } from './WelcomeCard/index.vue'
export type { WelcomeCardProps } from './WelcomeCard/types'

// 退出登录卡片组件
export { default as LogoutCard } from './LogoutCard/index.vue'

// 快捷功能入口组件
export { default as QuickActions } from './QuickActions/index.vue'
export type { QuickAction, QuickActionsProps } from './QuickActions/types'
