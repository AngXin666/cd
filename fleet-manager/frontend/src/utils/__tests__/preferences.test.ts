/**
 * 用户偏好存储工具函数属性测试
 * 使用 fast-check 进行属性测试，验证用户偏好保存恢复的正确性
 * 
 * **Feature: vue-deep-conversion, Property 3: 用户偏好保存恢复**
 * **Validates: Requirements 1.5**
 * 
 * @module utils/__tests__/preferences.test
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import {
  saveLastWarehouse,
  getLastWarehouse,
  saveLastCategory,
  getLastCategory,
  saveLastWorkDate,
  getLastWorkDate,
  savePieceWorkFormDefaults,
  getPieceWorkFormDefaults,
  clearAllPreferences,
  saveAllPreferences,
  type WarehouseInfo,
  type CategoryInfo,
  type PieceWorkFormDefaults
} from '../preferences'

/**
 * 模拟 uni 存储 API
 * 使用内存存储来模拟 localStorage 行为
 */
const mockStorage: Map<string, string> = new Map()

// 模拟 uni 全局对象
const mockUni = {
  setStorageSync: vi.fn((key: string, value: string) => {
    mockStorage.set(key, value)
  }),
  getStorageSync: vi.fn((key: string) => {
    return mockStorage.get(key) || ''
  }),
  removeStorageSync: vi.fn((key: string) => {
    mockStorage.delete(key)
  })
}

// 将 mock 挂载到全局
;(globalThis as unknown as { uni: typeof mockUni }).uni = mockUni

/**
 * 生成有效仓库 ID 的 Arbitrary
 * 仓库 ID 应该是正整数
 */
const warehouseIdArb = fc.integer({ min: 1, max: 10000 })

/**
 * 生成有效仓库名称的 Arbitrary
 * 仓库名称应该是非空字符串
 */
const warehouseNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)

/**
 * 生成仓库信息的 Arbitrary
 */
const warehouseInfoArb: fc.Arbitrary<WarehouseInfo> = fc.record({
  id: warehouseIdArb,
  name: warehouseNameArb
})

/**
 * 生成有效品类 ID 的 Arbitrary
 * 品类 ID 应该是正整数
 */
const categoryIdArb = fc.integer({ min: 1, max: 10000 })

/**
 * 生成有效品类名称的 Arbitrary
 * 品类名称应该是非空字符串
 */
const categoryNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)

/**
 * 生成品类信息的 Arbitrary
 */
const categoryInfoArb: fc.Arbitrary<CategoryInfo> = fc.record({
  id: categoryIdArb,
  name: categoryNameArb
})

/**
 * 生成有效工作日期的 Arbitrary
 * 日期格式为 YYYY-MM-DD
 */
const workDateArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31')
}).map(date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

/**
 * 生成计件表单默认值的 Arbitrary
 */
const pieceWorkFormDefaultsArb: fc.Arbitrary<PieceWorkFormDefaults> = fc.record({
  warehouseId: warehouseIdArb,
  categoryId: categoryIdArb,
  needUpstairs: fc.boolean()
})

describe('用户偏好存储属性测试', () => {
  /**
   * 每个测试前清空模拟存储
   */
  beforeEach(() => {
    mockStorage.clear()
    vi.clearAllMocks()
  })

  /**
   * Property 3: 用户偏好保存恢复
   * *For any* 用户偏好数据，保存后再获取应该返回相同的数据
   * **Validates: Requirements 1.5**
   */
  describe('Property 3: 用户偏好保存恢复', () => {
    it('仓库信息保存后应该能正确恢复', () => {
      fc.assert(
        fc.property(warehouseInfoArb, (warehouse) => {
          // 保存仓库信息
          saveLastWarehouse(warehouse.id, warehouse.name)
          
          // 获取仓库信息
          const retrieved = getLastWarehouse()
          
          // 验证恢复的数据与原始数据相同
          return retrieved !== null &&
                 retrieved.id === warehouse.id &&
                 retrieved.name === warehouse.name
        }),
        { numRuns: 100 }
      )
    })

    it('品类信息保存后应该能正确恢复', () => {
      fc.assert(
        fc.property(categoryInfoArb, (category) => {
          // 保存品类信息
          saveLastCategory(category.id, category.name)
          
          // 获取品类信息
          const retrieved = getLastCategory()
          
          // 验证恢复的数据与原始数据相同
          return retrieved !== null &&
                 retrieved.id === category.id &&
                 retrieved.name === category.name
        }),
        { numRuns: 100 }
      )
    })

    it('工作日期保存后应该能正确恢复', () => {
      fc.assert(
        fc.property(workDateArb, (date) => {
          // 保存工作日期
          saveLastWorkDate(date)
          
          // 获取工作日期
          const retrieved = getLastWorkDate()
          
          // 验证恢复的数据与原始数据相同
          return retrieved === date
        }),
        { numRuns: 100 }
      )
    })

    it('计件表单默认值保存后应该能正确恢复', () => {
      fc.assert(
        fc.property(pieceWorkFormDefaultsArb, (defaults) => {
          // 保存计件表单默认值
          savePieceWorkFormDefaults(defaults)
          
          // 获取计件表单默认值
          const retrieved = getPieceWorkFormDefaults()
          
          // 验证恢复的数据与原始数据相同
          return retrieved !== null &&
                 retrieved.warehouseId === defaults.warehouseId &&
                 retrieved.categoryId === defaults.categoryId &&
                 retrieved.needUpstairs === defaults.needUpstairs
        }),
        { numRuns: 100 }
      )
    })

    it('批量保存后应该能正确恢复所有偏好', () => {
      fc.assert(
        fc.property(
          warehouseInfoArb,
          categoryInfoArb,
          workDateArb,
          pieceWorkFormDefaultsArb,
          (warehouse, category, workDate, formDefaults) => {
            // 批量保存所有偏好
            saveAllPreferences({
              warehouse,
              category,
              workDate,
              formDefaults
            })
            
            // 分别获取各项偏好
            const retrievedWarehouse = getLastWarehouse()
            const retrievedCategory = getLastCategory()
            const retrievedWorkDate = getLastWorkDate()
            const retrievedFormDefaults = getPieceWorkFormDefaults()
            
            // 验证所有数据都正确恢复
            return retrievedWarehouse !== null &&
                   retrievedWarehouse.id === warehouse.id &&
                   retrievedWarehouse.name === warehouse.name &&
                   retrievedCategory !== null &&
                   retrievedCategory.id === category.id &&
                   retrievedCategory.name === category.name &&
                   retrievedWorkDate === workDate &&
                   retrievedFormDefaults !== null &&
                   retrievedFormDefaults.warehouseId === formDefaults.warehouseId &&
                   retrievedFormDefaults.categoryId === formDefaults.categoryId &&
                   retrievedFormDefaults.needUpstairs === formDefaults.needUpstairs
          }
        ),
        { numRuns: 100 }
      )
    })

    it('多次保存应该覆盖之前的值', () => {
      fc.assert(
        fc.property(
          warehouseInfoArb,
          warehouseInfoArb,
          (warehouse1, warehouse2) => {
            // 第一次保存
            saveLastWarehouse(warehouse1.id, warehouse1.name)
            
            // 第二次保存（覆盖）
            saveLastWarehouse(warehouse2.id, warehouse2.name)
            
            // 获取应该返回最后保存的值
            const retrieved = getLastWarehouse()
            
            return retrieved !== null &&
                   retrieved.id === warehouse2.id &&
                   retrieved.name === warehouse2.name
          }
        ),
        { numRuns: 100 }
      )
    })

    it('清除偏好后应该返回 null', () => {
      fc.assert(
        fc.property(
          warehouseInfoArb,
          categoryInfoArb,
          workDateArb,
          pieceWorkFormDefaultsArb,
          (warehouse, category, workDate, formDefaults) => {
            // 先保存所有偏好
            saveAllPreferences({
              warehouse,
              category,
              workDate,
              formDefaults
            })
            
            // 清除所有偏好
            clearAllPreferences()
            
            // 验证所有偏好都已清除
            return getLastWarehouse() === null &&
                   getLastCategory() === null &&
                   getLastWorkDate() === null &&
                   getPieceWorkFormDefaults() === null
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 数据完整性测试
   * 验证保存和恢复过程中数据不会丢失或损坏
   */
  describe('数据完整性测试', () => {
    it('仓库 ID 应该保持数值类型', () => {
      fc.assert(
        fc.property(warehouseIdArb, warehouseNameArb, (id, name) => {
          saveLastWarehouse(id, name)
          const retrieved = getLastWarehouse()
          
          // 验证 ID 是数字类型
          return retrieved !== null && typeof retrieved.id === 'number'
        }),
        { numRuns: 100 }
      )
    })

    it('品类 ID 应该保持数值类型', () => {
      fc.assert(
        fc.property(categoryIdArb, categoryNameArb, (id, name) => {
          saveLastCategory(id, name)
          const retrieved = getLastCategory()
          
          // 验证 ID 是数字类型
          return retrieved !== null && typeof retrieved.id === 'number'
        }),
        { numRuns: 100 }
      )
    })

    it('needUpstairs 应该保持布尔类型', () => {
      fc.assert(
        fc.property(pieceWorkFormDefaultsArb, (defaults) => {
          savePieceWorkFormDefaults(defaults)
          const retrieved = getPieceWorkFormDefaults()
          
          // 验证 needUpstairs 是布尔类型
          return retrieved !== null && typeof retrieved.needUpstairs === 'boolean'
        }),
        { numRuns: 100 }
      )
    })
  })
})

/**
 * 具体示例测试
 * 验证常见的用户偏好存储场景
 */
describe('用户偏好存储示例测试', () => {
  beforeEach(() => {
    mockStorage.clear()
    vi.clearAllMocks()
  })

  it('保存和获取仓库信息', () => {
    saveLastWarehouse(1, '北京仓库')
    const warehouse = getLastWarehouse()
    
    expect(warehouse).not.toBeNull()
    expect(warehouse?.id).toBe(1)
    expect(warehouse?.name).toBe('北京仓库')
  })

  it('保存和获取品类信息', () => {
    saveLastCategory(2, '快递')
    const category = getLastCategory()
    
    expect(category).not.toBeNull()
    expect(category?.id).toBe(2)
    expect(category?.name).toBe('快递')
  })

  it('保存和获取工作日期', () => {
    saveLastWorkDate('2024-12-24')
    const date = getLastWorkDate()
    
    expect(date).toBe('2024-12-24')
  })

  it('保存和获取计件表单默认值', () => {
    const defaults: PieceWorkFormDefaults = {
      warehouseId: 1,
      categoryId: 2,
      needUpstairs: true
    }
    
    savePieceWorkFormDefaults(defaults)
    const retrieved = getPieceWorkFormDefaults()
    
    expect(retrieved).not.toBeNull()
    expect(retrieved?.warehouseId).toBe(1)
    expect(retrieved?.categoryId).toBe(2)
    expect(retrieved?.needUpstairs).toBe(true)
  })

  it('未保存时应该返回 null', () => {
    expect(getLastWarehouse()).toBeNull()
    expect(getLastCategory()).toBeNull()
    expect(getLastWorkDate()).toBeNull()
    expect(getPieceWorkFormDefaults()).toBeNull()
  })

  it('批量保存偏好', () => {
    saveAllPreferences({
      warehouse: { id: 1, name: '北京仓库' },
      category: { id: 2, name: '快递' },
      workDate: '2024-12-24',
      formDefaults: { warehouseId: 1, categoryId: 2, needUpstairs: true }
    })
    
    expect(getLastWarehouse()?.name).toBe('北京仓库')
    expect(getLastCategory()?.name).toBe('快递')
    expect(getLastWorkDate()).toBe('2024-12-24')
    expect(getPieceWorkFormDefaults()?.needUpstairs).toBe(true)
  })

  it('清除所有偏好', () => {
    // 先保存一些数据
    saveLastWarehouse(1, '北京仓库')
    saveLastCategory(2, '快递')
    
    // 清除
    clearAllPreferences()
    
    // 验证已清除
    expect(getLastWarehouse()).toBeNull()
    expect(getLastCategory()).toBeNull()
  })
})
