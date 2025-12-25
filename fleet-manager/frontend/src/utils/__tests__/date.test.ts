/**
 * 日期工具函数属性测试
 * 使用 fast-check 进行属性测试，验证日期范围计算的正确性
 * 
 * **Feature: vue-deep-conversion, Property 6: 日期范围计算**
 * **Validates: Requirements 2.3**
 * 
 * @module utils/__tests__/date.test
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  getNextDay,
  getPreviousDay,
  compareDates,
  isDateInRange
} from '../date'

/**
 * 生成有效日期字符串的 Arbitrary
 * 日期格式为 YYYY-MM-DD，范围从 2000-01-01 到 2099-12-31
 * 
 * 使用 Date 对象生成，确保日期有效
 */
const validDateArb = fc.date({
  min: new Date('2000-01-01'),
  max: new Date('2099-12-30') // 留出一天余量，确保 getNextDay 不会超出范围
}).map(date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

/**
 * 将日期字符串转换为 Date 对象
 * @param dateStr - 日期字符串，格式 'YYYY-MM-DD'
 * @returns Date 对象
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * 计算两个日期之间的天数差
 * @param dateStr1 - 第一个日期字符串
 * @param dateStr2 - 第二个日期字符串
 * @returns 天数差（dateStr2 - dateStr1）
 */
function daysDifference(dateStr1: string, dateStr2: string): number {
  const date1 = parseDate(dateStr1)
  const date2 = parseDate(dateStr2)
  // 计算毫秒差并转换为天数
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((date2.getTime() - date1.getTime()) / msPerDay)
}

describe('日期范围计算属性测试', () => {
  /**
   * Property 6: 日期范围计算
   * *For any* 日期字符串，getNextDay 返回的日期应该比输入日期大 1 天
   * **Validates: Requirements 2.3**
   */
  describe('Property 6: 日期范围计算', () => {
    it('getNextDay 返回的日期应该比输入日期大 1 天', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          // 获取后一天
          const nextDay = getNextDay(dateStr)
          
          // 计算天数差
          const diff = daysDifference(dateStr, nextDay)
          
          // 验证差值为 1 天
          return diff === 1
        }),
        { numRuns: 100 }
      )
    })

    it('getPreviousDay 返回的日期应该比输入日期小 1 天', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          // 获取前一天
          const prevDay = getPreviousDay(dateStr)
          
          // 计算天数差
          const diff = daysDifference(prevDay, dateStr)
          
          // 验证差值为 1 天
          return diff === 1
        }),
        { numRuns: 100 }
      )
    })

    it('getNextDay 和 getPreviousDay 应该互为逆操作', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          // 先获取后一天，再获取前一天，应该回到原日期
          const nextDay = getNextDay(dateStr)
          const backToOriginal = getPreviousDay(nextDay)
          
          return backToOriginal === dateStr
        }),
        { numRuns: 100 }
      )
    })

    it('getPreviousDay 和 getNextDay 应该互为逆操作', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          // 先获取前一天，再获取后一天，应该回到原日期
          const prevDay = getPreviousDay(dateStr)
          const backToOriginal = getNextDay(prevDay)
          
          return backToOriginal === dateStr
        }),
        { numRuns: 100 }
      )
    })

    it('getNextDay 返回的日期格式应该正确', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          const nextDay = getNextDay(dateStr)
          
          // 验证格式为 YYYY-MM-DD
          const datePattern = /^\d{4}-\d{2}-\d{2}$/
          return datePattern.test(nextDay)
        }),
        { numRuns: 100 }
      )
    })

    it('getPreviousDay 返回的日期格式应该正确', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          const prevDay = getPreviousDay(dateStr)
          
          // 验证格式为 YYYY-MM-DD
          const datePattern = /^\d{4}-\d{2}-\d{2}$/
          return datePattern.test(prevDay)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 日期比较属性测试
   * 验证 compareDates 函数的正确性
   */
  describe('日期比较属性测试', () => {
    it('getNextDay 返回的日期应该大于原日期', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          const nextDay = getNextDay(dateStr)
          
          // 使用 compareDates 验证
          return compareDates(dateStr, nextDay) < 0
        }),
        { numRuns: 100 }
      )
    })

    it('getPreviousDay 返回的日期应该小于原日期', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          const prevDay = getPreviousDay(dateStr)
          
          // 使用 compareDates 验证
          return compareDates(prevDay, dateStr) < 0
        }),
        { numRuns: 100 }
      )
    })

    it('相同日期比较应该返回 0', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          return compareDates(dateStr, dateStr) === 0
        }),
        { numRuns: 100 }
      )
    })

    it('日期比较应该具有传递性', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          const prevDay = getPreviousDay(dateStr)
          const nextDay = getNextDay(dateStr)
          
          // 如果 prevDay < dateStr 且 dateStr < nextDay
          // 则 prevDay < nextDay
          const cmp1 = compareDates(prevDay, dateStr)
          const cmp2 = compareDates(dateStr, nextDay)
          const cmp3 = compareDates(prevDay, nextDay)
          
          return cmp1 < 0 && cmp2 < 0 && cmp3 < 0
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 日期范围检查属性测试
   * 验证 isDateInRange 函数的正确性
   */
  describe('日期范围检查属性测试', () => {
    it('日期应该在自身和自身的范围内', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          return isDateInRange(dateStr, dateStr, dateStr)
        }),
        { numRuns: 100 }
      )
    })

    it('日期应该在前一天到后一天的范围内', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          const prevDay = getPreviousDay(dateStr)
          const nextDay = getNextDay(dateStr)
          
          return isDateInRange(dateStr, prevDay, nextDay)
        }),
        { numRuns: 100 }
      )
    })

    it('前一天不应该在当天到后一天的范围内', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          const prevDay = getPreviousDay(dateStr)
          const nextDay = getNextDay(dateStr)
          
          return !isDateInRange(prevDay, dateStr, nextDay)
        }),
        { numRuns: 100 }
      )
    })

    it('后一天不应该在前一天到当天的范围内', () => {
      fc.assert(
        fc.property(validDateArb, (dateStr) => {
          const prevDay = getPreviousDay(dateStr)
          const nextDay = getNextDay(dateStr)
          
          return !isDateInRange(nextDay, prevDay, dateStr)
        }),
        { numRuns: 100 }
      )
    })
  })
})

/**
 * 边界条件测试
 * 验证跨月、跨年等边界情况
 */
describe('日期边界条件测试', () => {
  it('跨月边界：月末到下月初', () => {
    // 2024年1月31日 -> 2024年2月1日
    expect(getNextDay('2024-01-31')).toBe('2024-02-01')
    
    // 2024年2月29日（闰年）-> 2024年3月1日
    expect(getNextDay('2024-02-29')).toBe('2024-03-01')
    
    // 2023年2月28日（非闰年）-> 2023年3月1日
    expect(getNextDay('2023-02-28')).toBe('2023-03-01')
  })

  it('跨年边界：年末到下年初', () => {
    // 2024年12月31日 -> 2025年1月1日
    expect(getNextDay('2024-12-31')).toBe('2025-01-01')
    
    // 2025年1月1日 -> 2024年12月31日
    expect(getPreviousDay('2025-01-01')).toBe('2024-12-31')
  })

  it('月初边界：月初到上月末', () => {
    // 2024年3月1日 -> 2024年2月29日（闰年）
    expect(getPreviousDay('2024-03-01')).toBe('2024-02-29')
    
    // 2023年3月1日 -> 2023年2月28日（非闰年）
    expect(getPreviousDay('2023-03-01')).toBe('2023-02-28')
  })

  it('年初边界：年初到上年末', () => {
    // 2024年1月1日 -> 2023年12月31日
    expect(getPreviousDay('2024-01-01')).toBe('2023-12-31')
  })

  it('闰年2月29日处理', () => {
    // 2024年是闰年
    expect(getNextDay('2024-02-28')).toBe('2024-02-29')
    expect(getNextDay('2024-02-29')).toBe('2024-03-01')
    
    // 2023年不是闰年
    expect(getNextDay('2023-02-28')).toBe('2023-03-01')
  })
})

/**
 * 日期格式验证测试
 */
describe('日期格式验证测试', () => {
  it('返回的日期应该是有效的 YYYY-MM-DD 格式', () => {
    const testDates = [
      '2024-01-01',
      '2024-06-15',
      '2024-12-31',
      '2000-01-01',
      '2099-12-31'
    ]
    
    for (const dateStr of testDates) {
      const nextDay = getNextDay(dateStr)
      const prevDay = getPreviousDay(dateStr)
      
      // 验证格式
      expect(nextDay).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(prevDay).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      
      // 验证可以被解析为有效日期
      const nextDate = new Date(nextDay)
      const prevDate = new Date(prevDay)
      
      expect(nextDate.toString()).not.toBe('Invalid Date')
      expect(prevDate.toString()).not.toBe('Invalid Date')
    }
  })

  it('月份和日期应该正确补零', () => {
    // 测试单位数月份
    expect(getNextDay('2024-01-01')).toBe('2024-01-02')
    expect(getPreviousDay('2024-01-02')).toBe('2024-01-01')
    
    // 测试单位数日期
    expect(getNextDay('2024-12-01')).toBe('2024-12-02')
    expect(getPreviousDay('2024-12-02')).toBe('2024-12-01')
  })
})

