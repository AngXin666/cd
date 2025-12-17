/**
 * 状态显示工具函数属性测试
 *
 * 使用 fast-check 进行属性测试，验证状态映射的完整性和正确性
 *
 * @module utils/statusDisplay.test
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  attendanceStatusMap,
  approvalStatusMap,
  notificationStatusMap,
  vehicleReviewStatusMap,
  leaveTypeMap,
  getAttendanceStatusDisplay,
  getApprovalStatusDisplay,
  getNotificationStatusDisplay,
  getVehicleReviewStatusDisplay,
  getLeaveTypeText,
  getStatusDisplay,
  type StatusDisplayInfo
} from './statusDisplay'

// ==================== 类型定义 ====================

/**
 * StatusDisplayInfo 对象的必需属性
 */
const REQUIRED_STATUS_DISPLAY_PROPERTIES = ['text', 'color', 'bg'] as const

// ==================== 辅助函数 ====================

/**
 * 验证 StatusDisplayInfo 对象是否包含所有必需属性（严格模式，要求 text 非空）
 * @param info - 要验证的状态显示信息对象
 * @returns 是否包含所有必需属性
 */
function isValidStatusDisplayInfo(info: StatusDisplayInfo): boolean {
  return (
    typeof info.text === 'string' &&
    typeof info.color === 'string' &&
    typeof info.bg === 'string' &&
    info.text.length > 0 &&
    info.color.length > 0 &&
    info.bg.length > 0
  )
}

/**
 * 验证 StatusDisplayInfo 对象是否包含所有必需属性（宽松模式，允许 text 为空）
 * 用于测试未知状态时，因为空字符串输入会导致 text 为空
 * @param info - 要验证的状态显示信息对象
 * @returns 是否包含所有必需属性
 */
function isValidStatusDisplayInfoLoose(info: StatusDisplayInfo): boolean {
  return (
    typeof info.text === 'string' &&
    typeof info.color === 'string' &&
    typeof info.bg === 'string' &&
    info.color.length > 0 &&
    info.bg.length > 0
  )
}


// ==================== Property 9: 状态映射完整性属性测试 ====================

describe('状态映射完整性属性测试', () => {
  /**
   * **Feature: cross-module-code-deduplication, Property 9: 状态映射完整性**
   * **Validates: Requirements 4.1**
   *
   * 验证所有定义的状态键都返回包含 text、color、bg 属性的有效对象
   */
  describe('Property 9: 状态映射完整性', () => {
    // ==================== 考勤状态映射测试 ====================

    describe('attendanceStatusMap 完整性', () => {
      const attendanceStatusKeys = ['normal', 'late', 'early', 'absent']

      it('应包含所有定义的考勤状态键', () => {
        for (const key of attendanceStatusKeys) {
          expect(attendanceStatusMap).toHaveProperty(key)
        }
      })

      it('每个考勤状态应包含 text、color、bg 属性', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...attendanceStatusKeys),
            (statusKey) => {
              const statusInfo = attendanceStatusMap[statusKey]
              expect(statusInfo).toBeDefined()
              for (const prop of REQUIRED_STATUS_DISPLAY_PROPERTIES) {
                expect(statusInfo).toHaveProperty(prop)
              }
              expect(isValidStatusDisplayInfo(statusInfo)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })

      it('getAttendanceStatusDisplay 应返回有效的状态信息', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...attendanceStatusKeys),
            (statusKey) => {
              const result = getAttendanceStatusDisplay(statusKey)
              expect(isValidStatusDisplayInfo(result)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })
    })

    // ==================== 审批状态映射测试 ====================

    describe('approvalStatusMap 完整性', () => {
      const approvalStatusKeys = ['pending', 'approved', 'rejected']

      it('应包含所有定义的审批状态键', () => {
        for (const key of approvalStatusKeys) {
          expect(approvalStatusMap).toHaveProperty(key)
        }
      })

      it('每个审批状态应包含 text、color、bg 属性', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...approvalStatusKeys),
            (statusKey) => {
              const statusInfo = approvalStatusMap[statusKey]
              expect(statusInfo).toBeDefined()
              for (const prop of REQUIRED_STATUS_DISPLAY_PROPERTIES) {
                expect(statusInfo).toHaveProperty(prop)
              }
              expect(isValidStatusDisplayInfo(statusInfo)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })

      it('getApprovalStatusDisplay 应返回有效的状态信息', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...approvalStatusKeys),
            (statusKey) => {
              const result = getApprovalStatusDisplay(statusKey)
              expect(isValidStatusDisplayInfo(result)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })
    })

    // ==================== 通知状态映射测试 ====================

    describe('notificationStatusMap 完整性', () => {
      const notificationStatusKeys = ['pending', 'sent', 'failed']

      it('应包含所有定义的通知状态键', () => {
        for (const key of notificationStatusKeys) {
          expect(notificationStatusMap).toHaveProperty(key)
        }
      })

      it('每个通知状态应包含 text、color、bg 属性', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...notificationStatusKeys),
            (statusKey) => {
              const statusInfo = notificationStatusMap[statusKey]
              expect(statusInfo).toBeDefined()
              for (const prop of REQUIRED_STATUS_DISPLAY_PROPERTIES) {
                expect(statusInfo).toHaveProperty(prop)
              }
              expect(isValidStatusDisplayInfo(statusInfo)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })

      it('getNotificationStatusDisplay 应返回有效的状态信息', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...notificationStatusKeys),
            (statusKey) => {
              const result = getNotificationStatusDisplay(statusKey)
              expect(isValidStatusDisplayInfo(result)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })
    })

    // ==================== 车辆审核状态映射测试 ====================

    describe('vehicleReviewStatusMap 完整性', () => {
      const vehicleReviewStatusKeys = ['pending_review', 'approved', 'rejected', 'need_supplement']

      it('应包含所有定义的车辆审核状态键', () => {
        for (const key of vehicleReviewStatusKeys) {
          expect(vehicleReviewStatusMap).toHaveProperty(key)
        }
      })

      it('每个车辆审核状态应包含 text、color、bg 属性', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...vehicleReviewStatusKeys),
            (statusKey) => {
              const statusInfo = vehicleReviewStatusMap[statusKey]
              expect(statusInfo).toBeDefined()
              for (const prop of REQUIRED_STATUS_DISPLAY_PROPERTIES) {
                expect(statusInfo).toHaveProperty(prop)
              }
              expect(isValidStatusDisplayInfo(statusInfo)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })

      it('getVehicleReviewStatusDisplay 应返回有效的状态信息', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...vehicleReviewStatusKeys),
            (statusKey) => {
              const result = getVehicleReviewStatusDisplay(statusKey)
              expect(isValidStatusDisplayInfo(result)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })
    })

    // ==================== 请假类型映射测试 ====================

    describe('leaveTypeMap 完整性', () => {
      const leaveTypeKeys = ['personal', 'sick', 'annual', 'other']

      it('应包含所有定义的请假类型键', () => {
        for (const key of leaveTypeKeys) {
          expect(leaveTypeMap).toHaveProperty(key)
        }
      })

      it('每个请假类型应为非空中文字符串', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...leaveTypeKeys),
            (typeKey) => {
              const typeText = leaveTypeMap[typeKey]
              expect(typeText).toBeDefined()
              expect(typeof typeText).toBe('string')
              expect(typeText.length).toBeGreaterThan(0)
            }
          ),
          { numRuns: 10 }
        )
      })

      it('getLeaveTypeText 应返回有效的类型文本', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...leaveTypeKeys),
            (typeKey) => {
              const result = getLeaveTypeText(typeKey)
              expect(typeof result).toBe('string')
              expect(result.length).toBeGreaterThan(0)
            }
          ),
          { numRuns: 10 }
        )
      })
    })

    // ==================== 通用状态获取函数测试 ====================

    describe('getStatusDisplay 通用函数完整性', () => {
      it('对于已定义的状态键，应返回映射中的值', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('normal', 'late', 'early', 'absent'),
            (statusKey) => {
              const result = getStatusDisplay(statusKey, attendanceStatusMap)
              expect(result).toEqual(attendanceStatusMap[statusKey])
            }
          ),
          { numRuns: 10 }
        )
      })

      it('对于未定义的状态键，应返回默认的灰色样式', () => {
        const result = getStatusDisplay('unknown_status', attendanceStatusMap)
        expect(result.text).toBe('unknown_status')
        expect(result.color).toBe('text-gray-600')
        expect(result.bg).toBe('bg-gray-50')
      })

      it('当提供 defaultKey 且状态未定义时，应返回 defaultKey 对应的值', () => {
        const result = getStatusDisplay('unknown_status', attendanceStatusMap, 'normal')
        expect(result).toEqual(attendanceStatusMap.normal)
      })
    })
  })


  // ==================== Property 10: 未知状态默认处理属性测试 ====================

  /**
   * **Feature: cross-module-code-deduplication, Property 10: 未知状态默认处理**
   * **Validates: Requirements 4.4**
   *
   * 验证对于任意随机字符串状态值，getStatusDisplay 函数返回有效的默认 StatusDisplayInfo 对象而不抛出异常
   */
  describe('Property 10: 未知状态默认处理', () => {
    const DEFAULT_GRAY_STYLE = {
      color: 'text-gray-600',
      bg: 'bg-gray-50'
    }

    describe('getStatusDisplay 未知状态处理', () => {
      it('对于任意随机字符串，应返回有效的 StatusDisplayInfo 对象而不抛出异常', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (randomStatus) => {
              const result = getStatusDisplay(randomStatus, attendanceStatusMap)
              expect(result).toBeDefined()
              expect(typeof result.text).toBe('string')
              expect(typeof result.color).toBe('string')
              expect(typeof result.bg).toBe('string')
              expect(result.color.length).toBeGreaterThan(0)
              expect(result.bg.length).toBeGreaterThan(0)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('对于未定义的状态，应返回默认的灰色样式', () => {
        fc.assert(
          fc.property(
            fc.string().filter(s => !['normal', 'late', 'early', 'absent'].includes(s)),
            (unknownStatus) => {
              const result = getStatusDisplay(unknownStatus, attendanceStatusMap)
              expect(result.color).toBe(DEFAULT_GRAY_STYLE.color)
              expect(result.bg).toBe(DEFAULT_GRAY_STYLE.bg)
              expect(result.text).toBe(unknownStatus)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('对于空字符串状态，应返回有效的默认样式', () => {
        const result = getStatusDisplay('', attendanceStatusMap)
        expect(result).toBeDefined()
        expect(result.text).toBe('')
        expect(result.color).toBe(DEFAULT_GRAY_STYLE.color)
        expect(result.bg).toBe(DEFAULT_GRAY_STYLE.bg)
      })

      it('对于包含特殊字符的状态，应返回有效的默认样式', () => {
        const specialCharStrings = ['!@#$', '%^&*', '()', '!!!', '@@@', '###']
        for (const specialStatus of specialCharStrings) {
          const result = getStatusDisplay(specialStatus, attendanceStatusMap)
          expect(result).toBeDefined()
          expect(typeof result.text).toBe('string')
          expect(result.color).toBe(DEFAULT_GRAY_STYLE.color)
          expect(result.bg).toBe(DEFAULT_GRAY_STYLE.bg)
        }
      })

      it('对于 Unicode 字符串状态，应返回有效的默认样式', () => {
        const unicodeStrings = ['中文状态', '日本語', '한국어', 'emoji']
        for (const unicodeStatus of unicodeStrings) {
          const result = getStatusDisplay(unicodeStatus, attendanceStatusMap)
          expect(result).toBeDefined()
          expect(typeof result.text).toBe('string')
        }
      })
    })

    describe('getAttendanceStatusDisplay 未知状态处理', () => {
      it('对于任意随机字符串，应返回有效的 StatusDisplayInfo 对象', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (randomStatus) => {
              const result = getAttendanceStatusDisplay(randomStatus)
              expect(result).toBeDefined()
              expect(isValidStatusDisplayInfo(result)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('对于未定义的状态，应返回 normal 状态作为默认值', () => {
        fc.assert(
          fc.property(
            fc.string().filter(s => !['normal', 'late', 'early', 'absent'].includes(s)),
            (unknownStatus) => {
              const result = getAttendanceStatusDisplay(unknownStatus)
              expect(result).toEqual(attendanceStatusMap.normal)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('getApprovalStatusDisplay 未知状态处理', () => {
      it('对于任意随机字符串，应返回有效的 StatusDisplayInfo 对象', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (randomStatus) => {
              const result = getApprovalStatusDisplay(randomStatus)
              expect(result).toBeDefined()
              expect(isValidStatusDisplayInfoLoose(result)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('对于未定义的状态，应返回默认的灰色样式', () => {
        fc.assert(
          fc.property(
            fc.string().filter(s => !['pending', 'approved', 'rejected'].includes(s)),
            (unknownStatus) => {
              const result = getApprovalStatusDisplay(unknownStatus)
              expect(result.text).toBe(unknownStatus)
              expect(result.color).toBe('text-gray-700')
              expect(result.bg).toBe('bg-gray-100')
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('getNotificationStatusDisplay 未知状态处理', () => {
      // 原型链属性列表，这些属性在 JavaScript 对象上存在，需要排除
      const prototypeProperties = ['toString', 'valueOf', 'hasOwnProperty', 'constructor', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString']

      it('对于任意随机字符串，应返回有效的 StatusDisplayInfo 对象', () => {
        fc.assert(
          fc.property(
            // 排除原型链属性，因为 getNotificationStatusDisplay 没有使用 hasOwnProperty 检查
            fc.string().filter(s => !prototypeProperties.includes(s)),
            (randomStatus) => {
              const result = getNotificationStatusDisplay(randomStatus)
              expect(result).toBeDefined()
              expect(isValidStatusDisplayInfo(result)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('对于未定义的状态，应返回 pending 状态作为默认值', () => {
        fc.assert(
          fc.property(
            fc.string().filter(s => !['pending', 'sent', 'failed'].includes(s)),
            (unknownStatus) => {
              const result = getNotificationStatusDisplay(unknownStatus)
              expect(result).toEqual(notificationStatusMap.pending)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('getVehicleReviewStatusDisplay 未知状态处理', () => {
      it('对于任意随机字符串，应返回有效的 StatusDisplayInfo 对象', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (randomStatus) => {
              const result = getVehicleReviewStatusDisplay(randomStatus)
              expect(result).toBeDefined()
              expect(isValidStatusDisplayInfoLoose(result)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('对于未定义的状态，应返回默认的灰色样式', () => {
        fc.assert(
          fc.property(
            fc.string().filter(s => !['pending_review', 'approved', 'rejected', 'need_supplement'].includes(s)),
            (unknownStatus) => {
              const result = getVehicleReviewStatusDisplay(unknownStatus)
              expect(result.text).toBe(unknownStatus)
              expect(result.color).toBe('text-gray-700')
              expect(result.bg).toBe('bg-gray-100')
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('getLeaveTypeText 未知类型处理', () => {
      it('对于任意随机字符串，应返回有效的字符串而不抛出异常', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (randomType) => {
              const result = getLeaveTypeText(randomType)
              expect(typeof result).toBe('string')
            }
          ),
          { numRuns: 100 }
        )
      })

      it('对于未定义的类型，应返回原始类型值', () => {
        fc.assert(
          fc.property(
            fc.string().filter(s => !['personal', 'sick', 'annual', 'other'].includes(s)),
            (unknownType) => {
              const result = getLeaveTypeText(unknownType)
              expect(result).toBe(unknownType)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('综合未知状态处理测试', () => {
      const statusFunctions = [
        { name: 'getAttendanceStatusDisplay', fn: getAttendanceStatusDisplay },
        { name: 'getApprovalStatusDisplay', fn: getApprovalStatusDisplay },
        { name: 'getNotificationStatusDisplay', fn: getNotificationStatusDisplay },
        { name: 'getVehicleReviewStatusDisplay', fn: getVehicleReviewStatusDisplay }
      ]

      it('所有状态获取函数对于任意输入都不应抛出异常', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (randomStatus) => {
              for (const { fn } of statusFunctions) {
                expect(() => fn(randomStatus)).not.toThrow()
                const result = fn(randomStatus)
                expect(result).toBeDefined()
                expect(isValidStatusDisplayInfoLoose(result)).toBe(true)
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('所有状态获取函数对于 null-like 字符串都应返回有效对象', () => {
        const nullLikeStrings = ['null', 'undefined', 'NaN', 'Infinity']
        for (const nullLike of nullLikeStrings) {
          for (const { fn } of statusFunctions) {
            const result = fn(nullLike)
            expect(result).toBeDefined()
            expect(isValidStatusDisplayInfo(result)).toBe(true)
          }
        }
      })
    })
  })


  // ==================== Property 11: 状态映射序列化往返一致性属性测试 ====================

  /**
   * **Feature: cross-module-code-deduplication, Property 11: 状态映射序列化往返一致性**
   * **Validates: Requirements 4.5**
   *
   * 验证对于任意状态映射对象，JSON.parse(JSON.stringify(statusMap)) 产生等价的对象
   * 这确保状态映射可以安全地序列化和反序列化，例如在网络传输或本地存储中使用
   */
  describe('Property 11: 状态映射序列化往返一致性', () => {
    /**
     * 深度比较两个对象是否相等
     */
    function deepEqual(obj1: unknown, obj2: unknown): boolean {
      return JSON.stringify(obj1) === JSON.stringify(obj2)
    }

    /**
     * 执行序列化往返操作
     */
    function serializeRoundTrip<T>(obj: T): T {
      return JSON.parse(JSON.stringify(obj))
    }

    describe('attendanceStatusMap 序列化往返一致性', () => {
      it('整个映射对象序列化后应与原对象相等', () => {
        const roundTripped = serializeRoundTrip(attendanceStatusMap)
        expect(deepEqual(roundTripped, attendanceStatusMap)).toBe(true)
      })

      it('每个状态值序列化后应与原值相等', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('normal', 'late', 'early', 'absent'),
            (statusKey) => {
              const original = attendanceStatusMap[statusKey]
              const roundTripped = serializeRoundTrip(original)
              expect(roundTripped.text).toBe(original.text)
              expect(roundTripped.color).toBe(original.color)
              expect(roundTripped.bg).toBe(original.bg)
              expect(deepEqual(roundTripped, original)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })

      it('序列化后的对象应保持相同的键集合', () => {
        const roundTripped = serializeRoundTrip(attendanceStatusMap)
        const originalKeys = Object.keys(attendanceStatusMap).sort()
        const roundTrippedKeys = Object.keys(roundTripped).sort()
        expect(roundTrippedKeys).toEqual(originalKeys)
      })
    })

    describe('approvalStatusMap 序列化往返一致性', () => {
      it('整个映射对象序列化后应与原对象相等', () => {
        const roundTripped = serializeRoundTrip(approvalStatusMap)
        expect(deepEqual(roundTripped, approvalStatusMap)).toBe(true)
      })

      it('每个状态值序列化后应与原值相等', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('pending', 'approved', 'rejected'),
            (statusKey) => {
              const original = approvalStatusMap[statusKey]
              const roundTripped = serializeRoundTrip(original)
              expect(roundTripped.text).toBe(original.text)
              expect(roundTripped.color).toBe(original.color)
              expect(roundTripped.bg).toBe(original.bg)
              expect(deepEqual(roundTripped, original)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })

      it('序列化后的对象应保持相同的键集合', () => {
        const roundTripped = serializeRoundTrip(approvalStatusMap)
        const originalKeys = Object.keys(approvalStatusMap).sort()
        const roundTrippedKeys = Object.keys(roundTripped).sort()
        expect(roundTrippedKeys).toEqual(originalKeys)
      })
    })

    describe('notificationStatusMap 序列化往返一致性', () => {
      it('整个映射对象序列化后应与原对象相等', () => {
        const roundTripped = serializeRoundTrip(notificationStatusMap)
        expect(deepEqual(roundTripped, notificationStatusMap)).toBe(true)
      })

      it('每个状态值序列化后应与原值相等', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('pending', 'sent', 'failed'),
            (statusKey) => {
              const original = notificationStatusMap[statusKey]
              const roundTripped = serializeRoundTrip(original)
              expect(roundTripped.text).toBe(original.text)
              expect(roundTripped.color).toBe(original.color)
              expect(roundTripped.bg).toBe(original.bg)
              expect(deepEqual(roundTripped, original)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })

      it('序列化后的对象应保持相同的键集合', () => {
        const roundTripped = serializeRoundTrip(notificationStatusMap)
        const originalKeys = Object.keys(notificationStatusMap).sort()
        const roundTrippedKeys = Object.keys(roundTripped).sort()
        expect(roundTrippedKeys).toEqual(originalKeys)
      })
    })

    describe('vehicleReviewStatusMap 序列化往返一致性', () => {
      it('整个映射对象序列化后应与原对象相等', () => {
        const roundTripped = serializeRoundTrip(vehicleReviewStatusMap)
        expect(deepEqual(roundTripped, vehicleReviewStatusMap)).toBe(true)
      })

      it('每个状态值序列化后应与原值相等', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('pending_review', 'approved', 'rejected', 'need_supplement'),
            (statusKey) => {
              const original = vehicleReviewStatusMap[statusKey]
              const roundTripped = serializeRoundTrip(original)
              expect(roundTripped.text).toBe(original.text)
              expect(roundTripped.color).toBe(original.color)
              expect(roundTripped.bg).toBe(original.bg)
              expect(deepEqual(roundTripped, original)).toBe(true)
            }
          ),
          { numRuns: 10 }
        )
      })

      it('序列化后的对象应保持相同的键集合', () => {
        const roundTripped = serializeRoundTrip(vehicleReviewStatusMap)
        const originalKeys = Object.keys(vehicleReviewStatusMap).sort()
        const roundTrippedKeys = Object.keys(roundTripped).sort()
        expect(roundTrippedKeys).toEqual(originalKeys)
      })
    })

    describe('leaveTypeMap 序列化往返一致性', () => {
      it('整个映射对象序列化后应与原对象相等', () => {
        const roundTripped = serializeRoundTrip(leaveTypeMap)
        expect(deepEqual(roundTripped, leaveTypeMap)).toBe(true)
      })

      it('每个类型值序列化后应与原值相等', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('personal', 'sick', 'annual', 'other'),
            (typeKey) => {
              const original = leaveTypeMap[typeKey]
              const roundTripped = serializeRoundTrip(original)
              expect(roundTripped).toBe(original)
            }
          ),
          { numRuns: 10 }
        )
      })

      it('序列化后的对象应保持相同的键集合', () => {
        const roundTripped = serializeRoundTrip(leaveTypeMap)
        const originalKeys = Object.keys(leaveTypeMap).sort()
        const roundTrippedKeys = Object.keys(roundTripped).sort()
        expect(roundTrippedKeys).toEqual(originalKeys)
      })
    })

    describe('所有状态映射综合序列化往返测试', () => {
      const allMaps = [
        { name: 'attendanceStatusMap', map: attendanceStatusMap },
        { name: 'approvalStatusMap', map: approvalStatusMap },
        { name: 'notificationStatusMap', map: notificationStatusMap },
        { name: 'vehicleReviewStatusMap', map: vehicleReviewStatusMap },
        { name: 'leaveTypeMap', map: leaveTypeMap }
      ]

      it('所有状态映射序列化后应与原对象相等', () => {
        for (const { name, map } of allMaps) {
          const roundTripped = serializeRoundTrip(map)
          expect(deepEqual(roundTripped, map), `${name} should be equal after round-trip`).toBe(true)
        }
      })

      it('多次序列化往返应保持一致性', () => {
        for (const { name, map } of allMaps) {
          let current = map
          for (let i = 0; i < 5; i++) {
            current = serializeRoundTrip(current)
          }
          expect(deepEqual(current, map), `${name} should be stable after multiple round-trips`).toBe(true)
        }
      })

      it('序列化后的对象应可以正常使用', () => {
        const roundTrippedAttendance = serializeRoundTrip(attendanceStatusMap)
        expect(roundTrippedAttendance.normal.text).toBe('正常')
        expect(roundTrippedAttendance.late.color).toBe('text-orange-600')

        const roundTrippedApproval = serializeRoundTrip(approvalStatusMap)
        expect(roundTrippedApproval.pending.text).toBe('待审批')
        expect(roundTrippedApproval.approved.bg).toBe('bg-green-100')

        const roundTrippedNotification = serializeRoundTrip(notificationStatusMap)
        expect(roundTrippedNotification.sent.text).toBe('已发送')
        expect(roundTrippedNotification.failed.color).toBe('text-red-700')

        const roundTrippedVehicle = serializeRoundTrip(vehicleReviewStatusMap)
        expect(roundTrippedVehicle.pending_review.text).toBe('待审核')
        expect(roundTrippedVehicle.need_supplement.bg).toBe('bg-orange-100')

        const roundTrippedLeave = serializeRoundTrip(leaveTypeMap)
        expect(roundTrippedLeave.personal).toBe('事假')
        expect(roundTrippedLeave.sick).toBe('病假')
      })

      it('序列化后的 StatusDisplayInfo 对象应保持类型结构', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              { map: attendanceStatusMap, keys: ['normal', 'late', 'early', 'absent'] },
              { map: approvalStatusMap, keys: ['pending', 'approved', 'rejected'] },
              { map: notificationStatusMap, keys: ['pending', 'sent', 'failed'] },
              { map: vehicleReviewStatusMap, keys: ['pending_review', 'approved', 'rejected', 'need_supplement'] }
            ),
            ({ map, keys }) => {
              const roundTripped = serializeRoundTrip(map)
              for (const key of keys) {
                const original = map[key]
                const roundTrippedValue = roundTripped[key]
                expect(typeof roundTrippedValue.text).toBe('string')
                expect(typeof roundTrippedValue.color).toBe('string')
                expect(typeof roundTrippedValue.bg).toBe('string')
                expect(roundTrippedValue.text).toBe(original.text)
                expect(roundTrippedValue.color).toBe(original.color)
                expect(roundTrippedValue.bg).toBe(original.bg)
              }
            }
          ),
          { numRuns: 10 }
        )
      })
    })

    describe('序列化边界情况测试', () => {
      it('空对象序列化往返应保持一致', () => {
        const emptyMap: Record<string, StatusDisplayInfo> = {}
        const roundTripped = serializeRoundTrip(emptyMap)
        expect(deepEqual(roundTripped, emptyMap)).toBe(true)
        expect(Object.keys(roundTripped).length).toBe(0)
      })

      it('单个状态对象序列化往返应保持一致', () => {
        const singleStatus: StatusDisplayInfo = {
          text: '测试状态',
          color: 'text-blue-500',
          bg: 'bg-blue-50'
        }
        const roundTripped = serializeRoundTrip(singleStatus)
        expect(roundTripped.text).toBe(singleStatus.text)
        expect(roundTripped.color).toBe(singleStatus.color)
        expect(roundTripped.bg).toBe(singleStatus.bg)
      })

      it('包含特殊字符的状态文本序列化往返应保持一致', () => {
        const specialStatus: StatusDisplayInfo = {
          text: '状态：测试 & 验证',
          color: 'text-red-500',
          bg: 'bg-red-50'
        }
        const roundTripped = serializeRoundTrip(specialStatus)
        expect(roundTripped.text).toBe(specialStatus.text)
        expect(roundTripped.color).toBe(specialStatus.color)
        expect(roundTripped.bg).toBe(specialStatus.bg)
      })

      it('包含空字符串属性的状态对象序列化往返应保持一致', () => {
        const emptyTextStatus: StatusDisplayInfo = {
          text: '',
          color: 'text-gray-500',
          bg: 'bg-gray-50'
        }
        const roundTripped = serializeRoundTrip(emptyTextStatus)
        expect(roundTripped.text).toBe('')
        expect(roundTripped.color).toBe(emptyTextStatus.color)
        expect(roundTripped.bg).toBe(emptyTextStatus.bg)
      })
    })

    describe('随机生成的状态映射序列化往返测试', () => {
      const statusDisplayInfoArb = fc.record({
        text: fc.string(),
        color: fc.string(),
        bg: fc.string()
      })

      const statusMapArb = fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        statusDisplayInfoArb
      )

      it('任意随机生成的状态映射序列化往返应保持一致', () => {
        fc.assert(
          fc.property(
            statusMapArb,
            (randomMap) => {
              const roundTripped = serializeRoundTrip(randomMap)
              const originalKeys = Object.keys(randomMap).sort()
              const roundTrippedKeys = Object.keys(roundTripped).sort()
              expect(roundTrippedKeys).toEqual(originalKeys)
              for (const key of originalKeys) {
                expect(roundTripped[key].text).toBe(randomMap[key].text)
                expect(roundTripped[key].color).toBe(randomMap[key].color)
                expect(roundTripped[key].bg).toBe(randomMap[key].bg)
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('任意随机生成的 StatusDisplayInfo 对象序列化往返应保持一致', () => {
        fc.assert(
          fc.property(
            statusDisplayInfoArb,
            (randomStatus) => {
              const roundTripped = serializeRoundTrip(randomStatus)
              expect(roundTripped.text).toBe(randomStatus.text)
              expect(roundTripped.color).toBe(randomStatus.color)
              expect(roundTripped.bg).toBe(randomStatus.bg)
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  })

  // ==================== 所有状态映射的综合测试 ====================

  describe('所有状态映射的综合完整性测试', () => {
    const allStatusMaps = [
      { name: 'attendanceStatusMap', map: attendanceStatusMap, keys: ['normal', 'late', 'early', 'absent'] },
      { name: 'approvalStatusMap', map: approvalStatusMap, keys: ['pending', 'approved', 'rejected'] },
      { name: 'notificationStatusMap', map: notificationStatusMap, keys: ['pending', 'sent', 'failed'] },
      { name: 'vehicleReviewStatusMap', map: vehicleReviewStatusMap, keys: ['pending_review', 'approved', 'rejected', 'need_supplement'] }
    ]

    it('所有状态映射的每个键都应返回有效的 StatusDisplayInfo 对象', () => {
      for (const { name, map, keys } of allStatusMaps) {
        for (const key of keys) {
          const statusInfo = map[key]
          expect(statusInfo, `${name}[${key}] should be defined`).toBeDefined()
          expect(isValidStatusDisplayInfo(statusInfo), `${name}[${key}] should be valid`).toBe(true)
        }
      }
    })

    it('所有状态映射的键数量应与预期一致', () => {
      for (const { name, map, keys } of allStatusMaps) {
        const actualKeys = Object.keys(map)
        expect(actualKeys.length, `${name} should have ${keys.length} keys`).toBe(keys.length)
      }
    })

    it('所有状态映射不应包含未定义的键', () => {
      for (const { name, map, keys } of allStatusMaps) {
        const actualKeys = Object.keys(map)
        for (const actualKey of actualKeys) {
          expect(keys, `${name} should not have unexpected key: ${actualKey}`).toContain(actualKey)
        }
      }
    })
  })
})
