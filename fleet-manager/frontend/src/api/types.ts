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
  /** 老板 - 系统最高权限角色 */
  BOSS = 'boss',
}

/**
 * 角色显示名称映射
 * 注意：SUPER_ADMIN 角色已被移除，BOSS 现在是系统最高权限角色
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.DRIVER]: '司机',
  [UserRole.MANAGER]: '车队长',
  [UserRole.PEER_ADMIN]: '调度',
  [UserRole.BOSS]: '老板',
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
 * 检查是否为管理员角色（PEER_ADMIN、BOSS）
 * 注意：SUPER_ADMIN 角色已被移除，BOSS 现在是系统最高权限角色
 * @param role 用户角色
 * @returns 是否为管理员角色
 */
export function isAdminRole(role: UserRole): boolean {
  return role === UserRole.PEER_ADMIN || role === UserRole.BOSS
}

/**
 * 检查是否具有管理权限（MANAGER、PEER_ADMIN、BOSS）
 * 注意：SUPER_ADMIN 角色已被移除，BOSS 现在是系统最高权限角色
 * @param role 用户角色
 * @returns 是否具有管理权限
 */
export function hasManagementPermission(role: UserRole): boolean {
  return role === UserRole.MANAGER || role === UserRole.PEER_ADMIN || role === UserRole.BOSS
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

/**
 * 仓库类型枚举
 * 定义仓库的计量类型，决定该仓库使用的预设单位
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export enum WarehouseType {
  /** 计件类型 - 预设单位：件 */
  PIECE = 'piece',
  /** 点位类型 - 预设单位：点 */
  POINT = 'point',
  /** 整车类型 - 预设单位：车 */
  WHOLE = 'whole',
  /** 距离类型 - 预设单位：公里 */
  DISTANCE = 'distance',
}

/**
 * 仓库类型显示名称映射
 * 将仓库类型枚举值映射为中文显示名称
 * Requirements: 1.1
 */
export const WAREHOUSE_TYPE_DISPLAY_NAMES: Record<WarehouseType, string> = {
  [WarehouseType.PIECE]: '计件',
  [WarehouseType.POINT]: '点位',
  [WarehouseType.WHOLE]: '整车',
  [WarehouseType.DISTANCE]: '距离',
}

/**
 * 仓库类型预设单位映射
 * 将仓库类型枚举值映射为对应的计量单位
 * Requirements: 1.2, 1.3, 1.4, 1.5
 */
export const WAREHOUSE_TYPE_UNITS: Record<WarehouseType, string> = {
  [WarehouseType.PIECE]: '件',
  [WarehouseType.POINT]: '点',
  [WarehouseType.WHOLE]: '车',
  [WarehouseType.DISTANCE]: '公里',
}

/**
 * 获取仓库类型的显示名称
 * @param warehouseType 仓库类型枚举值或字符串
 * @returns 仓库类型的中文显示名称，如果类型无效则返回 "未知"
 * @example
 * getWarehouseTypeDisplayName(WarehouseType.PIECE) // 返回 "计件"
 * getWarehouseTypeDisplayName('point') // 返回 "点位"
 * Requirements: 1.1
 */
export function getWarehouseTypeDisplayName(warehouseType: WarehouseType | string): string {
  const type = warehouseType as WarehouseType
  return WAREHOUSE_TYPE_DISPLAY_NAMES[type] || '未知'
}

/**
 * 获取仓库类型的预设单位
 * @param warehouseType 仓库类型枚举值或字符串
 * @returns 仓库类型对应的预设单位，如果类型无效则返回默认值 "件"
 * @example
 * getWarehousePresetUnit(WarehouseType.PIECE) // 返回 "件"
 * getWarehousePresetUnit('distance') // 返回 "公里"
 * Requirements: 1.2, 1.3, 1.4, 1.5
 */
export function getWarehousePresetUnit(warehouseType: WarehouseType | string): string {
  const type = warehouseType as WarehouseType
  return WAREHOUSE_TYPE_UNITS[type] || '件'
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
  /** 是否已实名认证 */
  is_verified?: boolean;
  /** 司机类型：pure（纯司机）或 with_vehicle（带车司机） */
  driver_type?: 'pure' | 'with_vehicle';
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
  /** 司机类型：pure（纯司机）或 with_vehicle（带车司机） */
  driver_type?: 'pure' | 'with_vehicle';
}

// ==================== 仓库相关类型 ====================

/**
 * 仓库信息接口
 * 包含仓库的基本信息和类型配置
 * Requirements: 1.1, 7.1
 */
export interface Warehouse {
  /** 仓库ID */
  id: number;
  /** 仓库名称 */
  name: string;
  /** 仓库地址 */
  address: string | null;
  /** 是否启用 */
  is_active: boolean;
  /** 创建时间 */
  created_at: string;
  /** 仓库类型（计件/点位/整车/距离） */
  warehouse_type: WarehouseType;
  /** 预设单位（根据仓库类型自动确定） */
  preset_unit: string;
}

/**
 * 创建仓库请求接口
 * Requirements: 7.1
 */
export interface WarehouseCreate {
  /** 仓库名称 */
  name: string;
  /** 仓库地址（可选） */
  address?: string;
  /** 仓库类型（可选，默认为 piece） */
  warehouse_type?: WarehouseType;
  /** 品类名称 */
  category_name?: string;
  /** 纯司机单价 */
  driver_only_price?: number;
  /** 带车司机单价 */
  with_vehicle_price?: number;
}

/**
 * 更新仓库请求接口
 * Requirements: 7.1
 */
export interface WarehouseUpdate {
  /** 仓库名称 */
  name?: string;
  /** 仓库地址 */
  address?: string;
  /** 是否启用 */
  is_active?: boolean;
  /** 仓库类型 */
  warehouse_type?: WarehouseType;
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
 * 支持纯司机单价、带车司机单价配置
 * Requirements: 3.1 - 支持多种单价配置
 */
export interface PieceWorkCategory {
  id: number;
  name: string;
  /** 关联仓库ID */
  warehouse_id?: number | null;
  /** 基础单价（元/件）- 兼容旧数据 */
  unit_price: number;
  /** 纯司机单价（元/件） */
  driver_only_price: number;
  /** 带车司机单价（元/件） */
  with_vehicle_price: number;
  /** 上楼单价（元/件），可选 */
  upstairs_price?: number | null;
  /** 分拣单价（元/件），可选 */
  sorting_price?: number | null;
  unit: string;
  is_active: boolean;
  created_at: string;
  /** 仓库名称 */
  warehouse_name?: string | null;
}

/** 
 * 创建计件分类请求
 * Requirements: 3.1 - 支持多种单价配置
 */
export interface PieceWorkCategoryCreate {
  name: string;
  /** 关联仓库ID */
  warehouse_id: number;
  /** 纯司机单价（元/件） */
  driver_only_price: number;
  /** 带车司机单价（元/件） */
  with_vehicle_price: number;
  unit?: string;
}

/**
 * 更新计件分类请求
 * Requirements: 3.2 - 支持编辑品类配置
 */
export interface PieceWorkCategoryUpdate {
  name?: string;
  /** 基础单价（元/件）- 兼容旧数据 */
  unit_price?: number;
  /** 纯司机单价（元/件） */
  driver_only_price?: number;
  /** 带车司机单价（元/件） */
  with_vehicle_price?: number;
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

/**
 * 计件统计接口
 * 包含计件工作的汇总统计信息
 * Requirements: 6.1
 */
export interface PieceWorkStats {
  /** 总数量 */
  total_quantity: number;
  /** 总金额 */
  total_amount: number;
  /** 记录数 */
  record_count: number;
  /** 司机数量（可选，某些统计接口返回） */
  driver_count?: number;
  /** 计量单位（根据仓库类型确定） */
  unit?: string;
  /** 仓库类型 */
  warehouse_type?: WarehouseType;
  /** 仓库类型显示名称 */
  warehouse_type_display?: string;
}

/**
 * 司机单仓库计件统计
 * 用于车队长计件统计页面，显示司机在单个仓库的计件数据
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export interface DriverWarehousePieceStats {
  /** 仓库ID */
  warehouseId: number;
  /** 仓库名称 */
  warehouseName: string;
  /** 仓库类型 */
  warehouseType: WarehouseType;
  /** 预设单位（从仓库品类配置中读取） */
  unit: string;
  /** 今日数量 */
  todayQuantity: number;
  /** 本周数量 */
  weekQuantity: number;
  /** 本月数量 */
  monthQuantity: number;
}

/**
 * 司机计件统计映射类型
 * key: 司机ID
 * value: 该司机在各仓库的计件统计数组
 * 
 * 用于车队长计件统计页面，支持多仓库司机显示多行数据
 * Requirements: 3.2, 3.3
 */
export type DriverPieceStatsMap = Map<number, DriverWarehousePieceStats[]>;

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
  /** 申请人所属仓库名称 */
  warehouse_name?: string;
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

/**
 * 驾驶员证件信息响应类型
 * 对应后端 DriverLicenseResponse
 * 包含身份证和驾驶证的完整信息
 * 
 * Requirements: 4.5, 4.6, 4.7 - 司机个人档案页面显示证件信息
 */
export interface DriverLicenseResponse {
  /** 证件记录ID */
  id: number;
  /** 司机用户ID */
  user_id: number;
  
  // ==================== 身份证信息 ====================
  /** 身份证号码（18位） */
  id_card_number?: string | null;
  /** 身份证姓名 */
  id_card_name?: string | null;
  /** 身份证正面照片URL */
  id_card_photo_front?: string | null;
  /** 身份证背面照片URL */
  id_card_photo_back?: string | null;
  /** 部分隐藏的身份证号（如：110***********1234），用于前端显示 */
  id_card_number_masked?: string | null;
  
  // ==================== 驾驶证信息 ====================
  /** 驾驶证号码 */
  license_number?: string | null;
  /** 驾驶证类型（如：C1、B2、A2等） */
  license_class?: string | null;
  /** 驾驶证有效期起始日期 */
  valid_from?: string | null;
  /** 驾驶证有效期截止日期 */
  valid_to?: string | null;
  /** 驾驶证照片URL */
  driving_license_photo?: string | null;
  
  // ==================== 时间戳 ====================
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/**
 * 创建司机证件请求类型
 * 对应后端 DriverLicenseCreate
 * 用于创建新的司机证件记录
 * 
 * 注意：user_id 通过 URL 路径参数传递，不在请求体中
 * 
 * Requirements: 4.5, 4.6, 4.7 - 保存司机证件信息
 */
export interface DriverLicenseCreate {
  // ==================== 身份证信息 ====================
  /** 身份证号码（18位） */
  id_card_number?: string;
  /** 身份证姓名 */
  id_card_name?: string;
  /** 身份证正面照片URL */
  id_card_photo_front?: string;
  /** 身份证背面照片URL */
  id_card_photo_back?: string;
  
  // ==================== 驾驶证信息 ====================
  /** 驾驶证号码 */
  license_number?: string;
  /** 驾驶证类型（如：C1、B2、A2等） */
  license_class?: string;
  /** 驾驶证有效期起始日期 */
  valid_from?: string;
  /** 驾驶证有效期截止日期 */
  valid_to?: string;
  /** 驾驶证照片URL */
  driving_license_photo?: string;
}

/**
 * 更新司机证件请求类型
 * 对应后端 DriverLicenseUpdate
 * 所有字段可选，只更新提供的字段
 * 
 * Requirements: 4.5, 4.6, 4.7 - 更新司机证件信息
 */
export interface DriverLicenseUpdate {
  // ==================== 身份证信息 ====================
  /** 身份证号码（18位） */
  id_card_number?: string;
  /** 身份证姓名 */
  id_card_name?: string;
  /** 身份证正面照片URL */
  id_card_photo_front?: string;
  /** 身份证背面照片URL */
  id_card_photo_back?: string;
  
  // ==================== 驾驶证信息 ====================
  /** 驾驶证号码 */
  license_number?: string;
  /** 驾驶证类型（如：C1、B2、A2等） */
  license_class?: string;
  /** 驾驶证有效期起始日期 */
  valid_from?: string;
  /** 驾驶证有效期截止日期 */
  valid_to?: string;
  /** 驾驶证照片URL */
  driving_license_photo?: string;
}

/**
 * 驾驶员证件信息（兼容旧版本）
 * @deprecated 请使用 DriverLicenseResponse 代替
 */
export interface DriverLicense extends DriverLicenseResponse {}

/**
 * 创建/更新驾驶员证件请求（兼容旧版本）
 * @deprecated 请使用 DriverLicenseCreate 或 DriverLicenseUpdate 代替
 */
export interface DriverLicenseInput extends DriverLicenseCreate {
  /** 司机用户ID（兼容旧版本，新版本通过 URL 路径参数传递） */
  driver_id?: number;
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

