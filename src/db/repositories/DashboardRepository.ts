/**
 * 仪表盘数据 Repository
 * 提供仪表盘统计数据的查询和缓存管理
 *
 * 功能包括：
 * - 获取单个仓库的仪表盘统计数据（带缓存，TTL 2 分钟）
 * - 获取所有仓库的汇总统计数据（带缓存，TTL 2 分钟）
 * - 自动缓存管理和失效
 *
 * @module db/repositories/DashboardRepository
 */

import { supabase } from '@/client/supabase'
import { getCache, setCache, clearCacheByPrefix, CACHE_KEYS } from '@/utils/cache'
import { createLogger, Logger } from '@/utils/logger'
import { getLocalDateString } from '@/utils/date'
import type { DashboardStats } from '../types'

/**
 * 仪表盘缓存配置
 */
const DASHBOARD_CACHE_CONFIG = {
  /** 缓存键前缀 */
  PREFIX: 'dashboard',
  /** 缓存 TTL：2 分钟（仪表盘数据更新频率较高） */
  TTL: 2 * 60 * 1000
}

/**
 * 仪表盘数据 Repository 类
 *
 * 提供仪表盘统计数据的查询功能，内置缓存管理。
 * 缓存 TTL 为 2 分钟，适合仪表盘数据的更新频率。
 *
 * @example
 * ```typescript
 * const dashboardRepo = new DashboardRepository()
 *
 * // 获取单个仓库的统计数据
 * const stats = await dashboardRepo.getWarehouseStats('warehouse-123')
 *
 * // 获取所有仓库的汇总统计数据
 * const allStats = await dashboardRepo.getAllWarehousesStats()
 *
 * // 清除缓存（数据变更后调用）
 * dashboardRepo.invalidateCache()
 * ```
 */
export class DashboardRepository {
  /** 日志记录器实例 */
  private readonly logger: Logger

  /** 是否启用缓存 */
  private readonly enableCache: boolean

  /**
   * 创建 DashboardRepository 实例
   *
   * @param enableCache - 是否启用缓存，默认 true
   */
  constructor(enableCache: boolean = true) {
    this.enableCache = enableCache
    this.logger = createLogger('DashboardRepository')
    this.logger.debug('DashboardRepository 初始化完成', { enableCache })
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 生成缓存键
   *
   * @param suffix - 缓存键后缀
   * @returns 完整的缓存键
   */
  private getCacheKey(suffix: string): string {
    return `${DASHBOARD_CACHE_CONFIG.PREFIX}_${suffix}`
  }

  /**
   * 从缓存获取数据
   *
   * @template R - 返回数据类型
   * @param key - 缓存键
   * @returns 缓存的数据，如果不存在则返回 null
   */
  private getFromCache<R>(key: string): R | null {
    if (!this.enableCache) {
      return null
    }

    const cached = getCache<R>(key)
    if (cached !== null) {
      this.logger.debug('缓存命中', { key })
      return cached
    }

    this.logger.debug('缓存未命中', { key })
    return null
  }

  /**
   * 设置缓存数据
   *
   * @template R - 数据类型
   * @param key - 缓存键
   * @param value - 要缓存的数据
   */
  private setToCache<R>(key: string, value: R): void {
    if (!this.enableCache) {
      return
    }

    setCache(key, value, DASHBOARD_CACHE_CONFIG.TTL)
    this.logger.debug('缓存已设置', { key, ttl: DASHBOARD_CACHE_CONFIG.TTL })
  }

  /**
   * 清除所有仪表盘相关缓存
   * 在数据变更时调用此方法确保下次查询获取最新数据
   */
  public invalidateCache(): void {
    clearCacheByPrefix(DASHBOARD_CACHE_CONFIG.PREFIX)
    // 同时清除旧的缓存键（兼容）
    clearCacheByPrefix(CACHE_KEYS.DASHBOARD_DATA)
    this.logger.info('仪表盘缓存已清除')
  }

  // ==================== 数据查询方法 ====================

  /**
   * 获取仓库仪表盘统计数据（带缓存）
   *
   * 统计内容包括：
   * - 今日出勤人数
   * - 当日总件数
   * - 待审批数量（请假、离职、车辆）
   * - 本月完成件数
   * - 司机列表及其今日数据
   *
   * @param warehouseId - 仓库ID
   * @returns 仪表盘统计数据
   *
   * @example
   * ```typescript
   * const stats = await dashboardRepo.getWarehouseStats('warehouse-123')
   * console.log(`今日出勤: ${stats.todayAttendance}`)
   * console.log(`待审批: ${stats.totalPendingCount}`)
   * ```
   */
  async getWarehouseStats(warehouseId: string): Promise<DashboardStats> {
    // 1. 尝试从缓存获取
    const cacheKey = this.getCacheKey(`warehouse_${warehouseId}`)
    const cached = this.getFromCache<DashboardStats>(cacheKey)
    if (cached) {
      return cached
    }

    // 2. 从数据库查询
    this.logger.debug('从数据库查询仓库统计数据', { warehouseId })
    const result = await this.fetchWarehouseStats(warehouseId)

    // 3. 缓存结果
    this.setToCache(cacheKey, result)

    return result
  }

  /**
   * 获取所有仓库的汇总统计数据（带缓存）
   *
   * 用于老板首页，汇总所有仓库的统计数据。
   *
   * @returns 汇总统计数据
   *
   * @example
   * ```typescript
   * const allStats = await dashboardRepo.getAllWarehousesStats()
   * console.log(`全部今日出勤: ${allStats.todayAttendance}`)
   * ```
   */
  async getAllWarehousesStats(): Promise<DashboardStats> {
    // 1. 尝试从缓存获取
    const cacheKey = this.getCacheKey('all_warehouses')
    const cached = this.getFromCache<DashboardStats>(cacheKey)
    if (cached) {
      return cached
    }

    // 2. 从数据库查询
    this.logger.debug('从数据库查询所有仓库汇总统计数据')
    const result = await this.fetchAllWarehousesStats()

    // 3. 缓存结果
    this.setToCache(cacheKey, result)

    return result
  }

  // ==================== 私有查询方法 ====================

  /**
   * 从数据库获取单个仓库的统计数据
   *
   * @param warehouseId - 仓库ID
   * @returns 仪表盘统计数据
   */
  private async fetchWarehouseStats(warehouseId: string): Promise<DashboardStats> {
    const today = getLocalDateString()
    const firstDayOfMonth = getLocalDateString(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    )

    // 1. 获取该仓库的所有用户ID
    const { data: warehouseAssignments } = await supabase
      .from('warehouse_assignments')
      .select('user_id')
      .eq('warehouse_id', warehouseId)

    const allUserIds = warehouseAssignments?.map((wa) => wa.user_id) || []

    // 2. 过滤出司机ID（排除车队长和老板）
    let driverIds: string[] = []
    if (allUserIds.length > 0) {
      const { data: userRoles } = await supabase
        .from('users')
        .select('id, role')
        .in('id', allUserIds)
        .eq('role', 'DRIVER')
      driverIds = userRoles?.map((ur) => ur.id) || []
    }

    // 3. 并行执行所有统计查询
    const [
      todayAttendanceResult,
      todayPieceResult,
      pendingLeaveResult,
      pendingResignationResult,
      pendingVehicleResult,
      monthlyPieceResult,
      driversResult,
      allTodayAttendanceResult,
      allTodayPieceResult
    ] = await Promise.all([
      // 今日考勤
      supabase
        .from('attendance')
        .select('user_id')
        .eq('warehouse_id', warehouseId)
        .eq('work_date', today),
      // 今日计件
      supabase
        .from('piece_work_records')
        .select('quantity')
        .eq('warehouse_id', warehouseId)
        .eq('work_date', today),
      // 请假待审批
      supabase
        .from('leave_applications')
        .select('id')
        .eq('warehouse_id', warehouseId)
        .eq('status', 'pending'),
      // 离职待审批
      supabase
        .from('resignation_applications')
        .select('id')
        .eq('warehouse_id', warehouseId)
        .eq('status', 'pending'),
      // 车辆待审批
      supabase
        .from('vehicles')
        .select('id')
        .eq('review_status', 'pending'),
      // 本月计件
      supabase
        .from('piece_work_records')
        .select('quantity')
        .eq('warehouse_id', warehouseId)
        .gte('work_date', firstDayOfMonth),
      // 司机列表
      driverIds.length > 0
        ? supabase.from('users').select('id, name, phone').in('id', driverIds)
        : Promise.resolve({ data: null }),
      // 司机今日考勤
      driverIds.length > 0
        ? supabase
            .from('attendance')
            .select('user_id')
            .in('user_id', driverIds)
            .eq('work_date', today)
        : Promise.resolve({ data: null }),
      // 司机今日计件
      driverIds.length > 0
        ? supabase
            .from('piece_work_records')
            .select('user_id, quantity')
            .in('user_id', driverIds)
            .eq('work_date', today)
        : Promise.resolve({ data: null })
    ])

    // 4. 处理统计数据
    const todayAttendance = todayAttendanceResult.data?.length || 0
    const todayPieceCount =
      todayPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0
    const pendingLeaveCount = pendingLeaveResult.data?.length || 0
    const pendingResignationCount = pendingResignationResult.data?.length || 0
    const pendingVehicleCount = pendingVehicleResult.data?.length || 0
    const totalPendingCount = pendingLeaveCount + pendingResignationCount + pendingVehicleCount
    const monthlyPieceCount =
      monthlyPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0

    // 5. 构建司机列表
    const driverList: DashboardStats['driverList'] = []

    if (driversResult.data && driversResult.data.length > 0) {
      // 构建考勤映射
      const attendanceMap = new Set(
        allTodayAttendanceResult.data?.map((record) => record.user_id) || []
      )
      // 构建计件映射
      const pieceCountMap = new Map<string, number>()
      allTodayPieceResult.data?.forEach((record) => {
        const currentCount = pieceCountMap.get(record.user_id) || 0
        pieceCountMap.set(record.user_id, currentCount + (record.quantity || 0))
      })

      // 构建司机列表
      for (const driver of driversResult.data) {
        driverList.push({
          id: driver.id,
          name: driver.name || driver.phone || '未命名',
          phone: driver.phone || '',
          todayAttendance: attendanceMap.has(driver.id),
          todayPieceCount: pieceCountMap.get(driver.id) || 0
        })
      }
    }

    this.logger.debug('仓库统计数据查询完成', {
      warehouseId,
      todayAttendance,
      todayPieceCount,
      totalPendingCount,
      driverCount: driverList.length
    })

    return {
      todayAttendance,
      todayPieceCount,
      pendingLeaveCount,
      pendingResignationCount,
      pendingVehicleCount,
      totalPendingCount,
      monthlyPieceCount,
      driverList
    }
  }

  /**
   * 从数据库获取所有仓库的汇总统计数据
   *
   * @returns 汇总统计数据
   */
  private async fetchAllWarehousesStats(): Promise<DashboardStats> {
    const today = getLocalDateString()
    const firstDayOfMonth = getLocalDateString(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    )

    // 并行查询所有统计数据
    const [
      allDriversResult,
      todayAttendanceResult,
      todayPieceResult,
      pendingLeaveResult,
      pendingResignationResult,
      pendingVehicleResult,
      monthlyPieceResult,
      allTodayAttendanceResult,
      allTodayPieceResult
    ] = await Promise.all([
      // 所有司机
      (async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, phone')
          .eq('role', 'DRIVER')
        return { data, error }
      })(),
      // 今日考勤
      supabase.from('attendance').select('user_id').eq('work_date', today),
      // 今日计件
      supabase.from('piece_work_records').select('quantity').eq('work_date', today),
      // 请假待审批
      supabase.from('leave_applications').select('id').eq('status', 'pending'),
      // 离职待审批
      supabase.from('resignation_applications').select('id').eq('status', 'pending'),
      // 车辆待审批
      supabase.from('vehicles').select('id').eq('review_status', 'pending'),
      // 本月计件
      supabase.from('piece_work_records').select('quantity').gte('work_date', firstDayOfMonth),
      // 所有今日考勤
      supabase.from('attendance').select('user_id').eq('work_date', today),
      // 所有今日计件
      supabase.from('piece_work_records').select('user_id, quantity').eq('work_date', today)
    ])

    // 处理统计数据
    const todayAttendance = todayAttendanceResult.data?.length || 0
    const todayPieceCount =
      todayPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0
    const pendingLeaveCount = pendingLeaveResult.data?.length || 0
    const pendingResignationCount = pendingResignationResult.data?.length || 0
    const pendingVehicleCount = pendingVehicleResult.data?.length || 0
    const totalPendingCount = pendingLeaveCount + pendingResignationCount + pendingVehicleCount
    const monthlyPieceCount =
      monthlyPieceResult.data?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0

    // 构建司机列表
    const driverList: DashboardStats['driverList'] = []

    if (allDriversResult.data && allDriversResult.data.length > 0) {
      // 构建考勤映射
      const attendanceMap = new Set(
        allTodayAttendanceResult.data?.map((record) => record.user_id) || []
      )
      // 构建计件映射
      const pieceCountMap = new Map<string, number>()
      allTodayPieceResult.data?.forEach((record) => {
        const currentCount = pieceCountMap.get(record.user_id) || 0
        pieceCountMap.set(record.user_id, currentCount + (record.quantity || 0))
      })

      // 构建司机列表
      for (const driver of allDriversResult.data) {
        driverList.push({
          id: driver.id,
          name: driver.name || driver.phone || '未命名',
          phone: driver.phone || '',
          todayAttendance: attendanceMap.has(driver.id),
          todayPieceCount: pieceCountMap.get(driver.id) || 0
        })
      }
    }

    this.logger.debug('所有仓库汇总统计数据查询完成', {
      todayAttendance,
      todayPieceCount,
      totalPendingCount,
      driverCount: driverList.length
    })

    return {
      todayAttendance,
      todayPieceCount,
      pendingLeaveCount,
      pendingResignationCount,
      pendingVehicleCount,
      totalPendingCount,
      monthlyPieceCount,
      driverList
    }
  }
}

/**
 * 默认的 DashboardRepository 单例实例
 * 用于全局共享，避免重复创建实例
 */
export const dashboardRepository = new DashboardRepository()
