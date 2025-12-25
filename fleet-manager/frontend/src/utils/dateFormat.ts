/**
 * 日期格式化工具函数模块
 * 提供各种日期格式化相关的工具函数
 * @module utils/dateFormat
 * 
 * Requirements: 2.9, 3.8
 */

/**
 * 格式化为中文日期 (YYYY年M月D日)
 * 
 * @param dateStr - 日期字符串，格式 'YYYY-MM-DD' 或 ISO 格式
 * @returns 中文格式的日期字符串，如 '2024年12月24日'
 * 
 * @example
 * formatDateChineseYMD('2024-12-24') // '2024年12月24日'
 * formatDateChineseYMD('2024-01-05') // '2024年1月5日'
 */
export function formatDateChineseYMD(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  
  const year = date.getFullYear()
  // 月份不补零，更符合中文习惯
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  return `${year}年${month}月${day}日`
}

/**
 * 格式化为短日期 (M/D)
 * 
 * @param dateStr - 日期字符串，格式 'YYYY-MM-DD' 或 ISO 格式
 * @returns 短格式的日期字符串，如 '12/24'
 * 
 * @example
 * formatDateShort('2024-12-24') // '12/24'
 * formatDateShort('2024-01-05') // '1/5'
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  
  // 月份和日期不补零
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  return `${month}/${day}`
}

/**
 * 格式化时间 (HH:mm)
 * 
 * @param dateTimeStr - 日期时间字符串，ISO 格式或包含时间的字符串
 * @returns 时间字符串，如 '14:30'
 * 
 * @example
 * formatTime('2024-12-24T14:30:00') // '14:30'
 * formatTime('2024-12-24 08:05:00') // '08:05'
 */
export function formatTime(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return ''
  
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return ''
  
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${hours}:${minutes}`
}

/**
 * 格式化为中文日期时间 (YYYY年M月D日 HH:mm)
 * 
 * @param dateTimeStr - 日期时间字符串，ISO 格式或包含时间的字符串
 * @returns 中文格式的日期时间字符串，如 '2024年12月24日 14:30'
 * 
 * @example
 * formatDateTimeChineseYMD('2024-12-24T14:30:00') // '2024年12月24日 14:30'
 * formatDateTimeChineseYMD('2024-01-05 08:05:00') // '2024年1月5日 08:05'
 */
export function formatDateTimeChineseYMD(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return ''
  
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return ''
  
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}年${month}月${day}日 ${hours}:${minutes}`
}

/**
 * 格式化为相对时间描述
 * 
 * @param dateTimeStr - 日期时间字符串
 * @returns 相对时间描述，如 '刚刚'、'5分钟前'、'昨天'
 * 
 * @example
 * formatRelativeTime('2024-12-24T14:30:00') // '5分钟前' (假设当前时间是 14:35)
 */
export function formatRelativeTime(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return ''
  
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return ''
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  // 1分钟内
  if (diffSeconds < 60) {
    return '刚刚'
  }
  
  // 1小时内
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  }
  
  // 24小时内
  if (diffHours < 24) {
    return `${diffHours}小时前`
  }
  
  // 昨天
  if (diffDays === 1) {
    return '昨天'
  }
  
  // 7天内
  if (diffDays < 7) {
    return `${diffDays}天前`
  }
  
  // 超过7天，显示具体日期
  return formatDateChineseYMD(dateTimeStr)
}

/**
 * 获取星期几的中文名称
 * 
 * @param dateStr - 日期字符串，格式 'YYYY-MM-DD'
 * @returns 星期几的中文名称，如 '星期一'
 * 
 * @example
 * getWeekdayName('2024-12-24') // '星期二'
 */
export function getWeekdayName(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[date.getDay()]
}

/**
 * 格式化日期范围
 * 
 * @param startDate - 开始日期字符串
 * @param endDate - 结束日期字符串
 * @returns 格式化的日期范围，如 '12/24 - 12/26'
 * 
 * @example
 * formatDateRange('2024-12-24', '2024-12-26') // '12/24 - 12/26'
 */
export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): string {
  const start = formatDateShort(startDate)
  const end = formatDateShort(endDate)
  
  if (!start && !end) return ''
  if (!start) return end
  if (!end) return start
  
  return `${start} - ${end}`
}
