/*
# 添加老板唯一标识（boss_id）系统

## 变更说明
实现基于 boss_id 的多租户数据隔离系统，确保不同老板的数据完全隔离。

## 变更内容
1. 创建 boss_id 生成函数
2. 为所有表添加 boss_id 字段
3. 创建索引优化查询性能
4. 创建获取当前用户 boss_id 的函数

## 影响范围
- 所有数据表增加 boss_id 字段
- 后续所有查询都需要包含 boss_id 过滤条件
*/

-- ============================================
-- 第一部分：创建 boss_id 生成函数
-- ============================================

CREATE OR REPLACE FUNCTION generate_boss_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  timestamp_part BIGINT;
  random_part TEXT;
  boss_id TEXT;
BEGIN
  -- 获取当前时间戳（毫秒）
  timestamp_part := FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000);
  
  -- 生成8位随机数
  random_part := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
  
  -- 组合生成 boss_id
  boss_id := 'BOSS_' || timestamp_part || '_' || random_part;
  
  RETURN boss_id;
END;
$$;

COMMENT ON FUNCTION generate_boss_id() IS '生成老板唯一标识，格式：BOSS_{timestamp}_{random8digits}';

-- ============================================
-- 第二部分：为所有表添加 boss_id 字段
-- ============================================

-- 核心表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS boss_id TEXT;

-- 关联表
ALTER TABLE driver_warehouses ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE manager_warehouses ADD COLUMN IF NOT EXISTS boss_id TEXT;

-- 业务表
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE attendance_rules ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE piece_work_records ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE category_prices ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE resignation_applications ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE vehicle_records ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE driver_licenses ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS boss_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS boss_id TEXT;

-- ============================================
-- 第三部分：创建索引
-- ============================================

-- 核心表索引
CREATE INDEX IF NOT EXISTS idx_profiles_boss_id ON profiles(boss_id);
CREATE INDEX IF NOT EXISTS idx_profiles_boss_id_role ON profiles(boss_id, role);
CREATE INDEX IF NOT EXISTS idx_warehouses_boss_id ON warehouses(boss_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_boss_id_is_active ON warehouses(boss_id, is_active);

-- 关联表索引
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_boss_id ON driver_warehouses(boss_id);
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_boss_id ON manager_warehouses(boss_id);

-- 业务表索引
CREATE INDEX IF NOT EXISTS idx_attendance_boss_id ON attendance(boss_id);
CREATE INDEX IF NOT EXISTS idx_attendance_boss_id_date ON attendance(boss_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_boss_id ON attendance_rules(boss_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_boss_id ON piece_work_records(boss_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_boss_id_date ON piece_work_records(boss_id, work_date);
CREATE INDEX IF NOT EXISTS idx_category_prices_boss_id ON category_prices(boss_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_boss_id ON leave_applications(boss_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_boss_id_status ON leave_applications(boss_id, status);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_boss_id ON resignation_applications(boss_id);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_boss_id_status ON resignation_applications(boss_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_boss_id ON vehicles(boss_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_boss_id ON vehicle_records(boss_id);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_boss_id ON driver_licenses(boss_id);
CREATE INDEX IF NOT EXISTS idx_feedback_boss_id ON feedback(boss_id);
CREATE INDEX IF NOT EXISTS idx_notifications_boss_id ON notifications(boss_id);
CREATE INDEX IF NOT EXISTS idx_notifications_boss_id_recipient ON notifications(boss_id, recipient_id);

-- ============================================
-- 第四部分：创建获取当前用户 boss_id 的函数
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_boss_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT boss_id 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_current_user_boss_id() IS '获取当前登录用户的 boss_id';

-- ============================================
-- 第五部分：添加字段注释
-- ============================================

COMMENT ON COLUMN profiles.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN warehouses.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN driver_warehouses.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN manager_warehouses.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN attendance.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN attendance_rules.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN piece_work_records.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN category_prices.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN leave_applications.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN resignation_applications.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN vehicles.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN vehicle_records.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN driver_licenses.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN feedback.boss_id IS '老板唯一标识，用于多租户数据隔离';
COMMENT ON COLUMN notifications.boss_id IS '老板唯一标识，用于多租户数据隔离';
