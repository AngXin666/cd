/**
 * 测试数据生成器
 * 提供用户、仓库、考勤等测试数据生成函数
 *
 * 功能包括：
 * - 生成用户测试数据（司机、管理员、老板）
 * - 生成仓库测试数据
 * - 生成仓库分配测试数据
 * - 生成考勤记录测试数据
 * - 生成计件记录测试数据
 * - 生成请假申请测试数据
 * - 生成通知测试数据
 *
 * @module db/api/__mocks__/testData
 * @requirements 7.1
 */

import type {
  Profile,
  UserRole,
  UserWithRole,
  Warehouse,
  WarehouseAssignment,
  AttendanceRecord,
  AttendanceStatus,
  PieceworkRecord,
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  Notification
} from '@/db/types'

// ==================== 基础工具函数 ====================

/**
 * 生成 UUID
 * 用于生成测试数据的唯一标识符
 *
 * @returns UUID 字符串
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 生成当前时间的 ISO 字符串
 *
 * @returns ISO 时间字符串
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * 生成指定日期的 ISO 字符串
 *
 * @param daysOffset - 相对于今天的天数偏移（负数为过去，正数为未来）
 * @returns ISO 日期字符串（YYYY-MM-DD 格式）
 */
export function getDateString(daysOffset: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString().split('T')[0]
}


// ==================== 用户数据生成器 ====================

/**
 * 用户测试数据默认值
 */
const DEFAULT_USER: Omit<UserWithRole, 'id'> = {
  name: '测试用户',
  phone: '13800138000',
  email: 'test@example.com',
  avatar_url: null,
  role: 'DRIVER',
  driver_type: 'pure',
  manager_permissions_enabled: false,
  main_account_id: null,
  peer_account_permission: null,
  is_active: true,
  created_at: getCurrentTimestamp(),
  updated_at: getCurrentTimestamp()
}

/**
 * 创建测试用户数据
 *
 * @param overrides - 覆盖默认值的字段
 * @returns 用户数据对象
 *
 * @example
 * ```typescript
 * // 创建默认司机
 * const driver = createMockUser()
 *
 * // 创建管理员
 * const manager = createMockUser({ role: 'MANAGER', name: '张管理' })
 *
 * // 创建老板
 * const boss = createMockUser({ role: 'BOSS', name: '李老板' })
 * ```
 */
export function createMockUser(overrides: Partial<UserWithRole> = {}): UserWithRole {
  return {
    id: generateUUID(),
    ...DEFAULT_USER,
    ...overrides,
    created_at: overrides.created_at || getCurrentTimestamp(),
    updated_at: overrides.updated_at || getCurrentTimestamp()
  }
}

/**
 * 创建测试司机数据
 *
 * @param overrides - 覆盖默认值的字段
 * @returns 司机用户数据对象
 */
export function createMockDriver(overrides: Partial<UserWithRole> = {}): UserWithRole {
  return createMockUser({
    role: 'DRIVER',
    driver_type: 'pure',
    name: '测试司机',
    ...overrides
  })
}

/**
 * 创建测试管理员数据
 *
 * @param overrides - 覆盖默认值的字段
 * @returns 管理员用户数据对象
 */
export function createMockManager(overrides: Partial<UserWithRole> = {}): UserWithRole {
  return createMockUser({
    role: 'MANAGER',
    driver_type: null,
    name: '测试管理员',
    manager_permissions_enabled: true,
    ...overrides
  })
}

/**
 * 创建测试老板数据
 *
 * @param overrides - 覆盖默认值的字段
 * @returns 老板用户数据对象
 */
export function createMockBoss(overrides: Partial<UserWithRole> = {}): UserWithRole {
  return createMockUser({
    role: 'BOSS',
    driver_type: null,
    name: '测试老板',
    ...overrides
  })
}

/**
 * 创建测试 Profile 数据（兼容旧代码）
 *
 * @param overrides - 覆盖默认值的字段
 * @returns Profile 数据对象
 */
export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  const user = createMockUser(overrides as Partial<UserWithRole>)
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatar_url: user.avatar_url,
    role: user.role || 'DRIVER',
    driver_type: user.driver_type,
    manager_permissions_enabled: user.manager_permissions_enabled,
    main_account_id: user.main_account_id,
    peer_account_permission: user.peer_account_permission,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
    ...overrides
  }
}

/**
 * 批量创建测试用户数据
 *
 * @param count - 创建数量
 * @param role - 用户角色
 * @returns 用户数据数组
 */
export function createMockUsers(count: number, role: UserRole = 'DRIVER'): UserWithRole[] {
  return Array.from({length: count}, (_, index) =>
    createMockUser({
      name: `测试用户${index + 1}`,
      phone: `1380013800${index}`,
      role
    })
  )
}


// ==================== 仓库数据生成器 ====================

/**
 * 仓库测试数据默认值
 */
const DEFAULT_WAREHOUSE: Omit<Warehouse, 'id'> = {
  name: '测试仓库',
  address: '北京市朝阳区测试路1号',
  contact_person: '张三',
  contact_phone: '13900139000',
  is_active: true,
  max_leave_days: 3,
  resignation_notice_days: 30,
  daily_target: 100,
  created_at: getCurrentTimestamp(),
  updated_at: getCurrentTimestamp()
}

/**
 * 创建测试仓库数据
 *
 * @param overrides - 覆盖默认值的字段
 * @returns 仓库数据对象
 *
 * @example
 * ```typescript
 * // 创建默认仓库
 * const warehouse = createMockWarehouse()
 *
 * // 创建指定名称的仓库
 * const warehouse = createMockWarehouse({ name: '北京仓库' })
 *
 * // 创建禁用的仓库
 * const warehouse = createMockWarehouse({ is_active: false })
 * ```
 */
export function createMockWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: generateUUID(),
    ...DEFAULT_WAREHOUSE,
    ...overrides,
    created_at: overrides.created_at || getCurrentTimestamp(),
    updated_at: overrides.updated_at || getCurrentTimestamp()
  }
}

/**
 * 批量创建测试仓库数据
 *
 * @param count - 创建数量
 * @returns 仓库数据数组
 */
export function createMockWarehouses(count: number): Warehouse[] {
  return Array.from({length: count}, (_, index) =>
    createMockWarehouse({
      name: `测试仓库${index + 1}`,
      address: `北京市朝阳区测试路${index + 1}号`
    })
  )
}

// ==================== 仓库分配数据生成器 ====================

/**
 * 创建测试仓库分配数据
 *
 * @param userId - 用户 ID
 * @param warehouseId - 仓库 ID
 * @param overrides - 覆盖默认值的字段
 * @returns 仓库分配数据对象
 *
 * @example
 * ```typescript
 * const assignment = createMockWarehouseAssignment('user-001', 'wh-001')
 * ```
 */
export function createMockWarehouseAssignment(
  userId: string,
  warehouseId: string,
  overrides: Partial<WarehouseAssignment> = {}
): WarehouseAssignment {
  return {
    id: generateUUID(),
    user_id: userId,
    warehouse_id: warehouseId,
    assigned_by: null,
    permission_level: 'full_control',
    created_at: getCurrentTimestamp(),
    ...overrides
  }
}

/**
 * 批量创建测试仓库分配数据
 *
 * @param userIds - 用户 ID 数组
 * @param warehouseId - 仓库 ID
 * @returns 仓库分配数据数组
 */
export function createMockWarehouseAssignments(
  userIds: string[],
  warehouseId: string
): WarehouseAssignment[] {
  return userIds.map((userId) => createMockWarehouseAssignment(userId, warehouseId))
}


// ==================== 考勤数据生成器 ====================

/**
 * 考勤记录测试数据默认值
 */
const DEFAULT_ATTENDANCE: Omit<AttendanceRecord, 'id' | 'user_id'> = {
  date: getDateString(),
  work_date: getDateString(),
  clock_in_time: '09:00:00',
  clock_out_time: '18:00:00',
  warehouse_id: null,
  status: 'normal',
  work_hours: 8,
  notes: null,
  created_at: getCurrentTimestamp()
}

/**
 * 创建测试考勤记录数据
 *
 * @param userId - 用户 ID
 * @param overrides - 覆盖默认值的字段
 * @returns 考勤记录数据对象
 *
 * @example
 * ```typescript
 * // 创建正常考勤记录
 * const attendance = createMockAttendance('user-001')
 *
 * // 创建迟到考勤记录
 * const attendance = createMockAttendance('user-001', {
 *   clock_in_time: '09:30:00',
 *   status: 'late'
 * })
 * ```
 */
export function createMockAttendance(
  userId: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord {
  return {
    id: generateUUID(),
    user_id: userId,
    ...DEFAULT_ATTENDANCE,
    ...overrides,
    created_at: overrides.created_at || getCurrentTimestamp()
  }
}

/**
 * 创建今日考勤记录
 *
 * @param userId - 用户 ID
 * @param overrides - 覆盖默认值的字段
 * @returns 今日考勤记录数据对象
 */
export function createMockTodayAttendance(
  userId: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord {
  const today = getDateString()
  return createMockAttendance(userId, {
    date: today,
    work_date: today,
    ...overrides
  })
}

/**
 * 批量创建测试考勤记录数据
 *
 * @param userId - 用户 ID
 * @param count - 创建数量
 * @returns 考勤记录数据数组
 */
export function createMockAttendanceRecords(
  userId: string,
  count: number
): AttendanceRecord[] {
  return Array.from({length: count}, (_, index) =>
    createMockAttendance(userId, {
      date: getDateString(-index),
      work_date: getDateString(-index)
    })
  )
}

// ==================== 计件数据生成器 ====================

/**
 * 计件记录测试数据默认值
 */
const DEFAULT_PIECEWORK: Omit<PieceworkRecord, 'id' | 'user_id'> = {
  date: getDateString(),
  work_date: getDateString(),
  warehouse_id: null,
  category: '搬运',
  category_id: 'cat-001',
  quantity: 100,
  unit_price: 1.5,
  total_amount: 150,
  need_upstairs: false,
  upstairs_price: null,
  need_sorting: false,
  sorting_quantity: null,
  sorting_unit_price: null,
  notes: null,
  created_at: getCurrentTimestamp(),
  updated_at: getCurrentTimestamp()
}

/**
 * 创建测试计件记录数据
 *
 * @param userId - 用户 ID
 * @param overrides - 覆盖默认值的字段
 * @returns 计件记录数据对象
 *
 * @example
 * ```typescript
 * // 创建默认计件记录
 * const record = createMockPiecework('user-001')
 *
 * // 创建指定数量的计件记录
 * const record = createMockPiecework('user-001', {
 *   quantity: 200,
 *   total_amount: 300
 * })
 * ```
 */
export function createMockPiecework(
  userId: string,
  overrides: Partial<PieceworkRecord> = {}
): PieceworkRecord {
  return {
    id: generateUUID(),
    user_id: userId,
    ...DEFAULT_PIECEWORK,
    ...overrides,
    created_at: overrides.created_at || getCurrentTimestamp(),
    updated_at: overrides.updated_at || getCurrentTimestamp()
  }
}

/**
 * 批量创建测试计件记录数据
 *
 * @param userId - 用户 ID
 * @param count - 创建数量
 * @returns 计件记录数据数组
 */
export function createMockPieceworkRecords(
  userId: string,
  count: number
): PieceworkRecord[] {
  return Array.from({length: count}, (_, index) =>
    createMockPiecework(userId, {
      date: getDateString(-index),
      work_date: getDateString(-index),
      quantity: 100 + index * 10
    })
  )
}


// ==================== 请假数据生成器 ====================

/**
 * 请假申请测试数据默认值
 */
const DEFAULT_LEAVE: Omit<LeaveRequest, 'id' | 'user_id'> = {
  leave_type: 'personal',
  start_date: getDateString(1),
  end_date: getDateString(3),
  reason: '个人事务',
  status: 'pending',
  approver_id: null,
  approved_at: null,
  review_notes: null,
  warehouse_id: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: getCurrentTimestamp(),
  updated_at: getCurrentTimestamp()
}

/**
 * 创建测试请假申请数据
 *
 * @param userId - 用户 ID
 * @param overrides - 覆盖默认值的字段
 * @returns 请假申请数据对象
 *
 * @example
 * ```typescript
 * // 创建待审批请假申请
 * const leave = createMockLeaveRequest('user-001')
 *
 * // 创建已批准请假申请
 * const leave = createMockLeaveRequest('user-001', {
 *   status: 'approved',
 *   approver_id: 'manager-001'
 * })
 * ```
 */
export function createMockLeaveRequest(
  userId: string,
  overrides: Partial<LeaveRequest> = {}
): LeaveRequest {
  return {
    id: generateUUID(),
    user_id: userId,
    ...DEFAULT_LEAVE,
    ...overrides,
    created_at: overrides.created_at || getCurrentTimestamp(),
    updated_at: overrides.updated_at || getCurrentTimestamp()
  }
}

/**
 * 批量创建测试请假申请数据
 *
 * @param userId - 用户 ID
 * @param count - 创建数量
 * @returns 请假申请数据数组
 */
export function createMockLeaveRequests(
  userId: string,
  count: number
): LeaveRequest[] {
  const leaveTypes: LeaveType[] = ['sick', 'personal', 'annual', 'other']
  return Array.from({length: count}, (_, index) =>
    createMockLeaveRequest(userId, {
      leave_type: leaveTypes[index % leaveTypes.length],
      start_date: getDateString(index * 7 + 1),
      end_date: getDateString(index * 7 + 3)
    })
  )
}

// ==================== 通知数据生成器 ====================

/**
 * 通知测试数据默认值
 */
const DEFAULT_NOTIFICATION: Omit<Notification, 'id' | 'recipient_id'> = {
  title: '测试通知',
  content: '这是一条测试通知内容',
  type: 'system_notice',
  sender_id: null,
  sender_name: '系统',
  category: 'system',
  action_url: null,
  is_read: false,
  related_id: null,
  approval_status: null,
  batch_id: null,
  parent_notification_id: null,
  created_at: getCurrentTimestamp(),
  updated_at: getCurrentTimestamp()
}

/**
 * 创建测试通知数据
 *
 * @param recipientId - 接收者用户 ID
 * @param overrides - 覆盖默认值的字段
 * @returns 通知数据对象
 *
 * @example
 * ```typescript
 * // 创建系统通知
 * const notification = createMockNotification('user-001')
 *
 * // 创建请假审批通知
 * const notification = createMockNotification('user-001', {
 *   type: 'leave_approval',
 *   title: '请假申请已批准',
 *   approval_status: 'approved'
 * })
 * ```
 */
export function createMockNotification(
  recipientId: string,
  overrides: Partial<Notification> = {}
): Notification {
  return {
    id: generateUUID(),
    recipient_id: recipientId,
    ...DEFAULT_NOTIFICATION,
    ...overrides,
    created_at: overrides.created_at || getCurrentTimestamp(),
    updated_at: overrides.updated_at || getCurrentTimestamp()
  }
}

/**
 * 批量创建测试通知数据
 *
 * @param recipientId - 接收者用户 ID
 * @param count - 创建数量
 * @returns 通知数据数组
 */
export function createMockNotifications(
  recipientId: string,
  count: number
): Notification[] {
  return Array.from({length: count}, (_, index) =>
    createMockNotification(recipientId, {
      title: `测试通知${index + 1}`,
      content: `这是第${index + 1}条测试通知`,
      is_read: index % 2 === 0 // 偶数已读，奇数未读
    })
  )
}

/**
 * 创建未读通知数据
 *
 * @param recipientId - 接收者用户 ID
 * @param count - 创建数量
 * @returns 未读通知数据数组
 */
export function createMockUnreadNotifications(
  recipientId: string,
  count: number
): Notification[] {
  return Array.from({length: count}, (_, index) =>
    createMockNotification(recipientId, {
      title: `未读通知${index + 1}`,
      is_read: false
    })
  )
}


// ==================== 品类数据生成器 ====================

/**
 * 品类测试数据
 */
export interface MockCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * 创建测试品类数据
 *
 * @param overrides - 覆盖默认值的字段
 * @returns 品类数据对象
 */
export function createMockCategory(overrides: Partial<MockCategory> = {}): MockCategory {
  return {
    id: generateUUID(),
    name: '搬运',
    description: '搬运货物',
    is_active: true,
    created_at: getCurrentTimestamp(),
    updated_at: getCurrentTimestamp(),
    ...overrides
  }
}

/**
 * 批量创建测试品类数据
 *
 * @param count - 创建数量
 * @returns 品类数据数组
 */
export function createMockCategories(count: number): MockCategory[] {
  const categoryNames = ['搬运', '装卸', '分拣', '打包', '配送']
  return Array.from({length: count}, (_, index) =>
    createMockCategory({
      name: categoryNames[index % categoryNames.length],
      description: `${categoryNames[index % categoryNames.length]}工作`
    })
  )
}

// ==================== 品类价格数据生成器 ====================

/**
 * 品类价格测试数据
 */
export interface MockCategoryPrice {
  id: string
  category_id: string
  warehouse_id: string | null
  price: number
  driver_type: string | null
  effective_date: string
  created_at: string
  updated_at: string
}

/**
 * 创建测试品类价格数据
 *
 * @param categoryId - 品类 ID
 * @param warehouseId - 仓库 ID
 * @param overrides - 覆盖默认值的字段
 * @returns 品类价格数据对象
 */
export function createMockCategoryPrice(
  categoryId: string,
  warehouseId: string | null = null,
  overrides: Partial<MockCategoryPrice> = {}
): MockCategoryPrice {
  return {
    id: generateUUID(),
    category_id: categoryId,
    warehouse_id: warehouseId,
    price: 1.5,
    driver_type: null,
    effective_date: getDateString(),
    created_at: getCurrentTimestamp(),
    updated_at: getCurrentTimestamp(),
    ...overrides
  }
}

// ==================== 综合测试数据集 ====================

/**
 * 创建完整的测试数据集
 * 包含用户、仓库、分配关系等完整的测试数据
 *
 * @returns 完整的测试数据集
 *
 * @example
 * ```typescript
 * const testData = createMockTestDataSet()
 * console.log(testData.boss) // 老板用户
 * console.log(testData.managers) // 管理员列表
 * console.log(testData.drivers) // 司机列表
 * console.log(testData.warehouses) // 仓库列表
 * ```
 */
export function createMockTestDataSet() {
  // 创建用户
  const boss = createMockBoss({name: '测试老板'})
  const managers = [
    createMockManager({name: '管理员A'}),
    createMockManager({name: '管理员B'})
  ]
  const drivers = [
    createMockDriver({name: '司机A'}),
    createMockDriver({name: '司机B'}),
    createMockDriver({name: '司机C'})
  ]

  // 创建仓库
  const warehouses = [
    createMockWarehouse({name: '北京仓库'}),
    createMockWarehouse({name: '上海仓库'})
  ]

  // 创建仓库分配
  const assignments = [
    // 管理员A 管理北京仓库
    createMockWarehouseAssignment(managers[0].id, warehouses[0].id),
    // 管理员B 管理上海仓库
    createMockWarehouseAssignment(managers[1].id, warehouses[1].id),
    // 司机A 分配到北京仓库
    createMockWarehouseAssignment(drivers[0].id, warehouses[0].id),
    // 司机B 分配到北京仓库
    createMockWarehouseAssignment(drivers[1].id, warehouses[0].id),
    // 司机C 分配到上海仓库
    createMockWarehouseAssignment(drivers[2].id, warehouses[1].id)
  ]

  // 创建品类
  const categories = createMockCategories(3)

  return {
    boss,
    managers,
    drivers,
    warehouses,
    assignments,
    categories,
    // 便捷访问
    allUsers: [boss, ...managers, ...drivers],
    allProfiles: [boss, ...managers, ...drivers].map((u) => createMockProfile(u as Partial<Profile>))
  }
}

// ==================== 导出所有生成器 ====================

export {
  // 类型
  type UserRole,
  type AttendanceStatus,
  type LeaveType,
  type LeaveStatus
}
