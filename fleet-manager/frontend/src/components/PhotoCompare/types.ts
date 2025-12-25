/**
 * 照片对比组件类型定义
 * 定义照片对比功能所需的接口和类型
 * @module components/PhotoCompare/types
 */

/**
 * 照片角度枚举
 * 用于标识 7 张基本照片的拍摄角度
 */
export type PhotoAngle = 
  | 'left_front'   // 左前
  | 'right_front'  // 右前
  | 'left_rear'    // 左后
  | 'right_rear'   // 右后
  | 'dashboard'    // 仪表盘
  | 'rear_door'    // 后门
  | 'cargo_box'    // 货箱

/**
 * 照片来源枚举
 * 标识照片是提车时拍摄还是还车时拍摄
 */
export type PhotoSource = 'pickup' | 'return'

/**
 * 照片项接口
 * 描述单张照片的完整信息
 */
export interface PhotoItem {
  /** 照片 URL */
  url: string
  /** 照片角度（基本照片用） */
  angle?: PhotoAngle
  /** 拍摄时间 */
  takenAt: string
  /** 来源：pickup=提车, return=还车 */
  source: PhotoSource
  /** 照片描述（可选） */
  description?: string
}

/**
 * 照片类型枚举
 * basic: 7 张基本照片（按角度匹配）
 * damage: 车损照片（任意选择）
 */
export type PhotoType = 'basic' | 'damage'

/**
 * 对比模式枚举
 * side: 并排对比
 * overlay: 叠加对比（滑动切换）
 */
export type CompareMode = 'side' | 'overlay'

/**
 * 照片对比组件属性接口
 */
export interface PhotoCompareProps {
  /** 可选照片列表 */
  photos: PhotoItem[]
  /** 照片类型：basic=7张基本照片, damage=车损照片 */
  type: PhotoType
  /** 对比模式：side=并排, overlay=叠加 */
  mode?: CompareMode
  /** 是否显示时间标签 */
  showTimeLabel?: boolean
  /** 是否显示来源标签 */
  showSourceLabel?: boolean
}

/**
 * 照片对比选择状态
 * 用于跟踪用户选择的两张照片
 */
export interface CompareSelection {
  /** 第一张照片（左侧/底层） */
  first: PhotoItem | null
  /** 第二张照片（右侧/顶层） */
  second: PhotoItem | null
}

/**
 * 缩放平移状态
 * 用于同步两张照片的缩放和平移操作
 */
export interface TransformState {
  /** 缩放比例 */
  scale: number
  /** X 轴偏移 */
  translateX: number
  /** Y 轴偏移 */
  translateY: number
}

/**
 * 角度标签映射
 * 将角度枚举值映射为中文显示名称
 */
export const ANGLE_LABELS: Record<PhotoAngle, string> = {
  left_front: '左前',
  right_front: '右前',
  left_rear: '左后',
  right_rear: '右后',
  dashboard: '仪表盘',
  rear_door: '后门',
  cargo_box: '货箱'
}

/**
 * 来源标签映射
 * 将来源枚举值映射为中文显示名称
 */
export const SOURCE_LABELS: Record<PhotoSource, string> = {
  pickup: '提车',
  return: '还车'
}
