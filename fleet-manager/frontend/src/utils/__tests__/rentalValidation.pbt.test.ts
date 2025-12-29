/**
 * 租金日期验证属性测试
 * 使用 fast-check 进行属性测试，验证租金日期验证的核心功能
 * @module utils/__tests__/rentalValidation.pbt.test
 *
 * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
 * **Validates: Requirements 2.4**
 * 
 * 验证规则：
 * - 结束日期必须晚于开始日期
 * - 日期格式必须为 YYYY-MM-DD
 * - 月租金必须为正数且不超过 100000
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validateDateFormat,
  validateRentalDateRange,
  validateMonthlyRent,
  validateDeposit,
  validateRentalForm,
  compareDates,
  MAX_MONTHLY_RENT,
  MAX_DEPOSIT
} from '../validation/rentalValidation'

// ==================== 自定义生成器 ====================

/**
 * 生成有效的年份（1900-2100）
 */
const validYearArbitrary = fc.integer({ min: 1900, max: 2100 })

/**
 * 生成有效的月份（1-12）
 */
const validMonthArbitrary = fc.integer({ min: 1, max: 12 })

/**
 * 生成有效的日期（1-28，确保所有月份都有效）
 */
const validDayArbitrary = fc.integer({ min: 1, max: 28 })

/**
 * 生成有效的日期字符串（YYYY-MM-DD 格式）
 */
const validDateArbitrary = fc.tuple(
  validYearArbitrary,
  validMonthArbitrary,
  validDayArbitrary
).map(([year, month, day]) => {
  // 格式化为 YYYY-MM-DD
  const monthStr = month.toString().padStart(2, '0')
  const dayStr = day.toString().padStart(2, '0')
  return `${year}-${monthStr}-${dayStr}`
})

/**
 * 生成有效的日期对（开始日期早于结束日期）
 * 确保结束日期至少比开始日期晚 1 天
 */
const validDatePairArbitrary = fc.tuple(
  validYearArbitrary,
  validMonthArbitrary,
  validDayArbitrary,
  fc.integer({ min: 1, max: 365 }) // 间隔天数
).map(([year, month, day, daysDiff]) => {
  // 开始日期
  const startDate = new Date(year, month - 1, day)
  // 结束日期（开始日期 + 间隔天数）
  const endDate = new Date(startDate.getTime() + daysDiff * 24 * 60 * 60 * 1000)
  
  // 格式化日期
  const formatDate = (d: Date): string => {
    const y = d.getFullYear()
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const dd = d.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }
})

/**
 * 生成无效的日期对（结束日期早于或等于开始日期）
 */
const invalidDatePairArbitrary = fc.tuple(
  validYearArbitrary,
  validMonthArbitrary,
  validDayArbitrary,
  fc.integer({ min: 0, max: 365 }) // 间隔天数（0 表示相等）
).map(([year, month, day, daysDiff]) => {
  // 结束日期
  const endDate = new Date(year, month - 1, day)
  // 开始日期（结束日期 + 间隔天数，使开始日期晚于或等于结束日期）
  const startDate = new Date(endDate.getTime() + daysDiff * 24 * 60 * 60 * 1000)
  
  // 格式化日期
  const formatDate = (d: Date): string => {
    const y = d.getFullYear()
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const dd = d.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }
})

/**
 * 生成无效格式的日期字符串
 * 确保生成的字符串不符合 YYYY-MM-DD 格式
 */
const invalidDateFormatArbitrary = fc.oneof(
  // 缺少前导零（确保月份或日期是单位数）
  fc.tuple(validYearArbitrary, fc.integer({ min: 1, max: 9 }), validDayArbitrary)
    .map(([y, m, d]) => `${y}-${m}-${d.toString().padStart(2, '0')}`),
  // 使用斜杠分隔
  fc.tuple(validYearArbitrary, validMonthArbitrary, validDayArbitrary)
    .map(([y, m, d]) => `${y}/${m.toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}`),
  // 日期顺序错误（DD-MM-YYYY）
  fc.tuple(validYearArbitrary, validMonthArbitrary, validDayArbitrary)
    .map(([y, m, d]) => `${d.toString().padStart(2, '0')}-${m.toString().padStart(2, '0')}-${y}`),
  // 随机字符串（排除有效日期格式）
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.match(/^\d{4}-\d{2}-\d{2}$/)),
  // 空字符串
  fc.constant('')
)

/**
 * 生成有效的月租金（0 < rent <= 100000）
 */
const validMonthlyRentArbitrary = fc.double({ 
  min: 0.01, 
  max: MAX_MONTHLY_RENT,
  noNaN: true
})

/**
 * 生成无效的月租金（<= 0 或 > 100000）
 */
const invalidMonthlyRentArbitrary = fc.oneof(
  // 负数
  fc.double({ min: -100000, max: -0.01, noNaN: true }),
  // 零
  fc.constant(0),
  // 超过最大值
  fc.double({ min: MAX_MONTHLY_RENT + 0.01, max: MAX_MONTHLY_RENT * 2, noNaN: true })
)

/**
 * 生成有效的押金（0 <= deposit <= 100000）
 */
const validDepositArbitrary = fc.oneof(
  fc.constant(''), // 空值（可选）
  fc.double({ min: 0, max: MAX_DEPOSIT, noNaN: true })
)

// ==================== 属性测试 ====================

describe('租金日期验证属性测试', () => {
  /**
   * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
   * **Validates: Requirements 2.4**
   */
  describe('Property 2: 租金日期有效性', () => {
    
    it('Property 2.1: 有效日期格式（YYYY-MM-DD）应该验证通过', () => {
      /**
       * 属性：对于任意有效的日期字符串（YYYY-MM-DD 格式），
       * validateDateFormat 应该返回 { valid: true }
       * 
       * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
       * **Validates: Requirements 2.3**
       */
      fc.assert(
        fc.property(validDateArbitrary, (dateStr) => {
          const result = validateDateFormat(dateStr)
          
          // 有效日期格式应该验证通过
          expect(result.valid).toBe(true)
          expect(result.error).toBeUndefined()
        }),
        { numRuns: 100 }
      )
    })

    it('Property 2.2: 无效日期格式应该验证失败', () => {
      /**
       * 属性：对于任意无效格式的日期字符串，
       * validateDateFormat 应该返回 { valid: false, error: '...' }
       * 
       * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
       * **Validates: Requirements 2.3**
       */
      fc.assert(
        fc.property(invalidDateFormatArbitrary, (dateStr) => {
          const result = validateDateFormat(dateStr)
          
          // 无效日期格式应该验证失败
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }),
        { numRuns: 100 }
      )
    })

    it('Property 2.3: 结束日期晚于开始日期应该验证通过', () => {
      /**
       * 属性：对于任意有效的日期对（结束日期晚于开始日期），
       * validateRentalDateRange 应该返回 { valid: true }
       * 
       * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
       * **Validates: Requirements 2.4**
       */
      fc.assert(
        fc.property(validDatePairArbitrary, ({ startDate, endDate }) => {
          const result = validateRentalDateRange(startDate, endDate)
          
          // 有效日期范围应该验证通过
          expect(result.valid).toBe(true)
          expect(result.error).toBeUndefined()
        }),
        { numRuns: 100 }
      )
    })

    it('Property 2.4: 结束日期早于或等于开始日期应该验证失败', () => {
      /**
       * 属性：对于任意无效的日期对（结束日期早于或等于开始日期），
       * validateRentalDateRange 应该返回 { valid: false, error: '结束日期必须晚于开始日期' }
       * 
       * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
       * **Validates: Requirements 2.4**
       */
      fc.assert(
        fc.property(invalidDatePairArbitrary, ({ startDate, endDate }) => {
          const result = validateRentalDateRange(startDate, endDate)
          
          // 无效日期范围应该验证失败
          expect(result.valid).toBe(false)
          expect(result.error).toContain('结束日期必须晚于开始日期')
        }),
        { numRuns: 100 }
      )
    })

    it('Property 2.5: 日期比较的传递性', () => {
      /**
       * 属性：对于任意三个日期 A < B < C，
       * 如果 A < B 且 B < C，则 A < C
       * 
       * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
       * **Validates: Requirements 2.4**
       */
      fc.assert(
        fc.property(
          validYearArbitrary,
          validMonthArbitrary,
          validDayArbitrary,
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (year, month, day, diff1, diff2) => {
            // 生成三个递增的日期
            const dateA = new Date(year, month - 1, day)
            const dateB = new Date(dateA.getTime() + diff1 * 24 * 60 * 60 * 1000)
            const dateC = new Date(dateB.getTime() + diff2 * 24 * 60 * 60 * 1000)
            
            // 格式化日期
            const formatDate = (d: Date): string => {
              const y = d.getFullYear()
              const m = (d.getMonth() + 1).toString().padStart(2, '0')
              const dd = d.getDate().toString().padStart(2, '0')
              return `${y}-${m}-${dd}`
            }
            
            const strA = formatDate(dateA)
            const strB = formatDate(dateB)
            const strC = formatDate(dateC)
            
            // 验证传递性
            const resultAB = validateRentalDateRange(strA, strB)
            const resultBC = validateRentalDateRange(strB, strC)
            const resultAC = validateRentalDateRange(strA, strC)
            
            // 如果 A < B 且 B < C，则 A < C
            expect(resultAB.valid).toBe(true)
            expect(resultBC.valid).toBe(true)
            expect(resultAC.valid).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Property 2.6: 日期比较的反对称性', () => {
      /**
       * 属性：对于任意两个不同的日期 A 和 B，
       * 如果 A < B，则 B > A（即 validateRentalDateRange(B, A) 应该失败）
       * 
       * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
       * **Validates: Requirements 2.4**
       */
      fc.assert(
        fc.property(validDatePairArbitrary, ({ startDate, endDate }) => {
          // 正向验证应该通过
          const forwardResult = validateRentalDateRange(startDate, endDate)
          expect(forwardResult.valid).toBe(true)
          
          // 反向验证应该失败
          const reverseResult = validateRentalDateRange(endDate, startDate)
          expect(reverseResult.valid).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 2.7: 相同日期应该验证失败', () => {
      /**
       * 属性：对于任意日期 A，
       * validateRentalDateRange(A, A) 应该返回 { valid: false }
       * 
       * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
       * **Validates: Requirements 2.4**
       */
      fc.assert(
        fc.property(validDateArbitrary, (dateStr) => {
          const result = validateRentalDateRange(dateStr, dateStr)
          
          // 相同日期应该验证失败
          expect(result.valid).toBe(false)
          expect(result.error).toContain('结束日期必须晚于开始日期')
        }),
        { numRuns: 100 }
      )
    })
  })
})

describe('月租金验证属性测试', () => {
  /**
   * 月租金验证的属性测试
   * **Validates: Requirements 2.2**
   */
  
  it('有效月租金（0 < rent <= 100000）应该验证通过', () => {
    fc.assert(
      fc.property(validMonthlyRentArbitrary, (rent) => {
        const result = validateMonthlyRent(rent)
        
        // 有效月租金应该验证通过
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      }),
      { numRuns: 100 }
    )
  })

  it('无效月租金（<= 0 或 > 100000）应该验证失败', () => {
    fc.assert(
      fc.property(invalidMonthlyRentArbitrary, (rent) => {
        const result = validateMonthlyRent(rent)
        
        // 无效月租金应该验证失败
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })

  it('月租金边界值测试', () => {
    // 测试边界值
    const minValid = validateMonthlyRent(0.01)
    expect(minValid.valid).toBe(true)
    
    const maxValid = validateMonthlyRent(MAX_MONTHLY_RENT)
    expect(maxValid.valid).toBe(true)
    
    const zero = validateMonthlyRent(0)
    expect(zero.valid).toBe(false)
    
    const overMax = validateMonthlyRent(MAX_MONTHLY_RENT + 0.01)
    expect(overMax.valid).toBe(false)
  })
})

describe('押金验证属性测试', () => {
  /**
   * 押金验证的属性测试
   */
  
  it('有效押金（0 <= deposit <= 100000 或空值）应该验证通过', () => {
    fc.assert(
      fc.property(validDepositArbitrary, (deposit) => {
        const result = validateDeposit(deposit)
        
        // 有效押金应该验证通过
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      }),
      { numRuns: 100 }
    )
  })

  it('负数押金应该验证失败', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100000, max: -0.01, noNaN: true }),
        (deposit) => {
          const result = validateDeposit(deposit)
          
          // 负数押金应该验证失败
          expect(result.valid).toBe(false)
          expect(result.error).toContain('不能为负数')
        }
      ),
      { numRuns: 50 }
    )
  })

  it('超过最大值的押金应该验证失败', () => {
    fc.assert(
      fc.property(
        fc.double({ min: MAX_DEPOSIT + 0.01, max: MAX_DEPOSIT * 2, noNaN: true }),
        (deposit) => {
          const result = validateDeposit(deposit)
          
          // 超过最大值的押金应该验证失败
          expect(result.valid).toBe(false)
          expect(result.error).toContain(`${MAX_DEPOSIT}`)
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('租金表单验证属性测试', () => {
  /**
   * 租金表单整体验证的属性测试
   * **Feature: boss-missing-pages, Property 2: 租金日期有效性**
   * **Validates: Requirements 2.2, 2.3, 2.4**
   */
  
  it('有效表单数据应该验证通过', () => {
    fc.assert(
      fc.property(
        validMonthlyRentArbitrary,
        validDatePairArbitrary,
        validDepositArbitrary,
        (monthlyRent, { startDate, endDate }, deposit) => {
          const result = validateRentalForm({
            monthlyRent,
            startDate,
            endDate,
            deposit
          })
          
          // 有效表单应该验证通过
          expect(result.isValid).toBe(true)
          expect(result.monthlyRent.valid).toBe(true)
          expect(result.startDate.valid).toBe(true)
          expect(result.endDate.valid).toBe(true)
          expect(result.deposit.valid).toBe(true)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('无效日期范围应该导致表单验证失败', () => {
    fc.assert(
      fc.property(
        validMonthlyRentArbitrary,
        invalidDatePairArbitrary,
        (monthlyRent, { startDate, endDate }) => {
          const result = validateRentalForm({
            monthlyRent,
            startDate,
            endDate
          })
          
          // 无效日期范围应该导致表单验证失败
          expect(result.isValid).toBe(false)
          expect(result.endDate.valid).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('无效月租金应该导致表单验证失败', () => {
    fc.assert(
      fc.property(
        invalidMonthlyRentArbitrary,
        validDatePairArbitrary,
        (monthlyRent, { startDate, endDate }) => {
          const result = validateRentalForm({
            monthlyRent,
            startDate,
            endDate
          })
          
          // 无效月租金应该导致表单验证失败
          expect(result.isValid).toBe(false)
          expect(result.monthlyRent.valid).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('日期比较函数属性测试', () => {
  /**
   * compareDates 函数的属性测试
   */
  
  it('日期比较的一致性', () => {
    fc.assert(
      fc.property(validDatePairArbitrary, ({ startDate, endDate }) => {
        // 开始日期应该小于结束日期
        expect(compareDates(startDate, endDate)).toBe(-1)
        
        // 结束日期应该大于开始日期
        expect(compareDates(endDate, startDate)).toBe(1)
      }),
      { numRuns: 100 }
    )
  })

  it('相同日期比较应该返回 0', () => {
    fc.assert(
      fc.property(validDateArbitrary, (dateStr) => {
        expect(compareDates(dateStr, dateStr)).toBe(0)
      }),
      { numRuns: 100 }
    )
  })
})
