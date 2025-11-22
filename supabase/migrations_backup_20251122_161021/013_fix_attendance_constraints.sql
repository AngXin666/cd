/*
# 修复考勤打卡约束和规则

## 1. 修改内容

### attendance_records 表
- 添加唯一约束：确保每个用户每天只能有一条打卡记录
- 约束名称：`unique_user_work_date`
- 约束字段：`(user_id, work_date)`

### attendance_rules 表
- 添加字段：`require_clock_out` (boolean) - 是否需要打下班卡
- 默认值：true（需要打下班卡）

## 2. 目的
- 防止司机在同一天重复打卡
- 支持配置是否需要打下班卡
- 数据库层面保证数据完整性

## 3. 注意事项
- 如果已存在重复数据，需要先清理
- 唯一约束会在INSERT时自动检查
*/

-- 1. 清理可能存在的重复数据（保留最早的记录）
DELETE FROM attendance_records a
USING attendance_records b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.work_date = b.work_date;

-- 2. 为 attendance_records 表添加唯一约束
ALTER TABLE attendance_records
ADD CONSTRAINT unique_user_work_date UNIQUE (user_id, work_date);

-- 3. 为 attendance_rules 表添加 require_clock_out 字段
ALTER TABLE attendance_rules
ADD COLUMN IF NOT EXISTS require_clock_out boolean NOT NULL DEFAULT true;

-- 4. 更新现有记录的 require_clock_out 字段（默认都需要打下班卡）
UPDATE attendance_rules
SET require_clock_out = true
WHERE require_clock_out IS NULL;
