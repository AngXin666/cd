/*
# 简化考勤系统 - 移除GPS定位功能

## 1. 修改 warehouses 表
- 删除 `latitude` 字段
- 删除 `longitude` 字段
- 删除 `radius` 字段
- 删除 `address` 字段（不再需要地址）

## 2. 修改 attendance_rules 表
- 添加 `require_clock_out` 字段 - 是否需要打下班卡

## 3. 修改 attendance_records 表
- 删除 `clock_in_location` 字段
- 删除 `clock_in_latitude` 字段
- 删除 `clock_in_longitude` 字段
- 删除 `clock_out_location` 字段
- 删除 `clock_out_latitude` 字段
- 删除 `clock_out_longitude` 字段

## 4. 清理旧数据
- 删除现有的示例仓库数据
- 插入新的简化示例数据

## 5. 说明
- 打卡不再需要GPS定位
- 仓库只需要名称
- 考勤规则只需要时间设置和是否需要下班打卡
*/

-- 1. 删除 warehouses 表的GPS相关字段
ALTER TABLE warehouses DROP COLUMN IF EXISTS latitude;
ALTER TABLE warehouses DROP COLUMN IF EXISTS longitude;
ALTER TABLE warehouses DROP COLUMN IF EXISTS radius;
ALTER TABLE warehouses DROP COLUMN IF EXISTS address;

-- 2. 为 attendance_rules 表添加是否需要下班打卡字段
ALTER TABLE attendance_rules ADD COLUMN IF NOT EXISTS require_clock_out boolean NOT NULL DEFAULT true;

-- 3. 删除 attendance_records 表的GPS相关字段
ALTER TABLE attendance_records DROP COLUMN IF EXISTS clock_in_location;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS clock_in_latitude;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS clock_in_longitude;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS clock_out_location;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS clock_out_latitude;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS clock_out_longitude;

-- 4. 清理旧数据并插入新的示例数据
DELETE FROM attendance_rules;
DELETE FROM warehouses;

-- 插入新的简化仓库数据
INSERT INTO warehouses (name, is_active)
VALUES 
  ('总部仓库', true),
  ('东区仓库', true),
  ('西区仓库', true)
ON CONFLICT DO NOTHING;

-- 为示例仓库创建考勤规则
INSERT INTO attendance_rules (warehouse_id, work_start_time, work_end_time, late_threshold, early_threshold, require_clock_out, is_active)
SELECT id, '09:00:00', '18:00:00', 15, 15, true, true
FROM warehouses
WHERE name = '总部仓库';

INSERT INTO attendance_rules (warehouse_id, work_start_time, work_end_time, late_threshold, early_threshold, require_clock_out, is_active)
SELECT id, '08:00:00', '17:00:00', 10, 10, true, true
FROM warehouses
WHERE name = '东区仓库';

INSERT INTO attendance_rules (warehouse_id, work_start_time, work_end_time, late_threshold, early_threshold, require_clock_out, is_active)
SELECT id, '09:30:00', '18:30:00', 20, 20, false, true
FROM warehouses
WHERE name = '西区仓库';
