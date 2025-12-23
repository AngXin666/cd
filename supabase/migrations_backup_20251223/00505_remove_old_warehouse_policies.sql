/*
# 删除 warehouses 表的旧 RLS 策略

## 问题描述
- `warehouses` 表有旧的 RLS 策略引用了不存在的 `profiles` 表
- 导致更新仓库时报错：relation "profiles" does not exist
- 这些策略来自旧的系统架构，需要清理

## 影响范围
- 无法更新仓库信息
- 仓库管理功能受影响

## 修复方案
1. 删除引用 `profiles` 表的旧策略
2. 保留新的策略（使用 `user_roles` 表）

## 需要删除的策略
- test_notifications schema 中的 "查看仓库" 策略
- test_notifications schema 中的 "管理仓库" 策略
- dc1fd05e-a692-49f9-a71f-2b356866289e schema 中的 "查看仓库" 策略
- dc1fd05e-a692-49f9-a71f-2b356866289e schema 中的 "管理仓库" 策略

## 保留的策略
- public schema 中的 "All authenticated users can view warehouses" 策略
- public schema 中的 "Admins can manage warehouses" 策略
*/

-- 删除 test_notifications schema 中的旧策略
DROP POLICY IF EXISTS "查看仓库" ON test_notifications.warehouses;
DROP POLICY IF EXISTS "管理仓库" ON test_notifications.warehouses;

-- 删除 dc1fd05e-a692-49f9-a71f-2b356866289e schema 中的旧策略
DROP POLICY IF EXISTS "查看仓库" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".warehouses;
DROP POLICY IF EXISTS "管理仓库" ON "dc1fd05e-a692-49f9-a71f-2b356866289e".warehouses;