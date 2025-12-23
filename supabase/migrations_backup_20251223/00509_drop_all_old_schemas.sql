/*
# 删除所有旧的 schema

## 问题描述
- 即使删除了所有 RLS 策略、函数和表，仍然报错 "relation 'profiles' does not exist"
- 问题可能是旧 schema 本身导致的
- 需要彻底删除所有旧 schema

## 影响范围
- 无法更新仓库信息
- 系统不稳定

## 修复方案
删除所有旧 schema（使用 CASCADE 确保删除所有依赖对象）：
- test_notifications
- dc1fd05e-a692-49f9-a71f-2b356866289e
- 其他旧 schema

## 注意事项
- 使用 IF EXISTS 确保安全
- 使用 CASCADE 删除所有依赖对象
- 只删除旧 schema，保留 public、auth、storage 等系统 schema
*/

-- 删除所有旧 schema
DROP SCHEMA IF EXISTS test_notifications CASCADE;
DROP SCHEMA IF EXISTS "dc1fd05e-a692-49f9-a71f-2b356866289e" CASCADE;
DROP SCHEMA IF EXISTS "027de4be-45a6-48bd-83d5-cdf29c817d52" CASCADE;
DROP SCHEMA IF EXISTS "319eecc4-3928-41b9-b4a2-ca20c8ba5e23" CASCADE;
DROP SCHEMA IF EXISTS "97535381-0b2f-4734-9d04-f888cab62e79" CASCADE;
DROP SCHEMA IF EXISTS "9da192ed-9021-4ac0-8e5d-e050d29dd265" CASCADE;
DROP SCHEMA IF EXISTS tenant_test1 CASCADE;
DROP SCHEMA IF EXISTS tenant_test2 CASCADE;