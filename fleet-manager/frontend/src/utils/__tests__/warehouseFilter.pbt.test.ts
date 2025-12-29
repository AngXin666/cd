/**
 * 仓库筛选属性测试
 * 使用 fast-check 进行属性测试，验证仓库筛选的正确性
 * 
 * **Feature: manager-page-alignment, Property 1: 仓库筛选正确性**
 * **Validates: Requirements 1.1, 2.2**
 * 
 * @module utils/__tests__/warehouseFilter.pbt.test
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { filterDriversByWarehouse, getDriverCountByWarehouse } from '../filter'
import type { UserWithWarehouse } from '../filter'
import { UserRole } from '@/api/types'

// ==================== 测试数据生成器 ====================

/**
 * 生成有效仓库 ID 的 Arbitrary
 * 仓库 ID 为正整数，范围 1-20
 */
const warehouseIdArb = fc.integer({ min: 1, max: 20 })

/**
 * 生成带仓库信息的司机 Arbitrary
 */
function driverWithWarehouseArb(
  warehouseIdGen: fc.Arbitrary<number | null> = fc.oneof(
    fc.constant(null),
    warehouseIdArb
  )
): fc.Arbitrary<UserWithWarehouse> {
  return fc.record({
    id: fc.integer({ min: 1, max: 1000 }),
    username: fc.string({ minLength: 3, maxLength: 10 }),
    name: fc.string({ minLength: 1, maxLength: 10 }),
    phone: fc.constant(null),
    role: fc.constant(UserRole.DRIVER),
    is_active: fc.boolean(),
    created_at: fc.constant(new Date().toISOString()),
    warehouse_id: warehouseIdGen,
  }) as fc.Arbitrary<UserWithWarehouse>
}

/**
 * 生成带仓库信息的司机列表 Arbitrary
 */
function driverListArb(
  minLength = 0,
  maxLength = 20
): fc.Arbitrary<UserWithWarehouse[]> {
  return fc.array(driverWithWarehouseArb(), { minLength, maxLength })
}

// ==================== Property 1: 仓库筛选正确性 ====================

describe('仓库筛选属性测试', () => {
  /**
   * **Feature: manager-page-alignment, Property 1: 仓库筛选正确性**
   * **Validates: Requirements 1.1, 2.2**
   * 
   * *For any* 仓库ID和司机列表，筛选后的结果应只包含属于该仓库的司机，
   * 且不遗漏任何符合条件的司机。
   */
  describe('Property 1: 仓库筛选正确性', () => {
    /**
     * 测试 1: 筛选后的所有司机的 warehouse_id 都应该等于筛选的仓库 ID
     */
    it('筛选后的所有司机的 warehouse_id 都应该等于筛选的仓库 ID', () => {
      fc.assert(
        fc.property(
          driverListArb(),
          warehouseIdArb,
          (drivers, warehouseId) => {
            const filtered = filterDriversByWarehouse(drivers, warehouseId)
            return filtered.every(driver => driver.warehouse_id === warehouseId)
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * 测试 2: 筛选不应遗漏任何符合条件的司机
     */
    it('筛选不应遗漏任何符合条件的司机', () => {
      fc.assert(
        fc.property(
          driverListArb(),
          warehouseIdArb,
          (drivers, warehouseId) => {
            const filtered = filterDriversByWarehouse(drivers, warehouseId)
            const expected = drivers.filter(d => d.warehouse_id === warehouseId)
            return filtered.length === expected.length
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * 测试 3: 当 warehouseId 为 null 时，应该返回全部司机
     * 验证 Requirements 2.3 - 全部仓库选项
     */
    it('当 warehouseId 为 null 时，应该返回全部司机', () => {
      fc.assert(
        fc.property(
          driverListArb(),
          (drivers) => {
            const filtered = filterDriversByWarehouse(drivers, null)
            return filtered.length === drivers.length
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * 测试 4: 筛选结果的 ID 集合应该等于原数组中匹配仓库的司机 ID 集合
     */
    it('筛选结果的 ID 集合应该等于原数组中匹配仓库的司机 ID 集合', () => {
      fc.assert(
        fc.property(
          driverListArb(),
          warehouseIdArb,
          (drivers, warehouseId) => {
            const filtered = filterDriversByWarehouse(drivers, warehouseId)
            const filteredIds = new Set(filtered.map(d => d.id))
            const expectedIds = new Set(
              drivers
                .filter(d => d.warehouse_id === warehouseId)
                .map(d => d.id)
            )
            if (filteredIds.size !== expectedIds.size) return false
            for (const id of filteredIds) {
              if (!expectedIds.has(id)) return false
            }
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * 测试 5: 对空数组筛选应该返回空数组
     */
    it('对空数组筛选应该返回空数组', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          (warehouseId) => {
            const filtered = filterDriversByWarehouse([], warehouseId)
            return filtered.length === 0
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  // ==================== getDriverCountByWarehouse 测试 ====================

  describe('getDriverCountByWarehouse 函数测试', () => {
    it('获取仓库司机数量应该等于筛选后的司机数量', () => {
      fc.assert(
        fc.property(
          driverListArb(),
          warehouseIdArb,
          (drivers, warehouseId) => {
            const count = getDriverCountByWarehouse(drivers, warehouseId)
            const filtered = filterDriversByWarehouse(drivers, warehouseId)
            return count === filtered.length
          }
        ),
        { numRuns: 50 }
      )
    })

    it('当 warehouseId 为 null 时，应该返回全部司机数量', () => {
      fc.assert(
        fc.property(
          driverListArb(),
          (drivers) => {
            const count = getDriverCountByWarehouse(drivers, null)
            return count === drivers.length
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})

// ==================== 边界条件测试 ====================

describe('仓库筛选边界条件测试', () => {
  it('筛选 warehouse_id 为 null 的司机', () => {
    const drivers: UserWithWarehouse[] = [
      {
        id: 1,
        username: 'driver1',
        name: '司机1',
        phone: null,
        role: UserRole.DRIVER,
        is_active: true,
        created_at: new Date().toISOString(),
        warehouse_id: null,
      },
      {
        id: 2,
        username: 'driver2',
        name: '司机2',
        phone: null,
        role: UserRole.DRIVER,
        is_active: true,
        created_at: new Date().toISOString(),
        warehouse_id: 1,
      },
    ]
    
    const filtered = filterDriversByWarehouse(drivers, 1)
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe(2)
    
    const all = filterDriversByWarehouse(drivers, null)
    expect(all.length).toBe(2)
  })

  it('混合仓库的司机列表筛选', () => {
    const drivers: UserWithWarehouse[] = [
      {
        id: 1,
        username: 'driver1',
        name: '司机1',
        phone: '13800138001',
        role: UserRole.DRIVER,
        is_active: true,
        created_at: new Date().toISOString(),
        warehouse_id: 1,
      },
      {
        id: 2,
        username: 'driver2',
        name: '司机2',
        phone: '13800138002',
        role: UserRole.DRIVER,
        is_active: true,
        created_at: new Date().toISOString(),
        warehouse_id: 2,
      },
      {
        id: 3,
        username: 'driver3',
        name: '司机3',
        phone: '13800138003',
        role: UserRole.DRIVER,
        is_active: false,
        created_at: new Date().toISOString(),
        warehouse_id: 1,
      },
    ]
    
    const warehouse1Drivers = filterDriversByWarehouse(drivers, 1)
    expect(warehouse1Drivers.length).toBe(2)
    expect(warehouse1Drivers.map(d => d.id).sort()).toEqual([1, 3])
    
    const warehouse2Drivers = filterDriversByWarehouse(drivers, 2)
    expect(warehouse2Drivers.length).toBe(1)
    expect(warehouse2Drivers[0].id).toBe(2)
    
    const warehouse99Drivers = filterDriversByWarehouse(drivers, 99)
    expect(warehouse99Drivers.length).toBe(0)
  })
})
