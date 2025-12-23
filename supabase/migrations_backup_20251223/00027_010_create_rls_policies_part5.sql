-- leave_applications 表策略
DROP POLICY IF EXISTS "Super admins can view all leave applications" ON leave_applications;
CREATE POLICY "Super admins can view all leave applications"
ON leave_applications FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers can view leave applications in their warehouses" ON leave_applications;
CREATE POLICY "Managers can view leave applications in their warehouses"
ON leave_applications FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

DROP POLICY IF EXISTS "Users can view their own leave applications" ON leave_applications;
CREATE POLICY "Users can view their own leave applications"
ON leave_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own leave applications" ON leave_applications;
CREATE POLICY "Users can create their own leave applications"
ON leave_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can cancel their own leave applications" ON leave_applications;
CREATE POLICY "Users can cancel their own leave applications"
ON leave_applications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending'::application_status)
WITH CHECK (status = 'cancelled'::application_status);

DROP POLICY IF EXISTS "Super admins can manage all leave applications" ON leave_applications;
CREATE POLICY "Super admins can manage all leave applications"
ON leave_applications FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers can approve leave applications in their warehouses" ON leave_applications;
CREATE POLICY "Managers can approve leave applications in their warehouses"
ON leave_applications FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- resignation_applications 表策略
DROP POLICY IF EXISTS "Super admins can view all resignation applications" ON resignation_applications;
CREATE POLICY "Super admins can view all resignation applications"
ON resignation_applications FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers can view resignation applications in their warehouses" ON resignation_applications;
CREATE POLICY "Managers can view resignation applications in their warehouses"
ON resignation_applications FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

DROP POLICY IF EXISTS "Users can view their own resignation applications" ON resignation_applications;
CREATE POLICY "Users can view their own resignation applications"
ON resignation_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own resignation applications" ON resignation_applications;
CREATE POLICY "Users can create their own resignation applications"
ON resignation_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage all resignation applications" ON resignation_applications;
CREATE POLICY "Super admins can manage all resignation applications"
ON resignation_applications FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers can approve resignation applications in their warehouses" ON resignation_applications;
CREATE POLICY "Managers can approve resignation applications in their warehouses"
ON resignation_applications FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);