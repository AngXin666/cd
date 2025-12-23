/*
# 实现完整的多租户数据隔离 V2

## 目标
为所有业务表添加 boss_id 字段，实现完全的租户数据隔离。
*/

-- ============================================
-- 第一步：删除旧函数并创建新的辅助函数
-- ============================================

-- 删除旧的函数
DROP FUNCTION IF EXISTS get_current_user_boss_id();

-- 获取当前用户的 boss_id
CREATE OR REPLACE FUNCTION get_current_user_boss_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE
    WHEN p.role = 'super_admin'::user_role THEN p.id
    WHEN p.main_account_id IS NOT NULL THEN p.main_account_id
    ELSE NULL
  END
  FROM profiles p
  WHERE p.id = auth.uid();
$$;

-- ============================================
-- 第二步：为所有表添加 boss_id 字段
-- ============================================

-- 1. profiles 表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_boss_id ON profiles(boss_id);

-- 2. attendance 表
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_attendance_boss_id ON attendance(boss_id);

-- 3. piece_work_records 表
ALTER TABLE piece_work_records ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_boss_id ON piece_work_records(boss_id);

-- 4. leave_applications 表
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_boss_id ON leave_applications(boss_id);

-- 5. resignations 表
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_resignations_boss_id ON resignations(boss_id);

-- 6. vehicles 表
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_vehicles_boss_id ON vehicles(boss_id);

-- 7. feedback 表
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_feedback_boss_id ON feedback(boss_id);

-- 8. driver_warehouses 表
ALTER TABLE driver_warehouses ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_boss_id ON driver_warehouses(boss_id);

-- 9. manager_warehouses 表
ALTER TABLE manager_warehouses ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_boss_id ON manager_warehouses(boss_id);

-- 10. driver_licenses 表
ALTER TABLE driver_licenses ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_boss_id ON driver_licenses(boss_id);

-- 11. warehouse_categories 表
ALTER TABLE warehouse_categories ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_warehouse_categories_boss_id ON warehouse_categories(boss_id);

-- 12. category_prices 表
ALTER TABLE category_prices ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_category_prices_boss_id ON category_prices(boss_id);

-- 13. vehicle_reviews 表
ALTER TABLE vehicle_reviews ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_vehicle_reviews_boss_id ON vehicle_reviews(boss_id);

-- 14. leases 表
ALTER TABLE leases ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_leases_boss_id ON leases(boss_id);

-- ============================================
-- 第三步：为现有数据填充 boss_id
-- ============================================

-- 1. 更新 profiles 表
UPDATE profiles
SET boss_id = id
WHERE role = 'super_admin'::user_role AND boss_id IS NULL;

UPDATE profiles
SET boss_id = main_account_id
WHERE role IN ('manager'::user_role, 'driver'::user_role) 
  AND main_account_id IS NOT NULL 
  AND boss_id IS NULL;

-- 2. 更新 attendance 表
UPDATE attendance a
SET boss_id = p.boss_id
FROM profiles p
WHERE a.user_id = p.id AND a.boss_id IS NULL;

-- 3. 更新 piece_work_records 表
UPDATE piece_work_records pr
SET boss_id = p.boss_id
FROM profiles p
WHERE pr.user_id = p.id AND pr.boss_id IS NULL;

-- 4. 更新 leave_applications 表
UPDATE leave_applications la
SET boss_id = p.boss_id
FROM profiles p
WHERE la.user_id = p.id AND la.boss_id IS NULL;

-- 5. 更新 resignations 表
UPDATE resignations r
SET boss_id = p.boss_id
FROM profiles p
WHERE r.user_id = p.id AND r.boss_id IS NULL;

-- 6. 更新 vehicles 表
UPDATE vehicles v
SET boss_id = p.boss_id
FROM profiles p
WHERE v.driver_id = p.id AND v.boss_id IS NULL;

-- 7. 更新 feedback 表
UPDATE feedback f
SET boss_id = p.boss_id
FROM profiles p
WHERE f.user_id = p.id AND f.boss_id IS NULL;

-- 8. 更新 driver_warehouses 表
UPDATE driver_warehouses dw
SET boss_id = p.boss_id
FROM profiles p
WHERE dw.driver_id = p.id AND dw.boss_id IS NULL;

-- 9. 更新 manager_warehouses 表
UPDATE manager_warehouses mw
SET boss_id = p.boss_id
FROM profiles p
WHERE mw.manager_id = p.id AND mw.boss_id IS NULL;

-- 10. 更新 driver_licenses 表
UPDATE driver_licenses dl
SET boss_id = p.boss_id
FROM profiles p
WHERE dl.driver_id = p.id AND dl.boss_id IS NULL;

-- 11. 更新 warehouse_categories 表
UPDATE warehouse_categories wc
SET boss_id = w.boss_id
FROM warehouses w
WHERE wc.warehouse_id = w.id AND wc.boss_id IS NULL;

-- 12. 更新 category_prices 表
UPDATE category_prices cp
SET boss_id = wc.boss_id
FROM warehouse_categories wc
WHERE cp.category_id = wc.id AND cp.boss_id IS NULL;

-- 13. 更新 vehicle_reviews 表
UPDATE vehicle_reviews vr
SET boss_id = v.boss_id
FROM vehicles v
WHERE vr.vehicle_id = v.id AND vr.boss_id IS NULL;

-- 14. 更新 leases 表
UPDATE leases l
SET boss_id = v.boss_id
FROM vehicles v
WHERE l.vehicle_id = v.id AND l.boss_id IS NULL;