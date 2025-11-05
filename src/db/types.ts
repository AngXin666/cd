export type UserRole = 'driver' | 'manager' | 'super_admin'

export interface Profile {
  id: string
  phone: string | null
  email: string | null
  name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface ProfileUpdate {
  name?: string
  phone?: string
  email?: string
}

// 考勤状态类型
export type AttendanceStatus = 'normal' | 'late' | 'early' | 'absent'

// 考勤记录接口
export interface AttendanceRecord {
  id: string
  user_id: string
  clock_in_time: string
  clock_in_location: string | null
  clock_in_latitude: number | null
  clock_in_longitude: number | null
  clock_out_time: string | null
  clock_out_location: string | null
  clock_out_latitude: number | null
  clock_out_longitude: number | null
  work_date: string
  work_hours: number | null
  status: AttendanceStatus
  notes: string | null
  created_at: string
}

// 创建考勤记录的输入接口
export interface AttendanceRecordInput {
  user_id: string
  clock_in_location?: string
  clock_in_latitude?: number
  clock_in_longitude?: number
  work_date?: string
  status?: AttendanceStatus
  notes?: string
}

// 更新考勤记录的输入接口（用于下班打卡）
export interface AttendanceRecordUpdate {
  clock_out_time?: string
  clock_out_location?: string
  clock_out_latitude?: number
  clock_out_longitude?: number
  work_hours?: number
  status?: AttendanceStatus
  notes?: string
}
