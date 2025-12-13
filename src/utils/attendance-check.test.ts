/**
 * 考勤打卡检测工具 - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'
import type {AttendanceCheckResult} from './attendance-check'

// Mock 依赖
vi.mock('@/db/api/attendance', () => ({
  getTodayAttendance: vi.fn()
}))

vi.mock('@/db/api/dashboard', () => ({
  getApprovedLeaveForToday: vi.fn()
}))

vi.mock('./logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }))
}))

// 导入被测试的函数
import {checkTodayAttendance, canStartPieceWork, canClockIn} from './attendance-check'
import {getTodayAttendance} from '@/db/api/attendance'
import {getApprovedLeaveForToday} from '@/db/api/dashboard'

describe('attendance-check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkTodayAttendance', () => {
    it('应该返回请假状态当用户有已批准的请假', async () => {
      const mockLeaveRecord = {
        id: 'leave-1',
        leave_type: '事假'
      }
      vi.mocked(getApprovedLeaveForToday).mockResolvedValue(mockLeaveRecord)

      const result = await checkTodayAttendance('user-1')

      expect(result.needClockIn).toBe(false)
      expect(result.hasClockedIn).toBe(false)
      expect(result.onLeave).toBe(true)
      expect(result.leaveId).toBe('leave-1')
      expect(result.leaveType).toBe('事假')
      expect(result.message).toBe('今天您休息，无需打卡')
    })

    it('应该返回已打卡状态当用户已打卡', async () => {
      vi.mocked(getApprovedLeaveForToday).mockResolvedValue(null)
      vi.mocked(getTodayAttendance).mockResolvedValue({
        id: 'attendance-1',
        user_id: 'user-1',
        work_date: '2024-12-13',
        clock_in_time: '08:00:00',
        status: 'normal'
      } as any)

      const result = await checkTodayAttendance('user-1')

      expect(result.needClockIn).toBe(false)
      expect(result.hasClockedIn).toBe(true)
      expect(result.onLeave).toBe(false)
      expect(result.message).toBe('今天已打卡')
    })

    it('应该返回需要打卡状态当用户未打卡且未请假', async () => {
      vi.mocked(getApprovedLeaveForToday).mockResolvedValue(null)
      vi.mocked(getTodayAttendance).mockResolvedValue(null)

      const result = await checkTodayAttendance('user-1')

      expect(result.needClockIn).toBe(true)
      expect(result.hasClockedIn).toBe(false)
      expect(result.onLeave).toBe(false)
      expect(result.message).toBe('今天尚未打卡')
    })

    it('应该在发生错误时返回默认状态', async () => {
      vi.mocked(getApprovedLeaveForToday).mockRejectedValue(new Error('网络错误'))

      const result = await checkTodayAttendance('user-1')

      expect(result.needClockIn).toBe(false)
      expect(result.hasClockedIn).toBe(false)
      expect(result.onLeave).toBe(false)
      expect(result.message).toBe('检测失败，请稍后重试')
    })
  })

  describe('canStartPieceWork', () => {
    it('应该返回不能计件当用户在请假中', async () => {
      vi.mocked(getApprovedLeaveForToday).mockResolvedValue({
        id: 'leave-1',
        leave_type: '病假'
      })

      const result = await canStartPieceWork('user-1')

      expect(result.canStart).toBe(false)
      expect(result.reason).toBe('您今天在休假中，无法进行计件操作')
      expect(result.checkResult.onLeave).toBe(true)
    })

    it('应该返回不能计件当用户未打卡', async () => {
      vi.mocked(getApprovedLeaveForToday).mockResolvedValue(null)
      vi.mocked(getTodayAttendance).mockResolvedValue(null)

      const result = await canStartPieceWork('user-1')

      expect(result.canStart).toBe(false)
      expect(result.reason).toBe('您今天尚未打卡，请先完成打卡')
      expect(result.checkResult.needClockIn).toBe(true)
    })

    it('应该返回可以计件当用户已打卡', async () => {
      vi.mocked(getApprovedLeaveForToday).mockResolvedValue(null)
      vi.mocked(getTodayAttendance).mockResolvedValue({
        id: 'attendance-1',
        user_id: 'user-1',
        work_date: '2024-12-13',
        clock_in_time: '08:00:00',
        status: 'normal'
      } as any)

      const result = await canStartPieceWork('user-1')

      expect(result.canStart).toBe(true)
      expect(result.reason).toBeUndefined()
      expect(result.checkResult.hasClockedIn).toBe(true)
    })
  })

  describe('canClockIn', () => {
    it('应该返回不能打卡当用户在请假中', async () => {
      vi.mocked(getApprovedLeaveForToday).mockResolvedValue({
        id: 'leave-1',
        leave_type: '年假'
      })

      const result = await canClockIn('user-1')

      expect(result.canClockIn).toBe(false)
      expect(result.reason).toBe('您今天在休假中，无需打卡')
      expect(result.checkResult.onLeave).toBe(true)
    })

    it('应该返回不能打卡当用户已打卡', async () => {
      vi.mocked(getApprovedLeaveForToday).mockResolvedValue(null)
      vi.mocked(getTodayAttendance).mockResolvedValue({
        id: 'attendance-1',
        user_id: 'user-1',
        work_date: '2024-12-13',
        clock_in_time: '08:00:00',
        status: 'normal'
      } as any)

      const result = await canClockIn('user-1')

      expect(result.canClockIn).toBe(false)
      expect(result.reason).toBe('您今天已经打卡了')
      expect(result.checkResult.hasClockedIn).toBe(true)
    })

    it('应该返回可以打卡当用户未打卡且未请假', async () => {
      vi.mocked(getApprovedLeaveForToday).mockResolvedValue(null)
      vi.mocked(getTodayAttendance).mockResolvedValue(null)

      const result = await canClockIn('user-1')

      expect(result.canClockIn).toBe(true)
      expect(result.reason).toBeUndefined()
      expect(result.checkResult.needClockIn).toBe(true)
    })
  })
})
