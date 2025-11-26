/*
# 修复仓库、用户、车辆系统的 RLS 策略

## 问题
这些表的 RLS 策略混合使用了 boss_id 和 tenant_id，导致数据隔离不完整。

## 解决方案
1. 删除所有使用 tenant_id 的旧策略
2. 保留使用 boss_id 的新策略
3. 确保所有策略都使用 boss_id 进行过滤

## 变更内容
- 删除 warehouses 表的旧策略
- 删除 profiles 表的旧策略
- 删除 vehicles 表的旧策略
- 删除 vehicle_records 表的旧策略
*/

-- ============================================
-- 1. 修复 warehouses 表的 RLS 策略
-- ============================================

-- 删除使用 tenant_id 的旧策略
DROP POLICY IF EXISTS "租户数据隔离 - warehouses" ON warehouses;

-- 保留的策略（已经使用 boss_id）：
-- ✅ "Driver can view assigned warehouses" - 司机查看分配的仓库
-- ✅ "Manager can view tenant warehouses" - 管理员查看同租户仓库
-- ✅ "Super admin can manage tenant warehouses" - 超级管理员管理同租户仓库

-- ============================================
-- 2. 修复 profiles 表的 RLS 策略
-- ============================================

-- 删除使用 tenant_id 的旧策略
DROP POLICY IF EXISTS "平级账号可以创建车队长和司机" ON profiles;
DROP POLICY IF EXISTS "平级账号可以删除车队长和司机" ON profiles;
DROP POLICY IF EXISTS "平级账号可以更新车队长和司机" ON profiles;
DROP POLICY IF EXISTS "平级账号可以查看车队长和司机" ON profiles;
DROP POLICY IF EXISTS "平级账号完整权限创建车队长和司机" ON profiles;
DROP POLICY IF EXISTS "平级账号完整权限删除车队长和司机" ON profiles;
DROP POLICY IF EXISTS "平级账号完整权限更新车队长和司机" ON profiles;
DROP POLICY IF EXISTS "老板账号创建平级账号车队长和司机" ON profiles;
DROP POLICY IF EXISTS "老板账号删除租户用户" ON profiles;
DROP POLICY IF EXISTS "老板账号可以创建车队长和司机" ON profiles;
DROP POLICY IF EXISTS "老板账号可以删除车队长司机和平级账号" ON profiles;
DROP POLICY IF EXISTS "老板账号可以更新车队长司机和平级账号" ON profiles;
DROP POLICY IF EXISTS "老板账号可以查看车队长司机和平级账号" ON profiles;
DROP POLICY IF EXISTS "老板账号更新租户用户" ON profiles;
DROP POLICY IF EXISTS "车队长创建仓库司机" ON profiles;
DROP POLICY IF EXISTS "车队长删除仓库司机" ON profiles;
DROP POLICY IF EXISTS "车队长可以创建司机" ON profiles;
DROP POLICY IF EXISTS "车队长可以删除自己仓库的司机" ON profiles;
DROP POLICY IF EXISTS "车队长可以更新自己仓库的司机" ON profiles;
DROP POLICY IF EXISTS "车队长可以查看自己仓库的司机" ON profiles;
DROP POLICY IF EXISTS "车队长更新仓库司机" ON profiles;

-- 删除重复的策略
DROP POLICY IF EXISTS "司机删除自己的账号" ON profiles;
DROP POLICY IF EXISTS "司机更新自己的账号" ON profiles;
DROP POLICY IF EXISTS "用户创建自己的账号" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己" ON profiles;
DROP POLICY IF EXISTS "用户可以查看自己" ON profiles;
DROP POLICY IF EXISTS "用户更新自己的账号" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以创建老板和平级账号" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以删除老板和平级账号" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以更新老板和平级账号" ON profiles;
DROP POLICY IF EXISTS "租赁管理员可以查看老板和平级账号" ON profiles;

-- 保留的策略（已经使用 boss_id）：
-- ✅ "Manager can view tenant users" - 管理员查看同租户用户
-- ✅ "Super admin can manage tenant users" - 超级管理员管理同租户用户
-- ✅ "Users can manage own profile" - 用户管理自己的档案

-- 添加缺失的策略

-- 用户可以查看自己的档案（同租户）
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND id = auth.uid()
);

-- 用户可以创建自己的档案（同租户）
CREATE POLICY "Users can create own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND id = auth.uid()
);

-- 管理员可以创建同租户的用户
CREATE POLICY "Manager can create tenant users"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以更新同租户的用户
CREATE POLICY "Manager can update tenant users"
ON profiles FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以删除同租户的用户
CREATE POLICY "Manager can delete tenant users"
ON profiles FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- ============================================
-- 3. 修复 vehicles 表的 RLS 策略
-- ============================================

-- 删除使用 tenant_id 的旧策略
DROP POLICY IF EXISTS "租户数据隔离 - vehicles" ON vehicles;

-- 删除重复的策略
DROP POLICY IF EXISTS "Drivers can insert their own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Drivers can update their own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Managers can update vehicles in their warehouses" ON vehicles;
DROP POLICY IF EXISTS "Managers can view vehicles in their warehouses" ON vehicles;

-- 保留的策略（已经使用 boss_id）：
-- ✅ "Driver can view assigned vehicle" - 司机查看分配的车辆
-- ✅ "Manager can view tenant vehicles" - 管理员查看同租户车辆
-- ✅ "Super admin can manage tenant vehicles" - 超级管理员管理同租户车辆

-- 添加缺失的策略

-- 司机可以创建自己的车辆（同租户）
CREATE POLICY "Driver can create own vehicle"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND driver_id = auth.uid()
);

-- 司机可以更新自己的车辆（同租户）
CREATE POLICY "Driver can update own vehicle"
ON vehicles FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND driver_id = auth.uid()
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND driver_id = auth.uid()
);

-- 管理员可以创建同租户的车辆
CREATE POLICY "Manager can create tenant vehicles"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以更新同租户的车辆
CREATE POLICY "Manager can update tenant vehicles"
ON vehicles FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以删除同租户的车辆
CREATE POLICY "Manager can delete tenant vehicles"
ON vehicles FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- ============================================
-- 4. 修复 vehicle_records 表的 RLS 策略
-- ============================================

-- 删除使用 tenant_id 的旧策略
DROP POLICY IF EXISTS "租户数据隔离 - vehicle_records" ON vehicle_records;

-- 删除重复的策略
DROP POLICY IF EXISTS "Drivers can create their own vehicle records" ON vehicle_records;
DROP POLICY IF EXISTS "Drivers can update their own vehicle records" ON vehicle_records;
DROP POLICY IF EXISTS "Drivers can view their own vehicle records" ON vehicle_records;

-- 保留的策略（已经使用 boss_id）：
-- ✅ "Driver can view own vehicle records" - 司机查看自己的车辆记录
-- ✅ "Manager can view tenant vehicle records" - 管理员查看同租户车辆记录
-- ✅ "Super admin can manage tenant vehicle records" - 超级管理员管理同租户车辆记录

-- 添加缺失的策略

-- 司机可以创建自己的车辆记录（同租户）
CREATE POLICY "Driver can create own vehicle records"
ON vehicle_records FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND driver_id = auth.uid()
);

-- 司机可以更新自己的车辆记录（同租户）
CREATE POLICY "Driver can update own vehicle records"
ON vehicle_records FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND driver_id = auth.uid()
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND driver_id = auth.uid()
);

-- 管理员可以创建同租户的车辆记录
CREATE POLICY "Manager can create tenant vehicle records"
ON vehicle_records FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以更新同租户的车辆记录
CREATE POLICY "Manager can update tenant vehicle records"
ON vehicle_records FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以删除同租户的车辆记录
CREATE POLICY "Manager can delete tenant vehicle records"
ON vehicle_records FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);
