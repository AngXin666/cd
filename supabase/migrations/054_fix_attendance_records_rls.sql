/*
# 修复 attendance_records 表的 RLS 启用状态

## 问题
attendance_records 表虽然定义了9个RLS策略，但表本身未启用RLS，导致：
- 策略不生效
- 租户间考勤数据可能泄露
- 未授权用户可能访问其他租户的考勤记录

## 解决方案
启用 RLS（策略已经存在，只需要启用表的RLS）

## 影响
- 修复后，已定义的RLS策略将生效
- 用户只能访问自己租户的考勤数据
*/

-- 启用 RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 添加注释
COMMENT ON TABLE attendance_records IS '考勤记录表 - 已启用RLS租户隔离';
