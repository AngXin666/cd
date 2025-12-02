/*
# 修复核心权限表RLS策略以适配新权限结构

## 功能描述
更新核心权限管理表的RLS策略，使其适配新的权限结构（基于 user_roles 表）

## 修改内容

### 1. user_roles - 用户角色表
- 老板可以查看/管理所有用户角色
- 车队长可以查看/管理其管理仓库的用户角色
- 所有用户可以查看自己的角色

### 2. warehouse_assignments - 仓库分配表
- 老板可以查看/管理所有仓库分配
- 车队长可以查看/管理其管理仓库的分配
- 所有用户可以查看自己的仓库分配

## 安全性
- 使用新的权限检查函数（is_boss_v2, is_manager_v2, is_manager_of_warehouse_v2）
- 基于 user_roles 表进行角色验证
- 基于 warehouse_assignments 表进行仓库权限验证

## 注意
- 这两个表是权限系统的核心表，必须确保策略正确
- 所有用户都需要能够查看自己的角色和仓库分配
*/

-- ============================================
-- 1. 更新 user_roles 表的RLS策略
-- ============================================

-- 1.1 删除旧策略
DROP POLICY IF EXISTS "BOSS 可以查看所有角色" ON user_roles;
DROP POLICY IF EXISTS "用户可以查看自己的角色" ON user_roles;
DROP POLICY IF EXISTS "BOSS 可以管理角色" ON user_roles;

-- 1.2 创建新的查看策略
CREATE POLICY "老板可以查看所有用户角色"
ON user_roles FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的用户角色"
ON user_roles FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa1
    JOIN warehouse_assignments wa2 ON wa1.warehouse_id = wa2.warehouse_id
    WHERE wa1.user_id = auth.uid() 
    AND wa2.user_id = user_roles.user_id
  )
);

CREATE POLICY "用户可以查看自己的角色"
ON user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 1.3 创建新的创建策略
CREATE POLICY "老板可以创建用户角色"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库的用户创建角色"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa1
    JOIN warehouse_assignments wa2 ON wa1.warehouse_id = wa2.warehouse_id
    WHERE wa1.user_id = auth.uid() 
    AND wa2.user_id = user_roles.user_id
  )
);

-- 1.4 创建新的修改策略
CREATE POLICY "老板可以修改所有用户角色"
ON user_roles FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以修改其管理仓库的用户角色"
ON user_roles FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa1
    JOIN warehouse_assignments wa2 ON wa1.warehouse_id = wa2.warehouse_id
    WHERE wa1.user_id = auth.uid() 
    AND wa2.user_id = user_roles.user_id
  )
);

-- 1.5 创建新的删除策略
CREATE POLICY "老板可以删除用户角色"
ON user_roles FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的用户角色"
ON user_roles FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa1
    JOIN warehouse_assignments wa2 ON wa1.warehouse_id = wa2.warehouse_id
    WHERE wa1.user_id = auth.uid() 
    AND wa2.user_id = user_roles.user_id
  )
);

-- ============================================
-- 2. 更新 warehouse_assignments 表的RLS策略
-- ============================================

-- 2.1 删除旧策略
DROP POLICY IF EXISTS "BOSS可以查看所有仓库分配" ON warehouse_assignments;
DROP POLICY IF EXISTS "MANAGER（完整控制权）可以查看所有仓库分配" ON warehouse_assignments;
DROP POLICY IF EXISTS "PEER_ADMIN（完整控制权）可以查看所有仓库分配" ON warehouse_assignments;
DROP POLICY IF EXISTS "new_users_view_own_warehouse_assignments" ON warehouse_assignments;
DROP POLICY IF EXISTS "用户可以查看自己的仓库分配" ON warehouse_assignments;
DROP POLICY IF EXISTS "调度（完整控制权）可以查看所有仓库分配" ON warehouse_assignments;
DROP POLICY IF EXISTS "调度（完整控制权）可以管理仓库分配" ON warehouse_assignments;
DROP POLICY IF EXISTS "所有人可以查看仓库分配" ON warehouse_assignments;
DROP POLICY IF EXISTS "BOSS 和 DISPATCHER 可以管理仓库分配" ON warehouse_assignments;

-- 2.2 创建新的查看策略
CREATE POLICY "老板可以查看所有仓库分配"
ON warehouse_assignments FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的分配"
ON warehouse_assignments FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND 
  is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "用户可以查看自己的仓库分配"
ON warehouse_assignments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2.3 创建新的创建策略
CREATE POLICY "老板可以创建仓库分配"
ON warehouse_assignments FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库创建分配"
ON warehouse_assignments FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) AND 
  is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

-- 2.4 创建新的修改策略
CREATE POLICY "老板可以修改所有仓库分配"
ON warehouse_assignments FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以修改其管理仓库的分配"
ON warehouse_assignments FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND 
  is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

-- 2.5 创建新的删除策略
CREATE POLICY "老板可以删除仓库分配"
ON warehouse_assignments FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的分配"
ON warehouse_assignments FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND 
  is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);
