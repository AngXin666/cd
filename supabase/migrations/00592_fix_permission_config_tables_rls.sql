/*
# 修复权限配置表RLS策略以适配新权限结构

## 功能描述
更新权限配置相关表的RLS策略，使其适配新的权限结构（基于 user_roles 表）

## 修改内容

### 1. permission_strategies - 权限策略配置表
- 所有认证用户可以查看权限策略
- 只有老板可以管理权限策略

### 2. resource_permissions - 资源权限配置表
- 所有认证用户可以查看资源权限配置
- 只有老板可以管理资源权限配置

### 3. role_permission_mappings - 角色权限映射表
- 所有认证用户可以查看角色权限映射
- 只有老板可以管理角色权限映射

## 安全性
- 使用新的权限检查函数（is_boss_v2）
- 基于 user_roles 表进行角色验证
- 这些是系统配置表，只有老板可以修改

## 注意
- 这些表是权限系统的配置表，需要谨慎管理
- 所有用户都可以查看配置，但只有老板可以修改
*/

-- ============================================
-- 1. 更新 permission_strategies 表的RLS策略
-- ============================================

-- 1.1 删除旧策略
DROP POLICY IF EXISTS "authenticated_view_permission_strategies" ON permission_strategies;

-- 1.2 创建新的查看策略
CREATE POLICY "所有认证用户可以查看权限策略"
ON permission_strategies FOR SELECT
TO authenticated
USING (true);

-- 1.3 创建新的创建策略
CREATE POLICY "老板可以创建权限策略"
ON permission_strategies FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 1.4 创建新的修改策略
CREATE POLICY "老板可以修改权限策略"
ON permission_strategies FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 1.5 创建新的删除策略
CREATE POLICY "老板可以删除权限策略"
ON permission_strategies FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 2. 更新 resource_permissions 表的RLS策略
-- ============================================

-- 2.1 删除旧策略
DROP POLICY IF EXISTS "authenticated_view_resource_permissions" ON resource_permissions;

-- 2.2 创建新的查看策略
CREATE POLICY "所有认证用户可以查看资源权限配置"
ON resource_permissions FOR SELECT
TO authenticated
USING (true);

-- 2.3 创建新的创建策略
CREATE POLICY "老板可以创建资源权限配置"
ON resource_permissions FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 2.4 创建新的修改策略
CREATE POLICY "老板可以修改资源权限配置"
ON resource_permissions FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 2.5 创建新的删除策略
CREATE POLICY "老板可以删除资源权限配置"
ON resource_permissions FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 3. 更新 role_permission_mappings 表的RLS策略
-- ============================================

-- 3.1 删除旧策略
DROP POLICY IF EXISTS "authenticated_view_role_permission_mappings" ON role_permission_mappings;

-- 3.2 创建新的查看策略
CREATE POLICY "所有认证用户可以查看角色权限映射"
ON role_permission_mappings FOR SELECT
TO authenticated
USING (true);

-- 3.3 创建新的创建策略
CREATE POLICY "老板可以创建角色权限映射"
ON role_permission_mappings FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 3.4 创建新的修改策略
CREATE POLICY "老板可以修改角色权限映射"
ON role_permission_mappings FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 3.5 创建新的删除策略
CREATE POLICY "老板可以删除角色权限映射"
ON role_permission_mappings FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));
