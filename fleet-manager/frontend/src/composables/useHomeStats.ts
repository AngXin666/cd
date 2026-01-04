/**
 * 首页统计数据加载 Composable
 * 封装老板端和车队长端共用的统计数据加载逻辑
 * 
 * @module composables/useHomeStats
 * @requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { ref, type Ref, type ComputedRef } from 'vue'
import { 
  getAttendanceRecords, 
  getPieceWorkStats,
} from '@/api'
import { getLocalDateString, getMonthStartStr } from '@/utils/date'

/**
 * 首页统计数据接口
 * 包含出勤和计件相关的统计数据
 */
export interface HomeStats {
  /** 今日出勤人数 */
  todayAttendanceCount: number
  /** 今日计件总量 */
  todayPieceCount: number
  /** 今日计件金额 */
  todayAmount: number
  /** 本月计件总量 */
  monthPieceCount: number
  /** 本月计件金额 */
  monthAmount: number
}

/**
 * useHomeStats 返回类型
 */
export interface UseHomeStatsReturn {
  /** 统计数据 */
  stats: Ref<HomeStats>
  /** 加载状态 */
  loading: Ref<boolean>
  /** 加载出勤统计 */
  loadAttendanceStats: () => Promise<void>
  /** 加载计件统计 */
  loadPieceWorkStats: () => Promise<void>
  /** 加载所有统计 */
  loadAllStats: () => Promise<void>
}

/**
 * 首页统计数据加载 Composable
 * 封装老板端和车队长端共用的统计数据加载逻辑
 * 
 * @param warehouseId - 当前选中的仓库ID（响应式计算属性）
 * @returns 统计数据和加载方法
 * 
 * @example
 * ```typescript
 * const currentWarehouseId = computed(() => 
 *   warehousesWithDataOrDrivers.value[currentWarehouseIndex.value]?.id 
 *     ? parseInt(warehousesWithDataOrDrivers.value[currentWarehouseIndex.value].id) 
 *     : undefined
 * )
 * const { stats, loading, loadAllStats } = useHomeStats(currentWarehouseId)
 * onMounted(() => loadAllStats())
 * ```
 * 
 * @requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export function useHomeStats(
  warehouseId: ComputedRef<number | undefined>
): UseHomeStatsReturn {
  /** 加载状态 */
  const loading = ref(false)
  
  /** 统计数据 */
  const stats = ref<HomeStats>({
    todayAttendanceCount: 0,
    todayPieceCount: 0,
    todayAmount: 0,
    monthPieceCount: 0,
    monthAmount: 0,
  })
  
  /**
   * 加载今日出勤统计
   * 逻辑与原有 loadAttendanceStats 完全一致
   * 
   * @throws 加载失败时抛出错误
   */
  async function loadAttendanceStats(): Promise<void> {
    try {
      // 获取今日日期字符串（使用本地时间）
      const todayStr = getLocalDateString()
      
      // 获取今日考勤记录（按仓库过滤）
      const records = await getAttendanceRecords({
        start_date: todayStr,
        end_date: todayStr,
        warehouse_id: warehouseId.value,
        limit: 1000, // 获取所有记录
      })
      
      // 统计今日出勤人数（去重）
      const uniqueUserIds = new Set(records.map(r => r.user_id))
      stats.value.todayAttendanceCount = uniqueUserIds.size
    } catch (error) {
      console.error('加载出勤统计失败:', error)
      throw error
    }
  }
  
  /**
   * 加载计件统计数据
   * 逻辑与原有 loadPieceWorkStats 完全一致
   * 
   * @throws 加载失败时抛出错误
   */
  async function loadPieceWorkStats(): Promise<void> {
    try {
      // 获取今日日期字符串（使用本地时间）
      const todayStr = getLocalDateString()
      
      // 获取本月第一天
      const monthStartStr = getMonthStartStr()
      
      console.log('[useHomeStats.loadPieceWorkStats] 开始加载, today:', todayStr, 'monthStart:', monthStartStr, 'warehouseId:', warehouseId.value)
      
      // 并行获取今日和本月统计（按仓库过滤）
      const [todayStats, monthStats] = await Promise.all([
        getPieceWorkStats({
          start_date: todayStr,
          end_date: todayStr,
          warehouse_id: warehouseId.value,
        }),
        getPieceWorkStats({
          start_date: monthStartStr,
          end_date: todayStr,
          warehouse_id: warehouseId.value,
        }),
      ])
      
      console.log('[useHomeStats.loadPieceWorkStats] 结果:', { todayStats, monthStats })
      
      // 更新统计数据
      stats.value.todayPieceCount = todayStats.total_quantity || 0
      stats.value.todayAmount = todayStats.total_amount || 0
      stats.value.monthPieceCount = monthStats.total_quantity || 0
      stats.value.monthAmount = monthStats.total_amount || 0
    } catch (error) {
      console.error('加载计件统计失败:', error)
      throw error
    }
  }
  
  /**
   * 加载所有统计数据
   * 并行加载出勤和计件统计
   */
  async function loadAllStats(): Promise<void> {
    loading.value = true
    try {
      await Promise.all([
        loadAttendanceStats(),
        loadPieceWorkStats(),
      ])
    } finally {
      loading.value = false
    }
  }
  
  return {
    stats,
    loading,
    loadAttendanceStats,
    loadPieceWorkStats,
    loadAllStats,
  }
}
