-- vehicles 表策略
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON vehicles;
CREATE POLICY "Authenticated users can view vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Super admins can manage all vehicles" ON vehicles;
CREATE POLICY "Super admins can manage all vehicles"
ON vehicles FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- vehicle_records 表策略
DROP POLICY IF EXISTS "Super admins can view all vehicle records" ON vehicle_records;
CREATE POLICY "Super admins can view all vehicle records"
ON vehicle_records FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Drivers can view their own vehicle records" ON vehicle_records;
CREATE POLICY "Drivers can view their own vehicle records"
ON vehicle_records FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can create their own vehicle records" ON vehicle_records;
CREATE POLICY "Drivers can create their own vehicle records"
ON vehicle_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can update their own vehicle records" ON vehicle_records;
CREATE POLICY "Drivers can update their own vehicle records"
ON vehicle_records FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Super admins can manage all vehicle records" ON vehicle_records;
CREATE POLICY "Super admins can manage all vehicle records"
ON vehicle_records FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- driver_licenses 表策略
DROP POLICY IF EXISTS "Super admins can view all driver licenses" ON driver_licenses;
CREATE POLICY "Super admins can view all driver licenses"
ON driver_licenses FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Drivers can view their own driver license" ON driver_licenses;
CREATE POLICY "Drivers can view their own driver license"
ON driver_licenses FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can create their own driver license" ON driver_licenses;
CREATE POLICY "Drivers can create their own driver license"
ON driver_licenses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can update their own driver license" ON driver_licenses;
CREATE POLICY "Drivers can update their own driver license"
ON driver_licenses FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Super admins can manage all driver licenses" ON driver_licenses;
CREATE POLICY "Super admins can manage all driver licenses"
ON driver_licenses FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- feedback 表策略
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
CREATE POLICY "Admins can view all feedback"
ON feedback FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback;
CREATE POLICY "Users can view their own feedback"
ON feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own feedback" ON feedback;
CREATE POLICY "Users can create their own feedback"
ON feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can respond to feedback" ON feedback;
CREATE POLICY "Admins can respond to feedback"
ON feedback FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));