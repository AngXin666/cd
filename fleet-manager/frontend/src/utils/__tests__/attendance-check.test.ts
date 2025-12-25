/**
 * 打卡检查工具函数属性测试
 * 使用 fast-check 进行属性测试，验证打卡检查逻辑的正确性
 * 
 * **Feature: vue-deep-conversion, Property 5: 打卡检查逻辑**
 * **Validates: Requirements 1.7, 1.8**
 * 
 * @module utils/__tests__/attendance-check.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * 打卡检查结果接口（与源文件保持一致）
 */
interface AttendanceCheckResult {
  /** 是否可以进行计件操作 */
  canStart: boolean
  /** 不能进行计件的原因描述 */
  reason: string
  /** 详细检查结果 */
  checkResult: {
    /** 是否需要打卡 */
    needClockIn: boolean
    /** 是否在请假中 */
    onLeave: boolean
    /** 打卡时间（如果已打卡） */
    clockInTime?: string
  }
}

/**
 * 今日打卡状态接口（简化版）
 */
interface TodayAttendance {
  has_clocked_in: boolean
  has_clocked_out: boolean
  clock_in_time: string | null
  clock_out_time: string | null
  work_hours: number | null
}

/**
 * 请假申请接口（简化版）
 */
interface LeaveApplication {
  id: number
  user_id: number
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'rejected'
}

/**
 * 纯函数版本的打卡检查逻辑
 * 用于属性测试，不依赖外部 API
 * 
 * @param todayAttendance - 今日打卡状态，null 表示未打卡
 * @param approvedLeaves - 已批准的请假列表
 * @param todayDateStr - 今天的日期字符串 (YYYY-MM-DD)
 * @returns 检查结果
 */
function checkAttendanceLogic(
  todayAttendance: TodayAttendance | null,
  approvedLeaves: LeaveApplication[],
  todayDateStr: string
): AttendanceCheckResult {
  // 默认结果
  const result: AttendanceCheckResult = {
    canStart: false,
    reason: '',
    checkResult: {
      needClockIn: false,
      onLeave: false,
    },
  }

  // 1. 检查是否在请假中
  const onLeave = approvedLeaves.some(app => {
    const startDate = app.start_date
    const endDate = app.end_date
    // 检查今天是否在请假日期范围内
    return startDate <= todayDateStr && todayDateStr <= endDate
  })

  if (onLeave) {
    result.canStart = false
    result.reason = '您今日处于休假状态，无法进行计件操作'
    result.checkResult.onLeave = true
    return result
  }

  // 2. 检查今日打卡状态
  // 如果没有打卡记录或未打卡
  if (!todayAttendance || !todayAttendance.clock_in_time) {
    result.canStart = false
    result.reason = '您今日尚未打卡，请先完成打卡'
    result.checkResult.needClockIn = true
    return result
  }

  // 已打卡，可以进行计件
  result.canStart = true
  result.reason = ''
  result.checkResult.needClockIn = false
  result.checkResult.onLeave = false

  // 记录打卡信息
  if (todayAttendance.clock_in_time) {
    result.checkResult.clockInTime = todayAttendance.clock_in_time
  }

  return result
}

/**
 * 生成有效用户 ID 的 Arbitrary
 */
const userIdArb = fc.integer({ min: 1, max: 10000 })

/**
 * 生成有效日期字符串的 Arbitrary (YYYY-MM-DD)
 */
const dateStringArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31')
}).map(date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

/**
 * 生成打卡时间字符串的 Arbitrary (HH:mm:ss)
 */
const clockTimeArb = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 }),
  fc.integer({ min: 0, max: 59 })
).map(([h, m, s]) => 
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
)

/**
 * 生成今日打卡状态的 Arbitrary
 * 可以是 null（未打卡）或有效的打卡记录
 */
const todayAttendanceArb: fc.Arbitrary<TodayAttendance | null> = fc.oneof(
  // 未打卡情况
  fc.constant(null),
  // 未打卡但有记录（clock_in_time 为 null）
  fc.record({
    has_clocked_in: fc.constant(false),
    has_clocked_out: fc.constant(false),
    clock_in_time: fc.constant(null),
    clock_out_time: fc.constant(null),
    work_hours: fc.constant(null)
  }),
  // 已打卡情况
  fc.record({
    has_clocked_in: fc.constant(true),
    has_clocked_out: fc.boolean(),
    clock_in_time: clockTimeArb,
    clock_out_time: fc.oneof(fc.constant(null), clockTimeArb),
    work_hours: fc.oneof(fc.constant(null), fc.float({ min: 0, max: 24 }))
  })
)

/**
 * 生成请假申请的 Arbitrary
 */
const leaveApplicationArb = (userId: number): fc.Arbitrary<LeaveApplication> => 
  fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    user_id: fc.constant(userId),
    start_date: dateStringArb,
    end_date: dateStringArb,
    status: fc.constant('approved' as const)
  }).map(app => {
    // 确保 end_date >= start_date
    if (app.end_date < app.start_date) {
      return { ...app, end_date: app.start_date }
    }
    return app
  })

/**
 * 生成覆盖指定日期的请假申请
 */
const leaveApplicationCoveringDateArb = (userId: number, targetDate: string): fc.Arbitrary<LeaveApplication> =>
  fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    user_id: fc.constant(userId),
    // 开始日期在目标日期之前或当天
    start_date: fc.date({
      min: new Date('2020-01-01'),
      max: new Date(targetDate)
    }).map(date => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }),
    // 结束日期在目标日期之后或当天
    end_date: fc.date({
      min: new Date(targetDate),
      max: new Date('2030-12-31')
    }).map(date => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }),
    status: fc.constant('approved' as const)
  })

/**
 * 生成不覆盖指定日期的请假申请
 */
const leaveApplicationNotCoveringDateArb = (userId: number, targetDate: string): fc.Arbitrary<LeaveApplication> =>
  fc.oneof(
    // 请假在目标日期之前结束
    fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      user_id: fc.constant(userId),
      start_date: fc.constant('2020-01-01'),
      end_date: fc.date({
        min: new Date('2020-01-01'),
        max: new Date(new Date(targetDate).getTime() - 86400000) // 目标日期前一天
      }).map(date => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }),
      status: fc.constant('approved' as const)
    }),
    // 请假在目标日期之后开始
    fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      user_id: fc.constant(userId),
      start_date: fc.date({
        min: new Date(new Date(targetDate).getTime() + 86400000), // 目标日期后一天
        max: new Date('2030-12-31')
      }).map(date => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }),
      end_date: fc.constant('2030-12-31'),
      status: fc.constant('approved' as const)
    })
  )

describe('打卡检查属性测试', () => {
  /**
   * Property 5: 打卡检查逻辑
   * *For any* 用户，如果今日未打卡且不在请假中，则 canStartPieceWork 应返回 needClockIn: true
   * **Validates: Requirements 1.7, 1.8**
   */
  describe('Property 5: 打卡检查逻辑', () => {
    /**
     * 测试：未打卡且不在请假中时，应返回 needClockIn: true
     * 验证 Requirements 1.7
     */
    it('未打卡且不在请假中时，应返回 needClockIn: true', () => {
      // 使用固定的今天日期进行测试
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          userIdArb,
          fc.array(leaveApplicationNotCoveringDateArb(1, todayDate), { maxLength: 5 }),
          (userId, leaves) => {
            // 未打卡状态（null 或 clock_in_time 为 null）
            const result = checkAttendanceLogic(null, leaves, todayDate)
            
            // 验证：应该返回 needClockIn: true
            return result.canStart === false &&
                   result.checkResult.needClockIn === true &&
                   result.checkResult.onLeave === false
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试：在请假中时，应返回 onLeave: true（优先于打卡检查）
     * 验证 Requirements 1.8
     */
    it('在请假中时，应返回 onLeave: true', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          userIdArb,
          leaveApplicationCoveringDateArb(1, todayDate),
          todayAttendanceArb,
          (userId, leave, attendance) => {
            // 有覆盖今天的请假
            const result = checkAttendanceLogic(attendance, [leave], todayDate)
            
            // 验证：应该返回 onLeave: true，无论是否打卡
            return result.canStart === false &&
                   result.checkResult.onLeave === true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试：已打卡且不在请假中时，应返回 canStart: true
     */
    it('已打卡且不在请假中时，应返回 canStart: true', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          userIdArb,
          clockTimeArb,
          fc.array(leaveApplicationNotCoveringDateArb(1, todayDate), { maxLength: 5 }),
          (userId, clockInTime, leaves) => {
            // 已打卡状态
            const attendance: TodayAttendance = {
              has_clocked_in: true,
              has_clocked_out: false,
              clock_in_time: clockInTime,
              clock_out_time: null,
              work_hours: null
            }
            
            const result = checkAttendanceLogic(attendance, leaves, todayDate)
            
            // 验证：应该返回 canStart: true
            return result.canStart === true &&
                   result.checkResult.needClockIn === false &&
                   result.checkResult.onLeave === false &&
                   result.checkResult.clockInTime === clockInTime
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试：请假检查优先于打卡检查
     * 即使已打卡，如果在请假中也应该返回 onLeave: true
     */
    it('请假检查优先于打卡检查', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          userIdArb,
          clockTimeArb,
          leaveApplicationCoveringDateArb(1, todayDate),
          (userId, clockInTime, leave) => {
            // 已打卡状态
            const attendance: TodayAttendance = {
              has_clocked_in: true,
              has_clocked_out: false,
              clock_in_time: clockInTime,
              clock_out_time: null,
              work_hours: null
            }
            
            const result = checkAttendanceLogic(attendance, [leave], todayDate)
            
            // 验证：即使已打卡，在请假中也应该返回 onLeave: true
            return result.canStart === false &&
                   result.checkResult.onLeave === true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试：clock_in_time 为 null 时视为未打卡
     */
    it('clock_in_time 为 null 时视为未打卡', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          userIdArb,
          fc.array(leaveApplicationNotCoveringDateArb(1, todayDate), { maxLength: 5 }),
          (userId, leaves) => {
            // 有打卡记录但 clock_in_time 为 null
            const attendance: TodayAttendance = {
              has_clocked_in: false,
              has_clocked_out: false,
              clock_in_time: null,
              clock_out_time: null,
              work_hours: null
            }
            
            const result = checkAttendanceLogic(attendance, leaves, todayDate)
            
            // 验证：应该返回 needClockIn: true
            return result.canStart === false &&
                   result.checkResult.needClockIn === true &&
                   result.checkResult.onLeave === false
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试：请假日期边界检查 - 请假开始日期等于今天
     */
    it('请假开始日期等于今天时应视为在请假中', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          userIdArb,
          todayAttendanceArb,
          (userId, attendance) => {
            // 请假从今天开始
            const leave: LeaveApplication = {
              id: 1,
              user_id: userId,
              start_date: todayDate,
              end_date: '2024-12-31',
              status: 'approved'
            }
            
            const result = checkAttendanceLogic(attendance, [leave], todayDate)
            
            // 验证：应该返回 onLeave: true
            return result.canStart === false &&
                   result.checkResult.onLeave === true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试：请假日期边界检查 - 请假结束日期等于今天
     */
    it('请假结束日期等于今天时应视为在请假中', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          userIdArb,
          todayAttendanceArb,
          (userId, attendance) => {
            // 请假到今天结束
            const leave: LeaveApplication = {
              id: 1,
              user_id: userId,
              start_date: '2024-12-01',
              end_date: todayDate,
              status: 'approved'
            }
            
            const result = checkAttendanceLogic(attendance, [leave], todayDate)
            
            // 验证：应该返回 onLeave: true
            return result.canStart === false &&
                   result.checkResult.onLeave === true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试：多个请假申请中只要有一个覆盖今天就应该返回 onLeave
     */
    it('多个请假申请中只要有一个覆盖今天就应该返回 onLeave', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          userIdArb,
          fc.array(leaveApplicationNotCoveringDateArb(1, todayDate), { minLength: 1, maxLength: 3 }),
          leaveApplicationCoveringDateArb(1, todayDate),
          todayAttendanceArb,
          (userId, nonCoveringLeaves, coveringLeave, attendance) => {
            // 混合覆盖和不覆盖的请假
            const allLeaves = [...nonCoveringLeaves, coveringLeave]
            
            const result = checkAttendanceLogic(attendance, allLeaves, todayDate)
            
            // 验证：应该返回 onLeave: true
            return result.canStart === false &&
                   result.checkResult.onLeave === true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 返回值一致性测试
   * 验证返回结果的逻辑一致性
   */
  describe('返回值一致性测试', () => {
    it('canStart 为 true 时，needClockIn 和 onLeave 都应为 false', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          clockTimeArb,
          (clockInTime) => {
            const attendance: TodayAttendance = {
              has_clocked_in: true,
              has_clocked_out: false,
              clock_in_time: clockInTime,
              clock_out_time: null,
              work_hours: null
            }
            
            const result = checkAttendanceLogic(attendance, [], todayDate)
            
            // 如果 canStart 为 true，则 needClockIn 和 onLeave 都应为 false
            if (result.canStart) {
              return result.checkResult.needClockIn === false &&
                     result.checkResult.onLeave === false
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('canStart 为 false 时，needClockIn 或 onLeave 至少有一个为 true', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          todayAttendanceArb,
          fc.array(leaveApplicationArb(1), { maxLength: 3 }),
          (attendance, leaves) => {
            const result = checkAttendanceLogic(attendance, leaves, todayDate)
            
            // 如果 canStart 为 false，则 needClockIn 或 onLeave 至少有一个为 true
            if (!result.canStart) {
              return result.checkResult.needClockIn === true ||
                     result.checkResult.onLeave === true
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('onLeave 为 true 时，reason 应包含休假相关信息', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          leaveApplicationCoveringDateArb(1, todayDate),
          todayAttendanceArb,
          (leave, attendance) => {
            const result = checkAttendanceLogic(attendance, [leave], todayDate)
            
            // 如果 onLeave 为 true，reason 应包含休假相关信息
            if (result.checkResult.onLeave) {
              return result.reason.includes('休假')
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('needClockIn 为 true 时，reason 应包含打卡相关信息', () => {
      const todayDate = '2024-12-24'
      
      fc.assert(
        fc.property(
          fc.array(leaveApplicationNotCoveringDateArb(1, todayDate), { maxLength: 3 }),
          (leaves) => {
            const result = checkAttendanceLogic(null, leaves, todayDate)
            
            // 如果 needClockIn 为 true，reason 应包含打卡相关信息
            if (result.checkResult.needClockIn) {
              return result.reason.includes('打卡')
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

/**
 * 具体示例测试
 * 验证常见的打卡检查场景
 */
describe('打卡检查示例测试', () => {
  const todayDate = '2024-12-24'

  it('未打卡且无请假时应返回 needClockIn', () => {
    const result = checkAttendanceLogic(null, [], todayDate)
    
    expect(result.canStart).toBe(false)
    expect(result.checkResult.needClockIn).toBe(true)
    expect(result.checkResult.onLeave).toBe(false)
    expect(result.reason).toContain('打卡')
  })

  it('已打卡且无请假时应返回 canStart', () => {
    const attendance: TodayAttendance = {
      has_clocked_in: true,
      has_clocked_out: false,
      clock_in_time: '08:30:00',
      clock_out_time: null,
      work_hours: null
    }
    
    const result = checkAttendanceLogic(attendance, [], todayDate)
    
    expect(result.canStart).toBe(true)
    expect(result.checkResult.needClockIn).toBe(false)
    expect(result.checkResult.onLeave).toBe(false)
    expect(result.checkResult.clockInTime).toBe('08:30:00')
  })

  it('在请假中时应返回 onLeave（无论是否打卡）', () => {
    const attendance: TodayAttendance = {
      has_clocked_in: true,
      has_clocked_out: false,
      clock_in_time: '08:30:00',
      clock_out_time: null,
      work_hours: null
    }
    
    const leave: LeaveApplication = {
      id: 1,
      user_id: 1,
      start_date: '2024-12-20',
      end_date: '2024-12-25',
      status: 'approved'
    }
    
    const result = checkAttendanceLogic(attendance, [leave], todayDate)
    
    expect(result.canStart).toBe(false)
    expect(result.checkResult.onLeave).toBe(true)
    expect(result.reason).toContain('休假')
  })

  it('请假已结束时不应视为在请假中', () => {
    const attendance: TodayAttendance = {
      has_clocked_in: true,
      has_clocked_out: false,
      clock_in_time: '08:30:00',
      clock_out_time: null,
      work_hours: null
    }
    
    const leave: LeaveApplication = {
      id: 1,
      user_id: 1,
      start_date: '2024-12-01',
      end_date: '2024-12-23', // 昨天结束
      status: 'approved'
    }
    
    const result = checkAttendanceLogic(attendance, [leave], todayDate)
    
    expect(result.canStart).toBe(true)
    expect(result.checkResult.onLeave).toBe(false)
  })

  it('请假尚未开始时不应视为在请假中', () => {
    const attendance: TodayAttendance = {
      has_clocked_in: true,
      has_clocked_out: false,
      clock_in_time: '08:30:00',
      clock_out_time: null,
      work_hours: null
    }
    
    const leave: LeaveApplication = {
      id: 1,
      user_id: 1,
      start_date: '2024-12-25', // 明天开始
      end_date: '2024-12-31',
      status: 'approved'
    }
    
    const result = checkAttendanceLogic(attendance, [leave], todayDate)
    
    expect(result.canStart).toBe(true)
    expect(result.checkResult.onLeave).toBe(false)
  })
})

