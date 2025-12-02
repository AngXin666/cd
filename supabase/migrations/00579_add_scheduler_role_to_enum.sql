/*
# 添加 SCHEDULER 角色到 user_role 枚举

## 功能描述
为 user_role 枚举类型添加 SCHEDULER 角色，支持调度角色的权限管理。

## 变更内容
1. 添加 SCHEDULER 到 user_role 枚举类型

## 注意事项
- 此操作不可回滚
- 添加后需要为调度用户分配 SCHEDULER 角色
*/

-- 添加 SCHEDULER 到 user_role 枚举
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SCHEDULER';