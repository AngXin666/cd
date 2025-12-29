/**
 * 完成率计算属性测试
 * 使用 fast-check 进行属性测试，验证完成率计算和状态判断的正确性
 * 
 * @module utils/__tests__/completionRate.pbt.test
 * 
 * **Feature: manager-page-alignment, Property 7: 完成率状态判断正确性**
 * **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateRate,
  getStatusFromRate,
  calculateCompletionRate,
  getCompletionRateResult,
  formatCompletionRate,
  isCompletionRatePassing,
  isCompletionRateExcellent,
  DEFAULT_THRESHOLDS,
} from '../completionRate'

// ==================== 生成器定义 ====================

/**
 * 生成有效的实际完成量（非负数）
 * 使用 Math.fround 确保是 32 位浮点数
 */
const validActualArbitrary = fc.float({ min: 0, max: 10000, noNaN: true })

/**
 * 生成有效的目标量（正数）
 * 使用 Math.fround 确保是 32 位浮点数
 */
const validTargetArbitrary = fc.float({ min: Math.fround(0.1), max: 10000, noNaN: true })

/**
 * 生成有效的完成率（0-200%范围）
 */
const validRateArbitrary = fc.float({ min: 0, max: 200, noNaN: true })

/**
 * 生成超额完成的完成率（>110%）
 * 使用 Math.fround 确保是 32 位浮点数
 */
const excellentRateArbitrary = fc.float({ min: Math.fround(110.1), max: 200, noNaN: true })

/**
 * 生成达标的完成率（100%-110%）
 */
const standardRateArbitrary = fc.float({ min: 100, max: 110, noNaN: true })

/**
 * 生成不达标的完成率（70%-100%）
 * 使用 Math.fround 确保是 32 位浮点数
 */
const belowRateArbitrary = fc.float({ min: 70, max: Math.fround(99.9), noNaN: true })

/**
 * 生成严重不达标的完成率（<70%）
 * 使用 Math.fround 确保是 32 位浮点数
 */
const criticalRateArbitrary = fc.float({ min: 0, max: Math.fround(69.9), noNaN: true })

// ==================== 测试套件 ====================

describe('完成率计算属性测试', () => {
  describe('calculateRate - 完成率计算', () => {
    /**
     * 属性：对于任意有效的实际完成量和目标量，
     * 计算的完成率应该等于 (actual / target) * 100
     */
    it('Property: 完成率计算公式正确', () => {
      fc.assert(
        fc.property(validActualArbitrary, validTargetArbitrary, (actual, target) => {
          const rate = calculateRate(actual, target)
          const expected = Math.round((actual / target) * 100 * 10) / 10
          
          // 允许浮点数精度误差
          expect(Math.abs(rate - expected)).toBeLessThanOrEqual(0.1)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性：对于任意有效输入，完成率应该是非负数
     */
    it('Property: 完成率始终为非负数', () => {
      fc.assert(
        fc.property(validActualArbitrary, validTargetArbitrary, (actual, target) => {
          const rate = calculateRate(actual, target)
          expect(rate).toBeGreaterThanOrEqual(0)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性：当目标为0或负数时，完成率应该返回0
     */
    it('Property: 目标为0或负数时返回0', () => {
      fc.assert(
        fc.property(
          validActualArbitrary,
          fc.float({ min: -1000, max: 0, noNaN: true }),
          (actual, target) => {
            const rate = calculateRate(actual, target)
            expect(rate).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('getStatusFromRate - 状态判断', () => {
    /**
     * **Feature: manager-page-alignment, Property 7: 完成率状态判断正确性**
     * **Validates: Requirements 5.2**
     * 
     * 属性：对于任意超过110%的完成率，状态应该是 'excellent'（超额完成）
     */
    it('Property 7.1: 超过110%为超额完成', () => {
      fc.assert(
        fc.property(excellentRateArbitrary, (rate) => {
          const status = getStatusFromRate(rate)
          expect(status).toBe('excellent')
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: manager-page-alignment, Property 7: 完成率状态判断正确性**
     * **Validates: Requirements 5.3**
     * 
     * 属性：对于任意100%-110%的完成率，状态应该是 'standard'（达标）
     */
    it('Property 7.2: 100%-110%为达标', () => {
      fc.assert(
        fc.property(standardRateArbitrary, (rate) => {
          const status = getStatusFromRate(rate)
          expect(status).toBe('standard')
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: manager-page-alignment, Property 7: 完成率状态判断正确性**
     * **Validates: Requirements 5.4**
     * 
     * 属性：对于任意70%-100%的完成率，状态应该是 'below'（不达标）
     */
    it('Property 7.3: 70%-100%为不达标', () => {
      fc.assert(
        fc.property(belowRateArbitrary, (rate) => {
          const status = getStatusFromRate(rate)
          expect(status).toBe('below')
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: manager-page-alignment, Property 7: 完成率状态判断正确性**
     * **Validates: Requirements 5.5**
     * 
     * 属性：对于任意低于70%的完成率，状态应该是 'critical'（严重不达标）
     */
    it('Property 7.4: 低于70%为严重不达标', () => {
      fc.assert(
        fc.property(criticalRateArbitrary, (rate) => {
          const status = getStatusFromRate(rate)
          expect(status).toBe('critical')
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性：状态判断应该是互斥的，每个完成率只对应一个状态
     */
    it('Property: 状态判断互斥性', () => {
      fc.assert(
        fc.property(validRateArbitrary, (rate) => {
          const status = getStatusFromRate(rate)
          
          // 验证状态是四种之一
          expect(['excellent', 'standard', 'below', 'critical']).toContain(status)
          
          // 验证状态与阈值的对应关系
          if (rate > DEFAULT_THRESHOLDS.excellent) {
            expect(status).toBe('excellent')
          } else if (rate >= DEFAULT_THRESHOLDS.standard) {
            expect(status).toBe('standard')
          } else if (rate >= DEFAULT_THRESHOLDS.below) {
            expect(status).toBe('below')
          } else {
            expect(status).toBe('critical')
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('calculateCompletionRate - 综合计算', () => {
    /**
     * 属性：综合计算结果应该包含所有必要字段
     */
    it('Property: 结果包含所有必要字段', () => {
      fc.assert(
        fc.property(validActualArbitrary, validTargetArbitrary, (actual, target) => {
          const result = calculateCompletionRate(actual, target)
          
          // 验证结果结构
          expect(result).toHaveProperty('rate')
          expect(result).toHaveProperty('status')
          expect(result).toHaveProperty('label')
          expect(result).toHaveProperty('color')
          
          // 验证类型
          expect(typeof result.rate).toBe('number')
          expect(typeof result.status).toBe('string')
          expect(typeof result.label).toBe('string')
          expect(typeof result.color).toBe('string')
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性：综合计算的完成率应该与单独计算一致
     */
    it('Property: 综合计算与单独计算一致', () => {
      fc.assert(
        fc.property(validActualArbitrary, validTargetArbitrary, (actual, target) => {
          const result = calculateCompletionRate(actual, target)
          const expectedRate = calculateRate(actual, target)
          const expectedStatus = getStatusFromRate(expectedRate)
          
          expect(result.rate).toBe(expectedRate)
          expect(result.status).toBe(expectedStatus)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('getCompletionRateResult - 从完成率获取结果', () => {
    /**
     * 属性：从完成率获取的结果应该与综合计算一致
     */
    it('Property: 结果与状态判断一致', () => {
      fc.assert(
        fc.property(validRateArbitrary, (rate) => {
          const result = getCompletionRateResult(rate)
          const expectedStatus = getStatusFromRate(rate)
          
          expect(result.status).toBe(expectedStatus)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('formatCompletionRate - 格式化', () => {
    /**
     * 属性：格式化结果应该包含百分号（默认）
     */
    it('Property: 默认格式化包含百分号', () => {
      fc.assert(
        fc.property(validRateArbitrary, (rate) => {
          const formatted = formatCompletionRate(rate)
          expect(formatted).toContain('%')
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性：不显示百分号时，结果不包含百分号
     */
    it('Property: 可选不显示百分号', () => {
      fc.assert(
        fc.property(validRateArbitrary, (rate) => {
          const formatted = formatCompletionRate(rate, false)
          expect(formatted).not.toContain('%')
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('isCompletionRatePassing - 达标判断', () => {
    /**
     * 属性：完成率 >= 100% 应该判断为达标
     */
    it('Property: 达标判断正确', () => {
      fc.assert(
        fc.property(validRateArbitrary, (rate) => {
          const isPassing = isCompletionRatePassing(rate)
          
          if (rate >= 100) {
            expect(isPassing).toBe(true)
          } else {
            expect(isPassing).toBe(false)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('isCompletionRateExcellent - 超额判断', () => {
    /**
     * 属性：完成率 > 110% 应该判断为超额完成
     */
    it('Property: 超额判断正确', () => {
      fc.assert(
        fc.property(validRateArbitrary, (rate) => {
          const isExcellent = isCompletionRateExcellent(rate)
          
          if (rate > 110) {
            expect(isExcellent).toBe(true)
          } else {
            expect(isExcellent).toBe(false)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('边界条件测试', () => {
    /**
     * 边界测试：精确的阈值边界
     */
    it('边界：110%应该是达标而非超额完成', () => {
      const status = getStatusFromRate(110)
      expect(status).toBe('standard')
    })

    it('边界：110.1%应该是超额完成', () => {
      const status = getStatusFromRate(110.1)
      expect(status).toBe('excellent')
    })

    it('边界：100%应该是达标', () => {
      const status = getStatusFromRate(100)
      expect(status).toBe('standard')
    })

    it('边界：99.9%应该是不达标', () => {
      const status = getStatusFromRate(99.9)
      expect(status).toBe('below')
    })

    it('边界：70%应该是不达标', () => {
      const status = getStatusFromRate(70)
      expect(status).toBe('below')
    })

    it('边界：69.9%应该是严重不达标', () => {
      const status = getStatusFromRate(69.9)
      expect(status).toBe('critical')
    })

    it('边界：0%应该是严重不达标', () => {
      const status = getStatusFromRate(0)
      expect(status).toBe('critical')
    })
  })
})
