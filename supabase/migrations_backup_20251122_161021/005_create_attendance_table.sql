/*
# 创建考勤打卡表

## 1. 新建表
- `attendance_records` - 考勤打卡记录表
  - `id` (uuid, 主键) - 记录ID
  - `user_id` (uuid, 外键) - 用户ID，关联profiles表
  - `clock_in_time` (timestamptz) - 上班打卡时间
  - `clock_in_location` (text) - 上班打卡地点
  - `clock_in_latitude` (numeric) - 上班打卡纬度
  - `clock_in_longitude` (numeric) - 上班打卡经度
  - `clock_out_time` (timestamptz, 可空) - 下班打卡时间
  - `clock_out_location` (text, 可空) - 下班打卡地点
  - `clock_out_latitude` (numeric, 可空) - 下班打卡纬度
  - `clock_out_longitude` (numeric, 可空) - 下班打卡经度
  - `work_date` (date) - 工作日期
  - `work_hours` (numeric, 可空) - 工作时长（小时）
  - `status` (text) - 状态：normal(正常), late(迟到), early(早退), absent(缺勤)
  - `notes` (text, 可空) - 备注
  - `created_at` (timestamptz) - 创建时间

## 2. 安全策略
- 启用RLS
- 司机可以查看和创建自己的打卡记录
- 管理员可以查看所有打卡记录
- 超级管理员拥有完全权限

## 3. 索引
- 为user_id和work_date创建索引以提高查询性能
*/

-- 创建考勤记录表
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in_time timestamptz NOT NULL DEFAULT now(),
  clock_in_location text,
  clock_in_latitude numeric(10, 7),
  clock_in_longitude numeric(10, 7),
  clock_out_time timestamptz,
  clock_out_location text,
  clock_out_latitude numeric(10, 7),
  clock_out_longitude numeric(10, 7),
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  work_hours numeric(5, 2),
  status text NOT NULL DEFAULT 'normal',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance_records(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, work_date);

-- 启用RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 司机可以查看自己的打卡记录
CREATE POLICY "Users can view own attendance" ON attendance_records
  FOR SELECT USING (auth.uid() = user_id);

-- 司机可以创建自己的打卡记录
CREATE POLICY "Users can create own attendance" ON attendance_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 司机可以更新自己的打卡记录（用于下班打卡）
CREATE POLICY "Users can update own attendance" ON attendance_records
  FOR UPDATE USING (auth.uid() = user_id);

-- 管理员和超级管理员可以查看所有打卡记录
CREATE POLICY "Admins can view all attendance" ON attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'super_admin')
    )
  );

-- 超级管理员可以修改所有打卡记录
CREATE POLICY "Super admins can update all attendance" ON attendance_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 超级管理员可以删除打卡记录
CREATE POLICY "Super admins can delete attendance" ON attendance_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );
