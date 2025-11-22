/*
# 修复超级管理员权限问题

## 问题描述
超级管理员无法从数据库获取数据，界面没有任何数据显示。

## 根本原因
1. RLS策略可能过于严格
2. is_super_admin() 函数可能无法正确识别超级管理员
3. 某些表可能缺少超级管理员的查询权限

## 解决方案
1. 重新创建 is_super_admin() 函数，确保正确识别
2. 为所有关键表添加超级管理员的完整权限策略
3. 确保超级管理员可以查询所有数据

## 变更内容
1. 重新创建 is_super_admin() 函数
2. 为 warehouses 表添加超级管理员权限
3. 为 leave_applications 表添加超级管理员权限
4. 验证所有表的 RLS 策略
*/

-- ============================================
-- 第一步：重新创建 is_super_admin() 函数
-- ============================================

DROP FUNCTION IF EXISTS public.is_super_admin(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- 使用 SECURITY DEFINER 绕过 RLS，直接查询角色
  SELECT role INTO user_role_value
  FROM profiles
  WHERE id = user_id;
  
  -- 返回是否为超级管理员
  RETURN user_role_value = 'super_admin';
END;
$$;

-- ============================================
-- 第二步：为 warehouses 表添加超级管理员权限
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "超级管理员可以管理所有仓库" ON warehouses;
DROP POLICY IF EXISTS "超级管理员拥有完整权限" ON warehouses;

-- 创建新策略：超级管理员拥有完整权限
CREATE POLICY "超级管理员拥有完整权限" ON warehouses
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- 确保所有认证用户可以查看仓库（用于下拉选择）
DROP POLICY IF EXISTS "所有认证用户可以查看仓库" ON warehouses;

CREATE POLICY "所有认证用户可以查看仓库" ON warehouses
    FOR SELECT TO authenticated
    USING (true);

-- ============================================
-- 第三步：为 leave_applications 表添加超级管理员权限
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "超级管理员可以管理所有请假申请" ON leave_applications;
DROP POLICY IF EXISTS "超级管理员拥有完整权限" ON leave_applications;

-- 创建新策略：超级管理员拥有完整权限
CREATE POLICY "超级管理员拥有完整权限" ON leave_applications
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ============================================
-- 第四步：验证 piece_work_records 表的权限
-- ============================================

-- 确保超级管理员策略存在
DROP POLICY IF EXISTS "超级管理员拥有完整权限" ON piece_work_records;

CREATE POLICY "超级管理员拥有完整权限" ON piece_work_records
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ============================================
-- 第五步：验证 attendance_records 表的权限
-- ============================================

-- 确保超级管理员策略存在
DROP POLICY IF EXISTS "超级管理员拥有完整权限" ON attendance_records;

CREATE POLICY "超级管理员拥有完整权限" ON attendance_records
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ============================================
-- 第六步：为 piece_work_categories 表添加超级管理员权限
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "超级管理员可以管理品类" ON piece_work_categories;
DROP POLICY IF EXISTS "超级管理员拥有完整权限" ON piece_work_categories;

-- 创建新策略：超级管理员拥有完整权限
CREATE POLICY "超级管理员拥有完整权限" ON piece_work_categories
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ============================================
-- 第七步：为 manager_warehouses 表添加超级管理员权限
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "超级管理员可以管理管理员仓库关联" ON manager_warehouses;
DROP POLICY IF EXISTS "超级管理员拥有完整权限" ON manager_warehouses;

-- 创建新策略：超级管理员拥有完整权限
CREATE POLICY "超级管理员拥有完整权限" ON manager_warehouses
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ============================================
-- 第八步：为 driver_warehouses 表添加超级管理员权限
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "超级管理员可以管理司机仓库关联" ON driver_warehouses;
DROP POLICY IF EXISTS "超级管理员拥有完整权限" ON driver_warehouses;

-- 创建新策略：超级管理员拥有完整权限
CREATE POLICY "超级管理员拥有完整权限" ON driver_warehouses
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ============================================
-- 第九步：验证所有表的 RLS 已启用
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE piece_work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE piece_work_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_warehouses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 第十步：添加调试信息
-- ============================================

-- 创建函数用于调试角色
CREATE OR REPLACE FUNCTION public.debug_user_role(user_id uuid)
RETURNS TABLE(
  user_id_param uuid,
  role_value user_role,
  is_super_admin_result boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    user_id AS user_id_param,
    p.role AS role_value,
    (p.role = 'super_admin') AS is_super_admin_result
  FROM profiles p
  WHERE p.id = user_id;
END;
$$;

-- ============================================
-- 完成
-- ============================================

-- 输出完成信息
DO $$
BEGIN
  RAISE NOTICE '超级管理员权限修复完成';
  RAISE NOTICE '1. 重新创建了 is_super_admin() 函数';
  RAISE NOTICE '2. 为所有关键表添加了超级管理员完整权限';
  RAISE NOTICE '3. 验证了所有表的 RLS 已启用';
  RAISE NOTICE '4. 添加了调试函数 debug_user_role()';
END $$;
