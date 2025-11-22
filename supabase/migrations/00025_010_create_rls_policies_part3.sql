-- attendance 表策略
DROP POLICY IF EXISTS "Super admins can view all attendance" ON attendance;
CREATE POLICY "Super admins can view all attendance"
ON attendance FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers can view attendance in their warehouses" ON attendance;
CREATE POLICY "Managers can view attendance in their warehouses"
ON attendance FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
CREATE POLICY "Users can view their own attendance"
ON attendance FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own attendance" ON attendance;
CREATE POLICY "Users can create their own attendance"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage all attendance" ON attendance;
CREATE POLICY "Super admins can manage all attendance"
ON attendance FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers can manage attendance in their warehouses" ON attendance;
CREATE POLICY "Managers can manage attendance in their warehouses"
ON attendance FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- attendance_rules 表策略
DROP POLICY IF EXISTS "Authenticated users can view attendance rules" ON attendance_rules;
CREATE POLICY "Authenticated users can view attendance rules"
ON attendance_rules FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Super admins can manage all attendance rules" ON attendance_rules;
CREATE POLICY "Super admins can manage all attendance rules"
ON attendance_rules FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));