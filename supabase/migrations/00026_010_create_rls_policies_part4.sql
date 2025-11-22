-- piece_work_records 表策略
DROP POLICY IF EXISTS "Super admins can view all piece work records" ON piece_work_records;
CREATE POLICY "Super admins can view all piece work records"
ON piece_work_records FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers can view piece work records in their warehouses" ON piece_work_records;
CREATE POLICY "Managers can view piece work records in their warehouses"
ON piece_work_records FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

DROP POLICY IF EXISTS "Users can view their own piece work records" ON piece_work_records;
CREATE POLICY "Users can view their own piece work records"
ON piece_work_records FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own piece work records" ON piece_work_records;
CREATE POLICY "Users can create their own piece work records"
ON piece_work_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own piece work records" ON piece_work_records;
CREATE POLICY "Users can update their own piece work records"
ON piece_work_records FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own piece work records" ON piece_work_records;
CREATE POLICY "Users can delete their own piece work records"
ON piece_work_records FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage all piece work records" ON piece_work_records;
CREATE POLICY "Super admins can manage all piece work records"
ON piece_work_records FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers can manage piece work records in their warehouses" ON piece_work_records;
CREATE POLICY "Managers can manage piece work records in their warehouses"
ON piece_work_records FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) AND is_manager_of_warehouse(auth.uid(), warehouse_id)
);

-- category_prices 表策略
DROP POLICY IF EXISTS "Authenticated users can view category prices" ON category_prices;
CREATE POLICY "Authenticated users can view category prices"
ON category_prices FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Super admins can manage all category prices" ON category_prices;
CREATE POLICY "Super admins can manage all category prices"
ON category_prices FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));