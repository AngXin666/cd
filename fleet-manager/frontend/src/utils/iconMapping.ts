/**
 * 图标映射工具
 * 将 Emoji 图标映射到 UnoCSS 图标类名（i-mdi-*）
 * 
 * @module utils/iconMapping
 * @requirements 7.1, 7.3 - 图标风格统一
 */

/**
 * Emoji 到 UnoCSS 图标的映射表
 * 使用 Material Design Icons (MDI) 图标库
 */
export const iconMapping: Record<string, string> = {
  // 数据统计相关
  '📊': 'i-mdi-view-dashboard',
  '📈': 'i-mdi-chart-line',
  '📉': 'i-mdi-chart-line-variant',
  '📋': 'i-mdi-clipboard-check',
  '📦': 'i-mdi-package-variant',
  
  // 用户相关
  '👥': 'i-mdi-account-group',
  '👤': 'i-mdi-account-circle',
  '🧑': 'i-mdi-account',
  
  // 通知相关
  '🔔': 'i-mdi-bell-outline',
  '📢': 'i-mdi-send',
  '📣': 'i-mdi-bullhorn',
  
  // 功能相关
  '✅': 'i-mdi-check-circle',
  '❌': 'i-mdi-close-circle',
  '⚡': 'i-mdi-lightning-bolt',
  '⚙️': 'i-mdi-cog',
  '🔧': 'i-mdi-wrench',
  
  // 日期时间相关
  '📅': 'i-mdi-calendar',
  '⏰': 'i-mdi-clock-outline',
  '⏳': 'i-mdi-loading',
  
  // 金钱相关
  '💰': 'i-mdi-currency-usd',
  '💵': 'i-mdi-cash',
  
  // 建筑/位置相关
  '🏠': 'i-mdi-warehouse',
  '🏢': 'i-mdi-office-building',
  '📍': 'i-mdi-map-marker',
  
  // 车辆相关
  '🚗': 'i-mdi-car',
  '🚚': 'i-mdi-truck',
  
  // 操作相关
  '🚪': 'i-mdi-logout',
  '🔒': 'i-mdi-lock',
  '🔓': 'i-mdi-lock-open',
  
  // 状态相关
  '✔️': 'i-mdi-check',
  '❗': 'i-mdi-alert',
  '⚠️': 'i-mdi-alert-circle',
  'ℹ️': 'i-mdi-information',
  
  // 其他
  '🏷️': 'i-mdi-tag-multiple',
  '📝': 'i-mdi-pencil',
  '🔍': 'i-mdi-magnify',
  '➕': 'i-mdi-plus',
  '➖': 'i-mdi-minus',
}

/**
 * 获取 UnoCSS 图标类名
 * 如果找不到映射，返回默认图标
 * 
 * @param emoji - Emoji 图标字符
 * @param defaultIcon - 默认图标类名（可选）
 * @returns UnoCSS 图标类名
 * 
 * @example
 * ```ts
 * getIconClass('📊') // 返回 'i-mdi-view-dashboard'
 * getIconClass('🎉') // 返回 'i-mdi-help-circle'（默认）
 * getIconClass('🎉', 'i-mdi-star') // 返回 'i-mdi-star'
 * ```
 */
export function getIconClass(emoji: string, defaultIcon = 'i-mdi-help-circle'): string {
  return iconMapping[emoji] || defaultIcon
}

/**
 * 检查是否有对应的图标映射
 * 
 * @param emoji - Emoji 图标字符
 * @returns 是否存在映射
 */
export function hasIconMapping(emoji: string): boolean {
  return emoji in iconMapping
}

/**
 * 常用图标类名常量
 * 直接使用这些常量可以避免查找映射
 */
export const Icons = {
  // 数据统计
  dashboard: 'i-mdi-view-dashboard',
  chartLine: 'i-mdi-chart-line',
  chartBox: 'i-mdi-chart-box',
  clipboard: 'i-mdi-clipboard-check',
  package: 'i-mdi-package-variant',
  
  // 用户
  accountGroup: 'i-mdi-account-group',
  accountCircle: 'i-mdi-account-circle',
  accountCheck: 'i-mdi-account-check',
  accountClock: 'i-mdi-account-clock',
  accountOff: 'i-mdi-account-off',
  accountMultiple: 'i-mdi-account-multiple',
  
  // 通知
  bell: 'i-mdi-bell-outline',
  bellRing: 'i-mdi-bell-ring',
  send: 'i-mdi-send',
  
  // 功能
  checkCircle: 'i-mdi-check-circle',
  closeCircle: 'i-mdi-close-circle',
  lightning: 'i-mdi-lightning-bolt',
  cog: 'i-mdi-cog',
  
  // 日期时间
  calendar: 'i-mdi-calendar',
  calendarCheck: 'i-mdi-calendar-check',
  clock: 'i-mdi-clock-outline',
  loading: 'i-mdi-loading',
  
  // 金钱
  currency: 'i-mdi-currency-usd',
  cash: 'i-mdi-cash',
  
  // 建筑/位置
  warehouse: 'i-mdi-warehouse',
  warehouseOff: 'i-mdi-warehouse-off',
  office: 'i-mdi-office-building',
  mapMarker: 'i-mdi-map-marker',
  
  // 车辆
  car: 'i-mdi-car',
  truck: 'i-mdi-truck',
  
  // 操作
  logout: 'i-mdi-logout',
  lock: 'i-mdi-lock',
  lockOpen: 'i-mdi-lock-open',
  
  // 状态
  check: 'i-mdi-check',
  alert: 'i-mdi-alert',
  alertCircle: 'i-mdi-alert-circle',
  information: 'i-mdi-information',
  
  // 其他
  tagMultiple: 'i-mdi-tag-multiple',
  pencil: 'i-mdi-pencil',
  magnify: 'i-mdi-magnify',
  plus: 'i-mdi-plus',
  minus: 'i-mdi-minus',
  chevronRight: 'i-mdi-chevron-right',
  chevronLeft: 'i-mdi-chevron-left',
  arrowLeft: 'i-mdi-arrow-left',
} as const

/**
 * 图标类型
 */
export type IconName = keyof typeof Icons
