/*
# 创建仓库和考勤规则表

## 1. 新建表

### warehouses 表 - 仓库信息
- `id` (uuid, 主键) - 仓库ID
- `name` (text) - 仓库名称
- `address` (text) - 仓库地址
- `latitude` (numeric) - 仓库纬度
- `longitude` (numeric) - 仓库经度
- `radius` (numeric) - 打卡有效范围（米）
- `is_active` (boolean) - 是否启用
- `created_at` (timestamptz) - 创建时间
- `updated_at` (timestamptz) - 更新时间

### attendance_rules 表 - 考勤规则
- `id` (uuid, 主键) - 规则ID
- `warehouse_id` (uuid, 外键) - 关联仓库ID
- `work_start_time` (time) - 上班时间
- `work_end_time` (time) - 下班时间
- `late_threshold` (integer) - 迟到阈值（分钟）
- `early_threshold` (integer) - 早退阈值（分钟）
- `is_active` (boolean) - 是否启用
- `created_at` (timestamptz) - 创建时间
- `updated_at` (timestamptz) - 更新时间

## 2. 修改 attendance_records 表
- 添加 `warehouse_id` 字段关联仓库

## 3. 安全策略
- 启用RLS
- 司机可以查看所有仓库信息（只读）
- 管理员和超级管理员可以管理仓库和规则
- 超级管理员拥有完全权限

## 4. 索引
- 为warehouse_id创建索引
*/

-- 创建仓库表
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  radius numeric(10, 2) NOT NULL DEFAULT 500,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建考勤规则表
CREATE TABLE IF NOT EXISTS attendance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  work_start_time time NOT NULL DEFAULT '09:00:00',
  work_end_time time NOT NULL DEFAULT '18:00:00',
  late_threshold integer NOT NULL DEFAULT 15,
  early_threshold integer NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 修改考勤记录表，添加仓库关联
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES warehouses(id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_warehouse ON attendance_rules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_warehouse ON attendance_records(warehouse_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为仓库表添加更新时间触发器
DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为考勤规则表添加更新时间触发器
DROP TRIGGER IF EXISTS update_attendance_rules_updated_at ON attendance_rules;
CREATE TRIGGER update_attendance_rules_updated_at
    BEFORE UPDATE ON attendance_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 启用RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_rules ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看启用的仓库（司机需要知道可以在哪里打卡）
CREATE POLICY "Everyone can view active warehouses" ON warehouses
  FOR SELECT USING (is_active = true);

-- 所有人可以查看启用的考勤规则
CREATE POLICY "Everyone can view active attendance rules" ON attendance_rules
  FOR SELECT USING (is_active = true);

-- 管理员和超级管理员可以查看所有仓库
CREATE POLICY "Admins can view all warehouses" ON warehouses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'super_admin')
    )
  );

-- 管理员和超级管理员可以查看所有考勤规则
CREATE POLICY "Admins can view all attendance rules" ON attendance_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'super_admin')
    )
  );

-- 超级管理员可以创建仓库
CREATE POLICY "Super admins can create warehouses" ON warehouses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 超级管理员可以更新仓库
CREATE POLICY "Super admins can update warehouses" ON warehouses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 超级管理员可以删除仓库
CREATE POLICY "Super admins can delete warehouses" ON warehouses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 超级管理员可以创建考勤规则
CREATE POLICY "Super admins can create attendance rules" ON attendance_rules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 超级管理员可以更新考勤规则
CREATE POLICY "Super admins can update attendance rules" ON attendance_rules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 超级管理员可以删除考勤规则
CREATE POLICY "Super admins can delete attendance rules" ON attendance_rules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 插入示例仓库数据
INSERT INTO warehouses (name, address, latitude, longitude, radius, is_active)
VALUES 
  ('总部仓库', '北京市朝阳区建国路88号', 39.9042, 116.4074, 500, true),
  ('东区仓库', '北京市朝阳区望京SOHO', 40.0031, 116.4708, 300, true)
ON CONFLICT DO NOTHING;

-- 为示例仓库创建考勤规则
INSERT INTO attendance_rules (warehouse_id, work_start_time, work_end_time, late_threshold, early_threshold, is_active)
SELECT id, '09:00:00', '18:00:00', 15, 15, true
FROM warehouses
WHERE name IN ('总部仓库', '东区仓库')
ON CONFLICT DO NOTHING;
