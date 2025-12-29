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
  /** 已提车 */
  PICKED_UP = 'picked_up',
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
  /** 所属仓库ID */
  warehouse_id?: number | null;
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
  /** 所属仓库ID */
  warehouse_id?: number | null;
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
  warehouse_id?: number | null;
  warehouse_name?: string;
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
  warehouse_id?: number | null;
}

/**
 * 考勤规则接口
 * 定义仓库的考勤规则配置
 * @requirements 9.4 - 显示考勤规则
 */
export interface AttendanceRule {
  /** 规则 ID */
  id: number;
  /** 仓库 ID */
  warehouse_id: number;
  /** 上班时间 (HH:mm 格式) */
  work_start_time: string;
  /** 下班时间 (HH:mm 格式) */
  work_end_time: string;
  /** 迟到阈值（分钟） */
  late_threshold: number;
  /** 早退阈值（分钟） */
  early_threshold: number;
  /** 是否需要打下班卡 */
  require_clock_out: boolean;
}

/**
 * 请假状态检查结果
 * @requirements 9.8 - 请假中禁用打卡
 */
export interface LeaveCheckResult {
  /** 是否在请假中 */
  onLeave: boolean;
  /** 请假类型（如果在请假中） */
  leaveType?: string;
  /** 请假开始日期 */
  startDate?: string;
  /** 请假结束日期 */
  endDate?: string;
}

// ==================== 计件相关类型 ====================

/** 
 * 计件分类
 * 支持基础单价、上楼单价、分拣单价配置
 * Requirements: 3.1 - 支持多种单价配置
 */
export interface PieceWorkCategory {
  id: number;
  name: string;
  /** 基础单价（元/件） */
  unit_price: number;
  /** 上楼单价（元/件），可选 */
  upstairs_price?: number | null;
  /** 分拣单价（元/件），可选 */
  sorting_price?: number | null;
  unit: string;
  is_active: boolean;
  created_at: string;
}

/** 
 * 创建计件分类请求
 * Requirements: 3.1 - 支持多种单价配置
 */
export interface PieceWorkCategoryCreate {
  name: string;
  /** 基础单价（元/件） */
  unit_price: number;
  /** 上楼单价（元/件），可选 */
  upstairs_price?: number;
  /** 分拣单价（元/件），可选 */
  sorting_price?: number;
  unit?: string;
}

/**
 * 更新计件分类请求
 * Requirements: 3.2 - 支持编辑品类配置
 */
export interface PieceWorkCategoryUpdate {
  name?: string;
  /** 基础单价（元/件） */
  unit_price?: number;
  /** 上楼单价（元/件） */
  upstairs_price?: number;
  /** 分拣单价（元/件） */
  sorting_price?: number;
  unit?: string;
  is_active?: boolean;
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
  /** 单价 */
  unit_price?: number;
  /** 是否需要上楼 */
  need_upstairs?: boolean;
  /** 上楼单价 */
  upstairs_price?: number;
  /** 上楼金额 */
  upstairs_amount?: number;
  /** 是否需要分拣 */
  need_sorting?: boolean;
  /** 分拣件数 */
  sorting_quantity?: number;
  /** 分拣单价 */
  sorting_unit_price?: number;
  /** 分拣金额 */
  sorting_amount?: number;
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
  /** 单价 */
  unit_price?: number;
  /** 是否需要上楼 */
  need_upstairs?: boolean;
  /** 上楼单价 */
  upstairs_price?: number;
  /** 是否需要分拣 */
  need_sorting?: boolean;
  /** 分拣件数 */
  sorting_quantity?: number;
  /** 分拣单价 */
  sorting_unit_price?: number;
  /** 金额 */
  amount?: number;
}

/** 计件统计 */
export interface PieceWorkStats {
  total_quantity: number;
  total_amount: number;
  record_count: number;
  /** 司机数量（可选，某些统计接口返回） */
  driver_count?: number;
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
  /** 车辆类型 */
  vehicle_type?: string | null;
  /** VIN 车架号 */
  vin?: string | null;
  /** 发动机号码 */
  engine_number?: string | null;
  /** 所有人 */
  owner_name?: string | null;
  /** 使用性质 */
  use_character?: string | null;
  /** 注册日期 */
  register_date?: string | null;
  /** 发证日期 */
  issue_date?: string | null;
  /** 档案编号 */
  archive_number?: string | null;
  /** 总质量 */
  total_mass?: string | null;
  /** 核定载客 */
  approved_passengers?: string | null;
  /** 整备质量 */
  curb_weight?: string | null;
  /** 核定载质量 */
  approved_load?: string | null;
  /** 外廓尺寸-长 */
  overall_dimension_length?: string | null;
  /** 外廓尺寸-宽 */
  overall_dimension_width?: string | null;
  /** 外廓尺寸-高 */
  overall_dimension_height?: string | null;
  /** 检验有效期至 */
  inspection_valid_until?: string | null;
  /** 检验日期 */
  inspection_date?: string | null;
  /** 强制报废日期 */
  mandatory_scrap_date?: string | null;
  
  // ==================== 车辆照片（7个角度） ====================
  /** 左前45°照片 */
  left_front_photo?: string | null;
  /** 右前45°照片 */
  right_front_photo?: string | null;
  /** 左后45°照片 */
  left_rear_photo?: string | null;
  /** 右后45°照片 */
  right_rear_photo?: string | null;
  /** 仪表盘照片 */
  dashboard_photo?: string | null;
  /** 后门照片 */
  rear_door_photo?: string | null;
  /** 货箱照片 */
  cargo_box_photo?: string | null;
  
  // ==================== 行驶证照片（3张） ====================
  /** 行驶证主页照片 */
  driving_license_main_photo?: string | null;
  /** 行驶证副页照片 */
  driving_license_sub_photo?: string | null;
  /** 行驶证副页背页照片 */
  driving_license_sub_back_photo?: string | null;
  
  // ==================== 提车/还车照片 ====================
  /** 提车照片数组 */
  pickup_photos?: string[] | null;
  /** 还车照片数组 */
  return_photos?: string[] | null;
  /** 行驶证照片数组 */
  registration_photos?: string[] | null;
  /** 车损照片数组 */
  damage_photos?: string[] | null;
  
  // ==================== 时间和状态 ====================
  /** 提车时间 */
  pickup_time?: string | null;
  /** 还车时间 */
  return_time?: string | null;
  /** 审核状态 */
  review_status?: 'drafting' | 'pending_review' | 'need_supplement' | 'approved';
  /** 仓库ID */
  warehouse_id?: number | null;
  /** 仓库名称 */
  warehouse_name?: string | null;
}

/** 创建车辆请求 */
export interface VehicleCreate {
  license_plate: string;
  brand?: string;
  model?: string;
  color?: string;
  ownership_type?: string;
  /** 车辆类型 */
  vehicle_type?: string;
  /** VIN 车架号 */
  vin?: string;
  /** 发动机号码 */
  engine_number?: string;
  /** 所有人 */
  owner_name?: string;
  /** 使用性质 */
  use_character?: string;
  /** 注册日期 */
  register_date?: string;
  /** 发证日期 */
  issue_date?: string;
  /** 档案编号 */
  archive_number?: string;
  /** 总质量 */
  total_mass?: string;
  /** 核定载客 */
  approved_passengers?: string;
  /** 整备质量 */
  curb_weight?: string;
  /** 核定载质量 */
  approved_load?: string;
  /** 外廓尺寸-长 */
  overall_dimension_length?: string;
  /** 外廓尺寸-宽 */
  overall_dimension_width?: string;
  /** 外廓尺寸-高 */
  overall_dimension_height?: string;
  /** 检验有效期至 */
  inspection_valid_until?: string;
  /** 检验日期 */
  inspection_date?: string;
  /** 强制报废日期 */
  mandatory_scrap_date?: string;
  
  // ==================== 车辆照片（7个角度） ====================
  /** 左前45°照片 */
  left_front_photo?: string;
  /** 右前45°照片 */
  right_front_photo?: string;
  /** 左后45°照片 */
  left_rear_photo?: string;
  /** 右后45°照片 */
  right_rear_photo?: string;
  /** 仪表盘照片 */
  dashboard_photo?: string;
  /** 后门照片 */
  rear_door_photo?: string;
  /** 货箱照片 */
  cargo_box_photo?: string;
  
  // ==================== 行驶证照片（3张） ====================
  /** 行驶证主页照片 */
  driving_license_main_photo?: string;
  /** 行驶证副页照片 */
  driving_license_sub_photo?: string;
  /** 行驶证副页背页照片 */
  driving_license_sub_back_photo?: string;
  
  // ==================== 提车照片 ====================
  /** 提车照片数组 */
  pickup_photos?: string[];
  /** 行驶证照片数组 */
  registration_photos?: string[];
  /** 车损照片数组 */
  damage_photos?: string[];
  
  // ==================== 状态 ====================
  /** 车辆状态 */
  status?: string;
  /** 提车时间 */
  pickup_time?: string;
  /** 审核状态 */
  review_status?: 'drafting' | 'pending_review' | 'need_supplement' | 'approved';
  /** 仓库ID */
  warehouse_id?: number;
  /** 分配给的司机ID */
  assigned_user_id?: number;
  
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

// ==================== 驾驶员证件相关类型 ====================

/** 驾驶员证件信息 */
export interface DriverLicense {
  id: number;
  /** 司机用户ID */
  driver_id: number;
  /** 驾驶证号 */
  license_number: string;
  /** 身份证号码 */
  id_card_number?: string | null;
  /** 身份证姓名 */
  id_card_name?: string | null;
  /** 身份证地址 */
  id_card_address?: string | null;
  /** 身份证出生日期 */
  id_card_birth_date?: string | null;
  /** 身份证正面照片 */
  id_card_photo_front?: string | null;
  /** 身份证背面照片 */
  id_card_photo_back?: string | null;
  /** 准驾车型 */
  license_class?: string | null;
  /** 初次领证日期 */
  first_issue_date?: string | null;
  /** 有效期起始 */
  valid_from?: string | null;
  /** 有效期截止 */
  valid_to?: string | null;
  /** 发证机关 */
  issue_authority?: string | null;
  /** 驾驶证照片 */
  driving_license_photo?: string | null;
  /** 状态 */
  status: string;
  created_at: string;
  updated_at: string;
}

/** 创建/更新驾驶员证件请求 */
export interface DriverLicenseInput {
  /** 司机用户ID */
  driver_id: number;
  /** 驾驶证号 */
  license_number: string;
  /** 身份证号码 */
  id_card_number?: string;
  /** 身份证姓名 */
  id_card_name?: string;
  /** 身份证地址 */
  id_card_address?: string;
  /** 身份证出生日期 */
  id_card_birth_date?: string;
  /** 身份证正面照片 */
  id_card_photo_front?: string;
  /** 身份证背面照片 */
  id_card_photo_back?: string;
  /** 准驾车型 */
  license_class?: string;
  /** 初次领证日期 */
  first_issue_date?: string;
  /** 有效期起始 */
  valid_from?: string;
  /** 有效期截止 */
  valid_to?: string;
  /** 发证机关 */
  issue_authority?: string;
  /** 驾驶证照片 */
  driving_license_photo?: string;
  /** 状态 */
  status?: string;
}

// ==================== 还车相关类型 ====================

/** 还车请求 */
export interface VehicleReturnRequest {
  /** 车辆ID */
  vehicle_id: number;
  /** 还车照片数组（7张车辆照片） */
  return_photos: string[];
  /** 车损照片数组（可选） */
  damage_photos?: string[];
}

/** 还车响应 */
export interface VehicleReturnResponse {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 更新后的车辆信息 */
  vehicle?: Vehicle;
}

// ==================== 车辆分配相关类型 ====================

/** 车辆分配请求 */
export interface VehicleAssignRequest {
  /** 车辆ID */
  vehicle_id: number;
  /** 分配给的司机ID */
  user_id: number;
  /** 仓库ID */
  warehouse_id?: number;
}

/** 车辆分配响应 */
export interface VehicleAssignResponse {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 更新后的车辆信息 */
  vehicle?: Vehicle;
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


// ==================== 车辆历史相关类型 ====================

/** 车辆历史操作类型枚举 */
export enum VehicleHistoryActionType {
  /** 提车 */
  PICKUP = 'pickup',
  /** 还车 */
  RETURN = 'return',
}

/** 车辆历史照片（7张基本照片） */
export interface VehicleHistoryPhotos {
  /** 左前45°照片 */
  left_front: string | null;
  /** 右前45°照片 */
  right_front: string | null;
  /** 左后45°照片 */
  left_rear: string | null;
  /** 右后45°照片 */
  right_rear: string | null;
  /** 仪表盘照片 */
  dashboard: string | null;
  /** 后门照片 */
  rear_door: string | null;
  /** 货箱照片 */
  cargo_box: string | null;
}

/** 车辆历史记录 */
export interface VehicleHistory {
  /** 记录ID */
  id: number;
  /** 车辆ID */
  vehicle_id: number;
  /** 司机ID */
  user_id: number;
  /** 司机姓名 */
  user_name: string | null;
  /** 操作类型 */
  action_type: VehicleHistoryActionType;
  /** 操作时间 */
  action_time: string;
  /** 7张基本照片 */
  photos: VehicleHistoryPhotos | null;
  /** 车损照片数组 */
  damage_photos: string[] | null;
  /** 备注 */
  remark: string | null;
}

/** 车辆历史列表响应 */
export interface VehicleHistoryListResponse {
  /** 总记录数 */
  total: number;
  /** 历史记录列表 */
  items: VehicleHistory[];
}


// ==================== 权限配置相关类型 ====================

/** 权限项 */
export interface PermissionItem {
  /** 权限键 */
  key: string;
  /** 权限名称 */
  name: string;
  /** 权限描述 */
  description: string;
  /** 权限分组 */
  group: string;
}

/** 权限分组 */
export interface PermissionGroup {
  /** 分组键 */
  key: string;
  /** 分组名称 */
  name: string;
  /** 分组图标 */
  icon: string;
  /** 权限列表 */
  permissions: PermissionItem[];
}

/** 角色权限配置 */
export interface RolePermission {
  /** 用户角色 */
  role: UserRole;
  /** 权限键列表 */
  permissions: string[];
  /** 更新时间 */
  updated_at?: string;
}

/** 更新角色权限请求 */
export interface RolePermissionUpdate {
  /** 权限键列表 */
  permissions: string[];
}

/** 所有权限响应 */
export interface AllPermissionsResponse {
  /** 权限分组列表 */
  groups: PermissionGroup[];
  /** 各角色的权限配置 */
  role_permissions: Record<string, string[]>;
}
