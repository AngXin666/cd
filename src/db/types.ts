export type UserRole = 'driver' | 'manager' | 'super_admin'

// 司机类型
export type DriverType = 'driver' | 'driver_with_vehicle'

// 扩展角色类型，用于UI显示（已废弃，使用 driver_type 字段代替）
export type ExtendedUserRole = 'pure_driver' | 'driver_with_vehicle' | 'manager' | 'super_admin'

export interface Profile {
  id: string
  phone: string | null
  email: string | null
  name: string | null
  role: UserRole
  driver_type: DriverType | null // 司机类型：driver=纯司机，driver_with_vehicle=带车司机
  avatar_url: string | null
  nickname: string | null
  address_province: string | null
  address_city: string | null
  address_district: string | null
  address_detail: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  login_account: string | null
  vehicle_plate: string | null
  join_date: string | null
  created_at: string
  updated_at: string
}

export interface ProfileUpdate {
  name?: string
  phone?: string
  email?: string
  avatar_url?: string
  nickname?: string
  address_province?: string
  address_city?: string
  address_district?: string
  address_detail?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  login_account?: string
  vehicle_plate?: string | null
  join_date?: string
  role?: UserRole
  driver_type?: DriverType | null // 司机类型
}

// 考勤状态类型
export type AttendanceStatus = 'normal' | 'late' | 'early' | 'absent'

// 考勤记录接口
export interface AttendanceRecord {
  id: string
  user_id: string
  warehouse_id: string | null
  clock_in_time: string
  clock_out_time: string | null
  work_date: string
  work_hours: number | null
  status: AttendanceStatus
  notes: string | null
  created_at: string
}

// 创建考勤记录的输入接口
export interface AttendanceRecordInput {
  user_id: string
  warehouse_id?: string
  work_date?: string
  status?: AttendanceStatus
  notes?: string
}

// 更新考勤记录的输入接口（用于下班打卡）
export interface AttendanceRecordUpdate {
  clock_out_time?: string
  work_hours?: number
  status?: AttendanceStatus
  notes?: string
}

// 仓库接口
export interface Warehouse {
  id: string
  name: string
  is_active: boolean
  max_leave_days: number
  resignation_notice_days: number
  created_at: string
  updated_at: string
}

// 创建仓库的输入接口
export interface WarehouseInput {
  name: string
  is_active?: boolean
  max_leave_days?: number
  resignation_notice_days?: number
}

// 更新仓库的输入接口
export interface WarehouseUpdate {
  name?: string
  is_active?: boolean
  max_leave_days?: number
  resignation_notice_days?: number
}

// 考勤规则接口
export interface AttendanceRule {
  id: string
  warehouse_id: string
  work_start_time: string
  work_end_time: string
  late_threshold: number
  early_threshold: number
  require_clock_out: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

// 创建考勤规则的输入接口
export interface AttendanceRuleInput {
  warehouse_id: string
  work_start_time: string
  work_end_time: string
  late_threshold?: number
  early_threshold?: number
  require_clock_out?: boolean
  is_active?: boolean
}

// 更新考勤规则的输入接口
export interface AttendanceRuleUpdate {
  work_start_time?: string
  work_end_time?: string
  late_threshold?: number
  early_threshold?: number
  require_clock_out?: boolean
  is_active?: boolean
}

// 仓库和规则的组合接口（用于显示）
export interface WarehouseWithRule extends Warehouse {
  rule?: AttendanceRule
}

// 司机仓库关联接口
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

// 计件品类接口
export interface PieceWorkCategory {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// 创建计件品类的输入接口
export interface PieceWorkCategoryInput {
  name: string
  is_active?: boolean
}

// 品类价格配置接口
export interface CategoryPrice {
  id: string
  warehouse_id: string
  category_id: string
  driver_price: number // 纯司机单价
  driver_with_vehicle_price: number // 带车司机单价
  created_at: string
  updated_at: string
}

// 创建/更新品类价格的输入接口
export interface CategoryPriceInput {
  warehouse_id: string
  category_id: string
  driver_price: number
  driver_with_vehicle_price: number
}

// 品类价格更新接口
export interface CategoryPriceUpdate {
  driver_price?: number
  driver_with_vehicle_price?: number
}

// 管理员仓库关联接口
export interface ManagerWarehouse {
  id: string
  manager_id: string
  warehouse_id: string
  created_at: string
}

// 创建管理员仓库关联的输入接口
export interface ManagerWarehouseInput {
  manager_id: string
  warehouse_id: string
}

// 计件记录接口
export interface PieceWorkRecord {
  id: string
  user_id: string
  warehouse_id: string
  work_date: string
  category_id: string
  quantity: number
  unit_price: number
  need_upstairs: boolean
  upstairs_price: number
  need_sorting: boolean
  sorting_quantity: number
  sorting_unit_price: number
  total_amount: number
  notes?: string
  created_at: string
}

// 创建计件记录的输入接口
export interface PieceWorkRecordInput {
  user_id: string
  warehouse_id: string
  work_date: string
  category_id: string
  quantity: number
  unit_price: number
  need_upstairs: boolean
  upstairs_price: number
  need_sorting: boolean
  sorting_quantity: number
  sorting_unit_price: number
  total_amount: number
  notes?: string
}

// 计件统计接口
export interface PieceWorkStats {
  total_orders: number
  total_quantity: number
  total_amount: number
  by_category: {
    category_id: string
    category_name: string
    quantity: number
    amount: number
  }[]
}

// 请假类型
export type LeaveType = 'sick_leave' | 'personal_leave' | 'annual_leave' | 'other'

// 申请状态类型
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

// 请假申请接口
export interface LeaveApplication {
  id: string
  user_id: string
  warehouse_id: string
  type: LeaveType
  start_date: string
  end_date: string
  reason: string
  attachment_url: string | null
  status: ApplicationStatus
  reviewer_id: string | null
  review_comment: string | null
  reviewed_at: string | null
  created_at: string
  is_draft: boolean
}

// 创建请假申请的输入接口
export interface LeaveApplicationInput {
  user_id: string
  warehouse_id: string
  type: LeaveType
  start_date: string
  end_date: string
  reason: string
  attachment_url?: string
  is_draft?: boolean
}

// 离职申请接口
export interface ResignationApplication {
  id: string
  user_id: string
  warehouse_id: string
  expected_date: string
  reason: string
  status: ApplicationStatus
  reviewer_id: string | null
  review_comment: string | null
  reviewed_at: string | null
  created_at: string
  is_draft: boolean
}

// 创建离职申请的输入接口
export interface ResignationApplicationInput {
  user_id: string
  warehouse_id: string
  expected_date: string
  reason: string
  is_draft?: boolean
}

// 审批申请的输入接口
export interface ApplicationReviewInput {
  status: 'approved' | 'rejected'
  reviewer_id: string
  review_comment?: string
  reviewed_at: string
}

// 请假申请验证结果接口
export interface LeaveValidationResult {
  valid: boolean
  maxDays: number
  message?: string
}

// 离职申请验证结果接口
export interface ResignationValidationResult {
  valid: boolean
  minDate: string
  noticeDays: number
  message?: string
}

// 仓库设置接口
export interface WarehouseSettings {
  max_leave_days: number
  resignation_notice_days: number
}

// 反馈状态类型
export type FeedbackStatus = 'pending' | 'processing' | 'resolved'

// 反馈类型
export type FeedbackType = 'bug' | 'feature' | 'complaint' | 'suggestion' | 'other'

// 反馈接口
export interface Feedback {
  id: string
  user_id: string
  type: string
  content: string
  contact: string | null
  status: FeedbackStatus
  created_at: string
  updated_at: string
}

// 创建反馈的输入接口
export interface FeedbackInput {
  user_id: string
  type: FeedbackType
  content: string
  contact?: string
}

// 更新反馈的输入接口
export interface FeedbackUpdate {
  status?: FeedbackStatus
}

// 管理员权限接口
export interface ManagerPermission {
  id: string
  manager_id: string
  can_edit_user_info: boolean
  can_edit_piece_work: boolean
  can_manage_attendance_rules: boolean
  can_manage_categories: boolean
  created_at: string
  updated_at: string
}

// 创建/更新管理员权限的输入接口
export interface ManagerPermissionInput {
  manager_id: string
  can_edit_user_info?: boolean
  can_edit_piece_work?: boolean
  can_manage_attendance_rules?: boolean
  can_manage_categories?: boolean
}

// 管理员-仓库关联接口
export interface ManagerWarehouse {
  id: string
  manager_id: string
  warehouse_id: string
  created_at: string
}

// 创建管理员-仓库关联的输入接口
export interface ManagerWarehouseInput {
  manager_id: string
  warehouse_id: string
}

// 仓库-品类关联接口
export interface WarehouseCategory {
  id: string
  warehouse_id: string
  category_id: string
  created_at: string
}

// 创建仓库-品类关联的输入接口
export interface WarehouseCategoryInput {
  warehouse_id: string
  category_id: string
}
