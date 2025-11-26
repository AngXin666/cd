/*
# 修复仓库和司机查询的 RLS 策略

## 问题分析
1. 用户反馈：无法读取任何仓库和司机
2. 根本原因：RLS 策略过于复杂，依赖多个函数调用，可能导致性能问题或递归问题
3. `get_current_user_boss_id()` 依赖 `auth.uid()`，如果 session 有问题会返回 null

## 解决方案
简化 RLS 策略，减少函数调用，提高性能和可靠性

## 修改内容
1. 简化 profiles 表的 SELECT 策略
2. 简化 warehouses 表的 SELECT 策略
3. 简化 manager_warehouses 表的 SELECT 策略
4. 简化 driver_warehouses 表的 SELECT 策略

*/

-- ============================================
-- 1. 修复 profiles 表的 SELECT 策略
-- ============================================

-- 删除旧的复杂策略
DROP POLICY IF EXISTS "Users can view profiles based on permissions" ON profiles;

-- 创建新的简化策略
-- 策略 1：用户可以查看自己的档案
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 策略 2：管理员可以查看同租户的所有用户
CREATE POLICY "Admins can view tenant users" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'super_admin')
        AND p.boss_id = profiles.boss_id
    )
  );

-- ============================================
-- 2. 修复 warehouses 表的 SELECT 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Manager can view tenant warehouses" ON warehouses;
DROP POLICY IF EXISTS "Driver can view assigned warehouses" ON warehouses;

-- 创建新的简化策略
-- 策略 1：管理员可以查看同租户的所有仓库
CREATE POLICY "Admins can view tenant warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'super_admin')
        AND p.boss_id = warehouses.boss_id
    )
  );

-- 策略 2：司机可以查看分配给自己的仓库
CREATE POLICY "Drivers can view assigned warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'driver'
        AND p.boss_id = warehouses.boss_id
    )
    AND EXISTS (
      SELECT 1 FROM driver_warehouses dw
      WHERE dw.driver_id = auth.uid()
        AND dw.warehouse_id = warehouses.id
    )
  );

-- ============================================
-- 3. 修复 manager_warehouses 表的 SELECT 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Manager can view own warehouses" ON manager_warehouses;
DROP POLICY IF EXISTS "Managers can view their own warehouse assignments" ON manager_warehouses;

-- 创建新的简化策略
-- 策略 1：管理员可以查看自己的仓库分配
CREATE POLICY "Managers can view own warehouse assignments" ON manager_warehouses
  FOR SELECT TO authenticated
  USING (manager_id = auth.uid());

-- 策略 2：超级管理员可以查看同租户的所有仓库分配
CREATE POLICY "Super admins can view tenant warehouse assignments" ON manager_warehouses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
        AND p.boss_id = manager_warehouses.boss_id
    )
  );

-- ============================================
-- 4. 修复 driver_warehouses 表的 SELECT 策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Driver can view own warehouses" ON driver_warehouses;
DROP POLICY IF EXISTS "Drivers can view their own warehouse assignments" ON driver_warehouses;
DROP POLICY IF EXISTS "Manager can view tenant driver warehouses" ON driver_warehouses;
DROP POLICY IF EXISTS "Managers can view driver warehouses in their warehouses" ON driver_warehouses;

-- 创建新的简化策略
-- 策略 1：司机可以查看自己的仓库分配
CREATE POLICY "Drivers can view own warehouse assignments" ON driver_warehouses
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

-- 策略 2：管理员可以查看同租户司机的仓库分配
CREATE POLICY "Admins can view tenant driver warehouse assignments" ON driver_warehouses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'super_admin')
        AND p.boss_id = driver_warehouses.boss_id
    )
  );

-- ============================================
-- 5. 添加注释
-- ============================================

COMMENT ON POLICY "Users can view own profile" ON profiles IS '用户可以查看自己的档案';
COMMENT ON POLICY "Admins can view tenant users" ON profiles IS '管理员可以查看同租户的所有用户';
COMMENT ON POLICY "Admins can view tenant warehouses" ON warehouses IS '管理员可以查看同租户的所有仓库';
COMMENT ON POLICY "Drivers can view assigned warehouses" ON warehouses IS '司机可以查看分配给自己的仓库';
COMMENT ON POLICY "Managers can view own warehouse assignments" ON manager_warehouses IS '管理员可以查看自己的仓库分配';
COMMENT ON POLICY "Super admins can view tenant warehouse assignments" ON manager_warehouses IS '超级管理员可以查看同租户的所有仓库分配';
COMMENT ON POLICY "Drivers can view own warehouse assignments" ON driver_warehouses IS '司机可以查看自己的仓库分配';
COMMENT ON POLICY "Admins can view tenant driver warehouse assignments" ON driver_warehouses IS '管理员可以查看同租户司机的仓库分配';
