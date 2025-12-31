/**
 * 角色权限过滤属性测试
 * 使用 fast-check 进行属性测试，验证角色权限过滤的正确性
 * 
 * **Feature: vue-deep-conversion, Property 11: 角色权限过滤**
 * **Validates: Requirements 3.10**
 * 
 * @module utils/__tests__/role-permission.test
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { filterWarehousesByRole, canAccessWarehouse } from '../filter'
import type { WarehouseAssignment } from '../filter'
import type { Warehouse, User } from '@/api/types'
import { UserRole } from '@/api/types'

// ==================== 测试数据生成器 ====================

/**
 * 生成有效仓库 ID 的 Arbitrary
 * 仓库 ID 为正整数，范围 1-100
 */
const warehouseIdArb = fc.integer({ min: 1, max: 100 })

/**
 * 生成有效用户 ID 的 Arbitrary
 * 用户 ID 为正整数，范围 1-1000
 */
const userIdArb = fc.integer({ min: 1, max: 1000 })

/**
 * 生成用户角色的 Arbitrary
 * 注意：SUPER_ADMIN 角色已被移除
 */
const userRoleArb = fc.constantFrom(
  UserRole.DRIVER,
  UserRole.MANAGER,
  UserRole.PEER_ADMIN,
  UserRole.BOSS
)

/**
 * 生成仓库对象的 Arbitrary
 * 
 * @param idGen - 可选的仓库 ID 生成器
 */
function warehouseArb(idGen: fc.Arbitrary<number> = warehouseIdArb): fc.Arbitrary<Warehouse> {
  return fc.record({
    id: idGen,
    name: fc.string({ minLength: 1, maxLength: 20 }),
    address: fc.oneof(fc.constant(null), fc.string({ maxLength: 100 })),
    is_active: fc.boolean(),
    created_at: fc.constant(new Date().toISOString()),
  })
}

/**
 * 生成仓库列表的 Arbitrary
 * 确保仓库 ID 唯一
 * 
 * @param minLength - 最小长度
 * @param maxLength - 最大长度
 */
function warehouseListArb(minLength = 0, maxLength = 20): fc.Arbitrary<Warehouse[]> {
  return fc.array(
    fc.integer({ min: 1, max: 100 }),
    { minLength, maxLength }
  ).chain(ids => {
    // 确保 ID 唯一
    const uniqueIds = [...new Set(ids)]
    return fc.tuple(
      ...uniqueIds.map(id => warehouseArb(fc.constant(id)))
    )
  }).map(warehouses => warehouses as Warehouse[])
}

/**
 * 生成用户对象的 Arbitrary
 * 
 * @param roleGen - 可选的角色生成器
 * @param idGen - 可选的用户 ID 生成器
 */
function userArb(
  roleGen: fc.Arbitrary<UserRole> = userRoleArb,
  idGen: fc.Arbitrary<number> = userIdArb
): fc.Arbitrary<User> {
  return fc.record({
    id: idGen,
    username: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    phone: fc.oneof(fc.constant(null), fc.string({ minLength: 11, maxLength: 11 })),
    role: roleGen,
    is_active: fc.constant(true),
    created_at: fc.constant(new Date().toISOString()),
  })
}

/**
 * 生成仓库分配关系的 Arbitrary
 * 
 * @param userIds - 可用的用户 ID 列表
 * @param warehouseIds - 可用的仓库 ID 列表
 */
function assignmentArb(
  userIds: number[],
  warehouseIds: number[]
): fc.Arbitrary<WarehouseAssignment[]> {
  if (userIds.length === 0 || warehouseIds.length === 0) {
    return fc.constant([])
  }
  
  return fc.array(
    fc.record({
      userId: fc.constantFrom(...userIds),
      warehouseId: fc.constantFrom(...warehouseIds),
    }),
    { minLength: 0, maxLength: userIds.length * warehouseIds.length }
  ).map(assignments => {
    // 去重：同一用户不能重复分配同一仓库
    const seen = new Set<string>()
    return assignments.filter(a => {
      const key = `${a.userId}-${a.warehouseId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })
}

// ==================== Property 11: 角色权限过滤 ====================

describe('角色权限过滤属性测试', () => {
  /**
   * **Feature: vue-deep-conversion, Property 11: 角色权限过滤**
   * **Validates: Requirements 3.10**
   * 
   * *For any* 车队长用户，加载仓库列表时应该只返回该用户管辖的仓库
   */
  describe('Property 11: 角色权限过滤', () => {
    it('车队长只能看到分配给自己的仓库', () => {
      fc.assert(
        fc.property(
          // 生成仓库列表
          warehouseListArb(1, 10),
          // 生成车队长用户
          userArb(fc.constant(UserRole.MANAGER)),
          fc.context(),
          (warehouses, manager, ctx) => {
            // 生成分配关系：随机分配一些仓库给该车队长
            const warehouseIds = warehouses.map(w => w.id)
            const assignedIds = warehouseIds.filter(() => Math.random() > 0.5)
            const assignments: WarehouseAssignment[] = assignedIds.map(wId => ({
              userId: manager.id,
              warehouseId: wId,
            }))
            
            ctx.log(`仓库数量: ${warehouses.length}`)
            ctx.log(`分配给车队长的仓库数量: ${assignments.length}`)
            
            // 执行过滤
            const filtered = filterWarehousesByRole(warehouses, manager, assignments)
            
            // 验证：过滤后的仓库都是分配给该车队长的
            const assignedIdSet = new Set(assignedIds)
            const allAssigned = filtered.every(w => assignedIdSet.has(w.id))
            
            // 验证：所有分配给该车队长的仓库都在结果中
            const filteredIdSet = new Set(filtered.map(w => w.id))
            const allIncluded = assignedIds.every(id => filteredIdSet.has(id))
            
            return allAssigned && allIncluded
          }
        ),
        { numRuns: 100 }
      )
    })

    it('老板可以看到所有仓库', () => {
      fc.assert(
        fc.property(
          warehouseListArb(1, 10),
          userArb(fc.constant(UserRole.BOSS)),
          (warehouses, boss) => {
            // 即使没有分配关系，老板也能看到所有仓库
            const assignments: WarehouseAssignment[] = []
            
            const filtered = filterWarehousesByRole(warehouses, boss, assignments)
            
            // 验证：老板能看到所有仓库
            return filtered.length === warehouses.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('调度员可以看到所有仓库', () => {
      fc.assert(
        fc.property(
          warehouseListArb(1, 10),
          userArb(fc.constant(UserRole.PEER_ADMIN)),
          (warehouses, peerAdmin) => {
            const assignments: WarehouseAssignment[] = []
            
            const filtered = filterWarehousesByRole(warehouses, peerAdmin, assignments)
            
            // 验证：调度员能看到所有仓库
            return filtered.length === warehouses.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('司机只能看到分配给自己的仓库', () => {
      fc.assert(
        fc.property(
          warehouseListArb(1, 10),
          userArb(fc.constant(UserRole.DRIVER)),
          (warehouses, driver) => {
            // 生成分配关系：随机分配一些仓库给该司机
            const warehouseIds = warehouses.map(w => w.id)
            const assignedIds = warehouseIds.filter(() => Math.random() > 0.5)
            const assignments: WarehouseAssignment[] = assignedIds.map(wId => ({
              userId: driver.id,
              warehouseId: wId,
            }))
            
            const filtered = filterWarehousesByRole(warehouses, driver, assignments)
            
            // 验证：过滤后的仓库都是分配给该司机的
            const assignedIdSet = new Set(assignedIds)
            const allAssigned = filtered.every(w => assignedIdSet.has(w.id))
            
            // 验证：所有分配给该司机的仓库都在结果中
            const filteredIdSet = new Set(filtered.map(w => w.id))
            const allIncluded = assignedIds.every(id => filteredIdSet.has(id))
            
            return allAssigned && allIncluded
          }
        ),
        { numRuns: 100 }
      )
    })

    it('过滤后的仓库数量不超过原仓库数量', () => {
      fc.assert(
        fc.property(
          warehouseListArb(0, 20),
          userArb(),
          (warehouses, user) => {
            // 生成随机分配关系
            const warehouseIds = warehouses.map(w => w.id)
            const assignments: WarehouseAssignment[] = warehouseIds
              .filter(() => Math.random() > 0.5)
              .map(wId => ({
                userId: user.id,
                warehouseId: wId,
              }))
            
            const filtered = filterWarehousesByRole(warehouses, user, assignments)
            
            return filtered.length <= warehouses.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('过滤不应该修改原数组', () => {
      fc.assert(
        fc.property(
          warehouseListArb(1, 10),
          userArb(),
          (warehouses, user) => {
            const originalLength = warehouses.length
            const originalFirst = { ...warehouses[0] }
            
            const assignments: WarehouseAssignment[] = []
            filterWarehousesByRole(warehouses, user, assignments)
            
            // 验证原数组未被修改
            return warehouses.length === originalLength &&
                   warehouses[0].id === originalFirst.id
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空仓库列表应该返回空数组', () => {
      fc.assert(
        fc.property(
          userArb(),
          (user) => {
            const filtered = filterWarehousesByRole([], user, [])
            return filtered.length === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('车队长没有分配任何仓库时应该返回空数组', () => {
      fc.assert(
        fc.property(
          warehouseListArb(1, 10),
          userArb(fc.constant(UserRole.MANAGER)),
          (warehouses, manager) => {
            // 没有分配关系
            const assignments: WarehouseAssignment[] = []
            
            const filtered = filterWarehousesByRole(warehouses, manager, assignments)
            
            // 车队长没有分配仓库时应该返回空数组
            return filtered.length === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('分配给其他用户的仓库不应该出现在当前用户的结果中', () => {
      fc.assert(
        fc.property(
          warehouseListArb(2, 10),
          userArb(fc.constant(UserRole.MANAGER), fc.constant(1)),
          userArb(fc.constant(UserRole.MANAGER), fc.constant(2)),
          (warehouses, manager1, manager2) => {
            // 将仓库分成两组，分别分配给两个车队长
            const half = Math.floor(warehouses.length / 2)
            const manager1Warehouses = warehouses.slice(0, half)
            const manager2Warehouses = warehouses.slice(half)
            
            const assignments: WarehouseAssignment[] = [
              ...manager1Warehouses.map(w => ({ userId: manager1.id, warehouseId: w.id })),
              ...manager2Warehouses.map(w => ({ userId: manager2.id, warehouseId: w.id })),
            ]
            
            // 过滤 manager1 的仓库
            const filtered1 = filterWarehousesByRole(warehouses, manager1, assignments)
            
            // 验证：manager1 的结果中不应该包含 manager2 的仓库
            const manager2WarehouseIds = new Set(manager2Warehouses.map(w => w.id))
            const noOverlap = filtered1.every(w => !manager2WarehouseIds.has(w.id))
            
            return noOverlap
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ==================== canAccessWarehouse 测试 ====================

  describe('canAccessWarehouse 函数测试', () => {
    it('老板可以访问任何仓库', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          userArb(fc.constant(UserRole.BOSS)),
          (warehouseId, boss) => {
            return canAccessWarehouse(warehouseId, boss, [])
          }
        ),
        { numRuns: 100 }
      )
    })

    it('调度员可以访问任何仓库', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          userArb(fc.constant(UserRole.PEER_ADMIN)),
          (warehouseId, peerAdmin) => {
            return canAccessWarehouse(warehouseId, peerAdmin, [])
          }
        ),
        { numRuns: 100 }
      )
    })

    it('车队长只能访问分配给自己的仓库', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          userArb(fc.constant(UserRole.MANAGER)),
          fc.boolean(),
          (warehouseId, manager, isAssigned) => {
            const assignments: WarehouseAssignment[] = isAssigned
              ? [{ userId: manager.id, warehouseId }]
              : []
            
            const canAccess = canAccessWarehouse(warehouseId, manager, assignments)
            
            // 如果分配了，应该能访问；如果没分配，不应该能访问
            return canAccess === isAssigned
          }
        ),
        { numRuns: 100 }
      )
    })

    it('司机只能访问分配给自己的仓库', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          userArb(fc.constant(UserRole.DRIVER)),
          fc.boolean(),
          (warehouseId, driver, isAssigned) => {
            const assignments: WarehouseAssignment[] = isAssigned
              ? [{ userId: driver.id, warehouseId }]
              : []
            
            const canAccess = canAccessWarehouse(warehouseId, driver, assignments)
            
            return canAccess === isAssigned
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== 边界条件测试 ====================

describe('角色权限过滤边界条件测试', () => {
  it('多个用户分配同一仓库时，各自只能看到自己分配的', () => {
    const warehouse: Warehouse = {
      id: 1,
      name: '测试仓库',
      address: null,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    
    const manager1: User = {
      id: 1,
      username: 'manager1',
      name: '车队长1',
      phone: null,
      role: UserRole.MANAGER,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    
    const manager2: User = {
      id: 2,
      username: 'manager2',
      name: '车队长2',
      phone: null,
      role: UserRole.MANAGER,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    
    // 只分配给 manager1
    const assignments: WarehouseAssignment[] = [
      { userId: 1, warehouseId: 1 },
    ]
    
    const filtered1 = filterWarehousesByRole([warehouse], manager1, assignments)
    const filtered2 = filterWarehousesByRole([warehouse], manager2, assignments)
    
    expect(filtered1.length).toBe(1)
    expect(filtered2.length).toBe(0)
  })

  it('同一用户分配多个仓库时，应该能看到所有分配的仓库', () => {
    const warehouses: Warehouse[] = [
      { id: 1, name: '仓库1', address: null, is_active: true, created_at: new Date().toISOString() },
      { id: 2, name: '仓库2', address: null, is_active: true, created_at: new Date().toISOString() },
      { id: 3, name: '仓库3', address: null, is_active: true, created_at: new Date().toISOString() },
    ]
    
    const manager: User = {
      id: 1,
      username: 'manager',
      name: '车队长',
      phone: null,
      role: UserRole.MANAGER,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    
    // 分配仓库 1 和 3
    const assignments: WarehouseAssignment[] = [
      { userId: 1, warehouseId: 1 },
      { userId: 1, warehouseId: 3 },
    ]
    
    const filtered = filterWarehousesByRole(warehouses, manager, assignments)
    
    expect(filtered.length).toBe(2)
    expect(filtered.map(w => w.id).sort()).toEqual([1, 3])
  })

  it('角色切换时权限应该正确变化', () => {
    const warehouses: Warehouse[] = [
      { id: 1, name: '仓库1', address: null, is_active: true, created_at: new Date().toISOString() },
      { id: 2, name: '仓库2', address: null, is_active: true, created_at: new Date().toISOString() },
    ]
    
    const assignments: WarehouseAssignment[] = [
      { userId: 1, warehouseId: 1 },
    ]
    
    // 作为车队长只能看到分配的仓库
    const asManager: User = {
      id: 1,
      username: 'user',
      name: '用户',
      phone: null,
      role: UserRole.MANAGER,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    
    // 作为老板可以看到所有仓库
    const asBoss: User = {
      ...asManager,
      role: UserRole.BOSS,
    }
    
    const filteredAsManager = filterWarehousesByRole(warehouses, asManager, assignments)
    const filteredAsBoss = filterWarehousesByRole(warehouses, asBoss, assignments)
    
    expect(filteredAsManager.length).toBe(1)
    expect(filteredAsBoss.length).toBe(2)
  })
})
