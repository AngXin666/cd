/*
# 修复司机端考勤规则访问权限

## 问题描述
司机端无法获取考勤规则，导致无法打卡。

## 根本原因
`attendance_rules` 表的 RLS 策略中缺少允许司机查看考勤规则的策略。
当前只有管理员和超级管理员可以查看考勤规则。

## 解决方案
添加 RLS 策略，允许司机查看他们被分配的仓库的考勤规则。

## 变更内容
1. 添加策略：允许司机查看他们被分配的仓库的启用考勤规则
2. 添加策略：允许司机查看他们被分配的仓库信息（driver_warehouses 表）

## 安全性
- 司机只能查看他们被分配的仓库的考勤规则
- 司机只能查看启用状态（is_active = true）的规则
- 司机无法修改或删除考勤规则
*/

-- 1. 添加策略：允许司机查看他们被分配的仓库的考勤规则
CREATE POLICY "Drivers can view attendance rules for their warehouses" ON attendance_rules
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 
      FROM driver_warehouses dw
      WHERE dw.driver_id = auth.uid()
      AND dw.warehouse_id = attendance_rules.warehouse_id
    )
  );

-- 2. 确保 driver_warehouses 表启用了 RLS
ALTER TABLE driver_warehouses ENABLE ROW LEVEL SECURITY;

-- 3. 添加策略：允许司机查看他们自己的仓库分配记录
DROP POLICY IF EXISTS "Drivers can view their own warehouse assignments" ON driver_warehouses;
CREATE POLICY "Drivers can view their own warehouse assignments" ON driver_warehouses
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- 4. 添加策略：允许管理员查看他们管理的仓库的司机分配
DROP POLICY IF EXISTS "Managers can view driver assignments for their warehouses" ON driver_warehouses;
CREATE POLICY "Managers can view driver assignments for their warehouses" ON driver_warehouses
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

-- 5. 添加策略：允许超级管理员完全访问 driver_warehouses 表
DROP POLICY IF EXISTS "Super admins have full access to driver warehouses" ON driver_warehouses;
CREATE POLICY "Super admins have full access to driver warehouses" ON driver_warehouses
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
