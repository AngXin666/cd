-- profiles 表策略
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
CREATE POLICY "Super admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

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

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
CREATE POLICY "Super admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;
CREATE POLICY "Super admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- warehouses 表策略
DROP POLICY IF EXISTS "Authenticated users can view active warehouses" ON warehouses;
CREATE POLICY "Authenticated users can view active warehouses"
ON warehouses FOR SELECT
TO authenticated
USING (is_active = true OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage all warehouses" ON warehouses;
CREATE POLICY "Super admins can manage all warehouses"
ON warehouses FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));