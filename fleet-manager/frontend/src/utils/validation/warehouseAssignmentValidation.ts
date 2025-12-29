/**
 * 仓库分配验证模块
 * 提供仓库分配相关的验证函数
 * @module utils/validation/warehouseAssignmentValidation
 * 
 * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
 * **Validates: Requirements 7.3**
 */

// ==================== 类型定义 ====================

/**
 * 用户信息（简化版，用于分配验证）
 */
export interface AssignmentUser {
  /** 用户ID */
  id: number
  /** 用户姓名 */
  name: string
  /** 当前分配的仓库ID */
  warehouse_id: number | null
}

/**
 * 仓库信息（简化版，用于分配验证）
 */
export interface AssignmentWarehouse {
  /** 仓库ID */
  id: number
  /** 仓库名称 */
  name: string
  /** 是否激活 */
  is_active: boolean
}

/**
 * 分配请求
 */
export interface AssignmentRequest {
  /** 用户ID */
  userId: number
  /** 目标仓库ID（null 表示取消分配） */
  warehouseId: number | null
}

/**
 * 分配结果
 */
export interface AssignmentResult {
  /** 是否成功 */
  success: boolean
  /** 错误信息（如果失败） */
  error?: string
  /** 更新后的用户信息 */
  updatedUser?: AssignmentUser
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误信息（如果无效） */
  error?: string
}

// ==================== 验证函数 ====================

/**
 * 验证分配请求是否有效
 * 注意：在实际 UI 中，用户只能从可用仓库列表中选择，
 * 所以不会出现选择不存在或禁用仓库的情况
 * 
 * @param request - 分配请求
 * @param user - 用户信息
 * @param warehouses - 可用仓库列表（已过滤，只包含激活的仓库）
 * @returns 验证结果
 * 
 * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
 * **Validates: Requirements 7.3**
 */
export function validateAssignmentRequest(
  request: AssignmentRequest,
  user: AssignmentUser | null,
  warehouses: AssignmentWarehouse[]
): ValidationResult {
  // 验证用户是否存在
  if (!user) {
    return { valid: false, error: '用户不存在' }
  }
  
  // 验证用户ID是否匹配
  if (user.id !== request.userId) {
    return { valid: false, error: '用户ID不匹配' }
  }
  
  // 如果是取消分配（warehouseId 为 null），直接通过
  if (request.warehouseId === null) {
    return { valid: true }
  }
  
  // 验证仓库是否在可用列表中（UI 已保证只能选择激活的仓库）
  const targetWarehouse = warehouses.find(w => w.id === request.warehouseId)
  if (!targetWarehouse) {
    return { valid: false, error: '目标仓库不在可用列表中' }
  }
  
  return { valid: true }
}

/**
 * 执行仓库分配（模拟）
 * 这是一个纯函数，用于测试分配逻辑
 * 注意：在实际 UI 中，warehouses 参数只包含激活的仓库
 * 
 * @param user - 用户信息
 * @param warehouseId - 目标仓库ID
 * @param warehouses - 可用仓库列表（已过滤，只包含激活的仓库）
 * @returns 分配结果
 * 
 * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
 * **Validates: Requirements 7.3**
 */
export function executeAssignment(
  user: AssignmentUser,
  warehouseId: number | null,
  warehouses: AssignmentWarehouse[]
): AssignmentResult {
  // 验证分配请求
  const validation = validateAssignmentRequest(
    { userId: user.id, warehouseId },
    user,
    warehouses
  )
  
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }
  
  // 创建更新后的用户对象
  const updatedUser: AssignmentUser = {
    ...user,
    warehouse_id: warehouseId
  }
  
  return { success: true, updatedUser }
}

/**
 * 验证分配是否生效
 * 检查分配后用户的仓库ID是否正确更新
 * 
 * @param originalUser - 原始用户信息
 * @param updatedUser - 更新后的用户信息
 * @param targetWarehouseId - 目标仓库ID
 * @returns 是否生效
 * 
 * **Feature: boss-missing-pages, Property 5: 仓库分配生效**
 * **Validates: Requirements 7.3**
 */
export function verifyAssignmentEffect(
  originalUser: AssignmentUser,
  updatedUser: AssignmentUser,
  targetWarehouseId: number | null
): boolean {
  // 验证用户ID未变
  if (originalUser.id !== updatedUser.id) {
    return false
  }
  
  // 验证仓库ID已正确更新
  return updatedUser.warehouse_id === targetWarehouseId
}

/**
 * 检查用户是否已分配到指定仓库
 * 
 * @param user - 用户信息
 * @param warehouseId - 仓库ID
 * @returns 是否已分配
 */
export function isUserAssignedToWarehouse(
  user: AssignmentUser,
  warehouseId: number | null
): boolean {
  return user.warehouse_id === warehouseId
}

/**
 * 获取用户当前分配的仓库名称
 * 
 * @param user - 用户信息
 * @param warehouses - 仓库列表
 * @returns 仓库名称，未分配返回 '未分配'
 */
export function getUserWarehouseName(
  user: AssignmentUser,
  warehouses: AssignmentWarehouse[]
): string {
  if (user.warehouse_id === null) {
    return '未分配'
  }
  
  const warehouse = warehouses.find(w => w.id === user.warehouse_id)
  return warehouse ? warehouse.name : '未知仓库'
}

/**
 * 批量分配验证
 * 验证批量分配请求是否有效
 * 
 * @param requests - 分配请求列表
 * @param users - 用户列表
 * @param warehouses - 仓库列表
 * @returns 验证结果列表
 */
export function validateBatchAssignment(
  requests: AssignmentRequest[],
  users: AssignmentUser[],
  warehouses: AssignmentWarehouse[]
): ValidationResult[] {
  return requests.map(request => {
    const user = users.find(u => u.id === request.userId) || null
    return validateAssignmentRequest(request, user, warehouses)
  })
}

/**
 * 计算已分配仓库的用户数量
 * 
 * @param users - 用户列表
 * @returns 已分配用户数量
 */
export function countAssignedUsers(users: AssignmentUser[]): number {
  return users.filter(u => u.warehouse_id !== null).length
}

/**
 * 获取指定仓库的用户列表
 * 
 * @param users - 用户列表
 * @param warehouseId - 仓库ID
 * @returns 该仓库的用户列表
 */
export function getUsersByWarehouse(
  users: AssignmentUser[],
  warehouseId: number | null
): AssignmentUser[] {
  return users.filter(u => u.warehouse_id === warehouseId)
}
