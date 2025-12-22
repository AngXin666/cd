/**
 * 考勤数据 Repository
 * 提供考勤记录的数据访问层，带有缓存支持
 *
 * 功能包括：
 * - 获取今日考勤记录（带缓存，TTL 2 分钟）
 * - 获取月度考勤记录（带缓存，TTL 2 分钟）
 * - 获取考勤统计数据（带缓存，TTL 2 分钟）
 * - 创建/更新考勤记录时自动清除缓存
 *
 * @module db/repositories/AttendanceRepository
 */

import { BaseRepository, type BaseEntity, type QueryOptions } from './BaseRepository'
import type {
  AttendanceRecord,
  AttendanceRecordInput,
  AttendanceRecordUpdate,
  AttendanceStatus
} from '../types'

// ==================== 缓存配置常量 ====================

/**
 * 考勤缓存 TTL：2 分钟
 * 考勤数据更新频率较高，使用较短的缓存时间
 */
const ATTENDANCE_CACHE_TTL = 2 * 60 * 1000

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = 'attendance'

// ==================== 类型定义 ====================

/**
 * 考勤记录实体接口
 * 继承 BaseEntity 以支持 BaseRepository 的泛型约束
 */
interface AttendanceEntity extends Omit<AttendanceRecord, 'created_at'>, BaseEntity {}

/**
 * 考勤统计数据接口
 */
export interface AttendanceStats {
  /** 总出勤天数 */
  totalDays: number
  /** 正常出勤天数 */
  normalDays: number
  /** 迟到天数 */
  lateDays: number
  /** 早退天数 */
  earlyDays: number
  /** 缺勤天数 */
  absentDays: number
  /** 总工作时长（小时） */
  totalWorkHours: number
}

// ==================== AttendanceRepository 类 ====================

/**
 * 考勤数据 Repository
 * 提供考勤记录的数据访问，带有缓存支持
 *
 * @example
 * ```typescript
 * import { attendanceRepository } from '@/db/repositories'
 *
 * // 获取用户今日考勤
 * const todayAttendance = await attendanceRepository.getTodayAttendance(userId)
 *
 * // 获取用户月度考勤
 * const monthlyAttendance = await attendanceRepository.getMonthlyAttendance(userId, 2024, 12)
 *
 * // 获取考勤统计
 * const stats = await attendanceRepository.getAttendanceStats(userId, '2024-12-01', '2024-12-31')
 *
 * // 创建考勤记录
 * const record = await attendanceRepository.createAttendance({
 *   user_id: userId,
 *   work_date: '2024-12-21',
 *   clock_in_time: '09:00:00'
 * })
 * ```
 */
export class AttendanceRepository extends BaseRepository<AttendanceEntity> {
  /**
   * 创建 AttendanceRepository 实例
   * 配置考勤表和缓存设置
   */
  constructor() {
    super({
      tableName: 'attendance',
      cachePrefix: CACHE_PREFIX,
      defaultTTL: ATTENDANCE_CACHE_TTL,
      enableCache: true
    })
  }

  // ==================== 查询方法 ====================

  /**
   * 获取用户今日考勤记录
   * 带缓存支持，TTL 2 分钟
   *
   * @param userId - 用户 ID
   * @param options - 查询选项
   * @returns 今日考勤记录，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const todayAttendance = await attendanceRepository.getTodayAttendance('user-123')
   * if (todayAttendance) {
   *   console.log('打卡时间:', todayAttendance.clock_in_time)
   * }
   * ```
   */
  async getTodayAttendance(userId: string, options: QueryOptions = {}): Promise<AttendanceRecord | null> {
    const { useCache = true, cacheTTL = ATTENDANCE_CACHE_TTL } = options
    
    // 获取今日日期（格式：YYYY-MM-DD）
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = this.getCacheKey(`today_${userId}_${today}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<AttendanceRecord>(cacheKey)
      if (cached) {
        this.logger.debug('今日考勤缓存命中', { userId, date: today })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询今日考勤', { userId, date: today })
    const { data, error } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', today)
      .maybeSingle()

    if (error) {
      this.logger.error('获取今日考勤失败', { userId, date: today, error: error.message })
      return null
    }

    // 缓存结果（即使为 null 也缓存，避免重复查询）
    if (useCache && data) {
      this.setToCache(cacheKey, data, cacheTTL)
      this.logger.debug('今日考勤已缓存', { userId, date: today })
    }

    return data as AttendanceRecord | null
  }

  /**
   * 获取用户月度考勤记录
   * 带缓存支持，TTL 2 分钟
   *
   * @param userId - 用户 ID
   * @param year - 年份
   * @param month - 月份（1-12）
   * @param options - 查询选项
   * @returns 月度考勤记录列表
   *
   * @example
   * ```typescript
   * const monthlyAttendance = await attendanceRepository.getMonthlyAttendance('user-123', 2024, 12)
   * console.log(`本月出勤 ${monthlyAttendance.length} 天`)
   * ```
   */
  async getMonthlyAttendance(
    userId: string,
    year: number,
    month: number,
    options: QueryOptions = {}
  ): Promise<AttendanceRecord[]> {
    const { useCache = true, cacheTTL = ATTENDANCE_CACHE_TTL } = options
    
    // 计算月份的起止日期
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0] // 月末日期
    
    const cacheKey = this.getCacheKey(`monthly_${userId}_${year}_${month}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<AttendanceRecord[]>(cacheKey)
      if (cached) {
        this.logger.debug('月度考勤缓存命中', { userId, year, month, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询月度考勤', { userId, year, month, startDate, endDate })
    const { data, error } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: true })

    if (error) {
      this.logger.error('获取月度考勤失败', { userId, year, month, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('月度考勤已缓存', { userId, year, month, count: result.length })
    }

    return result as AttendanceRecord[]
  }

  /**
   * 获取用户考勤统计数据
   * 带缓存支持，TTL 2 分钟
   *
   * @param userId - 用户 ID
   * @param startDate - 开始日期（格式：YYYY-MM-DD）
   * @param endDate - 结束日期（格式：YYYY-MM-DD）
   * @param options - 查询选项
   * @returns 考勤统计数据
   *
   * @example
   * ```typescript
   * const stats = await attendanceRepository.getAttendanceStats('user-123', '2024-12-01', '2024-12-31')
   * console.log(`正常出勤 ${stats.normalDays} 天，迟到 ${stats.lateDays} 天`)
   * ```
   */
  async getAttendanceStats(
    userId: string,
    startDate: string,
    endDate: string,
    options: QueryOptions = {}
  ): Promise<AttendanceStats> {
    const { useCache = true, cacheTTL = ATTENDANCE_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`stats_${userId}_${startDate}_${endDate}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<AttendanceStats>(cacheKey)
      if (cached) {
        this.logger.debug('考勤统计缓存命中', { userId, startDate, endDate })
        return cached
      }
    }

    // 从数据库查询考勤记录
    this.logger.debug('从数据库查询考勤统计', { userId, startDate, endDate })
    const { data, error } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('work_date', startDate)
      .lte('work_date', endDate)

    if (error) {
      this.logger.error('获取考勤统计失败', { userId, startDate, endDate, error: error.message })
      return this.getEmptyStats()
    }

    const records = Array.isArray(data) ? data : []

    // 计算统计数据
    const stats = this.calculateStats(records as AttendanceRecord[])

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, stats, cacheTTL)
      this.logger.debug('考勤统计已缓存', { userId, startDate, endDate })
    }

    return stats
  }

  /**
   * 获取所有考勤记录
   * 带缓存支持，TTL 2 分钟
   *
   * @param options - 查询选项
   * @returns 所有考勤记录列表
   */
  async getAllAttendanceRecords(options: QueryOptions = {}): Promise<AttendanceRecord[]> {
    const { useCache = true, cacheTTL = ATTENDANCE_CACHE_TTL, limit = 1000 } = options
    const cacheKey = this.getCacheKey('all')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<AttendanceRecord[]>(cacheKey)
      if (cached) {
        this.logger.debug('所有考勤记录缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询所有考勤记录')
    const { data, error } = await this.supabase
      .from('attendance')
      .select('*')
      .order('work_date', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error('获取所有考勤记录失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
      this.logger.debug('所有考勤记录已缓存', { count: result.length })
    }

    return result as AttendanceRecord[]
  }

  /**
   * 根据用户 ID 获取考勤记录
   *
   * @param userId - 用户 ID
   * @param options - 查询选项
   * @returns 用户的考勤记录列表
   */
  async getByUser(userId: string, options: QueryOptions = {}): Promise<AttendanceRecord[]> {
    const { useCache = true, cacheTTL = ATTENDANCE_CACHE_TTL, limit = 100 } = options
    const cacheKey = this.getCacheKey(`user_${userId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<AttendanceRecord[]>(cacheKey)
      if (cached) {
        this.logger.debug('用户考勤记录缓存命中', { userId, count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询用户考勤记录', { userId })
    const { data, error } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('work_date', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error('获取用户考勤记录失败', { userId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as AttendanceRecord[]
  }

  // ==================== 写操作方法 ====================

  /**
   * 创建考勤记录
   * 创建成功后自动清除相关缓存
   *
   * @param input - 考勤记录输入数据
   * @returns 创建的考勤记录，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const record = await attendanceRepository.createAttendance({
   *   user_id: 'user-123',
   *   work_date: '2024-12-21',
   *   clock_in_time: '09:00:00',
   *   warehouse_id: 'warehouse-456'
   * })
   * ```
   */
  async createAttendance(input: AttendanceRecordInput): Promise<AttendanceRecord | null> {
    this.logger.debug('创建考勤记录', { userId: input.user_id, date: input.work_date })

    const { data, error } = await this.supabase
      .from('attendance')
      .insert({
        user_id: input.user_id,
        work_date: input.work_date,
        clock_in_time: input.clock_in_time,
        warehouse_id: input.warehouse_id,
        status: input.status || 'normal',
        notes: input.notes
      })
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('创建考勤记录失败', { input, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('考勤记录创建成功', { id: (data as AttendanceRecord)?.id })
    return data as AttendanceRecord | null
  }

  /**
   * 更新考勤记录
   * 更新成功后自动清除相关缓存
   *
   * @param id - 考勤记录 ID
   * @param update - 更新数据
   * @returns 更新后的考勤记录，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const updated = await attendanceRepository.updateAttendance('record-123', {
   *   clock_out_time: '18:00:00',
   *   work_hours: 8
   * })
   * ```
   */
  async updateAttendance(id: string, update: AttendanceRecordUpdate): Promise<AttendanceRecord | null> {
    this.logger.debug('更新考勤记录', { id, update })

    const { data, error } = await this.supabase
      .from('attendance')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('更新考勤记录失败', { id, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('考勤记录更新成功', { id })
    return data as AttendanceRecord | null
  }

  /**
   * 打卡（上班）
   * 创建或更新今日考勤记录的上班打卡时间
   *
   * @param userId - 用户 ID
   * @param warehouseId - 仓库 ID（可选）
   * @returns 考勤记录，如果失败则返回 null
   */
  async clockIn(userId: string, warehouseId?: string): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split('T')[0]
    const clockInTime = new Date().toTimeString().split(' ')[0] // HH:MM:SS 格式

    this.logger.debug('上班打卡', { userId, date: today, time: clockInTime })

    // 检查今日是否已有考勤记录
    const existing = await this.getTodayAttendance(userId, { useCache: false })

    if (existing) {
      // 已有记录，更新打卡时间
      return this.updateAttendance(existing.id, { clock_in_time: clockInTime } as AttendanceRecordUpdate)
    }

    // 创建新记录
    return this.createAttendance({
      user_id: userId,
      work_date: today,
      clock_in_time: clockInTime,
      warehouse_id: warehouseId,
      status: 'normal'
    })
  }

  /**
   * 打卡（下班）
   * 更新今日考勤记录的下班打卡时间
   *
   * @param userId - 用户 ID
   * @returns 考勤记录，如果失败则返回 null
   */
  async clockOut(userId: string): Promise<AttendanceRecord | null> {
    const clockOutTime = new Date().toTimeString().split(' ')[0] // HH:MM:SS 格式

    this.logger.debug('下班打卡', { userId, time: clockOutTime })

    // 获取今日考勤记录
    const existing = await this.getTodayAttendance(userId, { useCache: false })

    if (!existing) {
      this.logger.warn('下班打卡失败：今日无上班打卡记录', { userId })
      return null
    }

    // 计算工作时长（小时）
    let workHours: number | undefined
    if (existing.clock_in_time) {
      const clockIn = new Date(`1970-01-01T${existing.clock_in_time}`)
      const clockOut = new Date(`1970-01-01T${clockOutTime}`)
      workHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
    }

    return this.updateAttendance(existing.id, {
      clock_out_time: clockOutTime,
      work_hours: workHours
    })
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 计算考勤统计数据
   *
   * @param records - 考勤记录列表
   * @returns 考勤统计数据
   */
  private calculateStats(records: AttendanceRecord[]): AttendanceStats {
    const stats: AttendanceStats = {
      totalDays: records.length,
      normalDays: 0,
      lateDays: 0,
      earlyDays: 0,
      absentDays: 0,
      totalWorkHours: 0
    }

    for (const record of records) {
      // 统计各状态天数
      switch (record.status) {
        case 'normal':
          stats.normalDays++
          break
        case 'late':
          stats.lateDays++
          break
        case 'early':
          stats.earlyDays++
          break
        case 'absent':
          stats.absentDays++
          break
      }

      // 累计工作时长
      if (record.work_hours) {
        stats.totalWorkHours += record.work_hours
      }
    }

    return stats
  }

  /**
   * 获取空的统计数据
   *
   * @returns 空的考勤统计数据
   */
  private getEmptyStats(): AttendanceStats {
    return {
      totalDays: 0,
      normalDays: 0,
      lateDays: 0,
      earlyDays: 0,
      absentDays: 0,
      totalWorkHours: 0
    }
  }
}

// ==================== 单例导出 ====================

/**
 * AttendanceRepository 单例实例
 * 推荐使用此实例而非创建新实例
 */
export const attendanceRepository = new AttendanceRepository()
