import type {NotificationType} from './notificationApi'

// ==================== 用户相关类型 ====================

// 单用户系统角色类型
export type UserRole = 'BOSS' | 'DISPATCHER' | 'DRIVER'

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
}

export interface ProfileUpdate {
  name?: string
  phone?: string
  email?: string
  avatar_url?: string
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
}

// 创建仓库的输入接口
export interface WarehouseInput {
  name: string
  address?: string
  contact_person?: string
  contact_phone?: string
}

// 更新仓库的输入接口
export interface WarehouseUpdate {
  name?: string
  address?: string
  contact_person?: string
  contact_phone?: string
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
}

// 创建请假申请的输入接口
export interface LeaveRequestInput {
  user_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason?: string
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
}

// 创建计件记录的输入接口
export interface PieceworkRecordInput {
  user_id: string
  date: string
  warehouse_id?: string
  category: string
  quantity: number
  unit_price?: number
  total_amount?: number
  notes?: string
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
