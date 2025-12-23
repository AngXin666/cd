/*
# 修复超级管理员无法读取仓库分配的问题

## ⚠️ 警告：此迁移已被 00147 替代
此迁移存在严重的安全问题，破坏了租户隔离。
请使用 00147_fix_super_admin_warehouse_access_with_tenant_isolation.sql 替代。

## 问题
超级管理员在用户管理页面无法读取司机和管理员的仓库分配信息。

## 原因
现有的 RLS 策略中：
1. driver_warehouses 表：管理员只能查看自己管理的仓库中的司机分配
2. manager_warehouses 表：管理员只能查看自己的仓库分配

这些策略限制了超级管理员查看所有用户的仓库分配。

## 错误的解决方案（已废弃）
为 driver_warehouses 和 manager_warehouses 表添加超级管理员的查看权限策略。

## 问题
此方案破坏了租户隔离，导致不同租户的超级管理员可以看到其他租户的数据。

## 正确的解决方案
请参考 00147_fix_super_admin_warehouse_access_with_tenant_isolation.sql
*/

-- ⚠️ 此迁移已被废弃，策略已在 00147 中删除并重新创建
-- 以下代码仅作为历史记录保留

-- 为 driver_warehouses 表添加超级管理员查看权限（错误：缺少租户隔离）
-- CREATE POLICY "Super admins can view all driver warehouse assignments"
-- ON driver_warehouses
-- FOR SELECT
-- TO authenticated
-- USING (is_super_admin(auth.uid()));

-- 为 manager_warehouses 表添加超级管理员查看权限（错误：缺少租户隔离）
-- CREATE POLICY "Super admins can view all manager warehouse assignments"
-- ON manager_warehouses
-- FOR SELECT
-- TO authenticated
-- USING (is_super_admin(auth.uid()));
