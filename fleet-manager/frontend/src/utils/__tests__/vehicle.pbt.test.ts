/**
 * 车辆验证功能属性测试
 * 使用 fast-check 进行属性测试，验证车辆验证逻辑的正确性
 * 
 * @module utils/__tests__/vehicle.pbt.test
 * 
 * **Feature: vehicle-validation**
 * **Validates: Requirements 1.1-1.6, 2.1-2.4, 3.1-3.4, 4.1-4.4, 5.1-5.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  isValidVehicle,
  canReturnVehicle,
  isActiveVehicle,
  getValidVehicles,
  getValidPlateNumbers,
} from '../vehicle'
import { VehicleStatus } from '@/api/types'
import type { Vehicle } from '@/api/types'

// ==================== 生成器定义 ====================

/**
 * 有效状态生成器（ACTIVE 或 PICKED_UP）
 */
const validStatusArbitrary = fc.constantFrom(
  VehicleStatus.ACTIVE,
  VehicleStatus.PICKED_UP
)

/**
 * 无效状态生成器（RETURNED 或 REVIEWING）
 */
const invalidStatusArbitrary = fc.constantFrom(
  VehicleStatus.RETURNED,
  VehicleStatus.REVIEWING
)

/**
 * 所有状态生成器
 */
const allStatusArbitrary = fc.constantFrom(
  VehicleStatus.ACTIVE,
  VehicleStatus.PICKED_UP,
  VehicleStatus.RETURNED,
  VehicleStatus.REVIEWING
)


/**
 * 有效车牌号生成器（非空、非纯空白）
 * 生成中国车牌号格式：省份简称 + 字母 + 5-6位字母数字
 */
const validLicensePlateArbitrary = fc.tuple(
  fc.constantFrom('京', '沪', '粤', '苏', '浙', '鲁', '川', '渝'),
  fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F'),
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 5, maxLength: 6 })
).map(([province, letter, rest]) => `${province}${letter}${rest}`)

/**
 * 无效车牌号生成器（空字符串或纯空白）
 */
const invalidLicensePlateArbitrary = fc.oneof(
  fc.constant(''),
  fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
)

/**
 * 审核状态生成器
 */
const reviewStatusArbitrary = fc.constantFrom(
  'drafting' as const,
  'pending_review' as const,
  'need_supplement' as const,
  'approved' as const
)

/**
 * 用户ID生成器
 */
const userIdArbitrary = fc.integer({ min: 1, max: 1000 })

/**
 * 还车时间生成器（null 或 ISO 日期字符串）
 */
const returnTimeArbitrary = fc.oneof(
  fc.constant(null),
  fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .map(d => d.toISOString())
)

/**
 * 生成完整的车辆对象
 */
const vehicleArbitrary = (options?: {
  licensePlate?: fc.Arbitrary<string>;
  status?: fc.Arbitrary<VehicleStatus>;
  returnTime?: fc.Arbitrary<string | null>;
  reviewStatus?: fc.Arbitrary<'drafting' | 'pending_review' | 'need_supplement' | 'approved'>;
}): fc.Arbitrary<Vehicle> => {
  return fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    user_id: userIdArbitrary,
    license_plate: options?.licensePlate ?? validLicensePlateArbitrary,
    brand: fc.option(fc.string(), { nil: null }),
    model: fc.option(fc.string(), { nil: null }),
    color: fc.option(fc.string(), { nil: null }),
    status: options?.status ?? allStatusArbitrary,
    ownership_type: fc.option(fc.string(), { nil: null }),
    created_at: fc.date().map(d => d.toISOString()),
    updated_at: fc.date().map(d => d.toISOString()),
    return_time: options?.returnTime ?? returnTimeArbitrary,
    review_status: options?.reviewStatus ?? reviewStatusArbitrary,
  }) as fc.Arbitrary<Vehicle>
}


/**
 * 生成有效车辆（有效车牌 + 有效状态）
 */
const validVehicleArbitrary = vehicleArbitrary({
  licensePlate: validLicensePlateArbitrary,
  status: validStatusArbitrary,
})

/**
 * 生成无效车牌的车辆
 */
const invalidPlateVehicleArbitrary = vehicleArbitrary({
  licensePlate: invalidLicensePlateArbitrary,
})

/**
 * 生成无效状态的车辆
 */
const invalidStatusVehicleArbitrary = vehicleArbitrary({
  licensePlate: validLicensePlateArbitrary,
  status: invalidStatusArbitrary,
})

/**
 * 生成可还车的车辆
 */
const returnableVehicleArbitrary = vehicleArbitrary({
  licensePlate: validLicensePlateArbitrary,
  status: validStatusArbitrary,
  returnTime: fc.constant(null),
  reviewStatus: fc.constant('approved' as const),
})

/**
 * 生成车辆列表
 */
const vehicleListArbitrary = fc.array(vehicleArbitrary(), { minLength: 0, maxLength: 20 })

// ==================== 测试套件 ====================

describe('车辆验证功能属性测试', () => {
  describe('isValidVehicle - 有效车辆判断', () => {
    /**
     * **Feature: vehicle-validation, Property 1: 有效车辆判断正确性**
     * **Validates: Requirements 1.1, 1.2**
     * 
     * 属性：对于任意有效车牌 + 有效状态的车辆，isValidVehicle 应返回 true
     */
    it('Property 1: 有效车牌 + 有效状态 → true', () => {
      fc.assert(
        fc.property(validVehicleArbitrary, (vehicle) => {
          const result = isValidVehicle(vehicle)
          expect(result).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 2: 无效车牌必定无效**
     * **Validates: Requirements 1.3, 1.4**
     * 
     * 属性：对于任意空或纯空白车牌的车辆，isValidVehicle 应返回 false
     */
    it('Property 2: 无效车牌 → false（无论状态如何）', () => {
      fc.assert(
        fc.property(invalidPlateVehicleArbitrary, (vehicle) => {
          const result = isValidVehicle(vehicle)
          expect(result).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 3: 无效状态必定无效**
     * **Validates: Requirements 1.5, 1.6**
     * 
     * 属性：对于任意 RETURNED 或 REVIEWING 状态的车辆，isValidVehicle 应返回 false
     */
    it('Property 3: 无效状态 → false（无论车牌如何）', () => {
      fc.assert(
        fc.property(invalidStatusVehicleArbitrary, (vehicle) => {
          const result = isValidVehicle(vehicle)
          expect(result).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })


  describe('canReturnVehicle - 可还车判断', () => {
    /**
     * **Feature: vehicle-validation, Property 4: 可还车条件完整性**
     * **Validates: Requirements 2.1**
     * 
     * 属性：有效车辆 + 未还车 + 审核通过 → canReturnVehicle 返回 true
     */
    it('Property 4: 满足所有条件 → true', () => {
      fc.assert(
        fc.property(returnableVehicleArbitrary, (vehicle) => {
          const result = canReturnVehicle(vehicle)
          expect(result).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 5: 无效车辆不可还车**
     * **Validates: Requirements 2.2**
     * 
     * 属性：无效车辆（无效车牌或无效状态）→ canReturnVehicle 返回 false
     */
    it('Property 5: 无效车辆 → false', () => {
      fc.assert(
        fc.property(
          fc.oneof(invalidPlateVehicleArbitrary, invalidStatusVehicleArbitrary),
          (vehicle) => {
            const result = canReturnVehicle(vehicle)
            expect(result).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 4.1: 已还车不可再还**
     * **Validates: Requirements 2.3**
     * 
     * 属性：已有还车时间的车辆 → canReturnVehicle 返回 false
     */
    it('Property 4.1: 已还车 → false', () => {
      const alreadyReturnedVehicle = vehicleArbitrary({
        licensePlate: validLicensePlateArbitrary,
        status: validStatusArbitrary,
        returnTime: fc.date().map(d => d.toISOString()),
        reviewStatus: fc.constant('approved' as const),
      })

      fc.assert(
        fc.property(alreadyReturnedVehicle, (vehicle) => {
          const result = canReturnVehicle(vehicle)
          expect(result).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 4.2: 未审核通过不可还车**
     * **Validates: Requirements 2.4**
     * 
     * 属性：审核状态不是 approved → canReturnVehicle 返回 false
     */
    it('Property 4.2: 未审核通过 → false', () => {
      const notApprovedVehicle = vehicleArbitrary({
        licensePlate: validLicensePlateArbitrary,
        status: validStatusArbitrary,
        returnTime: fc.constant(null),
        reviewStatus: fc.constantFrom('drafting' as const, 'pending_review' as const, 'need_supplement' as const),
      })

      fc.assert(
        fc.property(notApprovedVehicle, (vehicle) => {
          const result = canReturnVehicle(vehicle)
          expect(result).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })


  describe('isActiveVehicle - 活跃车辆判断', () => {
    /**
     * **Feature: vehicle-validation, Property 6: 活跃车辆判断正确性**
     * **Validates: Requirements 3.1, 3.2**
     * 
     * 属性：有效状态 + 未还车 → isActiveVehicle 返回 true
     */
    it('Property 6: 有效状态 + 未还车 → true', () => {
      const activeVehicle = vehicleArbitrary({
        status: validStatusArbitrary,
        returnTime: fc.constant(null),
      })

      fc.assert(
        fc.property(activeVehicle, (vehicle) => {
          const result = isActiveVehicle(vehicle)
          expect(result).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 6.1: 已还车不是活跃状态**
     * **Validates: Requirements 3.3**
     * 
     * 属性：已有还车时间 → isActiveVehicle 返回 false
     */
    it('Property 6.1: 已还车 → false', () => {
      const returnedVehicle = vehicleArbitrary({
        status: validStatusArbitrary,
        returnTime: fc.date().map(d => d.toISOString()),
      })

      fc.assert(
        fc.property(returnedVehicle, (vehicle) => {
          const result = isActiveVehicle(vehicle)
          expect(result).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 6.2: 无效状态不是活跃状态**
     * **Validates: Requirements 3.4**
     * 
     * 属性：RETURNED 或 REVIEWING 状态 → isActiveVehicle 返回 false
     */
    it('Property 6.2: 无效状态 → false', () => {
      const inactiveVehicle = vehicleArbitrary({
        status: invalidStatusArbitrary,
        returnTime: fc.constant(null),
      })

      fc.assert(
        fc.property(inactiveVehicle, (vehicle) => {
          const result = isActiveVehicle(vehicle)
          expect(result).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })


  describe('getValidVehicles - 获取有效车辆列表', () => {
    /**
     * **Feature: vehicle-validation, Property 7: 有效车辆列表过滤正确性**
     * **Validates: Requirements 4.1, 4.3**
     * 
     * 属性：返回列表中的每个车辆都满足 isValidVehicle
     */
    it('Property 7: 返回列表中每个车辆都是有效的', () => {
      fc.assert(
        fc.property(vehicleListArbitrary, (vehicles) => {
          const result = getValidVehicles(vehicles)
          
          // 验证每个返回的车辆都是有效的
          for (const vehicle of result) {
            expect(isValidVehicle(vehicle)).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 7.1: 按用户ID过滤正确**
     * **Validates: Requirements 4.1**
     * 
     * 属性：指定用户ID时，返回列表中每个车辆的 user_id 都匹配
     */
    it('Property 7.1: 按用户ID过滤正确', () => {
      fc.assert(
        fc.property(vehicleListArbitrary, userIdArbitrary, (vehicles, userId) => {
          const result = getValidVehicles(vehicles, userId)
          
          // 验证每个返回的车辆都属于指定用户
          for (const vehicle of result) {
            expect(vehicle.user_id).toBe(userId)
            expect(isValidVehicle(vehicle)).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 8: 过滤不增加元素**
     * **Validates: Requirements 4.4**
     * 
     * 属性：返回列表长度 <= 原列表长度
     */
    it('Property 8: 过滤不增加元素', () => {
      fc.assert(
        fc.property(vehicleListArbitrary, (vehicles) => {
          const result = getValidVehicles(vehicles)
          expect(result.length).toBeLessThanOrEqual(vehicles.length)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 7.2: 不传用户ID返回所有有效车辆**
     * **Validates: Requirements 4.2**
     * 
     * 属性：不传用户ID时，返回所有有效车辆
     */
    it('Property 7.2: 不传用户ID返回所有有效车辆', () => {
      fc.assert(
        fc.property(vehicleListArbitrary, (vehicles) => {
          const result = getValidVehicles(vehicles)
          const expectedCount = vehicles.filter(v => isValidVehicle(v)).length
          
          expect(result.length).toBe(expectedCount)
        }),
        { numRuns: 100 }
      )
    })
  })


  describe('getValidPlateNumbers - 获取有效车牌号列表', () => {
    /**
     * **Feature: vehicle-validation, Property 9: 车牌号列表一致性**
     * **Validates: Requirements 5.1, 5.2, 5.3**
     * 
     * 属性：返回列表长度等于 getValidVehicles 返回的列表长度
     */
    it('Property 9: 与 getValidVehicles 长度一致', () => {
      fc.assert(
        fc.property(vehicleListArbitrary, userIdArbitrary, (vehicles, userId) => {
          const plates = getValidPlateNumbers(vehicles, userId)
          const validVehicles = getValidVehicles(vehicles, userId)
          
          expect(plates.length).toBe(validVehicles.length)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 9.1: 返回的车牌号都是非空字符串**
     * **Validates: Requirements 5.2**
     * 
     * 属性：返回列表中每个车牌号都是非空字符串
     */
    it('Property 9.1: 返回的车牌号都是非空字符串', () => {
      fc.assert(
        fc.property(vehicleListArbitrary, userIdArbitrary, (vehicles, userId) => {
          const plates = getValidPlateNumbers(vehicles, userId)
          
          for (const plate of plates) {
            expect(typeof plate).toBe('string')
            expect(plate.length).toBeGreaterThan(0)
            expect(plate.trim().length).toBeGreaterThan(0)
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: vehicle-validation, Property 9.2: 车牌号来自有效车辆**
     * **Validates: Requirements 5.1**
     * 
     * 属性：返回的每个车牌号都来自有效车辆列表
     */
    it('Property 9.2: 车牌号来自有效车辆', () => {
      fc.assert(
        fc.property(vehicleListArbitrary, userIdArbitrary, (vehicles, userId) => {
          const plates = getValidPlateNumbers(vehicles, userId)
          const validVehicles = getValidVehicles(vehicles, userId)
          const validPlates = validVehicles.map(v => v.license_plate)
          
          // 验证每个返回的车牌号都在有效车辆列表中
          for (const plate of plates) {
            expect(validPlates).toContain(plate)
          }
        }),
        { numRuns: 100 }
      )
    })
  })


  describe('边界条件测试', () => {
    /**
     * 边界测试：空车辆列表
     */
    it('边界：空列表返回空数组', () => {
      const result = getValidVehicles([])
      expect(result).toEqual([])
      
      const plates = getValidPlateNumbers([], 1)
      expect(plates).toEqual([])
    })

    /**
     * 边界测试：单元素列表
     */
    it('边界：单元素有效车辆列表', () => {
      const vehicle: Vehicle = {
        id: 1,
        user_id: 1,
        license_plate: '京A12345',
        brand: null,
        model: null,
        color: null,
        status: VehicleStatus.ACTIVE,
        ownership_type: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      
      const result = getValidVehicles([vehicle], 1)
      expect(result.length).toBe(1)
      expect(result[0]).toEqual(vehicle)
    })

    /**
     * 边界测试：所有车辆都无效
     */
    it('边界：所有车辆都无效时返回空数组', () => {
      const vehicles: Vehicle[] = [
        {
          id: 1,
          user_id: 1,
          license_plate: '',
          brand: null,
          model: null,
          color: null,
          status: VehicleStatus.ACTIVE,
          ownership_type: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          user_id: 1,
          license_plate: '京A12345',
          brand: null,
          model: null,
          color: null,
          status: VehicleStatus.RETURNED,
          ownership_type: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]
      
      const result = getValidVehicles(vehicles)
      expect(result.length).toBe(0)
    })

    /**
     * 边界测试：纯空白车牌号
     */
    it('边界：纯空白车牌号被视为无效', () => {
      const vehicle: Vehicle = {
        id: 1,
        user_id: 1,
        license_plate: '   \t\n  ',
        brand: null,
        model: null,
        color: null,
        status: VehicleStatus.ACTIVE,
        ownership_type: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      
      expect(isValidVehicle(vehicle)).toBe(false)
    })
  })
})
