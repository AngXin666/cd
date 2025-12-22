/**
 * 全局事件总线
 * 用于组件间通信，实现事件驱动的数据刷新
 *
 * 使用场景：
 * - 当用户提交请假申请后，通知管理员页面刷新
 * - 当用户提交计件记录后，通知仪表板刷新
 * - 当管理员审批请假后，通知司机页面刷新
 *
 * @module utils/eventBus
 */

/** 事件类型定义 */
export type EventType =
  // ==================== 请假相关事件 ====================
  | 'leave:created' // 请假申请创建
  | 'leave:updated' // 请假申请更新（审批）
  | 'resignation:created' // 离职申请创建
  | 'resignation:updated' // 离职申请更新（审批）

  // ==================== 考勤相关事件 ====================
  | 'attendance:created' // 打卡记录创建
  | 'attendance:updated' // 打卡记录更新

  // ==================== 计件相关事件 ====================
  | 'piece_work:created' // 计件记录创建
  | 'piece_work:updated' // 计件记录更新

  // ==================== 通知相关事件 ====================
  | 'notification:created' // 通知创建
  | 'notification:read' // 通知已读

  // ==================== 仓库分配事件（第一阶段） ====================
  | 'warehouse_assignment:created' // 仓库分配创建（司机被分配到仓库）
  | 'warehouse_assignment:updated' // 仓库分配更新（批量更新司机仓库）
  | 'warehouse_assignment:deleted' // 仓库分配删除（司机从仓库移除）

  // ==================== 车辆审核事件（第一阶段） ====================
  | 'vehicle:review_submitted' // 车辆提交审核
  | 'vehicle:approved' // 车辆审核通过
  | 'vehicle:supplement_required' // 车辆需要补录
  | 'vehicle:photo_supplemented' // 照片补录成功

  // ==================== 用户权限事件（第一阶段） ====================
  | 'user:role_updated' // 用户角色更新
  | 'user:permission_updated' // 用户权限更新（车队长权限启用/禁用）

  // ==================== 仓库管理事件（第二阶段） ====================
  | 'warehouse:created' // 仓库创建
  | 'warehouse:updated' // 仓库更新
  | 'warehouse:deleted' // 仓库删除

  // ==================== 车辆管理事件（第二阶段） ====================
  | 'vehicle:created' // 车辆创建
  | 'vehicle:updated' // 车辆更新
  | 'vehicle:deleted' // 车辆删除
  | 'vehicle:returned' // 车辆归还

  // ==================== 用户管理事件（第二阶段） ====================
  | 'user:created' // 用户创建
  | 'user:updated' // 用户更新
  | 'user:deleted' // 用户删除

  // ==================== 品类管理事件（第二阶段） ====================
  | 'category:created' // 品类创建
  | 'category:updated' // 品类更新
  | 'category:deleted' // 品类删除
  | 'category_price:updated' // 品类价格更新
  | 'category_price:deleted' // 品类价格删除

  // ==================== 权限策略事件（第二阶段） ====================
  | 'permission:manager_created' // 车队长权限创建
  | 'permission:manager_updated' // 车队长权限更新
  | 'permission:manager_deleted' // 车队长权限删除
  | 'permission:scheduler_created' // 调度员权限创建
  | 'permission:scheduler_updated' // 调度员权限更新
  | 'permission:scheduler_deleted' // 调度员权限删除
  | 'peer_admin:created' // 同行管理员创建
  | 'peer_admin:updated' // 同行管理员更新
  | 'peer_admin:deleted' // 同行管理员删除

  // ==================== 角色管理事件（第二阶段） ====================
  | 'user:role_added' // 用户角色添加
  | 'user:role_removed' // 用户角色移除

  // ==================== 考勤规则事件（第三阶段） ====================
  | 'attendance_rule:created' // 考勤规则创建
  | 'attendance_rule:updated' // 考勤规则更新
  | 'attendance_rule:deleted' // 考勤规则删除

  // ==================== 驾照管理事件（第三阶段） ====================
  | 'driver_license:updated' // 驾照信息更新
  | 'driver_license:deleted' // 驾照信息删除

  // ==================== 通知管理事件（第三阶段） ====================
  | 'notification:deleted' // 通知删除

  // ==================== 通用事件 ====================
  | 'data:refresh' // 通用数据刷新

/** 事件回调函数类型 */
type EventCallback = (data?: unknown) => void

/** 事件监听器存储 */
const listeners: Map<EventType, Set<EventCallback>> = new Map()

/**
 * 订阅事件
 * @param event - 事件类型
 * @param callback - 回调函数
 * @returns 取消订阅的函数
 */
export function subscribe(event: EventType, callback: EventCallback): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set())
  }
  listeners.get(event)?.add(callback)

  // 返回取消订阅的函数
  return () => {
    listeners.get(event)?.delete(callback)
  }
}

/**
 * 发布事件
 * @param event - 事件类型
 * @param data - 事件数据（可选）
 */
export function publish(event: EventType, data?: unknown): void {
  console.log(`📢 [EventBus] 发布事件: ${event}`, data)
  listeners.get(event)?.forEach((callback) => {
    try {
      callback(data)
    } catch (error) {
      console.error(`❌ [EventBus] 事件处理失败: ${event}`, error)
    }
  })
}

/**
 * 清除所有事件监听器
 * 用于测试或重置
 */
export function clearAll(): void {
  listeners.clear()
}

/** 导出事件总线对象 */
export const eventBus = {
  subscribe,
  publish,
  clearAll
}

export default eventBus
