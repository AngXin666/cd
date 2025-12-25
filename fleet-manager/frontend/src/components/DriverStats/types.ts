/**
 * 司机实时状态统计组件类型定义
 * 
 * @module components/DriverStats/types
 */

/**
 * 司机统计数据
 */
export interface DriverStatsData {
  /** 总司机数 */
  totalDrivers: number
  /** 在线司机数 */
  onlineDrivers: number
  /** 已计件司机数（忙碌） */
  busyDrivers: number
  /** 未计件司机数（空闲） */
  idleDrivers: number
}

/**
 * 司机实时状态统计组件 Props
 */
export interface DriverStatsProps {
  /** 统计数据 */
  stats: DriverStatsData | null
  /** 加载状态 */
  loading?: boolean
  /** 当前仓库名称 */
  warehouseName?: string
}

/**
 * 司机实时状态统计组件 Emits
 */
export interface DriverStatsEmits {
  /** 点击事件 */
  (e: 'click'): void
}
