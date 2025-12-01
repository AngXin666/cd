/*
# 修复管理员RLS策略

## 问题描述
发现多个表缺少管理员的RLS策略，导致BOSS和有完整控制权的PEER_ADMIN无法管理这些表。

## 修复内容
为以下表添加管理员的完整权限策略：
1. users表
2. user_roles表
3. warehouses表
4. warehouse_assignments表
5. vehicles表
6. attendance表
7. leave_applications表
8. resignation_applications表

## 权限说明
- BOSS：拥有所有权限
- PEER_ADMIN(完整控制权)：拥有所有权限
- PEER_ADMIN(仅查看权)：只能查看，不能修改

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. users表 - 添加管理员策略
-- ============================================

-- 管理员可以查看所有用户
CREATE POLICY "管理员可以查看所有用户" ON users
  FOR SELECT
  USING (is_admin(auth.uid()));

-- 管理员可以插入用户
CREATE POLICY "管理员可以插入用户" ON users
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以更新所有用户
CREATE POLICY "管理员可以更新所有用户" ON users
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以删除用户
CREATE POLICY "管理员可以删除用户" ON users
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- 2. user_roles表 - 添加管理员策略
-- ============================================

-- 管理员可以查看所有角色
CREATE POLICY "管理员可以查看所有角色" ON user_roles
  FOR SELECT
  USING (is_admin(auth.uid()));

-- 用户可以查看自己的角色
CREATE POLICY "用户可以查看自己的角色" ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 管理员可以插入角色
CREATE POLICY "管理员可以插入角色" ON user_roles
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以更新角色
CREATE POLICY "管理员可以更新角色" ON user_roles
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以删除角色
CREATE POLICY "管理员可以删除角色" ON user_roles
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- 3. warehouses表 - 添加管理员策略
-- ============================================

-- 管理员可以查看所有仓库
CREATE POLICY "管理员可以查看所有仓库" ON warehouses
  FOR SELECT
  USING (is_admin(auth.uid()));

-- 管理员可以插入仓库
CREATE POLICY "管理员可以插入仓库" ON warehouses
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以更新仓库
CREATE POLICY "管理员可以更新仓库" ON warehouses
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以删除仓库
CREATE POLICY "管理员可以删除仓库" ON warehouses
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- 4. warehouse_assignments表 - 添加管理员策略
-- ============================================

-- 管理员可以查看所有仓库分配
CREATE POLICY "管理员可以查看所有仓库分配" ON warehouse_assignments
  FOR SELECT
  USING (is_admin(auth.uid()));

-- 用户可以查看自己的仓库分配
CREATE POLICY "用户可以查看自己的仓库分配" ON warehouse_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

-- 管理员可以插入仓库分配
CREATE POLICY "管理员可以插入仓库分配" ON warehouse_assignments
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以更新仓库分配
CREATE POLICY "管理员可以更新仓库分配" ON warehouse_assignments
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以删除仓库分配
CREATE POLICY "管理员可以删除仓库分配" ON warehouse_assignments
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- 5. vehicles表 - 添加管理员策略
-- ============================================

-- 管理员可以查看所有车辆
CREATE POLICY "管理员可以查看所有车辆" ON vehicles
  FOR SELECT
  USING (is_admin(auth.uid()));

-- 管理员可以更新所有车辆
CREATE POLICY "管理员可以更新所有车辆" ON vehicles
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以删除车辆
CREATE POLICY "管理员可以删除车辆" ON vehicles
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- 6. attendance表 - 添加管理员策略
-- ============================================

-- 管理员可以查看所有考勤
CREATE POLICY "管理员可以查看所有考勤" ON attendance
  FOR SELECT
  USING (is_admin(auth.uid()));

-- 管理员可以更新所有考勤
CREATE POLICY "管理员可以更新所有考勤" ON attendance
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以删除考勤
CREATE POLICY "管理员可以删除考勤" ON attendance
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- 7. leave_applications表 - 添加管理员策略
-- ============================================

-- 管理员可以查看所有请假申请
CREATE POLICY "管理员可以查看所有请假申请" ON leave_applications
  FOR SELECT
  USING (is_admin(auth.uid()));

-- 用户可以查看自己的请假申请
CREATE POLICY "用户可以查看自己的请假申请" ON leave_applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以插入自己的请假申请
CREATE POLICY "用户可以插入自己的请假申请" ON leave_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 管理员可以更新所有请假申请
CREATE POLICY "管理员可以更新所有请假申请" ON leave_applications
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以删除请假申请
CREATE POLICY "管理员可以删除请假申请" ON leave_applications
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- 8. resignation_applications表 - 添加管理员策略
-- ============================================

-- 管理员可以查看所有离职申请
CREATE POLICY "管理员可以查看所有离职申请" ON resignation_applications
  FOR SELECT
  USING (is_admin(auth.uid()));

-- 用户可以查看自己的离职申请
CREATE POLICY "用户可以查看自己的离职申请" ON resignation_applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以插入自己的离职申请
CREATE POLICY "用户可以插入自己的离职申请" ON resignation_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 管理员可以更新所有离职申请
CREATE POLICY "管理员可以更新所有离职申请" ON resignation_applications
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以删除离职申请
CREATE POLICY "管理员可以删除离职申请" ON resignation_applications
  FOR DELETE
  USING (is_admin(auth.uid()));