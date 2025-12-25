/**
 * 公共组件模块入口
 * 导出所有公共组件
 * 
 * @module components
 */

// 导航栏组件
export { default as NavBar } from './NavBar/index.vue'

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

// 卡片组件
export { default as Card } from './Card/index.vue'

// 列表项组件
export { default as ListItem } from './ListItem/index.vue'

// 状态标签组件
export { default as StatusTag } from './StatusTag/index.vue'

// 表单项组件
export { default as FormItem } from './FormItem/index.vue'

// 按钮组件
export { default as Button } from './Button/index.vue'

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
