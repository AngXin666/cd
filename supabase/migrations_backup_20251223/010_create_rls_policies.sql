/*
# 创建 RLS 策略

## 说明
为所有表创建行级安全策略（Row Level Security），确保数据访问权限的正确性。

## 权限规则

### 基本原则
1. **超级管理员**：可以访问所有数据
2. **管理员**：只能访问自己负责仓库的数据
3. **司机**：只能访问自己的数据

### 策略列表
1. profiles - 用户资料
2. warehouses - 仓库
3. driver_warehouses - 司机-仓库关联
4. manager_warehouses - 管理员-仓库关联
5. attendance - 考勤记录
6. attendance_rules - 考勤规则
7. piece_work_records - 计件记录
8. category_prices - 价格分类
9. leave_applications - 请假申请
10. resignation_applications - 离职申请
11. vehicles - 车辆
12. vehicle_records - 车辆记录
13. driver_licenses - 驾驶证
14. feedback - 反馈
*/

-- ============================================
-- profiles 表策略
-- ============================================

-- 超级管理员可以查看所有用户
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
CREATE POLICY "Super admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以查看自己负责仓库的司机
DROP POLICY IF EXISTS "Managers can view drivers in their warehouses" ON profiles;
CREATE POLICY "Managers can view drivers in their warehouses"
ON profiles FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND (
    role = 'driver'::user_role AND EXISTS (
      SELECT 1 FROM driver_warehouses dw
      JOIN manager_warehouses mw ON dw.warehouse_id = mw.warehouse_id
      WHERE dw.driver_id = profiles.id AND mw.manager_id = auth.uid()
    )
  )
);

-- 用户可以查看自己的资料
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 超级管理员可以更新所有用户
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
CREATE POLICY "Super admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

-- 用户可以更新自己的资料
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 超级管理员可以删除用户
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;
CREATE POLICY "Super admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================
-- warehouses 表策略
-- ============================================

-- 所有认证用户可以查看启用的仓库
DROP POLICY IF EXISTS "Authenticated users can view active warehouses" ON warehouses;
CREATE POLICY "Authenticated users can view active warehouses"
ON warehouses FOR SELECT
TO authenticated
USING (is_active = true OR is_super_admin(auth.uid()));

-- 超级管理员可以管理所有仓库
DROP POLICY IF EXISTS "Super admins can manage all warehouses" ON warehouses;
CREATE POLICY "Super admins can manage all warehouses"
ON warehouses FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================
-- driver_warehouses 表策略
-- ============================================

-- 超级管理员可以查看所有关联
DROP POLICY IF EXISTS "Super admins can view all driver warehouses" ON driver_warehouses;
CREATE POLICY "Super admins can view all driver warehouses"
ON driver_warehouses FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以查看自己负责仓库的司机关联
DROP POLICY IF EXISTS "Managers can view driver warehouses in their warehouses" ON driver_warehouses;
CREATE POLICY "Managers can view driver warehouses in their warehouses"
ON driver_warehouses FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM manager_warehouses
    WHERE manager_id = auth.uid() AND warehouse_id = driver_warehouses.warehouse_id
  )
);

-- 司机可以查看自己的仓库分配
DROP POLICY IF EXISTS "Drivers can view their own warehouse assignments" ON driver_warehouses;
CREATE POLICY "Drivers can view their own warehouse assignments"
ON driver_warehouses FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- 超级管理员可以管理所有司机-仓库关联
DROP POLICY IF EXISTS "Super admins can manage all driver warehouses" ON driver_warehouses;
CREATE POLICY "Super admins can manage all driver warehouses"
ON driver_warehouses FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================
-- manager_warehouses 表策略
-- ============================================

-- 超级管理员可以查看所有关联
DROP POLICY IF EXISTS "Super admins can view all manager warehouses" ON manager_warehouses;
CREATE POLICY "Super admins can view all manager warehouses"
ON manager_warehouses FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以查看自己的仓库分配
DROP POLICY IF EXISTS "Managers can view their own warehouse assignments" ON manager_warehouses;
CREATE POLICY "Managers can view their own warehouse assignments"
ON manager_warehouses FOR SELECT
TO authenticated
USING (auth.uid() = manager_id);

-- 超级管理员可以管理所有管理员-仓库关联
DROP POLICY IF EXISTS "Super admins can manage all manager warehouses" ON manager_warehouses;
CREATE POLICY "Super admins can manage all manager warehouses"
ON manager_warehouses FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================
-- attendance 表策略
-- ============================================

-- 超级管理员可以查看所有考勤记录
DROP POLICY IF EXISTS "Super admins can view all attendance" ON attendance;
CREATE POLICY "Super admins can view all attendance"
ON attendance FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以查看自己负责仓库的考勤记录
DROP POLICY IF EXISTS "Managers can view attendance in their warehouses" ON attendance;
CREATE POLICY "Managers can view attendance in their warehouses"
ON attendance FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- 用户可以查看自己的考勤记录
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
CREATE POLICY "Users can view their own attendance"
ON attendance FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 用户可以创建自己的考勤记录
DROP POLICY IF EXISTS "Users can create their own attendance" ON attendance;
CREATE POLICY "Users can create their own attendance"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 超级管理员可以管理所有考勤记录
DROP POLICY IF EXISTS "Super admins can manage all attendance" ON attendance;
CREATE POLICY "Super admins can manage all attendance"
ON attendance FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以管理自己负责仓库的考勤记录
DROP POLICY IF EXISTS "Managers can manage attendance in their warehouses" ON attendance;
CREATE POLICY "Managers can manage attendance in their warehouses"
ON attendance FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- ============================================
-- attendance_rules 表策略
-- ============================================

-- 所有认证用户可以查看考勤规则
DROP POLICY IF EXISTS "Authenticated users can view attendance rules" ON attendance_rules;
CREATE POLICY "Authenticated users can view attendance rules"
ON attendance_rules FOR SELECT
TO authenticated
USING (true);

-- 超级管理员可以管理所有考勤规则
DROP POLICY IF EXISTS "Super admins can manage all attendance rules" ON attendance_rules;
CREATE POLICY "Super admins can manage all attendance rules"
ON attendance_rules FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================
-- piece_work_records 表策略
-- ============================================

-- 超级管理员可以查看所有计件记录
DROP POLICY IF EXISTS "Super admins can view all piece work records" ON piece_work_records;
CREATE POLICY "Super admins can view all piece work records"
ON piece_work_records FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以查看自己负责仓库的计件记录
DROP POLICY IF EXISTS "Managers can view piece work records in their warehouses" ON piece_work_records;
CREATE POLICY "Managers can view piece work records in their warehouses"
ON piece_work_records FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- 用户可以查看自己的计件记录
DROP POLICY IF EXISTS "Users can view their own piece work records" ON piece_work_records;
CREATE POLICY "Users can view their own piece work records"
ON piece_work_records FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 用户可以创建自己的计件记录
DROP POLICY IF EXISTS "Users can create their own piece work records" ON piece_work_records;
CREATE POLICY "Users can create their own piece work records"
ON piece_work_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的计件记录
DROP POLICY IF EXISTS "Users can update their own piece work records" ON piece_work_records;
CREATE POLICY "Users can update their own piece work records"
ON piece_work_records FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 用户可以删除自己的计件记录
DROP POLICY IF EXISTS "Users can delete their own piece work records" ON piece_work_records;
CREATE POLICY "Users can delete their own piece work records"
ON piece_work_records FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 超级管理员可以管理所有计件记录
DROP POLICY IF EXISTS "Super admins can manage all piece work records" ON piece_work_records;
CREATE POLICY "Super admins can manage all piece work records"
ON piece_work_records FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以管理自己负责仓库的计件记录
DROP POLICY IF EXISTS "Managers can manage piece work records in their warehouses" ON piece_work_records;
CREATE POLICY "Managers can manage piece work records in their warehouses"
ON piece_work_records FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- ============================================
-- category_prices 表策略
-- ============================================

-- 所有认证用户可以查看价格分类
DROP POLICY IF EXISTS "Authenticated users can view category prices" ON category_prices;
CREATE POLICY "Authenticated users can view category prices"
ON category_prices FOR SELECT
TO authenticated
USING (true);

-- 超级管理员可以管理所有价格分类
DROP POLICY IF EXISTS "Super admins can manage all category prices" ON category_prices;
CREATE POLICY "Super admins can manage all category prices"
ON category_prices FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================
-- leave_applications 表策略
-- ============================================

-- 超级管理员可以查看所有请假申请
DROP POLICY IF EXISTS "Super admins can view all leave applications" ON leave_applications;
CREATE POLICY "Super admins can view all leave applications"
ON leave_applications FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以查看自己负责仓库的请假申请
DROP POLICY IF EXISTS "Managers can view leave applications in their warehouses" ON leave_applications;
CREATE POLICY "Managers can view leave applications in their warehouses"
ON leave_applications FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- 用户可以查看自己的请假申请
DROP POLICY IF EXISTS "Users can view their own leave applications" ON leave_applications;
CREATE POLICY "Users can view their own leave applications"
ON leave_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 用户可以创建自己的请假申请
DROP POLICY IF EXISTS "Users can create their own leave applications" ON leave_applications;
CREATE POLICY "Users can create their own leave applications"
ON leave_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 用户可以取消自己的请假申请
DROP POLICY IF EXISTS "Users can cancel their own leave applications" ON leave_applications;
CREATE POLICY "Users can cancel their own leave applications"
ON leave_applications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending'::application_status)
WITH CHECK (status = 'cancelled'::application_status);

-- 超级管理员可以管理所有请假申请
DROP POLICY IF EXISTS "Super admins can manage all leave applications" ON leave_applications;
CREATE POLICY "Super admins can manage all leave applications"
ON leave_applications FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以审批自己负责仓库的请假申请
DROP POLICY IF EXISTS "Managers can approve leave applications in their warehouses" ON leave_applications;
CREATE POLICY "Managers can approve leave applications in their warehouses"
ON leave_applications FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- ============================================
-- resignation_applications 表策略
-- ============================================

-- 超级管理员可以查看所有离职申请
DROP POLICY IF EXISTS "Super admins can view all resignation applications" ON resignation_applications;
CREATE POLICY "Super admins can view all resignation applications"
ON resignation_applications FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以查看自己负责仓库的离职申请
DROP POLICY IF EXISTS "Managers can view resignation applications in their warehouses" ON resignation_applications;
CREATE POLICY "Managers can view resignation applications in their warehouses"
ON resignation_applications FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- 用户可以查看自己的离职申请
DROP POLICY IF EXISTS "Users can view their own resignation applications" ON resignation_applications;
CREATE POLICY "Users can view their own resignation applications"
ON resignation_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 用户可以创建自己的离职申请
DROP POLICY IF EXISTS "Users can create their own resignation applications" ON resignation_applications;
CREATE POLICY "Users can create their own resignation applications"
ON resignation_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 超级管理员可以管理所有离职申请
DROP POLICY IF EXISTS "Super admins can manage all resignation applications" ON resignation_applications;
CREATE POLICY "Super admins can manage all resignation applications"
ON resignation_applications FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- 管理员可以审批自己负责仓库的离职申请
DROP POLICY IF EXISTS "Managers can approve resignation applications in their warehouses" ON resignation_applications;
CREATE POLICY "Managers can approve resignation applications in their warehouses"
ON resignation_applications FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- ============================================
-- vehicles 表策略
-- ============================================

-- 所有认证用户可以查看车辆
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON vehicles;
CREATE POLICY "Authenticated users can view vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (true);

-- 超级管理员可以管理所有车辆
DROP POLICY IF EXISTS "Super admins can manage all vehicles" ON vehicles;
CREATE POLICY "Super admins can manage all vehicles"
ON vehicles FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================
-- vehicle_records 表策略
-- ============================================

-- 超级管理员可以查看所有车辆记录
DROP POLICY IF EXISTS "Super admins can view all vehicle records" ON vehicle_records;
CREATE POLICY "Super admins can view all vehicle records"
ON vehicle_records FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 司机可以查看自己的车辆记录
DROP POLICY IF EXISTS "Drivers can view their own vehicle records" ON vehicle_records;
CREATE POLICY "Drivers can view their own vehicle records"
ON vehicle_records FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- 司机可以创建自己的车辆记录
DROP POLICY IF EXISTS "Drivers can create their own vehicle records" ON vehicle_records;
CREATE POLICY "Drivers can create their own vehicle records"
ON vehicle_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = driver_id);

-- 司机可以更新自己的车辆记录
DROP POLICY IF EXISTS "Drivers can update their own vehicle records" ON vehicle_records;
CREATE POLICY "Drivers can update their own vehicle records"
ON vehicle_records FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id);

-- 超级管理员可以管理所有车辆记录
DROP POLICY IF EXISTS "Super admins can manage all vehicle records" ON vehicle_records;
CREATE POLICY "Super admins can manage all vehicle records"
ON vehicle_records FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================
-- driver_licenses 表策略
-- ============================================

-- 超级管理员可以查看所有驾驶证
DROP POLICY IF EXISTS "Super admins can view all driver licenses" ON driver_licenses;
CREATE POLICY "Super admins can view all driver licenses"
ON driver_licenses FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 司机可以查看自己的驾驶证
DROP POLICY IF EXISTS "Drivers can view their own driver license" ON driver_licenses;
CREATE POLICY "Drivers can view their own driver license"
ON driver_licenses FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- 司机可以创建自己的驾驶证
DROP POLICY IF EXISTS "Drivers can create their own driver license" ON driver_licenses;
CREATE POLICY "Drivers can create their own driver license"
ON driver_licenses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = driver_id);

-- 司机可以更新自己的驾驶证
DROP POLICY IF EXISTS "Drivers can update their own driver license" ON driver_licenses;
CREATE POLICY "Drivers can update their own driver license"
ON driver_licenses FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id);

-- 超级管理员可以管理所有驾驶证
DROP POLICY IF EXISTS "Super admins can manage all driver licenses" ON driver_licenses;
CREATE POLICY "Super admins can manage all driver licenses"
ON driver_licenses FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================
-- feedback 表策略
-- ============================================

-- 管理员可以查看所有反馈
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
CREATE POLICY "Admins can view all feedback"
ON feedback FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- 用户可以查看自己的反馈
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback;
CREATE POLICY "Users can view their own feedback"
ON feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 用户可以创建自己的反馈
DROP POLICY IF EXISTS "Users can create their own feedback" ON feedback;
CREATE POLICY "Users can create their own feedback"
ON feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 管理员可以回复反馈
DROP POLICY IF EXISTS "Admins can respond to feedback" ON feedback;
CREATE POLICY "Admins can respond to feedback"
ON feedback FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));
