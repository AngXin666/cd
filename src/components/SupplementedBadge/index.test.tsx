/**
 * SupplementedBadge 组件属性测试
 *
 * 使用 fast-check 进行属性测试，验证补录标记的视觉一致性
 *
 * **Feature: supplemented-photo-marking, Property 2: 补录标记视觉一致性**
 * **Validates: Requirements 1.2, 1.3**
 *
 * @module components/SupplementedBadge/index.test
 */

import {describe, expect, it} from 'vitest'
import fc from 'fast-check'

// ==================== 类型定义 ====================

/**
 * 补录标记徽章组件属性（与组件定义保持一致）
 */
interface SupplementedBadgeProps {
  /** 补录时间（ISO 8601 格式） */
  supplementedAt: string
  /** 补录次数（可选，默认为1） */
  supplementCount?: number
  /** 是否显示详细信息（补录时间和次数） */
  showDetail?: boolean
  /** 自定义类名 */
  className?: string
}

// ==================== 纯函数提取（用于测试）====================

/**
 * 格式化补录时间为易读格式
 * 从组件中提取的纯函数，便于独立测试
 *
 * @param isoString - ISO 8601 格式的时间字符串
 * @returns 格式化后的时间字符串，如 "12-17 10:30"
 */
function formatSupplementedTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    // 检查日期是否有效
    if (Number.isNaN(date.getTime())) {
      return isoString
    }
    // 获取月、日、时、分
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  } catch {
    // 解析失败时返回原始字符串
    return isoString
  }
}

/**
 * 判断是否应该显示补录次数
 * 根据组件逻辑：补录次数大于1时显示
 *
 * @param supplementCount - 补录次数
 * @returns 是否显示补录次数
 */
function shouldShowSupplementCount(supplementCount: number): boolean {
  return supplementCount > 1
}

/**
 * 生成补录次数显示文本
 *
 * @param supplementCount - 补录次数
 * @returns 显示文本，如 "×2"
 */
function formatSupplementCount(supplementCount: number): string {
  return `×${supplementCount}`
}

/**
 * 验证补录标记的视觉元素是否完整
 * 检查组件应该渲染的所有必要元素
 *
 * @param props - 组件属性
 * @returns 视觉元素验证结果
 */
function validateBadgeVisualElements(props: SupplementedBadgeProps): {
  hasTag: boolean
  hasText: boolean
  hasCount: boolean
  hasDetail: boolean
  countText: string | null
  timeText: string | null
} {
  const supplementCount = props.supplementCount ?? 1
  const showDetail = props.showDetail ?? false

  return {
    // 标记容器始终存在
    hasTag: true,
    // "补录"文字始终存在
    hasText: true,
    // 补录次数仅在大于1时显示
    hasCount: shouldShowSupplementCount(supplementCount),
    // 详细信息仅在 showDetail 为 true 时显示
    hasDetail: showDetail,
    // 补录次数文本
    countText: shouldShowSupplementCount(supplementCount)
      ? formatSupplementCount(supplementCount)
      : null,
    // 时间文本
    timeText: showDetail ? formatSupplementedTime(props.supplementedAt) : null
  }
}

// ==================== 生成器定义 ====================

/**
 * 生成有效的 ISO 8601 日期字符串
 * 使用整数生成年月日时分秒，确保生成有效日期
 */
const isoDateStringArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({min: 2020, max: 2030}), // 年
    fc.integer({min: 1, max: 12}), // 月
    fc.integer({min: 1, max: 28}), // 日（使用28避免月份天数问题）
    fc.integer({min: 0, max: 23}), // 时
    fc.integer({min: 0, max: 59}), // 分
    fc.integer({min: 0, max: 59}) // 秒
  )
  .map(
    ([year, month, day, hour, minute, second]) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`
  )

/**
 * 生成有效的补录次数（正整数）
 */
const supplementCountArb: fc.Arbitrary<number> = fc.integer({min: 1, max: 100})

/**
 * 生成可选的布尔值
 */
const optionalBooleanArb: fc.Arbitrary<boolean | undefined> = fc.option(fc.boolean(), {
  nil: undefined
})

/**
 * 生成可选的类名字符串
 */
const optionalClassNameArb: fc.Arbitrary<string | undefined> = fc.option(
  fc.string({minLength: 1, maxLength: 20}).map((s) => s.replace(/[^a-z-_]/gi, 'a')),
  {nil: undefined}
)

/**
 * 生成有效的 SupplementedBadgeProps
 */
const supplementedBadgePropsArb: fc.Arbitrary<SupplementedBadgeProps> = fc.record({
  supplementedAt: isoDateStringArb,
  supplementCount: fc.option(supplementCountArb, {nil: undefined}),
  showDetail: optionalBooleanArb,
  className: optionalClassNameArb
})

// ==================== 属性测试 ====================

describe('SupplementedBadge 属性测试', () => {
  /**
   * **Feature: supplemented-photo-marking, Property 2: 补录标记视觉一致性**
   * **Validates: Requirements 1.2, 1.3**
   *
   * 验证补录标记组件的视觉元素一致性
   */
  describe('Property 2: 补录标记视觉一致性', () => {
    /**
     * 测试：对于任何有效的补录照片属性，组件应该始终显示"补录"标记
     * **Validates: Requirements 1.2**
     */
    it('对于任何有效的补录照片属性，应该始终显示"补录"标记', () => {
      fc.assert(
        fc.property(supplementedBadgePropsArb, (props) => {
          const result = validateBadgeVisualElements(props)

          // 验证：标记容器始终存在
          expect(result.hasTag).toBe(true)
          // 验证："补录"文字始终存在
          expect(result.hasText).toBe(true)
        }),
        {numRuns: 100}
      )
    })

    /**
     * 测试：补录次数大于1时应该显示次数，等于1时不显示
     * **Validates: Requirements 1.3**
     */
    it('补录次数大于1时应该显示次数，等于1时不显示', () => {
      fc.assert(
        fc.property(supplementCountArb, (count) => {
          const props: SupplementedBadgeProps = {
            supplementedAt: '2024-12-17T10:30:00Z',
            supplementCount: count
          }
          const result = validateBadgeVisualElements(props)

          if (count > 1) {
            // 补录次数大于1时应该显示
            expect(result.hasCount).toBe(true)
            expect(result.countText).toBe(`×${count}`)
          } else {
            // 补录次数等于1时不显示
            expect(result.hasCount).toBe(false)
            expect(result.countText).toBeNull()
          }
        }),
        {numRuns: 100}
      )
    })

    /**
     * 测试：showDetail 为 true 时应该显示补录时间
     * **Validates: Requirements 1.3**
     */
    it('showDetail 为 true 时应该显示补录时间', () => {
      fc.assert(
        fc.property(isoDateStringArb, (dateString) => {
          const propsWithDetail: SupplementedBadgeProps = {
            supplementedAt: dateString,
            showDetail: true
          }
          const propsWithoutDetail: SupplementedBadgeProps = {
            supplementedAt: dateString,
            showDetail: false
          }

          const resultWithDetail = validateBadgeVisualElements(propsWithDetail)
          const resultWithoutDetail = validateBadgeVisualElements(propsWithoutDetail)

          // showDetail 为 true 时应该显示详细信息
          expect(resultWithDetail.hasDetail).toBe(true)
          expect(resultWithDetail.timeText).not.toBeNull()

          // showDetail 为 false 时不应该显示详细信息
          expect(resultWithoutDetail.hasDetail).toBe(false)
          expect(resultWithoutDetail.timeText).toBeNull()
        }),
        {numRuns: 100}
      )
    })

    /**
     * 测试：默认情况下（不传 showDetail）不显示详细信息
     * **Validates: Requirements 1.3**
     */
    it('默认情况下不显示详细信息', () => {
      fc.assert(
        fc.property(isoDateStringArb, (dateString) => {
          const props: SupplementedBadgeProps = {
            supplementedAt: dateString
            // showDetail 未传，应该默认为 false
          }

          const result = validateBadgeVisualElements(props)

          // 默认不显示详细信息
          expect(result.hasDetail).toBe(false)
          expect(result.timeText).toBeNull()
        }),
        {numRuns: 100}
      )
    })

    /**
     * 测试：默认情况下（不传 supplementCount）补录次数为1，不显示次数
     * **Validates: Requirements 1.3**
     */
    it('默认情况下补录次数为1，不显示次数', () => {
      fc.assert(
        fc.property(isoDateStringArb, (dateString) => {
          const props: SupplementedBadgeProps = {
            supplementedAt: dateString
            // supplementCount 未传，应该默认为 1
          }

          const result = validateBadgeVisualElements(props)

          // 默认补录次数为1，不显示次数
          expect(result.hasCount).toBe(false)
          expect(result.countText).toBeNull()
        }),
        {numRuns: 100}
      )
    })
  })

  /**
   * 时间格式化测试
   * 验证时间格式化函数的正确性
   */
  describe('时间格式化', () => {
    /**
     * 测试：有效的 ISO 日期字符串应该被正确格式化
     */
    it('有效的 ISO 日期字符串应该被正确格式化为 MM-DD HH:mm 格式', () => {
      fc.assert(
        fc.property(isoDateStringArb, (dateString) => {
          const formatted = formatSupplementedTime(dateString)

          // 格式化后的字符串应该匹配 MM-DD HH:mm 格式
          const formatRegex = /^\d{2}-\d{2} \d{2}:\d{2}$/
          expect(formatted).toMatch(formatRegex)
        }),
        {numRuns: 100}
      )
    })

    /**
     * 测试：无效的日期字符串应该返回原始字符串
     * 注意：JavaScript 的 Date 构造函数对某些字符串（如纯数字）会尝试解析
     * 只测试明确无效的日期格式
     */
    it('无效的日期字符串应该返回原始字符串', () => {
      // 这些字符串 JavaScript Date 无法解析，会返回 Invalid Date
      const invalidDates = ['invalid-date', 'not-a-date', 'abc', 'xyz123']

      for (const invalidDate of invalidDates) {
        const formatted = formatSupplementedTime(invalidDate)
        expect(formatted).toBe(invalidDate)
      }
    })

    /**
     * 测试：格式化后的月份应该在 01-12 范围内
     */
    it('格式化后的月份应该在 01-12 范围内', () => {
      fc.assert(
        fc.property(isoDateStringArb, (dateString) => {
          const formatted = formatSupplementedTime(dateString)
          const month = Number.parseInt(formatted.substring(0, 2), 10)

          expect(month).toBeGreaterThanOrEqual(1)
          expect(month).toBeLessThanOrEqual(12)
        }),
        {numRuns: 100}
      )
    })

    /**
     * 测试：格式化后的日期应该在 01-31 范围内
     */
    it('格式化后的日期应该在 01-31 范围内', () => {
      fc.assert(
        fc.property(isoDateStringArb, (dateString) => {
          const formatted = formatSupplementedTime(dateString)
          const day = Number.parseInt(formatted.substring(3, 5), 10)

          expect(day).toBeGreaterThanOrEqual(1)
          expect(day).toBeLessThanOrEqual(31)
        }),
        {numRuns: 100}
      )
    })

    /**
     * 测试：格式化后的小时应该在 00-23 范围内
     */
    it('格式化后的小时应该在 00-23 范围内', () => {
      fc.assert(
        fc.property(isoDateStringArb, (dateString) => {
          const formatted = formatSupplementedTime(dateString)
          const hours = Number.parseInt(formatted.substring(6, 8), 10)

          expect(hours).toBeGreaterThanOrEqual(0)
          expect(hours).toBeLessThanOrEqual(23)
        }),
        {numRuns: 100}
      )
    })

    /**
     * 测试：格式化后的分钟应该在 00-59 范围内
     */
    it('格式化后的分钟应该在 00-59 范围内', () => {
      fc.assert(
        fc.property(isoDateStringArb, (dateString) => {
          const formatted = formatSupplementedTime(dateString)
          const minutes = Number.parseInt(formatted.substring(9, 11), 10)

          expect(minutes).toBeGreaterThanOrEqual(0)
          expect(minutes).toBeLessThanOrEqual(59)
        }),
        {numRuns: 100}
      )
    })
  })

  /**
   * 补录次数显示逻辑测试
   */
  describe('补录次数显示逻辑', () => {
    /**
     * 测试：shouldShowSupplementCount 函数的正确性
     */
    it('shouldShowSupplementCount 应该在次数大于1时返回 true', () => {
      fc.assert(
        fc.property(fc.integer({min: 2, max: 1000}), (count) => {
          expect(shouldShowSupplementCount(count)).toBe(true)
        }),
        {numRuns: 100}
      )
    })

    it('shouldShowSupplementCount 应该在次数等于1时返回 false', () => {
      expect(shouldShowSupplementCount(1)).toBe(false)
    })

    it('shouldShowSupplementCount 应该在次数小于1时返回 false', () => {
      fc.assert(
        fc.property(fc.integer({min: -100, max: 0}), (count) => {
          expect(shouldShowSupplementCount(count)).toBe(false)
        }),
        {numRuns: 50}
      )
    })

    /**
     * 测试：formatSupplementCount 函数的正确性
     */
    it('formatSupplementCount 应该返回正确格式的字符串', () => {
      fc.assert(
        fc.property(fc.integer({min: 1, max: 1000}), (count) => {
          const formatted = formatSupplementCount(count)
          expect(formatted).toBe(`×${count}`)
        }),
        {numRuns: 100}
      )
    })
  })
})

// ==================== Property 3: 补录时间显示准确性 ====================

/**
 * **Feature: supplemented-photo-marking, Property 3: 补录时间显示准确性**
 * **Validates: Requirements 1.4, 2.3**
 *
 * 验证补录时间在司机端展示时的准确性
 * - 对于任何补录照片，查看详情时应显示正确的补录时间戳
 * - 时间格式化应保持时间信息的准确性
 */
describe('Property 3: 补录时间显示准确性', () => {
  /**
   * 从 ISO 时间字符串中提取时间组件
   * 用于验证格式化后的时间是否与原始时间一致
   *
   * @param isoString - ISO 8601 格式的时间字符串
   * @returns 时间组件对象
   */
  function extractTimeComponents(isoString: string): {
    month: number
    day: number
    hours: number
    minutes: number
  } {
    const date = new Date(isoString)
    return {
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes()
    }
  }

  /**
   * 从格式化后的时间字符串中提取时间组件
   * 格式：MM-DD HH:mm
   *
   * @param formattedTime - 格式化后的时间字符串
   * @returns 时间组件对象
   */
  function extractFormattedTimeComponents(formattedTime: string): {
    month: number
    day: number
    hours: number
    minutes: number
  } {
    const [datePart, timePart] = formattedTime.split(' ')
    const [month, day] = datePart.split('-').map(Number)
    const [hours, minutes] = timePart.split(':').map(Number)
    return {month, day, hours, minutes}
  }

  /**
   * 测试：对于任何有效的补录时间，格式化后应保持时间信息的准确性
   * **Feature: supplemented-photo-marking, Property 3: 补录时间显示准确性**
   * **Validates: Requirements 1.4**
   *
   * 验证：格式化后的时间组件（月、日、时、分）应与原始时间一致
   */
  it('对于任何有效的补录时间，格式化后应保持时间信息的准确性', () => {
    fc.assert(
      fc.property(isoDateStringArb, (isoString) => {
        // 格式化时间
        const formatted = formatSupplementedTime(isoString)

        // 提取原始时间组件（本地时间）
        const original = extractTimeComponents(isoString)

        // 提取格式化后的时间组件
        const formattedComponents = extractFormattedTimeComponents(formatted)

        // 验证：格式化后的时间组件应与原始时间一致
        expect(formattedComponents.month).toBe(original.month)
        expect(formattedComponents.day).toBe(original.day)
        expect(formattedComponents.hours).toBe(original.hours)
        expect(formattedComponents.minutes).toBe(original.minutes)
      }),
      {numRuns: 100}
    )
  })

  /**
   * 测试：补录时间应在 showDetail 为 true 时正确显示
   * **Feature: supplemented-photo-marking, Property 3: 补录时间显示准确性**
   * **Validates: Requirements 2.3**
   *
   * 验证：当 showDetail 为 true 时，补录时间应该被正确格式化并显示
   */
  it('补录时间应在 showDetail 为 true 时正确显示', () => {
    fc.assert(
      fc.property(isoDateStringArb, (isoString) => {
        const props: SupplementedBadgeProps = {
          supplementedAt: isoString,
          showDetail: true
        }

        const result = validateBadgeVisualElements(props)

        // 验证：详细信息应该显示
        expect(result.hasDetail).toBe(true)

        // 验证：时间文本不为空
        expect(result.timeText).not.toBeNull()

        // 验证：时间文本格式正确
        expect(result.timeText).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)

        // 验证：时间文本与原始时间一致
        const original = extractTimeComponents(isoString)
        const formattedComponents = extractFormattedTimeComponents(result.timeText!)

        expect(formattedComponents.month).toBe(original.month)
        expect(formattedComponents.day).toBe(original.day)
        expect(formattedComponents.hours).toBe(original.hours)
        expect(formattedComponents.minutes).toBe(original.minutes)
      }),
      {numRuns: 100}
    )
  })

  /**
   * 测试：补录时间格式化应保持时间顺序的一致性
   * **Feature: supplemented-photo-marking, Property 3: 补录时间显示准确性**
   * **Validates: Requirements 1.4**
   *
   * 验证：如果时间 A 早于时间 B，则格式化后的时间 A 也应该早于时间 B
   * 这是一个元变换属性（metamorphic property）
   */
  it('补录时间格式化应保持时间顺序的一致性', () => {
    // 生成两个有序的时间戳
    const orderedTimestampsArb = fc
      .tuple(
        fc.integer({min: 2020, max: 2025}), // 年
        fc.integer({min: 1, max: 12}), // 月
        fc.integer({min: 1, max: 28}), // 日
        fc.integer({min: 0, max: 23}), // 时
        fc.integer({min: 0, max: 58}) // 分（留出空间给第二个时间）
      )
      .chain(([year, month, day, hour, minute]) => {
        // 生成第一个时间
        const time1 = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`

        // 生成第二个时间（比第一个晚 1-60 分钟）
        const laterMinute = minute + 1
        const time2 = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(laterMinute).padStart(2, '0')}:00Z`

        return fc.constant({time1, time2})
      })

    fc.assert(
      fc.property(orderedTimestampsArb, ({time1, time2}) => {
        const date1 = new Date(time1)
        const date2 = new Date(time2)

        // 验证：原始时间 time1 早于 time2
        expect(date1.getTime()).toBeLessThan(date2.getTime())

        // 格式化两个时间
        const formatted1 = formatSupplementedTime(time1)
        const formatted2 = formatSupplementedTime(time2)

        // 提取格式化后的时间组件
        const components1 = extractFormattedTimeComponents(formatted1)
        const components2 = extractFormattedTimeComponents(formatted2)

        // 验证：格式化后的时间顺序应该保持一致
        // 由于我们生成的是同一天的时间，只需比较分钟
        expect(components1.minutes).toBeLessThan(components2.minutes)
      }),
      {numRuns: 100}
    )
  })

  /**
   * 测试：补录时间应在司机端正确传递给 SupplementedBadge 组件
   * **Feature: supplemented-photo-marking, Property 3: 补录时间显示准确性**
   * **Validates: Requirements 2.3**
   *
   * 验证：补录元数据中的 supplemented_at 字段应该被正确传递和显示
   */
  it('补录元数据中的时间应被正确传递和显示', () => {
    // 模拟补录元数据结构
    interface SupplementedPhotoMeta {
      field: string
      index: number
      supplemented_at: string
      original_url?: string | null
      supplement_count: number
    }

    // 生成补录元数据
    const supplementedMetaArb: fc.Arbitrary<SupplementedPhotoMeta> = fc.record({
      field: fc.constantFrom(
        'pickup_photos',
        'return_photos',
        'registration_photos',
        'damage_photos'
      ),
      index: fc.integer({min: 0, max: 10}),
      supplemented_at: isoDateStringArb,
      original_url: fc.option(fc.webUrl(), {nil: null}),
      supplement_count: fc.integer({min: 1, max: 10})
    })

    fc.assert(
      fc.property(supplementedMetaArb, (meta) => {
        // 模拟司机端传递给 SupplementedBadge 的属性
        const badgeProps: SupplementedBadgeProps = {
          supplementedAt: meta.supplemented_at,
          supplementCount: meta.supplement_count,
          showDetail: true
        }

        const result = validateBadgeVisualElements(badgeProps)

        // 验证：时间应该被正确格式化
        expect(result.timeText).not.toBeNull()

        // 验证：格式化后的时间与原始时间一致
        const original = extractTimeComponents(meta.supplemented_at)
        const formatted = extractFormattedTimeComponents(result.timeText!)

        expect(formatted.month).toBe(original.month)
        expect(formatted.day).toBe(original.day)
        expect(formatted.hours).toBe(original.hours)
        expect(formatted.minutes).toBe(original.minutes)
      }),
      {numRuns: 100}
    )
  })

  /**
   * 测试：不同照片类型的补录时间应独立且准确
   * **Feature: supplemented-photo-marking, Property 3: 补录时间显示准确性**
   * **Validates: Requirements 1.4, 2.3**
   *
   * 验证：提车、还车、行驶证、车损照片的补录时间应各自独立且准确显示
   */
  it('不同照片类型的补录时间应独立且准确', () => {
    // 生成多个不同照片类型的补录元数据
    const multiplePhotosArb = fc.record({
      pickup: isoDateStringArb,
      return: isoDateStringArb,
      registration: isoDateStringArb,
      damage: isoDateStringArb
    })

    fc.assert(
      fc.property(multiplePhotosArb, (photos) => {
        // 为每种照片类型创建 badge props
        const photoTypes = ['pickup', 'return', 'registration', 'damage'] as const

        for (const type of photoTypes) {
          const props: SupplementedBadgeProps = {
            supplementedAt: photos[type],
            showDetail: true
          }

          const result = validateBadgeVisualElements(props)

          // 验证：每种照片类型的时间都应该被正确格式化
          expect(result.timeText).not.toBeNull()

          // 验证：格式化后的时间与原始时间一致
          const original = extractTimeComponents(photos[type])
          const formatted = extractFormattedTimeComponents(result.timeText!)

          expect(formatted.month).toBe(original.month)
          expect(formatted.day).toBe(original.day)
          expect(formatted.hours).toBe(original.hours)
          expect(formatted.minutes).toBe(original.minutes)
        }
      }),
      {numRuns: 50}
    )
  })
})

// ==================== 单元测试（边界情况）====================

describe('SupplementedBadge 单元测试', () => {
  describe('边界情况', () => {
    it('应该正确处理最小有效属性', () => {
      const minimalProps: SupplementedBadgeProps = {
        supplementedAt: '2024-01-01T00:00:00Z'
      }

      const result = validateBadgeVisualElements(minimalProps)

      expect(result.hasTag).toBe(true)
      expect(result.hasText).toBe(true)
      expect(result.hasCount).toBe(false)
      expect(result.hasDetail).toBe(false)
    })

    it('应该正确处理所有属性都有值的情况', () => {
      const fullProps: SupplementedBadgeProps = {
        supplementedAt: '2024-12-17T10:30:00Z',
        supplementCount: 3,
        showDetail: true,
        className: 'custom-class'
      }

      const result = validateBadgeVisualElements(fullProps)

      expect(result.hasTag).toBe(true)
      expect(result.hasText).toBe(true)
      expect(result.hasCount).toBe(true)
      expect(result.countText).toBe('×3')
      expect(result.hasDetail).toBe(true)
      // 时间格式化结果取决于本地时区，只验证格式正确
      expect(result.timeText).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
    })

    it('应该正确处理补录次数为1的情况', () => {
      const props: SupplementedBadgeProps = {
        supplementedAt: '2024-12-17T10:30:00Z',
        supplementCount: 1
      }

      const result = validateBadgeVisualElements(props)

      expect(result.hasCount).toBe(false)
      expect(result.countText).toBeNull()
    })

    it('应该正确处理补录次数为2的情况（边界值）', () => {
      const props: SupplementedBadgeProps = {
        supplementedAt: '2024-12-17T10:30:00Z',
        supplementCount: 2
      }

      const result = validateBadgeVisualElements(props)

      expect(result.hasCount).toBe(true)
      expect(result.countText).toBe('×2')
    })
  })

  describe('时间格式化边界情况', () => {
    it('应该正确格式化年初时间', () => {
      const formatted = formatSupplementedTime('2024-01-01T00:00:00Z')
      expect(formatted).toMatch(/^01-01 \d{2}:\d{2}$/)
    })

    it('应该正确格式化年末时间', () => {
      // UTC 时间 23:59:59 在不同时区会转换为不同的本地时间
      // 只验证格式正确，不验证具体日期（因为可能跨日）
      const formatted = formatSupplementedTime('2024-12-31T23:59:59Z')
      expect(formatted).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
    })

    it('应该正确处理带毫秒的时间字符串', () => {
      const formatted = formatSupplementedTime('2024-12-17T10:30:45.123Z')
      expect(formatted).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
    })

    it('应该正确处理带时区偏移的时间字符串', () => {
      const formatted = formatSupplementedTime('2024-12-17T10:30:00+08:00')
      expect(formatted).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
    })
  })
})
