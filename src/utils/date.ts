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

/**
 * 从身份证号提取出生日期
 * @param idCardNumber 身份证号（15位或18位）
 * @returns 出生日期字符串（YYYY-MM-DD格式），如果无法提取则返回null
 */
export function extractBirthDateFromIdCard(idCardNumber: string): string | null {
  if (!idCardNumber) return null

  // 去除空格
  const idCard = idCardNumber.trim()

  // 18位身份证
  if (idCard.length === 18) {
    const year = idCard.substring(6, 10)
    const month = idCard.substring(10, 12)
    const day = idCard.substring(12, 14)
    return `${year}-${month}-${day}`
  }

  // 15位身份证
  if (idCard.length === 15) {
    const year = `19${idCard.substring(6, 8)}`
    const month = idCard.substring(8, 10)
    const day = idCard.substring(10, 12)
    return `${year}-${month}-${day}`
  }

  return null
}

/**
 * 计算年龄
 * @param birthDate 出生日期字符串（YYYY-MM-DD格式）或身份证号
 * @returns 年龄（整数），如果无法计算则返回null
 */
export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null

  let dateStr = birthDate

  // 如果是身份证号，先提取出生日期
  if (birthDate.length === 15 || birthDate.length === 18) {
    const extracted = extractBirthDateFromIdCard(birthDate)
    if (!extracted) return null
    dateStr = extracted
  }

  try {
    const birth = new Date(dateStr)
    const today = new Date()

    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    // 如果还没到生日，年龄减1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age >= 0 ? age : null
  } catch {
    return null
  }
}

/**
 * 计算驾龄
 * @param firstIssueDate 初次领证日期字符串（YYYY-MM-DD格式）
 * @returns 驾龄（整数年数），如果无法计算则返回null
 */
export function calculateDrivingYears(firstIssueDate: string | null): number | null {
  if (!firstIssueDate) return null

  try {
    const issueDate = new Date(firstIssueDate)
    const today = new Date()

    let years = today.getFullYear() - issueDate.getFullYear()
    const monthDiff = today.getMonth() - issueDate.getMonth()

    // 如果还没到领证纪念日，驾龄减1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < issueDate.getDate())) {
      years--
    }

    return years >= 0 ? years : null
  } catch {
    return null
  }
}

/**
 * 获取后天的日期字符串
 * @returns 后天的日期字符串（YYYY-MM-DD格式）
 */
export function getDayAfterTomorrowDateString(): string {
  const dayAfterTomorrow = new Date()
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
  return getLocalDateString(dayAfterTomorrow)
}

/**
 * 格式化日期显示（用于请假申请）
 * 当天申请明天/后天请假时显示"明天"/"后天"
 * 其他情况显示具体日期（如：18号、19号）
 * @param dateStr 日期字符串（YYYY-MM-DD格式）
 * @returns 格式化后的日期显示
 */
export function formatLeaveDateDisplay(dateStr: string): string {
  if (!dateStr) return ''

  const tomorrow = getTomorrowDateString()
  const dayAfterTomorrow = getDayAfterTomorrowDateString()

  if (dateStr === tomorrow) {
    return '明天'
  }
  if (dateStr === dayAfterTomorrow) {
    return '后天'
  }

  // 其他情况显示具体日期
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const today = new Date()
  const currentMonth = today.getMonth() + 1

  // 如果是当月，只显示日期
  if (month === currentMonth) {
    return `${day}号`
  }

  // 如果是下个月，显示"下个月X号"
  return `下个月${day}号`
}

/**
 * 格式化日期范围显示（用于请假申请确认）
 * @param startDate 开始日期字符串（YYYY-MM-DD格式）
 * @param endDate 结束日期字符串（YYYY-MM-DD格式）
 * @returns 格式化后的日期范围显示
 */
export function formatLeaveDateRangeDisplay(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return ''

  const startDisplay = formatLeaveDateDisplay(startDate)
  const endDisplay = formatLeaveDateDisplay(endDate)

  if (startDisplay === endDisplay) {
    return startDisplay
  }

  return `${startDisplay}至${endDisplay}`
}
