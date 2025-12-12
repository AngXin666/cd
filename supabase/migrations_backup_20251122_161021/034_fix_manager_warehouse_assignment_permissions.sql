/*
# 修复普通管理员仓库分配权限问题

## 1. 问题描述
普通管理员无法为司机分配仓库，因为 driver_warehouses 表缺少管理员的 RLS 策略。

## 2. 解决方案
添加普通管理员的权限策略，允许管理员管理其负责仓库的司机分配。

## 3. 变更内容
- 创建辅助函数：is_manager() - 检查用户是否为管理员
- 创建辅助函数：manager_has_warehouse() - 检查管理员是否负责某个仓库
- 添加 RLS 策略：允许普通管理员管理其负责仓库的司机分配

## 4. 安全说明
- 普通管理员只能管理其负责仓库的司机分配
- 超级管理员保持完整权限
- 司机只能查看自己的仓库分配
*/

-- ============================================
-- 第一步：创建辅助函数
-- ============================================

-- 检查用户是否为普通管理员
CREATE OR REPLACE FUNCTION is_manager(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'manager'::user_role
  );
$$;

-- 检查管理员是否负责某个仓库
CREATE OR REPLACE FUNCTION manager_has_warehouse(uid uuid, wid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM manager_warehouses mw
    WHERE mw.manager_id = uid AND mw.warehouse_id = wid
  );
$$;

-- ============================================
-- 第二步：添加普通管理员的 RLS 策略
-- ============================================

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "普通管理员可以管理其负责仓库的司机分配" ON driver_warehouses;

-- 创建新策略：普通管理员可以管理其负责仓库的司机分配
CREATE POLICY "普通管理员可以管理其负责仓库的司机分配" ON driver_warehouses
  FOR ALL TO authenticated
  USING (
    is_manager(auth.uid()) AND 
    manager_has_warehouse(auth.uid(), warehouse_id)
  )
  WITH CHECK (
    is_manager(auth.uid()) AND 
    manager_has_warehouse(auth.uid(), warehouse_id)
  );

-- ============================================
-- 第三步：验证策略
-- ============================================

-- 输出完成信息
DO $$
BEGIN
  RAISE NOTICE '普通管理员仓库分配权限修复完成';
  RAISE NOTICE '1. 创建了 is_manager() 辅助函数';
  RAISE NOTICE '2. 创建了 manager_has_warehouse() 辅助函数';
  RAISE NOTICE '3. 添加了普通管理员的 RLS 策略';
  RAISE NOTICE '4. 普通管理员现在可以管理其负责仓库的司机分配';
END $$;
