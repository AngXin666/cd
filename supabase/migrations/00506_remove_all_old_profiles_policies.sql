/*
# 删除所有引用 profiles 表的旧 RLS 策略

## 问题描述
- 多个表有旧的 RLS 策略引用了不存在的 `profiles` 表
- 这些策略来自旧的系统架构（多用户系统）
- 导致更新操作时报错：relation "profiles" does not exist
- 影响仓库、考勤、请假、计件、车辆等多个功能

## 影响范围
- 无法更新仓库信息
- 可能影响考勤管理
- 可能影响请假申请
- 可能影响计件记录
- 可能影响车辆管理

## 修复方案
删除所有旧 schema 中引用 profiles 表的 RLS 策略：
- test_notifications schema 中的所有旧策略
- dc1fd05e-a692-49f9-a71f-2b356866289e schema 中的所有旧策略

## 需要删除的策略

### test_notifications schema
- attendance 表：查看考勤、管理考勤
- leave_requests 表：查看请假申请、审批请假申请
- piecework_records 表：查看计件记录、管理计件记录
- vehicles 表：查看车辆、管理车辆

### dc1fd05e-a692-49f9-a71f-2b356866289e schema
- attendance 表：查看考勤、管理考勤
- leave_requests 表：查看请假申请、审批请假申请
- piecework_records 表：查看计件记录、管理计件记录
- vehicles 表：查看车辆、管理车辆

## 保留的策略
- public schema 中的所有新策略（使用 user_roles 表）
*/

-- ============================================
-- 删除 test_notifications schema 中的旧策略
-- ============================================

-- attendance 表
DROP POLICY IF EXISTS "查看考勤" ON test_notifications.attendance;
DROP POLICY IF EXISTS "管理考勤" ON test_notifications.attendance;

-- leave_requests 表
DROP POLICY IF EXISTS "查看请假申请" ON test_notifications.leave_requests;
DROP POLICY IF EXISTS "审批请假申请" ON test_notifications.leave_requests;

-- piecework_records 表
DROP POLICY IF EXISTS "查看计件记录" ON test_notifications.piecework_records;
DROP POLICY IF EXISTS "管理计件记录" ON test_notifications.piecework_records;

-- vehicles 表
DROP POLICY IF EXISTS "查看车辆" ON test_notifications.vehicles;
DROP POLICY IF EXISTS "管理车辆" ON test_notifications.vehicles;

-- ============================================
-- 删除 dc1fd05e-a692-49f9-a71f-2b356866289e schema 中的旧策略
-- ============================================

-- attendance 表
DROP POLICY IF EXISTS "查看考勤" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".attendance;
DROP POLICY IF EXISTS "管理考勤" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".attendance;

-- leave_requests 表
DROP POLICY IF EXISTS "查看请假申请" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".leave_requests;
DROP POLICY IF EXISTS "审批请假申请" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".leave_requests;

-- piecework_records 表
DROP POLICY IF EXISTS "查看计件记录" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".piecework_records;
DROP POLICY IF EXISTS "管理计件记录" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".piecework_records;

-- vehicles 表
DROP POLICY IF EXISTS "查看车辆" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".vehicles;
DROP POLICY IF EXISTS "管理车辆" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".vehicles;