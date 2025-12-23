/*
# 修复 manager_warehouses 和 driver_warehouses 表的 RLS 策略

## 解决方案
使用 get_user_role_and_boss 函数来避免递归

*/

-- ============================================
-- 1. 修复 manager_warehouses 表
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Super admins can view tenant warehouse assignments" ON manager_warehouses;

-- 重新创建策略（保留原有的简单策略）
-- 策略 1：管理员可以查看自己的仓库分配（已存在，不需要修改）

-- 策略 2：超级管理员可以查看同租户的所有仓库分配（使用辅助函数）
CREATE POLICY "Super admins can view tenant warehouse assignments" ON manager_warehouses
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) = 'super_admin'
    AND
    manager_warehouses.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(auth.uid()) b)
  );

-- ============================================
-- 2. 修复 driver_warehouses 表
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Admins can view tenant driver warehouse assignments" ON driver_warehouses;

-- 重新创建策略
-- 策略 1：司机可以查看自己的仓库分配（已存在，不需要修改）

-- 策略 2：管理员可以查看同租户司机的仓库分配（使用辅助函数）
CREATE POLICY "Admins can view tenant driver warehouse assignments" ON driver_warehouses
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) IN ('manager', 'super_admin')
    AND
    driver_warehouses.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(auth.uid()) b)
  );

-- 添加注释
COMMENT ON POLICY "Super admins can view tenant warehouse assignments" ON manager_warehouses IS '超级管理员可以查看同租户的所有仓库分配';
COMMENT ON POLICY "Admins can view tenant driver warehouse assignments" ON driver_warehouses IS '管理员可以查看同租户司机的仓库分配';
