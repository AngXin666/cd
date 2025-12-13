/**
 * 日期工具函数 - 单元测试
 */
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {
  getLocalDateString,
  getTomorrowDateString,
  getYesterdayDateString,
  getDaysAgoDateString,
  getMondayDateString,
  getFirstDayOfMonthString,
  extractBirthDateFromIdCard,
  calculateAge,
  calculateDrivingYears,
  getDayAfterTomorrowDateString,
  formatLeaveDateDisplay,
  formatLeaveDateRangeDisplay
} from './date'

describe('date utils', () => {
  describe('getLocalDateString', () => {
    it('应该返回正确格式的日期字符串', () => {
      const date = new Date(2024, 11, 13) // 2024-12-13
      const result = getLocalDateString(date)
      expect(result).toBe('2024-12-13')
    })

    it('应该正确处理月份和日期的补零', () => {
      const date = new Date(2024, 0, 5) // 2024-01-05
      const result = getLocalDateString(date)
      expect(result).toBe('2024-01-05')
    })

    it('应该默认使用当前日期', () => {
      const result = getLocalDateString()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('getTomorrowDateString', () => {
    it('应该返回明天的日期', () => {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const result = getTomorrowDateString()
      const expected = getLocalDateString(tomorrow)
      expect(result).toBe(expected)
    })
  })

  describe('getYesterdayDateString', () => {
    it('应该返回昨天的日期', () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const result = getYesterdayDateString()
      const expected = getLocalDateString(yesterday)
      expect(result).toBe(expected)
    })
  })

  describe('getDaysAgoDateString', () => {
    it('应该返回N天前的日期', () => {
      const today = new Date()
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const result = getDaysAgoDateString(7)
      const expected = getLocalDateString(sevenDaysAgo)
      expect(result).toBe(expected)
    })

    it('应该正确处理0天前（今天）', () => {
      const result = getDaysAgoDateString(0)
      const expected = getLocalDateString()
      expect(result).toBe(expected)
    })
  })

  describe('getMondayDateString', () => {
    it('应该返回本周一的日期', () => {
      const result = getMondayDateString()
      const monday = new Date(result)
      expect(monday.getDay()).toBe(1) // 1 = Monday
    })
  })

  describe('getFirstDayOfMonthString', () => {
    it('应该返回本月第一天', () => {
      const result = getFirstDayOfMonthString()
      expect(result).toMatch(/^\d{4}-\d{2}-01$/)
    })
  })

  describe('getDayAfterTomorrowDateString', () => {
    it('应该返回后天的日期', () => {
      const today = new Date()
      const dayAfterTomorrow = new Date(today)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
      
      const result = getDayAfterTomorrowDateString()
      const expected = getLocalDateString(dayAfterTomorrow)
      expect(result).toBe(expected)
    })
  })

  describe('extractBirthDateFromIdCard', () => {
    it('应该从18位身份证提取出生日期', () => {
      const idCard = '110101199001011234'
      const result = extractBirthDateFromIdCard(idCard)
      expect(result).toBe('1990-01-01')
    })

    it('应该从15位身份证提取出生日期', () => {
      const idCard = '110101900101123'
      const result = extractBirthDateFromIdCard(idCard)
      expect(result).toBe('1990-01-01')
    })

    it('应该处理空字符串', () => {
      const result = extractBirthDateFromIdCard('')
      expect(result).toBeNull()
    })

    it('应该处理无效长度的身份证', () => {
      const result = extractBirthDateFromIdCard('12345')
      expect(result).toBeNull()
    })

    it('应该去除空格', () => {
      const idCard = ' 110101199001011234 '
      const result = extractBirthDateFromIdCard(idCard)
      expect(result).toBe('1990-01-01')
    })
  })

  describe('calculateAge', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 11, 13)) // 2024-12-13
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该正确计算年龄', () => {
      const result = calculateAge('1990-01-01')
      expect(result).toBe(34)
    })

    it('应该处理生日还没到的情况', () => {
      const result = calculateAge('1990-12-25') // 生日在12月25日，还没到
      expect(result).toBe(33)
    })

    it('应该从身份证号计算年龄', () => {
      const result = calculateAge('110101199001011234')
      expect(result).toBe(34)
    })

    it('应该处理空值', () => {
      const result = calculateAge(null)
      expect(result).toBeNull()
    })

    it('应该处理无效日期', () => {
      const result = calculateAge('invalid-date')
      expect(result).toBeNull()
    })
  })

  describe('calculateDrivingYears', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 11, 13)) // 2024-12-13
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该正确计算驾龄', () => {
      const result = calculateDrivingYears('2020-01-01')
      expect(result).toBe(4)
    })

    it('应该处理领证纪念日还没到的情况', () => {
      const result = calculateDrivingYears('2020-12-25')
      expect(result).toBe(3)
    })

    it('应该处理空值', () => {
      const result = calculateDrivingYears(null)
      expect(result).toBeNull()
    })
  })

  describe('formatLeaveDateDisplay', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 11, 13)) // 2024-12-13
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该显示"明天"', () => {
      const tomorrow = getTomorrowDateString()
      const result = formatLeaveDateDisplay(tomorrow)
      expect(result).toBe('明天')
    })

    it('应该显示"后天"', () => {
      const dayAfterTomorrow = getDayAfterTomorrowDateString()
      const result = formatLeaveDateDisplay(dayAfterTomorrow)
      expect(result).toBe('后天')
    })

    it('应该显示具体日期', () => {
      const result = formatLeaveDateDisplay('2024-12-20')
      expect(result).toBe('20号')
    })

    it('应该处理空字符串', () => {
      const result = formatLeaveDateDisplay('')
      expect(result).toBe('')
    })
  })

  describe('formatLeaveDateRangeDisplay', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 11, 13)) // 2024-12-13
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该显示单日', () => {
      const tomorrow = getTomorrowDateString()
      const result = formatLeaveDateRangeDisplay(tomorrow, tomorrow)
      expect(result).toBe('明天')
    })

    it('应该显示日期范围', () => {
      const result = formatLeaveDateRangeDisplay('2024-12-20', '2024-12-22')
      expect(result).toBe('20号至22号')
    })

    it('应该处理空值', () => {
      const result = formatLeaveDateRangeDisplay('', '')
      expect(result).toBe('')
    })
  })
})
