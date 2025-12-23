/*
# 删除所有引用 profiles 表的旧对象

## 问题描述
- 发现多个旧 schema 中有 `profiles` 表及其相关对象
- 这些对象来自旧的系统架构（多用户系统）
- 导致更新操作时报错：relation "profiles" does not exist
- 需要全面清理所有相关对象

## 影响范围
- 无法更新仓库信息
- 可能影响其他功能模块
- 系统不稳定

## 修复方案
按顺序删除所有旧 schema 中的对象：
1. 删除 profiles 表的 RLS 策略
2. 删除引用 profiles 表的函数
3. 删除 profiles 表本身（如果存在）

## 涉及的 schema
- test_notifications
- dc1fd05e-a692-49f9-a71f-2b356866289e
- 其他旧 schema
*/

-- ============================================
-- 步骤 1: 删除 profiles 表的 RLS 策略
-- ============================================

-- test_notifications schema
DROP POLICY IF EXISTS "查看用户" ON test_notifications.profiles;
DROP POLICY IF EXISTS "插入用户" ON test_notifications.profiles;
DROP POLICY IF EXISTS "更新用户" ON test_notifications.profiles;
DROP POLICY IF EXISTS "删除用户" ON test_notifications.profiles;

-- dc1fd05e-a692-49f9-a71f-2b356866289e schema
DROP POLICY IF EXISTS "查看用户" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".profiles;
DROP POLICY IF EXISTS "插入用户" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".profiles;
DROP POLICY IF EXISTS "更新用户" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".profiles;
DROP POLICY IF EXISTS "删除用户" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".profiles;

-- ============================================
-- 步骤 2: 删除引用 profiles 表的函数
-- ============================================

-- test_notifications schema
DROP FUNCTION IF EXISTS test_notifications.can_send_notification(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS test_notifications.can_manage_user(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS test_notifications.can_view_user(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS test_notifications.has_full_permission(UUID) CASCADE;

-- dc1fd05e-a692-49f9-a71f-2b356866289e schema
DROP FUNCTION IF EXISTS "dc1fd05e-a692-49f9-a71f-2b356866289e".can_send_notification(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS "dc1fd05e-a692-49f9-a71f-2b356866289e".can_manage_user(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS "dc1fd05e-a692-49f9-a71f-2b356866289e".can_view_user(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS "dc1fd05e-a692-49f9-a71f-2b356866289e".has_full_permission(UUID) CASCADE;

-- 其他旧 schema
DROP FUNCTION IF EXISTS "027de4be-45a6-48bd-83d5-cdf29c817d52".can_send_notification(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS "319eecc4-3928-41b9-b4a2-ca20c8ba5e23".can_send_notification(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS "97535381-0b2f-4734-9d04-f888cab62e79".can_send_notification(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS "9da192ed-9021-4ac0-8e5d-e050d29dd265".can_send_notification(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS tenant_test1.can_send_notification(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS tenant_test2.can_send_notification(UUID, UUID) CASCADE;

-- ============================================
-- 步骤 3: 删除 profiles 表（如果存在）
-- ============================================

-- test_notifications schema
DROP TABLE IF EXISTS test_notifications.profiles CASCADE;

-- dc1fd05e-a692-49f9-a71f-2b356866289e schema
DROP TABLE IF EXISTS "dc1fd05e-a692-49f9-a71f-2b356866289e".profiles CASCADE;