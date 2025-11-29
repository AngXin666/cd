import type {NotificationType} from './notificationApi'

// ==================== 用户相关类型 ====================

// 单用户系统角色类型
export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'DRIVER'

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

// 兼容旧代码的 Profile 接口（映射到新的 User）
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

// 仓库分配接口
export interface WarehouseAssignment {
  id: string
  warehouse_id: string
  user_id: string
  assigned_by: string | null
  created_at: string
}

// 创建仓库分配的输入接口
export interface WarehouseAssignmentInput {
  warehouse_id: string
  user_id: string
  assigned_by?: string
}

// ==================== 车辆相关类型 ====================

// 车辆接口
export interface Vehicle {
  id: string
  plate_number: string
  vehicle_type: string | null
  brand: string | null
  model: string | null
  driver_id: string | null
  status: string
  created_at: string
  updated_at: string
  // 兼容旧代码的可选字段
  user_id?: string | null
  pickup_photos?: string[] | null
  return_photos?: string[] | null
  registration_photos?: string[] | null
  return_time?: string | null
}

// 创建车辆的输入接口
export interface VehicleInput {
  plate_number: string
  vehicle_type?: string
  brand?: string
  model?: string
  driver_id?: string
  status?: string
}

// 更新车辆的输入接口
export interface VehicleUpdate {
  plate_number?: string
  vehicle_type?: string
  brand?: string
  model?: string
  driver_id?: string
  status?: string
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
  date: string
  clock_in_time?: string
  warehouse_id?: string
  status?: AttendanceStatus
  notes?: string
}

// 更新考勤记录的输入接口
export interface AttendanceRecordUpdate {
  clock_out_time?: string
  status?: AttendanceStatus
  notes?: string
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
}

// 创建计件记录的输入接口
export interface PieceworkRecordInput {
  user_id: string
  date: string
  warehouse_id?: string
  category: string
  category_id?: string
  quantity: number
  unit_price?: number
  total_amount?: number
  notes?: string
  work_date?: string
  need_upstairs?: boolean
  upstairs_price?: number
  need_sorting?: boolean
  sorting_quantity?: number
  sorting_unit_price?: number
}

// 更新计件记录的输入接口
export interface PieceworkRecordUpdate {
  category?: string
  quantity?: number
  unit_price?: number
  total_amount?: number
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
}

// 创建通知的输入接口
export interface NotificationInput {
  title: string
  content: string
  type?: NotificationType
  sender_id?: string
  recipient_id: string
}

// 更新通知的输入接口
export interface NotificationUpdate {
  is_read?: boolean
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
  description?: string
  warehouse_id?: string
  category_name?: string
  unit_price?: number
  upstairs_price?: number
  sorting_unit_price?: number
  driver_only_price?: number
  driver_with_vehicle_price?: number
  is_active?: boolean
}

// 计件分类价格接口
export interface CategoryPrice {
  id: string
  category_id: string
  warehouse_id: string | null
  unit_price: number
  effective_date: string
  created_at: string
  category_name?: string
  upstairs_price?: number | null
  sorting_unit_price?: number | null
  driver_only_price?: number | null
  driver_with_vehicle_price?: number | null
}

// 创建计件分类价格的输入接口
export interface CategoryPriceInput {
  category_id: string
  warehouse_id?: string
  unit_price: number
  effective_date: string
  category_name?: string
  upstairs_price?: number
  sorting_unit_price?: number
  driver_only_price?: number
  driver_with_vehicle_price?: number
  is_active?: boolean
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
  warehouse_id: string
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
}

// 创建考勤规则的输入接口
export interface AttendanceRuleInput {
  warehouse_id: string
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
  driver_id: string
  warehouse_id: string
  created_at: string
}

// 创建司机仓库关联的输入接口
export interface DriverWarehouseInput {
  driver_id: string
  warehouse_id: string
}

// ==================== 车辆扩展（已废弃 - 多租户相关）====================

// 车辆与司机信息接口（保留用于兼容性）
export interface VehicleWithDriver extends Vehicle {
  driver?: Profile | null
  return_time?: string | null
}

// 车辆与司机详细信息接口（保留用于兼容性）
export interface VehicleWithDriverDetails extends Vehicle {
  driver?: Profile | null
  driver_name?: string | null
  driver_phone?: string | null
  driver_profile?: Profile | null
}

// ==================== 司机类型和驾照（已废弃 - 多租户相关）====================

// 司机类型
export type DriverType = 'full_time' | 'part_time' | 'temporary'

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
}

// 更新驾照信息的输入接口
export interface DriverLicenseUpdate {
  license_number?: string
  license_type?: string
  issue_date?: string
  expiry_date?: string
}

// ==================== 租赁管理（已废弃 - 多租户相关）====================

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

// 发送者角色类型
export type SenderRole = 'system' | 'admin' | 'manager'

// 通知模板接口（保留用于兼容性）
export interface NotificationTemplate {
  id: string
  title: string
  content: string
  type: NotificationType
  created_at: string
  category?: string
}

// 定时通知接口（保留用于兼容性）
export interface ScheduledNotification {
  id: string
  template_id: string
  scheduled_time: string
  status: string
  created_at: string
}

// 通知发送记录接口（保留用于兼容性）
export interface NotificationSendRecord {
  id: string
  notification_id: string
  recipient_id: string
  sent_at: string
  is_read: boolean
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
  sender_role?: string
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
}

// 自动提醒规则与仓库信息接口（保留用于兼容性）
export interface AutoReminderRuleWithWarehouse extends AutoReminderRule {
  warehouse?: Warehouse | null
}

// ==================== 反馈管理（已废弃 - 多租户相关）====================

// 反馈状态类型
export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'closed'

// 反馈接口（保留用于兼容性）
export interface Feedback {
  id: string
  user_id: string
  title: string
  content: string
  status: FeedbackStatus
  response: string | null
  created_at: string
  updated_at: string
}

// 创建反馈的输入接口
export interface FeedbackInput {
  user_id: string
  title: string
  content: string
  // 兼容旧代码的可选字段
  type?: string
  contact?: string
}
