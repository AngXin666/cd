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

// 车辆信息类型
export interface Vehicle {
  id: string
  user_id: string
  warehouse_id: string | null
  plate_number: string
  vehicle_type: string | null
  brand: string
  model: string
  color: string | null
  purchase_date: string | null
  status: string
  notes: string | null
  // OCR识别相关字段 - 主页
  vin: string | null // 车辆识别代号
  owner_name: string | null // 所有人
  use_character: string | null // 使用性质
  register_date: string | null // 注册日期
  issue_date: string | null // 发证日期
  engine_number: string | null // 发动机号码
  // OCR识别相关字段 - 副页
  archive_number: string | null // 档案编号
  total_mass: number | null // 总质量（kg）
  approved_passengers: number | null // 核定载人数
  curb_weight: number | null // 整备质量（kg）
  approved_load: number | null // 核定载质量（kg）
  overall_dimension_length: number | null // 外廓尺寸-长（mm）
  overall_dimension_width: number | null // 外廓尺寸-宽（mm）
  overall_dimension_height: number | null // 外廓尺寸-高（mm）
  inspection_valid_until: string | null // 检验有效期
  // OCR识别相关字段 - 副页背页
  inspection_date: string | null // 年检时间（最近一次年检日期）
  mandatory_scrap_date: string | null // 强制报废期
  // 车辆照片（7个角度）
  left_front_photo: string | null // 左前照片
  right_front_photo: string | null // 右前照片
  left_rear_photo: string | null // 左后照片
  right_rear_photo: string | null // 右后照片
  dashboard_photo: string | null // 仪表盘照片
  rear_door_photo: string | null // 后门照片
  cargo_box_photo: string | null // 货箱照片
  // 行驶证照片（3张）
  driving_license_photo: string | null // 行驶证照片（旧字段，保留兼容）
  driving_license_main_photo: string | null // 行驶证主页照片
  driving_license_sub_photo: string | null // 行驶证副页照片
  driving_license_sub_back_photo: string | null // 行驶证副页背页照片
  created_at: string
  updated_at: string
}

// 车辆信息输入类型
export interface VehicleInput {
  user_id: string
  warehouse_id?: string | null
  plate_number: string
  vehicle_type?: string | null
  brand: string
  model: string
  color?: string | null
  purchase_date?: string | null
  status?: string
  notes?: string | null
  // 主页字段
  vin?: string | null
  owner_name?: string | null
  use_character?: string | null
  register_date?: string | null
  issue_date?: string | null
  engine_number?: string | null
  // 副页字段
  archive_number?: string | null
  total_mass?: number | null
  approved_passengers?: number | null
  curb_weight?: number | null
  approved_load?: number | null
  overall_dimension_length?: number | null
  overall_dimension_width?: number | null
  overall_dimension_height?: number | null
  inspection_valid_until?: string | null
  // 副页背页字段
  mandatory_scrap_date?: string | null
  inspection_date?: string | null
  // 车辆照片
  left_front_photo?: string | null
  right_front_photo?: string | null
  left_rear_photo?: string | null
  right_rear_photo?: string | null
  dashboard_photo?: string | null
  rear_door_photo?: string | null
  cargo_box_photo?: string | null
  // 行驶证照片
  driving_license_photo?: string | null
  driving_license_main_photo?: string | null
  driving_license_sub_photo?: string | null
  driving_license_sub_back_photo?: string | null
}

// 车辆信息更新类型
export interface VehicleUpdate {
  warehouse_id?: string | null
  plate_number?: string
  vehicle_type?: string | null
  brand?: string
  model?: string
  color?: string | null
  purchase_date?: string | null
  status?: string
  notes?: string | null
  // 主页字段
  vin?: string | null
  owner_name?: string | null
  use_character?: string | null
  register_date?: string | null
  issue_date?: string | null
  engine_number?: string | null
  // 副页字段
  archive_number?: string | null
  total_mass?: number | null
  approved_passengers?: number | null
  curb_weight?: number | null
  approved_load?: number | null
  overall_dimension_length?: number | null
  overall_dimension_width?: number | null
  overall_dimension_height?: number | null
  inspection_valid_until?: string | null
  // 副页背页字段
  mandatory_scrap_date?: string | null
  inspection_date?: string | null
  // 车辆照片
  left_front_photo?: string | null
  right_front_photo?: string | null
  left_rear_photo?: string | null
  right_rear_photo?: string | null
  dashboard_photo?: string | null
  rear_door_photo?: string | null
  cargo_box_photo?: string | null
  // 行驶证照片
  driving_license_photo?: string | null
  driving_license_main_photo?: string | null
  driving_license_sub_photo?: string | null
  driving_license_sub_back_photo?: string | null
}

// 驾驶员证件信息类型
export interface DriverLicense {
  id: string
  driver_id: string
  // 身份证信息
  id_card_number: string | null
  id_card_name: string | null
  id_card_address: string | null
  id_card_birth_date: string | null
  id_card_photo_front: string | null
  id_card_photo_back: string | null
  // 驾驶证信息
  license_number: string | null
  license_class: string | null
  first_issue_date: string | null
  valid_from: string | null
  valid_to: string | null
  issue_authority: string | null
  driving_license_photo: string | null
  status: string
  created_at: string
  updated_at: string
}

// 驾驶员证件信息输入类型
export interface DriverLicenseInput {
  driver_id: string
  id_card_number?: string | null
  id_card_name?: string | null
  id_card_address?: string | null
  id_card_birth_date?: string | null
  id_card_photo_front?: string | null
  id_card_photo_back?: string | null
  license_number?: string | null
  license_class?: string | null
  first_issue_date?: string | null
  valid_from?: string | null
  valid_to?: string | null
  issue_authority?: string | null
  driving_license_photo?: string | null
  status?: string
}

// 驾驶员证件信息更新类型
export interface DriverLicenseUpdate {
  id_card_number?: string | null
  id_card_name?: string | null
  id_card_address?: string | null
  id_card_birth_date?: string | null
  id_card_photo_front?: string | null
  id_card_photo_back?: string | null
  license_number?: string | null
  license_class?: string | null
  first_issue_date?: string | null
  valid_from?: string | null
  valid_to?: string | null
  issue_authority?: string | null
  driving_license_photo?: string | null
  status?: string
}
