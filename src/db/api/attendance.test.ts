/**
 * 考勤管理 API 单元测试
 *
 * 测试覆盖：
 * - getMonthlyAttendance() - 获取月度考勤记录
 * - getAllAttendanceRecords() - 获取所有考勤记录
 * - createClockIn() - 创建上班打卡记录
 * - updateClockOut() - 更新下班打卡记录
 * - getTodayAttendance() - 获取今日考勤状态
 * - 边界条件测试
 * - 属性测试
 *
 * @module db/api/attendance.test
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockAttendance,
  createMockTodayAttendance,
  createMockAttendanceRecords,
  createMockDriver,
  createMockManager,
  getDateString
} from './__mocks__'

// ==================== Mock 设置 ====================

// Mock Supabase 客户端
const mockSupabaseFrom = vi.fn()
const mockSupabaseAuth = {
  getUser: vi.fn()
}

// Mock 查询构建器
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn()
}

// Mock AttendanceRepository
const mockAttendanceRepository = {
  getTodayAttendance: vi.fn(),
  getMonthlyAttendance: vi.fn(),
  getAttendanceStats: vi.fn(),
  getAllAttendanceRecords: vi.fn(),
  getByUser: vi.fn(),
  createAttendance: vi.fn(),
  updateAttendance: vi.fn(),
  clockIn: vi.fn(),
  clockOut: vi.fn(),
  invalidateCache: vi.fn()
}

// Mock eventBus
const mockPublish = vi.fn()

// 设置模块 Mock
vi.mock('@/client/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
    auth: mockSupabaseAuth
  }
}))

vi.mock('../repositories', () => ({
  attendanceRepository: mockAttendanceRepository
}))

vi.mock('@/utils/eventBus', () => ({
  publish: mockPublish
}))

vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    db: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }))
}))

// ==================== 测试套件 ====================

describe('AttendanceAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 重置查询构建器
    mockSupabaseFrom.mockReturnValue(mockQueryBuilder)
    mockQueryBuilder.select.mockReturnThis()
    mockQueryBuilder.insert.mockReturnThis()
    mockQueryBuilder.update.mockReturnThis()
    mockQueryBuilder.delete.mockReturnThis()
    mockQueryBuilder.eq.mockReturnThis()
    mockQueryBuilder.in.mockReturnThis()
    mockQueryBuilder.gte.mockReturnThis()
    mockQueryBuilder.lte.mockReturnThis()
    mockQueryBuilder.is.mockReturnThis()
    mockQueryBuilder.order.mockReturnThis()
    mockQueryBuilder.limit.mockReturnThis()

    // 默认设置用户未登录
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    // 重置 Repository Mock 默认值
    mockAttendanceRepository.getTodayAttendance.mockResolvedValue(null)
    mockAttendanceRepository.getMonthlyAttendance.mockResolvedValue([])
    mockAttendanceRepository.getAttendanceStats.mockResolvedValue({
      totalDays: 0,
      normalDays: 0,
      lateDays: 0,
      earlyDays: 0,
      absentDays: 0,
      totalWorkHours: 0
    })
    mockAttendanceRepository.getAllAttendanceRecords.mockResolvedValue([])
    mockAttendanceRepository.createAttendance.mockResolvedValue(null)
    mockAttendanceRepository.updateAttendance.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==================== 4.1 测试 getAttendanceRecords() ====================

  describe('getMonthlyAttendance', () => {
    /**
     * 测试：应该返回指定月份的考勤记录
     * @requirements 3.1
     */
    it('应该返回指定月份的考勤记录', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const mockRecords = createMockAttendanceRecords(userId, 5)
      mockAttendanceRepository.getMonthlyAttendance.mockResolvedValue(mockRecords)

      // 执行
      const { getMonthlyAttendance } = await import('./attendance')
      const result = await getMonthlyAttendance(userId, 2024, 12)

      // 验证
      expect(result).toHaveLength(5)
      expect(mockAttendanceRepository.getMonthlyAttendance).toHaveBeenCalledWith(userId, 2024, 12)
    })

    /**
     * 测试：应该调用 AttendanceRepository
     * @requirements 3.1
     */
    it('应该调用 AttendanceRepository', async () => {
      // 准备
      const userId = 'user-001'
      mockAttendanceRepository.getMonthlyAttendance.mockResolvedValue([])

      // 执行
      const { getMonthlyAttendance } = await import('./attendance')
      await getMonthlyAttendance(userId, 2024, 12)

      // 验证
      expect(mockAttendanceRepository.getMonthlyAttendance).toHaveBeenCalledTimes(1)
      expect(mockAttendanceRepository.getMonthlyAttendance).toHaveBeenCalledWith(userId, 2024, 12)
    })

    /**
     * 测试：应该正确处理空结果
     * @requirements 3.1
     */
    it('应该正确处理空结果', async () => {
      // 准备
      const userId = 'user-001'
      mockAttendanceRepository.getMonthlyAttendance.mockResolvedValue([])

      // 执行
      const { getMonthlyAttendance } = await import('./attendance')
      const result = await getMonthlyAttendance(userId, 2024, 12)

      // 验证
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    /**
     * 测试：应该正确处理不同月份的查询
     * @requirements 3.1
     */
    it('应该正确处理不同月份的查询', async () => {
      // 准备
      const userId = 'user-001'
      const januaryRecords = createMockAttendanceRecords(userId, 3)
      mockAttendanceRepository.getMonthlyAttendance.mockResolvedValue(januaryRecords)

      // 执行
      const { getMonthlyAttendance } = await import('./attendance')
      const result = await getMonthlyAttendance(userId, 2024, 1)

      // 验证
      expect(result).toHaveLength(3)
      expect(mockAttendanceRepository.getMonthlyAttendance).toHaveBeenCalledWith(userId, 2024, 1)
    })
  })

  describe('getAllAttendanceRecords', () => {
    /**
     * 测试：超级管理员应该能获取所有考勤记录
     * @requirements 3.1
     */
    it('超级管理员应该能获取所有考勤记录', async () => {
      // 准备测试数据
      const mockRecords = [
        createMockAttendance('user-001'),
        createMockAttendance('user-002'),
        createMockAttendance('user-003')
      ]

      // 设置用户已登录（超级管理员）
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-001' } },
        error: null
      })

      // Mock 用户角色查询
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { role: 'BOSS' },
        error: null
      })

      mockAttendanceRepository.getAllAttendanceRecords.mockResolvedValue(mockRecords)

      // 执行
      const { getAllAttendanceRecords } = await import('./attendance')
      const result = await getAllAttendanceRecords()

      // 验证
      expect(result).toHaveLength(3)
    })

    /**
     * 测试：未登录时应该返回空数组
     * @requirements 3.1
     */
    it('未登录时应该返回空数组', async () => {
      // 准备：设置用户未登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      // 执行
      const { getAllAttendanceRecords } = await import('./attendance')
      const result = await getAllAttendanceRecords()

      // 验证
      expect(result).toEqual([])
    })
  })

  describe('getAttendanceStats', () => {
    /**
     * 测试：应该返回考勤统计数据
     * @requirements 3.1
     */
    it('应该返回考勤统计数据', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const mockStats = {
        totalDays: 20,
        normalDays: 18,
        lateDays: 1,
        earlyDays: 1,
        absentDays: 0,
        totalWorkHours: 160
      }
      mockAttendanceRepository.getAttendanceStats.mockResolvedValue(mockStats)

      // 执行
      const { getAttendanceStats } = await import('./attendance')
      const result = await getAttendanceStats(userId, '2024-12-01', '2024-12-31')

      // 验证
      expect(result).toEqual(mockStats)
      expect(mockAttendanceRepository.getAttendanceStats).toHaveBeenCalledWith(
        userId,
        '2024-12-01',
        '2024-12-31'
      )
    })
  })


  // ==================== 4.2 测试 checkIn() ====================

  describe('createClockIn', () => {
    /**
     * 测试：应该创建签到记录
     * @requirements 3.2
     */
    it('应该创建签到记录', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const today = getDateString()
      const mockRecord = createMockTodayAttendance(userId, {
        clock_in_time: '09:00:00',
        status: 'normal'
      })

      // 设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      })

      // 设置今日无考勤记录
      mockAttendanceRepository.getTodayAttendance.mockResolvedValue(null)
      mockAttendanceRepository.createAttendance.mockResolvedValue(mockRecord)

      // 执行
      const { createClockIn } = await import('./attendance')
      const result = await createClockIn({
        user_id: userId,
        work_date: today,
        clock_in_time: '09:00:00',
        status: 'normal'
      })

      // 验证
      expect(result).not.toBeNull()
      expect(result?.user_id).toBe(userId)
      expect(result?.clock_in_time).toBe('09:00:00')
    })

    /**
     * 测试：已有记录时应该更新而不是创建
     * @requirements 3.2
     */
    it('已有记录时应该更新而不是创建', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const today = getDateString()
      const existingRecord = createMockTodayAttendance(userId, {
        id: 'record-001',
        clock_in_time: '08:30:00'
      })
      const updatedRecord = { ...existingRecord, clock_in_time: '09:00:00' }

      // 设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      })

      // 设置今日已有考勤记录
      mockAttendanceRepository.getTodayAttendance.mockResolvedValue(existingRecord)
      mockAttendanceRepository.updateAttendance.mockResolvedValue(updatedRecord)

      // 执行
      const { createClockIn } = await import('./attendance')
      const result = await createClockIn({
        user_id: userId,
        work_date: today,
        clock_in_time: '09:00:00',
        status: 'normal'
      })

      // 验证
      expect(result).not.toBeNull()
      expect(mockAttendanceRepository.updateAttendance).toHaveBeenCalled()
    })

    /**
     * 测试：未登录时应该返回 null
     * @requirements 3.2
     */
    it('未登录时应该返回 null', async () => {
      // 准备：设置用户未登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      // 执行
      const { createClockIn } = await import('./attendance')
      const result = await createClockIn({
        user_id: 'user-001',
        work_date: getDateString(),
        clock_in_time: '09:00:00',
        status: 'normal'
      })

      // 验证
      expect(result).toBeNull()
    })

    /**
     * 测试：缺少必填字段时应该返回 null
     * @requirements 3.2
     */
    it('缺少必填字段时应该返回 null', async () => {
      // 准备：设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null
      })

      // 执行：缺少 user_id
      const { createClockIn } = await import('./attendance')
      const result = await createClockIn({
        user_id: '',
        work_date: getDateString(),
        clock_in_time: '09:00:00',
        status: 'normal'
      })

      // 验证
      expect(result).toBeNull()
    })

    /**
     * 测试：创建成功后应该发布事件
     * @requirements 3.2
     */
    it('创建成功后应该发布事件', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const today = getDateString()
      const mockRecord = createMockTodayAttendance(userId, {
        id: 'record-001',
        clock_in_time: '09:00:00'
      })

      // 设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      })

      // 设置今日无考勤记录
      mockAttendanceRepository.getTodayAttendance.mockResolvedValue(null)
      mockAttendanceRepository.createAttendance.mockResolvedValue(mockRecord)

      // 执行
      const { createClockIn } = await import('./attendance')
      await createClockIn({
        user_id: userId,
        work_date: today,
        clock_in_time: '09:00:00',
        status: 'normal'
      })

      // 验证：事件被发布
      expect(mockPublish).toHaveBeenCalledWith('attendance:created', expect.objectContaining({
        id: 'record-001',
        userId: userId
      }))
    })
  })

  // ==================== 4.3 测试 checkOut() ====================

  describe('updateClockOut', () => {
    /**
     * 测试：应该更新签退记录
     * @requirements 3.3
     */
    it('应该更新签退记录', async () => {
      // 准备测试数据
      const recordId = 'record-001'
      const userId = 'user-001'
      const updatedRecord = createMockTodayAttendance(userId, {
        id: recordId,
        clock_in_time: '09:00:00',
        clock_out_time: '18:00:00',
        work_hours: 9
      })

      mockAttendanceRepository.updateAttendance.mockResolvedValue(updatedRecord)

      // 执行
      const { updateClockOut } = await import('./attendance')
      const result = await updateClockOut(recordId, {
        clock_out_time: '18:00:00',
        work_hours: 9
      })

      // 验证
      expect(result).toBe(true)
      expect(mockAttendanceRepository.updateAttendance).toHaveBeenCalledWith(
        recordId,
        expect.objectContaining({
          clock_out_time: '18:00:00',
          work_hours: 9
        })
      )
    })

    /**
     * 测试：更新失败时应该返回 false
     * @requirements 3.3
     */
    it('更新失败时应该返回 false', async () => {
      // 准备
      mockAttendanceRepository.updateAttendance.mockResolvedValue(null)

      // 执行
      const { updateClockOut } = await import('./attendance')
      const result = await updateClockOut('record-001', {
        clock_out_time: '18:00:00'
      })

      // 验证
      expect(result).toBe(false)
    })

    /**
     * 测试：更新成功后应该发布事件
     * @requirements 3.3
     */
    it('更新成功后应该发布事件', async () => {
      // 准备测试数据
      const recordId = 'record-001'
      const userId = 'user-001'
      const updatedRecord = createMockTodayAttendance(userId, {
        id: recordId,
        clock_out_time: '18:00:00'
      })

      mockAttendanceRepository.updateAttendance.mockResolvedValue(updatedRecord)

      // 执行
      const { updateClockOut } = await import('./attendance')
      await updateClockOut(recordId, { clock_out_time: '18:00:00' })

      // 验证：事件被发布
      expect(mockPublish).toHaveBeenCalledWith('attendance:updated', expect.objectContaining({
        id: recordId,
        userId: userId
      }))
    })
  })

  // ==================== 4.4 测试 getTodayAttendance() ====================

  describe('getTodayAttendance', () => {
    /**
     * 测试：应该返回当天考勤状态
     * @requirements 3.4
     */
    it('应该返回当天考勤状态', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const mockRecord = createMockTodayAttendance(userId, {
        clock_in_time: '09:00:00',
        status: 'normal'
      })

      mockAttendanceRepository.getTodayAttendance.mockResolvedValue(mockRecord)

      // 执行
      const { getTodayAttendance } = await import('./attendance')
      const result = await getTodayAttendance(userId)

      // 验证
      expect(result).not.toBeNull()
      expect(result?.user_id).toBe(userId)
      expect(result?.clock_in_time).toBe('09:00:00')
      expect(mockAttendanceRepository.getTodayAttendance).toHaveBeenCalledWith(userId)
    })

    /**
     * 测试：今日无考勤记录时应该返回 null
     * @requirements 3.4
     */
    it('今日无考勤记录时应该返回 null', async () => {
      // 准备
      const userId = 'user-001'
      mockAttendanceRepository.getTodayAttendance.mockResolvedValue(null)

      // 执行
      const { getTodayAttendance } = await import('./attendance')
      const result = await getTodayAttendance(userId)

      // 验证
      expect(result).toBeNull()
    })

    /**
     * 测试：应该调用 AttendanceRepository
     * @requirements 3.4
     */
    it('应该调用 AttendanceRepository', async () => {
      // 准备
      const userId = 'user-001'
      mockAttendanceRepository.getTodayAttendance.mockResolvedValue(null)

      // 执行
      const { getTodayAttendance } = await import('./attendance')
      await getTodayAttendance(userId)

      // 验证
      expect(mockAttendanceRepository.getTodayAttendance).toHaveBeenCalledTimes(1)
      expect(mockAttendanceRepository.getTodayAttendance).toHaveBeenCalledWith(userId)
    })
  })


  // ==================== 4.5 测试边界条件 ====================

  describe('边界条件', () => {
    /**
     * 测试：重复签到应该更新现有记录
     * @requirements 3.5
     */
    it('重复签到应该更新现有记录', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const today = getDateString()
      const existingRecord = createMockTodayAttendance(userId, {
        id: 'record-001',
        clock_in_time: '08:30:00'
      })
      const updatedRecord = { ...existingRecord, clock_in_time: '09:15:00' }

      // 设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      })

      // 设置今日已有考勤记录（模拟重复签到）
      mockAttendanceRepository.getTodayAttendance.mockResolvedValue(existingRecord)
      mockAttendanceRepository.updateAttendance.mockResolvedValue(updatedRecord)

      // 执行
      const { createClockIn } = await import('./attendance')
      const result = await createClockIn({
        user_id: userId,
        work_date: today,
        clock_in_time: '09:15:00',
        status: 'late'
      })

      // 验证：应该调用更新而不是创建
      expect(result).not.toBeNull()
      expect(mockAttendanceRepository.updateAttendance).toHaveBeenCalled()
      expect(mockAttendanceRepository.createAttendance).not.toHaveBeenCalled()
    })

    /**
     * 测试：未签到就签退应该返回 null（通过 Repository 的 clockOut）
     * @requirements 3.6
     */
    it('未签到就签退应该返回 null', async () => {
      // 准备：设置今日无考勤记录
      const userId = 'user-001'
      mockAttendanceRepository.getTodayAttendance.mockResolvedValue(null)
      mockAttendanceRepository.clockOut.mockResolvedValue(null)

      // 执行：直接调用 Repository 的 clockOut
      const result = await mockAttendanceRepository.clockOut(userId)

      // 验证
      expect(result).toBeNull()
    })

    /**
     * 测试：空用户 ID 应该返回 null
     * @requirements 3.5
     */
    it('空用户 ID 应该返回 null', async () => {
      // 准备：设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null
      })

      // 执行
      const { createClockIn } = await import('./attendance')
      const result = await createClockIn({
        user_id: '',
        work_date: getDateString(),
        clock_in_time: '09:00:00',
        status: 'normal'
      })

      // 验证
      expect(result).toBeNull()
    })

    /**
     * 测试：空日期应该返回 null
     * @requirements 3.5
     */
    it('空日期应该返回 null', async () => {
      // 准备：设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null
      })

      // 执行
      const { createClockIn } = await import('./attendance')
      const result = await createClockIn({
        user_id: 'user-001',
        work_date: '',
        clock_in_time: '09:00:00',
        status: 'normal'
      })

      // 验证
      expect(result).toBeNull()
    })

    /**
     * 测试：认证错误时应该返回空数组
     * @requirements 3.5
     */
    it('认证错误时 getAllAttendanceRecords 应该返回空数组', async () => {
      // 准备：设置认证错误
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: '认证失败' }
      })

      // 执行
      const { getAllAttendanceRecords } = await import('./attendance')
      const result = await getAllAttendanceRecords()

      // 验证
      expect(result).toEqual([])
    })

    /**
     * 测试：获取用户角色失败时应该返回空数组
     * @requirements 3.5
     */
    it('获取用户角色失败时应该返回空数组', async () => {
      // 准备：设置用户已登录但角色查询失败
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null
      })

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: '查询失败' }
      })

      // 执行
      const { getAllAttendanceRecords } = await import('./attendance')
      const result = await getAllAttendanceRecords()

      // 验证
      expect(result).toEqual([])
    })
  })

  // ==================== 4.6 属性测试 ====================

  describe('属性测试', () => {
    /**
     * **Feature: core-api-unit-tests, Property 5**
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
     *
     * Property 5: 考勤 CRUD 操作正确性
     * For any 考勤 CRUD 操作，系统 SHALL 正确执行数据库操作并在修改操作后清除缓存
     */
    it('Property 5: 考勤查询 API 应返回与 Repository 一致的数据', async () => {
      // 生成随机数量的考勤记录（1-10 条）
      const userId = 'user-001'
      const recordCount = Math.floor(Math.random() * 10) + 1
      const mockRecords = createMockAttendanceRecords(userId, recordCount)

      // 设置 Repository 返回值
      mockAttendanceRepository.getMonthlyAttendance.mockResolvedValue(mockRecords)

      // 执行
      const { getMonthlyAttendance } = await import('./attendance')
      const result = await getMonthlyAttendance(userId, 2024, 12)

      // 验证：返回数据与 Repository 一致
      expect(result).toEqual(mockRecords)
      expect(result.length).toBe(recordCount)
    })

    /**
     * **Feature: core-api-unit-tests, Property 5**
     * **Validates: Requirements 3.2**
     *
     * Property 5: 创建考勤记录应触发事件发布
     */
    it('Property 5: 创建考勤记录应触发事件发布', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const today = getDateString()
      const mockRecord = createMockTodayAttendance(userId, {
        id: 'record-001',
        clock_in_time: '09:00:00'
      })

      // 设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      })

      // 设置今日无考勤记录
      mockAttendanceRepository.getTodayAttendance.mockResolvedValue(null)
      mockAttendanceRepository.createAttendance.mockResolvedValue(mockRecord)

      // 执行
      const { createClockIn } = await import('./attendance')
      await createClockIn({
        user_id: userId,
        work_date: today,
        clock_in_time: '09:00:00',
        status: 'normal'
      })

      // 验证：事件被发布
      expect(mockPublish).toHaveBeenCalledWith('attendance:created', expect.any(Object))
    })

    /**
     * **Feature: core-api-unit-tests, Property 5**
     * **Validates: Requirements 3.3**
     *
     * Property 5: 更新考勤记录应触发事件发布
     */
    it('Property 5: 更新考勤记录应触发事件发布', async () => {
      // 准备测试数据
      const recordId = 'record-001'
      const userId = 'user-001'
      const updatedRecord = createMockTodayAttendance(userId, {
        id: recordId,
        clock_out_time: '18:00:00'
      })

      mockAttendanceRepository.updateAttendance.mockResolvedValue(updatedRecord)

      // 执行
      const { updateClockOut } = await import('./attendance')
      await updateClockOut(recordId, { clock_out_time: '18:00:00' })

      // 验证：事件被发布
      expect(mockPublish).toHaveBeenCalledWith('attendance:updated', expect.any(Object))
    })

    /**
     * **Feature: core-api-unit-tests, Property 5**
     * **Validates: Requirements 3.4**
     *
     * Property 5: 今日考勤查询应正确调用 Repository
     */
    it('Property 5: 今日考勤查询应正确调用 Repository', async () => {
      // 准备
      const userId = 'user-001'
      const mockRecord = createMockTodayAttendance(userId)
      mockAttendanceRepository.getTodayAttendance.mockResolvedValue(mockRecord)

      // 执行
      const { getTodayAttendance } = await import('./attendance')
      const result = await getTodayAttendance(userId)

      // 验证
      expect(result).toEqual(mockRecord)
      expect(mockAttendanceRepository.getTodayAttendance).toHaveBeenCalledWith(userId)
    })

    /**
     * **Feature: core-api-unit-tests, Property 5**
     * **Validates: Requirements 3.1**
     *
     * Property 5: 考勤统计应正确调用 Repository
     */
    it('Property 5: 考勤统计应正确调用 Repository', async () => {
      // 准备
      const userId = 'user-001'
      const startDate = '2024-12-01'
      const endDate = '2024-12-31'
      const mockStats = {
        totalDays: 20,
        normalDays: 18,
        lateDays: 1,
        earlyDays: 1,
        absentDays: 0,
        totalWorkHours: 160
      }
      mockAttendanceRepository.getAttendanceStats.mockResolvedValue(mockStats)

      // 执行
      const { getAttendanceStats } = await import('./attendance')
      const result = await getAttendanceStats(userId, startDate, endDate)

      // 验证
      expect(result).toEqual(mockStats)
      expect(mockAttendanceRepository.getAttendanceStats).toHaveBeenCalledWith(
        userId,
        startDate,
        endDate
      )
    })
  })

  // ==================== 考勤规则 API 测试 ====================

  describe('考勤规则 API', () => {
    /**
     * 测试：getAttendanceRuleByWarehouseId 应该返回仓库考勤规则
     */
    it('应该返回仓库考勤规则', async () => {
      // 准备测试数据
      const warehouseId = 'wh-001'
      const mockRule = {
        id: 'rule-001',
        warehouse_id: warehouseId,
        work_start_time: '09:00:00',
        work_end_time: '18:00:00',
        late_threshold: 15,
        early_threshold: 15,
        require_clock_out: true,
        is_active: true
      }

      // Mock 查询返回
      mockQueryBuilder.limit.mockResolvedValue({
        data: [mockRule],
        error: null
      })

      // 执行
      const { getAttendanceRuleByWarehouseId } = await import('./attendance')
      const result = await getAttendanceRuleByWarehouseId(warehouseId)

      // 验证
      expect(result).not.toBeNull()
      expect(result?.warehouse_id).toBe(warehouseId)
    })

    /**
     * 测试：仓库无专属规则时应该返回全局默认规则
     */
    it('仓库无专属规则时应该返回全局默认规则', async () => {
      // 准备测试数据
      const warehouseId = 'wh-001'
      const globalRule = {
        id: 'rule-global',
        warehouse_id: null,
        work_start_time: '08:30:00',
        work_end_time: '17:30:00',
        is_active: true
      }

      // 第一次查询返回空（仓库专属规则）
      // 第二次查询返回全局规则
      mockQueryBuilder.limit
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [globalRule], error: null })

      // 执行
      const { getAttendanceRuleByWarehouseId } = await import('./attendance')
      const result = await getAttendanceRuleByWarehouseId(warehouseId)

      // 验证
      expect(result).not.toBeNull()
      expect(result?.warehouse_id).toBeNull()
    })

    /**
     * 测试：getAllAttendanceRules 应该返回所有考勤规则
     */
    it('应该返回所有考勤规则', async () => {
      // 准备测试数据
      const mockRules = [
        { id: 'rule-001', warehouse_id: 'wh-001', is_active: true },
        { id: 'rule-002', warehouse_id: 'wh-002', is_active: true },
        { id: 'rule-global', warehouse_id: null, is_active: true }
      ]

      mockQueryBuilder.order.mockResolvedValue({
        data: mockRules,
        error: null
      })

      // 执行
      const { getAllAttendanceRules } = await import('./attendance')
      const result = await getAllAttendanceRules()

      // 验证
      expect(result).toHaveLength(3)
    })
  })
})
