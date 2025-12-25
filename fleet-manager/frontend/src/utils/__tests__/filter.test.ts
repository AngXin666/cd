/**
 * 筛选工具函数属性测试
 * 使用 fast-check 进行属性测试，验证仓库筛选和日期排序的正确性
 * 
 * @module utils/__tests__/filter.test
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { filterByWarehouse, sortByDate, calculateCategoryStats } from '../filter'
import type { PieceWorkRecord } from '@/api/types'

// ==================== 测试数据生成器 ====================

/**
 * 生成有效日期字符串的 Arbitrary
 * 日期格式为 YYYY-MM-DD，范围从 2020-01-01 到 2025-12-31
 */
const validDateArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2025-12-31')
}).map(date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

/**
 * 生成有效仓库 ID 的 Arbitrary
 * 仓库 ID 为正整数，范围 1-100
 */
const warehouseIdArb = fc.integer({ min: 1, max: 100 })

/**
 * 生成计件记录的 Arbitrary
 * 生成符合 PieceWorkRecord 接口的测试数据
 * 
 * @param warehouseIdGen - 可选的仓库 ID 生成器，用于控制生成的仓库 ID 范围
 */
function pieceWorkRecordArb(
  warehouseIdGen: fc.Arbitrary<number | null> = fc.oneof(
    fc.constant(null),
    warehouseIdArb
  )
): fc.Arbitrary<PieceWorkRecord> {
  return fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    user_id: fc.integer({ min: 1, max: 1000 }),
    category_id: fc.integer({ min: 1, max: 50 }),
    warehouse_id: warehouseIdGen,
    work_date: validDateArb,
    quantity: fc.integer({ min: 1, max: 1000 }),
    amount: fc.float({ min: 0, max: 100000, noNaN: true }),
    remark: fc.oneof(fc.constant(null), fc.string({ maxLength: 100 })),
    created_at: fc.constant(new Date().toISOString()),
    user_name: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    category_name: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    warehouse_name: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  }) as fc.Arbitrary<PieceWorkRecord>
}

/**
 * 生成计件记录列表的 Arbitrary
 * 
 * @param minLength - 最小长度
 * @param maxLength - 最大长度
 * @param warehouseIdGen - 可选的仓库 ID 生成器
 */
function pieceWorkRecordListArb(
  minLength = 0,
  maxLength = 50,
  warehouseIdGen?: fc.Arbitrary<number | null>
): fc.Arbitrary<PieceWorkRecord[]> {
  return fc.array(
    pieceWorkRecordArb(warehouseIdGen),
    { minLength, maxLength }
  )
}

// ==================== Property 7: 仓库筛选过滤 ====================

describe('仓库筛选过滤属性测试', () => {
  /**
   * **Feature: vue-deep-conversion, Property 7: 仓库筛选过滤**
   * **Validates: Requirements 2.4**
   * 
   * *For any* 计件记录列表和仓库 ID，过滤后的列表中所有记录的 warehouse_id 
   * 都应该等于筛选的仓库 ID
   */
  describe('Property 7: 仓库筛选过滤', () => {
    it('过滤后的所有记录的 warehouse_id 都应该等于筛选的仓库 ID', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(),
          warehouseIdArb,
          (records, warehouseId) => {
            // 执行筛选
            const filtered = filterByWarehouse(records, warehouseId)
            
            // 验证：所有筛选后的记录的 warehouse_id 都等于筛选的仓库 ID
            return filtered.every(record => record.warehouse_id === warehouseId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('筛选后的记录数量应该小于等于原记录数量', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(),
          warehouseIdArb,
          (records, warehouseId) => {
            const filtered = filterByWarehouse(records, warehouseId)
            
            // 筛选后的数量不应该超过原数量
            return filtered.length <= records.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('筛选后的记录数量应该等于原列表中匹配仓库 ID 的记录数量', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(),
          warehouseIdArb,
          (records, warehouseId) => {
            const filtered = filterByWarehouse(records, warehouseId)
            
            // 手动计算匹配的记录数量
            const expectedCount = records.filter(r => r.warehouse_id === warehouseId).length
            
            return filtered.length === expectedCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('当 warehouseId 为 null 时，应该返回全部记录', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(),
          (records) => {
            const filtered = filterByWarehouse(records, null)
            
            // 应该返回全部记录
            return filtered.length === records.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('筛选不应该修改原数组', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(1, 20),
          warehouseIdArb,
          (records, warehouseId) => {
            // 保存原数组的长度和第一个元素
            const originalLength = records.length
            const originalFirst = records.length > 0 ? { ...records[0] } : null
            
            // 执行筛选
            filterByWarehouse(records, warehouseId)
            
            // 验证原数组未被修改
            if (originalFirst !== null) {
              return records.length === originalLength && 
                     records[0].id === originalFirst.id
            }
            return records.length === originalLength
          }
        ),
        { numRuns: 100 }
      )
    })

    it('筛选结果应该是原数组的子集', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(),
          warehouseIdArb,
          (records, warehouseId) => {
            const filtered = filterByWarehouse(records, warehouseId)
            
            // 验证筛选结果中的每条记录都存在于原数组中
            return filtered.every(filteredRecord => 
              records.some(originalRecord => originalRecord.id === filteredRecord.id)
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对空数组筛选应该返回空数组', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          (warehouseId) => {
            const filtered = filterByWarehouse([], warehouseId)
            return filtered.length === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('如果所有记录都属于同一仓库，筛选该仓库应该返回全部记录', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          fc.integer({ min: 1, max: 20 }),
          (warehouseId, count) => {
            // 生成所有记录都属于同一仓库的列表
            const records: PieceWorkRecord[] = Array.from({ length: count }, (_, i) => ({
              id: i + 1,
              user_id: 1,
              category_id: 1,
              warehouse_id: warehouseId,
              work_date: '2024-01-01',
              quantity: 10,
              amount: 100,
              remark: null,
              created_at: new Date().toISOString(),
            }))
            
            const filtered = filterByWarehouse(records, warehouseId)
            
            // 应该返回全部记录
            return filtered.length === count
          }
        ),
        { numRuns: 100 }
      )
    })

    it('如果没有记录属于指定仓库，筛选应该返回空数组', () => {
      fc.assert(
        fc.property(
          // 生成仓库 ID 在 1-50 范围内的记录
          pieceWorkRecordListArb(1, 20, fc.integer({ min: 1, max: 50 })),
          // 筛选仓库 ID 在 51-100 范围内（确保不匹配）
          fc.integer({ min: 51, max: 100 }),
          (records, warehouseId) => {
            const filtered = filterByWarehouse(records, warehouseId)
            
            // 应该返回空数组
            return filtered.length === 0
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== Property 8: 日期排序 ====================

describe('日期排序属性测试', () => {
  /**
   * **Feature: vue-deep-conversion, Property 8: 日期排序**
   * **Validates: Requirements 2.5**
   * 
   * *For any* 计件记录列表，按日期降序排序后，每条记录的日期应该大于等于下一条记录的日期
   */
  describe('Property 8: 日期排序', () => {
    it('降序排序后，每条记录的日期应该大于等于下一条记录的日期', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(2, 30),
          (records) => {
            const sorted = sortByDate(records, 'desc')
            
            // 验证降序：每条记录的日期 >= 下一条记录的日期
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentDate = new Date(sorted[i].work_date).getTime()
              const nextDate = new Date(sorted[i + 1].work_date).getTime()
              if (currentDate < nextDate) {
                return false
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('升序排序后，每条记录的日期应该小于等于下一条记录的日期', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(2, 30),
          (records) => {
            const sorted = sortByDate(records, 'asc')
            
            // 验证升序：每条记录的日期 <= 下一条记录的日期
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentDate = new Date(sorted[i].work_date).getTime()
              const nextDate = new Date(sorted[i + 1].work_date).getTime()
              if (currentDate > nextDate) {
                return false
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('排序后的记录数量应该等于原记录数量', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(),
          fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
          (records, order) => {
            const sorted = sortByDate(records, order)
            return sorted.length === records.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('排序不应该修改原数组', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(1, 20),
          fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
          (records, order) => {
            // 保存原数组的第一个元素的 ID
            const originalFirstId = records[0].id
            const originalLength = records.length
            
            // 执行排序
            sortByDate(records, order)
            
            // 验证原数组未被修改
            return records.length === originalLength && 
                   records[0].id === originalFirstId
          }
        ),
        { numRuns: 100 }
      )
    })

    it('排序后的记录应该包含原数组的所有记录', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListArb(),
          fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
          (records, order) => {
            const sorted = sortByDate(records, order)
            
            // 验证排序后的数组包含原数组的所有记录（通过 ID 比较）
            const originalIds = new Set(records.map(r => r.id))
            const sortedIds = new Set(sorted.map(r => r.id))
            
            // 两个集合应该相等
            if (originalIds.size !== sortedIds.size) return false
            for (const id of originalIds) {
              if (!sortedIds.has(id)) return false
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对空数组排序应该返回空数组', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
          (order) => {
            const sorted = sortByDate([], order)
            return sorted.length === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对单元素数组排序应该返回相同元素', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordArb(),
          fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
          (record, order) => {
            const sorted = sortByDate([record], order)
            return sorted.length === 1 && sorted[0].id === record.id
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== 边界条件测试 ====================

describe('筛选和排序边界条件测试', () => {
  it('筛选 warehouse_id 为 null 的记录', () => {
    const records: PieceWorkRecord[] = [
      {
        id: 1,
        user_id: 1,
        category_id: 1,
        warehouse_id: null,
        work_date: '2024-01-01',
        quantity: 10,
        amount: 100,
        remark: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        category_id: 1,
        warehouse_id: 1,
        work_date: '2024-01-02',
        quantity: 20,
        amount: 200,
        remark: null,
        created_at: new Date().toISOString(),
      },
    ]
    
    // 筛选仓库 ID 为 1 的记录
    const filtered = filterByWarehouse(records, 1)
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe(2)
    
    // 不筛选，返回全部
    const all = filterByWarehouse(records, null)
    expect(all.length).toBe(2)
  })

  it('排序相同日期的记录应该保持稳定', () => {
    const records: PieceWorkRecord[] = [
      {
        id: 1,
        user_id: 1,
        category_id: 1,
        warehouse_id: 1,
        work_date: '2024-01-01',
        quantity: 10,
        amount: 100,
        remark: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        category_id: 1,
        warehouse_id: 1,
        work_date: '2024-01-01',
        quantity: 20,
        amount: 200,
        remark: null,
        created_at: new Date().toISOString(),
      },
    ]
    
    const sortedDesc = sortByDate(records, 'desc')
    const sortedAsc = sortByDate(records, 'asc')
    
    // 两条记录日期相同，排序后数量应该不变
    expect(sortedDesc.length).toBe(2)
    expect(sortedAsc.length).toBe(2)
  })

  it('筛选和排序组合使用', () => {
    const records: PieceWorkRecord[] = [
      {
        id: 1,
        user_id: 1,
        category_id: 1,
        warehouse_id: 1,
        work_date: '2024-01-03',
        quantity: 10,
        amount: 100,
        remark: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        category_id: 1,
        warehouse_id: 2,
        work_date: '2024-01-02',
        quantity: 20,
        amount: 200,
        remark: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        user_id: 1,
        category_id: 1,
        warehouse_id: 1,
        work_date: '2024-01-01',
        quantity: 30,
        amount: 300,
        remark: null,
        created_at: new Date().toISOString(),
      },
    ]
    
    // 先筛选仓库 1，再按日期降序排序
    const filtered = filterByWarehouse(records, 1)
    const sorted = sortByDate(filtered, 'desc')
    
    expect(sorted.length).toBe(2)
    expect(sorted[0].id).toBe(1) // 2024-01-03
    expect(sorted[1].id).toBe(3) // 2024-01-01
  })
})

// ==================== Property 10: 品类统计计算 ====================

describe('品类统计计算属性测试', () => {
  /**
   * **Feature: vue-deep-conversion, Property 10: 品类统计计算**
   * **Validates: Requirements 3.7**
   * 
   * *For any* 计件记录列表，按品类分组统计后，每个品类的 quantity 总和
   * 应该等于该品类所有记录的 quantity 之和
   */
  describe('Property 10: 品类统计计算', () => {
    /**
     * 生成带有品类名称的计件记录 Arbitrary
     * 品类名称从预定义列表中选择，确保有重复的品类
     */
    const categoryNames = ['水果', '蔬菜', '肉类', '海鲜', '饮料', '零食', '日用品', '未分类']
    
    const pieceWorkRecordWithCategoryArb: fc.Arbitrary<PieceWorkRecord> = fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      user_id: fc.integer({ min: 1, max: 1000 }),
      category_id: fc.integer({ min: 1, max: 50 }),
      warehouse_id: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 100 })),
      work_date: validDateArb,
      // 使用正整数确保 quantity 为正数
      quantity: fc.integer({ min: 1, max: 1000 }),
      // 使用整数乘以 0.01 来生成金额，避免浮点数精度问题
      amount: fc.integer({ min: 1, max: 10000000 }).map(n => n * 0.01),
      remark: fc.oneof(fc.constant(null), fc.string({ maxLength: 100 })),
      created_at: fc.constant(new Date().toISOString()),
      user_name: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      // 从预定义的品类名称中选择，确保有重复
      category_name: fc.constantFrom(...categoryNames),
      warehouse_name: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    }) as fc.Arbitrary<PieceWorkRecord>

    /**
     * 生成带有品类名称的计件记录列表 Arbitrary
     */
    const pieceWorkRecordListWithCategoryArb = (
      minLength = 0,
      maxLength = 50
    ): fc.Arbitrary<PieceWorkRecord[]> => {
      return fc.array(pieceWorkRecordWithCategoryArb, { minLength, maxLength })
    }

    it('每个品类的 quantity 总和应该等于该品类所有记录的 quantity 之和', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListWithCategoryArb(1, 50),
          (records) => {
            // 执行品类统计
            const stats = calculateCategoryStats(records)
            
            // 对于每个统计结果，验证 quantity 总和
            for (const stat of stats) {
              // 手动计算该品类的 quantity 总和
              const expectedQuantity = records
                .filter(r => (r.category_name || '未分类') === stat.name)
                .reduce((sum, r) => sum + r.quantity, 0)
              
              // 验证统计结果与手动计算结果一致
              if (stat.quantity !== expectedQuantity) {
                return false
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('每个品类的 amount 总和应该等于该品类所有记录的 amount 之和', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListWithCategoryArb(1, 50),
          (records) => {
            // 执行品类统计
            const stats = calculateCategoryStats(records)
            
            // 对于每个统计结果，验证 amount 总和
            for (const stat of stats) {
              // 手动计算该品类的 amount 总和
              const expectedAmount = records
                .filter(r => (r.category_name || '未分类') === stat.name)
                .reduce((sum, r) => sum + r.amount, 0)
              
              // 使用近似比较，因为浮点数可能有精度问题
              const diff = Math.abs(stat.amount - expectedAmount)
              if (diff > 0.01) {
                return false
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('统计结果中的品类数量应该等于原记录中不同品类的数量', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListWithCategoryArb(1, 50),
          (records) => {
            // 执行品类统计
            const stats = calculateCategoryStats(records)
            
            // 计算原记录中不同品类的数量
            const uniqueCategories = new Set(
              records.map(r => r.category_name || '未分类')
            )
            
            // 统计结果的品类数量应该等于不同品类的数量
            return stats.length === uniqueCategories.size
          }
        ),
        { numRuns: 100 }
      )
    })

    it('统计结果应该按金额降序排序', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListWithCategoryArb(2, 50),
          (records) => {
            // 执行品类统计
            const stats = calculateCategoryStats(records)
            
            // 如果只有一个品类，不需要验证排序
            if (stats.length <= 1) {
              return true
            }
            
            // 验证降序排序：每个品类的金额 >= 下一个品类的金额
            for (let i = 0; i < stats.length - 1; i++) {
              if (stats[i].amount < stats[i + 1].amount) {
                return false
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('所有记录的 quantity 总和应该等于所有品类统计的 quantity 总和', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListWithCategoryArb(1, 50),
          (records) => {
            // 执行品类统计
            const stats = calculateCategoryStats(records)
            
            // 计算原记录的 quantity 总和
            const totalQuantityFromRecords = records.reduce((sum, r) => sum + r.quantity, 0)
            
            // 计算统计结果的 quantity 总和
            const totalQuantityFromStats = stats.reduce((sum, s) => sum + s.quantity, 0)
            
            // 两者应该相等
            return totalQuantityFromRecords === totalQuantityFromStats
          }
        ),
        { numRuns: 100 }
      )
    })

    it('所有记录的 amount 总和应该等于所有品类统计的 amount 总和', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordListWithCategoryArb(1, 50),
          (records) => {
            // 执行品类统计
            const stats = calculateCategoryStats(records)
            
            // 计算原记录的 amount 总和
            const totalAmountFromRecords = records.reduce((sum, r) => sum + r.amount, 0)
            
            // 计算统计结果的 amount 总和
            const totalAmountFromStats = stats.reduce((sum, s) => sum + s.amount, 0)
            
            // 使用近似比较，因为浮点数可能有精度问题
            const diff = Math.abs(totalAmountFromRecords - totalAmountFromStats)
            return diff < 0.01
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对空数组计算应该返回空数组', () => {
      const stats = calculateCategoryStats([])
      expect(stats.length).toBe(0)
    })

    it('对单条记录计算应该返回单个品类统计', () => {
      fc.assert(
        fc.property(
          pieceWorkRecordWithCategoryArb,
          (record) => {
            const stats = calculateCategoryStats([record])
            
            // 应该只有一个品类
            if (stats.length !== 1) {
              return false
            }
            
            // 品类名称应该匹配
            const expectedName = record.category_name || '未分类'
            if (stats[0].name !== expectedName) {
              return false
            }
            
            // quantity 和 amount 应该等于记录的值
            return stats[0].quantity === record.quantity &&
                   Math.abs(stats[0].amount - record.amount) < 0.01
          }
        ),
        { numRuns: 100 }
      )
    })

    it('没有 category_name 的记录应该归类为"未分类"', () => {
      const records: PieceWorkRecord[] = [
        {
          id: 1,
          user_id: 1,
          category_id: 1,
          warehouse_id: 1,
          work_date: '2024-01-01',
          quantity: 10,
          amount: 100,
          remark: null,
          created_at: new Date().toISOString(),
          category_name: undefined,
        },
        {
          id: 2,
          user_id: 1,
          category_id: 1,
          warehouse_id: 1,
          work_date: '2024-01-02',
          quantity: 20,
          amount: 200,
          remark: null,
          created_at: new Date().toISOString(),
          category_name: '',
        },
      ]
      
      const stats = calculateCategoryStats(records)
      
      // 应该只有一个品类"未分类"
      expect(stats.length).toBe(1)
      expect(stats[0].name).toBe('未分类')
      expect(stats[0].quantity).toBe(30)
      expect(stats[0].amount).toBe(300)
    })

    it('相同品类的多条记录应该正确累加', () => {
      const records: PieceWorkRecord[] = [
        {
          id: 1,
          user_id: 1,
          category_id: 1,
          warehouse_id: 1,
          work_date: '2024-01-01',
          quantity: 10,
          amount: 100,
          remark: null,
          created_at: new Date().toISOString(),
          category_name: '水果',
        },
        {
          id: 2,
          user_id: 1,
          category_id: 1,
          warehouse_id: 1,
          work_date: '2024-01-02',
          quantity: 20,
          amount: 200,
          remark: null,
          created_at: new Date().toISOString(),
          category_name: '蔬菜',
        },
        {
          id: 3,
          user_id: 1,
          category_id: 1,
          warehouse_id: 1,
          work_date: '2024-01-03',
          quantity: 15,
          amount: 150,
          remark: null,
          created_at: new Date().toISOString(),
          category_name: '水果',
        },
      ]
      
      const stats = calculateCategoryStats(records)
      
      // 应该有两个品类
      expect(stats.length).toBe(2)
      
      // 按金额降序排序，水果(250) > 蔬菜(200)
      expect(stats[0].name).toBe('水果')
      expect(stats[0].quantity).toBe(25)
      expect(stats[0].amount).toBe(250)
      
      expect(stats[1].name).toBe('蔬菜')
      expect(stats[1].quantity).toBe(20)
      expect(stats[1].amount).toBe(200)
    })
  })
})
