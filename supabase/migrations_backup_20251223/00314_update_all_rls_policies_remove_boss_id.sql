/*
# 更新所有表的 RLS 策略 - 删除 boss_id 过滤条件

## 核心原则
1. 删除所有基于 boss_id 的过滤条件
2. 只关注角色权限（super_admin, peer_admin, manager, driver）
3. 简化策略逻辑

## 影响范围
- profiles（已在之前的迁移中更新）
- notifications
- leave_applications
- resignation_applications
- vehicles
- warehouses
- attendance
- piece_work_records
- driver_warehouses
- manager_warehouses
- category_prices
- attendance_rules
- feedback
- leases
- vehicle_records
- driver_licenses
*/

-- ============================================================================
-- 第一部分：删除所有旧的 RLS 策略
-- ============================================================================

-- notifications 表
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Users can mark own notifications as read" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- leave_applications 表
DROP POLICY IF EXISTS "Users can view own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Admins can view all leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can create own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Admins can update leave applications" ON leave_applications;

-- resignation_applications 表
DROP POLICY IF EXISTS "Users can view own resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Admins can view all resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Users can create own resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Admins can update resignation applications" ON resignation_applications;

-- vehicles 表
DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can view all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can manage vehicles" ON vehicles;

-- warehouses 表
DROP POLICY IF EXISTS "All authenticated users can view warehouses" ON warehouses;
DROP POLICY IF EXISTS "Admins can manage warehouses" ON warehouses;

-- attendance 表
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;
DROP POLICY IF EXISTS "Users can create own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can manage attendance" ON attendance;

-- piece_work_records 表
DROP POLICY IF EXISTS "Users can view own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Admins can view all piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Admins can manage piece work records" ON piece_work_records;

-- driver_warehouses 表
DROP POLICY IF EXISTS "All authenticated users can view driver warehouses" ON driver_warehouses;
DROP POLICY IF EXISTS "Admins can manage driver warehouses" ON driver_warehouses;

-- manager_warehouses 表
DROP POLICY IF EXISTS "All authenticated users can view manager warehouses" ON manager_warehouses;
DROP POLICY IF EXISTS "Admins can manage manager warehouses" ON manager_warehouses;

-- category_prices 表
DROP POLICY IF EXISTS "All authenticated users can view category prices" ON category_prices;
DROP POLICY IF EXISTS "Admins can manage category prices" ON category_prices;

-- attendance_rules 表
DROP POLICY IF EXISTS "All authenticated users can view attendance rules" ON attendance_rules;
DROP POLICY IF EXISTS "Admins can manage attendance rules" ON attendance_rules;

-- feedback 表
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Users can create feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON feedback;

-- leases 表
DROP POLICY IF EXISTS "Lease admins can view all leases" ON leases;
DROP POLICY IF EXISTS "Lease admins can manage leases" ON leases;

-- vehicle_records 表
DROP POLICY IF EXISTS "Users can view own vehicle records" ON vehicle_records;
DROP POLICY IF EXISTS "Admins can view all vehicle records" ON vehicle_records;
DROP POLICY IF EXISTS "Admins can manage vehicle records" ON vehicle_records;

-- driver_licenses 表
DROP POLICY IF EXISTS "Users can view own driver licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Admins can view all driver licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Admins can manage driver licenses" ON driver_licenses;

-- ============================================================================
-- 第二部分：创建新的简化 RLS 策略
-- ============================================================================

-- ============================================================================
-- notifications 表
-- ============================================================================

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (recipient_id = auth.uid());

CREATE POLICY "Admins can view all notifications"
ON notifications FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

COMMENT ON POLICY "Users can view own notifications" ON notifications IS '用户可以查看自己的通知';
COMMENT ON POLICY "Admins can view all notifications" ON notifications IS '管理员可以查看所有通知';
COMMENT ON POLICY "Users can update own notifications" ON notifications IS '用户可以更新自己的通知（标记已读）';
COMMENT ON POLICY "System can insert notifications" ON notifications IS '系统可以插入通知';

-- ============================================================================
-- leave_applications 表
-- ============================================================================

CREATE POLICY "Users can view own leave applications"
ON leave_applications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all leave applications"
ON leave_applications FOR SELECT
USING (is_admin(auth.uid()) OR is_manager(auth.uid()));

CREATE POLICY "Users can create own leave applications"
ON leave_applications FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update leave applications"
ON leave_applications FOR UPDATE
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));

COMMENT ON POLICY "Users can view own leave applications" ON leave_applications IS '用户可以查看自己的请假申请';
COMMENT ON POLICY "Admins can view all leave applications" ON leave_applications IS '管理员可以查看所有请假申请';
COMMENT ON POLICY "Users can create own leave applications" ON leave_applications IS '用户可以创建自己的请假申请';
COMMENT ON POLICY "Admins can update leave applications" ON leave_applications IS '管理员可以更新请假申请（审批）';

-- ============================================================================
-- resignation_applications 表
-- ============================================================================

CREATE POLICY "Users can view own resignation applications"
ON resignation_applications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all resignation applications"
ON resignation_applications FOR SELECT
USING (is_admin(auth.uid()) OR is_manager(auth.uid()));

CREATE POLICY "Users can create own resignation applications"
ON resignation_applications FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update resignation applications"
ON resignation_applications FOR UPDATE
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));

COMMENT ON POLICY "Users can view own resignation applications" ON resignation_applications IS '用户可以查看自己的离职申请';
COMMENT ON POLICY "Admins can view all resignation applications" ON resignation_applications IS '管理员可以查看所有离职申请';
COMMENT ON POLICY "Users can create own resignation applications" ON resignation_applications IS '用户可以创建自己的离职申请';
COMMENT ON POLICY "Admins can update resignation applications" ON resignation_applications IS '管理员可以更新离职申请（审批）';

-- ============================================================================
-- vehicles 表
-- ============================================================================

CREATE POLICY "Users can view own vehicles"
ON vehicles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all vehicles"
ON vehicles FOR SELECT
USING (is_admin(auth.uid()) OR is_manager(auth.uid()));

CREATE POLICY "Admins can manage vehicles"
ON vehicles FOR ALL
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));

COMMENT ON POLICY "Users can view own vehicles" ON vehicles IS '用户可以查看自己的车辆';
COMMENT ON POLICY "Admins can view all vehicles" ON vehicles IS '管理员可以查看所有车辆';
COMMENT ON POLICY "Admins can manage vehicles" ON vehicles IS '管理员可以管理车辆';

-- ============================================================================
-- warehouses 表
-- ============================================================================

CREATE POLICY "All authenticated users can view warehouses"
ON warehouses FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage warehouses"
ON warehouses FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

COMMENT ON POLICY "All authenticated users can view warehouses" ON warehouses IS '所有认证用户可以查看仓库';
COMMENT ON POLICY "Admins can manage warehouses" ON warehouses IS '管理员可以管理仓库';

-- ============================================================================
-- attendance 表
-- ============================================================================

CREATE POLICY "Users can view own attendance"
ON attendance FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all attendance"
ON attendance FOR SELECT
USING (is_admin(auth.uid()) OR is_manager(auth.uid()));

CREATE POLICY "Users can create own attendance"
ON attendance FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage attendance"
ON attendance FOR ALL
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));

COMMENT ON POLICY "Users can view own attendance" ON attendance IS '用户可以查看自己的考勤';
COMMENT ON POLICY "Admins can view all attendance" ON attendance IS '管理员可以查看所有考勤';
COMMENT ON POLICY "Users can create own attendance" ON attendance IS '用户可以创建自己的考勤';
COMMENT ON POLICY "Admins can manage attendance" ON attendance IS '管理员可以管理考勤';

-- ============================================================================
-- piece_work_records 表
-- ============================================================================

CREATE POLICY "Users can view own piece work records"
ON piece_work_records FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all piece work records"
ON piece_work_records FOR SELECT
USING (is_admin(auth.uid()) OR is_manager(auth.uid()));

CREATE POLICY "Admins can manage piece work records"
ON piece_work_records FOR ALL
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));

COMMENT ON POLICY "Users can view own piece work records" ON piece_work_records IS '用户可以查看自己的计件记录';
COMMENT ON POLICY "Admins can view all piece work records" ON piece_work_records IS '管理员可以查看所有计件记录';
COMMENT ON POLICY "Admins can manage piece work records" ON piece_work_records IS '管理员可以管理计件记录';

-- ============================================================================
-- driver_warehouses 表
-- ============================================================================

CREATE POLICY "All authenticated users can view driver warehouses"
ON driver_warehouses FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage driver warehouses"
ON driver_warehouses FOR ALL
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));

COMMENT ON POLICY "All authenticated users can view driver warehouses" ON driver_warehouses IS '所有认证用户可以查看司机仓库关联';
COMMENT ON POLICY "Admins can manage driver warehouses" ON driver_warehouses IS '管理员可以管理司机仓库关联';

-- ============================================================================
-- manager_warehouses 表
-- ============================================================================

CREATE POLICY "All authenticated users can view manager warehouses"
ON manager_warehouses FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage manager warehouses"
ON manager_warehouses FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

COMMENT ON POLICY "All authenticated users can view manager warehouses" ON manager_warehouses IS '所有认证用户可以查看车队长仓库关联';
COMMENT ON POLICY "Admins can manage manager warehouses" ON manager_warehouses IS '管理员可以管理车队长仓库关联';

-- ============================================================================
-- category_prices 表
-- ============================================================================

CREATE POLICY "All authenticated users can view category prices"
ON category_prices FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage category prices"
ON category_prices FOR ALL
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));

COMMENT ON POLICY "All authenticated users can view category prices" ON category_prices IS '所有认证用户可以查看品类价格';
COMMENT ON POLICY "Admins can manage category prices" ON category_prices IS '管理员可以管理品类价格';

-- ============================================================================
-- attendance_rules 表
-- ============================================================================

CREATE POLICY "All authenticated users can view attendance rules"
ON attendance_rules FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage attendance rules"
ON attendance_rules FOR ALL
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));

COMMENT ON POLICY "All authenticated users can view attendance rules" ON attendance_rules IS '所有认证用户可以查看考勤规则';
COMMENT ON POLICY "Admins can manage attendance rules" ON attendance_rules IS '管理员可以管理考勤规则';

-- ============================================================================
-- feedback 表
-- ============================================================================

CREATE POLICY "Users can view own feedback"
ON feedback FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
ON feedback FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Users can create feedback"
ON feedback FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update feedback"
ON feedback FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

COMMENT ON POLICY "Users can view own feedback" ON feedback IS '用户可以查看自己的反馈';
COMMENT ON POLICY "Admins can view all feedback" ON feedback IS '管理员可以查看所有反馈';
COMMENT ON POLICY "Users can create feedback" ON feedback IS '用户可以创建反馈';
COMMENT ON POLICY "Admins can update feedback" ON feedback IS '管理员可以更新反馈';

-- ============================================================================
-- leases 表
-- ============================================================================

CREATE POLICY "Lease admins can view all leases"
ON leases FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'lease_admin');

CREATE POLICY "Lease admins can manage leases"
ON leases FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'lease_admin')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'lease_admin');

COMMENT ON POLICY "Lease admins can view all leases" ON leases IS '租赁管理员可以查看所有租期';
COMMENT ON POLICY "Lease admins can manage leases" ON leases IS '租赁管理员可以管理租期';

-- ============================================================================
-- vehicle_records 表
-- ============================================================================

CREATE POLICY "Admins can view all vehicle records"
ON vehicle_records FOR SELECT
USING (is_admin(auth.uid()) OR is_manager(auth.uid()));

CREATE POLICY "Admins can manage vehicle records"
ON vehicle_records FOR ALL
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));

COMMENT ON POLICY "Admins can view all vehicle records" ON vehicle_records IS '管理员可以查看所有车辆记录';
COMMENT ON POLICY "Admins can manage vehicle records" ON vehicle_records IS '管理员可以管理车辆记录';

-- ============================================================================
-- driver_licenses 表
-- ============================================================================

CREATE POLICY "Users can view own driver licenses"
ON driver_licenses FOR SELECT
USING (driver_id = auth.uid());

CREATE POLICY "Admins can view all driver licenses"
ON driver_licenses FOR SELECT
USING (is_admin(auth.uid()) OR is_manager(auth.uid()));

CREATE POLICY "Admins can manage driver licenses"
ON driver_licenses FOR ALL
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));

COMMENT ON POLICY "Users can view own driver licenses" ON driver_licenses IS '用户可以查看自己的驾驶证';
COMMENT ON POLICY "Admins can view all driver licenses" ON driver_licenses IS '管理员可以查看所有驾驶证';
COMMENT ON POLICY "Admins can manage driver licenses" ON driver_licenses IS '管理员可以管理驾驶证';
