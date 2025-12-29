/**
 * 仓库切换器组件类型定义
 * 
 * @module components/WarehouseSwitcher/types
 * @requirements 5.4 - 仓库选择器集成实时更新
 */

import type { AssignmentUpdateEvent } from '@/types/sse-events'

/**
 * 仓库数据
 */
export interface Warehouse {
  /** 仓库ID */
  id: string
  /** 仓库名称 */
  name: string
}

/**
 * 仓库切换器组件 Props
 */
export interface WarehouseSwitcherProps {
  /** 仓库列表 */
  warehouses: Warehouse[]
  /** 当前选中的仓库索引 */
  currentIndex?: number
}

/**
 * 仓库切换器组件 Emits
 * @requirements 5.4 - 仓库选择器集成实时更新
 */
export interface WarehouseSwitcherEmits {
  /** 仓库切换事件 */
  (e: 'change', index: number): void
  /** 
   * 仓库分配更新事件
   * 当收到 SSE 仓库分配更新事件时触发
   * Requirements: 5.4 - 仓库选择器集成实时更新
   */
  (e: 'assignment-update', data: AssignmentUpdateEvent): void
}
