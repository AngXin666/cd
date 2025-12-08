import type {NotificationType} from '@/db/notificationApi'

// 重新导出 NotificationType 以便其他模块使用
export type {NotificationType}

// ==================== 用户相关类型 ====================

/**
 * 系统角色类型
 * - BOSS: 老板，系统最高权限
 * - PEER_ADMIN: 调度，由老板授权，可设置 full_control(与老板相同权限) 或 view_only(仅查看)
 * - MANAGER: 车队长，管理被分配的仓库及其司机，每个仓库可设置不同权限等级
 * - DRIVER: 司机，只能管理自己的数据
 */
export type UserRole = 'BOSS' | 'PEER_ADMIN' | 'MANAGER' | 'DRIVER'

// 用户信息接口
export interface User {
  id: string
  phone: string | null
  email: string | null
  name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// 用户角色关联接口
export interface UserRoleAssignment {
  id: string
  user_id: string
  role: UserRole
  created_at: string
}

// 用户更新接口
export interface UserUpdate {
  name?: string
  phone?: string
  email?: string
  avatar_url?: string
}

// 用户与角色组合接口（推荐使用）
export interface UserWithRole {
  id: string
  phone: string | null
  email: string | null
  name: string
  role: UserRole | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// 兼容旧代码的 Profile 接口（映射到 UserWithRole）
// @deprecated 请使用 UserWithRole 替代
export interface Profile {
  id: string
  phone: string | null
  email: string | null
  name: string
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
  // 兼容旧代码的可选字段
  driver_type?: string | null
  nickname?: string | null
  join_date?: string | null
  company_name?: string | null
  lease_start_date?: string | null
  lease_end_date?: string | null
  monthly_fee?: number | null
  notes?: string | null
  main_account_id?: string | null
  is_active?: boolean
  vehicle_plate?: string | null
  manager_permissions_enabled?: boolean
  address_province?: string | null
  address_city?: string | null
  address_district?: string | null
  address_detail?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relationship?: string | null
  login_account?: string | null
  status?: string | null
  peer_account_permission?: boolean | null
}

export interface ProfileUpdate {
  name?: string
  phone?: string
  email?: string
  avatar_url?: string
  role?: UserRole
  permission_type?: string
  vehicle_plate?: string
  warehouse_ids?: string[]
  status?: string
  driver_type?: string
  nickname?: string
  login_account?: string
  join_date?: string
  address_province?: string
  address_city?: string
  address_district?: string
  address_detail?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
}

// ==================== 部门相关类型 ====================

// 部门接口
export interface Department {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  created_at: string
  updated_at: string
}

// 创建部门的输入接口
export interface DepartmentInput {
  name: string
  description?: string
  manager_id?: string
}

// 更新部门的输入接口
export interface DepartmentUpdate {
  name?: string
  description?: string
  manager_id?: string
}

// 用户部门关联接口
export interface UserDepartment {
  id: string
  user_id: string
  department_id: string
  created_at: string
}

// ==================== 仓库相关类型 ====================

// 仓库接口
export interface Warehouse {
  id: string
  name: string
  address: string | null
  contact_person: string | null
  contact_phone: string | null
  created_at: string
  updated_at: string
  // 兼容旧代码的可选字段
  is_active?: boolean
  max_leave_days?: number | null
  resignation_notice_days?: number | null
  daily_target?: number | null
}

// 创建仓库的输入接口
export interface WarehouseInput {
  name: string
  address?: string
  contact_person?: string
  contact_phone?: string
  is_active?: boolean
}

// 更新仓库的输入接口
export interface WarehouseUpdate {
  name?: string
  address?: string
  contact_person?: string
  contact_phone?: string
  is_active?: boolean
  max_leave_days?: number | null
  resignation_notice_days?: number | null
  daily_target?: number | null
}

// 权限等级类型
// - full_control: 完整控制权，可增删改查
// - view_only: 仅查看权，只能查看不能修改
// 
// 适用于：
// - PEER_ADMIN (调度): 由老板授权，full_control=与老板相同权限, view_only=仅查看所有数据
// - MANAGER (车队长): 在仓库分配时设置，full_control=可管理该仓库, view_only=只能查看该仓库
export type PermissionLevel = 'full_control' | 'view_only'

// 仓库分配接口
export interface WarehouseAssignment {
  id: string
  warehouse_id: string
  user_id: string
  assigned_by: string | null
  permission_level: PermissionLevel | null  // 权限等级：full_control(完整控制) 或 view_only(仅查看)
  created_at: string
}

// 创建仓库分配的输入接口
export interface WarehouseAssignmentInput {
  warehouse_id: string
  user_id: string
  assigned_by?: string
  permission_level?: PermissionLevel  // 权限等级：full_control(完整控制) 或 view_only(仅查看)
}

// ==================== 车辆相关类型 ====================

// 车辆所有权类型
export type OwnershipType = 'company' | 'personal'

// 车辆核心信息接口（对应vehicles表）
export interface Vehicle {
  id: string
  brand: string | null
  model: string | null
  color: string | null
  vin: string | null
  owner_id: string | null
  current_driver_id: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  user_id: string | null
  warehouse_id: string | null
  plate_number: string
  driver_id: string | null
  vehicle_type: string | null
  purchase_date: string | null
  status: string
  review_status: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  ownership_type: string | null
}

// 车辆扩展信息接口（对应vehicle_documents表）
export interface VehicleDocument {
  id: string
  vehicle_id: string
  // 行驶证信息
  owner_name: string | null
  use_character: string | null
  register_date: string | null
  issue_date: string | null
  engine_number: string | null
  archive_number: string | null
  total_mass: number | null
  approved_passengers: number | null
  curb_weight: number | null
  approved_load: number | null
  overall_dimension_length: number | null
  overall_dimension_width: number | null
  overall_dimension_height: number | null
  inspection_valid_until: string | null
  inspection_date: string | null
  mandatory_scrap_date: string | null
  driving_license_main_photo: string | null
  driving_license_sub_photo: string | null
  driving_license_back_photo: string | null
  driving_license_sub_back_photo: string | null
  // 车辆照片
  left_front_photo: string | null
  right_front_photo: string | null
  left_rear_photo: string | null
  right_rear_photo: string | null
  dashboard_photo: string | null
  rear_door_photo: string | null
  cargo_box_photo: string | null
  // 租赁信息
  lessor_name: string | null
  lessor_contact: string | null
  lessee_name: string | null
  lessee_contact: string | null
  monthly_rent: number | null
  lease_start_date: string | null
  lease_end_date: string | null
  rent_payment_day: number | null
  // 审核和其他信息
  review_notes: string | null
  locked_photos: Record<string, unknown> | null
  required_photos: string[] | null
  damage_photos: string[] | null
  pickup_photos: string[] | null
  pickup_time: string | null
  registration_photos: string[] | null
  return_photos: string[] | null
  return_time: string | null
  created_at: string
  updated_at: string
}

// 车辆完整信息接口（包含核心信息和扩展信息）
export interface VehicleWithDocuments extends Vehicle {
  document?: VehicleDocument | null
}

// 创建车辆核心信息的输入接口
export interface VehicleInput {
  plate_number: string
  brand?: string
  model?: string
  color?: string
  vin?: string
  owner_id?: string
  current_driver_id?: string
  driver_id?: string
  user_id?: string
  warehouse_id?: string
  vehicle_type?: string
  purchase_date?: string
  status?: string
  review_status?: string
  ownership_type?: string
  is_active?: boolean
  notes?: string
}

// 创建车辆扩展信息的输入接口
export interface VehicleDocumentInput {
  vehicle_id: string
  // 行驶证信息
  owner_name?: string
  use_character?: string
  register_date?: string
  issue_date?: string
  engine_number?: string
  archive_number?: string
  total_mass?: number
  approved_passengers?: number
  curb_weight?: number
  approved_load?: number
  overall_dimension_length?: number
  overall_dimension_width?: number
  overall_dimension_height?: number
  inspection_valid_until?: string
  inspection_date?: string
  mandatory_scrap_date?: string
  driving_license_main_photo?: string
  driving_license_sub_photo?: string
  driving_license_back_photo?: string
  driving_license_sub_back_photo?: string
  // 车辆照片
  left_front_photo?: string
  right_front_photo?: string
  left_rear_photo?: string
  right_rear_photo?: string
  dashboard_photo?: string
  rear_door_photo?: string
  cargo_box_photo?: string
  // 租赁信息
  lessor_name?: string
  lessor_contact?: string
  lessee_name?: string
  lessee_contact?: string
  monthly_rent?: number
  lease_start_date?: string
  lease_end_date?: string
  rent_payment_day?: number
  // 审核和其他信息
  review_notes?: string
  locked_photos?: Record<string, unknown>
  required_photos?: string[]
  damage_photos?: string[]
  pickup_photos?: string[]
  pickup_time?: string
  registration_photos?: string[]
  return_photos?: string[]
  return_time?: string
}

// 更新车辆核心信息的输入接口
export interface VehicleUpdate {
  plate_number?: string
  brand?: string
  model?: string
  color?: string
  vin?: string
  owner_id?: string
  current_driver_id?: string
  driver_id?: string
  user_id?: string
  warehouse_id?: string
  vehicle_type?: string
  purchase_date?: string
  status?: string
  review_status?: string
  ownership_type?: string
  is_active?: boolean
  notes?: string
  reviewed_at?: string
  reviewed_by?: string
}

// 更新车辆扩展信息的输入接口
export interface VehicleDocumentUpdate {
  // 行驶证信息
  owner_name?: string
  use_character?: string
  register_date?: string
  issue_date?: string
  engine_number?: string
  archive_number?: string
  total_mass?: number
  approved_passengers?: number
  curb_weight?: number
  approved_load?: number
  overall_dimension_length?: number
  overall_dimension_width?: number
  overall_dimension_height?: number
  inspection_valid_until?: string
  inspection_date?: string
  mandatory_scrap_date?: string
  driving_license_main_photo?: string
  driving_license_sub_photo?: string
  driving_license_back_photo?: string
  driving_license_sub_back_photo?: string
  // 车辆照片
  left_front_photo?: string
  right_front_photo?: string
  left_rear_photo?: string
  right_rear_photo?: string
  dashboard_photo?: string
  rear_door_photo?: string
  cargo_box_photo?: string
  // 租赁信息
  lessor_name?: string
  lessor_contact?: string
  lessee_name?: string
  lessee_contact?: string
  monthly_rent?: number
  lease_start_date?: string
  lease_end_date?: string
  rent_payment_day?: number
  // 审核和其他信息
  review_notes?: string
  locked_photos?: Record<string, unknown>
  required_photos?: string[]
  damage_photos?: string[]
  pickup_photos?: string[]
  pickup_time?: string
  registration_photos?: string[]
  return_photos?: string[]
  return_time?: string
}

// ==================== 车辆基本信息和记录相关类型 ====================

// 车辆基本信息接口（vehicles_base 表）
export interface VehicleBase {
  id: string
  plate_number: string
  brand: string
  model: string
  color?: string | null
  vin?: string | null
  vehicle_type?: string | null
  owner_name?: string | null
  use_character?: string | null
  register_date?: string | null
  engine_number?: string | null
  ownership_type?: string | null
  lessor_name?: string | null
  lessor_contact?: string | null
  lessee_name?: string | null
  lessee_contact?: string | null
  monthly_rent?: number | null
  lease_start_date?: string | null
  lease_end_date?: string | null
  rent_payment_day?: number | null
  created_at: string
  updated_at: string
}

// 车辆租赁信息接口（vehicle_lease_info 视图）
export interface VehicleLeaseInfo extends VehicleBase {
  next_payment_date?: string | null
  days_until_payment?: number | null
  lease_status?: string | null
}

// 车辆记录接口（vehicle_records 表）
export interface VehicleRecord {
  id: string
  vehicle_id: string
  driver_id: string
  record_type: string
  start_date: string
  end_date?: string | null
  rental_fee?: number | null
  deposit?: number | null
  status: string
  pickup_photos?: string[] | null
  return_photos?: string[] | null
  registration_photos?: string[] | null
  damage_photos?: string[] | null
  locked_photos?: Record<string, unknown> | null
  notes?: string | null
  created_at: string
  updated_at: string
}

// 车辆记录输入接口
export interface VehicleRecordInput {
  vehicle_id: string
  driver_id: string
  record_type: string
  start_date: string
  end_date?: string
  rental_fee?: number
  deposit?: number
  status?: string
  pickup_photos?: string[]
  return_photos?: string[]
  registration_photos?: string[]
  damage_photos?: string[]
  locked_photos?: Record<string, unknown>
  notes?: string
  // 车辆基本信息
  plate_number: string
  brand?: string
  model?: string
  color?: string
  vin?: string
  vehicle_type?: string
  owner_name?: string
  use_character?: string
  register_date?: string
  engine_number?: string
  // 仓库信息
  warehouse_id?: string
  // 行驶证信息
  issue_date?: string
  archive_number?: string
  total_mass?: string
  approved_passengers?: string
  curb_weight?: string
  approved_load?: string
  overall_dimension_length?: string
  overall_dimension_width?: string
  overall_dimension_height?: string
  inspection_valid_until?: string
  inspection_date?: string
  mandatory_scrap_date?: string
  // 车辆照片
  left_front_photo?: string
  right_front_photo?: string
  left_rear_photo?: string
  right_rear_photo?: string
  dashboard_photo?: string
  rear_door_photo?: string
  cargo_box_photo?: string
  // 行驶证照片
  driving_license_main_photo?: string
  driving_license_sub_photo?: string
  driving_license_sub_back_photo?: string
  // 驾驶证信息
  driver_name?: string
  license_number?: string
  license_class?: string
  first_issue_date?: string
  license_valid_from?: string
  license_valid_until?: string
  id_card_number?: string
  // 审核管理
  review_status?: string
  required_photos?: string[]
  review_notes?: string
  // 时间字段
  pickup_time?: string
  return_time?: string
  recorded_at?: string
}

// 车辆基本信息带记录接口
export interface VehicleBaseWithRecords extends VehicleBase {
  records?: VehicleRecord[]
}

// 车辆记录带详细信息接口
export interface VehicleRecordWithDetails extends VehicleRecord {
  vehicle?: VehicleBase
  driver?: Profile
}

// ==================== 考勤相关类型 ====================

// 考勤状态类型
export type AttendanceStatus = 'normal' | 'late' | 'early' | 'absent'

// 考勤记录接口
export interface AttendanceRecord {
  id: string
  user_id: string
  date: string
  clock_in_time: string | null
  clock_out_time: string | null
  warehouse_id: string | null
  status: AttendanceStatus
  notes: string | null
  created_at: string
  work_date?: string
  work_hours?: number | null
}

// 创建考勤记录的输入接口
export interface AttendanceRecordInput {
  user_id: string
  work_date: string
  clock_in_time: string
  warehouse_id?: string
  status?: AttendanceStatus
  notes?: string
}

// 更新考勤记录的输入接口
export interface AttendanceRecordUpdate {
  clock_out_time?: string
  status?: AttendanceStatus
  notes?: string
  work_hours?: number
}

// ==================== 请假相关类型 ====================

// 请假类型
export type LeaveType = 'sick' | 'personal' | 'annual' | 'other'

// 请假状态
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

// 请假申请接口
export interface LeaveRequest {
  id: string
  user_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason: string | null
  status: LeaveStatus
  approver_id: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  review_notes?: string | null
  warehouse_id?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
}

// 创建请假申请的输入接口
export interface LeaveRequestInput {
  user_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason?: string
  warehouse_id?: string
}

// 更新请假申请的输入接口
export interface LeaveRequestUpdate {
  status?: LeaveStatus
  approver_id?: string
  approved_at?: string
}

// ==================== 计件相关类型 ====================

// 计件记录接口
export interface PieceworkRecord {
  id: string
  user_id: string
  date: string
  warehouse_id: string | null
  category: string
  quantity: number
  unit_price: number | null
  total_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
  category_id?: string
  need_upstairs?: boolean
  upstairs_price?: number | null
  work_date?: string
  need_sorting?: boolean
  sorting_quantity?: number | null
  sorting_unit_price?: number | null
}

// 创建计件记录的输入接口
export interface PieceworkRecordInput {
  user_id: string
  warehouse_id: string
  work_date: string
  category_id?: string
  quantity: number
  unit_price: number
  total_amount: number
  need_upstairs?: boolean
  upstairs_price?: number
  need_sorting?: boolean
  sorting_quantity?: number
  sorting_unit_price?: number
  notes?: string
}

// 更新计件记录的输入接口
export interface PieceworkRecordUpdate {
  category_id?: string
  quantity?: number
  unit_price?: number
  total_amount?: number
  need_upstairs?: boolean
  upstairs_price?: number
  need_sorting?: boolean
  sorting_quantity?: number
  sorting_unit_price?: number
  notes?: string
}

// ==================== 通知相关类型 ====================

// 通知接口
export interface Notification {
  id: string
  title: string
  content: string
  type: NotificationType
  sender_id: string | null
  recipient_id: string
  is_read: boolean
  created_at: string
  related_id?: string | null // 关联的业务记录ID（如请假申请ID）
  approval_status?: 'pending' | 'approved' | 'rejected' | null // 审批状态
  updated_at?: string | null // 更新时间
  batch_id?: string | null // 批次ID，同一批次的通知共享此ID
  parent_notification_id?: string | null // 父通知ID，用于关联审批结果通知与原始申请通知
}

// 创建通知的输入接口
export interface NotificationInput {
  title: string
  content: string
  type?: NotificationType
  sender_id?: string
  recipient_id: string
  related_id?: string | null // 关联的业务记录ID
  approval_status?: 'pending' | 'approved' | 'rejected' | null // 审批状态
  batch_id?: string | null // 批次ID
  parent_notification_id?: string | null // 父通知ID
}

// 更新通知的输入接口
export interface NotificationUpdate {
  is_read?: boolean
  approval_status?: 'pending' | 'approved' | 'rejected' | null
  content?: string
  title?: string
}

// ==================== 兼容旧代码的类型别名 ====================

// 计件记录别名（兼容旧代码）
export type PieceWorkRecord = PieceworkRecord
export type PieceWorkRecordInput = PieceworkRecordInput
export type PieceWorkRecordUpdate = PieceworkRecordUpdate

// 请假申请别名（兼容旧代码）
export type LeaveApplication = LeaveRequest
export type LeaveApplicationInput = LeaveRequestInput

// ==================== 计件分类和价格 ====================

// 计件分类接口
export interface PieceWorkCategory {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  category_name?: string
  is_active?: boolean
}

// 创建计件分类的输入接口
export interface PieceWorkCategoryInput {
  name: string
  unit?: string
  description?: string
  is_active?: boolean
}

// 计件分类价格接口
export interface CategoryPrice {
  id: string
  category_id: string
  warehouse_id: string | null
  price: number // 数据库实际字段
  driver_type?: string
  effective_date: string
  created_at: string
  updated_at?: string
  // 兼容旧代码的字段
  unit_price?: number
  category_name?: string
  upstairs_price?: number | null
  sorting_unit_price?: number | null
  driver_only_price?: number | null
  driver_with_vehicle_price?: number | null
}

// 创建计件分类价格的输入接口
export interface CategoryPriceInput {
  category_id: string
  warehouse_id: string
  price: number
  driver_type?: string
  effective_date?: string
}

// 计件统计接口
export interface PieceWorkStats {
  user_id?: string
  user_name?: string
  total_quantity: number
  total_amount: number
  record_count?: number
  total_orders?: number
  by_category?: Array<{category_id: string; category_name: string; quantity: number; amount: number}>
}

// ==================== 仓库规则（已废弃 - 多租户相关）====================

// 仓库规则接口（保留用于兼容性）
export interface WarehouseWithRule extends Warehouse {
  rule?: any // 规则已废弃，保留字段用于兼容
  resignation_notice_days?: number
}

// ==================== 考勤规则（已废弃 - 多租户相关）====================

// 考勤规则接口（保留用于兼容性）
export interface AttendanceRule {
  id: string
  warehouse_id?: string | null // 可选，NULL表示全局规则
  clock_in_time: string
  clock_out_time: string
  late_threshold: number
  early_threshold: number
  is_active?: boolean
  created_at: string
  updated_at: string
  work_start_time?: string
  work_end_time?: string
  require_clock_out?: boolean
  // 数据库实际字段
  start_time?: string
  end_time?: string
  enabled?: boolean
}

// 创建考勤规则的输入接口
export interface AttendanceRuleInput {
  warehouse_id?: string | null // 可选，NULL表示全局规则
  clock_in_time: string
  clock_out_time: string
  late_threshold?: number
  early_threshold?: number
  work_start_time?: string
  work_end_time?: string
  is_active?: boolean
  require_clock_out?: boolean
}

// 更新考勤规则的输入接口
export interface AttendanceRuleUpdate {
  clock_in_time?: string
  clock_out_time?: string
  late_threshold?: number
  early_threshold?: number
  work_start_time?: string
  work_end_time?: string
  require_clock_out?: boolean
  is_active?: boolean
}

// ==================== 司机仓库关联（已废弃 - 多租户相关）====================

// 司机仓库关联接口（保留用于兼容性）
export interface DriverWarehouse {
  id: string
  user_id: string
  warehouse_id: string
  assigned_by: string | null
  created_at: string
}

// 创建司机仓库关联的输入接口
export interface DriverWarehouseInput {
  user_id: string
  warehouse_id: string
  assigned_by?: string
}

// ==================== 车辆扩展（已废弃 - 多租户相关）====================

// 车辆与司机信息接口（保留用于兼容性）
export interface VehicleWithDriver extends Vehicle {
  driver?: Profile | null
  driver_license?: DriverLicense | null
  driver_name?: string | null
  driver_phone?: string | null
  return_time?: string | null // 从vehicle_documents表获取
}

// 车辆与司机详细信息接口（保留用于兼容性）
export interface VehicleWithDriverDetails extends Vehicle {
  driver?: Profile | null
  driver_name?: string | null
  driver_phone?: string | null
  driver_profile?: Profile | null
  driver_license?: DriverLicense | null
  locked_photos?: Record<string, any>
}

// ==================== 司机类型和驾照（已废弃 - 多租户相关）====================

// 司机类型
export type DriverType = 'full_time' | 'part_time' | 'temporary' | 'pure' | 'with_vehicle'

// 驾照信息接口（保留用于兼容性）
export interface DriverLicense {
  id: string
  driver_id: string
  license_number: string
  license_type: string
  issue_date: string
  expiry_date: string
  created_at: string
  updated_at: string
  // 兼容旧代码的可选字段
  id_card_photo_front?: string | null
  id_card_photo_back?: string | null
  driving_license_photo?: string | null
  id_card_birth_date?: string | null
  first_issue_date?: string | null
  id_card_name?: string | null
  id_card_number?: string | null
  id_card_address?: string | null
  license_class?: string | null
  valid_from?: string | null
  valid_to?: string | null
  issue_authority?: string | null
}

// 创建驾照信息的输入接口
export interface DriverLicenseInput {
  driver_id: string
  license_number: string
  license_type: string
  issue_date: string
  expiry_date: string
  id_card_name?: string
  id_card_number?: string
  license_class?: string
  valid_from?: string
  valid_to?: string
  id_card_photo_front?: string
  id_card_photo_back?: string
  driving_license_photo?: string
  id_card_birth_date?: string
  first_issue_date?: string
  id_card_address?: string
  issue_authority?: string
  status?: string
}

// 更新驾照信息的输入接口
export interface DriverLicenseUpdate {
  license_number?: string
  license_type?: string
  issue_date?: string
  expiry_date?: string
}

// ==================== 租赁管理（已废弃 - 多租户相关）====================

// 租赁到期操作类型
export type ExpireActionType = 'auto_renew' | 'notify' | 'terminate'

// 租赁信息接口（保留用于兼容性）
export interface Lease {
  id: string
  vehicle_id: string
  tenant_id: string
  start_date: string
  end_date: string
  monthly_fee: number
  status: string
  created_at: string
  updated_at: string
  expire_action?: ExpireActionType
}

// 创建租赁的输入接口
export interface CreateLeaseInput {
  vehicle_id: string
  tenant_id: string
  start_date: string
  end_date: string
  monthly_fee: number
  // 兼容旧代码的可选字段
  duration_months?: number
  expire_action?: string
}

// 租赁账单接口（保留用于兼容性）
export interface LeaseBill {
  id: string
  lease_id: string
  billing_month: string
  amount: number
  status: string
  created_at: string
  verified_at?: string | null
  notes?: string | null
  bill_month?: string
}

// 租赁与租户信息接口（保留用于兼容性）
export interface LeaseWithTenant extends Lease {
  tenant?: any
}

// ==================== 辞职申请（已废弃 - 多租户相关）====================

// 辞职申请接口（保留用于兼容性）
export interface ResignationApplication {
  id: string
  user_id: string
  reason: string
  resignation_date: string
  status: string
  approver_id: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  review_notes?: string | null
  warehouse_id?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
}

// 创建辞职申请的输入接口
export interface ResignationApplicationInput {
  user_id: string
  reason: string
  resignation_date: string
  warehouse_id?: string
}

// ==================== 审核相关（已废弃 - 多租户相关）====================

// 审核输入接口（保留用于兼容性）
export interface ApplicationReviewInput {
  application_id?: string
  status: 'approved' | 'rejected'
  approver_id?: string
  comment?: string
  reviewed_by?: string
  review_notes?: string
  reviewed_at?: string
}

// ==================== 权限管理（已废弃 - 多租户相关）====================

// 管理员权限接口（保留用于兼容性）
export interface ManagerPermission {
  id: string
  manager_id: string
  permission_type: string
  created_at: string
  updated_at?: string
  // 兼容旧代码的可选字段
  can_edit_user_info?: boolean
  can_edit_piece_work?: boolean
  can_manage_attendance_rules?: boolean
  can_manage_categories?: boolean
}

// 创建管理员权限的输入接口
export interface ManagerPermissionInput {
  manager_id: string
  permission_type?: string
  can_edit_user_info?: boolean
  can_edit_piece_work?: boolean
  can_manage_attendance_rules?: boolean
  can_manage_categories?: boolean
}

// ==================== 锁定照片（已废弃 - 多租户相关）====================

// 锁定照片接口（保留用于兼容性）
export interface LockedPhotos {
  id: string
  user_id: string
  photo_url: string
  locked_at: string
}

// ==================== 通知模板和定时通知（已废弃 - 多租户相关）====================

// 发送者角色类型（统一使用大写格式）
export type SenderRole = 'BOSS' | 'MANAGER' | 'DRIVER' | 'DISPATCHER'

// 通知模板接口（保留用于兼容性）
export interface NotificationTemplate {
  id: string
  title: string
  content: string
  type: NotificationType
  created_at: string
  updated_at?: string
  category?: string
  is_favorite?: boolean
  created_by?: string
}

// 定时通知接口（保留用于兼容性）
export interface ScheduledNotification {
  id: string
  template_id: string
  scheduled_time: string
  status: string
  created_at: string
  sent_at?: string | null
  title?: string
  content?: string
  target_type?: string
  send_time?: string
  target_ids?: string[]
  created_by?: string
}

// 通知发送记录接口（保留用于兼容性）
export interface NotificationSendRecord {
  id: string
  notification_id: string
  recipient_id: string
  sent_at: string
  is_read: boolean
  notification_type?: string
  title?: string
  content?: string
  recipient_count?: number
  target_type?: string
  target_ids?: string[]
  sent_by?: string
  related_notification_id?: string
}

// 通知发送记录与发送者信息接口（保留用于兼容性）
export interface NotificationSendRecordWithSender extends NotificationSendRecord {
  sender?: Profile | null
}

// 创建通知的输入接口（保留用于兼容性）
export interface CreateNotificationInput {
  title: string
  content: string
  type?: NotificationType
  sender_id?: string
  recipient_id: string
  // 兼容旧代码的可选字段
  sender_name?: string
  // sender_role?: string // 临时移除：数据库字段不存在
  action_url?: string
}

// ==================== 自动提醒规则（已废弃 - 多租户相关）====================

// 自动提醒规则接口（保留用于兼容性）
export interface AutoReminderRule {
  id: string
  warehouse_id: string
  reminder_time: string
  message: string
  is_active: boolean
  created_at: string
  updated_at: string
  rule_name?: string
  rule_type?: string
  check_time?: string
  reminder_content?: string
  created_by?: string
}

// 自动提醒规则与仓库信息接口（保留用于兼容性）
export interface AutoReminderRuleWithWarehouse extends AutoReminderRule {
  warehouse?: Warehouse | null
}

// ==================== 租户管理（已废弃 - 多租户相关）====================

// 租户接口（保留用于兼容性）
export interface Tenant {
  id: string
  name: string
  code: string
  status: string
  created_at: string
  updated_at: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  expired_at?: string
  company_name?: string
  tenant_code?: string
  boss_name?: string
  boss_phone?: string
}

// 创建租户的输入接口
export interface CreateTenantInput {
  name: string
  code: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  company_name?: string
  boss_name?: string
  boss_phone?: string
  boss_password?: string
  boss_account?: string
}

// 创建租户的结果接口
export interface CreateTenantResult {
  success: boolean
  tenant?: Tenant
  error?: string
  message?: string
}

// 更新租户的输入接口
export interface UpdateTenantInput {
  name?: string
  status?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  expired_at?: string
}
