/*
# 修复计件系统、反馈系统的 RLS 策略，以及考勤系统的函数

## 问题
1. 计件系统（piece_work_records）：大量 RLS 策略使用 tenant_id
2. 反馈系统（feedback）：部分 RLS 策略使用 tenant_id
3. 考勤系统函数：get_driver_attendance_stats 函数查询错误的表名（attendance_records → attendance）

## 解决方案
1. 删除所有使用 tenant_id 的旧策略
2. 删除重复的策略
3. 保留使用 boss_id 的新策略
4. 添加缺失的策略
5. 修复考勤函数的表名错误

## 变更内容
- 修复 piece_work_records 表的 RLS 策略
- 修复 feedback 表的 RLS 策略
- 修复 get_driver_attendance_stats 函数
*/

-- ============================================
-- 1. 修复 piece_work_records 表的 RLS 策略
-- ============================================

-- 删除使用 tenant_id 的旧策略
DROP POLICY IF EXISTS "平级账号完整权限创建租户计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "平级账号完整权限删除租户计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "平级账号完整权限更新租户计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "平级账号查看租户计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "老板账号创建租户计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "老板账号删除租户计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "老板账号更新租户计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "老板账号查看租户计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "车队长创建仓库司机的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "车队长删除仓库司机的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "车队长更新仓库司机的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "车队长查看仓库司机的计件记录" ON piece_work_records;

-- 删除重复的策略
DROP POLICY IF EXISTS "Users can create their own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can delete their own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can update their own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can view their own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "司机查看自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "Managers can manage piece work records in their warehouses" ON piece_work_records;
DROP POLICY IF EXISTS "Managers can view piece work records in their warehouses" ON piece_work_records;
DROP POLICY IF EXISTS "租赁管理员创建所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "租赁管理员删除所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "租赁管理员更新所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "租赁管理员查看所有计件记录" ON piece_work_records;

-- 保留的策略（已经使用 boss_id）：
-- ✅ "Manager can view tenant piece work records" - 管理员查看同租户计件记录
-- ✅ "Super admin can manage tenant piece work records" - 超级管理员管理同租户计件记录
-- ✅ "Users can view own piece work records" - 用户查看自己的计件记录

-- 添加缺失的策略

-- 用户可以创建自己的计件记录（同租户）
CREATE POLICY "Users can create own piece work records"
ON piece_work_records FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
);

-- 用户可以更新自己的计件记录（同租户）
CREATE POLICY "Users can update own piece work records"
ON piece_work_records FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
);

-- 用户可以删除自己的计件记录（同租户）
CREATE POLICY "Users can delete own piece work records"
ON piece_work_records FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
);

-- 管理员可以创建同租户的计件记录
CREATE POLICY "Manager can create tenant piece work records"
ON piece_work_records FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以更新同租户的计件记录
CREATE POLICY "Manager can update tenant piece work records"
ON piece_work_records FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以删除同租户的计件记录
CREATE POLICY "Manager can delete tenant piece work records"
ON piece_work_records FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- ============================================
-- 2. 修复 feedback 表的 RLS 策略
-- ============================================

-- 删除使用 tenant_id 的旧策略
DROP POLICY IF EXISTS "租户数据隔离 - feedback" ON feedback;

-- 删除重复的策略
DROP POLICY IF EXISTS "Users can create their own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can respond to feedback" ON feedback;

-- 保留的策略（已经使用 boss_id）：
-- ✅ "Super admin can view tenant feedback" - 超级管理员查看同租户反馈
-- ✅ "Users can manage own feedback" - 用户管理自己的反馈

-- 添加缺失的策略

-- 用户可以查看自己的反馈（同租户）
CREATE POLICY "Users can view own feedback"
ON feedback FOR SELECT
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
);

-- 用户可以创建自己的反馈（同租户）
CREATE POLICY "Users can create own feedback"
ON feedback FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND user_id = auth.uid()
);

-- 管理员可以查看同租户的所有反馈
CREATE POLICY "Manager can view tenant feedback"
ON feedback FOR SELECT
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以更新同租户的反馈（回复反馈）
CREATE POLICY "Manager can update tenant feedback"
ON feedback FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- 管理员可以删除同租户的反馈
CREATE POLICY "Manager can delete tenant feedback"
ON feedback FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
);

-- ============================================
-- 3. 修复 get_driver_attendance_stats 函数
-- ============================================

-- 删除旧函数
DROP FUNCTION IF EXISTS get_driver_attendance_stats(uuid, date, date);

-- 创建新函数（修复表名错误）
CREATE OR REPLACE FUNCTION get_driver_attendance_stats(
  driver_id uuid, 
  start_date date, 
  end_date date
)
RETURNS TABLE(
  total_days integer, 
  attended_days integer, 
  late_days integer, 
  normal_days integer, 
  absent_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_days integer;
  v_attended_days integer;
  v_late_days integer;
  v_normal_days integer;
  v_absent_days integer;
BEGIN
  -- 计算日期范围内的总天数
  v_total_days := (end_date - start_date + 1)::integer;
  
  -- 计算实际出勤天数（有打卡记录的天数）
  -- 修复：从 attendance_records 改为 attendance
  SELECT COUNT(*)
  INTO v_attended_days
  FROM attendance
  WHERE user_id = driver_id
  AND work_date BETWEEN start_date AND end_date;
  
  -- 计算迟到天数
  SELECT COUNT(*)
  INTO v_late_days
  FROM attendance
  WHERE user_id = driver_id
  AND work_date BETWEEN start_date AND end_date
  AND status = 'late';
  
  -- 计算正常天数
  SELECT COUNT(*)
  INTO v_normal_days
  FROM attendance
  WHERE user_id = driver_id
  AND work_date BETWEEN start_date AND end_date
  AND status = 'normal';
  
  -- 计算未打卡天数（总天数 - 出勤天数）
  v_absent_days := v_total_days - v_attended_days;
  
  RETURN QUERY SELECT v_total_days, v_attended_days, v_late_days, v_normal_days, v_absent_days;
END;
$$;