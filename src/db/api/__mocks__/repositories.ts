/**
 * Repository Mock 工厂
 * 提供各 Repository 的标准化 Mock 配置
 *
 * 功能包括：
 * - 创建 UsersRepository Mock
 * - 创建 WarehousesRepository Mock
 * - 创建 WarehouseAssignmentsRepository Mock
 * - 创建 AttendanceRepository Mock
 * - 创建 PieceWorkRepository Mock
 * - 创建 LeaveRepository Mock
 * - 创建 NotificationsRepository Mock
 * - 创建 VehiclesRepository Mock
 *
 * @module db/api/__mocks__/repositories
 * @requirements 7.3
 */

import {vi} from 'vitest'

// ==================== 类型定义 ====================

/**
 * Mock UsersRepository 接口
 */
export interface MockUsersRepository {
  /** 获取所有用户 */
  getAllUsers: ReturnType<typeof vi.fn>
  /** 获取所有司机 */
  getAllDrivers: ReturnType<typeof vi.fn>
  /** 获取所有管理员 */
  getAllManagers: ReturnType<typeof vi.fn>
  /** 根据 ID 获取用户 */
  getById: ReturnType<typeof vi.fn>
  /** 根据 ID 列表获取用户 */
  getByIds: ReturnType<typeof vi.fn>
  /** 根据角色获取用户 */
  getByRole: ReturnType<typeof vi.fn>
  /** 获取用户角色 */
  getRole: ReturnType<typeof vi.fn>
  /** 检查用户是否具有指定角色 */
  hasRole: ReturnType<typeof vi.fn>
  /** 根据角色获取用户（带权限过滤） */
  getByRoleWithPermission: ReturnType<typeof vi.fn>
  /** 清除缓存 */
  invalidateCache: ReturnType<typeof vi.fn>
  /** 清除所有缓存 */
  clearAllCache: ReturnType<typeof vi.fn>
}

/**
 * Mock WarehousesRepository 接口
 */
export interface MockWarehousesRepository {
  /** 获取所有仓库 */
  getAllWarehouses: ReturnType<typeof vi.fn>
  /** 根据 ID 获取仓库 */
  getWarehouseById: ReturnType<typeof vi.fn>
  /** 获取司机的仓库列表 */
  getDriverWarehouses: ReturnType<typeof vi.fn>
  /** 获取管理员的仓库列表 */
  getManagerWarehouses: ReturnType<typeof vi.fn>
  /** 获取仓库的分类列表 */
  getWarehouseCategories: ReturnType<typeof vi.fn>
  /** 获取仓库的司机 ID 列表 */
  getDriverIdsByWarehouse: ReturnType<typeof vi.fn>
  /** 创建仓库 */
  createWarehouse: ReturnType<typeof vi.fn>
  /** 更新仓库 */
  updateWarehouse: ReturnType<typeof vi.fn>
  /** 删除仓库 */
  deleteWarehouse: ReturnType<typeof vi.fn>
  /** 更新仓库设置 */
  updateSettings: ReturnType<typeof vi.fn>
  /** 清除缓存 */
  invalidateCache: ReturnType<typeof vi.fn>
}

/**
 * Mock WarehouseAssignmentsRepository 接口
 */
export interface MockWarehouseAssignmentsRepository {
  /** 根据用户 ID 获取仓库分配 */
  getByUser: ReturnType<typeof vi.fn>
  /** 根据仓库 ID 获取用户分配 */
  getByWarehouse: ReturnType<typeof vi.fn>
  /** 获取所有仓库分配 */
  getAllAssignments: ReturnType<typeof vi.fn>
  /** 获取用户的仓库 ID 列表 */
  getWarehouseIdsByUser: ReturnType<typeof vi.fn>
  /** 获取仓库的用户 ID 列表 */
  getUserIdsByWarehouse: ReturnType<typeof vi.fn>
  /** 创建仓库分配 */
  createAssignment: ReturnType<typeof vi.fn>
  /** 删除仓库分配 */
  deleteAssignment: ReturnType<typeof vi.fn>
  /** 删除用户的所有仓库分配 */
  deleteByUser: ReturnType<typeof vi.fn>
  /** 删除仓库的所有用户分配 */
  deleteByWarehouse: ReturnType<typeof vi.fn>
  /** 更新或插入仓库分配 */
  upsertAssignment: ReturnType<typeof vi.fn>
  /** 批量设置用户的仓库分配 */
  setUserWarehouses: ReturnType<typeof vi.fn>
  /** 批量设置仓库的用户分配 */
  setWarehouseUsers: ReturnType<typeof vi.fn>
  /** 清除缓存 */
  invalidateCache: ReturnType<typeof vi.fn>
}

/**
 * Mock AttendanceRepository 接口
 */
export interface MockAttendanceRepository {
  /** 获取用户今日考勤记录 */
  getTodayAttendance: ReturnType<typeof vi.fn>
  /** 获取用户月度考勤记录 */
  getMonthlyAttendance: ReturnType<typeof vi.fn>
  /** 获取用户考勤统计数据 */
  getAttendanceStats: ReturnType<typeof vi.fn>
  /** 获取所有考勤记录 */
  getAllAttendanceRecords: ReturnType<typeof vi.fn>
  /** 根据用户 ID 获取考勤记录 */
  getByUser: ReturnType<typeof vi.fn>
  /** 创建考勤记录 */
  createAttendance: ReturnType<typeof vi.fn>
  /** 更新考勤记录 */
  updateAttendance: ReturnType<typeof vi.fn>
  /** 上班打卡 */
  clockIn: ReturnType<typeof vi.fn>
  /** 下班打卡 */
  clockOut: ReturnType<typeof vi.fn>
  /** 清除缓存 */
  invalidateCache: ReturnType<typeof vi.fn>
}

/**
 * Mock PieceWorkRepository 接口
 */
export interface MockPieceWorkRepository {
  /** 获取计件记录 */
  getRecords: ReturnType<typeof vi.fn>
  /** 根据用户 ID 获取计件记录 */
  getByUser: ReturnType<typeof vi.fn>
  /** 根据日期范围获取计件记录 */
  getByDateRange: ReturnType<typeof vi.fn>
  /** 创建计件记录 */
  createRecord: ReturnType<typeof vi.fn>
  /** 更新计件记录 */
  updateRecord: ReturnType<typeof vi.fn>
  /** 删除计件记录 */
  deleteRecord: ReturnType<typeof vi.fn>
  /** 清除缓存 */
  invalidateCache: ReturnType<typeof vi.fn>
}

/**
 * Mock LeaveRepository 接口
 */
export interface MockLeaveRepository {
  /** 获取请假申请列表 */
  getLeaveApplications: ReturnType<typeof vi.fn>
  /** 根据用户 ID 获取请假申请 */
  getByUser: ReturnType<typeof vi.fn>
  /** 根据 ID 获取请假申请 */
  getById: ReturnType<typeof vi.fn>
  /** 创建请假申请 */
  createLeaveApplication: ReturnType<typeof vi.fn>
  /** 更新请假申请 */
  updateLeaveApplication: ReturnType<typeof vi.fn>
  /** 审批请假申请 */
  approveLeaveApplication: ReturnType<typeof vi.fn>
  /** 拒绝请假申请 */
  rejectLeaveApplication: ReturnType<typeof vi.fn>
  /** 清除缓存 */
  invalidateCache: ReturnType<typeof vi.fn>
}

/**
 * Mock NotificationsRepository 接口
 */
export interface MockNotificationsRepository {
  /** 根据用户 ID 获取通知 */
  getByUser: ReturnType<typeof vi.fn>
  /** 获取用户未读通知数量 */
  getUnreadCount: ReturnType<typeof vi.fn>
  /** 获取用户未读通知列表 */
  getUnreadByUser: ReturnType<typeof vi.fn>
  /** 根据 ID 获取通知 */
  getNotificationById: ReturnType<typeof vi.fn>
  /** 创建通知 */
  createNotification: ReturnType<typeof vi.fn>
  /** 标记通知为已读 */
  markAsRead: ReturnType<typeof vi.fn>
  /** 标记用户所有通知为已读 */
  markAllAsRead: ReturnType<typeof vi.fn>
  /** 更新通知 */
  updateNotification: ReturnType<typeof vi.fn>
  /** 删除通知 */
  deleteNotification: ReturnType<typeof vi.fn>
  /** 批量创建通知 */
  createNotifications: ReturnType<typeof vi.fn>
  /** 清除缓存 */
  invalidateCache: ReturnType<typeof vi.fn>
  /** 清除所有缓存 */
  clearAllCache: ReturnType<typeof vi.fn>
  /** 清除特定用户的通知缓存 */
  clearCacheByUser: ReturnType<typeof vi.fn>
}

/**
 * Mock VehiclesRepository 接口
 */
export interface MockVehiclesRepository {
  /** 根据司机 ID 获取车辆 */
  getByDriverId: ReturnType<typeof vi.fn>
  /** 获取所有车辆（带司机信息） */
  getAllWithDrivers: ReturnType<typeof vi.fn>
  /** 根据 ID 获取车辆 */
  getById: ReturnType<typeof vi.fn>
  /** 获取车辆详情（带司机信息） */
  getWithDriverDetails: ReturnType<typeof vi.fn>
  /** 清除缓存 */
  invalidateCache: ReturnType<typeof vi.fn>
}

/**
 * Mock CategoriesRepository 接口
 */
export interface MockCategoriesRepository {
  /** 获取所有品类 */
  getAll: ReturnType<typeof vi.fn>
  /** 根据 ID 获取品类 */
  getById: ReturnType<typeof vi.fn>
  /** 清除缓存 */
  invalidateCache: ReturnType<typeof vi.fn>
}

/**
 * Mock CategoryPricesRepository 接口
 */
export interface MockCategoryPricesRepository {
  /** 获取品类价格 */
  getByWarehouse: ReturnType<typeof vi.fn>
  /** 获取所有品类价格 */
  getAll: ReturnType<typeof vi.fn>
  /** 更新品类价格 */
  update: ReturnType<typeof vi.fn>
  /** 清除缓存 */
  invalidateCache: ReturnType<typeof vi.fn>
}

// ==================== Mock 工厂函数 ====================

/**
 * 创建 Mock UsersRepository
 *
 * @returns Mock UsersRepository 实例
 *
 * @example
 * ```typescript
 * const mockUsersRepo = createMockUsersRepository()
 * mockUsersRepo.getAllUsers.mockResolvedValue([mockUser])
 * ```
 */
export function createMockUsersRepository(): MockUsersRepository {
  return {
    getAllUsers: vi.fn().mockResolvedValue([]),
    getAllDrivers: vi.fn().mockResolvedValue([]),
    getAllManagers: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    getByIds: vi.fn().mockResolvedValue([]),
    getByRole: vi.fn().mockResolvedValue([]),
    getRole: vi.fn().mockResolvedValue(null),
    hasRole: vi.fn().mockResolvedValue(false),
    getByRoleWithPermission: vi.fn().mockResolvedValue([]),
    invalidateCache: vi.fn(),
    clearAllCache: vi.fn()
  }
}

/**
 * 创建 Mock WarehousesRepository
 *
 * @returns Mock WarehousesRepository 实例
 *
 * @example
 * ```typescript
 * const mockWarehousesRepo = createMockWarehousesRepository()
 * mockWarehousesRepo.getAllWarehouses.mockResolvedValue([mockWarehouse])
 * ```
 */
export function createMockWarehousesRepository(): MockWarehousesRepository {
  return {
    getAllWarehouses: vi.fn().mockResolvedValue([]),
    getWarehouseById: vi.fn().mockResolvedValue(null),
    getDriverWarehouses: vi.fn().mockResolvedValue([]),
    getManagerWarehouses: vi.fn().mockResolvedValue([]),
    getWarehouseCategories: vi.fn().mockResolvedValue([]),
    getDriverIdsByWarehouse: vi.fn().mockResolvedValue([]),
    createWarehouse: vi.fn().mockResolvedValue(null),
    updateWarehouse: vi.fn().mockResolvedValue(null),
    deleteWarehouse: vi.fn().mockResolvedValue(false),
    updateSettings: vi.fn().mockResolvedValue(null),
    invalidateCache: vi.fn()
  }
}

/**
 * 创建 Mock WarehouseAssignmentsRepository
 *
 * @returns Mock WarehouseAssignmentsRepository 实例
 *
 * @example
 * ```typescript
 * const mockAssignmentsRepo = createMockWarehouseAssignmentsRepository()
 * mockAssignmentsRepo.getByUser.mockResolvedValue([mockAssignment])
 * ```
 */
export function createMockWarehouseAssignmentsRepository(): MockWarehouseAssignmentsRepository {
  return {
    getByUser: vi.fn().mockResolvedValue([]),
    getByWarehouse: vi.fn().mockResolvedValue([]),
    getAllAssignments: vi.fn().mockResolvedValue([]),
    getWarehouseIdsByUser: vi.fn().mockResolvedValue([]),
    getUserIdsByWarehouse: vi.fn().mockResolvedValue([]),
    createAssignment: vi.fn().mockResolvedValue(null),
    deleteAssignment: vi.fn().mockResolvedValue(false),
    deleteByUser: vi.fn().mockResolvedValue(false),
    deleteByWarehouse: vi.fn().mockResolvedValue(false),
    upsertAssignment: vi.fn().mockResolvedValue(null),
    setUserWarehouses: vi.fn().mockResolvedValue(false),
    setWarehouseUsers: vi.fn().mockResolvedValue(false),
    invalidateCache: vi.fn()
  }
}

/**
 * 创建 Mock AttendanceRepository
 *
 * @returns Mock AttendanceRepository 实例
 *
 * @example
 * ```typescript
 * const mockAttendanceRepo = createMockAttendanceRepository()
 * mockAttendanceRepo.getTodayAttendance.mockResolvedValue(mockAttendance)
 * ```
 */
export function createMockAttendanceRepository(): MockAttendanceRepository {
  return {
    getTodayAttendance: vi.fn().mockResolvedValue(null),
    getMonthlyAttendance: vi.fn().mockResolvedValue([]),
    getAttendanceStats: vi.fn().mockResolvedValue({
      totalDays: 0,
      normalDays: 0,
      lateDays: 0,
      earlyDays: 0,
      absentDays: 0,
      totalWorkHours: 0
    }),
    getAllAttendanceRecords: vi.fn().mockResolvedValue([]),
    getByUser: vi.fn().mockResolvedValue([]),
    createAttendance: vi.fn().mockResolvedValue(null),
    updateAttendance: vi.fn().mockResolvedValue(null),
    clockIn: vi.fn().mockResolvedValue(null),
    clockOut: vi.fn().mockResolvedValue(null),
    invalidateCache: vi.fn()
  }
}

/**
 * 创建 Mock PieceWorkRepository
 *
 * @returns Mock PieceWorkRepository 实例
 *
 * @example
 * ```typescript
 * const mockPieceWorkRepo = createMockPieceWorkRepository()
 * mockPieceWorkRepo.getRecords.mockResolvedValue([mockRecord])
 * ```
 */
export function createMockPieceWorkRepository(): MockPieceWorkRepository {
  return {
    getRecords: vi.fn().mockResolvedValue([]),
    getByUser: vi.fn().mockResolvedValue([]),
    getByDateRange: vi.fn().mockResolvedValue([]),
    createRecord: vi.fn().mockResolvedValue(null),
    updateRecord: vi.fn().mockResolvedValue(null),
    deleteRecord: vi.fn().mockResolvedValue(false),
    invalidateCache: vi.fn()
  }
}

/**
 * 创建 Mock LeaveRepository
 *
 * @returns Mock LeaveRepository 实例
 *
 * @example
 * ```typescript
 * const mockLeaveRepo = createMockLeaveRepository()
 * mockLeaveRepo.getLeaveApplications.mockResolvedValue([mockLeave])
 * ```
 */
export function createMockLeaveRepository(): MockLeaveRepository {
  return {
    getLeaveApplications: vi.fn().mockResolvedValue([]),
    getByUser: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    createLeaveApplication: vi.fn().mockResolvedValue(null),
    updateLeaveApplication: vi.fn().mockResolvedValue(null),
    approveLeaveApplication: vi.fn().mockResolvedValue(false),
    rejectLeaveApplication: vi.fn().mockResolvedValue(false),
    invalidateCache: vi.fn()
  }
}

/**
 * 创建 Mock NotificationsRepository
 *
 * @returns Mock NotificationsRepository 实例
 *
 * @example
 * ```typescript
 * const mockNotificationsRepo = createMockNotificationsRepository()
 * mockNotificationsRepo.getByUser.mockResolvedValue([mockNotification])
 * ```
 */
export function createMockNotificationsRepository(): MockNotificationsRepository {
  return {
    getByUser: vi.fn().mockResolvedValue([]),
    getUnreadCount: vi.fn().mockResolvedValue(0),
    getUnreadByUser: vi.fn().mockResolvedValue([]),
    getNotificationById: vi.fn().mockResolvedValue(null),
    createNotification: vi.fn().mockResolvedValue(null),
    markAsRead: vi.fn().mockResolvedValue(false),
    markAllAsRead: vi.fn().mockResolvedValue(false),
    updateNotification: vi.fn().mockResolvedValue(null),
    deleteNotification: vi.fn().mockResolvedValue(false),
    createNotifications: vi.fn().mockResolvedValue([]),
    invalidateCache: vi.fn(),
    clearAllCache: vi.fn(),
    clearCacheByUser: vi.fn()
  }
}

/**
 * 创建 Mock VehiclesRepository
 *
 * @returns Mock VehiclesRepository 实例
 *
 * @example
 * ```typescript
 * const mockVehiclesRepo = createMockVehiclesRepository()
 * mockVehiclesRepo.getByDriverId.mockResolvedValue([mockVehicle])
 * ```
 */
export function createMockVehiclesRepository(): MockVehiclesRepository {
  return {
    getByDriverId: vi.fn().mockResolvedValue([]),
    getAllWithDrivers: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    getWithDriverDetails: vi.fn().mockResolvedValue(null),
    invalidateCache: vi.fn()
  }
}

/**
 * 创建 Mock CategoriesRepository
 *
 * @returns Mock CategoriesRepository 实例
 *
 * @example
 * ```typescript
 * const mockCategoriesRepo = createMockCategoriesRepository()
 * mockCategoriesRepo.getAll.mockResolvedValue([mockCategory])
 * ```
 */
export function createMockCategoriesRepository(): MockCategoriesRepository {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    invalidateCache: vi.fn()
  }
}

/**
 * 创建 Mock CategoryPricesRepository
 *
 * @returns Mock CategoryPricesRepository 实例
 *
 * @example
 * ```typescript
 * const mockCategoryPricesRepo = createMockCategoryPricesRepository()
 * mockCategoryPricesRepo.getByWarehouse.mockResolvedValue([mockPrice])
 * ```
 */
export function createMockCategoryPricesRepository(): MockCategoryPricesRepository {
  return {
    getByWarehouse: vi.fn().mockResolvedValue([]),
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(null),
    invalidateCache: vi.fn()
  }
}

// ==================== 辅助函数 ====================

/**
 * 创建所有 Repository 的 Mock
 * 用于一次性设置所有 Repository Mock
 *
 * @returns 包含所有 Repository Mock 的对象
 *
 * @example
 * ```typescript
 * const mocks = createAllMockRepositories()
 * vi.mock('@/db/repositories', () => ({
 *   usersRepository: mocks.usersRepository,
 *   warehousesRepository: mocks.warehousesRepository,
 *   // ...
 * }))
 * ```
 */
export function createAllMockRepositories() {
  return {
    usersRepository: createMockUsersRepository(),
    warehousesRepository: createMockWarehousesRepository(),
    warehouseAssignmentsRepository: createMockWarehouseAssignmentsRepository(),
    attendanceRepository: createMockAttendanceRepository(),
    pieceWorkRepository: createMockPieceWorkRepository(),
    leaveRepository: createMockLeaveRepository(),
    notificationsRepository: createMockNotificationsRepository(),
    vehiclesRepository: createMockVehiclesRepository(),
    categoriesRepository: createMockCategoriesRepository(),
    categoryPricesRepository: createMockCategoryPricesRepository()
  }
}

/**
 * 重置所有 Repository Mock
 * 在每个测试用例之前调用以确保测试隔离
 *
 * @param mocks - 包含所有 Repository Mock 的对象
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   resetAllMockRepositories(mocks)
 * })
 * ```
 */
export function resetAllMockRepositories(mocks: ReturnType<typeof createAllMockRepositories>): void {
  vi.clearAllMocks()

  // 重置每个 Repository 的默认返回值
  Object.values(mocks).forEach((repo) => {
    Object.values(repo).forEach((fn) => {
      if (typeof fn === 'function' && fn.mockReset) {
        fn.mockReset()
      }
    })
  })
}
