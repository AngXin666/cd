/*
# 重新创建考勤规则表

## 问题描述
- 在单用户系统迁移过程中，`attendance_rules` 表被删除
- 但代码中仍在使用这个表来存储每个仓库的考勤规则
- 导致所有与考勤规则相关的功能失效

## 表结构说明
- `attendance_rules` 表用于存储每个仓库的考勤规则
- 包含打卡时间、迟到阈值、早退阈值等配置
- 每个仓库可以有自己的考勤规则

## 字段说明
1. `id` - 主键，UUID
2. `warehouse_id` - 仓库ID，关联到 warehouses 表
3. `clock_in_time` - 上班打卡时间（格式：HH:MM）
4. `clock_out_time` - 下班打卡时间（格式：HH:MM）
5. `late_threshold` - 迟到阈值（分钟）
6. `early_threshold` - 早退阈值（分钟）
7. `work_start_time` - 工作开始时间（格式：HH:MM）
8. `work_end_time` - 工作结束时间（格式：HH:MM）
9. `require_clock_out` - 是否需要下班打卡
10. `is_active` - 是否启用
11. `created_at` - 创建时间
12. `updated_at` - 更新时间

## RLS 策略
- 管理员（BOSS/MANAGER）可以查看、创建、更新、删除所有考勤规则
- 司机只能查看考勤规则，不能修改
*/

-- 创建考勤规则表
CREATE TABLE IF NOT EXISTS attendance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL,
  clock_in_time TEXT NOT NULL,           -- 上班打卡时间（HH:MM）
  clock_out_time TEXT NOT NULL,          -- 下班打卡时间（HH:MM）
  late_threshold INTEGER DEFAULT 0,      -- 迟到阈值（分钟）
  early_threshold INTEGER DEFAULT 0,     -- 早退阈值（分钟）
  work_start_time TEXT,                  -- 工作开始时间（HH:MM）
  work_end_time TEXT,                    -- 工作结束时间（HH:MM）
  require_clock_out BOOLEAN DEFAULT true, -- 是否需要下班打卡
  is_active BOOLEAN DEFAULT true,        -- 是否启用
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 约束：每个仓库只能有一条考勤规则
  CONSTRAINT unique_warehouse_rule UNIQUE (warehouse_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_attendance_rules_warehouse_id ON attendance_rules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_is_active ON attendance_rules(is_active);

-- 创建更新时间触发器
CREATE TRIGGER update_attendance_rules_updated_at
  BEFORE UPDATE ON attendance_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 启用 RLS
ALTER TABLE attendance_rules ENABLE ROW LEVEL SECURITY;

-- RLS 策略：管理员可以查看所有考勤规则
CREATE POLICY "管理员可以查看所有考勤规则" ON attendance_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- RLS 策略：管理员可以创建考勤规则
CREATE POLICY "管理员可以创建考勤规则" ON attendance_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- RLS 策略：管理员可以更新考勤规则
CREATE POLICY "管理员可以更新考勤规则" ON attendance_rules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- RLS 策略：管理员可以删除考勤规则
CREATE POLICY "管理员可以删除考勤规则" ON attendance_rules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );

-- RLS 策略：司机可以查看自己仓库的考勤规则
CREATE POLICY "司机可以查看自己仓库的考勤规则" ON attendance_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'DRIVER'::user_role
    )
    AND EXISTS (
      SELECT 1 FROM warehouse_assignments
      WHERE warehouse_assignments.user_id = auth.uid()
      AND warehouse_assignments.warehouse_id = attendance_rules.warehouse_id
    )
  );