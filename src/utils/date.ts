/**
 * 日期工具函数
 * 避免使用toISOString()导致的时区问题
 */

/**
 * 获取本地日期字符串（YYYY-MM-DD格式）
 * @param date 日期对象，默认为当前日期
 * @returns 格式化的日期字符串
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取明天的日期字符串
 * @returns 明天的日期字符串（YYYY-MM-DD格式）
 */
export function getTomorrowDateString(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return getLocalDateString(tomorrow)
}

/**
 * 获取昨天的日期字符串
 * @returns 昨天的日期字符串（YYYY-MM-DD格式）
 */
export function getYesterdayDateString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return getLocalDateString(yesterday)
}

/**
 * 获取N天前的日期字符串
 * @param days 天数
 * @returns N天前的日期字符串（YYYY-MM-DD格式）
 */
export function getDaysAgoDateString(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return getLocalDateString(date)
}

/**
 * 获取本周一的日期字符串
 * @returns 本周一的日期字符串（YYYY-MM-DD格式）
 */
export function getMondayDateString(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return getLocalDateString(monday)
}

/**
 * 获取本月第一天的日期字符串
 * @returns 本月第一天的日期字符串（YYYY-MM-DD格式）
 */
export function getFirstDayOfMonthString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`
}
