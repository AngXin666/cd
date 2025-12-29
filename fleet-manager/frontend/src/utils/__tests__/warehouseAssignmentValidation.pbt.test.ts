/**
 * 仓库分配验证属性测试
 * 使用 fast-check 进行属性测试，验证仓库分配的核心功能
 * @module utils/__tests__/warehouseAssignmentValidation.pbt.test
 *
 * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
 * **Validates: Requirements 7.3**
 * 
 * 验证规则：
 * - 分配后用户的仓库ID应正确更新
 * - 取消分配（设为 null）应成功
 * - 分配操作不应改变用户的其他属性
 * 
 * 注意：UI 已保证用户只能从可用仓库列表中选择，
 * 所以不需要测试"分配到不存在的仓库"或"分配到禁用仓库"的场景
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validateAssignmentRequest,
  executeAssignment,
  verifyAssignmentEffect,
  isUserAssignedToWarehouse,
  getUserWarehouseName,
  countAssignedUsers,
  getUsersByWarehouse,
  type AssignmentUser,
  type AssignmentWarehouse,
  type AssignmentRequest
} from '../validation/warehouseAssignmentValidation'

// ==================== 自定义生成器 ====================

/**
 * 生成有效的用户ID（正整数）
 */
const userIdArbitrary = fc.integer({ min: 1, max: 10000 })

/**
 * 生成有效的仓库ID（正整数）
 */
const warehouseIdArbitrary = fc.integer({ min: 1, max: 1000 })

/**
 * 生成用户姓名（中文或英文）
 */
const userNameArbitrary = fc.oneof(
  // 中文姓名
  fc.tuple(
    fc.constantFrom('张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴'),
    fc.constantFrom('伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军')
  ).map(([surname, name]) => surname + name),
  // 英文姓名
  fc.constantFrom('John', 'Jane', 'Bob', 'Alice', 'Tom', 'Mary', 'Jack', 'Lucy')
)

/**
 * 生成仓库名称
 */
const warehouseNameArbitrary = fc.oneof(
  fc.constantFrom(
    '北京仓库', '上海仓库', '广州仓库', '深圳仓库', '杭州仓库',
    '成都仓库', '武汉仓库', '南京仓库', '西安仓库', '重庆仓库'
  ),
  fc.tuple(
    fc.constantFrom('东', '西', '南', '北', '中'),
    fc.constantFrom('区', '城', '港', '站'),
    fc.constant('仓库')
  ).map(parts => parts.join(''))
)

/**
 * 生成用户对象
 */
const userArbitrary = fc.record({
  id: userIdArbitrary,
  name: userNameArbitrary,
  warehouse_id: fc.oneof(fc.constant(null), warehouseIdArbitrary)
})

/**
 * 生成仓库对象（用于辅助函数测试，可能激活或禁用）
 */
const warehouseArbitrary = fc.record({
  id: warehouseIdArbitrary,
  name: warehouseNameArbitrary,
  is_active: fc.boolean()
})

/**
 * 生成激活的仓库对象（用于核心分配测试，模拟 UI 只显示激活仓库）
 */
const activeWarehouseArbitrary = fc.record({
  id: warehouseIdArbitrary,
  name: warehouseNameArbitrary,
  is_active: fc.constant(true)
})

/**
 * 生成仓库列表（确保ID唯一）
 */
const warehouseListArbitrary = fc.array(warehouseArbitrary, { minLength: 1, maxLength: 10 })
  .map(warehouses => {
    // 确保ID唯一
    const seen = new Set<number>()
    return warehouses.filter(w => {
      if (seen.has(w.id)) return false
      seen.add(w.id)
      return true
    })
  })
  .filter(warehouses => warehouses.length > 0)

/**
 * 生成用户列表（确保ID唯一）
 */
const userListArbitrary = fc.array(userArbitrary, { minLength: 1, maxLength: 20 })
  .map(users => {
    // 确保ID唯一
    const seen = new Set<number>()
    return users.filter(u => {
      if (seen.has(u.id)) return false
      seen.add(u.id)
      return true
    })
  })
  .filter(users => users.length > 0)

// ==================== 属性测试 ====================

describe('仓库分配验证属性测试', () => {
  /**
   * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
   * **Validates: Requirements 7.3**
   */
  describe('Property 5: 仓库分配生效', () => {
    
    it('Property 5.1: 分配到有效仓库后，用户的仓库ID应正确更新', () => {
      /**
       * 属性：对于任意用户和任意激活的仓库，
       * 执行分配后，用户的 warehouse_id 应等于目标仓库ID
       * 
       * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
       * **Validates: Requirements 7.3**
       */
      fc.assert(
        fc.property(
          userArbitrary,
          fc.array(activeWarehouseArbitrary, { minLength: 1, maxLength: 5 })
            .map(warehouses => {
              // 确保ID唯一
              const seen = new Set<number>()
              return warehouses.filter(w => {
                if (seen.has(w.id)) return false
                seen.add(w.id)
                return true
              })
            })
            .filter(warehouses => warehouses.length > 0),
          (user, warehouses) => {
            // 选择一个目标仓库
            const targetWarehouse = warehouses[0]
            
            // 执行分配
            const result = executeAssignment(user, targetWarehouse.id, warehouses)
            
            // 验证分配成功
            expect(result.success).toBe(true)
            expect(result.updatedUser).toBeDefined()
            
            // 验证仓库ID已正确更新
            expect(result.updatedUser!.warehouse_id).toBe(targetWarehouse.id)
            
            // 验证分配生效
            const effectVerified = verifyAssignmentEffect(
              user,
              result.updatedUser!,
              targetWarehouse.id
            )
            expect(effectVerified).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5.2: 取消分配后，用户的仓库ID应为 null', () => {
      /**
       * 属性：对于任意已分配仓库的用户，
       * 执行取消分配（warehouseId = null）后，用户的 warehouse_id 应为 null
       * 
       * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
       * **Validates: Requirements 7.3**
       */
      fc.assert(
        fc.property(
          // 生成已分配仓库的用户
          fc.record({
            id: userIdArbitrary,
            name: userNameArbitrary,
            warehouse_id: warehouseIdArbitrary
          }),
          warehouseListArbitrary,
          (user, warehouses) => {
            // 执行取消分配
            const result = executeAssignment(user, null, warehouses)
            
            // 验证取消分配成功
            expect(result.success).toBe(true)
            expect(result.updatedUser).toBeDefined()
            
            // 验证仓库ID已设为 null
            expect(result.updatedUser!.warehouse_id).toBeNull()
            
            // 验证分配生效
            const effectVerified = verifyAssignmentEffect(
              user,
              result.updatedUser!,
              null
            )
            expect(effectVerified).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5.3: 分配操作不应改变用户的其他属性', () => {
      /**
       * 属性：对于任意用户和任意有效分配，
       * 分配后用户的 id 和 name 应保持不变
       * 
       * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
       * **Validates: Requirements 7.3**
       */
      fc.assert(
        fc.property(
          userArbitrary,
          fc.array(activeWarehouseArbitrary, { minLength: 1, maxLength: 5 })
            .map(warehouses => {
              const seen = new Set<number>()
              return warehouses.filter(w => {
                if (seen.has(w.id)) return false
                seen.add(w.id)
                return true
              })
            })
            .filter(warehouses => warehouses.length > 0),
          (user, warehouses) => {
            const targetWarehouse = warehouses[0]
            
            // 执行分配
            const result = executeAssignment(user, targetWarehouse.id, warehouses)
            
            // 验证分配成功
            expect(result.success).toBe(true)
            expect(result.updatedUser).toBeDefined()
            
            // 验证其他属性未变
            expect(result.updatedUser!.id).toBe(user.id)
            expect(result.updatedUser!.name).toBe(user.name)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5.4: isUserAssignedToWarehouse 应正确反映分配状态', () => {
      /**
       * 属性：对于任意用户和仓库ID，
       * isUserAssignedToWarehouse 应返回 user.warehouse_id === warehouseId
       * 
       * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
       * **Validates: Requirements 7.3**
       */
      fc.assert(
        fc.property(
          userArbitrary,
          fc.oneof(fc.constant(null), warehouseIdArbitrary),
          (user, warehouseId) => {
            const isAssigned = isUserAssignedToWarehouse(user, warehouseId)
            const expected = user.warehouse_id === warehouseId
            
            expect(isAssigned).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5.5: 分配后 isUserAssignedToWarehouse 应返回 true', () => {
      /**
       * 属性：对于任意成功的分配操作，
       * 分配后 isUserAssignedToWarehouse(updatedUser, targetWarehouseId) 应返回 true
       * 
       * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
       * **Validates: Requirements 7.3**
       */
      fc.assert(
        fc.property(
          userArbitrary,
          fc.array(activeWarehouseArbitrary, { minLength: 1, maxLength: 5 })
            .map(warehouses => {
              const seen = new Set<number>()
              return warehouses.filter(w => {
                if (seen.has(w.id)) return false
                seen.add(w.id)
                return true
              })
            })
            .filter(warehouses => warehouses.length > 0),
          (user, warehouses) => {
            const targetWarehouse = warehouses[0]
            
            // 执行分配
            const result = executeAssignment(user, targetWarehouse.id, warehouses)
            
            // 验证分配成功
            expect(result.success).toBe(true)
            
            // 验证 isUserAssignedToWarehouse 返回 true
            const isAssigned = isUserAssignedToWarehouse(
              result.updatedUser!,
              targetWarehouse.id
            )
            expect(isAssigned).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('辅助函数属性测试', () => {
    
    it('getUserWarehouseName 应返回正确的仓库名称', () => {
      /**
       * 属性：对于任意用户和仓库列表，
       * 如果用户已分配仓库，应返回对应仓库名称
       * 如果用户未分配仓库，应返回 '未分配'
       */
      fc.assert(
        fc.property(
          userArbitrary,
          warehouseListArbitrary,
          (user, warehouses) => {
            const warehouseName = getUserWarehouseName(user, warehouses)
            
            if (user.warehouse_id === null) {
              expect(warehouseName).toBe('未分配')
            } else {
              const warehouse = warehouses.find(w => w.id === user.warehouse_id)
              if (warehouse) {
                expect(warehouseName).toBe(warehouse.name)
              } else {
                expect(warehouseName).toBe('未知仓库')
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('countAssignedUsers 应返回正确的已分配用户数量', () => {
      /**
       * 属性：对于任意用户列表，
       * countAssignedUsers 应返回 warehouse_id 不为 null 的用户数量
       */
      fc.assert(
        fc.property(
          userListArbitrary,
          (users) => {
            const count = countAssignedUsers(users)
            const expected = users.filter(u => u.warehouse_id !== null).length
            
            expect(count).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('getUsersByWarehouse 应返回正确的用户列表', () => {
      /**
       * 属性：对于任意用户列表和仓库ID，
       * getUsersByWarehouse 应返回所有 warehouse_id 等于该仓库ID的用户
       */
      fc.assert(
        fc.property(
          userListArbitrary,
          fc.oneof(fc.constant(null), warehouseIdArbitrary),
          (users, warehouseId) => {
            const filteredUsers = getUsersByWarehouse(users, warehouseId)
            const expected = users.filter(u => u.warehouse_id === warehouseId)
            
            expect(filteredUsers.length).toBe(expected.length)
            
            // 验证所有返回的用户都分配到了指定仓库
            filteredUsers.forEach(u => {
              expect(u.warehouse_id).toBe(warehouseId)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
