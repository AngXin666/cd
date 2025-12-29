/**
 * 搜索匹配属性测试
 * 使用 fast-check 进行属性测试，验证搜索匹配的正确性
 * 
 * **Feature: manager-page-alignment, Property 2: 搜索匹配正确性**
 * **Validates: Requirements 1.6**
 * 
 * @module utils/__tests__/searchMatch.pbt.test
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { matchWithPinyin, getPinyinFirstLetters, searchWithPinyin } from '../pinyin'

// ==================== 类型定义 ====================

/**
 * 司机信息接口（用于测试）
 */
interface Driver {
  /** 司机ID */
  id: number
  /** 姓名 */
  name: string
  /** 手机号 */
  phone: string | null
}

// ==================== 测试数据生成器 ====================

/**
 * 常见中文姓名用字及其拼音首字母映射
 * 这些字符必须在 pinyin.ts 的 PINYIN_MAP 中有定义
 */
const CHINESE_NAME_CHARS: Array<{ char: string; pinyin: string }> = [
  // 常见姓氏
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
  { char: '徐', pinyin: 'X' },
  { char: '孙', pinyin: 'S' },
  { char: '马', pinyin: 'M' },
  { char: '朱', pinyin: 'Z' },
  { char: '胡', pinyin: 'H' },
  { char: '郭', pinyin: 'G' },
  { char: '何', pinyin: 'H' },
  { char: '高', pinyin: 'G' },
  { char: '林', pinyin: 'L' },
  { char: '罗', pinyin: 'L' },
  // 常见名字用字
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
  { char: '静', pinyin: 'J' },
  { char: '丽', pinyin: 'L' },
  { char: '军', pinyin: 'J' },
  { char: '勇', pinyin: 'Y' },
  { char: '杰', pinyin: 'J' },
  { char: '涛', pinyin: 'T' },
  { char: '超', pinyin: 'C' },
  { char: '秀', pinyin: 'X' },
  { char: '英', pinyin: 'Y' },
  { char: '兰', pinyin: 'L' },
]

/**
 * 生成中文姓名的 Arbitrary
 * 生成 2-4 个字符的中文姓名及其拼音首字母
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
 * 中国手机号格式：1开头的11位数字
 */
const phoneNumberArb = fc.tuple(
  fc.constantFrom('13', '14', '15', '16', '17', '18', '19'),
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 9, maxLength: 9 })
).map(([prefix, suffix]) => prefix + suffix)

/**
 * 生成司机信息的 Arbitrary
 */
const driverArb: fc.Arbitrary<Driver & { pinyin: string }> = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  nameData: chineseNameArb,
  phone: fc.oneof(fc.constant(null), phoneNumberArb),
}).map(({ id, nameData, phone }) => ({
  id,
  name: nameData.name,
  pinyin: nameData.pinyin,
  phone,
}))

/**
 * 生成司机列表的 Arbitrary
 */
const driverListArb = (minLength = 0, maxLength = 20): fc.Arbitrary<Array<Driver & { pinyin: string }>> =>
  fc.array(driverArb, { minLength, maxLength })

// ==================== 搜索函数实现 ====================

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
    if (matchWithPinyin(driver.name, trimmedKeyword)) {
      return true
    }
    // 2. 手机号匹配
    if (driver.phone && driver.phone.includes(trimmedKeyword)) {
      return true
    }
    return false
  })
}

// ==================== Property 2: 搜索匹配正确性 ====================

describe('搜索匹配属性测试', () => {
  /**
   * **Feature: manager-page-alignment, Property 2: 搜索匹配正确性**
   * **Validates: Requirements 1.6**
   * 
   * *For any* 搜索关键词和司机列表，搜索结果应包含所有姓名、手机号或拼音首字母匹配的司机。
   */
  describe('Property 2: 搜索匹配正确性', () => {
    it('搜索结果应包含所有姓名匹配的司机', () => {
      fc.assert(
        fc.property(
          driverListArb(1, 20),
          (drivers) => {
            // 随机选择一个司机的姓名作为搜索关键词
            const targetDriver = drivers[0]
            const keyword = targetDriver.name

            // 执行搜索
            const results = searchDrivers(drivers, keyword)

            // 验证：目标司机应该在搜索结果中
            return results.some(d => d.id === targetDriver.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果应包含所有手机号匹配的司机', () => {
      fc.assert(
        fc.property(
          driverListArb(1, 20),
          (drivers) => {
            // 找到有手机号的司机
            const driversWithPhone = drivers.filter(d => d.phone !== null)
            if (driversWithPhone.length === 0) {
              return true // 没有手机号的司机，跳过测试
            }

            const targetDriver = driversWithPhone[0]
            const keyword = targetDriver.phone!

            // 执行搜索
            const results = searchDrivers(drivers, keyword)

            // 验证：目标司机应该在搜索结果中
            return results.some(d => d.id === targetDriver.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果应包含所有拼音首字母匹配的司机', () => {
      fc.assert(
        fc.property(
          driverListArb(1, 20),
          (drivers) => {
            // 随机选择一个司机的拼音首字母作为搜索关键词
            const targetDriver = drivers[0]
            const keyword = targetDriver.pinyin.toLowerCase()

            // 执行搜索
            const results = searchDrivers(drivers, keyword)

            // 验证：目标司机应该在搜索结果中
            return results.some(d => d.id === targetDriver.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果中的每个司机都应该匹配搜索关键词', () => {
      fc.assert(
        fc.property(
          driverListArb(1, 20),
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 4 }),
          (drivers, keyword) => {
            // 执行搜索
            const results = searchDrivers(drivers, keyword)

            // 验证：每个结果都应该匹配关键词
            return results.every(driver => {
              // 姓名匹配（包含拼音首字母）
              if (matchWithPinyin(driver.name, keyword)) {
                return true
              }
              // 手机号匹配
              if (driver.phone && driver.phone.includes(keyword)) {
                return true
              }
              return false
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空关键词应该返回全部司机', () => {
      fc.assert(
        fc.property(
          driverListArb(0, 20),
          (drivers) => {
            // 空关键词搜索
            const resultsEmpty = searchDrivers(drivers, '')
            const resultsWhitespace = searchDrivers(drivers, '   ')

            // 验证：应该返回全部司机
            return resultsEmpty.length === drivers.length &&
                   resultsWhitespace.length === drivers.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果应该是原列表的子集', () => {
      fc.assert(
        fc.property(
          driverListArb(1, 20),
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 4 }),
          (drivers, keyword) => {
            // 执行搜索
            const results = searchDrivers(drivers, keyword)

            // 验证：结果应该是原列表的子集
            return results.every(result =>
              drivers.some(driver => driver.id === result.id)
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('搜索结果数量应该小于等于原列表数量', () => {
      fc.assert(
        fc.property(
          driverListArb(0, 20),
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 0, maxLength: 4 }),
          (drivers, keyword) => {
            // 执行搜索
            const results = searchDrivers(drivers, keyword)

            // 验证：结果数量不超过原列表
            return results.length <= drivers.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('姓名子串搜索应该匹配包含该子串的司机', () => {
      fc.assert(
        fc.property(
          driverListArb(1, 20),
          (drivers) => {
            // 随机选择一个司机的姓名的第一个字符作为搜索关键词
            const targetDriver = drivers[0]
            const keyword = targetDriver.name.charAt(0)

            // 执行搜索
            const results = searchDrivers(drivers, keyword)

            // 验证：目标司机应该在搜索结果中
            return results.some(d => d.id === targetDriver.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('手机号部分匹配应该返回匹配的司机', () => {
      fc.assert(
        fc.property(
          driverListArb(1, 20),
          (drivers) => {
            // 找到有手机号的司机
            const driversWithPhone = drivers.filter(d => d.phone !== null)
            if (driversWithPhone.length === 0) {
              return true // 没有手机号的司机，跳过测试
            }

            const targetDriver = driversWithPhone[0]
            // 使用手机号的前4位作为搜索关键词
            const keyword = targetDriver.phone!.substring(0, 4)

            // 执行搜索
            const results = searchDrivers(drivers, keyword)

            // 验证：目标司机应该在搜索结果中
            return results.some(d => d.id === targetDriver.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('拼音首字母前缀搜索应该匹配对应的司机', () => {
      fc.assert(
        fc.property(
          driverListArb(1, 20),
          (drivers) => {
            // 随机选择一个司机的拼音首字母前缀作为搜索关键词
            const targetDriver = drivers[0]
            const fullPinyin = targetDriver.pinyin
            // 使用拼音首字母的第一个字符
            const keyword = fullPinyin.charAt(0).toLowerCase()

            // 执行搜索
            const results = searchDrivers(drivers, keyword)

            // 验证：目标司机应该在搜索结果中
            return results.some(d => d.id === targetDriver.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('不匹配的关键词应该返回空结果或不包含不匹配的司机', () => {
      fc.assert(
        fc.property(
          driverListArb(1, 20),
          (drivers) => {
            // 使用一个不太可能匹配的关键词
            const keyword = 'xyz999'

            // 执行搜索
            const results = searchDrivers(drivers, keyword)

            // 验证：结果中的每个司机都应该匹配关键词
            return results.every(driver => {
              if (matchWithPinyin(driver.name, keyword)) {
                return true
              }
              if (driver.phone && driver.phone.includes(keyword)) {
                return true
              }
              return false
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== 具体示例测试 ====================

describe('搜索匹配示例测试', () => {
  const testDrivers: Driver[] = [
    { id: 1, name: '张三', phone: '13800138001' },
    { id: 2, name: '李四', phone: '13900139002' },
    { id: 3, name: '王五', phone: '15000150003' },
    { id: 4, name: '赵六', phone: null },
    { id: 5, name: '张明华', phone: '18600186005' },
  ]

  it('搜索"张"应该返回所有姓张的司机', () => {
    const results = searchDrivers(testDrivers, '张')
    expect(results.length).toBe(2)
    expect(results.map(d => d.id)).toContain(1)
    expect(results.map(d => d.id)).toContain(5)
  })

  it('搜索"zs"应该返回张三', () => {
    const results = searchDrivers(testDrivers, 'zs')
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(1)
  })

  it('搜索"ZS"（大写）应该返回张三', () => {
    const results = searchDrivers(testDrivers, 'ZS')
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(1)
  })

  it('搜索"138"应该返回手机号包含138的司机', () => {
    const results = searchDrivers(testDrivers, '138')
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(1)
  })

  it('搜索"13800138001"应该返回精确匹配的司机', () => {
    const results = searchDrivers(testDrivers, '13800138001')
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(1)
  })

  it('搜索空字符串应该返回全部司机', () => {
    const results = searchDrivers(testDrivers, '')
    expect(results.length).toBe(5)
  })

  it('搜索"zmh"应该返回张明华', () => {
    const results = searchDrivers(testDrivers, 'zmh')
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(5)
  })

  it('搜索"xyz"应该返回空结果', () => {
    const results = searchDrivers(testDrivers, 'xyz')
    expect(results.length).toBe(0)
  })

  it('搜索"ls"应该返回李四', () => {
    const results = searchDrivers(testDrivers, 'ls')
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(2)
  })

  it('搜索"ww"应该返回王五', () => {
    const results = searchDrivers(testDrivers, 'ww')
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(3)
  })
})
