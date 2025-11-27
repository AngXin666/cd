import type {NotificationType} from './notificationApi'

export type UserRole = 'driver' | 'manager' | 'super_admin' | 'peer_admin' | 'lease_admin'

// 司机类型（与数据库枚举值匹配）
export type DriverType = 'pure' | 'with_vehicle'

// 扩展角色类型，用于UI显示（已废弃，使用 driver_type 字段代替）
export type ExtendedUserRole = 'pure_driver' | 'driver_with_vehicle' | 'manager' | 'super_admin'

// 车辆审核状态类型
export type ReviewStatus = 'drafting' | 'pending_review' | 'need_supplement' | 'approved'

// 图片锁定信息类型
export interface LockedPhotos {
  pickup_photos?: number[] // 已锁定的提车照片索引
  return_photos?: number[] // 已锁定的还车照片索引
  registration_photos?: number[] // 已锁定的行驶证照片索引
  damage_photos?: number[] // 已锁定的车损特写照片索引
}

export interface Profile {
  id: string
  phone: string | null
  email: string | null
  name: string | null
  role: UserRole
  driver_type: DriverType | null // 司机类型：pure=纯司机，with_vehicle=带车司机
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
  status: string | null // 账号状态：active(正常), suspended(停用), deleted(已删除)
  company_name: string | null // 公司名称（仅老板账号）
  lease_start_date: string | null // 租赁开始日期（仅老板账号）
  lease_end_date: string | null // 租赁结束日期（仅老板账号）
  monthly_fee: number | null // 月租费用（仅老板账号）
  notes: string | null // 备注信息
  boss_id: string | null // 租户ID，指向super_admin的id
  main_account_id: string | null // 主账号ID，NULL表示这是主账号，非NULL表示这是平级账号
  peer_account_permission: 'full' | 'readonly' | null // 平级账号权限类型：full=完整权限，readonly=仅查看权限
  manager_permissions_enabled: boolean | null // 车队长权限是否启用，true=启用，false=禁用，默认true
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
  clock_in_time?: string
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
  daily_target?: number | null // 每日指标数（件），可选
  created_at: string
  updated_at: string
}

// 创建仓库的输入接口
export interface WarehouseInput {
  name: string
  is_active?: boolean
  max_leave_days?: number
  resignation_notice_days?: number
  daily_target?: number | null
}

// 更新仓库的输入接口
export interface WarehouseUpdate {
  name?: string
  is_active?: boolean
  max_leave_days?: number
  resignation_notice_days?: number
  daily_target?: number | null
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

// 计件品类接口（对应 category_prices 表）
export interface PieceWorkCategory {
  id: string
  warehouse_id: string
  category_name: string // 品类名称
  unit_price: number // 单价
  upstairs_price: number // 上楼价
  sorting_unit_price: number // 分拣单价
  is_active: boolean // 是否启用
  created_at: string
  updated_at: string
}

// 创建计件品类的输入接口
export interface PieceWorkCategoryInput {
  warehouse_id: string
  category_name: string
  unit_price: number
  upstairs_price: number
  sorting_unit_price: number
  is_active?: boolean
}

// 品类价格配置接口（与 PieceWorkCategory 相同，保持向后兼容）
export type CategoryPrice = PieceWorkCategory

// 创建/更新品类价格的输入接口（与 PieceWorkCategoryInput 相同，保持向后兼容）
export type CategoryPriceInput = PieceWorkCategoryInput

// 品类价格更新接口
export interface CategoryPriceUpdate {
  category_name?: string
  unit_price?: number
  upstairs_price?: number
  sorting_unit_price?: number
  is_active?: boolean
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

// 请假类型（与数据库枚举值匹配）
export type LeaveType = 'sick' | 'personal' | 'annual' | 'other'

// 申请状态类型
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

// 请假申请接口
export interface LeaveApplication {
  id: string
  user_id: string
  warehouse_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason: string
  status: ApplicationStatus
  reviewed_by: string | null
  review_notes: string | null
  reviewed_at: string | null
  created_at: string
}

// 创建请假申请的输入接口
export interface LeaveApplicationInput {
  user_id: string
  warehouse_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason: string
}

// 离职申请接口
export interface ResignationApplication {
  id: string
  user_id: string
  warehouse_id: string
  resignation_date: string
  reason: string
  status: ApplicationStatus
  reviewed_by: string | null
  review_notes: string | null
  reviewed_at: string | null
  created_at: string
}

// 创建离职申请的输入接口
export interface ResignationApplicationInput {
  user_id: string
  warehouse_id: string
  resignation_date: string
  reason: string
}

// 审批申请的输入接口
export interface ApplicationReviewInput {
  status: 'approved' | 'rejected'
  reviewed_by: string
  review_notes?: string
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
  // 租赁管理字段
  ownership_type: OwnershipType | null // 车辆归属类型：company(公司车) / personal(个人车)
  lessor_name: string | null // 租赁方名称（出租车辆的公司或个人）
  lessor_contact: string | null // 租赁方联系方式
  lessee_name: string | null // 承租方名称（租用车辆的公司或个人）
  lessee_contact: string | null // 承租方联系方式
  monthly_rent: number | null // 月租金（元）
  lease_start_date: string | null // 租赁开始日期
  lease_end_date: string | null // 租赁结束日期
  rent_payment_day: number | null // 每月租金缴纳日（1-31）
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
  // 提车/还车管理字段
  pickup_time: string | null // 提车时间
  return_time: string | null // 还车时间
  pickup_photos: string[] // 提车照片URL数组
  return_photos: string[] // 还车照片URL数组
  registration_photos: string[] // 行驶证照片URL数组
  damage_photos: string[] // 车损特写照片URL数组
  // 审核管理字段
  review_status: ReviewStatus // 审核状态
  locked_photos: LockedPhotos // 已锁定的图片信息
  required_photos: string[] // 需要补录的图片字段列表
  review_notes: string | null // 审核备注
  reviewed_at: string | null // 审核时间
  reviewed_by: string | null // 审核人ID
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
  // 租赁管理字段
  ownership_type?: OwnershipType | null
  lessor_name?: string | null
  lessor_contact?: string | null
  lessee_name?: string | null
  lessee_contact?: string | null
  monthly_rent?: number | null
  lease_start_date?: string | null
  lease_end_date?: string | null
  rent_payment_day?: number | null
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
  // 提车/还车管理字段
  pickup_time?: string | null
  return_time?: string | null
  pickup_photos?: string[]
  return_photos?: string[]
  registration_photos?: string[]
  damage_photos?: string[]
  // 审核管理字段
  review_status?: ReviewStatus
  locked_photos?: LockedPhotos
  required_photos?: string[]
  review_notes?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
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
  // 租赁管理字段
  ownership_type?: OwnershipType | null
  lessor_name?: string | null
  lessor_contact?: string | null
  lessee_name?: string | null
  lessee_contact?: string | null
  monthly_rent?: number | null
  lease_start_date?: string | null
  lease_end_date?: string | null
  rent_payment_day?: number | null
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
  // 提车/还车管理字段
  pickup_time?: string | null
  return_time?: string | null
  pickup_photos?: string[]
  return_photos?: string[]
  registration_photos?: string[]
  damage_photos?: string[]
  // 审核管理字段
  review_status?: ReviewStatus
  locked_photos?: LockedPhotos
  required_photos?: string[]
  review_notes?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
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

// 车辆信息（包含司机信息）
export interface VehicleWithDriver extends Vehicle {
  driver_id?: string | null
  driver_name?: string | null
  driver_phone?: string | null
  driver_email?: string | null
  driver?: {
    id: string
    name: string | null
    phone: string | null
    email: string | null
  } | null
  driver_license?: {
    // 证件照片
    id_card_photo_front: string | null
    id_card_photo_back: string | null
    driving_license_photo: string | null
    // 身份证信息
    id_card_name: string | null
    id_card_number: string | null
    id_card_address: string | null
    id_card_birth_date: string | null
    // 驾驶证信息
    license_number: string | null
    license_class: string | null
    first_issue_date: string | null
    valid_from: string | null
    valid_to: string | null
    issue_authority: string | null
  } | null
}

// ============================================
// 新的车辆记录系统类型定义
// ============================================

// 车辆归属类型
export type OwnershipType = 'company' | 'personal'

// 车辆基本信息（vehicles_base表）
export interface VehicleBase {
  id: string
  plate_number: string // 车牌号（唯一）
  brand: string // 品牌
  model: string // 型号
  color: string | null // 颜色
  vin: string | null // 车辆识别代号
  vehicle_type: string | null // 车辆类型
  owner_name: string | null // 所有人
  use_character: string | null // 使用性质
  register_date: string | null // 注册日期
  engine_number: string | null // 发动机号码
  // 租赁管理字段
  ownership_type: OwnershipType // 车辆归属类型：company(公司车) / personal(个人车)
  lessor_name: string | null // 租赁方名称（出租车辆的公司或个人）
  lessor_contact: string | null // 租赁方联系方式
  lessee_name: string | null // 承租方名称（租用车辆的公司或个人）
  lessee_contact: string | null // 承租方联系方式
  monthly_rent: number // 月租金（元）
  lease_start_date: string | null // 租赁开始日期
  lease_end_date: string | null // 租赁结束日期
  rent_payment_day: number | null // 每月租金缴纳日（1-31）
  created_at: string
  updated_at: string
}

// 车辆租赁信息（包含计算字段）
export interface VehicleLeaseInfo extends VehicleBase {
  next_payment_date: string | null // 下一个租金缴纳日期
  is_lease_active: boolean // 租赁是否有效（在租期内）
}

// 租赁账单（lease_bills表）
export interface LeaseBill {
  id: string
  boss_id: string // 租户ID（老板账号）
  bill_month: string // 账单月份，格式：2025-01
  amount: number // 账单金额
  status: string // 账单状态：pending(待核销), verified(已核销), cancelled(已取消)
  verified_at: string | null // 核销时间
  verified_by: string | null // 核销人ID
  notes: string | null // 备注
  created_at: string
  updated_at: string
}

// 车辆录入记录（vehicle_records表）
export interface VehicleRecord {
  id: string
  vehicle_id: string // 关联vehicles_base表
  plate_number: string // 车牌号（冗余字段）
  driver_id: string // 司机ID
  warehouse_id: string | null // 仓库ID
  record_type: 'pickup' | 'return' // 记录类型
  // 行驶证信息
  issue_date: string | null
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
  // 车辆照片
  left_front_photo: string | null
  right_front_photo: string | null
  left_rear_photo: string | null
  right_rear_photo: string | null
  dashboard_photo: string | null
  rear_door_photo: string | null
  cargo_box_photo: string | null
  // 行驶证照片
  driving_license_main_photo: string | null
  driving_license_sub_photo: string | null
  driving_license_sub_back_photo: string | null
  // 提车/还车照片
  pickup_photos: string[]
  return_photos: string[]
  registration_photos: string[]
  damage_photos: string[]
  // 驾驶证信息
  driver_name: string | null
  license_number: string | null
  license_class: string | null
  first_issue_date: string | null
  license_valid_from: string | null
  license_valid_until: string | null
  id_card_number: string | null
  // 身份证照片
  id_card_photo_front: string | null
  id_card_photo_back: string | null
  // 审核管理
  review_status: ReviewStatus
  locked_photos: LockedPhotos
  required_photos: string[]
  review_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  // 时间字段
  pickup_time: string | null
  return_time: string | null
  recorded_at: string // 录入时间
  created_at: string
  updated_at: string
  notes: string | null
}

// 车辆录入记录（包含车辆基本信息和司机信息）
export interface VehicleRecordWithDetails extends VehicleRecord {
  vehicle?: VehicleBase // 车辆基本信息
  driver_name_profile?: string | null // 司机姓名（从profiles表）
  driver_phone?: string | null // 司机电话
  driver_email?: string | null // 司机邮箱
  // 身份证实名信息（从driver_licenses表）
  id_card_name?: string | null // 身份证姓名
  id_card_address?: string | null // 身份证地址
  id_card_birth_date?: string | null // 出生日期
  // 驾驶证信息（从driver_licenses表）
  driving_license_photo?: string | null // 驾驶证照片
}

// 车辆基本信息（包含所有录入记录）
export interface VehicleBaseWithRecords extends VehicleBase {
  records: VehicleRecordWithDetails[] // 所有录入记录，按时间倒序
  latest_record?: VehicleRecordWithDetails // 最新的录入记录
  total_records: number // 总记录数
}

// 车辆信息（包含司机详细信息）
export interface VehicleWithDriverDetails extends Vehicle {
  driver_profile?: {
    name: string | null
    phone: string | null
    email: string | null
  } | null
  driver_license?: {
    // 身份证信息
    id_card_name: string | null
    id_card_number: string | null
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
  } | null
}

// 车辆录入记录输入类型
export interface VehicleRecordInput {
  vehicle_id?: string // 如果已存在车辆，传入vehicle_id
  plate_number: string // 车牌号（必填，用于自动归类）
  driver_id: string
  warehouse_id?: string | null
  record_type?: 'pickup' | 'return'
  // 行驶证信息
  issue_date?: string | null
  archive_number?: string | null
  total_mass?: number | null
  approved_passengers?: number | null
  curb_weight?: number | null
  approved_load?: number | null
  overall_dimension_length?: number | null
  overall_dimension_width?: number | null
  overall_dimension_height?: number | null
  inspection_valid_until?: string | null
  inspection_date?: string | null
  mandatory_scrap_date?: string | null
  // 车辆照片
  left_front_photo?: string | null
  right_front_photo?: string | null
  left_rear_photo?: string | null
  right_rear_photo?: string | null
  dashboard_photo?: string | null
  rear_door_photo?: string | null
  cargo_box_photo?: string | null
  // 行驶证照片
  driving_license_main_photo?: string | null
  driving_license_sub_photo?: string | null
  driving_license_sub_back_photo?: string | null
  // 提车/还车照片
  pickup_photos?: string[]
  return_photos?: string[]
  registration_photos?: string[]
  damage_photos?: string[]
  // 驾驶证信息
  driver_name?: string | null
  license_number?: string | null
  license_class?: string | null
  first_issue_date?: string | null
  license_valid_from?: string | null
  license_valid_until?: string | null
  id_card_number?: string | null
  // 审核管理
  review_status?: ReviewStatus
  locked_photos?: LockedPhotos
  required_photos?: string[]
  review_notes?: string | null
  // 时间字段
  pickup_time?: string | null
  return_time?: string | null
  recorded_at?: string
  notes?: string | null
  // 车辆基本信息（用于创建新车辆）
  brand?: string
  model?: string
  color?: string | null
  vin?: string | null
  vehicle_type?: string | null
  owner_name?: string | null
  use_character?: string | null
  register_date?: string | null
  engine_number?: string | null
}

// ============================================
// 司机通知系统类型定义
// ============================================

/**
 * 通知模板
 */
export interface NotificationTemplate {
  id: string
  title: string
  content: string
  category: 'general' | 'attendance' | 'piece_work' | 'vehicle' | 'leave'
  is_favorite: boolean
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * 定时通知
 */
export interface ScheduledNotification {
  id: string
  title: string
  content: string
  send_time: string
  target_type: 'all' | 'warehouse' | 'specific'
  target_ids: string[]
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  created_by: string
  created_at: string
  sent_at: string | null
}

/**
 * 自动提醒规则
 */
export interface AutoReminderRule {
  id: string
  rule_type: 'attendance' | 'piece_work'
  rule_name: string
  check_time: string
  reminder_content: string
  warehouse_id: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * 通知发送记录
 */
export interface NotificationSendRecord {
  id: string
  notification_type: 'manual' | 'scheduled' | 'auto'
  title: string
  content: string
  recipient_count: number
  target_type: string
  target_ids: string[]
  sent_by: string
  sent_at: string
  related_notification_id: string | null
}

/**
 * 带仓库信息的自动提醒规则
 */
export interface AutoReminderRuleWithWarehouse extends AutoReminderRule {
  warehouse?: {
    id: string
    name: string
  } | null
}

/**
 * 带发送者信息的通知发送记录
 */
export interface NotificationSendRecordWithSender extends NotificationSendRecord {
  sender?: {
    id: string
    name: string
    role: string
  }
}

// ==================== 租期管理相关类型 ====================

/**
 * 租期状态
 */
export type LeaseStatus = 'active' | 'expired'

/**
 * 到期操作类型
 */
export type ExpireActionType = 'suspend_all' | 'suspend_main' | 'suspend_peer' | 'suspend_manager'

/**
 * 租期记录
 */
export interface Lease {
  id: string
  boss_id: string // 老板账号ID（主账号）
  start_date: string // 租期开始日期
  end_date: string // 租期结束日期
  duration_months: number // 租期月数（1/3/6/12）
  status: LeaseStatus // 租期状态
  expire_action: ExpireActionType // 到期操作
  created_at: string
  updated_at: string
}

/**
 * 带租户信息的租期记录
 */
export interface LeaseWithTenant extends Lease {
  tenant?: {
    id: string
    name: string | null
    phone: string | null
    company_name: string | null
  }
}

/**
 * 创建租期的输入参数
 */
export interface CreateLeaseInput {
  boss_id: string
  start_date: string
  duration_months: number // 1, 3, 6, 12
  expire_action: ExpireActionType
}

/**
 * 发送者角色类型
 */
export type SenderRole = 'manager' | 'super_admin' | 'driver'

/**
 * 通知记录
 */
export interface Notification {
  id: string
  recipient_id: string // 接收者ID
  sender_id: string // 发送者ID
  sender_name: string // 发送者姓名
  sender_role: SenderRole // 发送者角色
  type: NotificationType // 通知类型
  title: string // 通知标题
  content: string // 通知内容
  action_url: string | null // 跳转链接
  is_read: boolean // 是否已读
  created_at: string // 创建时间
}

/**
 * 创建通知的输入参数
 */
export interface CreateNotificationInput {
  recipient_id: string
  sender_id: string
  sender_name: string
  sender_role: SenderRole
  type: NotificationType
  title: string
  content: string
  action_url?: string
}

/**
 * 删除租户结果
 */
export interface DeleteTenantResult {
  success: boolean
  message: string
  deletedData?: {
    tenant: string
    peerAccounts: number
    managers: number
    drivers: number
    vehicles: number
    warehouses: number
    attendance: number
    leaves: number
    pieceWorks: number
    notifications: number
    total: number
  }
  error?: string
}
