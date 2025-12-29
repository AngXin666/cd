/**
 * 品类删除约束属性测试
 * 使用 fast-check 进行属性测试，验证品类删除约束的核心功能
 * 
 * @module utils/__tests__/categoryDeleteValidation.pbt.test
 *
 * **Feature: manager-page-alignment, Property 5: 品类删除约束**
 * **Validates: Requirements 3.4**
 * 
 * 验证规则：
 * - 如果品类已有计件记录，删除操作应被拒绝
 * - 删除被拒绝时，品类状态应保持不变
 * - 如果品类没有计件记录，删除操作应成功
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  countCategoryRecords,
  validateCategoryDelete,
  simulateCategoryDelete,
  validateDeleteResult,
  type Category,
  type DeleteValidationResult,
} from '../validation/categoryDeleteValidation'
import type { PieceWorkRecord } from '@/api/types'

// ==================== 自定义生成器 ====================

/**
 * 生成有效的品类ID（正整数）
 */
const categoryIdArbitrary = fc.integer({ min: 1, max: 10000 })

/**
 * 生成品类名称
 */
const categoryNameArbitrary = fc.stringOf(
  fc.oneof(
    // 中文字符
    fc.integer({ min: 0x4e00, max: 0x9fa5 }).map(code => String.fromCharCode(code)),
    // 英文字母
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))
  ),
  { minLength: 1, maxLength: 20 }
)

/**
 * 生成品类对象
 */
const categoryArbitrary: fc.Arbitrary<Category> = fc.record({
  id: categoryIdArbitrary,
  name: categoryNameArbitrary,
  unit_price: fc.float({ min: Math.fround(0.01), max: 1000, noNaN: true }),
  unit: fc.constantFrom('件', '箱', '吨', '个', '包'),
  is_active: fc.boolean(),
})

/**
 * 生成品类列表（确保ID唯一）
 */
const categoryListArbitrary = fc.array(categoryArbitrary, { minLength: 1, maxLength: 10 })
  .map(categories => {
    // 确保ID唯一
    const seen = new Set<number>()
    return categories.filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  })
  .filter(categories => categories.length > 0)

/**
 * 生成计件记录
 */
const pieceWorkRecordArbitrary = (categoryIds: number[]): fc.Arbitrary<PieceWorkRecord> => {
  // 如果没有品类，使用默认ID
  const validCategoryIds = categoryIds.length > 0 ? categoryIds : [1]
  
  return fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    user_id: fc.integer({ min: 1, max: 1000 }),
    category_id: fc.constantFrom(...validCategoryIds),
    warehouse_id: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
    work_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
      .map(d => d.toISOString().split('T')[0]),
    quantity: fc.integer({ min: 1, max: 1000 }),
    amount: fc.float({ min: Math.fround(0.01), max: 10000, noNaN: true }),
    remark: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    created_at: fc.date().map(d => d.toISOString()),
    user_name: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
    category_name: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
    warehouse_name: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
  }) as fc.Arbitrary<PieceWorkRecord>
}

/**
 * 生成带有特定品类ID的计件记录列表
 */
const recordsWithCategoryArbitrary = (
  categoryId: number,
  minRecords: number,
  maxRecords: number
): fc.Arbitrary<PieceWorkRecord[]> => {
  return fc.array(
    fc.record({
      id: fc.integer({ min: 1, max: 100000 }),
      user_id: fc.integer({ min: 1, max: 1000 }),
      category_id: fc.constant(categoryId),
      warehouse_id: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
      work_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
        .map(d => d.toISOString().split('T')[0]),
      quantity: fc.integer({ min: 1, max: 1000 }),
      amount: fc.float({ min: Math.fround(0.01), max: 10000, noNaN: true }),
      remark: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
      created_at: fc.date().map(d => d.toISOString()),
      user_name: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
      category_name: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
      warehouse_name: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
    }) as fc.Arbitrary<PieceWorkRecord>,
    { minLength: minRecords, maxLength: maxRecords }
  )
}

// ==================== 属性测试 ====================

describe('品类删除约束属性测试', () => {
  /**
   * **Feature: manager-page-alignment, Property 5: 品类删除约束**
   * **Validates: Requirements 3.4**
   */
  describe('Property 5: 品类删除约束', () => {
    
    it('Property 5.1: 有计件记录的品类不能删除', () => {
      /**
       * 属性：对于任意有计件记录的品类，
       * validateCategoryDelete 应该返回 { canDelete: false }
       * 
       * **Feature: manager-page-alignment, Property 5: 品类删除约束**
       * **Validates: Requirements 3.4**
       */
      fc.assert(
        fc.property(
          categoryIdArbitrary,
          fc.integer({ min: 1, max: 10 }),
          (categoryId, recordCount) => {
            // 生成该品类的计件记录
            const records: PieceWorkRecord[] = Array.from({ length: recordCount }, (_, i) => ({
              id: i + 1,
              user_id: 1,
              category_id: categoryId,
              work_date: '2024-01-01',
              quantity: 10,
              amount: 100,
              created_at: new Date().toISOString(),
            })) as PieceWorkRecord[]
            
            // 验证删除约束
            const result = validateCategoryDelete(categoryId, records)
            
            // 有记录的品类不能删除
            expect(result.canDelete).toBe(false)
            expect(result.recordCount).toBe(recordCount)
            expect(result.error).toBeDefined()
            expect(result.error).toContain('计件记录')
          }
        ),
        { numRuns: 20 }
      )
    })

    it('Property 5.2: 没有计件记录的品类可以删除', () => {
      /**
       * 属性：对于任意没有计件记录的品类，
       * validateCategoryDelete 应该返回 { canDelete: true }
       * 
       * **Feature: manager-page-alignment, Property 5: 品类删除约束**
       * **Validates: Requirements 3.4**
       */
      fc.assert(
        fc.property(
          categoryIdArbitrary,
          fc.array(categoryIdArbitrary, { minLength: 0, maxLength: 10 }),
          (targetCategoryId, otherCategoryIds) => {
            // 确保其他品类ID不包含目标品类ID
            const filteredIds = otherCategoryIds.filter(id => id !== targetCategoryId)
            
            // 生成其他品类的计件记录（不包含目标品类）
            const records: PieceWorkRecord[] = filteredIds.map((categoryId, i) => ({
              id: i + 1,
              user_id: 1,
              category_id: categoryId,
              work_date: '2024-01-01',
              quantity: 10,
              amount: 100,
              created_at: new Date().toISOString(),
            })) as PieceWorkRecord[]
            
            // 验证删除约束
            const result = validateCategoryDelete(targetCategoryId, records)
            
            // 没有记录的品类可以删除
            expect(result.canDelete).toBe(true)
            expect(result.recordCount).toBe(0)
            expect(result.error).toBeUndefined()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('Property 5.3: 删除失败时品类状态保持不变', () => {
      /**
       * 属性：对于任意有计件记录的品类，
       * 删除操作失败后，品类列表应该保持不变
       * 
       * **Feature: manager-page-alignment, Property 5: 品类删除约束**
       * **Validates: Requirements 3.4**
       */
      fc.assert(
        fc.property(
          categoryListArbitrary,
          fc.integer({ min: 1, max: 5 }),
          (categories, recordCount) => {
            // 选择第一个品类作为目标
            const targetCategory = categories[0]
            
            // 生成该品类的计件记录
            const records: PieceWorkRecord[] = Array.from({ length: recordCount }, (_, i) => ({
              id: i + 1,
              user_id: 1,
              category_id: targetCategory.id,
              work_date: '2024-01-01',
              quantity: 10,
              amount: 100,
              created_at: new Date().toISOString(),
            })) as PieceWorkRecord[]
            
            // 执行删除操作
            const result = simulateCategoryDelete(targetCategory.id, categories, records)
            
            // 删除应该失败
            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
            
            // 品类列表应该保持不变
            if (result.categories) {
              expect(result.categories.length).toBe(categories.length)
              expect(result.categories.some(c => c.id === targetCategory.id)).toBe(true)
            }
          }
        ),
        { numRuns: 20 }
      )
    })

    it('Property 5.4: 删除成功时品类从列表中移除', () => {
      /**
       * 属性：对于任意没有计件记录的品类，
       * 删除操作成功后，品类应该从列表中移除
       * 
       * **Feature: manager-page-alignment, Property 5: 品类删除约束**
       * **Validates: Requirements 3.4**
       */
      fc.assert(
        fc.property(
          categoryListArbitrary,
          (categories) => {
            // 选择第一个品类作为目标
            const targetCategory = categories[0]
            
            // 生成其他品类的计件记录（不包含目标品类）
            const otherCategories = categories.filter(c => c.id !== targetCategory.id)
            const records: PieceWorkRecord[] = otherCategories.map((c, i) => ({
              id: i + 1,
              user_id: 1,
              category_id: c.id,
              work_date: '2024-01-01',
              quantity: 10,
              amount: 100,
              created_at: new Date().toISOString(),
            })) as PieceWorkRecord[]
            
            // 执行删除操作
            const result = simulateCategoryDelete(targetCategory.id, categories, records)
            
            // 删除应该成功
            expect(result.success).toBe(true)
            expect(result.error).toBeUndefined()
            
            // 品类应该从列表中移除
            if (result.categories) {
              expect(result.categories.length).toBe(categories.length - 1)
              expect(result.categories.some(c => c.id === targetCategory.id)).toBe(false)
            }
          }
        ),
        { numRuns: 20 }
      )
    })

    it('Property 5.5: 记录数量统计正确性', () => {
      /**
       * 属性：对于任意品类和记录列表，
       * countCategoryRecords 返回的数量应该等于实际属于该品类的记录数
       * 
       * **Feature: manager-page-alignment, Property 5: 品类删除约束**
       * **Validates: Requirements 3.4**
       */
      fc.assert(
        fc.property(
          categoryIdArbitrary,
          fc.array(categoryIdArbitrary, { minLength: 0, maxLength: 20 }),
          (targetCategoryId, categoryIds) => {
            // 生成记录列表
            const records: PieceWorkRecord[] = categoryIds.map((categoryId, i) => ({
              id: i + 1,
              user_id: 1,
              category_id: categoryId,
              work_date: '2024-01-01',
              quantity: 10,
              amount: 100,
              created_at: new Date().toISOString(),
            })) as PieceWorkRecord[]
            
            // 计算预期数量
            const expectedCount = categoryIds.filter(id => id === targetCategoryId).length
            
            // 验证统计结果
            const actualCount = countCategoryRecords(targetCategoryId, records)
            
            expect(actualCount).toBe(expectedCount)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('Property 5.6: 删除结果验证函数正确性', () => {
      /**
       * 属性：validateDeleteResult 应该正确验证删除操作的结果
       * - 删除成功时，品类应该不在结果列表中
       * - 删除失败时，品类应该仍在结果列表中
       * 
       * **Feature: manager-page-alignment, Property 5: 品类删除约束**
       * **Validates: Requirements 3.4**
       */
      fc.assert(
        fc.property(
          categoryListArbitrary,
          fc.boolean(),
          (categories, deleteSuccess) => {
            // 选择第一个品类作为目标
            const targetCategory = categories[0]
            
            // 根据删除结果构造结果列表
            let resultCategories: Category[]
            if (deleteSuccess) {
              // 删除成功：移除目标品类
              resultCategories = categories.filter(c => c.id !== targetCategory.id)
            } else {
              // 删除失败：保持原列表
              resultCategories = [...categories]
            }
            
            // 验证结果
            const isValid = validateDeleteResult(
              categories,
              resultCategories,
              targetCategory.id,
              deleteSuccess
            )
            
            expect(isValid).toBe(true)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('Property 5.7: 空记录列表时品类可以删除', () => {
      /**
       * 属性：当记录列表为空时，任何品类都可以删除
       * 
       * **Feature: manager-page-alignment, Property 5: 品类删除约束**
       * **Validates: Requirements 3.4**
       */
      fc.assert(
        fc.property(
          categoryIdArbitrary,
          (categoryId) => {
            // 空记录列表
            const records: PieceWorkRecord[] = []
            
            // 验证删除约束
            const result = validateCategoryDelete(categoryId, records)
            
            // 应该可以删除
            expect(result.canDelete).toBe(true)
            expect(result.recordCount).toBe(0)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('Property 5.8: 删除约束与记录数量的一致性', () => {
      /**
       * 属性：canDelete 应该与 recordCount 一致
       * - recordCount > 0 时，canDelete 应该为 false
       * - recordCount === 0 时，canDelete 应该为 true
       * 
       * **Feature: manager-page-alignment, Property 5: 品类删除约束**
       * **Validates: Requirements 3.4**
       */
      fc.assert(
        fc.property(
          categoryIdArbitrary,
          fc.array(categoryIdArbitrary, { minLength: 0, maxLength: 20 }),
          (targetCategoryId, categoryIds) => {
            // 生成记录列表
            const records: PieceWorkRecord[] = categoryIds.map((categoryId, i) => ({
              id: i + 1,
              user_id: 1,
              category_id: categoryId,
              work_date: '2024-01-01',
              quantity: 10,
              amount: 100,
              created_at: new Date().toISOString(),
            })) as PieceWorkRecord[]
            
            // 验证删除约束
            const result = validateCategoryDelete(targetCategoryId, records)
            
            // 验证一致性
            if (result.recordCount > 0) {
              expect(result.canDelete).toBe(false)
            } else {
              expect(result.canDelete).toBe(true)
            }
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})
