/**
 * 日期格式化工具函数
 * 提供人性化的日期显示
 */

/**
 * 将日期字符串转换为本地日期对象（避免时区问题）
 * @param dateStr 日期字符串 (YYYY-MM-DD)
 * @returns Date对象
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * 将日期格式化为人性化的显示文本
 * @param dateStr 日期字符串 (YYYY-MM-DD)
 * @returns 格式化后的文本，如"今天"、"明天"、"后天"、"12月25日"等
 */
export function formatDateHumanReadable(dateStr: string): string {
  if (!dateStr) return ''

  const targetDate = parseLocalDate(dateStr)
  const today = new Date()

  // 重置时间为0点，只比较日期
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)

  // 计算天数差
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  // 根据天数差返回不同的文本
  if (diffDays === 0) {
    return '今天'
  }
  if (diffDays === 1) {
    return '明天'
  }
  if (diffDays === 2) {
    return '后天'
  }
  if (diffDays === -1) {
    return '昨天'
  }
  if (diffDays === -2) {
    return '前天'
  }

  // 其他日期显示月日
  const month = targetDate.getMonth() + 1
  const day = targetDate.getDate()

  // 如果是今年，只显示月日
  if (targetDate.getFullYear() === today.getFullYear()) {
    return `${month}月${day}日`
  }

  // 如果不是今年，显示年月日
  const year = targetDate.getFullYear()
  return `${year}年${month}月${day}日`
}

/**
 * 格式化日期范围为人性化的显示文本
 * @param startDate 开始日期 (YYYY-MM-DD)
 * @param endDate 结束日期 (YYYY-MM-DD)
 * @returns 格式化后的文本，如"明天至后天"、"12月25日至12月27日"等
 */
export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return ''

  const startText = formatDateHumanReadable(startDate)
  const endText = formatDateHumanReadable(endDate)

  // 如果开始和结束日期相同
  if (startDate === endDate) {
    return startText
  }

  return `${startText}至${endText}`
}

/**
 * 格式化请假申请的日期范围（用于通知消息）
 * @param startDate 开始日期 (YYYY-MM-DD)
 * @param endDate 结束日期 (YYYY-MM-DD)
 * @param days 请假天数（可选）
 * @returns 格式化后的文本，如"明天至后天（2天）"
 */
export function formatLeaveDate(startDate: string, endDate: string, days?: number): string {
  const rangeText = formatDateRange(startDate, endDate)

  if (days !== undefined && days > 0) {
    return `${rangeText}（${days}天）`
  }

  return rangeText
}

/**
 * 计算两个日期之间的天数
 * @param startDate 开始日期 (YYYY-MM-DD)
 * @param endDate 结束日期 (YYYY-MM-DD)
 * @returns 天数
 */
export function calculateDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0

  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)

  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 包含结束日期

  return diffDays > 0 ? diffDays : 0
}
