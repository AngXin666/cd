/**
 * 仓库过滤工具函数属性测试
 * 使用 fast-check 进行属性测试，验证仓库过滤逻辑的正确性
 * 
 * @module utils/__tests__/warehouse.pbt.test
 * @requirements 1.1-1.3, 2.1-2.3, 3.1-3.4, 5.1-5.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  filterWarehousesWithData,
  filterWarehousesWithDrivers,
  filterWarehousesWithDataOrDrivers,
  shouldShowWarehouseSwitcher,
  getWarehouseDriverCount,
  getUnassignedUserCount,
  createWarehouseDataMap,
} from '../warehouse'
import type { Warehouse, User } from '@/api/types'
import { UserRole, WarehouseType } from '@/api/types'

// ==================== 生成器 ====================

/**
 * 生成随机仓库
 */
const warehouseArb = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  address: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  is_active: fc.boolean(),
  created_at: fc.date().map(d => d.toISOString()),
  warehouse_type: fc.constantFrom(
    WarehouseType.PIECE,
    WarehouseType.POINT,
    WarehouseType.WHOLE,
    WarehouseType.DISTANCE
  ),
  preset_unit: fc.constantFrom('件', '点', '车', '公里'),
}) as fc.Arbitrary<Warehouse>

/**
 * 生成唯一ID的仓库列表
 */
const uniqueWarehousesArb = fc.array(warehouseArb, { minLength: 0, maxLength: 10 })
  .map(warehouses => {
    const seen = new Set<number>()
    return warehouses.filter(w => {
      if (seen.has(w.id)) return false
      seen.add(w.id)
      return true
    })
  })

/**
 * 生成随机用户
 */
const userArb = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  username: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 10 }),
  phone: fc.option(fc.string({ minLength: 11, maxLength: 11 }), { nil: null }),
  role: fc.constantFrom(UserRole.DRIVER, UserRole.MANAGER, UserRole.BOSS, UserRole.PEER_ADMIN),
  is_active: fc.boolean(),
  created_at: fc.date().map(d => d.toISOString()),
  warehouse_id: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
  is_verified: fc.option(fc.boolean(), { nil: undefined }),
}) as fc.Arbitrary<User>

/**
 * 生成唯一ID的用户列表
 */
const uniqueUsersArb = fc.array(userArb, { minLength: 0, maxLength: 20 })
  .map(users => {
    const seen = new Set<number>()
    return users.filter(u => {
      if (seen.has(u.id)) return false
      seen.add(u.id)
      return true
    })
  })

// ==================== Property 1: 仓库切换器显示条件正确性 ====================

describe('Property 1: 仓库切换器显示条件正确性', () => {
  /**
   * Feature: warehouse-switcher-unified, Property 1: 仓库切换器显示条件正确性
   * *For any* 仓库列表，当过滤后的有效仓库数量小于等于1时，shouldShowWarehouseSwitcher 应返回 false；
   * 当数量大于1时，应返回 true。
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  it('shouldShowWarehouseSwitcher 返回值与仓库数量的关系正确', () => {
    fc.assert(
      fc.property(uniqueWarehousesArb, (warehouses) => {
        const result = shouldShowWarehouseSwitcher(warehouses)
        
        if (warehouses.length <= 1) {
          expect(result).toBe(false)
        } else {
          expect(result).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('空仓库列表返回 false', () => {
    expect(shouldShowWarehouseSwitcher([])).toBe(false)
  })

  it('单个仓库返回 false', () => {
    fc.assert(
      fc.property(warehouseArb, (warehouse) => {
        expect(shouldShowWarehouseSwitcher([warehouse])).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('两个或更多仓库返回 true', () => {
    fc.assert(
      fc.property(
        fc.array(warehouseArb, { minLength: 2, maxLength: 10 }),
        (warehouses) => {
          expect(shouldShowWarehouseSwitcher(warehouses)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ==================== Property 2: 有数据仓库过滤正确性 ====================

describe('Property 2: 有数据仓库过滤正确性', () => {
  /**
   * Feature: warehouse-switcher-unified, Property 2: 有数据仓库过滤正确性
   * *For any* 仓库列表和数据映射，filterWarehousesWithData 返回的仓库列表应只包含
   * 在数据映射中标记为有数据的仓库。
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it('返回的仓库都在数据映射中标记为有数据', () => {
    fc.assert(
      fc.property(
        uniqueWarehousesArb,
        fc.array(fc.tuple(fc.integer({ min: 1, max: 1000 }), fc.boolean()), { maxLength: 20 }),
        (warehouses, dataEntries) => {
          const warehouseDataMap = new Map(dataEntries)
          
          const result = filterWarehousesWithData({
            warehouses,
            warehouseDataMap,
          })
          
          // 所有返回的仓库都应该在数据映射中标记为 true
          for (const warehouse of result) {
            expect(warehouseDataMap.get(warehouse.id)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('不返回数据映射中标记为无数据的仓库', () => {
    fc.assert(
      fc.property(
        uniqueWarehousesArb,
        fc.array(fc.tuple(fc.integer({ min: 1, max: 1000 }), fc.boolean()), { maxLength: 20 }),
        (warehouses, dataEntries) => {
          const warehouseDataMap = new Map(dataEntries)
          
          const result = filterWarehousesWithData({
            warehouses,
            warehouseDataMap,
          })
          
          const resultIds = new Set(result.map(w => w.id))
          
          // 数据映射中标记为 false 的仓库不应该出现在结果中
          for (const warehouse of warehouses) {
            if (warehouseDataMap.get(warehouse.id) === false) {
              expect(resultIds.has(warehouse.id)).toBe(false)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('空数据映射返回空数组', () => {
    fc.assert(
      fc.property(uniqueWarehousesArb, (warehouses) => {
        const result = filterWarehousesWithData({
          warehouses,
          warehouseDataMap: new Map(),
        })
        
        expect(result).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  })

  it('未提供数据映射返回空数组', () => {
    fc.assert(
      fc.property(uniqueWarehousesArb, (warehouses) => {
        const result = filterWarehousesWithData({
          warehouses,
        })
        
        expect(result).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  })
})

// ==================== Property 3: 有司机仓库过滤正确性 ====================

describe('Property 3: 有司机仓库过滤正确性', () => {
  /**
   * Feature: warehouse-switcher-unified, Property 3: 有司机仓库过滤正确性
   * *For any* 仓库列表、用户列表和用户仓库分配映射，filterWarehousesWithDrivers 返回的
   * 仓库列表应只包含至少有一个司机分配的仓库。
   * **Validates: Requirements 5.1, 5.2**
   */
  it('返回的仓库都至少有一个司机分配', () => {
    fc.assert(
      fc.property(
        uniqueWarehousesArb,
        uniqueUsersArb,
        (warehouses, users) => {
          // 为每个用户随机分配仓库
          const userWarehouseIdsMap = new Map<number, number[]>()
          const warehouseIds = warehouses.map(w => w.id)
          
          for (const user of users) {
            if (warehouseIds.length > 0) {
              // 随机选择 0-3 个仓库分配给用户
              const numWarehouses = Math.floor(Math.random() * Math.min(4, warehouseIds.length + 1))
              const assignedIds: number[] = []
              for (let i = 0; i < numWarehouses; i++) {
                const randomId = warehouseIds[Math.floor(Math.random() * warehouseIds.length)]
                if (!assignedIds.includes(randomId)) {
                  assignedIds.push(randomId)
                }
              }
              userWarehouseIdsMap.set(user.id, assignedIds)
            } else {
              userWarehouseIdsMap.set(user.id, [])
            }
          }
          
          const result = filterWarehousesWithDrivers({
            warehouses,
            userWarehouseIdsMap,
            users,
            roleFilter: UserRole.DRIVER,
          })
          
          // 计算每个仓库的司机数量
          const driverCounts = new Map<number, number>()
          for (const user of users) {
            if (user.role !== UserRole.DRIVER) continue
            const assignedIds = userWarehouseIdsMap.get(user.id) || []
            for (const id of assignedIds) {
              driverCounts.set(id, (driverCounts.get(id) || 0) + 1)
            }
          }
          
          // 所有返回的仓库都应该有至少一个司机
          for (const warehouse of result) {
            expect(driverCounts.get(warehouse.id) || 0).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('没有司机的仓库不会被返回', () => {
    fc.assert(
      fc.property(
        uniqueWarehousesArb,
        uniqueUsersArb,
        (warehouses, users) => {
          // 为每个用户随机分配仓库
          const userWarehouseIdsMap = new Map<number, number[]>()
          const warehouseIds = warehouses.map(w => w.id)
          
          for (const user of users) {
            if (warehouseIds.length > 0) {
              const numWarehouses = Math.floor(Math.random() * Math.min(4, warehouseIds.length + 1))
              const assignedIds: number[] = []
              for (let i = 0; i < numWarehouses; i++) {
                const randomId = warehouseIds[Math.floor(Math.random() * warehouseIds.length)]
                if (!assignedIds.includes(randomId)) {
                  assignedIds.push(randomId)
                }
              }
              userWarehouseIdsMap.set(user.id, assignedIds)
            } else {
              userWarehouseIdsMap.set(user.id, [])
            }
          }
          
          const result = filterWarehousesWithDrivers({
            warehouses,
            userWarehouseIdsMap,
            users,
            roleFilter: UserRole.DRIVER,
          })
          
          const resultIds = new Set(result.map(w => w.id))
          
          // 计算每个仓库的司机数量
          const driverCounts = new Map<number, number>()
          for (const user of users) {
            if (user.role !== UserRole.DRIVER) continue
            const assignedIds = userWarehouseIdsMap.get(user.id) || []
            for (const id of assignedIds) {
              driverCounts.set(id, (driverCounts.get(id) || 0) + 1)
            }
          }
          
          // 没有司机的仓库不应该出现在结果中
          for (const warehouse of warehouses) {
            if ((driverCounts.get(warehouse.id) || 0) === 0) {
              expect(resultIds.has(warehouse.id)).toBe(false)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('空用户列表返回空数组', () => {
    fc.assert(
      fc.property(uniqueWarehousesArb, (warehouses) => {
        const result = filterWarehousesWithDrivers({
          warehouses,
          userWarehouseIdsMap: new Map(),
          users: [],
          roleFilter: UserRole.DRIVER,
        })
        
        expect(result).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  })
})

// ==================== Property 4: 有数据或司机仓库过滤正确性 ====================

describe('Property 4: 有数据或司机仓库过滤正确性', () => {
  /**
   * Feature: warehouse-switcher-unified, Property 4: 有数据或司机仓库过滤正确性
   * *For any* 仓库列表、数据映射和司机分配映射，filterWarehousesWithDataOrDrivers 返回的
   * 仓库列表应包含所有有数据或有司机的仓库，且不包含既无数据也无司机的仓库。
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4**
   */
  it('返回的仓库都有数据或有司机', () => {
    fc.assert(
      fc.property(
        uniqueWarehousesArb,
        uniqueUsersArb,
        fc.array(fc.tuple(fc.integer({ min: 1, max: 1000 }), fc.boolean()), { maxLength: 20 }),
        (warehouses, users, dataEntries) => {
          const warehouseDataMap = new Map(dataEntries)
          
          // 为每个用户随机分配仓库
          const userWarehouseIdsMap = new Map<number, number[]>()
          const warehouseIds = warehouses.map(w => w.id)
          
          for (const user of users) {
            if (warehouseIds.length > 0) {
              const numWarehouses = Math.floor(Math.random() * Math.min(4, warehouseIds.length + 1))
              const assignedIds: number[] = []
              for (let i = 0; i < numWarehouses; i++) {
                const randomId = warehouseIds[Math.floor(Math.random() * warehouseIds.length)]
                if (!assignedIds.includes(randomId)) {
                  assignedIds.push(randomId)
                }
              }
              userWarehouseIdsMap.set(user.id, assignedIds)
            } else {
              userWarehouseIdsMap.set(user.id, [])
            }
          }
          
          const result = filterWarehousesWithDataOrDrivers({
            warehouses,
            warehouseDataMap,
            userWarehouseIdsMap,
            users,
            roleFilter: UserRole.DRIVER,
          })
          
          // 计算每个仓库的司机数量
          const driverCounts = new Map<number, number>()
          for (const user of users) {
            if (user.role !== UserRole.DRIVER) continue
            const assignedIds = userWarehouseIdsMap.get(user.id) || []
            for (const id of assignedIds) {
              driverCounts.set(id, (driverCounts.get(id) || 0) + 1)
            }
          }
          
          // 所有返回的仓库都应该有数据或有司机
          for (const warehouse of result) {
            const hasData = warehouseDataMap.get(warehouse.id) === true
            const hasDrivers = (driverCounts.get(warehouse.id) || 0) > 0
            expect(hasData || hasDrivers).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('既无数据也无司机的仓库不会被返回', () => {
    fc.assert(
      fc.property(
        uniqueWarehousesArb,
        uniqueUsersArb,
        fc.array(fc.tuple(fc.integer({ min: 1, max: 1000 }), fc.boolean()), { maxLength: 20 }),
        (warehouses, users, dataEntries) => {
          const warehouseDataMap = new Map(dataEntries)
          
          // 为每个用户随机分配仓库
          const userWarehouseIdsMap = new Map<number, number[]>()
          const warehouseIds = warehouses.map(w => w.id)
          
          for (const user of users) {
            if (warehouseIds.length > 0) {
              const numWarehouses = Math.floor(Math.random() * Math.min(4, warehouseIds.length + 1))
              const assignedIds: number[] = []
              for (let i = 0; i < numWarehouses; i++) {
                const randomId = warehouseIds[Math.floor(Math.random() * warehouseIds.length)]
                if (!assignedIds.includes(randomId)) {
                  assignedIds.push(randomId)
                }
              }
              userWarehouseIdsMap.set(user.id, assignedIds)
            } else {
              userWarehouseIdsMap.set(user.id, [])
            }
          }
          
          const result = filterWarehousesWithDataOrDrivers({
            warehouses,
            warehouseDataMap,
            userWarehouseIdsMap,
            users,
            roleFilter: UserRole.DRIVER,
          })
          
          const resultIds = new Set(result.map(w => w.id))
          
          // 计算每个仓库的司机数量
          const driverCounts = new Map<number, number>()
          for (const user of users) {
            if (user.role !== UserRole.DRIVER) continue
            const assignedIds = userWarehouseIdsMap.get(user.id) || []
            for (const id of assignedIds) {
              driverCounts.set(id, (driverCounts.get(id) || 0) + 1)
            }
          }
          
          // 既无数据也无司机的仓库不应该出现在结果中
          for (const warehouse of warehouses) {
            const hasData = warehouseDataMap.get(warehouse.id) === true
            const hasDrivers = (driverCounts.get(warehouse.id) || 0) > 0
            if (!hasData && !hasDrivers) {
              expect(resultIds.has(warehouse.id)).toBe(false)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ==================== 辅助函数测试 ====================

describe('辅助函数测试', () => {
  describe('getWarehouseDriverCount', () => {
    it('正确计算仓库的司机数量', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          uniqueUsersArb,
          (warehouseId, users) => {
            const userWarehouseIdsMap = new Map<number, number[]>()
            
            // 随机分配仓库
            for (const user of users) {
              const includeWarehouse = Math.random() > 0.5
              userWarehouseIdsMap.set(user.id, includeWarehouse ? [warehouseId] : [])
            }
            
            const count = getWarehouseDriverCount(warehouseId, {
              userWarehouseIdsMap,
              users,
              roleFilter: UserRole.DRIVER,
            })
            
            // 手动计算期望值
            let expected = 0
            for (const user of users) {
              if (user.role !== UserRole.DRIVER) continue
              const ids = userWarehouseIdsMap.get(user.id) || []
              if (ids.includes(warehouseId)) expected++
            }
            
            expect(count).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('getUnassignedUserCount', () => {
    it('正确计算未分配仓库的用户数量', () => {
      fc.assert(
        fc.property(uniqueUsersArb, (users) => {
          const userWarehouseIdsMap = new Map<number, number[]>()
          
          // 随机分配仓库
          for (const user of users) {
            const hasWarehouse = Math.random() > 0.5
            userWarehouseIdsMap.set(user.id, hasWarehouse ? [1, 2] : [])
          }
          
          const count = getUnassignedUserCount({
            userWarehouseIdsMap,
            users,
            roleFilter: UserRole.DRIVER,
          })
          
          // 手动计算期望值
          let expected = 0
          for (const user of users) {
            if (user.role !== UserRole.DRIVER) continue
            const ids = userWarehouseIdsMap.get(user.id) || []
            if (ids.length === 0) expected++
          }
          
          expect(count).toBe(expected)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('createWarehouseDataMap', () => {
    it('正确创建仓库数据映射', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              warehouse_id: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            }),
            { maxLength: 20 }
          ),
          (records) => {
            const dataMap = createWarehouseDataMap(records)
            
            // 验证所有有 warehouse_id 的记录都被标记为 true
            for (const record of records) {
              if (record.warehouse_id != null) {
                expect(dataMap.get(record.warehouse_id)).toBe(true)
              }
            }
            
            // 验证没有 warehouse_id 的记录不会影响映射
            const warehouseIdsInRecords = new Set(
              records
                .filter(r => r.warehouse_id != null)
                .map(r => r.warehouse_id as number)
            )
            
            for (const [id] of dataMap) {
              expect(warehouseIdsInRecords.has(id)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
