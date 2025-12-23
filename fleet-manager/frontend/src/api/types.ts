/**
 * API 类型定义模块
 * 定义所有 API 请求和响应的 TypeScript 类型
 */

// ==================== 枚举类型 ====================

/** 用户角色枚举 */
export enum UserRole {
  /** 司机 */
  DRIVER = 'driver',
  /** 车队长 */
  MANAGER = 'manager',
  /** 调度 */
  PEER_ADMIN = 'peer_admin',
  /** 老板 */
  BOSS = 'boss',
  /** 超级管理员 */
  SUPER_ADMIN = 'super_admin',
}

/**
 * 角色显示名称映射
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.DRIVER]: '司机',
  [UserRole.MANAGER]: '车队长',
  [UserRole.PEER_ADMIN]: '调度',
  [UserRole.BOSS]: '老板',
  [UserRole.SUPER_ADMIN]: '超级管理员',
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
  return role === UserRole.PEER_ADMIN || role === UserRole.BOSS || role === UserRole.SUPER_ADMIN
}

/**
 * 检查是否具有管理权限（MANAGER、PEER_ADMIN、BOSS、SUPER_ADMIN）
 * @param role 用户角色
 * @returns 是否具有管理权限
 */
export function hasManagementPermission(role: UserRole): boolean {
  return role === UserRole.MANAGER || role === UserRole.PEER_ADMIN || role === UserRole.BOSS || role === UserRole.SUPER_ADMIN
}

/** 请假类型枚举 */
export enum LeaveType {
  /** 请假 */
  LEAVE = 'leave',
  /** 离职 */
  RESIGN = 'resign',
}

/** 请假状态枚举 */
export enum LeaveStatus {
  /** 待审批 */
  PENDING = 'pending',
  /** 已批准 */
  APPROVED = 'approved',
  /** 已拒绝 */
  REJECTED = 'rejected',
}

/** 车辆状态枚举 */
export enum VehicleStatus {
  /** 使用中 */
  ACTIVE = 'active',
  /** 已归还 */
  RETURNED = 'returned',
  /** 审核中 */
  REVIEWING = 'reviewing',
}

/** 证件类型枚举 */
export enum DocumentType {
  /** 驾驶证 */
  LICENSE = 'license',
  /** 行驶证 */
  REGISTRATION = 'registration',
  /** 保险单 */
  INSURANCE = 'insurance',
}

// ==================== 认证相关类型 ====================

/** 登录请求 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** Token 响应 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/** 修改密码请求 */
export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
}

// ==================== 用户相关类型 ====================

/** 用户信息 */
export interface User {
  id: number;
  username: string;
  name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

/** 创建用户请求 */
export interface UserCreate {
  username: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
}

/** 更新用户请求 */
export interface UserUpdate {
  name?: string;
  phone?: string;
  role?: UserRole;
  is_active?: boolean;
}

// ==================== 仓库相关类型 ====================

/** 仓库信息 */
export interface Warehouse {
  id: number;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

/** 创建仓库请求 */
export interface WarehouseCreate {
  name: string;
  address?: string;
}

/** 更新仓库请求 */
export interface WarehouseUpdate {
  name?: string;
  address?: string;
  is_active?: boolean;
}

// ==================== 考勤相关类型 ====================

/** 考勤记录 */
export interface Attendance {
  id: number;
  user_id: number;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  work_hours: number | null;
  created_at: string;
  user_name?: string;
}

/** 今日打卡状态 */
export interface TodayAttendance {
  has_clocked_in: boolean;
  has_clocked_out: boolean;
  clock_in_time: string | null;
  clock_out_time: string | null;
  work_hours: number | null;
}

// ==================== 计件相关类型 ====================

/** 计件分类 */
export interface PieceWorkCategory {
  id: number;
  name: string;
  unit_price: number;
  unit: string;
  is_active: boolean;
  created_at: string;
}

/** 创建计件分类请求 */
export interface PieceWorkCategoryCreate {
  name: string;
  unit_price: number;
  unit?: string;
}

/** 计件记录 */
export interface PieceWorkRecord {
  id: number;
  user_id: number;
  category_id: number;
  warehouse_id: number | null;
  work_date: string;
  quantity: number;
  amount: number;
  remark: string | null;
  created_at: string;
  user_name?: string;
  category_name?: string;
  warehouse_name?: string;
}

/** 创建计件记录请求 */
export interface PieceWorkRecordCreate {
  category_id: number;
  warehouse_id?: number;
  work_date: string;
  quantity: number;
  remark?: string;
}

/** 更新计件记录请求 */
export interface PieceWorkRecordUpdate {
  quantity?: number;
  remark?: string;
}

/** 计件统计 */
export interface PieceWorkStats {
  total_quantity: number;
  total_amount: number;
  record_count: number;
}

// ==================== 请假相关类型 ====================

/** 请假申请 */
export interface LeaveApplication {
  id: number;
  user_id: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  approver_id: number | null;
  approve_remark: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  approver_name?: string;
}

/** 创建请假申请请求 */
export interface LeaveApplicationCreate {
  leave_type?: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string;
}

/** 审批请假请求 */
export interface LeaveApproveRequest {
  status: LeaveStatus;
  approve_remark?: string;
}

// ==================== 车辆相关类型 ====================

/** 车辆信息 */
export interface Vehicle {
  id: number;
  user_id: number;
  license_plate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  status: VehicleStatus;
  ownership_type: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

/** 创建车辆请求 */
export interface VehicleCreate {
  license_plate: string;
  brand?: string;
  model?: string;
  color?: string;
  ownership_type?: string;
  // 租赁信息
  lessor_name?: string;
  lessor_contact?: string;
  lessee_name?: string;
  lessee_contact?: string;
  monthly_rent?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  rent_payment_day?: number;
}

/** 更新车辆请求 */
export interface VehicleUpdate {
  brand?: string;
  model?: string;
  color?: string;
  ownership_type?: string;
}

/** 车辆租赁信息 */
export interface VehicleLease {
  id: number;
  license_plate: string;
  ownership_type: string | null;
  lessor_name: string | null;
  lessor_contact: string | null;
  lessee_name: string | null;
  lessee_contact: string | null;
  monthly_rent: number | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  rent_payment_day: number | null;
  next_payment_date: string | null;
  days_until_payment: number | null;
  lease_status: string | null;
}

/** 更新车辆租赁信息请求 */
export interface VehicleLeaseUpdate {
  lessor_name?: string;
  lessor_contact?: string;
  lessee_name?: string;
  lessee_contact?: string;
  monthly_rent?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  rent_payment_day?: number;
}

/** 租金提醒信息 */
export interface VehicleLeaseReminder {
  id: number;
  license_plate: string;
  brand: string | null;
  model: string | null;
  user_id: number;
  user_name: string | null;
  lessor_name: string | null;
  monthly_rent: number | null;
  next_payment_date: string | null;
  days_until_payment: number;
}

/** 车辆证件 */
export interface VehicleDocument {
  id: number;
  vehicle_id: number;
  doc_type: DocumentType;
  file_url: string | null;
  expiry_date: string | null;
  created_at: string;
}

// ==================== 通知相关类型 ====================

/** 通知消息 */
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  content: string | null;
  is_read: boolean;
  sender_id: number | null;
  template_id: number | null;
  created_at: string;
}

/** 创建通知请求 */
export interface NotificationCreate {
  user_ids: number[];
  title: string;
  content?: string;
  template_id?: number;
}

/** 使用模板创建通知请求 */
export interface NotificationFromTemplateCreate {
  user_ids: number[];
  template_id: number;
  variables?: Record<string, string>;
}

/** 未读数量响应 */
export interface UnreadCountResponse {
  count: number;
}

// ==================== 通知模板相关类型 ====================

/** 通知模板 */
export interface NotificationTemplate {
  id: number;
  name: string;
  title: string;
  content: string;
  variables: Record<string, string> | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 创建通知模板请求 */
export interface NotificationTemplateCreate {
  name: string;
  title: string;
  content: string;
  variables?: Record<string, string>;
  category?: string;
  is_active?: boolean;
}

/** 更新通知模板请求 */
export interface NotificationTemplateUpdate {
  name?: string;
  title?: string;
  content?: string;
  variables?: Record<string, string>;
  category?: string;
  is_active?: boolean;
}

/** 模板预览响应 */
export interface TemplatePreviewResponse {
  template_id: number;
  template_name: string;
  rendered_title: string;
  rendered_content: string;
  variables_used: Record<string, string>;
}

/** 模板分类 */
export interface TemplateCategory {
  value: string;
  label: string;
}

/** 模板分类列表响应 */
export interface TemplateCategoriesResponse {
  categories: TemplateCategory[];
}

// ==================== 通用类型 ====================

/** 消息响应 */
export interface MessageResponse {
  message: string;
}

/** 分页参数 */
export interface PaginationParams {
  skip?: number;
  limit?: number;
}

// ==================== OCR 相关类型 ====================

/** OCR 驾驶证识别请求 */
export interface OCRDrivingLicenseRequest {
  /** 图片数据（Base64 或 URL） */
  image: string;
}

/** OCR 驾驶证识别结果数据 */
export interface OCRDrivingLicenseData {
  /** 姓名 */
  name: string | null;
  /** 性别 */
  sex: string | null;
  /** 国籍 */
  nationality: string | null;
  /** 住址 */
  address: string | null;
  /** 出生日期 */
  birthday: string | null;
  /** 初次领证日期 */
  issue_date: string | null;
  /** 准驾车型 */
  vehicle_type: string | null;
  /** 证号 */
  license_number: string | null;
  /** 有效期起始 */
  valid_from: string | null;
  /** 有效期截止 */
  valid_to: string | null;
}

/** OCR 驾驶证识别响应 */
export interface OCRDrivingLicenseResponse {
  /** 是否识别成功 */
  success: boolean;
  /** 识别结果数据 */
  data: OCRDrivingLicenseData | null;
  /** 错误信息 */
  error: string | null;
}

/** OCR 服务状态响应 */
export interface OCRStatusResponse {
  /** 是否已配置 */
  configured: boolean;
  /** 服务提供商 */
  provider: string;
}

// ==================== 补录照片相关类型 ====================

/**
 * 补录照片元数据
 * 存储单张补录照片的详细信息
 */
export interface SupplementedPhotoMeta {
  /** 照片字段名，如 "pickup_photos" */
  field: string;
  /** 照片在数组中的索引 */
  index: number;
  /** 补录时间戳（ISO 8601 格式） */
  supplemented_at: string;
  /** 原始照片URL（如果有） */
  original_url: string | null;
  /** 补录次数（累计） */
  supplement_count: number;
}

/**
 * 补录照片元数据字典
 * 键为 "{field}_{index}"，值为补录元数据
 */
export type SupplementedPhotos = Record<string, SupplementedPhotoMeta>;

/**
 * 补录照片请求参数
 */
export interface SupplementPhotoRequest {
  /** 照片字段名 */
  field: string;
  /** 照片在数组中的索引 */
  index: number;
  /** 新照片的URL */
  new_url: string;
}

/**
 * 补录照片响应
 */
export interface SupplementedPhotosResponse {
  /** 车辆ID */
  vehicle_id: number;
  /** 补录照片元数据字典 */
  supplemented_photos: SupplementedPhotos;
}



// ==================== 定时通知相关类型 ====================

/** 定时通知重复类型枚举 */
export enum RepeatType {
  /** 仅执行一次 */
  ONCE = 'once',
  /** 每天重复 */
  DAILY = 'daily',
  /** 每周重复 */
  WEEKLY = 'weekly',
  /** 每月重复 */
  MONTHLY = 'monthly',
}

/** 定时通知状态枚举 */
export enum ScheduledNotificationStatus {
  /** 待执行 */
  PENDING = 'pending',
  /** 执行中（用于重复任务） */
  ACTIVE = 'active',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 已取消 */
  CANCELLED = 'cancelled',
  /** 执行失败 */
  FAILED = 'failed',
}

/** 定时通知信息 */
export interface ScheduledNotification {
  id: number;
  name: string;
  template_id: number | null;
  template_name: string | null;
  title: string | null;
  content: string | null;
  variables: Record<string, string> | null;
  target_user_ids: number[] | null;
  target_roles: string[] | null;
  target_user_count: number;
  scheduled_time: string;
  repeat_type: RepeatType;
  repeat_interval: number;
  repeat_end_date: string | null;
  weekdays: number[] | null;
  monthly_day: number | null;
  status: ScheduledNotificationStatus;
  last_executed_at: string | null;
  next_execute_at: string | null;
  execution_count: number;
  creator_id: number | null;
  creator_name: string | null;
  created_at: string;
  updated_at: string;
}

/** 创建定时通知请求 */
export interface ScheduledNotificationCreate {
  name: string;
  scheduled_time: string;
  template_id?: number;
  title?: string;
  content?: string;
  variables?: Record<string, string>;
  target_user_ids?: number[];
  target_roles?: string[];
  repeat_type?: RepeatType;
  repeat_interval?: number;
  repeat_end_date?: string;
  weekdays?: number[];
  monthly_day?: number;
}

/** 更新定时通知请求 */
export interface ScheduledNotificationUpdate {
  name?: string;
  template_id?: number;
  title?: string;
  content?: string;
  variables?: Record<string, string>;
  target_user_ids?: number[];
  target_roles?: string[];
  scheduled_time?: string;
  repeat_type?: RepeatType;
  repeat_interval?: number;
  repeat_end_date?: string;
  weekdays?: number[];
  monthly_day?: number;
  status?: ScheduledNotificationStatus;
}

/** 调度器状态响应 */
export interface SchedulerStatusResponse {
  is_running: boolean;
  pending_tasks: number;
  active_tasks: number;
  next_execution: string | null;
}


// ==================== 应用版本（热更新）相关类型 ====================

/** 更新类型枚举 */
export enum UpdateType {
  /** 可选更新 */
  OPTIONAL = 'optional',
  /** 推荐更新 */
  RECOMMENDED = 'recommended',
  /** 强制更新 */
  REQUIRED = 'required',
}

/** 应用版本信息 */
export interface AppVersion {
  id: number;
  version: string;
  version_code: number;
  update_type: UpdateType;
  title: string;
  description: string | null;
  download_url: string | null;
  file_size: number | null;
  file_hash: string | null;
  min_version: string | null;
  platform: string;
  is_active: boolean;
  publish_time: string | null;
  created_at: string;
  updated_at: string;
  creator_id: number | null;
  creator_name: string | null;
}

/** 创建应用版本请求 */
export interface AppVersionCreate {
  version: string;
  version_code: number;
  update_type?: UpdateType;
  title: string;
  description?: string;
  download_url?: string;
  file_size?: number;
  file_hash?: string;
  min_version?: string;
  platform?: string;
  is_active?: boolean;
  publish_time?: string;
}

/** 更新应用版本请求 */
export interface AppVersionUpdate {
  version?: string;
  version_code?: number;
  update_type?: UpdateType;
  title?: string;
  description?: string;
  download_url?: string;
  file_size?: number;
  file_hash?: string;
  min_version?: string;
  platform?: string;
  is_active?: boolean;
  publish_time?: string;
}

/** 检查更新请求 */
export interface AppVersionCheckRequest {
  current_version: string;
  current_version_code?: number;
  platform?: string;
}

/** 检查更新响应 */
export interface AppVersionCheckResponse {
  has_update: boolean;
  update_type: string | null;
  latest_version: string | null;
  latest_version_code: number | null;
  title: string | null;
  description: string | null;
  download_url: string | null;
  file_size: number | null;
  file_hash: string | null;
  is_force_update: boolean;
}
