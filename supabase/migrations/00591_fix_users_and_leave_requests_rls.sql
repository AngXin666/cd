/*
# 修复用户和请假表RLS策略以适配新权限结构

## 功能描述
更新用户管理和请假申请表的RLS策略，使其适配新的权限结构（基于 user_roles 表）

## 修改内容

### 1. users - 用户表
- 老板可以查看/管理所有用户
- 车队长可以查看/管理其管理仓库的用户
- 司机可以查看/更新自己的信息

### 2. leave_requests - 请假申请表
- 老板可以查看/管理所有请假申请
- 车队长可以查看/管理其管理仓库的用户的请假申请
- 司机可以查看/创建自己的请假申请

## 安全性
- 使用新的权限检查函数（is_boss_v2, is_manager_v2, is_driver_v2, is_manager_of_warehouse_v2）
- 基于 user_roles 表进行角色验证
- 基于 warehouse_assignments 表进行仓库权限验证

## 注意
- users表是核心用户表，必须确保策略正确
- leave_requests表可能是leave_applications的另一个版本
*/

-- ============================================
-- 1. 更新 users 表的RLS策略
-- ============================================

-- 1.1 删除旧策略
DROP POLICY IF EXISTS "BOSS可以删除所有用户" ON users;
DROP POLICY IF EXISTS "BOSS可以插入用户" ON users;
DROP POLICY IF EXISTS "BOSS可以更新所有用户" ON users;
DROP POLICY IF EXISTS "BOSS可以查看所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER（仅查看权）可以查看所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER（完整控制权）可以删除用户" ON users;
DROP POLICY IF EXISTS "MANAGER（完整控制权）可以插入用户" ON users;
DROP POLICY IF EXISTS "MANAGER（完整控制权）可以更新所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER（完整控制权）可以查看所有用户" ON users;
DROP POLICY IF EXISTS "PEER_ADMIN（完整控制权）可以删除所有用户" ON users;
DROP POLICY IF EXISTS "PEER_ADMIN（完整控制权）可以插入用户" ON users;
DROP POLICY IF EXISTS "PEER_ADMIN（完整控制权）可以更新所有用户" ON users;
DROP POLICY IF EXISTS "PEER_ADMIN（完整控制权）可以查看所有用户" ON users;
DROP POLICY IF EXISTS "new_drivers_update_self" ON users;
DROP POLICY IF EXISTS "new_drivers_view_self" ON users;
DROP POLICY IF EXISTS "调度（仅查看权）可以查看所有用户" ON users;
DROP POLICY IF EXISTS "调度（完整控制权）可以删除用户" ON users;
DROP POLICY IF EXISTS "调度（完整控制权）可以插入用户" ON users;
DROP POLICY IF EXISTS "调度（完整控制权）可以更新所有用户" ON users;
DROP POLICY IF EXISTS "调度（完整控制权）可以查看所有用户" ON users;

-- 1.2 创建新的查看策略
CREATE POLICY "老板可以查看所有用户"
ON users FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的用户"
ON users FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa1
    JOIN warehouse_assignments wa2 ON wa1.warehouse_id = wa2.warehouse_id
    WHERE wa1.user_id = auth.uid() 
    AND wa2.user_id = users.id
  )
);

CREATE POLICY "用户可以查看自己的信息"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 1.3 创建新的创建策略
CREATE POLICY "老板可以创建用户"
ON users FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库创建用户"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid()
  )
);

-- 1.4 创建新的修改策略
CREATE POLICY "老板可以修改所有用户"
ON users FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以修改其管理仓库的用户"
ON users FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa1
    JOIN warehouse_assignments wa2 ON wa1.warehouse_id = wa2.warehouse_id
    WHERE wa1.user_id = auth.uid() 
    AND wa2.user_id = users.id
  )
);

CREATE POLICY "用户可以修改自己的信息"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 1.5 创建新的删除策略
CREATE POLICY "老板可以删除用户"
ON users FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的用户"
ON users FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa1
    JOIN warehouse_assignments wa2 ON wa1.warehouse_id = wa2.warehouse_id
    WHERE wa1.user_id = auth.uid() 
    AND wa2.user_id = users.id
  )
);

-- ============================================
-- 2. 更新 leave_requests 表的RLS策略
-- ============================================

-- 2.1 删除旧策略
DROP POLICY IF EXISTS "调度（仅查看权）可以查看所有请假申请" ON leave_requests;
DROP POLICY IF EXISTS "调度（完整控制权）可以查看所有请假申请" ON leave_requests;
DROP POLICY IF EXISTS "调度（完整控制权）可以管理请假申请" ON leave_requests;

-- 2.2 创建新的查看策略
CREATE POLICY "老板可以查看所有请假申请"
ON leave_requests FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的请假申请"
ON leave_requests FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() 
    AND wa.warehouse_id IN (
      SELECT warehouse_id FROM warehouse_assignments 
      WHERE user_id = leave_requests.user_id
    )
  )
);

CREATE POLICY "用户可以查看自己的请假申请"
ON leave_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2.3 创建新的创建策略
CREATE POLICY "用户可以创建自己的请假申请"
ON leave_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "老板可以创建请假申请"
ON leave_requests FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库的用户创建请假申请"
ON leave_requests FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() 
    AND wa.warehouse_id IN (
      SELECT warehouse_id FROM warehouse_assignments 
      WHERE user_id = leave_requests.user_id
    )
  )
);

-- 2.4 创建新的修改策略
CREATE POLICY "老板可以修改所有请假申请"
ON leave_requests FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以修改其管理仓库的请假申请"
ON leave_requests FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() 
    AND wa.warehouse_id IN (
      SELECT warehouse_id FROM warehouse_assignments 
      WHERE user_id = leave_requests.user_id
    )
  )
);

CREATE POLICY "用户可以修改自己的请假申请"
ON leave_requests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 2.5 创建新的删除策略
CREATE POLICY "老板可以删除请假申请"
ON leave_requests FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的请假申请"
ON leave_requests FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() 
    AND wa.warehouse_id IN (
      SELECT warehouse_id FROM warehouse_assignments 
      WHERE user_id = leave_requests.user_id
    )
  )
);

CREATE POLICY "用户可以删除自己的请假申请"
ON leave_requests FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
