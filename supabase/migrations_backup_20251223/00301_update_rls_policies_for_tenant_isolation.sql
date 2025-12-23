/*
# 更新 RLS 策略实现租户隔离

## 目标
为所有业务表更新 RLS 策略，确保完全的租户数据隔离。

## 策略原则
1. 老板（super_admin）只能访问 boss_id = 自己ID 的数据
2. 车队长（manager）只能访问 boss_id = 所属老板ID 的数据
3. 司机（driver）只能访问 boss_id = 所属老板ID 的数据
4. 所有操作都必须验证 boss_id

## 更新的表
- profiles
- attendance
- piece_work_records
- leave_applications
- resignations
- vehicles
- feedback
- driver_warehouses
- manager_warehouses
- driver_licenses
- warehouse_categories
- category_prices
- vehicle_reviews
- leases
*/

-- ============================================
-- 删除所有旧的 RLS 策略
-- ============================================

-- profiles 表
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins have full access" ON profiles;
DROP POLICY IF EXISTS "Managers can view drivers" ON profiles;
DROP POLICY IF EXISTS "Managers can view drivers in same tenant" ON profiles;
DROP POLICY IF EXISTS "Managers can create drivers" ON profiles;
DROP POLICY IF EXISTS "Managers can update drivers" ON profiles;
DROP POLICY IF EXISTS "Managers can delete drivers" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;

-- attendance 表
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can insert own attendance" ON attendance;
DROP POLICY IF EXISTS "Managers can view attendance" ON attendance;
DROP POLICY IF EXISTS "Managers can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Super admins can view all attendance" ON attendance;
DROP POLICY IF EXISTS "Super admins can manage attendance" ON attendance;

-- piece_work_records 表
DROP POLICY IF EXISTS "Users can view own piece work" ON piece_work_records;
DROP POLICY IF EXISTS "Managers can view piece work" ON piece_work_records;
DROP POLICY IF EXISTS "Managers can manage piece work" ON piece_work_records;
DROP POLICY IF EXISTS "Super admins can view all piece work" ON piece_work_records;
DROP POLICY IF EXISTS "Super admins can manage piece work" ON piece_work_records;

-- leave_applications 表
DROP POLICY IF EXISTS "Users can view own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Users can insert own leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Managers can view leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Managers can manage leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Super admins can view all leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Super admins can manage leave applications" ON leave_applications;

-- resignations 表
DROP POLICY IF EXISTS "Users can view own resignations" ON resignations;
DROP POLICY IF EXISTS "Users can insert own resignations" ON resignations;
DROP POLICY IF EXISTS "Managers can view resignations" ON resignations;
DROP POLICY IF EXISTS "Managers can manage resignations" ON resignations;
DROP POLICY IF EXISTS "Super admins can view all resignations" ON resignations;
DROP POLICY IF EXISTS "Super admins can manage resignations" ON resignations;

-- vehicles 表
DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Managers can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "Managers can manage vehicles" ON vehicles;
DROP POLICY IF EXISTS "Super admins can view all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Super admins can manage vehicles" ON vehicles;

-- feedback 表
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;
DROP POLICY IF EXISTS "Managers can view feedback" ON feedback;
DROP POLICY IF EXISTS "Super admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Super admins can manage feedback" ON feedback;

-- driver_warehouses 表
DROP POLICY IF EXISTS "Users can view own warehouse assignments" ON driver_warehouses;
DROP POLICY IF EXISTS "Managers can view warehouse assignments" ON driver_warehouses;
DROP POLICY IF EXISTS "Managers can manage warehouse assignments" ON driver_warehouses;
DROP POLICY IF EXISTS "Super admins can view all warehouse assignments" ON driver_warehouses;
DROP POLICY IF EXISTS "Super admins can manage warehouse assignments" ON driver_warehouses;

-- manager_warehouses 表
DROP POLICY IF EXISTS "Managers can view own warehouse assignments" ON manager_warehouses;
DROP POLICY IF EXISTS "Super admins can view all manager warehouse assignments" ON manager_warehouses;
DROP POLICY IF EXISTS "Super admins can manage manager warehouse assignments" ON manager_warehouses;

-- driver_licenses 表
DROP POLICY IF EXISTS "Users can view own driver license" ON driver_licenses;
DROP POLICY IF EXISTS "Managers can view driver licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Super admins can view all driver licenses" ON driver_licenses;
DROP POLICY IF EXISTS "Super admins can manage driver licenses" ON driver_licenses;

-- warehouse_categories 表
DROP POLICY IF EXISTS "Users can view warehouse categories" ON warehouse_categories;
DROP POLICY IF EXISTS "Managers can view warehouse categories" ON warehouse_categories;
DROP POLICY IF EXISTS "Super admins can view all warehouse categories" ON warehouse_categories;
DROP POLICY IF EXISTS "Super admins can manage warehouse categories" ON warehouse_categories;

-- category_prices 表
DROP POLICY IF EXISTS "Users can view category prices" ON category_prices;
DROP POLICY IF EXISTS "Managers can view category prices" ON category_prices;
DROP POLICY IF EXISTS "Super admins can view all category prices" ON category_prices;
DROP POLICY IF EXISTS "Super admins can manage category prices" ON category_prices;

-- vehicle_reviews 表
DROP POLICY IF EXISTS "Users can view own vehicle reviews" ON vehicle_reviews;
DROP POLICY IF EXISTS "Managers can view vehicle reviews" ON vehicle_reviews;
DROP POLICY IF EXISTS "Super admins can view all vehicle reviews" ON vehicle_reviews;
DROP POLICY IF EXISTS "Super admins can manage vehicle reviews" ON vehicle_reviews;

-- leases 表
DROP POLICY IF EXISTS "Users can view own leases" ON leases;
DROP POLICY IF EXISTS "Managers can view leases" ON leases;
DROP POLICY IF EXISTS "Super admins can view all leases" ON leases;
DROP POLICY IF EXISTS "Super admins can manage leases" ON leases;

-- ============================================
-- 创建新的 RLS 策略（基于 boss_id）
-- ============================================

-- 1. profiles 表
CREATE POLICY "Tenant isolation for profiles SELECT"
  ON profiles FOR SELECT
  USING (
    boss_id = get_current_user_boss_id()
    OR id = auth.uid()  -- 用户可以查看自己的资料
  );

CREATE POLICY "Tenant isolation for profiles INSERT"
  ON profiles FOR INSERT
  WITH CHECK (
    boss_id = get_current_user_boss_id()
  );

CREATE POLICY "Tenant isolation for profiles UPDATE"
  ON profiles FOR UPDATE
  USING (
    boss_id = get_current_user_boss_id()
    OR id = auth.uid()  -- 用户可以更新自己的资料
  )
  WITH CHECK (
    boss_id = get_current_user_boss_id()
    OR id = auth.uid()
  );

CREATE POLICY "Tenant isolation for profiles DELETE"
  ON profiles FOR DELETE
  USING (
    boss_id = get_current_user_boss_id()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'::user_role
    )
  );

-- 2. attendance 表
CREATE POLICY "Tenant isolation for attendance SELECT"
  ON attendance FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for attendance INSERT"
  ON attendance FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for attendance UPDATE"
  ON attendance FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for attendance DELETE"
  ON attendance FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 3. piece_work_records 表
CREATE POLICY "Tenant isolation for piece_work_records SELECT"
  ON piece_work_records FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for piece_work_records INSERT"
  ON piece_work_records FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for piece_work_records UPDATE"
  ON piece_work_records FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for piece_work_records DELETE"
  ON piece_work_records FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 4. leave_applications 表
CREATE POLICY "Tenant isolation for leave_applications SELECT"
  ON leave_applications FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for leave_applications INSERT"
  ON leave_applications FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for leave_applications UPDATE"
  ON leave_applications FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for leave_applications DELETE"
  ON leave_applications FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 5. resignations 表
CREATE POLICY "Tenant isolation for resignations SELECT"
  ON resignations FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for resignations INSERT"
  ON resignations FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for resignations UPDATE"
  ON resignations FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for resignations DELETE"
  ON resignations FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 6. vehicles 表
CREATE POLICY "Tenant isolation for vehicles SELECT"
  ON vehicles FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for vehicles INSERT"
  ON vehicles FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for vehicles UPDATE"
  ON vehicles FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for vehicles DELETE"
  ON vehicles FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 7. feedback 表
CREATE POLICY "Tenant isolation for feedback SELECT"
  ON feedback FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for feedback INSERT"
  ON feedback FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for feedback UPDATE"
  ON feedback FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for feedback DELETE"
  ON feedback FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 8. driver_warehouses 表
CREATE POLICY "Tenant isolation for driver_warehouses SELECT"
  ON driver_warehouses FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for driver_warehouses INSERT"
  ON driver_warehouses FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for driver_warehouses UPDATE"
  ON driver_warehouses FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for driver_warehouses DELETE"
  ON driver_warehouses FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 9. manager_warehouses 表
CREATE POLICY "Tenant isolation for manager_warehouses SELECT"
  ON manager_warehouses FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for manager_warehouses INSERT"
  ON manager_warehouses FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for manager_warehouses UPDATE"
  ON manager_warehouses FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for manager_warehouses DELETE"
  ON manager_warehouses FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 10. driver_licenses 表
CREATE POLICY "Tenant isolation for driver_licenses SELECT"
  ON driver_licenses FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for driver_licenses INSERT"
  ON driver_licenses FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for driver_licenses UPDATE"
  ON driver_licenses FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for driver_licenses DELETE"
  ON driver_licenses FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 11. warehouse_categories 表
CREATE POLICY "Tenant isolation for warehouse_categories SELECT"
  ON warehouse_categories FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for warehouse_categories INSERT"
  ON warehouse_categories FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for warehouse_categories UPDATE"
  ON warehouse_categories FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for warehouse_categories DELETE"
  ON warehouse_categories FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 12. category_prices 表
CREATE POLICY "Tenant isolation for category_prices SELECT"
  ON category_prices FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for category_prices INSERT"
  ON category_prices FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for category_prices UPDATE"
  ON category_prices FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for category_prices DELETE"
  ON category_prices FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 13. vehicle_reviews 表
CREATE POLICY "Tenant isolation for vehicle_reviews SELECT"
  ON vehicle_reviews FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for vehicle_reviews INSERT"
  ON vehicle_reviews FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for vehicle_reviews UPDATE"
  ON vehicle_reviews FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for vehicle_reviews DELETE"
  ON vehicle_reviews FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- 14. leases 表
CREATE POLICY "Tenant isolation for leases SELECT"
  ON leases FOR SELECT
  USING (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for leases INSERT"
  ON leases FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for leases UPDATE"
  ON leases FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());

CREATE POLICY "Tenant isolation for leases DELETE"
  ON leases FOR DELETE
  USING (boss_id = get_current_user_boss_id());

-- ============================================
-- 完成
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS 策略更新完成！';
  RAISE NOTICE '所有表已启用基于 boss_id 的租户隔离';
  RAISE NOTICE '每个租户只能访问自己的数据';
END $$;
