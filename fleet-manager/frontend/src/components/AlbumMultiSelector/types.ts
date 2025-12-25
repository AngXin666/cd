/**
 * 相册连续选择器类型定义
 * 支持滑动手势连续选取多张照片
 * @module components/AlbumMultiSelector/types
 * @requirements 13.1, 13.2, 13.3, 13.4, 13.5
 */

/**
 * 照片项数据结构
 */
export interface PhotoItem {
  /** 照片路径（临时路径或本地路径） */
  path: string
  /** 文件大小（字节） */
  size?: number
  /** 原始文件名 */
  filename?: string
  /** 选择时间戳 */
  selectedAt?: number
}

/**
 * 相册连续选择器组件属性
 */
export interface AlbumMultiSelectorProps {
  /** 最大选择数量，0 表示无限制 */
  maxCount?: number
  /** 已选照片列表 */
  selected?: PhotoItem[]
  /** 是否启用滑动选择（默认 true） */
  enableSwipeSelect?: boolean
  /** 图片来源类型 */
  sourceType?: ('camera' | 'album')[]
  /** 是否显示预览区域（默认 true） */
  showPreview?: boolean
  /** 预览区域标题 */
  previewTitle?: string
  /** 添加按钮文字 */
  addButtonText?: string
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * 相册连续选择器组件事件
 */
export interface AlbumMultiSelectorEmits {
  /** 选择变化事件 */
  (e: 'change', selected: PhotoItem[]): void
  /** 更新 v-model 事件 */
  (e: 'update:selected', selected: PhotoItem[]): void
  /** 删除照片事件 */
  (e: 'delete', index: number, photo: PhotoItem): void
  /** 预览照片事件 */
  (e: 'preview', index: number, photo: PhotoItem): void
}

/**
 * 触摸状态数据
 * 用于跟踪滑动选择的状态
 */
export interface TouchState {
  /** 是否正在触摸 */
  isTouching: boolean
  /** 起始触摸位置 X */
  startX: number
  /** 起始触摸位置 Y */
  startY: number
  /** 当前触摸位置 X */
  currentX: number
  /** 当前触摸位置 Y */
  currentY: number
  /** 滑动选择的照片索引列表 */
  swipeSelectedIndices: number[]
}

/**
 * 相册网格项数据
 * 用于渲染相册网格
 */
export interface AlbumGridItem {
  /** 照片路径 */
  path: string
  /** 是否已选中 */
  selected: boolean
  /** 选中序号（从 1 开始） */
  selectedIndex: number
  /** 是否在当前滑动选择中 */
  inSwipeSelection: boolean
}
