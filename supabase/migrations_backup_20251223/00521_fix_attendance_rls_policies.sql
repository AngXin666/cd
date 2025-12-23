/*
# 修复考勤记录 RLS 策略

## 问题
1. attendance 表只有两个策略：用户可以创建和查看自己的考勤记录
2. 缺少管理员、车队长、老板的查看和管理策略
3. 导致管理员、车队长、老板无法查看司机的考勤记录

## 修复内容
1. 删除旧的 RLS 策略
2. 创建新的 RLS 策略：
   - 管理员（BOSS, MANAGER, DISPATCHER）可以查看、创建、更新、删除所有考勤记录
   - 司机（DRIVER）只能查看、创建、更新自己的考勤记录

## 安全性
- BOSS、MANAGER、DISPATCHER 拥有完全权限
- DRIVER 只能管理自己的记录
*/

-- 1. 删除所有旧的 RLS 策略
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can create own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can create attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can update all attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can delete all attendance" ON attendance;

-- 2. 创建新的 RLS 策略

-- 2.1 管理员（BOSS, MANAGER, DISPATCHER）可以查看所有考勤记录
CREATE POLICY "Admins can view all attendance" ON attendance
  FOR SELECT 
  TO public
  USING (
    is_boss(auth.uid()) OR 
    is_manager(auth.uid()) OR 
    is_dispatcher(auth.uid())
  );

-- 2.2 管理员（BOSS, MANAGER, DISPATCHER）可以创建考勤记录
CREATE POLICY "Admins can create attendance" ON attendance
  FOR INSERT 
  TO public
  WITH CHECK (
    is_boss(auth.uid()) OR 
    is_manager(auth.uid()) OR 
    is_dispatcher(auth.uid())
  );

-- 2.3 管理员（BOSS, MANAGER, DISPATCHER）可以更新所有考勤记录
CREATE POLICY "Admins can update all attendance" ON attendance
  FOR UPDATE 
  TO public
  USING (
    is_boss(auth.uid()) OR 
    is_manager(auth.uid()) OR 
    is_dispatcher(auth.uid())
  )
  WITH CHECK (
    is_boss(auth.uid()) OR 
    is_manager(auth.uid()) OR 
    is_dispatcher(auth.uid())
  );

-- 2.4 管理员（BOSS, MANAGER, DISPATCHER）可以删除所有考勤记录
CREATE POLICY "Admins can delete all attendance" ON attendance
  FOR DELETE 
  TO public
  USING (
    is_boss(auth.uid()) OR 
    is_manager(auth.uid()) OR 
    is_dispatcher(auth.uid())
  );

-- 2.5 司机可以查看自己的考勤记录
CREATE POLICY "Drivers can view own attendance" ON attendance
  FOR SELECT 
  TO public
  USING (user_id = auth.uid());

-- 2.6 司机可以创建自己的考勤记录
CREATE POLICY "Drivers can create own attendance" ON attendance
  FOR INSERT 
  TO public
  WITH CHECK (user_id = auth.uid());

-- 2.7 司机可以更新自己的考勤记录
CREATE POLICY "Drivers can update own attendance" ON attendance
  FOR UPDATE 
  TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
