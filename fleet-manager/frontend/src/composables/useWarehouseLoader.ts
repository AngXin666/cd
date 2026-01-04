/**
 * 仓库列表加载 Composable
 * 封装老板端和车队长端共用的仓库加载逻辑
 * 
 * @module composables/useWarehouseLoader
 * @requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { ref, type Ref } from 'vue'
import { 
  getWarehouses, 
  getWarehouseUsers,
  getPieceWorkStats,
  getAttendanceRecords,
} from '@/api'
import { UserRole } from '@/api/types'
import type { WarehouseType } from '@/api/types'
import { getLocalDateString, getMonthStartStr } from '@/utils/date'

/**
 * 仓库加载配置接口
 * 用于配置仓库加载行为
 */
export interface WarehouseLoaderOptions {
  /** 排序方式：按今日件数或今日出勤排序 */
  sortBy?: 'todayPieceCount' | 'todayAttendance'
  /** 是否加载司机数量 */
  includeDriverCount?: boolean
  /** 是否加载今日出勤 */
  includeAttendance?: boolean
}

/**
 * 简化的仓库信息接口
 * 用于组件显示
 */
export interface SimpleWarehouse {
  /** 仓库ID（字符串类型，兼容组件） */
  id: string
  /** 仓库名称 */
  name: string
}

/**
 * useWarehouseLoader 返回类型
 */
export interface UseWarehouseLoaderReturn {
  /** 仓库列表 */
  warehouses: Ref<SimpleWarehouse[]>
  /** 仓库数据映射（warehouseId -> hasData） */
  warehouseDataMap: Ref<Map<number, boolean>>
  /** 仓库司机数量映射（warehouseId -> driverCount） */
  warehouseDriverCountMap: Ref<Map<number, number>>
  /** 仓库今日件数映射（warehouseId -> todayPieceCount） */
  warehouseTodayPieceCountMap: Ref<Map<number, number>>
  /** 仓库今日出勤映射（warehouseId -> todayAttendanceCount） */
  warehouseTodayAttendanceMap: Ref<Map<number, number>>
  /** 仓库类型映射（warehouseId -> warehouseType） */
  warehouseTypeMap: Ref<Map<number, WarehouseType>>
  /** 加载状态 */
  loading: Ref<boolean>
  /** 加载仓库列表 */
  loadWarehouses: () => Promise<void>
}

/**
 * 仓库列表加载 Composable
 * 封装老板端和车队长端共用的仓库加载逻辑
 * 
 * @param options - 加载配置
 * @returns 仓库数据和加载方法
 * 
 * @example
 * ```typescript
 * // 老板端使用（按今日件数排序）
 * const { 
 *   warehouses, 
 *   warehouseDataMap, 
 *   warehouseDriverCountMap,
 *   warehouseTodayPieceCountMap,
 *   warehouseTypeMap,
 *   loading,
 *   loadWarehouses 
 * } = useWarehouseLoader({
 *   sortBy: 'todayPieceCount',
 *   includeDriverCount: true,
 * })
 * 
 * // 车队长端使用（按今日出勤排序）
 * const { 
 *   warehouses, 
 *   warehouseDataMap, 
 *   warehouseDriverCountMap,
 *   warehouseTodayAttendanceMap,
 *   warehouseTypeMap,
 *   loading,
 *   loadWarehouses 
 * } = useWarehouseLoader({
 *   sortBy: 'todayAttendance',
 *   includeDriverCount: true,
 *   includeAttendance: true,
 * })
 * 
 * onMounted(() => loadWarehouses())
 * ```
 * 
 * @requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export function useWarehouseLoader(
  options: WarehouseLoaderOptions = {}
): UseWarehouseLoaderReturn {
  // 解构配置，设置默认值
  const { 
    sortBy = 'todayPieceCount', 
    includeDriverCount = true, 
    includeAttendance = false 
  } = options
  
  /** 加载状态 */
  const loading = ref(false)
  
  /** 仓库列表 */
  const warehouses = ref<SimpleWarehouse[]>([])
  
  /** 仓库数据映射（warehouseId -> hasData） */
  const warehouseDataMap = ref<Map<number, boolean>>(new Map())
  
  /** 仓库司机数量映射（warehouseId -> driverCount） */
  const warehouseDriverCountMap = ref<Map<number, number>>(new Map())
  
  /** 仓库今日件数映射（warehouseId -> todayPieceCount） */
  const warehouseTodayPieceCountMap = ref<Map<number, number>>(new Map())
  
  /** 仓库今日出勤映射（warehouseId -> todayAttendanceCount） */
  const warehouseTodayAttendanceMap = ref<Map<number, number>>(new Map())
  
  /** 仓库类型映射（warehouseId -> warehouseType） */
  const warehouseTypeMap = ref<Map<number, WarehouseType>>(new Map())
  
  /**
   * 加载仓库列表
   * 逻辑与原有 loadWarehouses 完全一致
   * 
   * @throws 加载失败时抛出错误
   */
  async function loadWarehouses(): Promise<void> {
    loading.value = true
    
    try {
      // 获取仓库列表
      const data = await getWarehouses()
      
      // 将 API 返回的 number 类型 id 转换为 string 类型，以匹配组件类型定义
      warehouses.value = data.map(w => ({ id: String(w.id), name: w.name }))
      
      // 创建仓库类型映射（用于获取计量单位）
      const typeMap = new Map<number, WarehouseType>()
      data.forEach(w => {
        if (w.warehouse_type) {
          typeMap.set(w.id, w.warehouse_type)
        }
      })
      warehouseTypeMap.value = typeMap
      
      // 获取日期范围
      const monthStartStr = getMonthStartStr()
      const todayStr = getLocalDateString()
      
      // 并行获取每个仓库的数据
      const warehouseInfoPromises = data.map(async (warehouse) => {
        try {
          // 构建并行请求数组
          const promises: Promise<any>[] = [
            // 本月统计（用于判断是否有数据）
            getPieceWorkStats({
              warehouse_id: warehouse.id,
              start_date: monthStartStr,
              end_date: todayStr,
            }),
          ]
          
          // 如果按今日件数排序，需要获取今日统计
          if (sortBy === 'todayPieceCount') {
            promises.push(
              getPieceWorkStats({
                warehouse_id: warehouse.id,
                start_date: todayStr,
                end_date: todayStr,
              })
            )
          }
          
          // 可选：加载司机数量
          if (includeDriverCount) {
            promises.push(getWarehouseUsers(warehouse.id))
          }
          
          // 可选：加载今日出勤
          if (includeAttendance) {
            promises.push(
              getAttendanceRecords({
                warehouse_id: warehouse.id,
                start_date: todayStr,
                end_date: todayStr,
                limit: 1000,
              })
            )
          }
          
          const results = await Promise.all(promises)
          
          // 解析结果
          let resultIndex = 0
          const monthStats = results[resultIndex++]
          
          let todayPieceCount = 0
          if (sortBy === 'todayPieceCount') {
            const todayStats = results[resultIndex++]
            todayPieceCount = todayStats.total_quantity || 0
          }
          
          let driverCount = 0
          if (includeDriverCount) {
            const users = results[resultIndex++]
            driverCount = users.filter((u: any) => u.role === UserRole.DRIVER).length
          }
          
          let todayAttendanceCount = 0
          if (includeAttendance) {
            const records = results[resultIndex++]
            const uniqueUserIds = new Set(records.map((r: any) => r.user_id))
            todayAttendanceCount = uniqueUserIds.size
          }
          
          return {
            warehouseId: warehouse.id,
            hasData: (monthStats.total_quantity || 0) > 0,
            driverCount,
            todayPieceCount,
            todayAttendanceCount,
          }
        } catch {
          return { 
            warehouseId: warehouse.id, 
            hasData: false, 
            driverCount: 0, 
            todayPieceCount: 0,
            todayAttendanceCount: 0,
          }
        }
      })
      
      const warehouseInfoResults = await Promise.all(warehouseInfoPromises)
      
      // 创建仓库数据映射（直接构建 Map）
      const dataMap = new Map<number, boolean>()
      for (const result of warehouseInfoResults) {
        if (result.hasData) {
          dataMap.set(result.warehouseId, true)
        }
      }
      warehouseDataMap.value = dataMap
      
      // 创建仓库司机数量映射
      const driverCountMap = new Map<number, number>()
      warehouseInfoResults.forEach(r => {
        driverCountMap.set(r.warehouseId, r.driverCount)
      })
      warehouseDriverCountMap.value = driverCountMap
      
      // 创建仓库今日件数映射（用于排序）
      const todayPieceCountMap = new Map<number, number>()
      warehouseInfoResults.forEach(r => {
        todayPieceCountMap.set(r.warehouseId, r.todayPieceCount)
      })
      warehouseTodayPieceCountMap.value = todayPieceCountMap
      
      // 创建仓库今日出勤映射（用于排序）
      const attendanceMap = new Map<number, number>()
      warehouseInfoResults.forEach(r => {
        attendanceMap.set(r.warehouseId, r.todayAttendanceCount)
      })
      warehouseTodayAttendanceMap.value = attendanceMap
    } catch (error) {
      console.error('加载仓库列表失败:', error)
      warehouses.value = []
      throw error
    } finally {
      loading.value = false
    }
  }
  
  return {
    warehouses,
    warehouseDataMap,
    warehouseDriverCountMap,
    warehouseTodayPieceCountMap,
    warehouseTodayAttendanceMap,
    warehouseTypeMap,
    loading,
    loadWarehouses,
  }
}
