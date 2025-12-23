/*
# 修复计件管理RLS策略以适配新权限结构

## 功能描述
更新计件管理相关表的RLS策略，使其适配新的权限结构（基于 user_roles 表）

## 修改内容

### 1. 创建新的权限检查函数
- `is_boss_v2()` - 检查是否为老板（基于 user_roles）
- `is_manager_v2()` - 检查是否为车队长（基于 user_roles）
- `is_driver_v2()` - 检查是否为司机（基于 user_roles）
- `is_manager_of_warehouse_v2()` - 检查是否管理指定仓库（基于 user_roles + warehouse_assignments）

### 2. 更新 piece_work_records 表的RLS策略
- 老板可以查看/管理所有计件记录
- 车队长可以查看/管理其管理仓库的计件记录
- 司机可以查看/创建/更新/删除自己的计件记录

### 3. 更新 category_prices 表的RLS策略
- 所有认证用户可以查看品类价格
- 老板可以管理所有品类价格
- 车队长可以管理其管理仓库的品类价格

## 安全性
- 使用 SECURITY DEFINER 确保权限检查
- 基于 user_roles 表进行角色验证
- 基于 warehouse_assignments 表进行仓库权限验证
*/

-- ============================================
-- 1. 创建新的权限检查函数
-- ============================================

-- 1.1 检查是否为老板
CREATE OR REPLACE FUNCTION is_boss_v2(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND role = 'BOSS'
  );
$$;

COMMENT ON FUNCTION is_boss_v2 IS '检查用户是否为老板（基于 user_roles 表）';

-- 1.2 检查是否为车队长
CREATE OR REPLACE FUNCTION is_manager_v2(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND role = 'MANAGER'
  );
$$;

COMMENT ON FUNCTION is_manager_v2 IS '检查用户是否为车队长（基于 user_roles 表）';

-- 1.3 检查是否为司机
CREATE OR REPLACE FUNCTION is_driver_v2(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND role = 'DRIVER'
  );
$$;

COMMENT ON FUNCTION is_driver_v2 IS '检查用户是否为司机（基于 user_roles 表）';

-- 1.4 检查是否管理指定仓库
CREATE OR REPLACE FUNCTION is_manager_of_warehouse_v2(uid uuid, wid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    JOIN user_roles ur ON ur.user_id = wa.user_id
    WHERE wa.user_id = uid 
    AND wa.warehouse_id = wid
    AND ur.role = 'MANAGER'
  );
$$;

COMMENT ON FUNCTION is_manager_of_warehouse_v2 IS '检查用户是否管理指定仓库（基于 user_roles 和 warehouse_assignments 表）';

-- ============================================
-- 2. 更新 piece_work_records 表的RLS策略
-- ============================================

-- 2.1 删除旧策略
DROP POLICY IF EXISTS "Super admins can view all piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Managers can view piece work records in their warehouses" ON piece_work_records;
DROP POLICY IF EXISTS "Users can view their own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can create their own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can update their own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can delete their own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Super admins can manage all piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Managers can manage piece work records in their warehouses" ON piece_work_records;

-- 2.2 创建新的查看策略
CREATE POLICY "老板可以查看所有计件记录"
ON piece_work_records FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的计件记录"
ON piece_work_records FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "司机可以查看自己的计件记录"
ON piece_work_records FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2.3 创建新的创建策略
CREATE POLICY "司机可以创建自己的计件记录"
ON piece_work_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_driver_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库的司机创建计件记录"
ON piece_work_records FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以为任何司机创建计件记录"
ON piece_work_records FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 2.4 创建新的修改策略
CREATE POLICY "司机可以修改自己的计件记录"
ON piece_work_records FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_driver_v2(auth.uid()));

CREATE POLICY "车队长可以修改其管理仓库的计件记录"
ON piece_work_records FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以修改所有计件记录"
ON piece_work_records FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 2.5 创建新的删除策略
CREATE POLICY "司机可以删除自己的计件记录"
ON piece_work_records FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND is_driver_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的计件记录"
ON piece_work_records FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以删除所有计件记录"
ON piece_work_records FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 3. 更新 category_prices 表的RLS策略
-- ============================================

-- 3.1 删除旧策略
DROP POLICY IF EXISTS "Authenticated users can view category prices" ON category_prices;
DROP POLICY IF EXISTS "Super admins can manage all category prices" ON category_prices;
DROP POLICY IF EXISTS "Managers can manage category prices in their warehouses" ON category_prices;

-- 3.2 创建新的查看策略
CREATE POLICY "所有认证用户可以查看品类价格"
ON category_prices FOR SELECT
TO authenticated
USING (true);

-- 3.3 创建新的管理策略
CREATE POLICY "老板可以管理所有品类价格"
ON category_prices FOR ALL
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以管理其管理仓库的品类价格"
ON category_prices FOR ALL
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);
