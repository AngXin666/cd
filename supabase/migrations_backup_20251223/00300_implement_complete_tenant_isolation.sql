/*
# 实现完整的多租户数据隔离

## 目标
为所有业务表添加 boss_id 字段，实现完全的租户数据隔离。

## 改造内容

### 1. 添加 boss_id 字段的表
- profiles（用户管理）
- attendance（考勤管理）
- piece_work_records（计件管理）
- leave_applications（请假管理）
- resignations（离职管理）
- vehicles（车辆管理）
- feedback（反馈管理）
- driver_warehouses（司机仓库分配）
- manager_warehouses（车队长仓库分配）
- driver_licenses（驾驶证信息）
- warehouse_categories（仓库分类）
- category_prices（分类价格）
- vehicle_reviews（车辆审核）
- leases（租赁信息）

### 2. 已有 boss_id 的表
- warehouses（仓库管理）
- notifications（通知管理）

## 实施步骤
1. 为所有表添加 boss_id 字段
2. 创建辅助函数获取当前用户的 boss_id
3. 为现有数据填充 boss_id
4. 更新 RLS 策略
5. 创建触发器自动设置 boss_id

## 注意事项
- 老板（super_admin）的 boss_id 是自己的 ID
- 车队长（manager）和司机（driver）的 boss_id 是所属老板的 ID
- 所有数据操作都必须验证 boss_id
*/

-- ============================================
-- 第一步：创建辅助函数
-- ============================================

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
-- 老板的 boss_id 是自己的 ID
UPDATE profiles
SET boss_id = id
WHERE role = 'super_admin'::user_role AND boss_id IS NULL;

-- 车队长和司机的 boss_id 是 main_account_id
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

-- ============================================
-- 第四步：设置 boss_id 为 NOT NULL（在数据填充后）
-- ============================================

-- 注意：暂时不设置 NOT NULL，因为可能有一些数据无法自动填充
-- 在确认所有数据都正确填充后，可以手动执行以下语句：
-- ALTER TABLE profiles ALTER COLUMN boss_id SET NOT NULL;
-- ALTER TABLE attendance ALTER COLUMN boss_id SET NOT NULL;
-- ... 等等

-- ============================================
-- 第五步：创建触发器自动设置 boss_id
-- ============================================

-- 创建通用的 boss_id 设置函数
CREATE OR REPLACE FUNCTION set_boss_id_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 如果 boss_id 已经设置，则不修改
  IF NEW.boss_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 从 user_id 获取 boss_id
  IF TG_TABLE_NAME IN ('attendance', 'piece_work_records', 'leave_applications', 'resignations', 'feedback') THEN
    SELECT boss_id INTO NEW.boss_id
    FROM profiles
    WHERE id = NEW.user_id;
  
  -- 从 driver_id 获取 boss_id
  ELSIF TG_TABLE_NAME IN ('vehicles', 'driver_warehouses', 'driver_licenses') THEN
    SELECT boss_id INTO NEW.boss_id
    FROM profiles
    WHERE id = NEW.driver_id;
  
  -- 从 manager_id 获取 boss_id
  ELSIF TG_TABLE_NAME = 'manager_warehouses' THEN
    SELECT boss_id INTO NEW.boss_id
    FROM profiles
    WHERE id = NEW.manager_id;
  
  -- 从 warehouse_id 获取 boss_id
  ELSIF TG_TABLE_NAME = 'warehouse_categories' THEN
    SELECT boss_id INTO NEW.boss_id
    FROM warehouses
    WHERE id = NEW.warehouse_id;
  
  -- 从 category_id 获取 boss_id
  ELSIF TG_TABLE_NAME = 'category_prices' THEN
    SELECT boss_id INTO NEW.boss_id
    FROM warehouse_categories
    WHERE id = NEW.category_id;
  
  -- 从 vehicle_id 获取 boss_id
  ELSIF TG_TABLE_NAME IN ('vehicle_reviews', 'leases') THEN
    SELECT boss_id INTO NEW.boss_id
    FROM vehicles
    WHERE id = NEW.vehicle_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 为 profiles 表创建特殊的触发器
CREATE OR REPLACE FUNCTION set_boss_id_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 如果 boss_id 已经设置，则不修改
  IF NEW.boss_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 老板的 boss_id 是自己的 ID
  IF NEW.role = 'super_admin'::user_role THEN
    NEW.boss_id := NEW.id;
  -- 车队长和司机的 boss_id 是 main_account_id
  ELSIF NEW.main_account_id IS NOT NULL THEN
    NEW.boss_id := NEW.main_account_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 为 profiles 表添加触发器
DROP TRIGGER IF EXISTS set_boss_id_trigger ON profiles;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_for_profile();

-- 为其他表添加触发器
DROP TRIGGER IF EXISTS set_boss_id_trigger ON attendance;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON piece_work_records;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON piece_work_records
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON leave_applications;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON resignations;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON resignations
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON vehicles;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON feedback;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON driver_warehouses;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON driver_warehouses
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON manager_warehouses;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON manager_warehouses
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON driver_licenses;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON driver_licenses
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON warehouse_categories;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON warehouse_categories
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON category_prices;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON category_prices
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON vehicle_reviews;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON vehicle_reviews
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

DROP TRIGGER IF EXISTS set_boss_id_trigger ON leases;
CREATE TRIGGER set_boss_id_trigger
  BEFORE INSERT OR UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION set_boss_id_from_user();

-- ============================================
-- 完成
-- ============================================

-- 输出完成信息
DO $$
BEGIN
  RAISE NOTICE '✅ 多租户数据隔离改造完成！';
  RAISE NOTICE '已为所有业务表添加 boss_id 字段';
  RAISE NOTICE '已为现有数据填充 boss_id';
  RAISE NOTICE '已创建触发器自动设置 boss_id';
  RAISE NOTICE '下一步：更新 RLS 策略以强制租户隔离';
END $$;
