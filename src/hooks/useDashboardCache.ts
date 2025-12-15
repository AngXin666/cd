/**
 * 仪表板数据缓存 Hook
 * 基于通用缓存 Hook 实现仪表板统计数据的缓存和实时更新
 *
 * @module hooks/useDashboardCache
 * @feature user-list-cache-optimization
 */

import {useDataCache} from './useDataCache'

/**
 * 仪表板数据接口
 */
export interface DashboardData {
  /** 今天出勤人数 */
  todayAttendance: number
  /** 今天总件数 */
  todayPieceCount: number
  /** 请假待审批数量 */
  pendingLeaveCount: number
  /** 离职待审批数量 */
  pendingResignationCount: number
  /** 车辆待审批数量 */
  pendingVehicleCount: number
  /** 总待审批数量（请假+离职+车辆） */
  totalPendingCount: number
  /** 本月完成件数 */
  monthlyPieceCount: number
  /** 司机列表（可选） */
  driverList?: Array<{
    id: string
    name: string
    phone: string
    todayAttendance: boolean
    todayPieceCount: number
  }>
}

/**
 * 仪表板数据缓存 Hook 配置
 */
export interface UseDashboardCacheOptions {
  /** 仓库 ID（可选，用于过滤特定仓库的数据） */
  warehouseId?: string
  /** 数据加载函数 */
  loadData: () => Promise<DashboardData>
}

/**
 * 仪表板数据缓存 Hook
 * 提供仪表板统计数据的加载、缓存和实时更新功能
 *
 * @example
 * ```typescript
 * const {data: dashboardStats, loading, refresh} = useDashboardCache({
 *   warehouseId: 'warehouse-123',
 *   loadData: async () => await StatsAPI.getDashboardStats('warehouse-123')
 * })
 * ```
 */
export function useDashboardCache(options: UseDashboardCacheOptions) {
  const {warehouseId, loadData} = options

  const cacheKey = warehouseId ? `dashboard_${warehouseId}` : 'dashboard_all'

  return useDataCache<DashboardData>({
    cacheKey,
    loadData,
    realtimeTables: ['attendance', 'piece_work_records', 'leave_applications'],
    cacheEnabled: true,
    cacheTTL: 5 * 60 * 1000, // 5 分钟（仪表板数据更新频繁，缓存时间短一些）
    dependencies: [warehouseId]
  })
}
