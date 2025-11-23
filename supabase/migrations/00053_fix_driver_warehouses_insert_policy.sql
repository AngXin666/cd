
/*
# 修复 driver_warehouses 表的插入权限

## 问题描述
超级管理员无法插入 driver_warehouses 记录，错误信息：
"new row violates row-level security policy for table driver_warehouses"

## 问题原因
现有的 RLS 策略 "Super admins can manage all driver warehouses" 只设置了 USING 子句，
没有设置 WITH CHECK 子句。在 PostgreSQL 中：
- USING 子句用于 SELECT、UPDATE、DELETE 操作
- WITH CHECK 子句用于 INSERT 和 UPDATE 操作

## 修复方案
重新创建超级管理员的策略，同时设置 USING 和 WITH CHECK 子句。

## 安全性说明
- 超级管理员应该有完全的权限管理 driver_warehouses 表
- 使用 is_super_admin() 函数验证用户角色
- 符合最小权限原则：只有超级管理员才能管理司机仓库分配
*/

-- 删除旧的策略
DROP POLICY IF EXISTS "Super admins can manage all driver warehouses" ON driver_warehouses;

-- 创建新的策略，同时设置 USING 和 WITH CHECK
CREATE POLICY "Super admins can manage all driver warehouses"
ON driver_warehouses
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));
