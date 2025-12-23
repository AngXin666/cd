/**
 * 类型定义模块
 * 定义前端使用的所有 TypeScript 类型
 */

// ==================== 用户相关 ====================

/** 
 * 用户角色
 * - DRIVER: 司机，负责打卡、计件、请假、车辆管理
 * - MANAGER: 车队长，负责司机管理、审批、统计
 * - PEER_ADMIN: 调度，负责协助管理，拥有与老板类似的管理权限
 * - BOSS: 老板，负责全局管理、用户管理、仓库管理
 * - SUPER_ADMIN: 超级管理员，拥有系统最高权限
 */
export type UserRole = 'DRIVER' | 'MANAGER' | 'PEER_ADMIN' | 'BOSS' | 'SUPER_ADMIN'

/**
 * 角色显示名称映射
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  DRIVER: '司机',
  MANAGER: '车队长',
  PEER_ADMIN: '调度',
  BOSS: '老板',
  SUPER_ADMIN: '超级管理员'
}

/**
 * 获取角色显示名称
 * @param role 用户角色
 * @returns 角色的中文名称
 */
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || '未知角色'
}

/**
 * 检查是否为管理员角色（PEER_ADMIN、BOSS、SUPER_ADMIN）
 * @param role 用户角色
 * @returns 是否为管理员角色
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'PEER_ADMIN' || role === 'BOSS' || role === 'SUPER_ADMIN'
}

/**
 * 检查是否具有管理权限（MANAGER、PEER_ADMIN、BOSS、SUPER_ADMIN）
 * @param role 用户角色
 * @returns 是否具有管理权限
 */
export function hasManagementPermission(role: UserRole): boolean {
  return role === 'MANAGER' || role === 'PEER_ADMIN' || role === 'BOSS' || role === 'SUPER_ADMIN'
}

/** 用户信息 */
export interface User {
  id: number
  username: string
  name: string
  phone: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

/** 登录响应 */
export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

// ==================== 仓库相关 ====================

/** 仓库信息 */
export interface Warehouse {
  id: number
  name: string
  address: string | null
  is_active: boolean
  created_at: string
}

// ==================== 考勤相关 ====================

/** 考勤记录 */
export interface Attendance {
  id: number
  user_id: number
  work_date: string
  clock_in: string | null
  clock_out: string | null
  work_hours: number | null
}

/** 今日打卡状态 */
export interface TodayAttendance {
  has_clocked_in: boolean
  has_clocked_out: boolean
  clock_in_time: string | null
  clock_out_time: string | null
}

// ==================== 计件相关 ====================

/** 计件分类 */
export interface PieceWorkCategory {
  id: number
  name: string
  unit_price: number
  is_active: boolean
  created_at: string
}

/** 计件记录 */
export interface PieceWorkRecord {
  id: number
  user_id: number
  category_id: number
  warehouse_id: number
  work_date: string
  quantity: number
  amount: number
  created_at: string
}

/** 计件统计 */
export interface PieceWorkStats {
  total_quantity: number
  total_amount: number
  records_count: number
}

// ==================== 请假相关 ====================

/** 请假类型 */
export type LeaveType = 'LEAVE' | 'RESIGN'

/** 请假状态 */
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** 请假申请 */
export interface LeaveApplication {
  id: number
  user_id: number
  type: LeaveType
  start_date: string
  end_date: string
  reason: string | null
  status: LeaveStatus
  approver_id: number | null
  approved_at: string | null
  created_at: string
}

// ==================== 车辆相关 ====================

/** 车辆状态 */
export type VehicleStatus = 'ACTIVE' | 'RETURNED' | 'REVIEWING'

/** 证件类型 */
export type DocType = 'LICENSE' | 'REGISTRATION' | 'INSURANCE'

/** 车辆信息 */
export interface Vehicle {
  id: number
  user_id: number
  license_plate: string
  brand: string | null
  model: string | null
  status: VehicleStatus
  created_at: string
}

/** 车辆证件 */
export interface VehicleDocument {
  id: number
  vehicle_id: number
  doc_type: DocType
  file_url: string
  expiry_date: string | null
  supplemented_photos: SupplementedPhotos | null
  created_at: string
  updated_at: string | null
}

// ==================== 补录照片相关 ====================

/**
 * 补录照片元数据
 * 存储单张补录照片的详细信息
 */
export interface SupplementedPhotoMeta {
  /** 照片字段名，如 "pickup_photos" */
  field: string
  /** 照片在数组中的索引 */
  index: number
  /** 补录时间戳（ISO 8601 格式） */
  supplemented_at: string
  /** 原始照片URL（如果有） */
  original_url: string | null
  /** 补录次数（累计） */
  supplement_count: number
}

/**
 * 补录照片元数据字典
 * 键为 "{field}_{index}"，值为补录元数据
 * 例如：{ "pickup_photos_0": { field: "pickup_photos", index: 0, ... } }
 */
export type SupplementedPhotos = Record<string, SupplementedPhotoMeta>

/**
 * 补录照片请求参数
 */
export interface SupplementPhotoRequest {
  /** 照片字段名，如 "pickup_photos"、"return_photos" 等 */
  field: string
  /** 照片在数组中的索引 */
  index: number
  /** 新照片的URL */
  new_url: string
}

/**
 * 补录照片响应
 */
export interface SupplementedPhotosResponse {
  /** 车辆ID */
  vehicle_id: number
  /** 补录照片元数据字典 */
  supplemented_photos: SupplementedPhotos
}

// ==================== 通知相关 ====================

/** 通知消息 */
export interface Notification {
  id: number
  user_id: number
  title: string
  content: string
  is_read: boolean
  created_at: string
}

// ==================== 通用类型 ====================

/** 分页参数 */
export interface PaginationParams {
  page?: number
  page_size?: number
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  total: number
  page: number
  page_size: number
  items: T[]
}

/** 消息响应 */
export interface MessageResponse {
  message: string
}

/** 日期范围参数 */
export interface DateRangeParams {
  start_date?: string
  end_date?: string
}
