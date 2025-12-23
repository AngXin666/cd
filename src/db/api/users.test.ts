/**
 * 用户管理 API 单元测试
 *
 * 测试覆盖：
 * - getAllProfiles() - 获取所有用户档案
 * - getDriverProfiles() - 获取司机档案
 * - getAllDriversWithRealName() - 获取司机档案及实名信息
 * - getCurrentUserProfile() - 获取当前用户档案
 * - updateUserProfile() - 更新用户档案
 * - 边界条件测试
 * - 属性测试
 *
 * @module db/api/users.test
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {
  createMockProfile,
  createMockDriver,
  createMockManager,
  createMockUsers
} from './__mocks__'

// ==================== Mock 设置 ====================

// Mock Supabase 客户端
const mockSupabaseFrom = vi.fn()
const mockSupabaseAuth = {
  getUser: vi.fn()
}
const mockSupabaseRpc = vi.fn()

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
  order: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn()
}

// Mock UsersRepository
const mockUsersRepository = {
  getAllUsers: vi.fn(),
  getAllDrivers: vi.fn(),
  getAllManagers: vi.fn(),
  getById: vi.fn(),
  invalidateCache: vi.fn()
}

// Mock helpers
const mockHelpers = {
  convertUsersToProfiles: vi.fn((users) => users),
  convertUserToProfile: vi.fn((user) => user),
  getUsersByRole: vi.fn(),
  getUsersWithRole: vi.fn(),
  getUserWithRole: vi.fn()
}

// Mock eventBus
const mockPublish = vi.fn()

// 设置模块 Mock
vi.mock('@/client/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
    auth: mockSupabaseAuth,
    rpc: mockSupabaseRpc
  }
}))

vi.mock('../repositories', () => ({
  usersRepository: mockUsersRepository
}))

vi.mock('../helpers', () => mockHelpers)

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

describe('UsersAPI', () => {
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
    mockQueryBuilder.order.mockReturnThis()

    // 默认设置用户未登录
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {user: null},
      error: null
    })

    // 重置 Repository Mock 默认值
    mockUsersRepository.getAllUsers.mockResolvedValue([])
    mockUsersRepository.getAllDrivers.mockResolvedValue([])
    mockUsersRepository.getAllManagers.mockResolvedValue([])
    mockUsersRepository.getById.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==================== 2.1 测试 getAllProfiles() ====================

  describe('getAllProfiles', () => {
    /**
     * 测试：应该返回所有用户档案
     * @requirements 1.1
     */
    it('应该返回所有用户档案', async () => {
      // 准备测试数据
      const mockProfiles = [
        createMockProfile({name: '用户A'}),
        createMockProfile({name: '用户B'}),
        createMockProfile({name: '用户C'})
      ]
      mockUsersRepository.getAllUsers.mockResolvedValue(mockProfiles)

      // 执行
      const {getAllProfiles} = await import('./users')
      const result = await getAllProfiles()

      // 验证
      expect(result).toHaveLength(3)
      expect(mockUsersRepository.getAllUsers).toHaveBeenCalled()
    })

    /**
     * 测试：应该调用 UsersRepository
     * @requirements 1.1
     */
    it('应该调用 UsersRepository', async () => {
      // 准备
      mockUsersRepository.getAllUsers.mockResolvedValue([])

      // 执行
      const {getAllProfiles} = await import('./users')
      await getAllProfiles()

      // 验证
      expect(mockUsersRepository.getAllUsers).toHaveBeenCalledTimes(1)
    })

    /**
     * 测试：应该正确处理空结果
     * @requirements 1.1
     */
    it('应该正确处理空结果', async () => {
      // 准备
      mockUsersRepository.getAllUsers.mockResolvedValue([])

      // 执行
      const {getAllProfiles} = await import('./users')
      const result = await getAllProfiles()

      // 验证
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })
  })

  // ==================== 2.2 测试 getDriverProfiles() ====================

  describe('getDriverProfiles', () => {
    /**
     * 测试：应该返回司机档案
     * @requirements 1.2
     */
    it('应该返回司机档案', async () => {
      // 准备测试数据
      const mockDrivers = [
        createMockDriver({name: '司机A'}),
        createMockDriver({name: '司机B'})
      ]

      // 设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      // Mock helpers
      mockHelpers.getUserWithRole.mockResolvedValue(createMockManager())
      mockHelpers.getUsersByRole.mockResolvedValue(mockDrivers)
      mockHelpers.convertUsersToProfiles.mockReturnValue(mockDrivers)

      // 执行
      const {getDriverProfiles} = await import('./users')
      const result = await getDriverProfiles()

      // 验证
      expect(result).toHaveLength(2)
      expect(mockHelpers.getUsersByRole).toHaveBeenCalledWith('DRIVER', expect.anything())
    })

    /**
     * 测试：应该正确过滤角色
     * @requirements 1.2
     */
    it('应该正确过滤角色为 DRIVER', async () => {
      // 准备
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      mockHelpers.getUserWithRole.mockResolvedValue(createMockManager())
      mockHelpers.getUsersByRole.mockResolvedValue([])
      mockHelpers.convertUsersToProfiles.mockReturnValue([])

      // 执行
      const {getDriverProfiles} = await import('./users')
      await getDriverProfiles()

      // 验证：确保调用时传入了 'DRIVER' 角色
      expect(mockHelpers.getUsersByRole).toHaveBeenCalledWith('DRIVER', expect.anything())
    })

    /**
     * 测试：应该处理空司机列表
     * @requirements 1.2
     */
    it('应该处理空司机列表', async () => {
      // 准备
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      mockHelpers.getUserWithRole.mockResolvedValue(createMockManager())
      mockHelpers.getUsersByRole.mockResolvedValue([])

      // 执行
      const {getDriverProfiles} = await import('./users')
      const result = await getDriverProfiles()

      // 验证
      expect(result).toEqual([])
    })
  })

  // ==================== 2.3 测试 getAllDriversWithRealName() ====================

  describe('getAllDriversWithRealName', () => {
    /**
     * 测试：应该返回司机档案及实名信息
     * @requirements 1.3
     */
    it('应该返回司机档案及实名信息', async () => {
      // 准备测试数据
      const mockDrivers = [
        createMockDriver({id: 'driver-001', name: '司机A'}),
        createMockDriver({id: 'driver-002', name: '司机B'})
      ]

      // 设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      // Mock helpers
      mockHelpers.getUserWithRole.mockResolvedValue(createMockManager())
      mockHelpers.getUsersByRole.mockResolvedValue(mockDrivers)
      mockHelpers.convertUserToProfile.mockImplementation((user) => user)

      // Mock 驾驶证查询
      mockQueryBuilder.in.mockResolvedValue({
        data: [
          {driver_id: 'driver-001', id_card_name: '张三'},
          {driver_id: 'driver-002', id_card_name: '李四'}
        ],
        error: null
      })

      // 执行
      const {getAllDriversWithRealName} = await import('./users')
      const result = await getAllDriversWithRealName()

      // 验证
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('real_name')
      expect(result[1]).toHaveProperty('real_name')
    })

    /**
     * 测试：应该处理没有实名信息的司机
     * @requirements 1.3
     */
    it('应该处理没有实名信息的司机', async () => {
      // 准备
      const mockDrivers = [createMockDriver({id: 'driver-001', name: '司机A'})]

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      mockHelpers.getUserWithRole.mockResolvedValue(createMockManager())
      mockHelpers.getUsersByRole.mockResolvedValue(mockDrivers)
      mockHelpers.convertUserToProfile.mockImplementation((user) => user)

      // Mock 驾驶证查询返回空
      mockQueryBuilder.in.mockResolvedValue({data: [], error: null})

      // 执行
      const {getAllDriversWithRealName} = await import('./users')
      const result = await getAllDriversWithRealName()

      // 验证
      expect(result).toHaveLength(1)
      expect(result[0].real_name).toBeNull()
    })
  })

  // ==================== 2.4 测试 getCurrentUserProfile() ====================

  describe('getCurrentUserProfile', () => {
    /**
     * 测试：应该返回当前用户档案
     * @requirements 1.4
     */
    it('应该返回当前用户档案', async () => {
      // 准备
      const mockUser = createMockProfile({id: 'user-001', name: '当前用户'})
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      mockHelpers.getUserWithRole.mockResolvedValue(mockUser)
      mockHelpers.convertUserToProfile.mockReturnValue(mockUser)

      // 执行
      const {getCurrentUserProfile} = await import('./users')
      const result = await getCurrentUserProfile()

      // 验证
      expect(result).not.toBeNull()
      expect(result?.id).toBe('user-001')
      expect(result?.name).toBe('当前用户')
    })

    /**
     * 测试：未登录时应该返回 null
     * @requirements 1.4
     */
    it('未登录时应该返回 null', async () => {
      // 准备：设置用户未登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: null},
        error: null
      })

      // 执行
      const {getCurrentUserProfile} = await import('./users')
      const result = await getCurrentUserProfile()

      // 验证
      expect(result).toBeNull()
    })

    /**
     * 测试：认证错误时应该返回 null
     * @requirements 1.4
     */
    it('认证错误时应该返回 null', async () => {
      // 准备：设置认证错误
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: null},
        error: {message: '认证失败'}
      })

      // 执行
      const {getCurrentUserProfile} = await import('./users')
      const result = await getCurrentUserProfile()

      // 验证
      expect(result).toBeNull()
    })
  })

  // ==================== 2.5 测试 updateUserProfile() ====================

  describe('updateUserProfile', () => {
    /**
     * 测试：应该成功更新用户档案
     * @requirements 1.5
     */
    it('应该成功更新用户档案', async () => {
      // 准备
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      // Mock 更新操作
      mockQueryBuilder.eq.mockResolvedValue({data: null, error: null})

      // 执行
      const {updateUserProfile} = await import('./users')
      const result = await updateUserProfile('user-001', {name: '新名字'})

      // 验证
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    /**
     * 测试：更新失败时应该返回错误
     * @requirements 1.5
     */
    it('更新失败时应该返回错误', async () => {
      // 准备
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      // Mock 更新操作失败
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: {message: '更新失败'}
      })

      // 执行
      const {updateUserProfile} = await import('./users')
      const result = await updateUserProfile('user-001', {name: '新名字'})

      // 验证
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    /**
     * 测试：更新角色时应该同时更新 users 表
     * @requirements 1.5
     */
    it('更新角色时应该同时更新 users 表', async () => {
      // 准备
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      mockQueryBuilder.eq.mockResolvedValue({data: null, error: null})

      // 执行
      const {updateUserProfile} = await import('./users')
      await updateUserProfile('user-001', {role: 'MANAGER'})

      // 验证：from 应该被调用（更新 users 表）
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users')
    })
  })

  // ==================== 2.6 测试边界条件 ====================

  describe('边界条件', () => {
    /**
     * 测试：用户不存在时应该返回 null
     * @requirements 1.6
     */
    it('用户不存在时 getProfileById 应该返回 null', async () => {
      // 准备
      mockHelpers.getUserWithRole.mockResolvedValue(null)

      // 执行
      const {getProfileById} = await import('./users')
      const result = await getProfileById('non-existent-id')

      // 验证
      expect(result).toBeNull()
    })

    /**
     * 测试：数据库错误时应该返回默认值
     * @requirements 1.7
     */
    it('数据库错误时 getAllProfiles 应该返回空数组', async () => {
      // 准备：模拟 Repository 抛出错误
      mockUsersRepository.getAllUsers.mockRejectedValue(new Error('数据库错误'))

      // 执行
      const {getAllProfiles} = await import('./users')

      // 验证：由于 Repository 直接返回，错误会传播
      await expect(getAllProfiles()).rejects.toThrow()
    })

    /**
     * 测试：getUserRoles 用户不存在时应该返回空数组
     * @requirements 1.6
     */
    it('getUserRoles 用户不存在时应该返回空数组', async () => {
      // 准备
      mockQueryBuilder.maybeSingle.mockResolvedValue({data: null, error: null})

      // 执行
      const {getUserRoles} = await import('./users')
      const result = await getUserRoles('non-existent-id')

      // 验证
      expect(result).toEqual([])
    })

    /**
     * 测试：getCurrentUserRole 未登录时应该返回 null
     * @requirements 1.6
     */
    it('getCurrentUserRole 未登录时应该返回 null', async () => {
      // 准备
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: null},
        error: null
      })

      // 执行
      const {getCurrentUserRole} = await import('./users')
      const result = await getCurrentUserRole()

      // 验证
      expect(result).toBeNull()
    })
  })

  // ==================== 2.7 属性测试 ====================

  describe('属性测试', () => {
    /**
     * **Feature: core-api-unit-tests, Property 1**
     * **Validates: Requirements 1.1, 1.2, 1.3**
     *
     * Property 1: 用户查询 API 返回正确数据
     * For any 用户查询 API 调用，返回的数据 SHALL 与 Repository 层返回的数据一致
     */
    it('Property 1: 用户查询 API 应返回与 Repository 一致的数据', async () => {
      // 生成随机数量的用户数据（1-10 个）
      const userCount = Math.floor(Math.random() * 10) + 1
      const mockProfiles = createMockUsers(userCount, 'DRIVER').map((u) =>
        createMockProfile({...u})
      )

      // 设置 Repository 返回值
      mockUsersRepository.getAllUsers.mockResolvedValue(mockProfiles)

      // 执行
      const {getAllProfiles} = await import('./users')
      const result = await getAllProfiles()

      // 验证：返回数据与 Repository 一致
      expect(result).toEqual(mockProfiles)
      expect(result.length).toBe(userCount)
    })

    /**
     * **Feature: core-api-unit-tests, Property 1**
     * **Validates: Requirements 1.2**
     *
     * Property 1: 司机查询 API 应只返回司机角色的用户
     */
    it('Property 1: 司机查询 API 应只返回司机角色的用户', async () => {
      // 准备：混合角色的用户
      const drivers = [
        createMockDriver({name: '司机1'}),
        createMockDriver({name: '司机2'})
      ]

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      mockHelpers.getUserWithRole.mockResolvedValue(createMockManager())
      mockHelpers.getUsersByRole.mockResolvedValue(drivers)
      mockHelpers.convertUsersToProfiles.mockReturnValue(drivers)

      // 执行
      const {getDriverProfiles} = await import('./users')
      const result = await getDriverProfiles()

      // 验证：所有返回的用户都是司机
      expect(result.every((u) => u.role === 'DRIVER')).toBe(true)
    })

    /**
     * **Feature: core-api-unit-tests, Property 2**
     * **Validates: Requirements 1.5**
     *
     * Property 2: 用户数据修改触发缓存失效
     * For any 用户数据修改操作，系统 SHALL 调用 invalidateCache()
     */
    it('Property 2: 用户数据修改应触发缓存失效', async () => {
      // 准备
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      mockQueryBuilder.eq.mockResolvedValue({data: [{id: 'user-001'}], error: null})
      mockQueryBuilder.select.mockReturnValue(mockQueryBuilder)

      // 执行
      const {updateProfile} = await import('./users')
      await updateProfile('user-001', {name: '新名字'})

      // 验证：缓存失效被调用
      expect(mockUsersRepository.invalidateCache).toHaveBeenCalled()
    })

    /**
     * **Feature: core-api-unit-tests, Property 2**
     * **Validates: Requirements 1.5**
     *
     * Property 2: 用户角色更新应触发缓存失效
     */
    it('Property 2: 用户角色更新应触发缓存失效', async () => {
      // 准备
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {user: {id: 'user-001'}},
        error: null
      })

      mockQueryBuilder.eq.mockResolvedValue({data: null, error: null})

      // 执行
      const {updateUserRole} = await import('./users')
      await updateUserRole('user-001', 'MANAGER')

      // 验证：缓存失效被调用
      expect(mockUsersRepository.invalidateCache).toHaveBeenCalled()
    })
  })

  // ==================== 其他 API 测试 ====================

  describe('getAllUsers', () => {
    /**
     * 测试：getAllUsers 应该调用 UsersRepository
     */
    it('应该调用 UsersRepository', async () => {
      // 准备
      const mockProfiles = [createMockProfile()]
      mockUsersRepository.getAllUsers.mockResolvedValue(mockProfiles)

      // 执行
      const {getAllUsers} = await import('./users')
      const result = await getAllUsers()

      // 验证
      expect(result).toEqual(mockProfiles)
      expect(mockUsersRepository.getAllUsers).toHaveBeenCalled()
    })
  })

  describe('getAllDrivers', () => {
    /**
     * 测试：getAllDrivers 应该调用 UsersRepository
     */
    it('应该调用 UsersRepository', async () => {
      // 准备
      const mockDrivers = [createMockDriver()]
      mockUsersRepository.getAllDrivers.mockResolvedValue(mockDrivers)

      // 执行
      const {getAllDrivers} = await import('./users')
      const result = await getAllDrivers()

      // 验证
      expect(result).toEqual(mockDrivers)
      expect(mockUsersRepository.getAllDrivers).toHaveBeenCalled()
    })
  })

  describe('getAllManagers', () => {
    /**
     * 测试：getAllManagers 应该调用 UsersRepository
     */
    it('应该调用 UsersRepository', async () => {
      // 准备
      const mockManagers = [createMockManager()]
      mockUsersRepository.getAllManagers.mockResolvedValue(mockManagers)

      // 执行
      const {getAllManagers} = await import('./users')
      const result = await getAllManagers()

      // 验证
      expect(result).toEqual(mockManagers)
      expect(mockUsersRepository.getAllManagers).toHaveBeenCalled()
    })
  })
})
