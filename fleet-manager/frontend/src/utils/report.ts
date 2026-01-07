/**
 * 报表日期计算工具函数模块
 * 提供报表功能所需的日期范围计算、导航和格式化函数
 * 
 * @module utils/report
 * 
 * Requirements: 2.2, 2.3, 2.4, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { ReportPeriodType, DateRange } from '@/types/report'
import { getLocalDateString } from './date'

/**
 * 解析日期字符串为 Date 对象（本地时间）
 * 避免时区问题，使用本地时间解析
 * 
 * @param dateStr - 日期字符串，格式 'YYYY-MM-DD'
 * @returns Date 对象
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * 获取指定日期所在周的周一
 * 
 * @param date - Date 对象
 * @returns 周一的 Date 对象
 */
function getMondayOfWeek(date: Date): Date {
  const result = new Date(date)
  const dayOfWeek = result.getDay()
  // 周日(0)需要减6天，其他天减 (dayOfWeek - 1) 天
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  result.setDate(result.getDate() - daysToMonday)
  return result
}

/**
 * 获取指定日期所在月的第一天
 * 
 * @param date - Date 对象
 * @returns 月初的 Date 对象
 */
function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * 计算报表周期的日期范围
 * 根据周期类型和基准日期，计算开始日期和结束日期
 * 
 * @param periodType - 周期类型（daily/weekly/monthly）
 * @param baseDate - 基准日期，Date 对象或日期字符串
 * @returns 日期范围对象，包含 startDate 和 endDate
 * 
 * @example
 * // 日报：开始和结束都是同一天
 * calculateDateRange(ReportPeriodType.DAILY, new Date('2026-01-06'))
 * // { startDate: '2026-01-06', endDate: '2026-01-06' }
 * 
 * @example
 * // 周报：从周一到基准日期（不超过今天）
 * calculateDateRange(ReportPeriodType.WEEKLY, new Date('2026-01-08'))
 * // { startDate: '2026-01-06', endDate: '2026-01-08' }
 * 
 * @example
 * // 月报：从月初到基准日期（不超过今天）
 * calculateDateRange(ReportPeriodType.MONTHLY, new Date('2026-01-15'))
 * // { startDate: '2026-01-01', endDate: '2026-01-15' }
 * 
 * Requirements: 2.2, 2.3, 2.4, 7.1
 * Validates: Property 1 - 日期范围计算正确性
 */
export function calculateDateRange(
  periodType: ReportPeriodType,
  baseDate: Date | string
): DateRange {
  // 统一转换为 Date 对象
  const date = typeof baseDate === 'string' ? parseLocalDate(baseDate) : new Date(baseDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let startDate: Date
  let endDate: Date
  
  switch (periodType) {
    case ReportPeriodType.DAILY:
      // 日报：开始和结束都是同一天
      startDate = new Date(date)
      endDate = new Date(date)
      break
      
    case ReportPeriodType.WEEKLY:
      // 周报：从周一开始
      startDate = getMondayOfWeek(date)
      endDate = new Date(date)
      break
      
    case ReportPeriodType.MONTHLY:
      // 月报：从月初开始
      startDate = getFirstDayOfMonth(date)
      endDate = new Date(date)
      break
      
    default:
      // 默认按日报处理
      startDate = new Date(date)
      endDate = new Date(date)
  }
  
  // 确保结束日期不超过今天
  if (endDate > today) {
    endDate = today
  }
  
  return {
    startDate: getLocalDateString(startDate),
    endDate: getLocalDateString(endDate)
  }
}


/**
 * 导航到上一个周期
 * 根据周期类型，计算上一个周期的基准日期
 * 
 * @param periodType - 周期类型（daily/weekly/monthly）
 * @param currentDate - 当前基准日期，Date 对象或日期字符串
 * @returns 上一个周期的基准日期（Date 对象）
 * 
 * @example
 * // 日报：前一天
 * navigatePrevious(ReportPeriodType.DAILY, new Date('2026-01-06'))
 * // Date('2026-01-05')
 * 
 * @example
 * // 周报：前一周（减7天）
 * navigatePrevious(ReportPeriodType.WEEKLY, new Date('2026-01-08'))
 * // Date('2026-01-01')
 * 
 * @example
 * // 月报：上一个月
 * navigatePrevious(ReportPeriodType.MONTHLY, new Date('2026-01-15'))
 * // Date('2025-12-15')
 * 
 * Requirements: 7.2
 * Validates: Property 5 - 日期导航正确性
 */
export function navigatePrevious(
  periodType: ReportPeriodType,
  currentDate: Date | string
): Date {
  // 统一转换为 Date 对象
  const date = typeof currentDate === 'string' ? parseLocalDate(currentDate) : new Date(currentDate)
  const result = new Date(date)
  
  switch (periodType) {
    case ReportPeriodType.DAILY:
      // 日报：减1天
      result.setDate(result.getDate() - 1)
      break
      
    case ReportPeriodType.WEEKLY:
      // 周报：减7天
      result.setDate(result.getDate() - 7)
      break
      
    case ReportPeriodType.MONTHLY:
      // 月报：减1个月
      result.setMonth(result.getMonth() - 1)
      break
  }
  
  return result
}


/**
 * 导航到下一个周期
 * 根据周期类型，计算下一个周期的基准日期
 * 注意：返回的日期可能超过今天，需要配合 canNavigateNext 使用
 * 
 * @param periodType - 周期类型（daily/weekly/monthly）
 * @param currentDate - 当前基准日期，Date 对象或日期字符串
 * @returns 下一个周期的基准日期（Date 对象）
 * 
 * @example
 * // 日报：后一天
 * navigateNext(ReportPeriodType.DAILY, new Date('2026-01-05'))
 * // Date('2026-01-06')
 * 
 * @example
 * // 周报：后一周（加7天）
 * navigateNext(ReportPeriodType.WEEKLY, new Date('2026-01-01'))
 * // Date('2026-01-08')
 * 
 * @example
 * // 月报：下一个月
 * navigateNext(ReportPeriodType.MONTHLY, new Date('2025-12-15'))
 * // Date('2026-01-15')
 * 
 * Requirements: 7.3
 * Validates: Property 5 - 日期导航正确性
 */
export function navigateNext(
  periodType: ReportPeriodType,
  currentDate: Date | string
): Date {
  // 统一转换为 Date 对象
  const date = typeof currentDate === 'string' ? parseLocalDate(currentDate) : new Date(currentDate)
  const result = new Date(date)
  
  switch (periodType) {
    case ReportPeriodType.DAILY:
      // 日报：加1天
      result.setDate(result.getDate() + 1)
      break
      
    case ReportPeriodType.WEEKLY:
      // 周报：加7天
      result.setDate(result.getDate() + 7)
      break
      
    case ReportPeriodType.MONTHLY:
      // 月报：加1个月
      result.setMonth(result.getMonth() + 1)
      break
  }
  
  return result
}


/**
 * 格式化周期标签
 * 根据周期类型和日期，生成用于显示的标签文本
 * 
 * @param periodType - 周期类型（daily/weekly/monthly）
 * @param date - 基准日期，Date 对象或日期字符串
 * @returns 格式化的周期标签
 * 
 * @example
 * // 日报：显示完整日期
 * formatPeriodLabel(ReportPeriodType.DAILY, new Date('2026-01-06'))
 * // '2026年1月6日'
 * 
 * @example
 * // 周报：显示周范围
 * formatPeriodLabel(ReportPeriodType.WEEKLY, new Date('2026-01-08'))
 * // '1月6日 - 1月8日'
 * 
 * @example
 * // 月报：显示年月
 * formatPeriodLabel(ReportPeriodType.MONTHLY, new Date('2026-01-15'))
 * // '2026年1月'
 * 
 * Requirements: 7.1
 */
export function formatPeriodLabel(
  periodType: ReportPeriodType,
  date: Date | string
): string {
  // 统一转换为 Date 对象
  const baseDate = typeof date === 'string' ? parseLocalDate(date) : new Date(date)
  
  switch (periodType) {
    case ReportPeriodType.DAILY: {
      // 日报：显示完整日期 "2026年1月6日"
      const year = baseDate.getFullYear()
      const month = baseDate.getMonth() + 1
      const day = baseDate.getDate()
      return `${year}年${month}月${day}日`
    }
    
    case ReportPeriodType.WEEKLY: {
      // 周报：显示周范围 "1月6日 - 1月8日"
      const { startDate, endDate } = calculateDateRange(periodType, baseDate)
      const start = parseLocalDate(startDate)
      const end = parseLocalDate(endDate)
      
      const startMonth = start.getMonth() + 1
      const startDay = start.getDate()
      const endMonth = end.getMonth() + 1
      const endDay = end.getDate()
      
      // 如果跨年，显示年份
      if (start.getFullYear() !== end.getFullYear()) {
        return `${start.getFullYear()}年${startMonth}月${startDay}日 - ${end.getFullYear()}年${endMonth}月${endDay}日`
      }
      
      // 如果跨月，显示月份
      if (startMonth !== endMonth) {
        return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`
      }
      
      // 同月，简化显示
      return `${startMonth}月${startDay}日 - ${endDay}日`
    }
    
    case ReportPeriodType.MONTHLY: {
      // 月报：显示年月 "2026年1月"
      const year = baseDate.getFullYear()
      const month = baseDate.getMonth() + 1
      return `${year}年${month}月`
    }
    
    default:
      return ''
  }
}


/**
 * 检查是否可以导航到下一个周期
 * 如果下一个周期的开始日期超过今天，则不允许导航
 * 
 * @param periodType - 周期类型（daily/weekly/monthly）
 * @param currentDate - 当前基准日期，Date 对象或日期字符串
 * @returns 是否可以导航到下一个周期
 * 
 * @example
 * // 假设今天是 2026-01-06
 * canNavigateNext(ReportPeriodType.DAILY, new Date('2026-01-06'))
 * // false（已经是今天，不能往后导航）
 * 
 * canNavigateNext(ReportPeriodType.DAILY, new Date('2026-01-05'))
 * // true（可以导航到今天）
 * 
 * Requirements: 7.4
 * Validates: Property 5 - 日期导航正确性
 */
export function canNavigateNext(
  periodType: ReportPeriodType,
  currentDate: Date | string
): boolean {
  // 获取下一个周期的日期
  const nextDate = navigateNext(periodType, currentDate)
  
  // 获取今天的日期（清除时间部分）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  nextDate.setHours(0, 0, 0, 0)
  
  // 如果下一个周期的日期不超过今天，则可以导航
  return nextDate <= today
}

/**
 * 获取今天的日期作为报表的默认基准日期
 * 
 * @returns 今天的 Date 对象
 */
export function getDefaultBaseDate(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * 将 Date 对象转换为日期字符串
 * 
 * @param date - Date 对象
 * @returns 日期字符串，格式 'YYYY-MM-DD'
 */
export function dateToString(date: Date): string {
  return getLocalDateString(date)
}
