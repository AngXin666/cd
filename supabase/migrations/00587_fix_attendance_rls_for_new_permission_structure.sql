/*
# 修复考勤管理RLS策略以适配新权限结构

## 功能描述
更新考勤管理相关表的RLS策略，使其适配新的权限结构（基于 user_roles 表）

## 修改内容

### 1. 更新 attendance 表的RLS策略
- 老板可以查看/管理所有考勤记录
- 车队长可以查看/管理其管理仓库的考勤记录
- 司机可以查看/创建自己的考勤记录

### 2. 更新 attendance_rules 表的RLS策略
- 所有认证用户可以查看考勤规则
- 老板可以管理所有考勤规则

## 安全性
- 使用新的权限检查函数（is_boss_v2, is_manager_v2, is_manager_of_warehouse_v2）
- 基于 user_roles 表进行角色验证
- 基于 warehouse_assignments 表进行仓库权限验证
*/

-- ============================================
-- 1. 更新 attendance 表的RLS策略
-- ============================================

-- 1.1 删除旧策略
DROP POLICY IF EXISTS "Super admins can view all attendance" ON attendance;
DROP POLICY IF EXISTS "Managers can view attendance in their warehouses" ON attendance;
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can create their own attendance" ON attendance;
DROP POLICY IF EXISTS "Super admins can manage all attendance" ON attendance;
DROP POLICY IF EXISTS "Managers can manage attendance in their warehouses" ON attendance;

-- 1.2 创建新的查看策略
CREATE POLICY "老板可以查看所有考勤记录"
ON attendance FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的考勤记录"
ON attendance FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "司机可以查看自己的考勤记录"
ON attendance FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 1.3 创建新的创建策略
CREATE POLICY "司机可以创建自己的考勤记录"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_driver_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库的司机创建考勤记录"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以为任何司机创建考勤记录"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 1.4 创建新的修改策略
CREATE POLICY "司机可以修改自己的考勤记录"
ON attendance FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_driver_v2(auth.uid()));

CREATE POLICY "车队长可以修改其管理仓库的考勤记录"
ON attendance FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以修改所有考勤记录"
ON attendance FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 1.5 创建新的删除策略
CREATE POLICY "司机可以删除自己的考勤记录"
ON attendance FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND is_driver_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的考勤记录"
ON attendance FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以删除所有考勤记录"
ON attendance FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 2. 更新 attendance_rules 表的RLS策略
-- ============================================

-- 2.1 删除旧策略
DROP POLICY IF EXISTS "Authenticated users can view attendance rules" ON attendance_rules;
DROP POLICY IF EXISTS "Super admins can manage all attendance rules" ON attendance_rules;

-- 2.2 创建新的查看策略
CREATE POLICY "所有认证用户可以查看考勤规则"
ON attendance_rules FOR SELECT
TO authenticated
USING (true);

-- 2.3 创建新的管理策略
CREATE POLICY "老板可以管理所有考勤规则"
ON attendance_rules FOR ALL
TO authenticated
USING (is_boss_v2(auth.uid()));
