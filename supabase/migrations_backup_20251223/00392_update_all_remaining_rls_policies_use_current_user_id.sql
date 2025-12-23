/*
# 更新所有剩余的 RLS 策略使用 current_user_id()

## 说明
更新所有仍在使用 auth.uid() 的 RLS 策略，统一使用 current_user_id()。
这是确保所有 RLS 策略都使用安全代理函数的最终步骤。

## 修改内容
1. attendance 表的 RLS 策略
2. attendance_rules 表的 RLS 策略
3. driver_licenses 表的 RLS 策略
4. feedback 表的 RLS 策略
5. leave_applications 表的 RLS 策略
6. resignation_applications 表的 RLS 策略
7. piece_work_records 表的 RLS 策略
8. vehicle_records 表的 RLS 策略
9. vehicles 表的 RLS 策略
10. warehouses 表的 RLS 策略
11. notifications 表的 RLS 策略
12. 其他所有相关表的 RLS 策略

## 核心原则
- 使用 public.current_user_id() 替代 auth.uid()
- 保留 RLS 策略的安全保护
- 显式指定函数路径

*/

-- ============================================================================
-- attendance 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;
DROP POLICY IF EXISTS "Users can create own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;

CREATE POLICY "Admins can manage attendance"
ON attendance FOR ALL
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Admins can view all attendance"
ON attendance FOR SELECT
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Users can create own attendance"
ON attendance FOR INSERT
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can view own attendance"
ON attendance FOR SELECT
USING (user_id = public.current_user_id());

-- ============================================================================
-- attendance_rules 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage attendance rules" ON attendance_rules;
DROP POLICY IF EXISTS "All authenticated users can view attendance rules" ON attendance_rules;

CREATE POLICY "Admins can manage attendance rules"
ON attendance_rules FOR ALL
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "All authenticated users can view attendance rules"
ON attendance_rules FOR SELECT
USING (public.current_user_id() IS NOT NULL);

-- ============================================================================
-- driver_licenses 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage driver licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Admins can view all driver licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Drivers can create their own driver license" ON driver_licenses;
DROP POLICY IF EXISTS "Drivers can update their own driver license" ON driver_licenses;
DROP POLICY IF EXISTS "Drivers can view their own driver license" ON driver_licenses;
DROP POLICY IF EXISTS "Users can view own driver licenses" ON driver_licenses;

CREATE POLICY "Admins can manage driver licenses"
ON driver_licenses FOR ALL
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Admins can view all driver licenses"
ON driver_licenses FOR SELECT
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Drivers can create their own driver license"
ON driver_licenses FOR INSERT
WITH CHECK (public.current_user_id() = driver_id);

CREATE POLICY "Drivers can update their own driver license"
ON driver_licenses FOR UPDATE
USING (public.current_user_id() = driver_id);

CREATE POLICY "Drivers can view their own driver license"
ON driver_licenses FOR SELECT
USING (public.current_user_id() = driver_id);

-- ============================================================================
-- feedback 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins can update feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Users can create feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;

CREATE POLICY "Admins can update feedback"
ON feedback FOR UPDATE
USING (is_admin(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()));

CREATE POLICY "Admins can view all feedback"
ON feedback FOR SELECT
USING (is_admin(public.current_user_id()));

CREATE POLICY "Users can create feedback"
ON feedback FOR INSERT
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can view own feedback"
ON feedback FOR SELECT
USING (user_id = public.current_user_id());

-- ============================================================================
-- leave_applications 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins can update leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Admins can view all leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Driver can manage own leaves" ON leave_applications;
DROP POLICY IF EXISTS "Users can create own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can view own leave applications" ON leave_applications;

CREATE POLICY "Admins can update leave applications"
ON leave_applications FOR UPDATE
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Admins can view all leave applications"
ON leave_applications FOR SELECT
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Driver can manage own leaves"
ON leave_applications FOR ALL
USING (user_id = public.current_user_id())
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can create own leave applications"
ON leave_applications FOR INSERT
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can view own leave applications"
ON leave_applications FOR SELECT
USING (user_id = public.current_user_id());

-- ============================================================================
-- resignation_applications 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins can update resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Admins can view all resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Driver can manage own resignations" ON resignation_applications;
DROP POLICY IF EXISTS "Users can create own resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Users can view own resignation applications" ON resignation_applications;

CREATE POLICY "Admins can update resignation applications"
ON resignation_applications FOR UPDATE
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Admins can view all resignation applications"
ON resignation_applications FOR SELECT
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Driver can manage own resignations"
ON resignation_applications FOR ALL
USING (user_id = public.current_user_id())
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can create own resignation applications"
ON resignation_applications FOR INSERT
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can view own resignation applications"
ON resignation_applications FOR SELECT
USING (user_id = public.current_user_id());

-- ============================================================================
-- piece_work_records 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins and bosses can manage piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Admins and bosses can view all piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Drivers can create own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Drivers can update own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can view own piece work records" ON piece_work_records;

CREATE POLICY "Admins and bosses can manage piece work records"
ON piece_work_records FOR ALL
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()) OR is_boss(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()) OR is_boss(public.current_user_id()));

CREATE POLICY "Admins and bosses can view all piece work records"
ON piece_work_records FOR SELECT
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()) OR is_boss(public.current_user_id()));

CREATE POLICY "Drivers can create own piece work records"
ON piece_work_records FOR INSERT
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Drivers can update own piece work records"
ON piece_work_records FOR UPDATE
USING (user_id = public.current_user_id())
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can view own piece work records"
ON piece_work_records FOR SELECT
USING (user_id = public.current_user_id());

-- ============================================================================
-- vehicle_records 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage vehicle records" ON vehicle_records;
DROP POLICY IF EXISTS "Admins can view all vehicle records" ON vehicle_records;

CREATE POLICY "Admins can manage vehicle records"
ON vehicle_records FOR ALL
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Admins can view all vehicle records"
ON vehicle_records FOR SELECT
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

-- ============================================================================
-- vehicles 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can view all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;

CREATE POLICY "Admins can manage vehicles"
ON vehicles FOR ALL
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Admins can view all vehicles"
ON vehicles FOR SELECT
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "Users can view own vehicles"
ON vehicles FOR SELECT
USING (user_id = public.current_user_id());

-- ============================================================================
-- warehouses 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage warehouses" ON warehouses;
DROP POLICY IF EXISTS "All authenticated users can view warehouses" ON warehouses;

CREATE POLICY "Admins can manage warehouses"
ON warehouses FOR ALL
USING (is_admin(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()));

CREATE POLICY "All authenticated users can view warehouses"
ON warehouses FOR SELECT
USING (public.current_user_id() IS NOT NULL);

-- ============================================================================
-- category_prices 表的 RLS 策略
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage category prices" ON category_prices;
DROP POLICY IF EXISTS "All authenticated users can view category prices" ON category_prices;

CREATE POLICY "Admins can manage category prices"
ON category_prices FOR ALL
USING (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()))
WITH CHECK (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()));

CREATE POLICY "All authenticated users can view category prices"
ON category_prices FOR SELECT
USING (public.current_user_id() IS NOT NULL);