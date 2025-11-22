/*
# 修复超级管理员无法插入 driver_warehouses 记录的问题

## 问题描述
超级管理员在分配仓库给司机时，遇到 RLS 策略错误：
"new row violates row-level security policy for table driver_warehouses"

## 根本原因
虽然已经有 "Super admins have full access to driver warehouses" 策略，
但可能存在策略冲突或策略顺序问题。

## 解决方案
1. 删除所有现有的 driver_warehouses 表的 RLS 策略
2. 重新创建清晰、无冲突的策略
3. 确保超级管理员拥有完整的 INSERT、UPDATE、DELETE 权限

## 安全性
- 超级管理员：完整的增删改查权限
- 普通管理员：只能管理其负责仓库的司机分配
- 司机：只能查看自己的仓库分配
*/

-- 1. 删除所有现有策略
DROP POLICY IF EXISTS "超级管理员可以管理所有司机仓库关联" ON driver_warehouses;
DROP POLICY IF EXISTS "超级管理员可以管理司机仓库关联" ON driver_warehouses;
DROP POLICY IF EXISTS "超级管理员拥有完整权限" ON driver_warehouses;
DROP POLICY IF EXISTS "司机可以查看自己的仓库分配" ON driver_warehouses;
DROP POLICY IF EXISTS "普通管理员可以管理其负责仓库的司机分配" ON driver_warehouses;
DROP POLICY IF EXISTS "Drivers can view their own warehouse assignments" ON driver_warehouses;
DROP POLICY IF EXISTS "Managers can view driver assignments for their warehouses" ON driver_warehouses;
DROP POLICY IF EXISTS "Super admins have full access to driver warehouses" ON driver_warehouses;

-- 2. 确保表启用了 RLS
ALTER TABLE driver_warehouses ENABLE ROW LEVEL SECURITY;

-- 3. 创建新的策略

-- 3.1 超级管理员：完整权限（SELECT, INSERT, UPDATE, DELETE）
CREATE POLICY "super_admin_full_access" ON driver_warehouses
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- 3.2 普通管理员：查看其负责仓库的司机分配
CREATE POLICY "manager_select_own_warehouses" ON driver_warehouses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM manager_warehouses mw
      WHERE mw.manager_id = auth.uid()
      AND mw.warehouse_id = driver_warehouses.warehouse_id
    )
  );

-- 3.3 普通管理员：插入其负责仓库的司机分配
CREATE POLICY "manager_insert_own_warehouses" ON driver_warehouses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM manager_warehouses mw
      WHERE mw.manager_id = auth.uid()
      AND mw.warehouse_id = driver_warehouses.warehouse_id
    )
  );

-- 3.4 普通管理员：删除其负责仓库的司机分配
CREATE POLICY "manager_delete_own_warehouses" ON driver_warehouses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM manager_warehouses mw
      WHERE mw.manager_id = auth.uid()
      AND mw.warehouse_id = driver_warehouses.warehouse_id
    )
  );

-- 3.5 司机：查看自己的仓库分配
CREATE POLICY "driver_select_own_assignments" ON driver_warehouses
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());
