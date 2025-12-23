/*
# 修复核心业务功能RLS策略以适配新权限结构

## 功能描述
更新核心业务功能相关表的RLS策略，使其适配新的权限结构（基于 user_roles 表）

## 修改内容

### 1. vehicles - 车辆管理表
- 老板可以查看/管理所有车辆
- 车队长可以查看/管理其管理仓库的车辆
- 司机可以查看分配给自己的车辆

### 2. warehouses - 仓库管理表
- 老板可以查看/管理所有仓库
- 车队长可以查看其管理的仓库
- 司机可以查看分配给自己的仓库

### 3. leave_applications - 请假申请表
- 老板可以查看/审批所有请假申请
- 车队长可以查看/审批其管理仓库的司机的请假申请
- 司机可以查看/创建/取消自己的请假申请

### 4. resignation_applications - 离职申请表
- 老板可以查看/审批所有离职申请
- 车队长可以查看/审批其管理仓库的司机的离职申请
- 司机可以查看/创建自己的离职申请

## 安全性
- 使用新的权限检查函数（is_boss_v2, is_manager_v2, is_driver_v2, is_manager_of_warehouse_v2）
- 基于 user_roles 表进行角色验证
- 基于 warehouse_assignments 表进行仓库权限验证
*/

-- ============================================
-- 1. 更新 vehicles 表的RLS策略
-- ============================================

-- 1.1 删除旧策略
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "Super admins can manage all vehicles" ON vehicles;

-- 1.2 创建新的查看策略
CREATE POLICY "老板可以查看所有车辆"
ON vehicles FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的车辆"
ON vehicles FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "司机可以查看分配给自己的车辆"
ON vehicles FOR SELECT
TO authenticated
USING (auth.uid() = current_driver_id);

-- 1.3 创建新的创建策略
CREATE POLICY "老板可以创建车辆"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库创建车辆"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

-- 1.4 创建新的修改策略
CREATE POLICY "老板可以修改所有车辆"
ON vehicles FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以修改其管理仓库的车辆"
ON vehicles FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

-- 1.5 创建新的删除策略
CREATE POLICY "老板可以删除所有车辆"
ON vehicles FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的车辆"
ON vehicles FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

-- ============================================
-- 2. 更新 warehouses 表的RLS策略
-- ============================================

-- 2.1 删除旧策略
DROP POLICY IF EXISTS "Authenticated users can view active warehouses" ON warehouses;
DROP POLICY IF EXISTS "Super admins can manage all warehouses" ON warehouses;
DROP POLICY IF EXISTS "老板可以查看所有仓库" ON warehouses;
DROP POLICY IF EXISTS "老板可以管理所有仓库" ON warehouses;
DROP POLICY IF EXISTS "车队长可以查看其管理的仓库" ON warehouses;
DROP POLICY IF EXISTS "车队长可以管理其管理的仓库" ON warehouses;

-- 2.2 创建新的查看策略
CREATE POLICY "老板可以查看所有仓库"
ON warehouses FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理的仓库"
ON warehouses FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), id)
);

CREATE POLICY "司机可以查看分配给自己的仓库"
ON warehouses FOR SELECT
TO authenticated
USING (
  is_driver_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments
    WHERE user_id = auth.uid() AND warehouse_id = warehouses.id
  )
);

-- 2.3 创建新的管理策略（只有老板可以管理仓库）
CREATE POLICY "老板可以创建仓库"
ON warehouses FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

CREATE POLICY "老板可以修改所有仓库"
ON warehouses FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "老板可以删除所有仓库"
ON warehouses FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 3. 更新 leave_applications 表的RLS策略
-- ============================================

-- 3.1 删除旧策略
DROP POLICY IF EXISTS "Super admins can view all leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Managers can view leave applications in their warehouses" ON leave_applications;
DROP POLICY IF EXISTS "Users can view their own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can create their own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can cancel their own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Super admins can manage all leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Managers can approve leave applications in their warehouses" ON leave_applications;
DROP POLICY IF EXISTS "老板可以查看所有请假申请" ON leave_applications;
DROP POLICY IF EXISTS "老板可以审批所有请假申请" ON leave_applications;
DROP POLICY IF EXISTS "车队长可以查看所有请假申请" ON leave_applications;
DROP POLICY IF EXISTS "车队长可以审批所有请假申请" ON leave_applications;
DROP POLICY IF EXISTS "调度可以查看所有请假申请" ON leave_applications;

-- 3.2 创建新的查看策略
CREATE POLICY "老板可以查看所有请假申请"
ON leave_applications FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的请假申请"
ON leave_applications FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "司机可以查看自己的请假申请"
ON leave_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3.3 创建新的创建策略
CREATE POLICY "司机可以创建自己的请假申请"
ON leave_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_driver_v2(auth.uid()));

-- 3.4 创建新的修改策略
CREATE POLICY "司机可以取消自己的待审批请假申请"
ON leave_applications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending'::application_status)
WITH CHECK (status = 'cancelled'::application_status);

CREATE POLICY "车队长可以审批其管理仓库的请假申请"
ON leave_applications FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以审批所有请假申请"
ON leave_applications FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 3.5 创建新的删除策略
CREATE POLICY "老板可以删除所有请假申请"
ON leave_applications FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的请假申请"
ON leave_applications FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

-- ============================================
-- 4. 更新 resignation_applications 表的RLS策略
-- ============================================

-- 4.1 删除旧策略
DROP POLICY IF EXISTS "Super admins can view all resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Managers can view resignation applications in their warehouses" ON resignation_applications;
DROP POLICY IF EXISTS "Users can view their own resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Users can create their own resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Super admins can manage all resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Managers can approve resignation applications in their warehouses" ON resignation_applications;

-- 4.2 创建新的查看策略
CREATE POLICY "老板可以查看所有离职申请"
ON resignation_applications FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的离职申请"
ON resignation_applications FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "司机可以查看自己的离职申请"
ON resignation_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4.3 创建新的创建策略
CREATE POLICY "司机可以创建自己的离职申请"
ON resignation_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_driver_v2(auth.uid()));

-- 4.4 创建新的修改策略
CREATE POLICY "车队长可以审批其管理仓库的离职申请"
ON resignation_applications FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以审批所有离职申请"
ON resignation_applications FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 4.5 创建新的删除策略
CREATE POLICY "老板可以删除所有离职申请"
ON resignation_applications FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的离职申请"
ON resignation_applications FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);
