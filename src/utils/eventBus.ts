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
  | 'leave:created'           // 请假申请创建
  | 'leave:updated'           // 请假申请更新（审批）
  | 'resignation:created'     // 离职申请创建
  | 'resignation:updated'     // 离职申请更新（审批）
  | 'attendance:created'      // 打卡记录创建
  | 'piece_work:created'      // 计件记录创建
  | 'piece_work:updated'      // 计件记录更新
  | 'notification:created'    // 通知创建
  | 'notification:read'       // 通知已读
  | 'data:refresh'            // 通用数据刷新

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
  listeners.get(event)!.add(callback)

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
