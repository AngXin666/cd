/*
# 修复 warehouse_assignments 表的RLS策略以支持通知服务

## 问题描述
当前 warehouse_assignments 表的RLS策略只允许用户查看自己的仓库分配，
导致通知服务无法查询其他用户（如司机）的仓库分配，出现错误：
`invalid input syntax for type uuid: "anon"`

## 解决方案
为 warehouse_assignments 表添加管理员权限的RLS策略：
1. BOSS 可以查看所有仓库分配
2. PEER_ADMIN（完整控制权）可以查看所有仓库分配
3. MANAGER（完整控制权）可以查看所有仓库分配

## 变更内容
1. 添加 BOSS 查看权限策略
2. 添加 PEER_ADMIN（完整控制权）查看权限策略
3. 添加 MANAGER（完整控制权）查看权限策略

## 安全性
- 只有有权限的管理员才能查看其他用户的仓库分配
- 普通用户仍然只能查看自己的仓库分配
- 使用现有的权限检查函数确保安全性
*/

-- ============================================
-- 第一部分：添加 BOSS 查看权限
-- ============================================

CREATE POLICY "BOSS可以查看所有仓库分配" ON warehouse_assignments
  FOR SELECT
  USING (is_boss(auth.uid()));

-- ============================================
-- 第二部分：添加 PEER_ADMIN 查看权限
-- ============================================

CREATE POLICY "PEER_ADMIN（完整控制权）可以查看所有仓库分配" ON warehouse_assignments
  FOR SELECT
  USING (peer_admin_has_full_control(auth.uid()));

-- ============================================
-- 第三部分：添加 MANAGER 查看权限
-- ============================================

CREATE POLICY "MANAGER（完整控制权）可以查看所有仓库分配" ON warehouse_assignments
  FOR SELECT
  USING (manager_has_full_control(auth.uid()));