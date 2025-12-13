/**
 * 日期格式化工具 - 单元测试
 */
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {
  formatDateHumanReadable,
  formatDateRange,
  formatLeaveDate,
  calculateDays,
  formatDistanceToNow
} from './dateFormat'

describe('dateFormat utils', () => {
  describe('formatDateHumanReadable', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 11, 13)) // 2024-12-13
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该返回"今天"', () => {
      const result = formatDateHumanReadable('2024-12-13')
      expect(result).toBe('今天')
    })

    it('应该返回"明天"', () => {
      const result = formatDateHumanReadable('2024-12-14')
      expect(result).toBe('明天')
    })

    it('应该返回"后天"', () => {
      const result = formatDateHumanReadable('2024-12-15')
      expect(result).toBe('后天')
    })

    it('应该返回"X号"格式', () => {
      const result = formatDateHumanReadable('2024-12-20')
      expect(result).toBe('20号')
    })

    it('应该处理空字符串', () => {
      const result = formatDateHumanReadable('')
      expect(result).toBe('')
    })
  })

  describe('formatDateRange', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 11, 13)) // 2024-12-13
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该处理相同日期', () => {
      const result = formatDateRange('2024-12-14', '2024-12-14')
      expect(result).toBe('明天')
    })

    it('应该处理包含特殊日期的范围', () => {
      const result = formatDateRange('2024-12-14', '2024-12-15')
      expect(result).toBe('明天-后天')
    })

    it('应该处理普通日期范围', () => {
      const result = formatDateRange('2024-12-20', '2024-12-22')
      expect(result).toBe('20-22号')
    })

    it('应该处理空值', () => {
      const result = formatDateRange('', '')
      expect(result).toBe('')
    })
  })

  describe('formatLeaveDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 11, 13)) // 2024-12-13
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该显示日期范围和天数', () => {
      const result = formatLeaveDate('2024-12-20', '2024-12-22', 3)
      expect(result).toBe('20-22号（3天）')
    })

    it('应该处理没有天数的情况', () => {
      const result = formatLeaveDate('2024-12-20', '2024-12-22')
      expect(result).toBe('20-22号')
    })

    it('应该处理单日请假', () => {
      const result = formatLeaveDate('2024-12-14', '2024-12-14', 1)
      expect(result).toBe('明天（1天）')
    })
  })

  describe('calculateDays', () => {
    it('应该正确计算天数', () => {
      const result = calculateDays('2024-12-13', '2024-12-15')
      expect(result).toBe(3) // 13, 14, 15 = 3天
    })

    it('应该处理相同日期', () => {
      const result = calculateDays('2024-12-13', '2024-12-13')
      expect(result).toBe(1)
    })

    it('应该处理空值', () => {
      const result = calculateDays('', '')
      expect(result).toBe(0)
    })

    it('应该处理结束日期早于开始日期', () => {
      const result = calculateDays('2024-12-15', '2024-12-13')
      expect(result).toBe(0)
    })
  })

  describe('formatDistanceToNow', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-12-13T12:00:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该返回"刚刚"', () => {
      const result = formatDistanceToNow('2024-12-13T11:59:30')
      expect(result).toBe('刚刚')
    })

    it('应该返回"X分钟前"', () => {
      const result = formatDistanceToNow('2024-12-13T11:55:00')
      expect(result).toBe('5分钟前')
    })

    it('应该返回"X小时前"', () => {
      const result = formatDistanceToNow('2024-12-13T10:00:00')
      expect(result).toBe('2小时前')
    })

    it('应该返回"昨天"', () => {
      const result = formatDistanceToNow('2024-12-12T12:00:00')
      expect(result).toBe('昨天')
    })

    it('应该返回"X天前"', () => {
      const result = formatDistanceToNow('2024-12-10T12:00:00')
      expect(result).toBe('3天前')
    })

    it('应该返回"X周前"', () => {
      const result = formatDistanceToNow('2024-11-29T12:00:00')
      expect(result).toBe('2周前')
    })

    it('应该返回"X个月前"', () => {
      const result = formatDistanceToNow('2024-10-13T12:00:00')
      expect(result).toBe('2个月前')
    })

    it('应该返回"X年前"', () => {
      const result = formatDistanceToNow('2022-12-13T12:00:00')
      expect(result).toBe('2年前')
    })

    it('应该处理空字符串', () => {
      const result = formatDistanceToNow('')
      expect(result).toBe('')
    })
  })
})
