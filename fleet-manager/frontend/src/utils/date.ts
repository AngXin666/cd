/**
 * 日期工具函数模块
 * 提供日期计算和获取相关的工具函数
 * @module utils/date
 * 
 * Requirements: 2.3, 3.4, 3.5
 */

/**
 * 日期范围接口
 * 用于表示一个日期范围的开始和结束日期
 */
export interface DateRange {
  /** 开始日期，格式 'YYYY-MM-DD' */
  startDate: string
  /** 结束日期，格式 'YYYY-MM-DD' */
  endDate: string
}

/**
 * 获取今日日期范围
 * 返回今日的开始和结束日期（同一天）
 * 
 * @returns 今日的日期范围
 * 
 * @example
 * // 假设今天是 2024-12-25
 * getTodayRange() // { startDate: '2024-12-25', endDate: '2024-12-25' }
 * 
 * Requirements: 3.5
 */
export function getTodayRange(): DateRange {
  const today = getLocalDateString()
  return {
    startDate: today,
    endDate: today
  }
}

/**
 * 获取本周日期范围（周一到今天）
 * 返回本周一到今天的日期范围
 * 
 * @returns 本周的日期范围
 * 
 * @example
 * // 假设今天是周三 2024-12-25
 * getWeekRange() // { startDate: '2024-12-23', endDate: '2024-12-25' }
 * 
 * Requirements: 3.5
 */
export function getWeekRange(): DateRange {
  const today = getLocalDateString()
  const monday = getMondayDateString()
  return {
    startDate: monday,
    endDate: today
  }
}

/**
 * 获取本月日期范围（本月1日到今天）
 * 返回本月第一天到今天的日期范围
 * 
 * @returns 本月的日期范围
 * 
 * @example
 * // 假设今天是 2024-12-25
 * getMonthRange() // { startDate: '2024-12-01', endDate: '2024-12-25' }
 * 
 * Requirements: 3.5
 */
export function getMonthRange(): DateRange {
  const today = getLocalDateString()
  const firstDay = getFirstDayOfMonthString()
  return {
    startDate: firstDay,
    endDate: today
  }
}

/**
 * 获取今天的日期字符串
 * 
 * @returns 今天的日期，格式 'YYYY-MM-DD'
 * 
 * @example
 * getLocalDateString() // '2024-12-24'
 */
export function getLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取昨天的日期字符串
 * 
 * @returns 昨天的日期，格式 'YYYY-MM-DD'
 * 
 * @example
 * getYesterdayDateString() // '2024-12-23'
 */
export function getYesterdayDateString(): string {
  const now = new Date()
  // 减去一天的毫秒数
  now.setDate(now.getDate() - 1)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取本周一的日期字符串
 * 
 * @returns 本周一的日期，格式 'YYYY-MM-DD'
 * 
 * @example
 * // 假设今天是周三 2024-12-25
 * getMondayDateString() // '2024-12-23'
 */
export function getMondayDateString(): string {
  const now = new Date()
  // 获取当前是周几（0=周日, 1=周一, ..., 6=周六）
  const dayOfWeek = now.getDay()
  // 计算到周一需要减去的天数
  // 如果是周日(0)，需要减去6天；否则减去 (dayOfWeek - 1) 天
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  now.setDate(now.getDate() - daysToMonday)
  
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取本月第一天的日期字符串
 * 
 * @returns 本月第一天的日期，格式 'YYYY-MM-DD'
 * 
 * @example
 * // 假设今天是 2024-12-25
 * getFirstDayOfMonthString() // '2024-12-01'
 */
export function getFirstDayOfMonthString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

/**
 * 获取指定日期的前一天
 * 
 * @param dateStr - 日期字符串，格式 'YYYY-MM-DD'
 * @returns 前一天的日期字符串，格式 'YYYY-MM-DD'
 * 
 * @example
 * getPreviousDay('2024-12-25') // '2024-12-24'
 * getPreviousDay('2024-01-01') // '2023-12-31'
 */
export function getPreviousDay(dateStr: string): string {
  // 解析日期字符串
  const date = new Date(dateStr)
  // 减去一天
  date.setDate(date.getDate() - 1)
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取指定日期的后一天
 * 
 * @param dateStr - 日期字符串，格式 'YYYY-MM-DD'
 * @returns 后一天的日期字符串，格式 'YYYY-MM-DD'
 * 
 * @example
 * getNextDay('2024-12-25') // '2024-12-26'
 * getNextDay('2024-12-31') // '2025-01-01'
 */
export function getNextDay(dateStr: string): string {
  // 解析日期字符串
  const date = new Date(dateStr)
  // 加上一天
  date.setDate(date.getDate() + 1)
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 比较两个日期字符串
 * 
 * @param dateStr1 - 第一个日期字符串，格式 'YYYY-MM-DD'
 * @param dateStr2 - 第二个日期字符串，格式 'YYYY-MM-DD'
 * @returns 负数表示 dateStr1 < dateStr2，0 表示相等，正数表示 dateStr1 > dateStr2
 * 
 * @example
 * compareDates('2024-12-24', '2024-12-25') // -1
 * compareDates('2024-12-25', '2024-12-25') // 0
 * compareDates('2024-12-26', '2024-12-25') // 1
 */
export function compareDates(dateStr1: string, dateStr2: string): number {
  const date1 = new Date(dateStr1).getTime()
  const date2 = new Date(dateStr2).getTime()
  
  if (date1 < date2) return -1
  if (date1 > date2) return 1
  return 0
}

/**
 * 检查日期是否在指定范围内
 * 
 * @param dateStr - 要检查的日期字符串，格式 'YYYY-MM-DD'
 * @param startDate - 开始日期字符串，格式 'YYYY-MM-DD'
 * @param endDate - 结束日期字符串，格式 'YYYY-MM-DD'
 * @returns 是否在范围内（包含边界）
 * 
 * @example
 * isDateInRange('2024-12-25', '2024-12-24', '2024-12-26') // true
 * isDateInRange('2024-12-23', '2024-12-24', '2024-12-26') // false
 */
export function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  return compareDates(dateStr, startDate) >= 0 && compareDates(dateStr, endDate) <= 0
}
