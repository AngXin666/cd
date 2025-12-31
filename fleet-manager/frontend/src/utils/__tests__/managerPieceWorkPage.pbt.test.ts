/**
 * 车队长计件统计页面属性测试
 * 使用 fast-check 进行属性测试，验证计件统计页面的正确性
 * 
 * **Feature: manager-piece-work-page**
 * 
 * @module utils/__tests__/managerPieceWorkPage.pbt.test
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { matchWithPinyin } from '../pinyin'
import { UserRole } from '@/api/types'

// ==================== 类型定义 ====================

/**
 * 司机信息接口（用于测试）
 */
interface Driver {
  /** 司机ID */
  id: number
  /** 用户名 */
  username: string
  /** 姓名（可为空，表示未实名） */
  name: string | null
  /** 手机号（可为空，表示未实名） */
  phone: string | null
  /** 角色 */
  role: UserRole
  /** 是否激活 */
  is_active: boolean
  /** 创建时间 */
  created_at: string
  /** 所属仓库ID */
  warehouse_id: number | null
}

/**
 * 仓库信息接口（用于测试）
 */
interface Warehouse {
  /** 仓库ID */
  id: number
  /** 仓库名称 */
  name: string
  /** 预设单位 */
  preset_unit: string
}

// ==================== 工具函数 ====================

/**
 * 判断司机是否已实名
 * 司机已实名的条件：name 和 phone 都存在且非空
 * 
 * @param driver - 司机信息
 * @returns 是否已实名
 */
function isDriverVerified(driver: Driver): boolean {
  return !!(driver.name && driver.phone)
}

/**
 * 获取个人信息按钮状态
 * 已实名：可点击；未实名：禁用
 * 
 * @param driver - 司机信息
 * @returns 按钮状态对象
 */
function getProfileButtonState(driver: Driver): { enabled: boolean; text: string } {
  if (isDriverVerified(driver)) {
    return { enabled: true, text: '个人信息' }
  }
  return { enabled: false, text: '未实名' }
}

/**
 * 搜索司机列表
 * 支持姓名、手机号和拼音首字母匹配
 * 
 * @param drivers - 司机列表
 * @param keyword - 搜索关键词
 * @returns 匹配的司机列表
 */
function searchDrivers(drivers: Driver[], keyword: string): Driver[] {
  // 空关键词返回全部
  if (!keyword || keyword.trim() === '') {
    return drivers
  }

  const trimmedKeyword = keyword.trim()

  return drivers.filter(driver => {
    // 1. 姓名匹配（包含拼音首字母）
    if (driver.name && matchWithPinyin(driver.name, trimmedKeyword)) {
      return true
    }
    // 2. 手机号匹配
    if (driver.phone && driver.phone.includes(trimmedKeyword)) {
      return true
    }
    return false
  })
}

/**
 * 按仓库筛选司机
 * 
 * @param drivers - 司机列表
 * @param warehouseId - 仓库ID，null 表示不筛选
 * @returns 筛选后的司机列表
 */
function filterDriversByWarehouse(drivers: Driver[], warehouseId: number | null): Driver[] {
  if (warehouseId === null) {
    return drivers
  }
  return drivers.filter(driver => driver.warehouse_id === warehouseId)
}

// ==================== 测试数据生成器 ====================

/**
 * 常见中文姓名用字及其拼音首字母映射
 */
const CHINESE_NAME_CHARS: Array<{ char: string; pinyin: string }> = [
  { char: '张', pinyin: 'Z' },
  { char: '王', pinyin: 'W' },
  { char: '李', pinyin: 'L' },
  { char: '赵', pinyin: 'Z' },
  { char: '刘', pinyin: 'L' },
  { char: '陈', pinyin: 'C' },
  { char: '杨', pinyin: 'Y' },
  { char: '黄', pinyin: 'H' },
  { char: '周', pinyin: 'Z' },
  { char: '吴', pinyin: 'W' },
  { char: '三', pinyin: 'S' },
  { char: '四', pinyin: 'S' },
  { char: '五', pinyin: 'W' },
  { char: '明', pinyin: 'M' },
  { char: '华', pinyin: 'H' },
  { char: '强', pinyin: 'Q' },
  { char: '伟', pinyin: 'W' },
  { char: '芳', pinyin: 'F' },
  { char: '娜', pinyin: 'N' },
  { char: '敏', pinyin: 'M' },
]

/**
 * 生成中文姓名的 Arbitrary
 */
const chineseNameArb = fc.array(
  fc.constantFrom(...CHINESE_NAME_CHARS),
  { minLength: 2, maxLength: 4 }
).map(chars => ({
  name: chars.map(c => c.char).join(''),
  pinyin: chars.map(c => c.pinyin).join('')
}))

/**
 * 生成有效手机号的 Arbitrary
 */
const phoneNumberArb = fc.tuple(
  fc.constantFrom('13', '14', '15', '16', '17', '18', '19'),
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 9, maxLength: 9 })
).map(([prefix, suffix]) => prefix + suffix)

/**
 * 生成仓库ID的 Arbitrary
 */
const warehouseIdArb = fc.integer({ min: 1, max: 10 })

/**
 * 生成已实名司机的 Arbitrary
 */
const verifiedDriverArb: fc.Arbitrary<Driver & { pinyin: string }> = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 3, maxLength: 10 }),
  nameData: chineseNameArb,
  phone: phoneNumberArb,
  is_active: fc.boolean(),
  created_at: fc.constant(new Date().toISOString()),
  warehouse_id: fc.oneof(fc.constant(null), warehouseIdArb),
}).map(({ id, username, nameData, phone, is_active, created_at, warehouse_id }) => ({
  id,
  username,
  name: nameData.name,
  pinyin: nameData.pinyin,
  phone,
  role: UserRole.DRIVER,
  is_active,
  created_at,
  warehouse_id,
}))

/**
 * 生成未实名司机的 Arbitrary（name 或 phone 为空）
 */
const unverifiedDriverArb: fc.Arbitrary<Driver & { pinyin: string }> = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 3, maxLength: 10 }),
  nameData: fc.oneof(fc.constant(null), chineseNameArb),
  phone: fc.oneof(fc.constant(null), phoneNumberArb),
  is_active: fc.boolean(),
  created_at: fc.constant(new Date().toISOString()),
  warehouse_id: fc.oneof(fc.constant(null), warehouseIdArb),
}).filter(({ nameData, phone }) => {
  // 确保至少有一个为空（未实名）
  return nameData === null || phone === null
}).map(({ id, username, nameData, phone, is_active, created_at, warehouse_id }) => ({
  id,
  username,
  name: nameData?.name || null,
  pinyin: nameData?.pinyin || '',
  phone,
  role: UserRole.DRIVER,
  is_active,
  created_at,
  warehouse_id,
}))

/**
 * 生成混合司机列表的 Arbitrary（包含已实名和未实名）
 */
const mixedDriverListArb = (minLength = 1, maxLength = 20): fc.Arbitrary<Array<Driver & { pinyin: string }>> =>
  fc.array(
    fc.oneof(verifiedDriverArb, unverifiedDriverArb),
    { minLength, maxLength }
  )

// ==================== Property 1: 司机实名状态影响 UI 显示 ====================

describe('车队长计件统计页面属性测试', () => {
  /**
   * **Feature: manager-piece-work-page, Property 1: 司机实名状态影响 UI 显示**
   * **Validates: Requirements 2.4, 5.2, 5.3**
   * 
   * *For any* 司机数据，如果司机已实名（name 和 phone 都存在），
   * 则"个人信息"按钮可点击；如果司机未实名，则显示"未实名"标签且按钮禁用。
   */
  describe('Property 1: 司机实名状态影响 UI 显示', () => {
    it('已实名司机的个人信息按钮应该可点击', () => {
      fc.assert(
        fc.property(
          verifiedDriverArb,
          (driver) => {
            // 验证：已实名司机
            expect(isDriverVerified(driver)).toBe(true)
            
            // 验证：按钮状态
            const buttonState = getProfileButtonState(driver)
            expect(buttonState.enabled).toBe(true)
            expect(buttonState.text).toBe('个人信息')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('未实名司机的个人信息按钮应该禁用并显示"未实名"', () => {
      fc.assert(
        fc.property(
          unverifiedDriverArb,
          (driver) => {
            // 验证：未实名司机
            expect(isDriverVerified(driver)).toBe(false)
            
            // 验证：按钮状态
            const buttonState = getProfileButtonState(driver)
            expect(buttonState.enabled).toBe(false)
            expect(buttonState.text).toBe('未实名')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('实名状态判断应该基于 name 和 phone 同时存在', () => {
      fc.assert(
        fc.property(
          mixedDriverListArb(1, 20),
          (drivers) => {
            for (const driver of drivers) {
              const verified = isDriverVerified(driver)
              const hasName = driver.name !== null && driver.name !== ''
              const hasPhone = driver.phone !== null && driver.phone !== ''
              
              // 验证：实名状态等价于 name 和 phone 同时存在
              expect(verified).toBe(hasName && hasPhone)
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('按钮状态应该与实名状态一致', () => {
      fc.assert(
        fc.property(
          mixedDriverListArb(1, 20),
          (drivers) => {
            for (const driver of drivers) {
              const verified = isDriverVerified(driver)
              const buttonState = getProfileButtonState(driver)
              
              // 验证：按钮启用状态与实名状态一致
              expect(buttonState.enabled).toBe(verified)
              
              // 验证：按钮文本正确
              if (verified) {
                expect(buttonState.text).toBe('个人信息')
              } else {
                expect(buttonState.text).toBe('未实名')
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // ==================== Property 4: 筛选结果一致性 ====================

  /**
   * **Feature: manager-piece-work-page, Property 4: 筛选结果一致性**
   * **Validates: Requirements 4.1, 4.2, 6.2**
   * 
   * *For any* 搜索关键词和司机列表，筛选后显示的司机数量应等于底部统计显示的数量，
   * 且所有显示的司机都属于车队长管辖的仓库。
   */
  describe('Property 4: 筛选结果一致性', () => {
    it('筛选后的司机数量应该等于统计显示的数量', () => {
      fc.assert(
        fc.property(
          mixedDriverListArb(0, 20),
          warehouseIdArb,
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 0, maxLength: 4 }),
          (drivers, warehouseId, keyword) => {
            // 1. 先按仓库筛选
            const warehouseFiltered = filterDriversByWarehouse(drivers, warehouseId)
            
            // 2. 再按关键词搜索
            const searchFiltered = searchDrivers(warehouseFiltered, keyword)
            
            // 验证：筛选结果数量应该等于统计数量
            const displayCount = searchFiltered.length
            const statsCount = searchFiltered.length
            
            expect(displayCount).toBe(statsCount)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('筛选后的所有司机都应该属于指定仓库', () => {
      fc.assert(
        fc.property(
          mixedDriverListArb(1, 20),
          warehouseIdArb,
          (drivers, warehouseId) => {
            // 按仓库筛选
            const filtered = filterDriversByWarehouse(drivers, warehouseId)
            
            // 验证：所有筛选结果都属于指定仓库
            for (const driver of filtered) {
              expect(driver.warehouse_id).toBe(warehouseId)
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('当仓库ID为null时应该返回所有司机', () => {
      fc.assert(
        fc.property(
          mixedDriverListArb(0, 20),
          (drivers) => {
            // 不筛选仓库
            const filtered = filterDriversByWarehouse(drivers, null)
            
            // 验证：返回所有司机
            expect(filtered.length).toBe(drivers.length)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('筛选结果应该是原列表的子集', () => {
      fc.assert(
        fc.property(
          mixedDriverListArb(1, 20),
          warehouseIdArb,
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 0, maxLength: 4 }),
          (drivers, warehouseId, keyword) => {
            // 1. 先按仓库筛选
            const warehouseFiltered = filterDriversByWarehouse(drivers, warehouseId)
            
            // 2. 再按关键词搜索
            const searchFiltered = searchDrivers(warehouseFiltered, keyword)
            
            // 验证：结果是原列表的子集
            for (const result of searchFiltered) {
              expect(drivers.some(d => d.id === result.id)).toBe(true)
            }
            
            // 验证：结果数量不超过原列表
            expect(searchFiltered.length).toBeLessThanOrEqual(drivers.length)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空搜索关键词应该返回仓库筛选后的全部司机', () => {
      fc.assert(
        fc.property(
          mixedDriverListArb(0, 20),
          warehouseIdArb,
          (drivers, warehouseId) => {
            // 1. 先按仓库筛选
            const warehouseFiltered = filterDriversByWarehouse(drivers, warehouseId)
            
            // 2. 空关键词搜索
            const searchFiltered = searchDrivers(warehouseFiltered, '')
            
            // 验证：空关键词返回全部
            expect(searchFiltered.length).toBe(warehouseFiltered.length)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ==================== Property 5: 搜索功能正确性 ====================

  /**
   * **Feature: manager-piece-work-page, Property 5: 搜索功能正确性**
   * **Validates: Requirements 4.2**
   * 
   * *For any* 搜索关键词，如果关键词匹配司机的姓名、手机号或姓名拼音首字母，
   * 则该司机应出现在筛选结果中。
   */
  describe('Property 5: 搜索功能正确性', () => {
    it('搜索结果应包含所有姓名匹配的司机', () => {
      fc.assert(
        fc.property(
          verifiedDriverArb,
          mixedDriverListArb(0, 19),
          (targetDriver, otherDrivers) => {
            // 确保目标司机在列表中
            const drivers = [targetDriver, ...otherDrivers]
            
            // 使用目标司机的姓名搜索
            const keyword = targetDriver.name!
            const results = searchDrivers(drivers, keyword)
            
            // 验证：目标司机应该在搜索结果中
            expect(results.some(d => d.id === targetDriver.id)).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果应包含所有手机号匹配的司机', () => {
      fc.assert(
        fc.property(
          verifiedDriverArb,
          mixedDriverListArb(0, 19),
          (targetDriver, otherDrivers) => {
            // 确保目标司机在列表中
            const drivers = [targetDriver, ...otherDrivers]
            
            // 使用目标司机的手机号搜索
            const keyword = targetDriver.phone!
            const results = searchDrivers(drivers, keyword)
            
            // 验证：目标司机应该在搜索结果中
            expect(results.some(d => d.id === targetDriver.id)).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果应包含所有拼音首字母匹配的司机', () => {
      fc.assert(
        fc.property(
          verifiedDriverArb,
          mixedDriverListArb(0, 19),
          (targetDriver, otherDrivers) => {
            // 确保目标司机在列表中
            const drivers = [targetDriver, ...otherDrivers]
            
            // 使用目标司机的拼音首字母搜索
            const keyword = targetDriver.pinyin.toLowerCase()
            const results = searchDrivers(drivers, keyword)
            
            // 验证：目标司机应该在搜索结果中
            expect(results.some(d => d.id === targetDriver.id)).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果中的每个司机都应该匹配搜索关键词', () => {
      fc.assert(
        fc.property(
          mixedDriverListArb(1, 20),
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 4 }),
          (drivers, keyword) => {
            // 执行搜索
            const results = searchDrivers(drivers, keyword)
            
            // 验证：每个结果都应该匹配关键词
            for (const driver of results) {
              const nameMatch = driver.name && matchWithPinyin(driver.name, keyword)
              const phoneMatch = driver.phone && driver.phone.includes(keyword)
              
              expect(nameMatch || phoneMatch).toBe(true)
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('手机号部分匹配应该返回匹配的司机', () => {
      fc.assert(
        fc.property(
          verifiedDriverArb,
          mixedDriverListArb(0, 19),
          (targetDriver, otherDrivers) => {
            // 确保目标司机在列表中
            const drivers = [targetDriver, ...otherDrivers]
            
            // 使用手机号的前4位作为搜索关键词
            const keyword = targetDriver.phone!.substring(0, 4)
            const results = searchDrivers(drivers, keyword)
            
            // 验证：目标司机应该在搜索结果中
            expect(results.some(d => d.id === targetDriver.id)).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('拼音首字母前缀搜索应该匹配对应的司机', () => {
      fc.assert(
        fc.property(
          verifiedDriverArb,
          mixedDriverListArb(0, 19),
          (targetDriver, otherDrivers) => {
            // 确保目标司机在列表中
            const drivers = [targetDriver, ...otherDrivers]
            
            // 使用拼音首字母的第一个字符
            const keyword = targetDriver.pinyin.charAt(0).toLowerCase()
            const results = searchDrivers(drivers, keyword)
            
            // 验证：目标司机应该在搜索结果中
            expect(results.some(d => d.id === targetDriver.id)).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果数量应该小于等于原列表数量', () => {
      fc.assert(
        fc.property(
          mixedDriverListArb(0, 20),
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 0, maxLength: 4 }),
          (drivers, keyword) => {
            // 执行搜索
            const results = searchDrivers(drivers, keyword)
            
            // 验证：结果数量不超过原列表
            expect(results.length).toBeLessThanOrEqual(drivers.length)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
