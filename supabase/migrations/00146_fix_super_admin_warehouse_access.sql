
/*
# 修复超级管理员无法读取仓库分配的问题

## 问题
超级管理员在用户管理页面无法读取司机和管理员的仓库分配信息。

## 原因
现有的 RLS 策略中：
1. driver_warehouses 表：管理员只能查看自己管理的仓库中的司机分配
2. manager_warehouses 表：管理员只能查看自己的仓库分配

这些策略限制了超级管理员查看所有用户的仓库分配。

## 解决方案
为 driver_warehouses 和 manager_warehouses 表添加超级管理员的查看权限策略。

## 影响范围
- driver_warehouses 表：新增超级管理员查看所有记录的策略
- manager_warehouses 表：新增超级管理员查看所有记录的策略
*/

-- 为 driver_warehouses 表添加超级管理员查看权限
CREATE POLICY "Super admins can view all driver warehouse assignments"
ON driver_warehouses
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 为 manager_warehouses 表添加超级管理员查看权限
CREATE POLICY "Super admins can view all manager warehouse assignments"
ON manager_warehouses
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));
