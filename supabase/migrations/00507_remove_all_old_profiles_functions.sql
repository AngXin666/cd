/*
# 删除所有引用 profiles 表的旧函数

## 问题描述
- 发现多个旧 schema 中有引用 `profiles` 表的函数
- 这些函数来自旧的系统架构（多用户系统）
- 导致更新操作时报错：relation "profiles" does not exist
- 即使删除了 RLS 策略，函数仍然会被触发

## 影响范围
- 无法更新仓库信息
- 可能影响其他功能模块
- 系统不稳定

## 修复方案
删除所有旧 schema 中引用 profiles 表的函数：
- test_notifications schema 中的函数
- dc1fd05e-a692-49f9-a71f-2b356866289e schema 中的函数
- 其他旧 schema 中的函数

## 需要删除的函数
- can_send_notification
- can_manage_user
- can_view_user
- has_full_permission
*/

-- ============================================
-- 删除 test_notifications schema 中的旧函数
-- ============================================

DROP FUNCTION IF EXISTS test_notifications.can_send_notification(UUID, UUID);
DROP FUNCTION IF EXISTS test_notifications.can_manage_user(UUID, UUID);
DROP FUNCTION IF EXISTS test_notifications.can_view_user(UUID, UUID);
DROP FUNCTION IF EXISTS test_notifications.has_full_permission(UUID);

-- ============================================
-- 删除 dc1fd05e-a692-49f9-a71f-2b356866289e schema 中的旧函数
-- ============================================

DROP FUNCTION IF EXISTS "dc1fd05e-a692-49f9-a71f-2b356866289e".can_send_notification(UUID, UUID);
DROP FUNCTION IF EXISTS "dc1fd05e-a692-49f9-a71f-2b356866289e".can_manage_user(UUID, UUID);
DROP FUNCTION IF EXISTS "dc1fd05e-a692-49f9-a71f-2b356866289e".can_view_user(UUID, UUID);
DROP FUNCTION IF EXISTS "dc1fd05e-a692-49f9-a71f-2b356866289e".has_full_permission(UUID);

-- ============================================
-- 删除其他旧 schema 中的旧函数
-- ============================================

DROP FUNCTION IF EXISTS "027de4be-45a6-48bd-83d5-cdf29c817d52".can_send_notification(UUID, UUID);
DROP FUNCTION IF EXISTS "319eecc4-3928-41b9-b4a2-ca20c8ba5e23".can_send_notification(UUID, UUID);
DROP FUNCTION IF EXISTS "97535381-0b2f-4734-9d04-f888cab62e79".can_send_notification(UUID, UUID);
DROP FUNCTION IF EXISTS "9da192ed-9021-4ac0-8e5d-e050d29dd265".can_send_notification(UUID, UUID);
DROP FUNCTION IF EXISTS tenant_test1.can_send_notification(UUID, UUID);
DROP FUNCTION IF EXISTS tenant_test2.can_send_notification(UUID, UUID);