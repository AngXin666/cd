/*
# 更新 RLS 策略以支持 boss_id 数据隔离

## 变更说明
为所有表的 RLS 策略添加 boss_id 过滤条件，确保数据在数据库层面完全隔离。

## 核心原则
1. 所有查询都必须包含 boss_id 过滤
2. 用户只能访问自己租户的数据
3. 超级管理员只能访问自己租户的数据

## 影响范围
- 所有表的 RLS 策略都将被更新
- 确保跨租户数据访问被完全阻止
*/

-- ============================================
-- 第一部分：删除旧的 RLS 策略
-- ============================================

-- profiles 表
DROP POLICY IF EXISTS "Admins have full access" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admin can manage all users" ON profiles;
DROP POLICY IF EXISTS "Manager can view drivers" ON profiles;
DROP POLICY IF EXISTS "Users can view themselves" ON profiles;

-- warehouses 表
DROP POLICY IF EXISTS "Super admin can manage warehouses" ON warehouses;
DROP POLICY IF EXISTS "Manager can view assigned warehouses" ON warehouses;
DROP POLICY IF EXISTS "Driver can view assigned warehouses" ON warehouses;

-- driver_warehouses 表
DROP POLICY IF EXISTS "Super admin can manage driver warehouses" ON driver_warehouses;
DROP POLICY IF EXISTS "Manager can view driver warehouses" ON driver_warehouses;
DROP POLICY IF EXISTS "Driver can view own warehouses" ON driver_warehouses;

-- manager_warehouses 表
DROP POLICY IF EXISTS "Super admin can manage manager warehouses" ON manager_warehouses;
DROP POLICY IF EXISTS "Manager can view own warehouses" ON manager_warehouses;

-- attendance 表
DROP POLICY IF EXISTS "Super admin can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Manager can view attendance" ON attendance;
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;

-- attendance_rules 表
DROP POLICY IF EXISTS "Super admin can manage attendance rules" ON attendance_rules;
DROP POLICY IF EXISTS "Manager can view attendance rules" ON attendance_rules;

-- piece_work_records 表
DROP POLICY IF EXISTS "Super admin can manage piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Manager can view piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can view own piece work records" ON piece_work_records;

-- category_prices 表
DROP POLICY IF EXISTS "Super admin can manage category prices" ON category_prices;
DROP POLICY IF EXISTS "Manager can view category prices" ON category_prices;

-- leave_applications 表
DROP POLICY IF EXISTS "Super admin can manage leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Manager can view leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can view own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can create leave applications" ON leave_applications;

-- resignation_applications 表
DROP POLICY IF EXISTS "Super admin can manage resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Manager can view resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Users can view own resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Users can create resignation applications" ON resignation_applications;

-- vehicles 表
DROP POLICY IF EXISTS "Super admin can manage vehicles" ON vehicles;
DROP POLICY IF EXISTS "Manager can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "Driver can view assigned vehicle" ON vehicles;

-- vehicle_records 表
DROP POLICY IF EXISTS "Super admin can manage vehicle records" ON vehicle_records;
DROP POLICY IF EXISTS "Manager can view vehicle records" ON vehicle_records;
DROP POLICY IF EXISTS "Driver can view own vehicle records" ON vehicle_records;

-- driver_licenses 表
DROP POLICY IF EXISTS "Super admin can manage driver licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Manager can view driver licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Driver can view own license" ON driver_licenses;

-- feedback 表
DROP POLICY IF EXISTS "Super admin can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can create feedback" ON feedback;

-- notifications 表
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- ============================================
-- 第二部分：创建新的 RLS 策略（基于 boss_id）
-- ============================================

-- ========== profiles 表 ==========
-- 超级管理员可以管理自己租户的所有用户
CREATE POLICY "Super admin can manage tenant users" ON profiles
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看自己租户的用户
CREATE POLICY "Manager can view tenant users" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR auth.uid() = id)
  );

-- 用户可以查看和更新自己的资料
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    auth.uid() = id
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    auth.uid() = id
  );

-- ========== warehouses 表 ==========
-- 超级管理员可以管理自己租户的所有仓库
CREATE POLICY "Super admin can manage tenant warehouses" ON warehouses
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看自己租户的仓库
CREATE POLICY "Manager can view tenant warehouses" ON warehouses
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  );

-- 司机可以查看自己分配的仓库
CREATE POLICY "Driver can view assigned warehouses" ON warehouses
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    id IN (
      SELECT warehouse_id 
      FROM driver_warehouses 
      WHERE driver_id = auth.uid()
    )
  );

-- ========== driver_warehouses 表 ==========
-- 超级管理员可以管理自己租户的司机-仓库关联
CREATE POLICY "Super admin can manage tenant driver warehouses" ON driver_warehouses
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看自己租户的司机-仓库关联
CREATE POLICY "Manager can view tenant driver warehouses" ON driver_warehouses
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  );

-- 司机可以查看自己的仓库关联
CREATE POLICY "Driver can view own warehouses" ON driver_warehouses
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    driver_id = auth.uid()
  );

-- ========== manager_warehouses 表 ==========
-- 超级管理员可以管理自己租户的管理员-仓库关联
CREATE POLICY "Super admin can manage tenant manager warehouses" ON manager_warehouses
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看自己的仓库关联
CREATE POLICY "Manager can view own warehouses" ON manager_warehouses
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (manager_id = auth.uid() OR is_super_admin(auth.uid()))
  );

-- ========== attendance 表 ==========
-- 超级管理员可以管理自己租户的所有考勤记录
CREATE POLICY "Super admin can manage tenant attendance" ON attendance
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看自己租户的考勤记录
CREATE POLICY "Manager can view tenant attendance" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  );

-- 用户可以查看自己的考勤记录
CREATE POLICY "Users can view own attendance" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    user_id = auth.uid()
  );

-- ========== attendance_rules 表 ==========
-- 超级管理员可以管理自己租户的考勤规则
CREATE POLICY "Super admin can manage tenant attendance rules" ON attendance_rules
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员和用户可以查看自己租户的考勤规则
CREATE POLICY "Users can view tenant attendance rules" ON attendance_rules
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id()
  );

-- ========== piece_work_records 表 ==========
-- 超级管理员可以管理自己租户的所有计件记录
CREATE POLICY "Super admin can manage tenant piece work records" ON piece_work_records
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看自己租户的计件记录
CREATE POLICY "Manager can view tenant piece work records" ON piece_work_records
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  );

-- 用户可以查看自己的计件记录
CREATE POLICY "Users can view own piece work records" ON piece_work_records
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    user_id = auth.uid()
  );

-- ========== category_prices 表 ==========
-- 超级管理员可以管理自己租户的价格分类
CREATE POLICY "Super admin can manage tenant category prices" ON category_prices
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员和用户可以查看自己租户的价格分类
CREATE POLICY "Users can view tenant category prices" ON category_prices
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id()
  );

-- ========== leave_applications 表 ==========
-- 超级管理员可以管理自己租户的所有请假申请
CREATE POLICY "Super admin can manage tenant leave applications" ON leave_applications
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看和审批自己租户的请假申请
CREATE POLICY "Manager can manage tenant leave applications" ON leave_applications
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  );

-- 用户可以查看和创建自己的请假申请
CREATE POLICY "Users can manage own leave applications" ON leave_applications
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    user_id = auth.uid()
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    user_id = auth.uid()
  );

-- ========== resignation_applications 表 ==========
-- 超级管理员可以管理自己租户的所有离职申请
CREATE POLICY "Super admin can manage tenant resignation applications" ON resignation_applications
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看和审批自己租户的离职申请
CREATE POLICY "Manager can manage tenant resignation applications" ON resignation_applications
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  );

-- 用户可以查看和创建自己的离职申请
CREATE POLICY "Users can manage own resignation applications" ON resignation_applications
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    user_id = auth.uid()
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    user_id = auth.uid()
  );

-- ========== vehicles 表 ==========
-- 超级管理员可以管理自己租户的所有车辆
CREATE POLICY "Super admin can manage tenant vehicles" ON vehicles
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看自己租户的车辆
CREATE POLICY "Manager can view tenant vehicles" ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  );

-- 司机可以查看自己的车辆
CREATE POLICY "Driver can view assigned vehicle" ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    current_driver_id = auth.uid()
  );

-- ========== vehicle_records 表 ==========
-- 超级管理员可以管理自己租户的所有车辆记录
CREATE POLICY "Super admin can manage tenant vehicle records" ON vehicle_records
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看自己租户的车辆记录
CREATE POLICY "Manager can view tenant vehicle records" ON vehicle_records
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  );

-- 司机可以查看自己车辆的记录
CREATE POLICY "Driver can view own vehicle records" ON vehicle_records
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    vehicle_id IN (
      SELECT id 
      FROM vehicles 
      WHERE current_driver_id = auth.uid()
    )
  );

-- ========== driver_licenses 表 ==========
-- 超级管理员可以管理自己租户的所有驾驶证
CREATE POLICY "Super admin can manage tenant driver licenses" ON driver_licenses
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 管理员可以查看自己租户的驾驶证
CREATE POLICY "Manager can view tenant driver licenses" ON driver_licenses
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  );

-- 司机可以查看和更新自己的驾驶证
CREATE POLICY "Driver can manage own license" ON driver_licenses
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    driver_id = auth.uid()
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    driver_id = auth.uid()
  );

-- ========== feedback 表 ==========
-- 超级管理员可以查看自己租户的所有反馈
CREATE POLICY "Super admin can view tenant feedback" ON feedback
  FOR SELECT
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    is_super_admin(auth.uid())
  );

-- 用户可以查看和创建自己的反馈
CREATE POLICY "Users can manage own feedback" ON feedback
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    user_id = auth.uid()
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    user_id = auth.uid()
  );

-- ========== notifications 表 ==========
-- 用户可以查看、更新和删除自己的通知
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL
  TO authenticated
  USING (
    boss_id = get_current_user_boss_id() AND
    recipient_id = auth.uid()
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    recipient_id = auth.uid()
  );

-- 超级管理员和管理员可以创建通知
CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    boss_id = get_current_user_boss_id() AND
    (is_super_admin(auth.uid()) OR is_admin(auth.uid()))
  );
