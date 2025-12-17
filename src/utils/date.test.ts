/**
 * 日期工具函数属性测试
 *
 * 使用 fast-check 进行属性测试，验证 getLocalDateString 函数的格式正确性
 *
 * **Feature: cross-module-code-deduplication, Property 1: getLocalDateString 格式正确性**
 * **Validates: Requirements 1.3**
 *
 * @module utils/date.test
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { getLocalDateString } from './date'

// ==================== 正则表达式定义 ====================

/**
 * YYYY-MM-DD 格式的正则表达式
 * - YYYY: 4位数字年份
 * - MM: 01-12 的两位数字月份
 * - DD: 01-31 的两位数字日期
 */
const YYYY_MM_DD_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

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
 * 生成有效的年月日组合
 * 确保生成的日期是有效的（考虑每月天数）
 */
const validYearMonthDayArb = fc.tuple(
  fc.integer({ min: 1970, max: 2100 }), // 年
  fc.integer({ min: 1, max: 12 }),       // 月
  fc.integer({ min: 1, max: 28 })        // 日（使用28确保所有月份都有效）
).map(([year, month, day]) => new Date(year, month - 1, day))

/**
 * 生成边界日期（月初、月末、年初、年末）
 */
const boundaryDateArb = fc.oneof(
  // 月初
  fc.tuple(
    fc.integer({ min: 1970, max: 2100 }),
    fc.integer({ min: 1, max: 12 })
  ).map(([year, month]) => new Date(year, month - 1, 1)),
  // 年初
  fc.integer({ min: 1970, max: 2100 }).map(year => new Date(year, 0, 1)),
  // 年末
  fc.integer({ min: 1970, max: 2100 }).map(year => new Date(year, 11, 31))
)

// ==================== 属性测试 ====================

describe('getLocalDateString 属性测试', () => {
  /**
   * **Feature: cross-module-code-deduplication, Property 1: getLocalDateString 格式正确性**
   * **Validates: Requirements 1.3**
   *
   * 验证 getLocalDateString 返回的字符串符合 YYYY-MM-DD 格式
   */
  describe('Property 1: getLocalDateString 格式正确性', () => {
    it('对于任意有效的 Date 对象，应返回符合 YYYY-MM-DD 格式的字符串', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          // 执行函数
          const result = getLocalDateString(date)

          // 验证格式符合 YYYY-MM-DD
          expect(result).toMatch(YYYY_MM_DD_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('对于任意有效的年月日组合，应返回符合 YYYY-MM-DD 格式的字符串', () => {
      fc.assert(
        fc.property(validYearMonthDayArb, (date) => {
          const result = getLocalDateString(date)
          expect(result).toMatch(YYYY_MM_DD_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('对于边界日期（月初、年初、年末），应返回符合 YYYY-MM-DD 格式的字符串', () => {
      fc.assert(
        fc.property(boundaryDateArb, (date) => {
          const result = getLocalDateString(date)
          expect(result).toMatch(YYYY_MM_DD_REGEX)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的年份应与输入日期的年份一致', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = getLocalDateString(date)
          const [year] = result.split('-').map(Number)
          expect(year).toBe(date.getFullYear())
        }),
        { numRuns: 100 }
      )
    })

    it('返回的月份应与输入日期的月份一致（1-12）', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = getLocalDateString(date)
          const [, month] = result.split('-').map(Number)
          // JavaScript 的 getMonth() 返回 0-11，需要加 1
          expect(month).toBe(date.getMonth() + 1)
        }),
        { numRuns: 100 }
      )
    })

    it('返回的日期应与输入日期的日期一致（1-31）', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = getLocalDateString(date)
          const [, , day] = result.split('-').map(Number)
          expect(day).toBe(date.getDate())
        }),
        { numRuns: 100 }
      )
    })

    it('月份和日期应始终是两位数（带前导零）', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = getLocalDateString(date)
          const parts = result.split('-')

          // 月份应为两位数
          expect(parts[1]).toHaveLength(2)
          // 日期应为两位数
          expect(parts[2]).toHaveLength(2)
        }),
        { numRuns: 100 }
      )
    })

    it('年份应始终是四位数', () => {
      fc.assert(
        fc.property(validDateArb, (date) => {
          const result = getLocalDateString(date)
          const [year] = result.split('-')

          // 年份应为四位数
          expect(year).toHaveLength(4)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 验证默认参数行为
   */
  describe('默认参数行为', () => {
    it('不传参数时应返回当前日期的字符串', () => {
      const result = getLocalDateString()
      const now = new Date()

      // 验证格式正确
      expect(result).toMatch(YYYY_MM_DD_REGEX)

      // 验证日期与当前日期一致
      const [year, month, day] = result.split('-').map(Number)
      expect(year).toBe(now.getFullYear())
      expect(month).toBe(now.getMonth() + 1)
      expect(day).toBe(now.getDate())
    })
  })
})

// ==================== 单元测试（边界情况）====================

describe('getLocalDateString 单元测试', () => {
  it('应正确处理 2024-01-01（年初）', () => {
    const date = new Date(2024, 0, 1) // 2024年1月1日
    const result = getLocalDateString(date)
    expect(result).toBe('2024-01-01')
  })

  it('应正确处理 2024-12-31（年末）', () => {
    const date = new Date(2024, 11, 31) // 2024年12月31日
    const result = getLocalDateString(date)
    expect(result).toBe('2024-12-31')
  })

  it('应正确处理 2024-02-29（闰年2月29日）', () => {
    const date = new Date(2024, 1, 29) // 2024年2月29日（闰年）
    const result = getLocalDateString(date)
    expect(result).toBe('2024-02-29')
  })

  it('应正确处理单位数月份（如1月）', () => {
    const date = new Date(2024, 0, 15) // 2024年1月15日
    const result = getLocalDateString(date)
    expect(result).toBe('2024-01-15')
  })

  it('应正确处理单位数日期（如5日）', () => {
    const date = new Date(2024, 5, 5) // 2024年6月5日
    const result = getLocalDateString(date)
    expect(result).toBe('2024-06-05')
  })

  it('应正确处理双位数月份（如12月）', () => {
    const date = new Date(2024, 11, 15) // 2024年12月15日
    const result = getLocalDateString(date)
    expect(result).toBe('2024-12-15')
  })

  it('应正确处理双位数日期（如25日）', () => {
    const date = new Date(2024, 5, 25) // 2024年6月25日
    const result = getLocalDateString(date)
    expect(result).toBe('2024-06-25')
  })

  it('应正确处理历史日期（1970年）', () => {
    const date = new Date(1970, 0, 1) // 1970年1月1日
    const result = getLocalDateString(date)
    expect(result).toBe('1970-01-01')
  })

  it('应正确处理未来日期（2100年）', () => {
    const date = new Date(2100, 11, 31) // 2100年12月31日
    const result = getLocalDateString(date)
    expect(result).toBe('2100-12-31')
  })
})
