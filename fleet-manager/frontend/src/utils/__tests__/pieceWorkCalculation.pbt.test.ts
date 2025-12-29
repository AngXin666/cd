/**
 * 件数计算属性测试
 * 使用 fast-check 进行属性测试，验证件数计算的核心功能
 * @module utils/__tests__/pieceWorkCalculation.pbt.test
 *
 * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
 * **Validates: Requirements 4.2**
 * 
 * 验证规则：
 * - 总件数应等于各品类件数之和
 * - 总金额应等于各品类金额之和
 * - 品类分组后的统计应与原始数据一致
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { PieceWorkRecord } from '@/api/types'
import {
  calculateRecordAmount,
  calculateTotalQuantity,
  calculateTotalAmount,
  calculateCategoryStats,
  calculatePieceWorkSummary,
  validateTotalQuantity,
  validateTotalAmount,
  validatePieceWorkData,
  validateQuantity,
  validateUnitPrice,
} from '../validation/pieceWorkCalculation'

// ==================== 自定义生成器 ====================

/**
 * 生成有效的品类名称
 */
const categoryNameArbitrary = fc.constantFrom(
  '水果', '蔬菜', '肉类', '海鲜', '饮料', '零食', '日用品', '快递', '包裹', '文件'
)

/**
 * 生成有效的数量（非负整数）
 */
const quantityArbitrary = fc.integer({ min: 0, max: 10000 })

/**
 * 生成有效的单价（非负数，最多两位小数）
 */
const unitPriceArbitrary = fc.integer({ min: 0, max: 100000 }).map(n => n / 100)

/**
 * 生成有效的金额（非负数，最多两位小数）
 */
const amountArbitrary = fc.integer({ min: 0, max: 10000000 }).map(n => n / 100)

/**
 * 生成有效的日期字符串
 */
const dateArbitrary = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
}).map(d => d.toISOString().split('T')[0])

/**
 * 生成有效的计件记录
 */
const pieceWorkRecordArbitrary: fc.Arbitrary<PieceWorkRecord> = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  user_id: fc.integer({ min: 1, max: 10000 }),
  category_id: fc.integer({ min: 1, max: 100 }),
  warehouse_id: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
  work_date: dateArbitrary,
  quantity: quantityArbitrary,
  amount: amountArbitrary,
  remark: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: null }),
  created_at: fc.date().map(d => d.toISOString()),
  user_name: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  category_name: fc.option(categoryNameArbitrary, { nil: undefined }),
  warehouse_name: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
}) as fc.Arbitrary<PieceWorkRecord>

/**
 * 生成带有一致金额的计件记录（金额 = 数量 × 单价）
 */
const consistentPieceWorkRecordArbitrary: fc.Arbitrary<PieceWorkRecord> = fc.tuple(
  fc.integer({ min: 1, max: 100000 }),
  fc.integer({ min: 1, max: 10000 }),
  fc.integer({ min: 1, max: 100 }),
  fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
  dateArbitrary,
  quantityArbitrary,
  unitPriceArbitrary,
  fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: null }),
  fc.date().map(d => d.toISOString()),
  fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  fc.option(categoryNameArbitrary, { nil: undefined }),
  fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
).map(([id, user_id, category_id, warehouse_id, work_date, quantity, unitPrice, remark, created_at, user_name, category_name, warehouse_name]) => ({
  id,
  user_id,
  category_id,
  warehouse_id,
  work_date,
  quantity,
  amount: Math.round(quantity * unitPrice * 100) / 100,
  remark,
  created_at,
  user_name,
  category_name,
  warehouse_name,
})) as fc.Arbitrary<PieceWorkRecord>

/**
 * 生成计件记录列表
 */
const pieceWorkRecordListArbitrary = (
  minLength = 0,
  maxLength = 50
): fc.Arbitrary<PieceWorkRecord[]> => {
  return fc.array(pieceWorkRecordArbitrary, { minLength, maxLength })
}

/**
 * 生成带有一致金额的计件记录列表
 */
const consistentPieceWorkRecordListArbitrary = (
  minLength = 0,
  maxLength = 50
): fc.Arbitrary<PieceWorkRecord[]> => {
  return fc.array(consistentPieceWorkRecordArbitrary, { minLength, maxLength })
}

// ==================== 属性测试 ====================

describe('件数计算属性测试', () => {
  /**
   * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
   * **Validates: Requirements 4.2**
   */
  describe('Property 4: 件数计算正确性', () => {
    
    it('Property 4.1: 总数量应等于各品类数量之和', () => {
      /**
       * 属性：对于任意计件记录列表，
       * 总数量应该等于按品类分组后各品类数量的总和
       * 
       * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
       * **Validates: Requirements 4.2**
       */
      fc.assert(
        fc.property(pieceWorkRecordListArbitrary(0, 100), (records) => {
          // 计算总数量
          const totalQuantity = calculateTotalQuantity(records)
          
          // 计算各品类数量之和
          const categoryStats = calculateCategoryStats(records)
          const categoryTotalQuantity = categoryStats.reduce(
            (sum, stats) => sum + stats.totalQuantity,
            0
          )
          
          // 验证相等
          expect(totalQuantity).toBe(categoryTotalQuantity)
          
          // 使用验证函数验证
          const validation = validateTotalQuantity(records)
          expect(validation.valid).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 4.2: 总金额应等于各品类金额之和', () => {
      /**
       * 属性：对于任意计件记录列表，
       * 总金额应该等于按品类分组后各品类金额的总和
       * 
       * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
       * **Validates: Requirements 4.2**
       */
      fc.assert(
        fc.property(pieceWorkRecordListArbitrary(0, 100), (records) => {
          // 计算总金额
          const totalAmount = calculateTotalAmount(records)
          
          // 计算各品类金额之和
          const categoryStats = calculateCategoryStats(records)
          const categoryTotalAmount = categoryStats.reduce(
            (sum, stats) => sum + stats.totalAmount,
            0
          )
          
          // 保留两位小数后比较（避免浮点数精度问题）
          const roundedTotal = Math.round(totalAmount * 100) / 100
          const roundedCategoryTotal = Math.round(categoryTotalAmount * 100) / 100
          
          // 验证相等（允许 0.01 的误差）
          expect(Math.abs(roundedTotal - roundedCategoryTotal)).toBeLessThanOrEqual(0.01)
          
          // 使用验证函数验证
          const validation = validateTotalAmount(records)
          expect(validation.valid).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 4.3: 记录数应等于各品类记录数之和', () => {
      /**
       * 属性：对于任意计件记录列表，
       * 总记录数应该等于按品类分组后各品类记录数的总和
       * 
       * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
       * **Validates: Requirements 4.2**
       */
      fc.assert(
        fc.property(pieceWorkRecordListArbitrary(0, 100), (records) => {
          // 计算各品类记录数之和
          const categoryStats = calculateCategoryStats(records)
          const categoryTotalRecordCount = categoryStats.reduce(
            (sum, stats) => sum + stats.recordCount,
            0
          )
          
          // 验证相等
          expect(records.length).toBe(categoryTotalRecordCount)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 4.4: 汇总结果应与分别计算的结果一致', () => {
      /**
       * 属性：对于任意计件记录列表，
       * calculatePieceWorkSummary 的结果应与分别调用各计算函数的结果一致
       * 
       * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
       * **Validates: Requirements 4.2**
       */
      fc.assert(
        fc.property(pieceWorkRecordListArbitrary(0, 100), (records) => {
          // 使用汇总函数
          const summary = calculatePieceWorkSummary(records)
          
          // 分别计算
          const totalQuantity = calculateTotalQuantity(records)
          const totalAmount = calculateTotalAmount(records)
          const categoryStats = calculateCategoryStats(records)
          
          // 验证一致性
          expect(summary.totalQuantity).toBe(totalQuantity)
          expect(summary.totalAmount).toBe(totalAmount)
          expect(summary.recordCount).toBe(records.length)
          expect(summary.categoryStats.length).toBe(categoryStats.length)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 4.5: 空列表应返回零值', () => {
      /**
       * 属性：对于空的计件记录列表，
       * 所有计算结果应该为零
       * 
       * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
       * **Validates: Requirements 4.2**
       */
      const emptyRecords: PieceWorkRecord[] = []
      
      expect(calculateTotalQuantity(emptyRecords)).toBe(0)
      expect(calculateTotalAmount(emptyRecords)).toBe(0)
      expect(calculateCategoryStats(emptyRecords)).toEqual([])
      
      const summary = calculatePieceWorkSummary(emptyRecords)
      expect(summary.totalQuantity).toBe(0)
      expect(summary.totalAmount).toBe(0)
      expect(summary.recordCount).toBe(0)
      expect(summary.categoryStats).toEqual([])
      
      // 验证函数应该返回有效
      expect(validateTotalQuantity(emptyRecords).valid).toBe(true)
      expect(validateTotalAmount(emptyRecords).valid).toBe(true)
      expect(validatePieceWorkData(emptyRecords).isValid).toBe(true)
    })

    it('Property 4.6: 单条记录的计算应正确', () => {
      /**
       * 属性：对于任意单条计件记录，
       * 总数量应等于该记录的数量，总金额应等于该记录的金额
       * 
       * **Feature: boss-missing-pages, Property 4: 件数计算正确性**
       * **Validates: Requirements 4.2**
       */
      fc.assert(
        fc.property(pieceWorkRecordArbitrary, (record) => {
          const records = [record]
          
          // 验证总数量
          expect(calculateTotalQuantity(records)).toBe(Math.max(0, record.quantity))
          
          // 验证总金额（保留两位小数）
          const expectedAmount = Math.round(Math.max(0, record.amount) * 100) / 100
          expect(calculateTotalAmount(records)).toBe(expectedAmount)
          
          // 验证品类统计
          const categoryStats = calculateCategoryStats(records)
          expect(categoryStats.length).toBe(1)
          expect(categoryStats[0].totalQuantity).toBe(Math.max(0, record.quantity))
          expect(categoryStats[0].totalAmount).toBe(expectedAmount)
          expect(categoryStats[0].recordCount).toBe(1)
        }),
        { numRuns: 100 }
      )
    })
  })
})

describe('单条记录金额计算属性测试', () => {
  /**
   * 单条记录金额计算的属性测试
   */
  
  it('金额应等于数量乘以单价', () => {
    /**
     * 属性：对于任意有效的数量和单价，
     * calculateRecordAmount 应返回 数量 × 单价
     */
    fc.assert(
      fc.property(quantityArbitrary, unitPriceArbitrary, (quantity, unitPrice) => {
        const amount = calculateRecordAmount(quantity, unitPrice)
        const expected = Math.round(quantity * unitPrice * 100) / 100
        
        expect(amount).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  it('负数量应被处理为零', () => {
    /**
     * 属性：对于负数量，
     * calculateRecordAmount 应返回 0
     */
    fc.assert(
      fc.property(
        fc.integer({ min: -10000, max: -1 }),
        unitPriceArbitrary,
        (quantity, unitPrice) => {
          const amount = calculateRecordAmount(quantity, unitPrice)
          expect(amount).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('负单价应被处理为零', () => {
    /**
     * 属性：对于负单价，
     * calculateRecordAmount 应返回 0
     */
    fc.assert(
      fc.property(
        quantityArbitrary,
        fc.integer({ min: -10000, max: -1 }).map(n => n / 100),
        (quantity, unitPrice) => {
          const amount = calculateRecordAmount(quantity, unitPrice)
          expect(amount).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('零数量应返回零金额', () => {
    /**
     * 属性：对于零数量，
     * calculateRecordAmount 应返回 0
     */
    fc.assert(
      fc.property(unitPriceArbitrary, (unitPrice) => {
        const amount = calculateRecordAmount(0, unitPrice)
        expect(amount).toBe(0)
      }),
      { numRuns: 50 }
    )
  })

  it('零单价应返回零金额', () => {
    /**
     * 属性：对于零单价，
     * calculateRecordAmount 应返回 0
     */
    fc.assert(
      fc.property(quantityArbitrary, (quantity) => {
        const amount = calculateRecordAmount(quantity, 0)
        expect(amount).toBe(0)
      }),
      { numRuns: 50 }
    )
  })
})

describe('数量验证属性测试', () => {
  /**
   * 数量验证的属性测试
   */
  
  it('非负整数应验证通过', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100000 }), (quantity) => {
        const result = validateQuantity(quantity)
        expect(result.valid).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('负数应验证失败', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: -1 }), (quantity) => {
        const result = validateQuantity(quantity)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('负数')
      }),
      { numRuns: 50 }
    )
  })

  it('非整数应验证失败', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true })
          .filter(n => !Number.isInteger(n)),
        (quantity) => {
          const result = validateQuantity(quantity)
          expect(result.valid).toBe(false)
          expect(result.error).toContain('整数')
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('单价验证属性测试', () => {
  /**
   * 单价验证的属性测试
   */
  
  it('非负数应验证通过', () => {
    fc.assert(
      fc.property(unitPriceArbitrary, (unitPrice) => {
        const result = validateUnitPrice(unitPrice)
        expect(result.valid).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('负数应验证失败', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100000, max: -1 }).map(n => n / 100),
        (unitPrice) => {
          const result = validateUnitPrice(unitPrice)
          expect(result.valid).toBe(false)
          expect(result.error).toContain('负数')
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('品类分组属性测试', () => {
  /**
   * 品类分组的属性测试
   */
  
  it('相同品类的记录应被正确分组', () => {
    /**
     * 属性：对于任意计件记录列表，
     * 相同品类的记录应该被分到同一组
     */
    fc.assert(
      fc.property(pieceWorkRecordListArbitrary(1, 50), (records) => {
        const categoryStats = calculateCategoryStats(records)
        
        // 验证每个品类的记录数之和等于总记录数
        const totalRecordCount = categoryStats.reduce(
          (sum, stats) => sum + stats.recordCount,
          0
        )
        expect(totalRecordCount).toBe(records.length)
      }),
      { numRuns: 100 }
    )
  })

  it('没有 category_name 的记录应归类为"未知分类"', () => {
    /**
     * 属性：对于没有 category_name 的记录，
     * 应该被归类为"未知分类"
     */
    const recordWithoutCategoryName: PieceWorkRecord = {
      id: 1,
      user_id: 1,
      category_id: 1,
      warehouse_id: null,
      work_date: '2024-01-01',
      quantity: 10,
      amount: 100,
      remark: null,
      created_at: new Date().toISOString(),
    }
    
    const categoryStats = calculateCategoryStats([recordWithoutCategoryName])
    
    expect(categoryStats.length).toBe(1)
    expect(categoryStats[0].categoryName).toBe('未知分类')
    expect(categoryStats[0].totalQuantity).toBe(10)
    expect(categoryStats[0].totalAmount).toBe(100)
  })
})

describe('边界条件测试', () => {
  /**
   * 边界条件的测试
   */
  
  it('大量记录的计算应正确', () => {
    /**
     * 属性：对于大量计件记录，
     * 计算结果应该正确
     */
    fc.assert(
      fc.property(pieceWorkRecordListArbitrary(100, 200), (records) => {
        // 验证数据完整性
        const validation = validatePieceWorkData(records)
        expect(validation.isValid).toBe(true)
      }),
      { numRuns: 10 }
    )
  })

  it('所有记录数量为零时总数量应为零', () => {
    /**
     * 属性：当所有记录的数量都为零时，
     * 总数量应该为零
     */
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100000 }),
            user_id: fc.integer({ min: 1, max: 10000 }),
            category_id: fc.integer({ min: 1, max: 100 }),
            warehouse_id: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            work_date: dateArbitrary,
            quantity: fc.constant(0),
            amount: fc.constant(0),
            remark: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: null }),
            created_at: fc.date().map(d => d.toISOString()),
            category_name: fc.option(categoryNameArbitrary, { nil: undefined }),
          }) as fc.Arbitrary<PieceWorkRecord>,
          { minLength: 1, maxLength: 50 }
        ),
        (records) => {
          expect(calculateTotalQuantity(records)).toBe(0)
          expect(calculateTotalAmount(records)).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('非数组输入应返回零或空', () => {
    // @ts-expect-error 测试非法输入
    expect(calculateTotalQuantity(null)).toBe(0)
    // @ts-expect-error 测试非法输入
    expect(calculateTotalQuantity(undefined)).toBe(0)
    // @ts-expect-error 测试非法输入
    expect(calculateTotalAmount(null)).toBe(0)
    // @ts-expect-error 测试非法输入
    expect(calculateTotalAmount(undefined)).toBe(0)
    // @ts-expect-error 测试非法输入
    expect(calculateCategoryStats(null)).toEqual([])
    // @ts-expect-error 测试非法输入
    expect(calculateCategoryStats(undefined)).toEqual([])
  })

  it('非法数组输入验证应失败', () => {
    // @ts-expect-error 测试非法输入
    const result = validateTotalQuantity(null)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('无效')
  })
})
