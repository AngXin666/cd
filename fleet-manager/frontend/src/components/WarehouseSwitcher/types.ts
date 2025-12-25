/**
 * 仓库切换器组件类型定义
 * 
 * @module components/WarehouseSwitcher/types
 */

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
 */
export interface WarehouseSwitcherEmits {
  /** 仓库切换事件 */
  (e: 'change', index: number): void
}
