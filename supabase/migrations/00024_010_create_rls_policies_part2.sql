-- driver_warehouses 表策略
DROP POLICY IF EXISTS "Super admins can view all driver warehouses" ON driver_warehouses;
CREATE POLICY "Super admins can view all driver warehouses"
ON driver_warehouses FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

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

DROP POLICY IF EXISTS "Drivers can view their own warehouse assignments" ON driver_warehouses;
CREATE POLICY "Drivers can view their own warehouse assignments"
ON driver_warehouses FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Super admins can manage all driver warehouses" ON driver_warehouses;
CREATE POLICY "Super admins can manage all driver warehouses"
ON driver_warehouses FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- manager_warehouses 表策略
DROP POLICY IF EXISTS "Super admins can view all manager warehouses" ON manager_warehouses;
CREATE POLICY "Super admins can view all manager warehouses"
ON manager_warehouses FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers can view their own warehouse assignments" ON manager_warehouses;
CREATE POLICY "Managers can view their own warehouse assignments"
ON manager_warehouses FOR SELECT
TO authenticated
USING (auth.uid() = manager_id);

DROP POLICY IF EXISTS "Super admins can manage all manager warehouses" ON manager_warehouses;
CREATE POLICY "Super admins can manage all manager warehouses"
ON manager_warehouses FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));