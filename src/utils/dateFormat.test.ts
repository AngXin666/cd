/**
 * 日期格式化工具函数属性测试
 *
 * 使用 fast-check 进行属性测试，验证日期时间格式化函数的正确性
 *
 * @module utils/dateFormat.test
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  formatTime,
  formatTimeWithSeconds,
  formatDateISO,
  formatDateWithWeekday,
  formatDateTime
} from './dateFormat'

// ==================== 正则表达式定义 ====================

/**
 * HH:mm 格式的正则表达式
 * - HH: 00-23 的两位数字小时
 * - mm: 00-59 的两位数字分钟
 */
const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

/**
 * HH:mm:ss 格式的正则表达式
 * - HH: 00-23 的两位数字小时
 * - mm: 00-59 的两位数字分钟
 * - ss: 00-59 的两位数字秒
 */
const HH_MM_SS_REGEX = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/

/**
 * YYYY-MM-DD 格式的正则表达式
 * - YYYY: 四位数字年份
 * - MM: 01-12 的两位数字月份
 * - DD: 01-31 的两位数字日期
 */
const YYYY_MM_DD_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/**
 * MM/DD 周X 格式的正则表达式
 * - MM: 01-12 的两位数字月份
 * - DD: 01-31 的两位数字日期
 * - 周X: 周日/周一/周二/周三/周四/周五/周六
 */
const MM_DD_WEEKDAY_REGEX = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01]) 周[日一二三四五六]$/

/**
 * YYYY-MM-DD HH:mm 格式的正则表达式
 * - YYYY: 四位数字年份
 * - MM: 01-12 的两位数字月份
 * - DD: 01-31 的两位数字日期
 * - HH: 00-23 的两位数字小时
 * - mm: 00-59 的两位数字分钟
 */
const YYYY_MM_DD_HH_MM_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):([0-5]\d)$/

// ==================== 生成器定义 ====================

/**
 * 生成有效的 Date 对象
 * 限制在合理的日期范围内（1970-2100年）
 * 过滤掉无效日期（如 NaN）
 */
const validDateArb = fc.date({
  min: new Date('1970-01-01T00:00:00.000Z'),
  max: new Date('2100-12-31T23:59:59.999Z')
}).filter((date) => !Number.isNaN(date.getTime()))

/**
 * 生成有效的 ISO 日期时间字符串
 * 格式：YYYY-MM-DDTHH:mm:ss.sssZ
 */
const validISODateStringArb = validDateArb.map((date) => date.toISOString())

/**
 * 生成边界时间的 Date 对象
 * 包括：午夜、中午、一天结束前
 */
const boundaryTimeArb = fc.oneof(
  // 午夜 00:00:00
  fc.tuple(
    fc.integer({ min: 1970, max: 2100 }),
    fc.integer({ min: 0, max: 11 }),
    fc.integer({ min: 1, max: 28 })
  ).map(([year, month, day]) => new Date(year, month, day, 0, 0, 0)),
  // 中午 12:00:00
  fc.tuple(
    fc.integer({ min: 1970, max: 2100 }),
    fc.integer({ min: 0, max: 11 }),
    fc.integer({ min: 1, max: 28 })
  ).map(([year, month, day]) => new Date(year, month, day, 12, 0, 0)),
  // 一天结束前 23:59:59
  fc.tuple(
    fc.integer({ min: 1970, max: 2100 }),
    fc.integer({ min: 0, max: 11 }),
    fc.integer({ min: 1, max: 28 })
  ).map(([year, month, day]) => new Date(year, month, day, 23, 59, 59))
)

/**
 * 生成特定时分秒的 Date 对象
 * 用于精确验证时间组件
 */
const specificTimeArb = fc.tuple(
  fc.integer({ min: 0, max: 23 }),  // 小时
  fc.integer({ min: 0, max: 59 }),  // 分钟
  fc.integer({ min: 0, max: 59 })   // 秒
).map(([hours, minutes, seconds]) => {
  const date = new Date(2024, 0, 1, hours, minutes, seconds)
  return { date, hours, minutes, seconds }
})

// ==================== 属性测试 ====================

describe('formatTime 属性测试', () => {
  /**
   * **Feature: cross-module-code-deduplication, Property 2: formatTime 格式正确性**
   * **Validates: Requirements 2.1**
   *
   * 验证 formatTime 返回的字符串符合 HH:mm 格式
   */
  describe('Property 2: formatTime 格式正确性', () => {
    it('对于任意有效的 Date 对象，应返回符合 HH:mm 格式的字符串', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 执行函数
          const result = formatTime(date)

          // 验证格式符合 HH:mm
          expect(result).toMatch(HH_MM_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('对于任意有效的 ISO 日期字符串，应返回符合 HH:mm 格式的字符串', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatTime(dateStr)
          expect(result).toMatch(HH_MM_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('对于边界时间（午夜、中午、一天结束前），应返回符合 HH:mm 格式的字符串', () => {
      fc.assert(
        fc.property(boundaryTimeArb, (date) => {
          const result = formatTime(date)
          expect(result).toMatch(HH_MM_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的小时应与输入日期的小时一致（0-23）', () => {
      fc.assert(
        fc.property(specificTimeArb, ({ date, hours }) => {
          const result = formatTime(date)
          const [resultHours] = result.split(':').map(Number)
          expect(resultHours).toBe(hours)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的分钟应与输入日期的分钟一致（0-59）', () => {
      fc.assert(
        fc.property(specificTimeArb, ({ date, minutes }) => {
          const result = formatTime(date)
          const [, resultMinutes] = result.split(':').map(Number)
          expect(resultMinutes).toBe(minutes)
        }),
        { numRuns: 100 }
      )
    })

    it('小时和分钟应始终是两位数（带前导零）', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = formatTime(date)
          const parts = result.split(':')

          // 小时应为两位数
          expect(parts[0]).toHaveLength(2)
          // 分钟应为两位数
          expect(parts[1]).toHaveLength(2)
        }),
        { numRuns: 100 }
      )
    })

    it('Date 对象和对应的 ISO 字符串应产生相同的结果', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const resultFromDate = formatTime(date)
          const resultFromString = formatTime(date.toISOString())
          expect(resultFromDate).toBe(resultFromString)
        }),
        { numRuns: 100 }
      )
    })
  })
})

describe('formatTimeWithSeconds 属性测试', () => {
  /**
   * **Feature: cross-module-code-deduplication, Property 3: formatTimeWithSeconds 格式正确性**
   * **Validates: Requirements 2.2**
   *
   * 验证 formatTimeWithSeconds 返回的字符串符合 HH:mm:ss 格式
   */
  describe('Property 3: formatTimeWithSeconds 格式正确性', () => {
    it('对于任意有效的 Date 对象，应返回符合 HH:mm:ss 格式的字符串', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 执行函数
          const result = formatTimeWithSeconds(date)

          // 验证格式符合 HH:mm:ss
          expect(result).toMatch(HH_MM_SS_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('对于任意有效的 ISO 日期字符串，应返回符合 HH:mm:ss 格式的字符串', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatTimeWithSeconds(dateStr)
          expect(result).toMatch(HH_MM_SS_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('对于边界时间（午夜、中午、一天结束前），应返回符合 HH:mm:ss 格式的字符串', () => {
      fc.assert(
        fc.property(boundaryTimeArb, (date) => {
          const result = formatTimeWithSeconds(date)
          expect(result).toMatch(HH_MM_SS_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的小时应与输入日期的小时一致（0-23）', () => {
      fc.assert(
        fc.property(specificTimeArb, ({ date, hours }) => {
          const result = formatTimeWithSeconds(date)
          const [resultHours] = result.split(':').map(Number)
          expect(resultHours).toBe(hours)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的分钟应与输入日期的分钟一致（0-59）', () => {
      fc.assert(
        fc.property(specificTimeArb, ({ date, minutes }) => {
          const result = formatTimeWithSeconds(date)
          const [, resultMinutes] = result.split(':').map(Number)
          expect(resultMinutes).toBe(minutes)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的秒应与输入日期的秒一致（0-59）', () => {
      fc.assert(
        fc.property(specificTimeArb, ({ date, seconds }) => {
          const result = formatTimeWithSeconds(date)
          const [, , resultSeconds] = result.split(':').map(Number)
          expect(resultSeconds).toBe(seconds)
        }),
        { numRuns: 100 }
      )
    })

    it('小时、分钟和秒应始终是两位数（带前导零）', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = formatTimeWithSeconds(date)
          const parts = result.split(':')

          // 小时应为两位数
          expect(parts[0]).toHaveLength(2)
          // 分钟应为两位数
          expect(parts[1]).toHaveLength(2)
          // 秒应为两位数
          expect(parts[2]).toHaveLength(2)
        }),
        { numRuns: 100 }
      )
    })

    it('Date 对象和对应的 ISO 字符串应产生相同的结果', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const resultFromDate = formatTimeWithSeconds(date)
          const resultFromString = formatTimeWithSeconds(date.toISOString())
          expect(resultFromDate).toBe(resultFromString)
        }),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== 单元测试（边界情况）====================

describe('formatTime 单元测试', () => {
  it('应正确处理午夜 00:00', () => {
    const date = new Date(2024, 0, 1, 0, 0, 0)
    const result = formatTime(date)
    expect(result).toBe('00:00')
  })

  it('应正确处理中午 12:00', () => {
    const date = new Date(2024, 0, 1, 12, 0, 0)
    const result = formatTime(date)
    expect(result).toBe('12:00')
  })

  it('应正确处理一天结束前 23:59', () => {
    const date = new Date(2024, 0, 1, 23, 59, 59)
    const result = formatTime(date)
    expect(result).toBe('23:59')
  })

  it('应正确处理单位数小时（如 9:30）', () => {
    const date = new Date(2024, 0, 1, 9, 30, 0)
    const result = formatTime(date)
    expect(result).toBe('09:30')
  })

  it('应正确处理单位数分钟（如 10:05）', () => {
    const date = new Date(2024, 0, 1, 10, 5, 0)
    const result = formatTime(date)
    expect(result).toBe('10:05')
  })

  it('应正确处理 ISO 字符串输入', () => {
    const result = formatTime('2024-01-01T14:30:00.000Z')
    // 注意：结果取决于本地时区，这里只验证格式
    expect(result).toMatch(HH_MM_REGEX)
  })

  it('空字符串输入应返回空字符串', () => {
    const result = formatTime('')
    expect(result).toBe('')
  })
})

describe('formatTimeWithSeconds 单元测试', () => {
  it('应正确处理午夜 00:00:00', () => {
    const date = new Date(2024, 0, 1, 0, 0, 0)
    const result = formatTimeWithSeconds(date)
    expect(result).toBe('00:00:00')
  })

  it('应正确处理中午 12:00:00', () => {
    const date = new Date(2024, 0, 1, 12, 0, 0)
    const result = formatTimeWithSeconds(date)
    expect(result).toBe('12:00:00')
  })

  it('应正确处理一天结束前 23:59:59', () => {
    const date = new Date(2024, 0, 1, 23, 59, 59)
    const result = formatTimeWithSeconds(date)
    expect(result).toBe('23:59:59')
  })

  it('应正确处理单位数小时（如 09:30:45）', () => {
    const date = new Date(2024, 0, 1, 9, 30, 45)
    const result = formatTimeWithSeconds(date)
    expect(result).toBe('09:30:45')
  })

  it('应正确处理单位数分钟（如 10:05:30）', () => {
    const date = new Date(2024, 0, 1, 10, 5, 30)
    const result = formatTimeWithSeconds(date)
    expect(result).toBe('10:05:30')
  })

  it('应正确处理单位数秒（如 10:30:05）', () => {
    const date = new Date(2024, 0, 1, 10, 30, 5)
    const result = formatTimeWithSeconds(date)
    expect(result).toBe('10:30:05')
  })

  it('应正确处理 ISO 字符串输入', () => {
    const result = formatTimeWithSeconds('2024-01-01T14:30:45.000Z')
    // 注意：结果取决于本地时区，这里只验证格式
    expect(result).toMatch(HH_MM_SS_REGEX)
  })

  it('空字符串输入应返回空字符串', () => {
    const result = formatTimeWithSeconds('')
    expect(result).toBe('')
  })
})

// ==================== formatDateISO 属性测试 ====================

describe('formatDateISO 属性测试', () => {
  /**
   * **Feature: cross-module-code-deduplication, Property 4: formatDateISO 格式正确性**
   * **Validates: Requirements 2.3**
   *
   * 验证 formatDateISO 返回的字符串符合 YYYY-MM-DD 格式
   */
  describe('Property 4: formatDateISO 格式正确性', () => {
    it('对于任意有效的 Date 对象，应返回符合 YYYY-MM-DD 格式的字符串', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 执行函数
          const result = formatDateISO(date)

          // 验证格式符合 YYYY-MM-DD
          expect(result).toMatch(YYYY_MM_DD_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('对于任意有效的 ISO 日期字符串，应返回符合 YYYY-MM-DD 格式的字符串', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateISO(dateStr)
          expect(result).toMatch(YYYY_MM_DD_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的年份应与输入日期的年份一致', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = formatDateISO(date)
          const [resultYear] = result.split('-').map(Number)
          expect(resultYear).toBe(date.getFullYear())
        }),
        { numRuns: 100 }
      )
    })

    it('返回的月份应与输入日期的月份一致（1-12）', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = formatDateISO(date)
          const [, resultMonth] = result.split('-').map(Number)
          // Date.getMonth() 返回 0-11，需要 +1
          expect(resultMonth).toBe(date.getMonth() + 1)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的日期应与输入日期的日期一致（1-31）', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = formatDateISO(date)
          const [, , resultDay] = result.split('-').map(Number)
          expect(resultDay).toBe(date.getDate())
        }),
        { numRuns: 100 }
      )
    })

    it('月份和日期应始终是两位数（带前导零）', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = formatDateISO(date)
          const parts = result.split('-')

          // 年份应为四位数
          expect(parts[0]).toHaveLength(4)
          // 月份应为两位数
          expect(parts[1]).toHaveLength(2)
          // 日期应为两位数
          expect(parts[2]).toHaveLength(2)
        }),
        { numRuns: 100 }
      )
    })

    it('Date 对象和对应的 ISO 字符串应产生相同的结果', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const resultFromDate = formatDateISO(date)
          const resultFromString = formatDateISO(date.toISOString())
          expect(resultFromDate).toBe(resultFromString)
        }),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== formatDateWithWeekday 属性测试 ====================

describe('formatDateWithWeekday 属性测试', () => {
  /**
   * **Feature: cross-module-code-deduplication, Property 5: formatDateWithWeekday 格式正确性**
   * **Validates: Requirements 2.4**
   *
   * 验证 formatDateWithWeekday 返回的字符串符合 MM/DD 周X 格式
   */
  describe('Property 5: formatDateWithWeekday 格式正确性', () => {
    it('对于任意有效的 ISO 日期字符串，应返回符合 MM/DD 周X 格式的字符串', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          // 执行函数
          const result = formatDateWithWeekday(dateStr)

          // 验证格式符合 MM/DD 周X
          expect(result).toMatch(MM_DD_WEEKDAY_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的月份应与输入日期的月份一致（1-12）', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateWithWeekday(dateStr)
          const date = new Date(dateStr)
          const [monthPart] = result.split('/')
          const resultMonth = Number.parseInt(monthPart, 10)
          // Date.getMonth() 返回 0-11，需要 +1
          expect(resultMonth).toBe(date.getMonth() + 1)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的日期应与输入日期的日期一致（1-31）', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateWithWeekday(dateStr)
          const date = new Date(dateStr)
          // 提取 DD 部分（在 / 和 空格 之间）
          const dayPart = result.split('/')[1].split(' ')[0]
          const resultDay = Number.parseInt(dayPart, 10)
          expect(resultDay).toBe(date.getDate())
        }),
        { numRuns: 100 }
      )
    })

    it('返回的星期应与输入日期的星期一致', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateWithWeekday(dateStr)
          const date = new Date(dateStr)
          const weekDays = ['日', '一', '二', '三', '四', '五', '六']
          const expectedWeekDay = weekDays[date.getDay()]
          // 提取 周X 部分
          const weekDayPart = result.split(' 周')[1]
          expect(weekDayPart).toBe(expectedWeekDay)
        }),
        { numRuns: 100 }
      )
    })

    it('月份和日期应始终是两位数（带前导零）', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateWithWeekday(dateStr)
          // 提取 MM/DD 部分
          const datePart = result.split(' ')[0]
          const [month, day] = datePart.split('/')

          // 月份应为两位数
          expect(month).toHaveLength(2)
          // 日期应为两位数
          expect(day).toHaveLength(2)
        }),
        { numRuns: 100 }
      )
    })

    it('结果应包含 "周" 字符', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateWithWeekday(dateStr)
          expect(result).toContain('周')
        }),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== formatDateTime 属性测试 ====================

describe('formatDateTime 属性测试', () => {
  /**
   * **Feature: cross-module-code-deduplication, Property 6: formatDateTime 格式正确性**
   * **Validates: Requirements 2.5**
   *
   * 验证 formatDateTime 返回的字符串符合 YYYY-MM-DD HH:mm 格式
   */
  describe('Property 6: formatDateTime 格式正确性', () => {
    it('对于任意有效的 ISO 日期时间字符串，应返回符合 YYYY-MM-DD HH:mm 格式的字符串', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          // 执行函数
          const result = formatDateTime(dateStr)

          // 验证格式符合 YYYY-MM-DD HH:mm
          expect(result).toMatch(YYYY_MM_DD_HH_MM_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的年份应与输入日期的年份一致', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateTime(dateStr)
          const date = new Date(dateStr)
          const [datePart] = result.split(' ')
          const [resultYear] = datePart.split('-').map(Number)
          expect(resultYear).toBe(date.getFullYear())
        }),
        { numRuns: 100 }
      )
    })

    it('返回的月份应与输入日期的月份一致（1-12）', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateTime(dateStr)
          const date = new Date(dateStr)
          const [datePart] = result.split(' ')
          const [, resultMonth] = datePart.split('-').map(Number)
          // Date.getMonth() 返回 0-11，需要 +1
          expect(resultMonth).toBe(date.getMonth() + 1)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的日期应与输入日期的日期一致（1-31）', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateTime(dateStr)
          const date = new Date(dateStr)
          const [datePart] = result.split(' ')
          const [, , resultDay] = datePart.split('-').map(Number)
          expect(resultDay).toBe(date.getDate())
        }),
        { numRuns: 100 }
      )
    })

    it('返回的小时应与输入日期的小时一致（0-23）', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateTime(dateStr)
          const date = new Date(dateStr)
          const [, timePart] = result.split(' ')
          const [resultHours] = timePart.split(':').map(Number)
          expect(resultHours).toBe(date.getHours())
        }),
        { numRuns: 100 }
      )
    })

    it('返回的分钟应与输入日期的分钟一致（0-59）', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateTime(dateStr)
          const date = new Date(dateStr)
          const [, timePart] = result.split(' ')
          const [, resultMinutes] = timePart.split(':').map(Number)
          expect(resultMinutes).toBe(date.getMinutes())
        }),
        { numRuns: 100 }
      )
    })

    it('所有数字部分应始终是正确的位数（带前导零）', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateTime(dateStr)
          const [datePart, timePart] = result.split(' ')
          const [year, month, day] = datePart.split('-')
          const [hours, minutes] = timePart.split(':')

          // 年份应为四位数
          expect(year).toHaveLength(4)
          // 月份应为两位数
          expect(month).toHaveLength(2)
          // 日期应为两位数
          expect(day).toHaveLength(2)
          // 小时应为两位数
          expect(hours).toHaveLength(2)
          // 分钟应为两位数
          expect(minutes).toHaveLength(2)
        }),
        { numRuns: 100 }
      )
    })

    it('结果应包含日期和时间部分，用空格分隔', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          const result = formatDateTime(dateStr)
          const parts = result.split(' ')
          // 应该有两部分：日期和时间
          expect(parts).toHaveLength(2)
          // 日期部分应包含两个 -
          expect(parts[0].split('-')).toHaveLength(3)
          // 时间部分应包含一个 :
          expect(parts[1].split(':')).toHaveLength(2)
        }),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== Property 7: 输入类型一致性属性测试 ====================

describe('输入类型一致性属性测试', () => {
  /**
   * **Feature: cross-module-code-deduplication, Property 7: 输入类型一致性**
   * **Validates: Requirements 2.6**
   *
   * 验证当传入字符串或 Date 对象时，所有格式化函数应产生相同的输出结果
   * 这确保了函数对两种输入类型的处理是一致的
   */
  describe('Property 7: 输入类型一致性', () => {
    /**
     * formatTime 函数的输入类型一致性测试
     * 验证 Date 对象和对应的 ISO 字符串产生相同的格式化结果
     */
    it('formatTime: Date 对象和对应的 ISO 字符串应产生相同的结果', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 使用 Date 对象调用
          const resultFromDate = formatTime(date)
          // 使用 ISO 字符串调用
          const resultFromString = formatTime(date.toISOString())

          // 两种输入类型应产生相同的结果
          expect(resultFromDate).toBe(resultFromString)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * formatTimeWithSeconds 函数的输入类型一致性测试
     * 验证 Date 对象和对应的 ISO 字符串产生相同的格式化结果
     */
    it('formatTimeWithSeconds: Date 对象和对应的 ISO 字符串应产生相同的结果', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 使用 Date 对象调用
          const resultFromDate = formatTimeWithSeconds(date)
          // 使用 ISO 字符串调用
          const resultFromString = formatTimeWithSeconds(date.toISOString())

          // 两种输入类型应产生相同的结果
          expect(resultFromDate).toBe(resultFromString)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * formatDateISO 函数的输入类型一致性测试
     * 验证 Date 对象和对应的 ISO 字符串产生相同的格式化结果
     */
    it('formatDateISO: Date 对象和对应的 ISO 字符串应产生相同的结果', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 使用 Date 对象调用
          const resultFromDate = formatDateISO(date)
          // 使用 ISO 字符串调用
          const resultFromString = formatDateISO(date.toISOString())

          // 两种输入类型应产生相同的结果
          expect(resultFromDate).toBe(resultFromString)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 边界时间的输入类型一致性测试
     * 验证在边界时间（午夜、中午、一天结束前）时，两种输入类型产生相同结果
     */
    it('边界时间: 所有格式化函数对 Date 对象和 ISO 字符串应产生相同的结果', () => {
      fc.assert(
        fc.property(boundaryTimeArb, (date) => {
          // formatTime 一致性
          const timeFromDate = formatTime(date)
          const timeFromString = formatTime(date.toISOString())
          expect(timeFromDate).toBe(timeFromString)

          // formatTimeWithSeconds 一致性
          const timeWithSecondsFromDate = formatTimeWithSeconds(date)
          const timeWithSecondsFromString = formatTimeWithSeconds(date.toISOString())
          expect(timeWithSecondsFromDate).toBe(timeWithSecondsFromString)

          // formatDateISO 一致性
          const dateISOFromDate = formatDateISO(date)
          const dateISOFromString = formatDateISO(date.toISOString())
          expect(dateISOFromDate).toBe(dateISOFromString)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 特定时间的输入类型一致性测试
     * 验证在特定时分秒时，两种输入类型产生相同结果
     */
    it('特定时间: 所有格式化函数对 Date 对象和 ISO 字符串应产生相同的结果', () => {
      fc.assert(
        fc.property(specificTimeArb, ({ date }) => {
          // formatTime 一致性
          const timeFromDate = formatTime(date)
          const timeFromString = formatTime(date.toISOString())
          expect(timeFromDate).toBe(timeFromString)

          // formatTimeWithSeconds 一致性
          const timeWithSecondsFromDate = formatTimeWithSeconds(date)
          const timeWithSecondsFromString = formatTimeWithSeconds(date.toISOString())
          expect(timeWithSecondsFromDate).toBe(timeWithSecondsFromString)

          // formatDateISO 一致性
          const dateISOFromDate = formatDateISO(date)
          const dateISOFromString = formatDateISO(date.toISOString())
          expect(dateISOFromDate).toBe(dateISOFromString)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 空输入的一致性测试
     * 验证空字符串和无效输入的处理一致性
     */
    it('空输入: 所有格式化函数对空字符串应返回空字符串', () => {
      // formatTime 空输入
      expect(formatTime('')).toBe('')

      // formatTimeWithSeconds 空输入
      expect(formatTimeWithSeconds('')).toBe('')

      // formatDateISO 空输入
      expect(formatDateISO('')).toBe('')

      // formatDateTime 空输入
      expect(formatDateTime('')).toBe('')

      // formatDateWithWeekday 空输入
      expect(formatDateWithWeekday('')).toBe('')
    })

    /**
     * 多次调用的幂等性测试
     * 验证对同一输入多次调用产生相同结果
     */
    it('幂等性: 对同一输入多次调用应产生相同结果', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // formatTime 幂等性
          const time1 = formatTime(date)
          const time2 = formatTime(date)
          expect(time1).toBe(time2)

          // formatTimeWithSeconds 幂等性
          const timeWithSeconds1 = formatTimeWithSeconds(date)
          const timeWithSeconds2 = formatTimeWithSeconds(date)
          expect(timeWithSeconds1).toBe(timeWithSeconds2)

          // formatDateISO 幂等性
          const dateISO1 = formatDateISO(date)
          const dateISO2 = formatDateISO(date)
          expect(dateISO1).toBe(dateISO2)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 字符串输入的幂等性测试
     * 验证对同一字符串输入多次调用产生相同结果
     */
    it('字符串输入幂等性: 对同一字符串输入多次调用应产生相同结果', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          // formatTime 幂等性
          const time1 = formatTime(dateStr)
          const time2 = formatTime(dateStr)
          expect(time1).toBe(time2)

          // formatTimeWithSeconds 幂等性
          const timeWithSeconds1 = formatTimeWithSeconds(dateStr)
          const timeWithSeconds2 = formatTimeWithSeconds(dateStr)
          expect(timeWithSeconds1).toBe(timeWithSeconds2)

          // formatDateISO 幂等性
          const dateISO1 = formatDateISO(dateStr)
          const dateISO2 = formatDateISO(dateStr)
          expect(dateISO1).toBe(dateISO2)

          // formatDateTime 幂等性
          const dateTime1 = formatDateTime(dateStr)
          const dateTime2 = formatDateTime(dateStr)
          expect(dateTime1).toBe(dateTime2)

          // formatDateWithWeekday 幂等性
          const dateWithWeekday1 = formatDateWithWeekday(dateStr)
          const dateWithWeekday2 = formatDateWithWeekday(dateStr)
          expect(dateWithWeekday1).toBe(dateWithWeekday2)
        }),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== Property 8: 日期格式化往返一致性属性测试 ====================

describe('日期格式化往返一致性属性测试', () => {
  /**
   * **Feature: cross-module-code-deduplication, Property 8: 日期格式化往返一致性**
   * **Validates: Requirements 2.7**
   *
   * 验证日期格式化的往返一致性：
   * 对于任何有效日期，formatDateISO(new Date(formatDateISO(date))) 应等于 formatDateISO(date)
   * 这确保了格式化函数的输出可以被正确解析并再次格式化为相同的结果
   */
  describe('Property 8: 日期格式化往返一致性', () => {
    /**
     * formatDateISO 往返一致性测试
     * 验证：formatDateISO(new Date(formatDateISO(date))) === formatDateISO(date)
     */
    it('formatDateISO: 格式化后再解析再格式化应产生相同结果', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 第一次格式化
          const firstFormat = formatDateISO(date)

          // 解析格式化后的字符串为新的 Date 对象
          // 注意：使用 parseLocalDate 逻辑避免时区问题
          const [year, month, day] = firstFormat.split('-').map(Number)
          const reparsedDate = new Date(year, month - 1, day)

          // 第二次格式化
          const secondFormat = formatDateISO(reparsedDate)

          // 两次格式化结果应相同
          expect(secondFormat).toBe(firstFormat)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * formatDateISO 往返一致性测试（使用 ISO 字符串输入）
     * 验证：从 ISO 字符串开始的往返一致性
     */
    it('formatDateISO: 从 ISO 字符串开始的往返一致性', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          // 第一次格式化
          const firstFormat = formatDateISO(dateStr)

          // 解析格式化后的字符串为新的 Date 对象
          const [year, month, day] = firstFormat.split('-').map(Number)
          const reparsedDate = new Date(year, month - 1, day)

          // 第二次格式化
          const secondFormat = formatDateISO(reparsedDate)

          // 两次格式化结果应相同
          expect(secondFormat).toBe(firstFormat)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * formatDateTime 往返一致性测试
     * 验证：formatDateTime 的输出可以被正确解析并再次格式化
     * 注意：由于 formatDateTime 只保留到分钟，秒会丢失，这是预期行为
     */
    it('formatDateTime: 格式化后再解析再格式化应产生相同结果（分钟精度）', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          // 第一次格式化
          const firstFormat = formatDateTime(dateStr)

          // 解析格式化后的字符串为新的 Date 对象
          // 格式：YYYY-MM-DD HH:mm
          const [datePart, timePart] = firstFormat.split(' ')
          const [year, month, day] = datePart.split('-').map(Number)
          const [hours, minutes] = timePart.split(':').map(Number)
          const reparsedDate = new Date(year, month - 1, day, hours, minutes, 0)

          // 第二次格式化
          const secondFormat = formatDateTime(reparsedDate.toISOString())

          // 两次格式化结果应相同
          expect(secondFormat).toBe(firstFormat)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * formatTime 往返一致性测试
     * 验证：formatTime 的输出可以被正确解析并再次格式化
     * 注意：由于 formatTime 只保留小时和分钟，秒会丢失，这是预期行为
     */
    it('formatTime: 格式化后再解析再格式化应产生相同结果（分钟精度）', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 第一次格式化
          const firstFormat = formatTime(date)

          // 解析格式化后的字符串
          // 格式：HH:mm
          const [hours, minutes] = firstFormat.split(':').map(Number)

          // 创建新的 Date 对象（使用固定日期，只关注时间部分）
          const reparsedDate = new Date(2024, 0, 1, hours, minutes, 0)

          // 第二次格式化
          const secondFormat = formatTime(reparsedDate)

          // 两次格式化结果应相同
          expect(secondFormat).toBe(firstFormat)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * formatTimeWithSeconds 往返一致性测试
     * 验证：formatTimeWithSeconds 的输出可以被正确解析并再次格式化
     */
    it('formatTimeWithSeconds: 格式化后再解析再格式化应产生相同结果', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 第一次格式化
          const firstFormat = formatTimeWithSeconds(date)

          // 解析格式化后的字符串
          // 格式：HH:mm:ss
          const [hours, minutes, seconds] = firstFormat.split(':').map(Number)

          // 创建新的 Date 对象（使用固定日期，只关注时间部分）
          const reparsedDate = new Date(2024, 0, 1, hours, minutes, seconds)

          // 第二次格式化
          const secondFormat = formatTimeWithSeconds(reparsedDate)

          // 两次格式化结果应相同
          expect(secondFormat).toBe(firstFormat)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * formatDateWithWeekday 往返一致性测试
     * 验证：formatDateWithWeekday 的日期部分可以被正确解析
     * 注意：由于格式不包含年份，无法完全往返，但月/日/星期应保持一致
     */
    it('formatDateWithWeekday: 日期部分应与原始日期一致', () => {
      fc.assert(
        fc.property(validISODateStringArb, (dateStr) => {
          // 格式化
          const formatted = formatDateWithWeekday(dateStr)

          // 解析原始日期
          const originalDate = new Date(dateStr)
          const originalMonth = originalDate.getMonth() + 1
          const originalDay = originalDate.getDate()
          const weekDays = ['日', '一', '二', '三', '四', '五', '六']
          const originalWeekDay = weekDays[originalDate.getDay()]

          // 从格式化结果中提取月、日、星期
          const [datePart, weekPart] = formatted.split(' ')
          const [formattedMonth, formattedDay] = datePart.split('/').map(Number)
          const formattedWeekDay = weekPart.replace('周', '')

          // 验证月、日、星期一致
          expect(formattedMonth).toBe(originalMonth)
          expect(formattedDay).toBe(originalDay)
          expect(formattedWeekDay).toBe(originalWeekDay)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 边界时间的往返一致性测试
     * 验证在边界时间（午夜、中午、一天结束前）时的往返一致性
     */
    it('边界时间: 所有格式化函数的往返一致性', () => {
      fc.assert(
        fc.property(boundaryTimeArb, (date) => {
          // formatDateISO 往返
          const dateISO1 = formatDateISO(date)
          const [year, month, day] = dateISO1.split('-').map(Number)
          const reparsedDate = new Date(year, month - 1, day)
          const dateISO2 = formatDateISO(reparsedDate)
          expect(dateISO2).toBe(dateISO1)

          // formatTime 往返
          const time1 = formatTime(date)
          const [hours, minutes] = time1.split(':').map(Number)
          const reparsedTime = new Date(2024, 0, 1, hours, minutes, 0)
          const time2 = formatTime(reparsedTime)
          expect(time2).toBe(time1)

          // formatTimeWithSeconds 往返
          const timeWithSeconds1 = formatTimeWithSeconds(date)
          const [h, m, s] = timeWithSeconds1.split(':').map(Number)
          const reparsedTimeWithSeconds = new Date(2024, 0, 1, h, m, s)
          const timeWithSeconds2 = formatTimeWithSeconds(reparsedTimeWithSeconds)
          expect(timeWithSeconds2).toBe(timeWithSeconds1)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 特定日期的往返一致性测试
     * 验证特定日期（如月初、月末、年初、年末）的往返一致性
     */
    it('特定日期: formatDateISO 的往返一致性', () => {
      // 测试特定日期
      const testDates = [
        new Date(2024, 0, 1),   // 年初
        new Date(2024, 11, 31), // 年末
        new Date(2024, 1, 29),  // 闰年2月29日
        new Date(2024, 5, 30),  // 6月30日
        new Date(2024, 6, 31),  // 7月31日
      ]

      for (const date of testDates) {
        // 第一次格式化
        const firstFormat = formatDateISO(date)

        // 解析并重新格式化
        const [year, month, day] = firstFormat.split('-').map(Number)
        const reparsedDate = new Date(year, month - 1, day)
        const secondFormat = formatDateISO(reparsedDate)

        // 验证一致性
        expect(secondFormat).toBe(firstFormat)
      }
    })

    /**
     * 连续往返测试
     * 验证多次往返后结果仍然一致
     */
    it('连续往返: 多次往返后结果应保持一致', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 第一次格式化
          let currentFormat = formatDateISO(date)
          const originalFormat = currentFormat

          // 进行 5 次往返
          for (let i = 0; i < 5; i++) {
            // 解析
            const [year, month, day] = currentFormat.split('-').map(Number)
            const reparsedDate = new Date(year, month - 1, day)

            // 重新格式化
            currentFormat = formatDateISO(reparsedDate)
          }

          // 5 次往返后结果应与原始结果相同
          expect(currentFormat).toBe(originalFormat)
        }),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== formatDateISO 单元测试 ====================

describe('formatDateISO 单元测试', () => {
  it('应正确格式化日期', () => {
    const date = new Date(2024, 11, 17) // 2024年12月17日
    const result = formatDateISO(date)
    expect(result).toBe('2024-12-17')
  })

  it('应正确处理单位数月份（如 1月）', () => {
    const date = new Date(2024, 0, 15) // 2024年1月15日
    const result = formatDateISO(date)
    expect(result).toBe('2024-01-15')
  })

  it('应正确处理单位数日期（如 5日）', () => {
    const date = new Date(2024, 5, 5) // 2024年6月5日
    const result = formatDateISO(date)
    expect(result).toBe('2024-06-05')
  })

  it('应正确处理 ISO 字符串输入', () => {
    const result = formatDateISO('2024-12-17T14:30:00.000Z')
    // 注意：结果取决于本地时区，这里只验证格式
    expect(result).toMatch(YYYY_MM_DD_REGEX)
  })

  it('空字符串输入应返回空字符串', () => {
    const result = formatDateISO('')
    expect(result).toBe('')
  })
})

// ==================== formatDateWithWeekday 单元测试 ====================

describe('formatDateWithWeekday 单元测试', () => {
  it('应正确格式化日期和星期', () => {
    // 2024年12月17日是星期二
    const result = formatDateWithWeekday('2024-12-17')
    expect(result).toBe('12/17 周二')
  })

  it('应正确处理单位数月份', () => {
    // 2024年1月15日是星期一
    const result = formatDateWithWeekday('2024-01-15')
    expect(result).toBe('01/15 周一')
  })

  it('应正确处理单位数日期', () => {
    // 2024年6月5日是星期三
    const result = formatDateWithWeekday('2024-06-05')
    expect(result).toBe('06/05 周三')
  })

  it('应正确处理周日', () => {
    // 2024年12月15日是星期日
    const result = formatDateWithWeekday('2024-12-15')
    expect(result).toBe('12/15 周日')
  })

  it('空字符串输入应返回空字符串', () => {
    const result = formatDateWithWeekday('')
    expect(result).toBe('')
  })
})

// ==================== formatDateTime 单元测试 ====================

describe('formatDateTime 单元测试', () => {
  it('应正确格式化日期时间', () => {
    // 使用本地时间创建日期
    const date = new Date(2024, 11, 17, 14, 30, 0) // 2024年12月17日 14:30
    const result = formatDateTime(date.toISOString())
    // 由于时区问题，只验证格式
    expect(result).toMatch(YYYY_MM_DD_HH_MM_REGEX)
  })

  it('应正确处理午夜时间', () => {
    const date = new Date(2024, 11, 17, 0, 0, 0) // 2024年12月17日 00:00
    const result = formatDateTime(date.toISOString())
    expect(result).toMatch(YYYY_MM_DD_HH_MM_REGEX)
  })

  it('应正确处理单位数小时和分钟', () => {
    const date = new Date(2024, 11, 17, 9, 5, 0) // 2024年12月17日 09:05
    const result = formatDateTime(date.toISOString())
    expect(result).toMatch(YYYY_MM_DD_HH_MM_REGEX)
  })

  it('空字符串输入应返回空字符串', () => {
    const result = formatDateTime('')
    expect(result).toBe('')
  })
})
