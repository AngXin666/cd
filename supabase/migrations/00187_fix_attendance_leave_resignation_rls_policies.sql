/*
# 修复考勤、请假、离职系统的 RLS 策略

## 问题
这三个表的 RLS 策略混合使用了 boss_id 和 tenant_id，导致数据隔离不完整。

## 解决方案
1. 删除所有使用 tenant_id 的旧策略
2. 保留使用 boss_id 的新策略
3. 确保所有策略都使用 boss_id 进行过滤

## 变更内容
- 删除 attendance 表的旧策略
- 删除 leave_applications 表的旧策略
- 删除 resignation_applications 表的旧策略
*/

-- ============================================
-- 1. 修复 attendance 表的 RLS 策略
-- ============================================

-- 删除使用 tenant_id 的旧策略
DROP POLICY IF EXISTS "平级账号完整权限创建租户考勤" ON attendance;
DROP POLICY IF EXISTS "平级账号完整权限删除租户考勤" ON attendance;
DROP POLICY IF EXISTS "平级账号完整权限更新租户考勤" ON attendance;
DROP POLICY IF EXISTS "平级账号查看租户考勤" ON attendance;
DROP POLICY IF EXISTS "租赁管理员创建所有考勤" ON attendance;
DROP POLICY IF EXISTS "租赁管理员删除所有考勤" ON attendance;
DROP POLICY IF EXISTS "租赁管理员更新所有考勤" ON attendance;
DROP POLICY IF EXISTS "租赁管理员查看所有考勤" ON attendance;
DROP POLICY IF EXISTS "老板账号创建租户考勤" ON attendance;
DROP POLICY IF EXISTS "老板账号删除租户考勤" ON attendance;
DROP POLICY IF EXISTS "老板账号更新租户考勤" ON attendance;
DROP POLICY IF EXISTS "老板账号查看租户考勤" ON attendance;
DROP POLICY IF EXISTS "车队长创建仓库司机的考勤" ON attendance;
DROP POLICY IF EXISTS "车队长删除仓库司机的考勤" ON attendance;
DROP POLICY IF EXISTS "车队长更新仓库司机的考勤" ON attendance;
DROP POLICY IF EXISTS "车队长查看仓库司机的考勤" ON attendance;

-- 删除重复的策略
DROP POLICY IF EXISTS "Managers can manage attendance in their warehouses" ON attendance;
DROP POLICY IF EXISTS "Managers can view attendance in their warehouses" ON attendance;
DROP POLICY IF EXISTS "Users can create their own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "司机查看自己的考勤" ON attendance;

-- 保留的策略（已经使用 boss_id）：
-- ✅ "Manager can view tenant attendance" - 管理员查看同租户考勤
-- ✅ "Super admin can manage tenant attendance" - 超级管理员管理同租户考勤
-- ✅ "Users can view own attendance" - 用户查看自己的考勤

-- 添加缺失的策略

-- 用户可以创建自己的考勤（同租户）
CREATE POLICY "Users can create own attendance"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
);

-- 用户可以更新自己的考勤（同租户）
CREATE POLICY "Users can update own attendance"
ON attendance FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
);

-- 管理员可以创建同租户的考勤
CREATE POLICY "Manager can create tenant attendance"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以更新同租户的考勤
CREATE POLICY "Manager can update tenant attendance"
ON attendance FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以删除同租户的考勤
CREATE POLICY "Manager can delete tenant attendance"
ON attendance FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- ============================================
-- 2. 修复 leave_applications 表的 RLS 策略
-- ============================================

-- 删除使用 tenant_id 的旧策略
DROP POLICY IF EXISTS "租户数据隔离 - leave_applications" ON leave_applications;

-- 删除重复的策略
DROP POLICY IF EXISTS "Managers can approve leave applications in their warehouses" ON leave_applications;
DROP POLICY IF EXISTS "Managers can view leave applications in their warehouses" ON leave_applications;
DROP POLICY IF EXISTS "Users can cancel their own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can create their own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can view their own leave applications" ON leave_applications;

-- 保留的策略（已经使用 boss_id）：
-- ✅ "Manager can manage tenant leave applications" - 管理员管理同租户请假申请
-- ✅ "Super admin can manage tenant leave applications" - 超级管理员管理同租户请假申请
-- ✅ "Users can manage own leave applications" - 用户管理自己的请假申请

-- 添加缺失的策略

-- 用户可以创建自己的请假申请（同租户）
CREATE POLICY "Users can create own leave applications"
ON leave_applications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
);

-- ============================================
-- 3. 修复 resignation_applications 表的 RLS 策略
-- ============================================

-- 删除使用 tenant_id 的旧策略
DROP POLICY IF EXISTS "租户数据隔离 - resignation_applications" ON resignation_applications;

-- 删除重复的策略
DROP POLICY IF EXISTS "Managers can approve resignation applications in their warehous" ON resignation_applications;
DROP POLICY IF EXISTS "Managers can view resignation applications in their warehouses" ON resignation_applications;
DROP POLICY IF EXISTS "Users can create their own resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Users can view their own resignation applications" ON resignation_applications;

-- 保留的策略（已经使用 boss_id）：
-- ✅ "Manager can manage tenant resignation applications" - 管理员管理同租户离职申请
-- ✅ "Super admin can manage tenant resignation applications" - 超级管理员管理同租户离职申请
-- ✅ "Users can manage own resignation applications" - 用户管理自己的离职申请

-- 添加缺失的策略

-- 用户可以创建自己的离职申请（同租户）
CREATE POLICY "Users can create own resignation applications"
ON resignation_applications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
);
