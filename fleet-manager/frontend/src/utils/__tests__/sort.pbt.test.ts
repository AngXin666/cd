/**
 * 排序功能属性测试
 * 使用 fast-check 进行属性测试，验证排序功能的正确性
 * 
 * @module utils/__tests__/sort.pbt.test
 * 
 * **Feature: manager-page-alignment, Property 6: 排序功能正确性**
 * **Validates: Requirements 4.2, 4.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  sortRecords,
  sortRecordsMultiple,
  toggleSortOrder,
  createSortConfig,
  isSameSortConfig,
  getSortOrderLabel,
  getSortOrderIcon,
  type SortField,
  type SortOrder,
  type SortConfig,
  type SortableRecord,
} from '../sort'

// ==================== 生成器定义 ====================

/**
 * 生成有效的金额（非负数）
 */
const validAmountArbitrary = fc.float({ min: 0, max: 100000, noNaN: true })

/**
 * 生成有效的数量（非负整数）
 */
const validQuantityArbitrary = fc.integer({ min: 0, max: 10000 })

/**
 * 生成有效的日期字符串（YYYY-MM-DD 格式）
 */
const validDateArbitrary = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
}).map(date => date.toISOString().split('T')[0])

/**
 * 生成有效的可排序记录
 */
const sortableRecordArbitrary: fc.Arbitrary<SortableRecord> = fc.record({
  amount: validAmountArbitrary,
  quantity: validQuantityArbitrary,
  work_date: validDateArbitrary,
})

/**
 * 生成可排序记录列表（0-50条记录）
 */
const sortableRecordListArbitrary = fc.array(sortableRecordArbitrary, { minLength: 0, maxLength: 50 })

/**
 * 生成排序字段
 */
const sortFieldArbitrary: fc.Arbitrary<SortField> = fc.constantFrom('amount', 'quantity', 'date')

/**
 * 生成排序方向
 */
const sortOrderArbitrary: fc.Arbitrary<SortOrder> = fc.constantFrom('asc', 'desc')

/**
 * 生成排序配置
 */
const sortConfigArbitrary: fc.Arbitrary<SortConfig> = fc.record({
  field: sortFieldArbitrary,
  order: sortOrderArbitrary,
})

// ==================== 辅助函数 ====================

/**
 * 获取记录的排序值
 * 
 * @param record - 记录对象
 * @param field - 排序字段
 * @returns 排序值
 */
function getRecordValue(record: SortableRecord, field: SortField): number | string {
  switch (field) {
    case 'amount':
      return record.amount ?? 0
    case 'quantity':
      return record.quantity ?? 0
    case 'date':
      return record.work_date ?? ''
    default:
      return 0
  }
}

/**
 * 检查列表是否按指定方式排序
 * 
 * @param records - 记录列表
 * @param config - 排序配置
 * @returns 是否正确排序
 */
function isSortedCorrectly(records: SortableRecord[], config: SortConfig): boolean {
  if (records.length <= 1) {
    return true
  }
  
  for (let i = 0; i < records.length - 1; i++) {
    const currentValue = getRecordValue(records[i], config.field)
    const nextValue = getRecordValue(records[i + 1], config.field)
    
    // 比较相邻元素
    if (typeof currentValue === 'number' && typeof nextValue === 'number') {
      if (config.order === 'asc') {
        // 升序：当前值应该 <= 下一个值
        if (currentValue > nextValue) {
          return false
        }
      } else {
        // 降序：当前值应该 >= 下一个值
        if (currentValue < nextValue) {
          return false
        }
      }
    } else if (typeof currentValue === 'string' && typeof nextValue === 'string') {
      const comparison = currentValue.localeCompare(nextValue)
      if (config.order === 'asc') {
        // 升序：当前值应该 <= 下一个值
        if (comparison > 0) {
          return false
        }
      } else {
        // 降序：当前值应该 >= 下一个值
        if (comparison < 0) {
          return false
        }
      }
    }
  }
  
  return true
}

// ==================== 测试套件 ====================

describe('排序功能属性测试', () => {
  describe('sortRecords - 单字段排序', () => {
    /**
     * **Feature: manager-page-alignment, Property 6: 排序功能正确性**
     * **Validates: Requirements 4.2**
     * 
     * 属性：对于任意记录列表和排序配置，排序后的列表应满足指定的排序顺序
     */
    it('Property 6.1: 排序后列表满足指定排序顺序', () => {
      fc.assert(
        fc.property(sortableRecordListArbitrary, sortConfigArbitrary, (records, config) => {
          const sorted = sortRecords(records, config)
          
          // 验证排序结果满足指定顺序
          expect(isSortedCorrectly(sorted, config)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: manager-page-alignment, Property 6: 排序功能正确性**
     * **Validates: Requirements 4.2**
     * 
     * 属性：排序不应改变列表长度（不丢失或增加元素）
     */
    it('Property 6.2: 排序不改变列表长度', () => {
      fc.assert(
        fc.property(sortableRecordListArbitrary, sortConfigArbitrary, (records, config) => {
          const sorted = sortRecords(records, config)
          
          // 验证长度不变
          expect(sorted.length).toBe(records.length)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: manager-page-alignment, Property 6: 排序功能正确性**
     * **Validates: Requirements 4.2**
     * 
     * 属性：排序不应修改原数组（返回新数组）
     */
    it('Property 6.3: 排序不修改原数组', () => {
      fc.assert(
        fc.property(sortableRecordListArbitrary, sortConfigArbitrary, (records, config) => {
          // 保存原数组的副本
          const originalRecords = JSON.stringify(records)
          
          // 执行排序
          sortRecords(records, config)
          
          // 验证原数组未被修改
          expect(JSON.stringify(records)).toBe(originalRecords)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: manager-page-alignment, Property 6: 排序功能正确性**
     * **Validates: Requirements 4.2**
     * 
     * 属性：排序后的列表应包含原列表的所有元素（元素守恒）
     */
    it('Property 6.4: 排序后包含所有原始元素', () => {
      fc.assert(
        fc.property(sortableRecordListArbitrary, sortConfigArbitrary, (records, config) => {
          const sorted = sortRecords(records, config)
          
          // 验证每个原始元素都在排序后的列表中
          for (const record of records) {
            const found = sorted.some(
              r => r.amount === record.amount && 
                   r.quantity === record.quantity && 
                   r.work_date === record.work_date
            )
            expect(found).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('toggleSortOrder - 排序方向切换', () => {
    /**
     * **Feature: manager-page-alignment, Property 6: 排序功能正确性**
     * **Validates: Requirements 4.3**
     * 
     * 属性：切换排序方向应该反转当前方向
     */
    it('Property 6.5: 切换排序方向正确反转', () => {
      fc.assert(
        fc.property(sortOrderArbitrary, (order) => {
          const toggled = toggleSortOrder(order)
          
          // 验证方向被反转
          if (order === 'asc') {
            expect(toggled).toBe('desc')
          } else {
            expect(toggled).toBe('asc')
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: manager-page-alignment, Property 6: 排序功能正确性**
     * **Validates: Requirements 4.3**
     * 
     * 属性：切换两次应该回到原始方向（幂等性）
     */
    it('Property 6.6: 切换两次回到原始方向', () => {
      fc.assert(
        fc.property(sortOrderArbitrary, (order) => {
          const toggledOnce = toggleSortOrder(order)
          const toggledTwice = toggleSortOrder(toggledOnce)
          
          // 验证切换两次回到原始方向
          expect(toggledTwice).toBe(order)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('升序/降序排序对比', () => {
    /**
     * **Feature: manager-page-alignment, Property 6: 排序功能正确性**
     * **Validates: Requirements 4.3**
     * 
     * 属性：升序和降序排序结果应该互为反转
     */
    it('Property 6.7: 升序和降序结果互为反转', () => {
      fc.assert(
        fc.property(sortableRecordListArbitrary, sortFieldArbitrary, (records, field) => {
          // 跳过空列表
          if (records.length === 0) {
            return true
          }
          
          const ascSorted = sortRecords(records, { field, order: 'asc' })
          const descSorted = sortRecords(records, { field, order: 'desc' })
          
          // 验证降序结果是升序结果的反转
          const reversedAsc = [...ascSorted].reverse()
          
          // 比较两个数组（考虑相等元素的顺序可能不同）
          // 只验证首尾元素
          if (records.length >= 2) {
            const ascFirst = getRecordValue(ascSorted[0], field)
            const descLast = getRecordValue(descSorted[descSorted.length - 1], field)
            const ascLast = getRecordValue(ascSorted[ascSorted.length - 1], field)
            const descFirst = getRecordValue(descSorted[0], field)
            
            // 升序的第一个应该等于降序的最后一个（最小值）
            expect(ascFirst).toBe(descLast)
            // 升序的最后一个应该等于降序的第一个（最大值）
            expect(ascLast).toBe(descFirst)
          }
          
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('sortRecordsMultiple - 多字段排序', () => {
    /**
     * 属性：多字段排序应该按配置顺序依次排序
     */
    it('Property: 多字段排序按配置顺序执行', () => {
      fc.assert(
        fc.property(
          sortableRecordListArbitrary,
          fc.array(sortConfigArbitrary, { minLength: 1, maxLength: 3 }),
          (records, configs) => {
            const sorted = sortRecordsMultiple(records, configs)
            
            // 验证长度不变
            expect(sorted.length).toBe(records.length)
            
            // 验证第一个排序字段的顺序
            if (configs.length > 0) {
              expect(isSortedCorrectly(sorted, configs[0])).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性：空配置数组应该返回原数组的副本
     */
    it('Property: 空配置返回原数组副本', () => {
      fc.assert(
        fc.property(sortableRecordListArbitrary, (records) => {
          const sorted = sortRecordsMultiple(records, [])
          
          // 验证长度相同
          expect(sorted.length).toBe(records.length)
          
          // 验证是新数组
          expect(sorted).not.toBe(records)
          
          // 验证内容相同
          for (let i = 0; i < records.length; i++) {
            expect(sorted[i]).toEqual(records[i])
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('createSortConfig - 创建排序配置', () => {
    /**
     * 属性：创建的配置应该包含指定的字段和方向
     */
    it('Property: 创建配置包含正确的字段和方向', () => {
      fc.assert(
        fc.property(sortFieldArbitrary, sortOrderArbitrary, (field, order) => {
          const config = createSortConfig(field, order)
          
          expect(config.field).toBe(field)
          expect(config.order).toBe(order)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性：默认方向应该是降序
     */
    it('Property: 默认方向为降序', () => {
      fc.assert(
        fc.property(sortFieldArbitrary, (field) => {
          const config = createSortConfig(field)
          
          expect(config.order).toBe('desc')
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('isSameSortConfig - 配置比较', () => {
    /**
     * 属性：相同配置应该返回 true
     */
    it('Property: 相同配置返回 true', () => {
      fc.assert(
        fc.property(sortConfigArbitrary, (config) => {
          const same = isSameSortConfig(config, { ...config })
          
          expect(same).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性：不同字段的配置应该返回 false
     */
    it('Property: 不同字段返回 false', () => {
      fc.assert(
        fc.property(sortConfigArbitrary, sortFieldArbitrary, (config, differentField) => {
          // 只有当字段不同时才测试
          if (config.field === differentField) {
            return true
          }
          
          const different = isSameSortConfig(config, { ...config, field: differentField })
          
          expect(different).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性：不同方向的配置应该返回 false
     */
    it('Property: 不同方向返回 false', () => {
      fc.assert(
        fc.property(sortConfigArbitrary, (config) => {
          const oppositeOrder = toggleSortOrder(config.order)
          const different = isSameSortConfig(config, { ...config, order: oppositeOrder })
          
          expect(different).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('getSortOrderLabel - 排序方向标签', () => {
    /**
     * 属性：升序应该返回"升序"
     */
    it('Property: 升序返回正确标签', () => {
      const label = getSortOrderLabel('asc')
      expect(label).toBe('升序')
    })

    /**
     * 属性：降序应该返回"降序"
     */
    it('Property: 降序返回正确标签', () => {
      const label = getSortOrderLabel('desc')
      expect(label).toBe('降序')
    })
  })

  describe('getSortOrderIcon - 排序方向图标', () => {
    /**
     * 属性：升序应该返回向上箭头
     */
    it('Property: 升序返回向上箭头', () => {
      const icon = getSortOrderIcon('asc')
      expect(icon).toBe('↑')
    })

    /**
     * 属性：降序应该返回向下箭头
     */
    it('Property: 降序返回向下箭头', () => {
      const icon = getSortOrderIcon('desc')
      expect(icon).toBe('↓')
    })
  })

  describe('边界条件测试', () => {
    /**
     * 边界测试：空数组排序
     */
    it('边界：空数组排序返回空数组', () => {
      const sorted = sortRecords([], { field: 'amount', order: 'asc' })
      expect(sorted).toEqual([])
      expect(sorted).not.toBe([]) // 应该是新数组
    })

    /**
     * 边界测试：单元素数组排序
     */
    it('边界：单元素数组排序返回相同元素', () => {
      const record: SortableRecord = { amount: 100, quantity: 10, work_date: '2024-01-01' }
      const sorted = sortRecords([record], { field: 'amount', order: 'asc' })
      
      expect(sorted.length).toBe(1)
      expect(sorted[0]).toEqual(record)
    })

    /**
     * 边界测试：所有元素相同时排序
     */
    it('边界：所有元素相同时保持稳定', () => {
      const records: SortableRecord[] = [
        { amount: 100, quantity: 10, work_date: '2024-01-01' },
        { amount: 100, quantity: 10, work_date: '2024-01-01' },
        { amount: 100, quantity: 10, work_date: '2024-01-01' },
      ]
      
      const sorted = sortRecords(records, { field: 'amount', order: 'asc' })
      
      expect(sorted.length).toBe(3)
      // 所有元素应该相等
      for (const record of sorted) {
        expect(record.amount).toBe(100)
      }
    })

    /**
     * 边界测试：金额为 0 的记录
     */
    it('边界：金额为 0 的记录正确排序', () => {
      const records: SortableRecord[] = [
        { amount: 100, quantity: 10, work_date: '2024-01-01' },
        { amount: 0, quantity: 5, work_date: '2024-01-02' },
        { amount: 50, quantity: 8, work_date: '2024-01-03' },
      ]
      
      const sortedAsc = sortRecords(records, { field: 'amount', order: 'asc' })
      expect(sortedAsc[0].amount).toBe(0)
      expect(sortedAsc[2].amount).toBe(100)
      
      const sortedDesc = sortRecords(records, { field: 'amount', order: 'desc' })
      expect(sortedDesc[0].amount).toBe(100)
      expect(sortedDesc[2].amount).toBe(0)
    })

    /**
     * 边界测试：日期排序
     */
    it('边界：日期排序正确', () => {
      const records: SortableRecord[] = [
        { amount: 100, quantity: 10, work_date: '2024-01-15' },
        { amount: 200, quantity: 5, work_date: '2024-01-01' },
        { amount: 50, quantity: 8, work_date: '2024-01-31' },
      ]
      
      const sortedAsc = sortRecords(records, { field: 'date', order: 'asc' })
      expect(sortedAsc[0].work_date).toBe('2024-01-01')
      expect(sortedAsc[2].work_date).toBe('2024-01-31')
      
      const sortedDesc = sortRecords(records, { field: 'date', order: 'desc' })
      expect(sortedDesc[0].work_date).toBe('2024-01-31')
      expect(sortedDesc[2].work_date).toBe('2024-01-01')
    })
  })
})
