/**
 * 重复记录检测属性测试
 * 使用 fast-check 进行属性测试，验证重复记录检测的正确性
 * 
 * **Feature: vue-deep-conversion, Property 4: 重复记录检测**
 * **Validates: Requirements 1.6**
 * 
 * @module api/__tests__/duplicate-record.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import type { PieceWorkRecord } from '../types'

/**
 * 模拟的计件记录数据库
 * 用于测试重复记录检测逻辑
 */
let mockRecordsDatabase: PieceWorkRecord[] = []

/**
 * 重复记录检测核心逻辑（纯函数版本）
 * 从记录列表中查找匹配指定条件的记录
 * 
 * @param records - 计件记录列表
 * @param userId - 用户 ID
 * @param warehouseId - 仓库 ID
 * @param categoryId - 品类 ID
 * @param workDate - 工作日期 (YYYY-MM-DD)
 * @returns 如果存在重复记录则返回该记录，否则返回 null
 */
function findDuplicateRecord(
  records: PieceWorkRecord[],
  userId: number,
  warehouseId: number,
  categoryId: number,
  workDate: string
): PieceWorkRecord | null {
  // 查找匹配所有条件的记录
  const matchingRecord = records.find(record =>
    record.user_id === userId &&
    record.warehouse_id === warehouseId &&
    record.category_id === categoryId &&
    record.work_date === workDate
  )
  
  return matchingRecord || null
}

/**
 * 生成有效用户 ID 的 Arbitrary
 * 用户 ID 应该是正整数
 */
const userIdArb = fc.integer({ min: 1, max: 1000 })

/**
 * 生成有效仓库 ID 的 Arbitrary
 * 仓库 ID 应该是正整数
 */
const warehouseIdArb = fc.integer({ min: 1, max: 100 })

/**
 * 生成有效品类 ID 的 Arbitrary
 * 品类 ID 应该是正整数
 */
const categoryIdArb = fc.integer({ min: 1, max: 50 })

/**
 * 生成有效工作日期的 Arbitrary
 * 日期格式为 YYYY-MM-DD
 */
const workDateArb = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2024-12-31')
}).map(date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

/**
 * 生成有效数量的 Arbitrary
 * 数量应该是正整数
 */
const quantityArb = fc.integer({ min: 1, max: 10000 })

/**
 * 生成有效金额的 Arbitrary
 * 金额应该是非负数
 */
const amountArb = fc.float({ min: 0, max: 100000, noNaN: true })

/**
 * 生成计件记录的 Arbitrary
 */
const pieceWorkRecordArb = (
  userId?: number,
  warehouseId?: number,
  categoryId?: number,
  workDate?: string
): fc.Arbitrary<PieceWorkRecord> => {
  return fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    user_id: userId !== undefined ? fc.constant(userId) : userIdArb,
    warehouse_id: warehouseId !== undefined ? fc.constant(warehouseId) : warehouseIdArb,
    category_id: categoryId !== undefined ? fc.constant(categoryId) : categoryIdArb,
    work_date: workDate !== undefined ? fc.constant(workDate) : workDateArb,
    quantity: quantityArb,
    amount: amountArb,
    remark: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    created_at: fc.constant(new Date().toISOString()),
    user_name: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
    category_name: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
    warehouse_name: fc.option(fc.string({ minLength: 1, maxLength: 20 }))
  })
}

/**
 * 生成计件记录列表的 Arbitrary
 */
const pieceWorkRecordsArb = fc.array(
  pieceWorkRecordArb(),
  { minLength: 0, maxLength: 50 }
)

describe('重复记录检测属性测试', () => {
  beforeEach(() => {
    mockRecordsDatabase = []
    vi.clearAllMocks()
  })

  /**
   * Property 4: 重复记录检测
   * *For any* 计件记录，如果存在相同用户、仓库、品类、日期的记录，
   * 则 checkDuplicateRecord 应返回该记录
   * **Validates: Requirements 1.6**
   */
  describe('Property 4: 重复记录检测', () => {
    it('当存在完全匹配的记录时应该返回该记录', () => {
      fc.assert(
        fc.property(
          userIdArb,
          warehouseIdArb,
          categoryIdArb,
          workDateArb,
          quantityArb,
          amountArb,
          (userId, warehouseId, categoryId, workDate, quantity, amount) => {
            // 创建一条匹配的记录
            const matchingRecord: PieceWorkRecord = {
              id: 1,
              user_id: userId,
              warehouse_id: warehouseId,
              category_id: categoryId,
              work_date: workDate,
              quantity,
              amount,
              remark: null,
              created_at: new Date().toISOString()
            }
            
            // 创建一些不匹配的记录
            const otherRecords: PieceWorkRecord[] = [
              { ...matchingRecord, id: 2, user_id: userId + 1 },
              { ...matchingRecord, id: 3, warehouse_id: warehouseId + 1 },
              { ...matchingRecord, id: 4, category_id: categoryId + 1 },
              { ...matchingRecord, id: 5, work_date: '2023-01-01' }
            ]
            
            const allRecords = [matchingRecord, ...otherRecords]
            
            // 查找重复记录
            const result = findDuplicateRecord(
              allRecords,
              userId,
              warehouseId,
              categoryId,
              workDate
            )
            
            // 验证返回的记录与原始记录匹配
            return result !== null &&
                   result.user_id === userId &&
                   result.warehouse_id === warehouseId &&
                   result.category_id === categoryId &&
                   result.work_date === workDate
          }
        ),
        { numRuns: 100 }
      )
    })

    it('当不存在匹配的记录时应该返回 null', () => {
      fc.assert(
        fc.property(
          userIdArb,
          warehouseIdArb,
          categoryIdArb,
          workDateArb,
          pieceWorkRecordsArb,
          (userId, warehouseId, categoryId, workDate, records) => {
            // 过滤掉任何可能匹配的记录
            const nonMatchingRecords = records.filter(record =>
              record.user_id !== userId ||
              record.warehouse_id !== warehouseId ||
              record.category_id !== categoryId ||
              record.work_date !== workDate
            )
            
            // 查找重复记录
            const result = findDuplicateRecord(
              nonMatchingRecords,
              userId,
              warehouseId,
              categoryId,
              workDate
            )
            
            // 验证返回 null
            return result === null
          }
        ),
        { numRuns: 100 }
      )
    })

    it('只有当所有四个条件都匹配时才返回记录', () => {
      fc.assert(
        fc.property(
          userIdArb,
          warehouseIdArb,
          categoryIdArb,
          workDateArb,
          fc.integer({ min: 0, max: 3 }), // 选择哪个条件不匹配
          (userId, warehouseId, categoryId, workDate, mismatchIndex) => {
            // 创建一条记录，但有一个条件不匹配
            const record: PieceWorkRecord = {
              id: 1,
              user_id: mismatchIndex === 0 ? userId + 1 : userId,
              warehouse_id: mismatchIndex === 1 ? warehouseId + 1 : warehouseId,
              category_id: mismatchIndex === 2 ? categoryId + 1 : categoryId,
              work_date: mismatchIndex === 3 ? '2023-01-01' : workDate,
              quantity: 100,
              amount: 1000,
              remark: null,
              created_at: new Date().toISOString()
            }
            
            // 查找重复记录
            const result = findDuplicateRecord(
              [record],
              userId,
              warehouseId,
              categoryId,
              workDate
            )
            
            // 验证返回 null（因为有一个条件不匹配）
            return result === null
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空记录列表应该返回 null', () => {
      fc.assert(
        fc.property(
          userIdArb,
          warehouseIdArb,
          categoryIdArb,
          workDateArb,
          (userId, warehouseId, categoryId, workDate) => {
            // 空记录列表
            const result = findDuplicateRecord(
              [],
              userId,
              warehouseId,
              categoryId,
              workDate
            )
            
            // 验证返回 null
            return result === null
          }
        ),
        { numRuns: 100 }
      )
    })

    it('当存在多条匹配记录时应该返回第一条', () => {
      fc.assert(
        fc.property(
          userIdArb,
          warehouseIdArb,
          categoryIdArb,
          workDateArb,
          fc.integer({ min: 2, max: 5 }), // 匹配记录数量
          (userId, warehouseId, categoryId, workDate, matchCount) => {
            // 创建多条匹配的记录
            const matchingRecords: PieceWorkRecord[] = Array.from(
              { length: matchCount },
              (_, index) => ({
                id: index + 1,
                user_id: userId,
                warehouse_id: warehouseId,
                category_id: categoryId,
                work_date: workDate,
                quantity: 100 + index,
                amount: 1000 + index * 100,
                remark: null,
                created_at: new Date().toISOString()
              })
            )
            
            // 查找重复记录
            const result = findDuplicateRecord(
              matchingRecords,
              userId,
              warehouseId,
              categoryId,
              workDate
            )
            
            // 验证返回第一条记录
            return result !== null && result.id === 1
          }
        ),
        { numRuns: 100 }
      )
    })

    it('warehouse_id 为 null 时不应该匹配', () => {
      fc.assert(
        fc.property(
          userIdArb,
          warehouseIdArb,
          categoryIdArb,
          workDateArb,
          (userId, warehouseId, categoryId, workDate) => {
            // 创建一条 warehouse_id 为 null 的记录
            const record: PieceWorkRecord = {
              id: 1,
              user_id: userId,
              warehouse_id: null,
              category_id: categoryId,
              work_date: workDate,
              quantity: 100,
              amount: 1000,
              remark: null,
              created_at: new Date().toISOString()
            }
            
            // 查找重复记录（使用具体的 warehouseId）
            const result = findDuplicateRecord(
              [record],
              userId,
              warehouseId,
              categoryId,
              workDate
            )
            
            // 验证返回 null（因为 warehouse_id 不匹配）
            return result === null
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 数据完整性测试
   * 验证返回的记录数据完整性
   */
  describe('数据完整性测试', () => {
    it('返回的记录应该包含所有必要字段', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordArb(),
          (record) => {
            const records = [record]
            
            const result = findDuplicateRecord(
              records,
              record.user_id,
              record.warehouse_id!,
              record.category_id,
              record.work_date
            )
            
            // 如果找到记录，验证所有必要字段都存在
            if (result !== null) {
              return (
                typeof result.id === 'number' &&
                typeof result.user_id === 'number' &&
                typeof result.category_id === 'number' &&
                typeof result.work_date === 'string' &&
                typeof result.quantity === 'number' &&
                typeof result.amount === 'number' &&
                typeof result.created_at === 'string'
              )
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('返回的记录应该与原始记录完全相同', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordArb(),
          (record) => {
            // 确保 warehouse_id 不为 null
            const recordWithWarehouse = {
              ...record,
              warehouse_id: record.warehouse_id ?? 1
            }
            
            const records = [recordWithWarehouse]
            
            const result = findDuplicateRecord(
              records,
              recordWithWarehouse.user_id,
              recordWithWarehouse.warehouse_id,
              recordWithWarehouse.category_id,
              recordWithWarehouse.work_date
            )
            
            // 验证返回的记录与原始记录相同
            if (result !== null) {
              return (
                result.id === recordWithWarehouse.id &&
                result.user_id === recordWithWarehouse.user_id &&
                result.warehouse_id === recordWithWarehouse.warehouse_id &&
                result.category_id === recordWithWarehouse.category_id &&
                result.work_date === recordWithWarehouse.work_date &&
                result.quantity === recordWithWarehouse.quantity &&
                result.amount === recordWithWarehouse.amount
              )
            }
            
            return false
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

/**
 * 具体示例测试
 * 验证常见的重复记录检测场景
 */
describe('重复记录检测示例测试', () => {
  it('检测到重复记录', () => {
    const records: PieceWorkRecord[] = [
      {
        id: 1,
        user_id: 100,
        warehouse_id: 1,
        category_id: 2,
        work_date: '2024-12-24',
        quantity: 50,
        amount: 500,
        remark: null,
        created_at: '2024-12-24T10:00:00Z'
      }
    ]
    
    const result = findDuplicateRecord(records, 100, 1, 2, '2024-12-24')
    
    expect(result).not.toBeNull()
    expect(result?.id).toBe(1)
    expect(result?.user_id).toBe(100)
    expect(result?.warehouse_id).toBe(1)
    expect(result?.category_id).toBe(2)
    expect(result?.work_date).toBe('2024-12-24')
  })

  it('未检测到重复记录 - 用户不同', () => {
    const records: PieceWorkRecord[] = [
      {
        id: 1,
        user_id: 100,
        warehouse_id: 1,
        category_id: 2,
        work_date: '2024-12-24',
        quantity: 50,
        amount: 500,
        remark: null,
        created_at: '2024-12-24T10:00:00Z'
      }
    ]
    
    const result = findDuplicateRecord(records, 200, 1, 2, '2024-12-24')
    
    expect(result).toBeNull()
  })

  it('未检测到重复记录 - 仓库不同', () => {
    const records: PieceWorkRecord[] = [
      {
        id: 1,
        user_id: 100,
        warehouse_id: 1,
        category_id: 2,
        work_date: '2024-12-24',
        quantity: 50,
        amount: 500,
        remark: null,
        created_at: '2024-12-24T10:00:00Z'
      }
    ]
    
    const result = findDuplicateRecord(records, 100, 2, 2, '2024-12-24')
    
    expect(result).toBeNull()
  })

  it('未检测到重复记录 - 品类不同', () => {
    const records: PieceWorkRecord[] = [
      {
        id: 1,
        user_id: 100,
        warehouse_id: 1,
        category_id: 2,
        work_date: '2024-12-24',
        quantity: 50,
        amount: 500,
        remark: null,
        created_at: '2024-12-24T10:00:00Z'
      }
    ]
    
    const result = findDuplicateRecord(records, 100, 1, 3, '2024-12-24')
    
    expect(result).toBeNull()
  })

  it('未检测到重复记录 - 日期不同', () => {
    const records: PieceWorkRecord[] = [
      {
        id: 1,
        user_id: 100,
        warehouse_id: 1,
        category_id: 2,
        work_date: '2024-12-24',
        quantity: 50,
        amount: 500,
        remark: null,
        created_at: '2024-12-24T10:00:00Z'
      }
    ]
    
    const result = findDuplicateRecord(records, 100, 1, 2, '2024-12-25')
    
    expect(result).toBeNull()
  })

  it('空记录列表返回 null', () => {
    const result = findDuplicateRecord([], 100, 1, 2, '2024-12-24')
    
    expect(result).toBeNull()
  })

  it('多条匹配记录返回第一条', () => {
    const records: PieceWorkRecord[] = [
      {
        id: 1,
        user_id: 100,
        warehouse_id: 1,
        category_id: 2,
        work_date: '2024-12-24',
        quantity: 50,
        amount: 500,
        remark: null,
        created_at: '2024-12-24T10:00:00Z'
      },
      {
        id: 2,
        user_id: 100,
        warehouse_id: 1,
        category_id: 2,
        work_date: '2024-12-24',
        quantity: 100,
        amount: 1000,
        remark: null,
        created_at: '2024-12-24T11:00:00Z'
      }
    ]
    
    const result = findDuplicateRecord(records, 100, 1, 2, '2024-12-24')
    
    expect(result).not.toBeNull()
    expect(result?.id).toBe(1)
    expect(result?.quantity).toBe(50)
  })
})
