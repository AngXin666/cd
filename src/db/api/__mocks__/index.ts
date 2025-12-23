/**
 * Mock 工厂函数索引文件
 * 统一导出所有 Mock 工厂函数和测试数据生成器
 *
 * @module db/api/__mocks__
 */

// 导出 Supabase Mock 工厂
export {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockAuth,
  createMockStorage,
  createMockStorageBucket,
  setMockQuerySuccess,
  setMockQueryError,
  setMockUserLoggedIn,
  setMockUserLoggedOut,
  resetMockSupabaseClient,
  type MockSupabaseClient,
  type MockQueryBuilder,
  type MockAuth,
  type MockStorage,
  type MockStorageBucket
} from './supabase'

// 导出 Repository Mock 工厂
export {
  createMockUsersRepository,
  createMockWarehousesRepository,
  createMockWarehouseAssignmentsRepository,
  createMockAttendanceRepository,
  createMockPieceWorkRepository,
  createMockLeaveRepository,
  createMockNotificationsRepository,
  createMockVehiclesRepository,
  createMockCategoriesRepository,
  createMockCategoryPricesRepository,
  createAllMockRepositories,
  resetAllMockRepositories,
  type MockUsersRepository,
  type MockWarehousesRepository,
  type MockWarehouseAssignmentsRepository,
  type MockAttendanceRepository,
  type MockPieceWorkRepository,
  type MockLeaveRepository,
  type MockNotificationsRepository,
  type MockVehiclesRepository,
  type MockCategoriesRepository,
  type MockCategoryPricesRepository
} from './repositories'

// 导出测试数据生成器
export {
  // 工具函数
  generateUUID,
  getCurrentTimestamp,
  getDateString,
  // 用户数据生成器
  createMockUser,
  createMockDriver,
  createMockManager,
  createMockBoss,
  createMockProfile,
  createMockUsers,
  // 仓库数据生成器
  createMockWarehouse,
  createMockWarehouses,
  // 仓库分配数据生成器
  createMockWarehouseAssignment,
  createMockWarehouseAssignments,
  // 考勤数据生成器
  createMockAttendance,
  createMockTodayAttendance,
  createMockAttendanceRecords,
  // 计件数据生成器
  createMockPiecework,
  createMockPieceworkRecords,
  // 请假数据生成器
  createMockLeaveRequest,
  createMockLeaveRequests,
  // 通知数据生成器
  createMockNotification,
  createMockNotifications,
  createMockUnreadNotifications,
  // 品类数据生成器
  createMockCategory,
  createMockCategories,
  createMockCategoryPrice,
  // 综合测试数据集
  createMockTestDataSet,
  // 类型
  type MockCategory,
  type MockCategoryPrice
} from './testData'
