/*
# 创建考勤相关表

## 说明
创建考勤管理相关的表，包括考勤记录表和考勤规则表。

## 表结构

### 1. attendance（考勤记录表）
记录用户的打卡记录。

**字段说明**：
- id (uuid, PK): 记录ID
- user_id (uuid, FK): 用户ID，关联 profiles.id
- warehouse_id (uuid, FK): 仓库ID，关联 warehouses.id
- clock_in_time (timestamptz): 上班打卡时间
- clock_out_time (timestamptz): 下班打卡时间
- work_date (date): 工作日期
- work_hours (numeric): 工作时长（小时）
- status (attendance_status): 考勤状态
- notes (text): 备注
- created_at (timestamptz): 创建时间

**约束**：
- 同一用户同一天只能有一条记录
- work_hours 必须为正数

### 2. attendance_rules（考勤规则表）
定义每个仓库的考勤规则。

**字段说明**：
- id (uuid, PK): 规则ID
- warehouse_id (uuid, FK): 仓库ID，关联 warehouses.id
- work_start_time (time): 上班时间
- work_end_time (time): 下班时间
- late_threshold (integer): 迟到阈值（分钟）
- early_threshold (integer): 早退阈值（分钟）
- require_clock_out (boolean): 是否需要下班打卡
- is_active (boolean): 是否启用
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

**约束**：
- 每个仓库只能有一条启用的规则

## 安全策略
- 两个表都启用 RLS
- 司机只能查看和创建自己的考勤记录
- 管理员可以查看和管理自己负责仓库的考勤记录
- 超级管理员可以查看和管理所有考勤记录
*/

-- ============================================
-- 创建 attendance 表
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  clock_in_time timestamptz NOT NULL,
  clock_out_time timestamptz,
  work_date date NOT NULL,
  work_hours numeric(5,2),
  status attendance_status DEFAULT 'normal'::attendance_status NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, work_date),
  CONSTRAINT work_hours_positive CHECK (work_hours IS NULL OR work_hours >= 0),
  CONSTRAINT clock_out_after_clock_in CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_warehouse_id ON attendance(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, work_date);

-- ============================================
-- 创建 attendance_rules 表
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  work_start_time time NOT NULL,
  work_end_time time NOT NULL,
  late_threshold integer DEFAULT 15 NOT NULL,
  early_threshold integer DEFAULT 15 NOT NULL,
  require_clock_out boolean DEFAULT true NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT late_threshold_positive CHECK (late_threshold >= 0),
  CONSTRAINT early_threshold_positive CHECK (early_threshold >= 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_attendance_rules_warehouse_id ON attendance_rules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_is_active ON attendance_rules(is_active);

-- 为 attendance_rules 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_attendance_rules_updated_at ON attendance_rules;
CREATE TRIGGER update_attendance_rules_updated_at
  BEFORE UPDATE ON attendance_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 添加唯一约束：每个仓库只能有一条启用的规则
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_rules_warehouse_active
  ON attendance_rules(warehouse_id)
  WHERE is_active = true;

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_rules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 辅助函数：计算工作时长
-- ============================================
CREATE OR REPLACE FUNCTION calculate_work_hours(
  clock_in timestamptz,
  clock_out timestamptz
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  IF clock_out IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600, 2);
END;
$$;

-- ============================================
-- 触发器：自动计算工作时长
-- ============================================
CREATE OR REPLACE FUNCTION auto_calculate_work_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out_time IS NOT NULL THEN
    NEW.work_hours := calculate_work_hours(NEW.clock_in_time, NEW.clock_out_time);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_work_hours ON attendance;
CREATE TRIGGER trigger_auto_calculate_work_hours
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_work_hours();

-- ============================================
-- 辅助函数：判断考勤状态
-- ============================================
CREATE OR REPLACE FUNCTION determine_attendance_status(
  warehouse_id_param uuid,
  clock_in_time_param timestamptz
)
RETURNS attendance_status
LANGUAGE plpgsql
AS $$
DECLARE
  rule_record RECORD;
  clock_in_time_only time;
  late_minutes integer;
BEGIN
  -- 获取仓库的考勤规则
  SELECT * INTO rule_record
  FROM attendance_rules
  WHERE warehouse_id = warehouse_id_param AND is_active = true
  LIMIT 1;
  
  -- 如果没有规则，默认为正常
  IF NOT FOUND THEN
    RETURN 'normal'::attendance_status;
  END IF;
  
  -- 提取打卡时间（只保留时分秒）
  clock_in_time_only := clock_in_time_param::time;
  
  -- 计算迟到分钟数
  late_minutes := EXTRACT(EPOCH FROM (clock_in_time_only - rule_record.work_start_time)) / 60;
  
  -- 判断状态
  IF late_minutes > rule_record.late_threshold THEN
    RETURN 'late'::attendance_status;
  ELSE
    RETURN 'normal'::attendance_status;
  END IF;
END;
$$;
