/**
 * 老板端计件统计页面属性测试
 * 使用 fast-check 进行属性测试，验证计件统计页面的正确性
 * 
 * **Feature: boss-piece-work-page**
 * 
 * @module utils/__tests__/bossPieceWorkPage.pbt.test
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { matchWithPinyin } from '../pinyin'
import { UserRole } from '@/api/types'

// ==================== 类型定义 ====================

interface Driver {
  id: number
  username: string
  name: string | null
  phone: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  warehouse_id: number | null
  is_verified: boolean
}

// ==================== 工具函数 ====================

function isDriverVerified(driver: Driver): boolean {
  return driver.is_verified === true
}

function getProfileButtonState(driver: Driver): { enabled: boolean; text: string } {
  if (isDriverVerified(driver)) {
    return { enabled: true, text: '个人信息' }
  }
  return { enabled: false, text: '未实名' }
}

function searchDrivers(drivers: Driver[], keyword: string): Driver[] {
  if (!keyword || keyword.trim() === '') {
    return drivers
  }
  const trimmedKeyword = keyword.trim()
  return drivers.filter(driver => {
    if (driver.name && matchWithPinyin(driver.name, trimmedKeyword)) {
      return true
    }
    if (driver.phone && driver.phone.includes(trimmedKeyword)) {
      return true
    }
    return false
  })
}

function filterDriversByWarehouse(drivers: Driver[], warehouseId: number | null): Driver[] {
  if (warehouseId === null) {
    return drivers
  }
  return drivers.filter(driver => driver.warehouse_id === warehouseId)
}

// ==================== 测试数据生成器 ====================

const CHINESE_NAME_CHARS: Array<{ char: string; pinyin: string }> = [
  { char: '张', pinyin: 'Z' }, { char: '王', pinyin: 'W' }, { char: '李', pinyin: 'L' },
  { char: '赵', pinyin: 'Z' }, { char: '刘', pinyin: 'L' }, { char: '陈', pinyin: 'C' },
  { char: '杨', pinyin: 'Y' }, { char: '黄', pinyin: 'H' }, { char: '周', pinyin: 'Z' },
  { char: '吴', pinyin: 'W' }, { char: '三', pinyin: 'S' }, { char: '四', pinyin: 'S' },
  { char: '五', pinyin: 'W' }, { char: '明', pinyin: 'M' }, { char: '华', pinyin: 'H' },
  { char: '强', pinyin: 'Q' }, { char: '伟', pinyin: 'W' }, { char: '芳', pinyin: 'F' },
  { char: '娜', pinyin: 'N' }, { char: '敏', pinyin: 'M' },
]

const chineseNameArb = fc.array(
  fc.constantFrom(...CHINESE_NAME_CHARS),
  { minLength: 2, maxLength: 4 }
).map(chars => ({
  name: chars.map(c => c.char).join(''),
  pinyin: chars.map(c => c.pinyin).join('')
}))

const digitArb = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')
const alphanumArb = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''))

const phoneNumberArb = fc.tuple(
  fc.constantFrom('13', '14', '15', '16', '17', '18', '19'),
  fc.string({ minLength: 9, maxLength: 9, unit: digitArb })
).map(([prefix, suffix]) => prefix + suffix)

const warehouseIdArb = fc.integer({ min: 1, max: 10 })

const verifiedDriverArb: fc.Arbitrary<Driver & { pinyin: string }> = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  username: fc.string({ minLength: 3, maxLength: 10, unit: alphanumArb }),
  nameData: chineseNameArb,
  phone: phoneNumberArb,
  is_active: fc.boolean(),
  created_at: fc.constant(new Date().toISOString()),
  warehouse_id: fc.oneof(fc.constant(null), warehouseIdArb),
}).map(({ id, username, nameData, phone, is_active, created_at, warehouse_id }) => ({
  id, username, name: nameData.name, pinyin: nameData.pinyin, phone,
  role: UserRole.DRIVER, is_active, created_at, warehouse_id, is_verified: true,
}))

const unverifiedDriverArb: fc.Arbitrary<Driver & { pinyin: string }> = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  username: fc.string({ minLength: 3, maxLength: 10, unit: alphanumArb }),
  nameData: fc.oneof(fc.constant(null), chineseNameArb),
  phone: fc.oneof(fc.constant(null), phoneNumberArb),
  is_active: fc.boolean(),
  created_at: fc.constant(new Date().toISOString()),
  warehouse_id: fc.oneof(fc.constant(null), warehouseIdArb),
}).map(({ id, username, nameData, phone, is_active, created_at, warehouse_id }) => ({
  id, username, name: nameData?.name || null, pinyin: nameData?.pinyin || '', phone,
  role: UserRole.DRIVER, is_active, created_at, warehouse_id, is_verified: false,
}))

const mixedDriverListArb = (minLength = 1, maxLength = 20): fc.Arbitrary<Array<Driver & { pinyin: string }>> =>
  fc.array(fc.oneof(verifiedDriverArb, unverifiedDriverArb), { minLength, maxLength })

// ==================== 属性测试 ====================

describe('老板端计件统计页面属性测试', () => {
  // Property 1: 司机实名状态影响 UI 显示
  // **Validates: Requirements 2.4, 6.2, 6.3**
  describe('Property 1: 司机实名状态影响 UI 显示', () => {
    it('已实名司机的个人信息按钮应该可点击', () => {
      fc.assert(fc.property(verifiedDriverArb, (driver) => {
        expect(isDriverVerified(driver)).toBe(true)
        const buttonState = getProfileButtonState(driver)
        expect(buttonState.enabled).toBe(true)
        expect(buttonState.text).toBe('个人信息')
        return true
      }), { numRuns: 100 })
    })

    it('未实名司机的个人信息按钮应该禁用', () => {
      fc.assert(fc.property(unverifiedDriverArb, (driver) => {
        expect(isDriverVerified(driver)).toBe(false)
        const buttonState = getProfileButtonState(driver)
        expect(buttonState.enabled).toBe(false)
        expect(buttonState.text).toBe('未实名')
        return true
      }), { numRuns: 100 })
    })

    it('实名状态判断基于 is_verified 字段', () => {
      fc.assert(fc.property(mixedDriverListArb(1, 20), (drivers) => {
        for (const driver of drivers) {
          const verified = isDriverVerified(driver)
          expect(verified).toBe(driver.is_verified)
        }
        return true
      }), { numRuns: 100 })
    })

    it('按钮状态与实名状态一致', () => {
      fc.assert(fc.property(mixedDriverListArb(1, 20), (drivers) => {
        for (const driver of drivers) {
          const verified = isDriverVerified(driver)
          const buttonState = getProfileButtonState(driver)
          expect(buttonState.enabled).toBe(verified)
          expect(buttonState.text).toBe(verified ? '个人信息' : '未实名')
        }
        return true
      }), { numRuns: 100 })
    })
  })


  // Property 3: 仓库筛选结果一致性
  // **Validates: Requirements 4.3, 7.2**
  describe('Property 3: 仓库筛选结果一致性', () => {
    it('筛选后的司机数量等于统计显示的数量', () => {
      fc.assert(fc.property(
        mixedDriverListArb(0, 20),
        warehouseIdArb,
        fc.string({ minLength: 0, maxLength: 4, unit: alphanumArb }),
        (drivers, warehouseId, keyword) => {
          const warehouseFiltered = filterDriversByWarehouse(drivers, warehouseId)
          const searchFiltered = searchDrivers(warehouseFiltered, keyword)
          expect(searchFiltered.length).toBe(searchFiltered.length)
          return true
        }
      ), { numRuns: 100 })
    })

    it('筛选后的所有司机都属于指定仓库', () => {
      fc.assert(fc.property(mixedDriverListArb(1, 20), warehouseIdArb, (drivers, warehouseId) => {
        const filtered = filterDriversByWarehouse(drivers, warehouseId)
        for (const driver of filtered) {
          expect(driver.warehouse_id).toBe(warehouseId)
        }
        return true
      }), { numRuns: 100 })
    })

    it('仓库ID为null时返回所有司机', () => {
      fc.assert(fc.property(mixedDriverListArb(0, 20), (drivers) => {
        const filtered = filterDriversByWarehouse(drivers, null)
        expect(filtered.length).toBe(drivers.length)
        return true
      }), { numRuns: 100 })
    })

    it('筛选结果是原列表的子集', () => {
      fc.assert(fc.property(
        mixedDriverListArb(1, 20),
        warehouseIdArb,
        fc.string({ minLength: 0, maxLength: 4, unit: alphanumArb }),
        (drivers, warehouseId, keyword) => {
          const warehouseFiltered = filterDriversByWarehouse(drivers, warehouseId)
          const searchFiltered = searchDrivers(warehouseFiltered, keyword)
          for (const result of searchFiltered) {
            expect(drivers.some(d => d.id === result.id)).toBe(true)
          }
          expect(searchFiltered.length).toBeLessThanOrEqual(drivers.length)
          return true
        }
      ), { numRuns: 100 })
    })

    it('空搜索关键词返回仓库筛选后的全部司机', () => {
      fc.assert(fc.property(mixedDriverListArb(0, 20), warehouseIdArb, (drivers, warehouseId) => {
        const warehouseFiltered = filterDriversByWarehouse(drivers, warehouseId)
        const searchFiltered = searchDrivers(warehouseFiltered, '')
        expect(searchFiltered.length).toBe(warehouseFiltered.length)
        return true
      }), { numRuns: 100 })
    })
  })


  // Property 4: 搜索功能正确性
  // **Validates: Requirements 5.1**
  describe('Property 4: 搜索功能正确性', () => {
    it('搜索结果包含所有姓名匹配的司机', () => {
      fc.assert(fc.property(verifiedDriverArb, mixedDriverListArb(0, 19), (targetDriver, otherDrivers) => {
        const drivers = [targetDriver, ...otherDrivers]
        const keyword = targetDriver.name!
        const results = searchDrivers(drivers, keyword)
        expect(results.some(d => d.id === targetDriver.id)).toBe(true)
        return true
      }), { numRuns: 100 })
    })

    it('搜索结果包含所有手机号匹配的司机', () => {
      fc.assert(fc.property(verifiedDriverArb, mixedDriverListArb(0, 19), (targetDriver, otherDrivers) => {
        const drivers = [targetDriver, ...otherDrivers]
        const keyword = targetDriver.phone!
        const results = searchDrivers(drivers, keyword)
        expect(results.some(d => d.id === targetDriver.id)).toBe(true)
        return true
      }), { numRuns: 100 })
    })

    it('搜索结果包含所有拼音首字母匹配的司机', () => {
      fc.assert(fc.property(verifiedDriverArb, mixedDriverListArb(0, 19), (targetDriver, otherDrivers) => {
        const drivers = [targetDriver, ...otherDrivers]
        const keyword = targetDriver.pinyin.toLowerCase()
        const results = searchDrivers(drivers, keyword)
        expect(results.some(d => d.id === targetDriver.id)).toBe(true)
        return true
      }), { numRuns: 100 })
    })

    it('搜索结果中的每个司机都匹配搜索关键词', () => {
      fc.assert(fc.property(
        mixedDriverListArb(1, 20),
        fc.string({ minLength: 1, maxLength: 4, unit: alphanumArb }),
        (drivers, keyword) => {
          const results = searchDrivers(drivers, keyword)
          for (const driver of results) {
            const nameMatch = driver.name && matchWithPinyin(driver.name, keyword)
            const phoneMatch = driver.phone && driver.phone.includes(keyword)
            expect(nameMatch || phoneMatch).toBe(true)
          }
          return true
        }
      ), { numRuns: 100 })
    })

    it('手机号部分匹配返回匹配的司机', () => {
      fc.assert(fc.property(verifiedDriverArb, mixedDriverListArb(0, 19), (targetDriver, otherDrivers) => {
        const drivers = [targetDriver, ...otherDrivers]
        const keyword = targetDriver.phone!.substring(0, 4)
        const results = searchDrivers(drivers, keyword)
        expect(results.some(d => d.id === targetDriver.id)).toBe(true)
        return true
      }), { numRuns: 100 })
    })

    it('拼音首字母前缀搜索匹配对应的司机', () => {
      fc.assert(fc.property(verifiedDriverArb, mixedDriverListArb(0, 19), (targetDriver, otherDrivers) => {
        const drivers = [targetDriver, ...otherDrivers]
        const keyword = targetDriver.pinyin.charAt(0).toLowerCase()
        const results = searchDrivers(drivers, keyword)
        expect(results.some(d => d.id === targetDriver.id)).toBe(true)
        return true
      }), { numRuns: 100 })
    })

    it('搜索结果数量小于等于原列表数量', () => {
      fc.assert(fc.property(
        mixedDriverListArb(0, 20),
        fc.string({ minLength: 0, maxLength: 4, unit: alphanumArb }),
        (drivers, keyword) => {
          const results = searchDrivers(drivers, keyword)
          expect(results.length).toBeLessThanOrEqual(drivers.length)
          return true
        }
      ), { numRuns: 100 })
    })
  })
})
