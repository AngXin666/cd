/**
 * 仓库分配关系正确性属性测试
 * 使用 fast-check 进行属性测试，验证仓库分配的核心功能
 * @module utils/__tests__/warehouseAssignment.pbt.test
 *
 * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
 * **Validates: Requirements 1.5**
 * 
 * 验证规则：
 * - 分配后查询司机的仓库列表应包含所有已分配的仓库
 * - 分配操作应正确更新司机的仓库关系
 * - 取消分配后司机不应属于任何仓库
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ==================== 类型定义 ====================

/**
 * 司机信息
 */
interface Driver {
  /** 司机ID */
  id: number
  /** 司机姓名 */
  name: string
  /** 手机号 */
  phone: string
  /** 当前分配的仓库ID（null 表示未分配） */
  warehouse_id: number | null
}

/**
 * 仓库信息
 */
interface Warehouse {
  /** 仓库ID */
  id: number
  /** 仓库名称 */
  name: string
  /** 是否激活 */
  is_active: boolean
}

/**
 * 仓库分配请求
 */
interface WarehouseAssignmentRequest {
  /** 司机ID */
  driverId: number
  /** 要分配的仓库ID列表 */
  warehouseIds: number[]
}

/**
 * 仓库分配结果
 */
interface WarehouseAssignmentResult {
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 更新后的司机信息 */
  updatedDriver?: Driver
}

// ==================== 核心函数 ====================

/**
 * 执行仓库分配
 * 模拟 assignUserWarehouses API 的行为
 * 当前系统只支持单仓库分配，取第一个仓库ID
 * 
 * @param driver - 司机信息
 * @param warehouseIds - 要分配的仓库ID列表
 * @param availableWarehouses - 可用仓库列表（只包含激活的仓库）
 * @returns 分配结果
 * 
 * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
 * **Validates: Requirements 1.5**
 */
export function executeWarehouseAssignment(
  driver: Driver,
  warehouseIds: number[],
  availableWarehouses: Warehouse[]
): WarehouseAssignmentResult {
  // 如果传入空数组，清除仓库分配
  if (warehouseIds.length === 0) {
    return {
      success: true,
      updatedDriver: {
        ...driver,
        warehouse_id: null
      }
    }
  }
  
  // 当前系统只支持单仓库分配，取第一个仓库ID
  const targetWarehouseId = warehouseIds[0]
  
  // 验证目标仓库是否在可用列表中
  const targetWarehouse = availableWarehouses.find(w => w.id === targetWarehouseId)
  if (!targetWarehouse) {
    return {
      success: false,
      error: '目标仓库不在可用列表中'
    }
  }
  
  // 执行分配
  return {
    success: true,
    updatedDriver: {
      ...driver,
      warehouse_id: targetWarehouseId
    }
  }
}

/**
 * 验证仓库分配关系是否正确
 * 检查分配后司机的仓库ID是否包含在已分配的仓库列表中
 * 
 * @param driver - 司机信息
 * @param assignedWarehouseIds - 已分配的仓库ID列表
 * @returns 是否正确
 * 
 * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
 * **Validates: Requirements 1.5**
 */
export function verifyWarehouseAssignment(
  driver: Driver,
  assignedWarehouseIds: number[]
): boolean {
  // 如果没有分配任何仓库，司机的 warehouse_id 应为 null
  if (assignedWarehouseIds.length === 0) {
    return driver.warehouse_id === null
  }
  
  // 当前系统只支持单仓库分配，验证 warehouse_id 是否等于第一个分配的仓库
  return driver.warehouse_id === assignedWarehouseIds[0]
}

/**
 * 获取司机所属的仓库列表
 * 当前系统只支持单仓库分配，返回包含单个仓库ID的数组或空数组
 * 
 * @param driver - 司机信息
 * @returns 仓库ID列表
 * 
 * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
 * **Validates: Requirements 1.5**
 */
export function getDriverWarehouses(driver: Driver): number[] {
  if (driver.warehouse_id === null) {
    return []
  }
  return [driver.warehouse_id]
}

/**
 * 检查司机是否属于指定仓库
 * 
 * @param driver - 司机信息
 * @param warehouseId - 仓库ID
 * @returns 是否属于该仓库
 * 
 * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
 * **Validates: Requirements 1.5**
 */
export function isDriverInWarehouse(driver: Driver, warehouseId: number): boolean {
  return driver.warehouse_id === warehouseId
}

/**
 * 获取仓库中的所有司机
 * 
 * @param drivers - 司机列表
 * @param warehouseId - 仓库ID
 * @returns 属于该仓库的司机列表
 * 
 * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
 * **Validates: Requirements 1.5**
 */
export function getDriversInWarehouse(drivers: Driver[], warehouseId: number): Driver[] {
  return drivers.filter(d => d.warehouse_id === warehouseId)
}

// ==================== 自定义生成器 ====================

/**
 * 生成有效的司机ID（正整数）
 */
const driverIdArbitrary = fc.integer({ min: 1, max: 10000 })

/**
 * 生成有效的仓库ID（正整数）
 */
const warehouseIdArbitrary = fc.integer({ min: 1, max: 1000 })

/**
 * 生成司机姓名（中文）
 */
const driverNameArbitrary = fc.tuple(
  fc.constantFrom('张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴'),
  fc.constantFrom('伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军')
).map(([surname, name]) => surname + name)

/**
 * 生成手机号
 */
const phoneArbitrary = fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 11, maxLength: 11 })
  .map(s => '1' + s.slice(1))

/**
 * 生成仓库名称
 */
const warehouseNameArbitrary = fc.constantFrom(
  '北京仓库', '上海仓库', '广州仓库', '深圳仓库', '杭州仓库',
  '成都仓库', '武汉仓库', '南京仓库', '西安仓库', '重庆仓库'
)

/**
 * 生成司机对象
 */
const driverArbitrary = fc.record({
  id: driverIdArbitrary,
  name: driverNameArbitrary,
  phone: phoneArbitrary,
  warehouse_id: fc.oneof(fc.constant(null), warehouseIdArbitrary)
})

/**
 * 生成激活的仓库对象（模拟 UI 只显示激活仓库）
 */
const activeWarehouseArbitrary = fc.record({
  id: warehouseIdArbitrary,
  name: warehouseNameArbitrary,
  is_active: fc.constant(true)
})

/**
 * 生成仓库列表（确保ID唯一）
 */
const warehouseListArbitrary = fc.array(activeWarehouseArbitrary, { minLength: 1, maxLength: 10 })
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
 * 生成司机列表（确保ID唯一）
 */
const driverListArbitrary = fc.array(driverArbitrary, { minLength: 1, maxLength: 20 })
  .map(drivers => {
    // 确保ID唯一
    const seen = new Set<number>()
    return drivers.filter(d => {
      if (seen.has(d.id)) return false
      seen.add(d.id)
      return true
    })
  })
  .filter(drivers => drivers.length > 0)

// ==================== 属性测试 ====================

describe('仓库分配关系正确性属性测试', () => {
  /**
   * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
   * **Validates: Requirements 1.5**
   */
  describe('Property 4: 仓库分配关系正确性', () => {
    
    it('Property 4.1: 分配后查询司机的仓库列表应包含已分配的仓库', () => {
      /**
       * 属性：对于任意司机和任意有效仓库分配，
       * 分配后调用 getDriverWarehouses 应返回包含已分配仓库ID的列表
       * 
       * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
       * **Validates: Requirements 1.5**
       */
      fc.assert(
        fc.property(
          driverArbitrary,
          warehouseListArbitrary,
          (driver, warehouses) => {
            // 选择一个目标仓库
            const targetWarehouse = warehouses[0]
            const warehouseIds = [targetWarehouse.id]
            
            // 执行分配
            const result = executeWarehouseAssignment(driver, warehouseIds, warehouses)
            
            // 验证分配成功
            expect(result.success).toBe(true)
            expect(result.updatedDriver).toBeDefined()
            
            // 查询司机的仓库列表
            const driverWarehouses = getDriverWarehouses(result.updatedDriver!)
            
            // 验证仓库列表包含已分配的仓库
            expect(driverWarehouses).toContain(targetWarehouse.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 4.2: 分配后 verifyWarehouseAssignment 应返回 true', () => {
      /**
       * 属性：对于任意成功的仓库分配操作，
       * verifyWarehouseAssignment 应返回 true
       * 
       * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
       * **Validates: Requirements 1.5**
       */
      fc.assert(
        fc.property(
          driverArbitrary,
          warehouseListArbitrary,
          (driver, warehouses) => {
            const targetWarehouse = warehouses[0]
            const warehouseIds = [targetWarehouse.id]
            
            // 执行分配
            const result = executeWarehouseAssignment(driver, warehouseIds, warehouses)
            
            // 验证分配成功
            expect(result.success).toBe(true)
            
            // 验证分配关系正确
            const isValid = verifyWarehouseAssignment(result.updatedDriver!, warehouseIds)
            expect(isValid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 4.3: 取消分配后司机不应属于任何仓库', () => {
      /**
       * 属性：对于任意已分配仓库的司机，
       * 执行取消分配（传入空数组）后，getDriverWarehouses 应返回空数组
       * 
       * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
       * **Validates: Requirements 1.5**
       */
      fc.assert(
        fc.property(
          // 生成已分配仓库的司机
          fc.record({
            id: driverIdArbitrary,
            name: driverNameArbitrary,
            phone: phoneArbitrary,
            warehouse_id: warehouseIdArbitrary
          }),
          warehouseListArbitrary,
          (driver, warehouses) => {
            // 执行取消分配（传入空数组）
            const result = executeWarehouseAssignment(driver, [], warehouses)
            
            // 验证取消分配成功
            expect(result.success).toBe(true)
            expect(result.updatedDriver).toBeDefined()
            
            // 查询司机的仓库列表
            const driverWarehouses = getDriverWarehouses(result.updatedDriver!)
            
            // 验证仓库列表为空
            expect(driverWarehouses).toHaveLength(0)
            
            // 验证 warehouse_id 为 null
            expect(result.updatedDriver!.warehouse_id).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 4.4: isDriverInWarehouse 应正确反映分配关系', () => {
      /**
       * 属性：对于任意成功的仓库分配操作，
       * isDriverInWarehouse(updatedDriver, targetWarehouseId) 应返回 true
       * 
       * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
       * **Validates: Requirements 1.5**
       */
      fc.assert(
        fc.property(
          driverArbitrary,
          warehouseListArbitrary,
          (driver, warehouses) => {
            const targetWarehouse = warehouses[0]
            const warehouseIds = [targetWarehouse.id]
            
            // 执行分配
            const result = executeWarehouseAssignment(driver, warehouseIds, warehouses)
            
            // 验证分配成功
            expect(result.success).toBe(true)
            
            // 验证 isDriverInWarehouse 返回 true
            const isInWarehouse = isDriverInWarehouse(result.updatedDriver!, targetWarehouse.id)
            expect(isInWarehouse).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 4.5: getDriversInWarehouse 应返回所有属于该仓库的司机', () => {
      /**
       * 属性：对于任意司机列表和仓库ID，
       * getDriversInWarehouse 返回的所有司机的 warehouse_id 都应等于该仓库ID
       * 
       * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
       * **Validates: Requirements 1.5**
       */
      fc.assert(
        fc.property(
          driverListArbitrary,
          warehouseIdArbitrary,
          (drivers, warehouseId) => {
            // 获取属于该仓库的司机
            const driversInWarehouse = getDriversInWarehouse(drivers, warehouseId)
            
            // 验证所有返回的司机都属于该仓库
            driversInWarehouse.forEach(d => {
              expect(d.warehouse_id).toBe(warehouseId)
            })
            
            // 验证返回的司机数量正确
            const expectedCount = drivers.filter(d => d.warehouse_id === warehouseId).length
            expect(driversInWarehouse.length).toBe(expectedCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 4.6: 分配操作不应改变司机的其他属性', () => {
      /**
       * 属性：对于任意司机和任意有效分配，
       * 分配后司机的 id、name、phone 应保持不变
       * 
       * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
       * **Validates: Requirements 1.5**
       */
      fc.assert(
        fc.property(
          driverArbitrary,
          warehouseListArbitrary,
          (driver, warehouses) => {
            const targetWarehouse = warehouses[0]
            const warehouseIds = [targetWarehouse.id]
            
            // 执行分配
            const result = executeWarehouseAssignment(driver, warehouseIds, warehouses)
            
            // 验证分配成功
            expect(result.success).toBe(true)
            expect(result.updatedDriver).toBeDefined()
            
            // 验证其他属性未变
            expect(result.updatedDriver!.id).toBe(driver.id)
            expect(result.updatedDriver!.name).toBe(driver.name)
            expect(result.updatedDriver!.phone).toBe(driver.phone)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 4.7: 分配到不存在的仓库应失败', () => {
      /**
       * 属性：对于任意司机和不在可用列表中的仓库ID，
       * 分配操作应失败
       * 
       * **Feature: manager-page-alignment, Property 4: 仓库分配关系正确性**
       * **Validates: Requirements 1.5**
       */
      fc.assert(
        fc.property(
          driverArbitrary,
          warehouseListArbitrary,
          warehouseIdArbitrary,
          (driver, warehouses, invalidWarehouseId) => {
            // 确保 invalidWarehouseId 不在可用仓库列表中
            const warehouseIds = warehouses.map(w => w.id)
            if (warehouseIds.includes(invalidWarehouseId)) {
              // 跳过这个测试用例
              return
            }
            
            // 尝试分配到不存在的仓库
            const result = executeWarehouseAssignment(driver, [invalidWarehouseId], warehouses)
            
            // 验证分配失败
            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
