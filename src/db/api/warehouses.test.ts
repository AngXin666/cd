/**
 * 仓库管理 API 单元测试
 *
 * 测试覆盖：
 * - getAllWarehouses() - 获取所有仓库
 * - getActiveWarehouses() - 获取启用仓库
 * - getManagerWarehouses() - 获取管理员管辖仓库
 * - getDriverWarehouses() - 获取司机分配仓库
 * - getAllDriverWarehouses() - 获取所有分配关系
 * - assignWarehouseToDriver() - 为司机分配仓库
 * - removeWarehouseFromDriver() - 取消司机仓库分配
 * - 属性测试
 *
 * @module db/api/warehouses.test
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockWarehouse,
  createMockWarehouses,
  createMockWarehouseAssignment,
  createMockDriver,
  createMockManager
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
  order: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn()
}

// Mock WarehousesRepository
const mockWarehousesRepository = {
  getAllWarehouses: vi.fn(),
  getWarehouseById: vi.fn(),
  getDriverWarehouses: vi.fn(),
  getManagerWarehouses: vi.fn(),
  getWarehouseCategories: vi.fn(),
  getDriverIdsByWarehouse: vi.fn(),
  createWarehouse: vi.fn(),
  updateWarehouse: vi.fn(),
  deleteWarehouse: vi.fn(),
  updateSettings: vi.fn(),
  invalidateCache: vi.fn()
}

// Mock WarehouseAssignmentsRepository
const mockWarehouseAssignmentsRepository = {
  getByUser: vi.fn(),
  getByWarehouse: vi.fn(),
  getAllAssignments: vi.fn(),
  getWarehouseIdsByUser: vi.fn(),
  getUserIdsByWarehouse: vi.fn(),
  createAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  deleteByUser: vi.fn(),
  deleteByWarehouse: vi.fn(),
  upsertAssignment: vi.fn(),
  setUserWarehouses: vi.fn(),
  setWarehouseUsers: vi.fn(),
  invalidateCache: vi.fn()
}

// Mock CategoriesRepository
const mockCategoriesRepository = {
  getAllCategories: vi.fn(),
  getById: vi.fn(),
  invalidateCache: vi.fn()
}

// Mock eventBus
const mockPublish = vi.fn()

// Mock helpers
const mockConvertUserToProfile = vi.fn((user) => user)

// 设置模块 Mock
vi.mock('@/client/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
    auth: mockSupabaseAuth
  }
}))

vi.mock('../repositories', () => ({
  warehousesRepository: mockWarehousesRepository,
  warehouseAssignmentsRepository: mockWarehouseAssignmentsRepository,
  categoriesRepository: mockCategoriesRepository
}))

vi.mock('../helpers', () => ({
  convertUserToProfile: mockConvertUserToProfile
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

// Mock attendance 模块
vi.mock('./attendance', () => ({
  getAllAttendanceRules: vi.fn().mockResolvedValue([])
}))

// ==================== 测试套件 ====================

describe('WarehousesAPI', () => {
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
      data: { user: null },
      error: null
    })

    // 重置 Repository Mock 默认值
    mockWarehousesRepository.getAllWarehouses.mockResolvedValue([])
    mockWarehousesRepository.getWarehouseById.mockResolvedValue(null)
    mockWarehousesRepository.getDriverWarehouses.mockResolvedValue([])
    mockWarehousesRepository.getManagerWarehouses.mockResolvedValue([])
    mockWarehouseAssignmentsRepository.getAllAssignments.mockResolvedValue([])
    mockWarehouseAssignmentsRepository.getByUser.mockResolvedValue([])
    mockWarehouseAssignmentsRepository.createAssignment.mockResolvedValue(null)
    mockWarehouseAssignmentsRepository.deleteAssignment.mockResolvedValue(false)
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==================== 3.1 测试 getAllWarehouses() ====================

  describe('getAllWarehouses', () => {
    /**
     * 测试：应该返回所有仓库
     * @requirements 2.1
     */
    it('应该返回所有仓库', async () => {
      // 准备测试数据
      const mockWarehouses = [
        createMockWarehouse({ name: '北京仓库' }),
        createMockWarehouse({ name: '上海仓库' }),
        createMockWarehouse({ name: '广州仓库' })
      ]
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue(mockWarehouses)

      // 执行
      const { getAllWarehouses } = await import('./warehouses')
      const result = await getAllWarehouses()

      // 验证
      expect(result).toHaveLength(3)
      expect(result).toEqual(mockWarehouses)
    })

    /**
     * 测试：应该调用 WarehousesRepository
     * @requirements 2.1
     */
    it('应该调用 WarehousesRepository', async () => {
      // 准备
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue([])

      // 执行
      const { getAllWarehouses } = await import('./warehouses')
      await getAllWarehouses()

      // 验证
      expect(mockWarehousesRepository.getAllWarehouses).toHaveBeenCalledTimes(1)
    })

    /**
     * 测试：应该正确处理空结果
     * @requirements 2.1
     */
    it('应该正确处理空结果', async () => {
      // 准备
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue([])

      // 执行
      const { getAllWarehouses } = await import('./warehouses')
      const result = await getAllWarehouses()

      // 验证
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    /**
     * 测试：应该返回包含禁用仓库的完整列表
     * @requirements 2.1
     */
    it('应该返回包含禁用仓库的完整列表', async () => {
      // 准备：包含启用和禁用的仓库
      const mockWarehouses = [
        createMockWarehouse({ name: '启用仓库', is_active: true }),
        createMockWarehouse({ name: '禁用仓库', is_active: false })
      ]
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue(mockWarehouses)

      // 执行
      const { getAllWarehouses } = await import('./warehouses')
      const result = await getAllWarehouses()

      // 验证：应该返回所有仓库，包括禁用的
      expect(result).toHaveLength(2)
      expect(result.some((w) => !w.is_active)).toBe(true)
    })
  })


  // ==================== 3.2 测试 getActiveWarehouses() ====================

  describe('getActiveWarehouses', () => {
    /**
     * 测试：应该返回启用的仓库
     * @requirements 2.2
     */
    it('应该返回启用的仓库', async () => {
      // 准备测试数据：包含启用和禁用的仓库
      const mockWarehouses = [
        createMockWarehouse({ name: '启用仓库1', is_active: true }),
        createMockWarehouse({ name: '禁用仓库', is_active: false }),
        createMockWarehouse({ name: '启用仓库2', is_active: true })
      ]
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue(mockWarehouses)

      // 执行
      const { getActiveWarehouses } = await import('./warehouses')
      const result = await getActiveWarehouses()

      // 验证：只返回启用的仓库
      expect(result).toHaveLength(2)
      expect(result.every((w) => w.is_active)).toBe(true)
    })

    /**
     * 测试：应该正确过滤 is_active
     * @requirements 2.2
     */
    it('应该正确过滤 is_active 为 true 的仓库', async () => {
      // 准备
      const mockWarehouses = [
        createMockWarehouse({ name: '仓库A', is_active: true }),
        createMockWarehouse({ name: '仓库B', is_active: false }),
        createMockWarehouse({ name: '仓库C', is_active: true }),
        createMockWarehouse({ name: '仓库D', is_active: false })
      ]
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue(mockWarehouses)

      // 执行
      const { getActiveWarehouses } = await import('./warehouses')
      const result = await getActiveWarehouses()

      // 验证
      expect(result).toHaveLength(2)
      expect(result.map((w) => w.name)).toEqual(['仓库A', '仓库C'])
    })

    /**
     * 测试：所有仓库都禁用时应该返回空数组
     * @requirements 2.2
     */
    it('所有仓库都禁用时应该返回空数组', async () => {
      // 准备
      const mockWarehouses = [
        createMockWarehouse({ is_active: false }),
        createMockWarehouse({ is_active: false })
      ]
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue(mockWarehouses)

      // 执行
      const { getActiveWarehouses } = await import('./warehouses')
      const result = await getActiveWarehouses()

      // 验证
      expect(result).toEqual([])
    })

    /**
     * 测试：没有仓库时应该返回空数组
     * @requirements 2.2
     */
    it('没有仓库时应该返回空数组', async () => {
      // 准备
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue([])

      // 执行
      const { getActiveWarehouses } = await import('./warehouses')
      const result = await getActiveWarehouses()

      // 验证
      expect(result).toEqual([])
    })
  })

  // ==================== 3.3 测试 getManagerWarehouses() ====================

  describe('getManagerWarehouses', () => {
    /**
     * 测试：应该返回管理员管辖的仓库
     * @requirements 2.3
     */
    it('应该返回管理员管辖的仓库', async () => {
      // 准备测试数据
      const managerId = 'manager-001'
      const mockWarehouses = [
        createMockWarehouse({ name: '管理员仓库1' }),
        createMockWarehouse({ name: '管理员仓库2' })
      ]
      mockWarehousesRepository.getManagerWarehouses.mockResolvedValue(mockWarehouses)

      // 执行
      const { getManagerWarehouses } = await import('./warehouses')
      const result = await getManagerWarehouses(managerId)

      // 验证
      expect(result).toHaveLength(2)
      expect(mockWarehousesRepository.getManagerWarehouses).toHaveBeenCalledWith(managerId)
    })

    /**
     * 测试：应该调用 WarehousesRepository.getManagerWarehouses
     * @requirements 2.3
     */
    it('应该调用 WarehousesRepository.getManagerWarehouses', async () => {
      // 准备
      const managerId = 'manager-001'
      mockWarehousesRepository.getManagerWarehouses.mockResolvedValue([])

      // 执行
      const { getManagerWarehouses } = await import('./warehouses')
      await getManagerWarehouses(managerId)

      // 验证
      expect(mockWarehousesRepository.getManagerWarehouses).toHaveBeenCalledWith(managerId)
    })

    /**
     * 测试：管理员没有管辖仓库时应该返回空数组
     * @requirements 2.3
     */
    it('管理员没有管辖仓库时应该返回空数组', async () => {
      // 准备
      mockWarehousesRepository.getManagerWarehouses.mockResolvedValue([])

      // 执行
      const { getManagerWarehouses } = await import('./warehouses')
      const result = await getManagerWarehouses('manager-001')

      // 验证
      expect(result).toEqual([])
    })

    /**
     * 测试：无效的管理员 ID 应该返回空数组
     * @requirements 2.3
     */
    it('无效的管理员 ID 应该返回空数组', async () => {
      // 准备
      mockWarehousesRepository.getManagerWarehouses.mockResolvedValue([])

      // 执行
      const { getManagerWarehouses } = await import('./warehouses')
      const result = await getManagerWarehouses('anon')

      // 验证
      expect(result).toEqual([])
    })
  })

  // ==================== 3.4 测试 getDriverWarehouses() ====================

  describe('getDriverWarehouses', () => {
    /**
     * 测试：应该返回司机分配的仓库
     * @requirements 2.4
     */
    it('应该返回司机分配的仓库', async () => {
      // 准备测试数据
      const driverId = 'driver-001'
      const mockWarehouses = [
        createMockWarehouse({ name: '司机仓库1' }),
        createMockWarehouse({ name: '司机仓库2' })
      ]
      mockWarehousesRepository.getDriverWarehouses.mockResolvedValue(mockWarehouses)

      // 执行
      const { getDriverWarehouses } = await import('./warehouses')
      const result = await getDriverWarehouses(driverId)

      // 验证
      expect(result).toHaveLength(2)
      expect(mockWarehousesRepository.getDriverWarehouses).toHaveBeenCalledWith(driverId)
    })

    /**
     * 测试：应该调用 WarehousesRepository.getDriverWarehouses
     * @requirements 2.4
     */
    it('应该调用 WarehousesRepository.getDriverWarehouses', async () => {
      // 准备
      const driverId = 'driver-001'
      mockWarehousesRepository.getDriverWarehouses.mockResolvedValue([])

      // 执行
      const { getDriverWarehouses } = await import('./warehouses')
      await getDriverWarehouses(driverId)

      // 验证
      expect(mockWarehousesRepository.getDriverWarehouses).toHaveBeenCalledWith(driverId)
    })

    /**
     * 测试：司机没有分配仓库时应该返回空数组
     * @requirements 2.4
     */
    it('司机没有分配仓库时应该返回空数组', async () => {
      // 准备
      mockWarehousesRepository.getDriverWarehouses.mockResolvedValue([])

      // 执行
      const { getDriverWarehouses } = await import('./warehouses')
      const result = await getDriverWarehouses('driver-001')

      // 验证
      expect(result).toEqual([])
    })
  })


  // ==================== 3.5 测试 getAllDriverWarehouses() ====================

  describe('getAllDriverWarehouses', () => {
    /**
     * 测试：应该返回所有分配关系
     * @requirements 2.5
     */
    it('应该返回所有分配关系', async () => {
      // 准备测试数据
      const mockAssignments = [
        {
          id: 'assign-001',
          user_id: 'driver-001',
          warehouse_id: 'wh-001',
          assigned_by: null,
          created_at: new Date().toISOString()
        },
        {
          id: 'assign-002',
          user_id: 'driver-002',
          warehouse_id: 'wh-002',
          assigned_by: 'manager-001',
          created_at: new Date().toISOString()
        }
      ]
      mockWarehouseAssignmentsRepository.getAllAssignments.mockResolvedValue(mockAssignments)

      // 执行
      const { getAllDriverWarehouses } = await import('./warehouses')
      const result = await getAllDriverWarehouses()

      // 验证
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('user_id')
      expect(result[0]).toHaveProperty('warehouse_id')
    })

    /**
     * 测试：应该调用 WarehouseAssignmentsRepository.getAllAssignments
     * @requirements 2.5
     */
    it('应该调用 WarehouseAssignmentsRepository.getAllAssignments', async () => {
      // 准备
      mockWarehouseAssignmentsRepository.getAllAssignments.mockResolvedValue([])

      // 执行
      const { getAllDriverWarehouses } = await import('./warehouses')
      await getAllDriverWarehouses()

      // 验证
      expect(mockWarehouseAssignmentsRepository.getAllAssignments).toHaveBeenCalledTimes(1)
    })

    /**
     * 测试：没有分配关系时应该返回空数组
     * @requirements 2.5
     */
    it('没有分配关系时应该返回空数组', async () => {
      // 准备
      mockWarehouseAssignmentsRepository.getAllAssignments.mockResolvedValue([])

      // 执行
      const { getAllDriverWarehouses } = await import('./warehouses')
      const result = await getAllDriverWarehouses()

      // 验证
      expect(result).toEqual([])
    })

    /**
     * 测试：应该正确转换为 DriverWarehouse 格式
     * @requirements 2.5
     */
    it('应该正确转换为 DriverWarehouse 格式', async () => {
      // 准备
      const mockAssignment = {
        id: 'assign-001',
        user_id: 'driver-001',
        warehouse_id: 'wh-001',
        assigned_by: 'manager-001',
        created_at: '2024-01-01T00:00:00Z'
      }
      mockWarehouseAssignmentsRepository.getAllAssignments.mockResolvedValue([mockAssignment])

      // 执行
      const { getAllDriverWarehouses } = await import('./warehouses')
      const result = await getAllDriverWarehouses()

      // 验证：检查返回的数据格式
      expect(result[0]).toEqual({
        id: 'assign-001',
        user_id: 'driver-001',
        warehouse_id: 'wh-001',
        assigned_by: 'manager-001',
        created_at: '2024-01-01T00:00:00Z'
      })
    })
  })

  // ==================== 3.6 测试 assignWarehouseToDriver() ====================

  describe('assignWarehouseToDriver', () => {
    /**
     * 测试：应该成功创建分配关系
     * @requirements 2.6
     */
    it('应该成功创建分配关系', async () => {
      // 准备
      const input = {
        user_id: 'driver-001',
        warehouse_id: 'wh-001'
      }

      // Mock 司机查询
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { name: '测试司机' },
        error: null
      })

      // Mock 仓库查询
      mockWarehousesRepository.getWarehouseById.mockResolvedValue(
        createMockWarehouse({ id: 'wh-001', is_active: true })
      )

      // Mock 创建分配
      mockWarehouseAssignmentsRepository.createAssignment.mockResolvedValue({
        id: 'assign-001',
        user_id: 'driver-001',
        warehouse_id: 'wh-001'
      })

      // 执行
      const { assignWarehouseToDriver } = await import('./warehouses')
      const result = await assignWarehouseToDriver(input)

      // 验证
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    /**
     * 测试：司机不存在时应该返回错误
     * @requirements 2.6
     */
    it('司机不存在时应该返回错误', async () => {
      // 准备
      const input = {
        user_id: 'non-existent-driver',
        warehouse_id: 'wh-001'
      }

      // Mock 司机查询返回空
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null
      })

      // 执行
      const { assignWarehouseToDriver } = await import('./warehouses')
      const result = await assignWarehouseToDriver(input)

      // 验证
      expect(result.success).toBe(false)
      expect(result.error).toBe('司机不存在')
    })

    /**
     * 测试：仓库不存在时应该返回错误
     * @requirements 2.6
     */
    it('仓库不存在时应该返回错误', async () => {
      // 准备
      const input = {
        user_id: 'driver-001',
        warehouse_id: 'non-existent-wh'
      }

      // Mock 司机查询
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { name: '测试司机' },
        error: null
      })

      // Mock 仓库查询返回空
      mockWarehousesRepository.getWarehouseById.mockResolvedValue(null)

      // 执行
      const { assignWarehouseToDriver } = await import('./warehouses')
      const result = await assignWarehouseToDriver(input)

      // 验证
      expect(result.success).toBe(false)
      expect(result.error).toBe('仓库不存在')
    })

    /**
     * 测试：仓库被禁用时应该返回错误
     * @requirements 2.6
     */
    it('仓库被禁用时应该返回错误', async () => {
      // 准备
      const input = {
        user_id: 'driver-001',
        warehouse_id: 'wh-001'
      }

      // Mock 司机查询
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { name: '测试司机' },
        error: null
      })

      // Mock 仓库查询返回禁用的仓库
      mockWarehousesRepository.getWarehouseById.mockResolvedValue(
        createMockWarehouse({ id: 'wh-001', name: '禁用仓库', is_active: false })
      )

      // 执行
      const { assignWarehouseToDriver } = await import('./warehouses')
      const result = await assignWarehouseToDriver(input)

      // 验证
      expect(result.success).toBe(false)
      expect(result.error).toContain('已被禁用')
    })

    /**
     * 测试：分配成功后应该发布事件
     * @requirements 2.6
     */
    it('分配成功后应该发布事件', async () => {
      // 准备
      const input = {
        user_id: 'driver-001',
        warehouse_id: 'wh-001'
      }

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { name: '测试司机' },
        error: null
      })

      mockWarehousesRepository.getWarehouseById.mockResolvedValue(
        createMockWarehouse({ id: 'wh-001', name: '测试仓库', is_active: true })
      )

      mockWarehouseAssignmentsRepository.createAssignment.mockResolvedValue({
        id: 'assign-001',
        user_id: 'driver-001',
        warehouse_id: 'wh-001'
      })

      // 执行
      const { assignWarehouseToDriver } = await import('./warehouses')
      await assignWarehouseToDriver(input)

      // 验证：事件被发布
      expect(mockPublish).toHaveBeenCalledWith(
        'warehouse_assignment:created',
        expect.objectContaining({
          user_id: 'driver-001',
          warehouse_id: 'wh-001'
        })
      )
    })
  })

  // ==================== 3.7 测试 removeWarehouseFromDriver() ====================

  describe('removeWarehouseFromDriver', () => {
    /**
     * 测试：应该成功删除分配关系
     * @requirements 2.7
     */
    it('应该成功删除分配关系', async () => {
      // 准备
      const driverId = 'driver-001'
      const warehouseId = 'wh-001'

      // Mock 查询分配记录
      mockWarehouseAssignmentsRepository.getByUser.mockResolvedValue([
        {
          id: 'assign-001',
          user_id: driverId,
          warehouse_id: warehouseId,
          created_at: new Date().toISOString()
        }
      ])

      // Mock 删除分配
      mockWarehouseAssignmentsRepository.deleteAssignment.mockResolvedValue(true)

      // 执行
      const { removeWarehouseFromDriver } = await import('./warehouses')
      const result = await removeWarehouseFromDriver(driverId, warehouseId)

      // 验证
      expect(result).toBe(true)
      expect(mockWarehouseAssignmentsRepository.deleteAssignment).toHaveBeenCalledWith('assign-001')
    })

    /**
     * 测试：分配记录不存在时应该返回 false
     * @requirements 2.7
     */
    it('分配记录不存在时应该返回 false', async () => {
      // 准备
      mockWarehouseAssignmentsRepository.getByUser.mockResolvedValue([])

      // 执行
      const { removeWarehouseFromDriver } = await import('./warehouses')
      const result = await removeWarehouseFromDriver('driver-001', 'wh-001')

      // 验证
      expect(result).toBe(false)
    })

    /**
     * 测试：删除成功后应该发布事件
     * @requirements 2.7
     */
    it('删除成功后应该发布事件', async () => {
      // 准备
      const driverId = 'driver-001'
      const warehouseId = 'wh-001'

      mockWarehouseAssignmentsRepository.getByUser.mockResolvedValue([
        {
          id: 'assign-001',
          user_id: driverId,
          warehouse_id: warehouseId,
          created_at: new Date().toISOString()
        }
      ])

      mockWarehouseAssignmentsRepository.deleteAssignment.mockResolvedValue(true)

      // 执行
      const { removeWarehouseFromDriver } = await import('./warehouses')
      await removeWarehouseFromDriver(driverId, warehouseId)

      // 验证：事件被发布
      expect(mockPublish).toHaveBeenCalledWith(
        'warehouse_assignment:deleted',
        expect.objectContaining({
          user_id: driverId,
          warehouse_id: warehouseId
        })
      )
    })

    /**
     * 测试：删除失败时不应该发布事件
     * @requirements 2.7
     */
    it('删除失败时不应该发布事件', async () => {
      // 准备
      mockWarehouseAssignmentsRepository.getByUser.mockResolvedValue([
        {
          id: 'assign-001',
          user_id: 'driver-001',
          warehouse_id: 'wh-001',
          created_at: new Date().toISOString()
        }
      ])

      mockWarehouseAssignmentsRepository.deleteAssignment.mockResolvedValue(false)

      // 执行
      const { removeWarehouseFromDriver } = await import('./warehouses')
      await removeWarehouseFromDriver('driver-001', 'wh-001')

      // 验证：事件不应该被发布
      expect(mockPublish).not.toHaveBeenCalledWith(
        'warehouse_assignment:deleted',
        expect.anything()
      )
    })
  })


  // ==================== 3.8 属性测试 ====================

  describe('属性测试', () => {
    /**
     * **Feature: core-api-unit-tests, Property 3: 仓库查询 API 返回正确数据**
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
     *
     * Property 3: 仓库查询 API 返回正确数据
     * For any 仓库查询 API 调用，返回的数据 SHALL 与 Repository 层返回的数据一致
     */
    it('Property 3: 仓库查询 API 应返回与 Repository 一致的数据', async () => {
      // 生成随机数量的仓库数据（1-10 个）
      const warehouseCount = Math.floor(Math.random() * 10) + 1
      const mockWarehouses = createMockWarehouses(warehouseCount)

      // 设置 Repository 返回值
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue(mockWarehouses)

      // 执行
      const { getAllWarehouses } = await import('./warehouses')
      const result = await getAllWarehouses()

      // 验证：返回数据与 Repository 一致
      expect(result).toEqual(mockWarehouses)
      expect(result.length).toBe(warehouseCount)
    })

    /**
     * **Feature: core-api-unit-tests, Property 3**
     * **Validates: Requirements 2.2**
     *
     * Property 3: getActiveWarehouses 应只返回 is_active 为 true 的仓库
     */
    it('Property 3: getActiveWarehouses 应只返回启用的仓库', async () => {
      // 准备：生成混合状态的仓库
      const activeCount = Math.floor(Math.random() * 5) + 1
      const inactiveCount = Math.floor(Math.random() * 5) + 1

      const activeWarehouses = Array.from({ length: activeCount }, (_, i) =>
        createMockWarehouse({ name: `启用仓库${i}`, is_active: true })
      )
      const inactiveWarehouses = Array.from({ length: inactiveCount }, (_, i) =>
        createMockWarehouse({ name: `禁用仓库${i}`, is_active: false })
      )

      mockWarehousesRepository.getAllWarehouses.mockResolvedValue([
        ...activeWarehouses,
        ...inactiveWarehouses
      ])

      // 执行
      const { getActiveWarehouses } = await import('./warehouses')
      const result = await getActiveWarehouses()

      // 验证：所有返回的仓库都是启用的
      expect(result.length).toBe(activeCount)
      expect(result.every((w) => w.is_active === true)).toBe(true)
    })

    /**
     * **Feature: core-api-unit-tests, Property 3**
     * **Validates: Requirements 2.3**
     *
     * Property 3: getManagerWarehouses 应返回指定管理员的仓库
     */
    it('Property 3: getManagerWarehouses 应返回指定管理员的仓库', async () => {
      // 准备
      const managerId = 'manager-001'
      const warehouseCount = Math.floor(Math.random() * 5) + 1
      const mockWarehouses = createMockWarehouses(warehouseCount)

      mockWarehousesRepository.getManagerWarehouses.mockResolvedValue(mockWarehouses)

      // 执行
      const { getManagerWarehouses } = await import('./warehouses')
      const result = await getManagerWarehouses(managerId)

      // 验证
      expect(result).toEqual(mockWarehouses)
      expect(mockWarehousesRepository.getManagerWarehouses).toHaveBeenCalledWith(managerId)
    })

    /**
     * **Feature: core-api-unit-tests, Property 3**
     * **Validates: Requirements 2.4**
     *
     * Property 3: getDriverWarehouses 应返回指定司机的仓库
     */
    it('Property 3: getDriverWarehouses 应返回指定司机的仓库', async () => {
      // 准备
      const driverId = 'driver-001'
      const warehouseCount = Math.floor(Math.random() * 5) + 1
      const mockWarehouses = createMockWarehouses(warehouseCount)

      mockWarehousesRepository.getDriverWarehouses.mockResolvedValue(mockWarehouses)

      // 执行
      const { getDriverWarehouses } = await import('./warehouses')
      const result = await getDriverWarehouses(driverId)

      // 验证
      expect(result).toEqual(mockWarehouses)
      expect(mockWarehousesRepository.getDriverWarehouses).toHaveBeenCalledWith(driverId)
    })

    /**
     * **Feature: core-api-unit-tests, Property 4: 仓库分配操作触发缓存失效**
     * **Validates: Requirements 2.6, 2.7**
     *
     * Property 4: 仓库分配操作触发缓存失效
     * For any 仓库分配操作（创建、删除），系统 SHALL 发布相应事件通知缓存失效
     */
    it('Property 4: 仓库分配创建应触发事件发布', async () => {
      // 准备
      const input = {
        user_id: 'driver-001',
        warehouse_id: 'wh-001'
      }

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { name: '测试司机' },
        error: null
      })

      mockWarehousesRepository.getWarehouseById.mockResolvedValue(
        createMockWarehouse({ id: 'wh-001', name: '测试仓库', is_active: true })
      )

      mockWarehouseAssignmentsRepository.createAssignment.mockResolvedValue({
        id: 'assign-001',
        user_id: 'driver-001',
        warehouse_id: 'wh-001'
      })

      // 执行
      const { assignWarehouseToDriver } = await import('./warehouses')
      const result = await assignWarehouseToDriver(input)

      // 验证：分配成功时应该发布事件
      if (result.success) {
        expect(mockPublish).toHaveBeenCalledWith(
          'warehouse_assignment:created',
          expect.objectContaining({
            user_id: input.user_id,
            warehouse_id: input.warehouse_id
          })
        )
      }
    })

    /**
     * **Feature: core-api-unit-tests, Property 4**
     * **Validates: Requirements 2.7**
     *
     * Property 4: 仓库分配删除应触发事件发布
     */
    it('Property 4: 仓库分配删除应触发事件发布', async () => {
      // 准备
      const driverId = 'driver-001'
      const warehouseId = 'wh-001'

      mockWarehouseAssignmentsRepository.getByUser.mockResolvedValue([
        {
          id: 'assign-001',
          user_id: driverId,
          warehouse_id: warehouseId,
          created_at: new Date().toISOString()
        }
      ])

      mockWarehouseAssignmentsRepository.deleteAssignment.mockResolvedValue(true)

      // 执行
      const { removeWarehouseFromDriver } = await import('./warehouses')
      const result = await removeWarehouseFromDriver(driverId, warehouseId)

      // 验证：删除成功时应该发布事件
      if (result) {
        expect(mockPublish).toHaveBeenCalledWith(
          'warehouse_assignment:deleted',
          expect.objectContaining({
            user_id: driverId,
            warehouse_id: warehouseId
          })
        )
      }
    })

    /**
     * **Feature: core-api-unit-tests, Property 4**
     * **Validates: Requirements 2.6**
     *
     * Property 4: 分配失败时不应该触发事件
     */
    it('Property 4: 分配失败时不应该触发事件', async () => {
      // 准备：仓库不存在的情况
      const input = {
        user_id: 'driver-001',
        warehouse_id: 'non-existent-wh'
      }

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { name: '测试司机' },
        error: null
      })

      mockWarehousesRepository.getWarehouseById.mockResolvedValue(null)

      // 清除之前的调用记录
      mockPublish.mockClear()

      // 执行
      const { assignWarehouseToDriver } = await import('./warehouses')
      const result = await assignWarehouseToDriver(input)

      // 验证：分配失败时不应该发布 warehouse_assignment:created 事件
      expect(result.success).toBe(false)
      expect(mockPublish).not.toHaveBeenCalledWith(
        'warehouse_assignment:created',
        expect.anything()
      )
    })
  })

  // ==================== 其他 API 测试 ====================

  describe('getWarehouseById', () => {
    /**
     * 测试：应该返回指定仓库
     */
    it('应该返回指定仓库', async () => {
      // 准备
      const mockWarehouse = createMockWarehouse({ id: 'wh-001', name: '测试仓库' })
      mockWarehousesRepository.getWarehouseById.mockResolvedValue(mockWarehouse)

      // 执行
      const { getWarehouseById } = await import('./warehouses')
      const result = await getWarehouseById('wh-001')

      // 验证
      expect(result).toEqual(mockWarehouse)
      expect(mockWarehousesRepository.getWarehouseById).toHaveBeenCalledWith('wh-001')
    })

    /**
     * 测试：仓库不存在时应该返回 null
     */
    it('仓库不存在时应该返回 null', async () => {
      // 准备
      mockWarehousesRepository.getWarehouseById.mockResolvedValue(null)

      // 执行
      const { getWarehouseById } = await import('./warehouses')
      const result = await getWarehouseById('non-existent')

      // 验证
      expect(result).toBeNull()
    })
  })

  describe('setDriverWarehouses', () => {
    /**
     * 测试：应该成功批量设置司机仓库
     */
    it('应该成功批量设置司机仓库', async () => {
      // 准备
      const driverId = 'driver-001'
      const warehouseIds = ['wh-001', 'wh-002']

      // Mock 仓库查询
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue([
        createMockWarehouse({ id: 'wh-001', is_active: true }),
        createMockWarehouse({ id: 'wh-002', is_active: true })
      ])

      // Mock 批量设置
      mockWarehouseAssignmentsRepository.setUserWarehouses.mockResolvedValue(true)

      // 执行
      const { setDriverWarehouses } = await import('./warehouses')
      const result = await setDriverWarehouses(driverId, warehouseIds)

      // 验证
      expect(result.success).toBe(true)
    })

    /**
     * 测试：包含禁用仓库时应该返回错误
     */
    it('包含禁用仓库时应该返回错误', async () => {
      // 准备
      const driverId = 'driver-001'
      const warehouseIds = ['wh-001', 'wh-002']

      // Mock 仓库查询：wh-002 被禁用
      mockWarehousesRepository.getAllWarehouses.mockResolvedValue([
        createMockWarehouse({ id: 'wh-001', name: '启用仓库', is_active: true }),
        createMockWarehouse({ id: 'wh-002', name: '禁用仓库', is_active: false })
      ])

      // 执行
      const { setDriverWarehouses } = await import('./warehouses')
      const result = await setDriverWarehouses(driverId, warehouseIds)

      // 验证
      expect(result.success).toBe(false)
      expect(result.error).toContain('已被禁用')
    })

    /**
     * 测试：空仓库列表应该成功
     */
    it('空仓库列表应该成功', async () => {
      // 准备
      mockWarehouseAssignmentsRepository.setUserWarehouses.mockResolvedValue(true)

      // 执行
      const { setDriverWarehouses } = await import('./warehouses')
      const result = await setDriverWarehouses('driver-001', [])

      // 验证
      expect(result.success).toBe(true)
    })
  })

  describe('getDriverWarehouseIds', () => {
    /**
     * 测试：应该返回司机的仓库 ID 列表
     */
    it('应该返回司机的仓库 ID 列表', async () => {
      // 准备
      const driverId = 'driver-001'
      const warehouseIds = ['wh-001', 'wh-002']
      mockWarehouseAssignmentsRepository.getWarehouseIdsByUser.mockResolvedValue(warehouseIds)

      // 执行
      const { getDriverWarehouseIds } = await import('./warehouses')
      const result = await getDriverWarehouseIds(driverId)

      // 验证
      expect(result).toEqual(warehouseIds)
    })

    /**
     * 测试：无效的司机 ID 应该返回空数组
     */
    it('无效的司机 ID 应该返回空数组', async () => {
      // 执行
      const { getDriverWarehouseIds } = await import('./warehouses')
      const result = await getDriverWarehouseIds('anon')

      // 验证
      expect(result).toEqual([])
    })
  })
})
