/**
 * 数据仪表盘组件类型定义
 * 
 * @module components/Dashboard/types
 */

/**
 * 仪表盘统计数据
 */
export interface DashboardStats {
  /** 今天出勤人数 */
  todayAttendance: number
  /** 今天总件数 */
  todayPieceCount: number
  /** 待审批数量 */
  pendingCount: number
  /** 本月完成件数 */
  monthlyPieceCount: number
  /** 计量单位（根据仓库类型确定，如：件、点、车、公里） */
  unit?: string
}

/**
 * 卡片类型
 */
export type CardType = 'attendance' | 'todayPiece' | 'pending' | 'monthlyPiece'

/**
 * 数据仪表盘组件 Props
 */
export interface DashboardProps {
  /** 统计数据 */
  stats: DashboardStats | null
  /** 加载状态 */
  loading?: boolean
  /** 当前仓库名称 */
  warehouseName?: string
}

/**
 * 数据仪表盘组件 Emits
 */
export interface DashboardEmits {
  /** 卡片点击事件 */
  (e: 'cardClick', type: CardType): void
}
