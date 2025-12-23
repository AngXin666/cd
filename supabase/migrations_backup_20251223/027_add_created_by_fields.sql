/*
# 多租户架构：添加 created_by 字段

## 说明
为实现多租户数据隔离，为所有业务表添加 `created_by` 字段，记录数据创建者的用户ID。

## 变更内容

### 1. 添加 created_by 字段的表
- warehouses（仓库表）
- categories（品类表）
- attendance_records（考勤记录表）
- piece_work_records（计件记录表）
- leave_applications（请假申请表）
- vehicles（车辆表）
- vehicle_leases（车辆租赁表）
- driver_licenses（驾驶证表）

### 2. 已有用户关联字段的表（无需添加）
- profiles（用户资料表）- 使用 id 字段
- feedback（反馈表）- 已有 user_id 字段
- notifications（通知表）- 已有 user_id 和 created_by 字段
- warehouse_assignments（仓库分配表）- 已有 driver_id 和 manager_id 字段
- category_prices（品类价格表）- 通过 category_id 关联

### 3. 数据迁移策略
- 为现有数据设置合理的 created_by 值
- 根据业务逻辑推断创建者
- 确保数据完整性

### 4. 索引优化
- 为所有 created_by 字段创建索引
- 为常用查询创建复合索引

## 注意事项
1. created_by 字段允许为 NULL，以兼容现有数据
2. 新插入的数据应该始终设置 created_by
3. 后续会通过 RLS 策略强制执行数据隔离
*/

-- ============================================
-- 1. 添加 created_by 字段
-- ============================================

-- 1.1 warehouses（仓库表）
ALTER TABLE warehouses 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN warehouses.created_by IS '创建者用户ID';

-- 1.2 categories（品类表）
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN categories.created_by IS '创建者用户ID';

-- 1.3 attendance_records（考勤记录表）
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN attendance_records.created_by IS '创建者用户ID（记录创建者，通常是司机本人或管理员）';

-- 1.4 piece_work_records（计件记录表）
ALTER TABLE piece_work_records 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN piece_work_records.created_by IS '创建者用户ID（记录创建者，通常是司机本人或管理员）';

-- 1.5 leave_applications（请假申请表）
ALTER TABLE leave_applications 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN leave_applications.created_by IS '创建者用户ID（申请创建者，通常是司机本人）';

-- 1.6 vehicles（车辆表）
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN vehicles.created_by IS '创建者用户ID（车辆录入者，通常是管理员或司机）';

-- 1.7 vehicle_leases（车辆租赁表）
ALTER TABLE vehicle_leases 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN vehicle_leases.created_by IS '创建者用户ID（租赁记录创建者，通常是管理员）';

-- 1.8 driver_licenses（驾驶证表）
ALTER TABLE driver_licenses 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN driver_licenses.created_by IS '创建者用户ID（驾驶证信息录入者，通常是司机本人）';

-- ============================================
-- 2. 数据迁移：为现有数据设置 created_by
-- ============================================

-- 2.1 warehouses - 设置为第一个超级管理员
UPDATE warehouses 
SET created_by = (
  SELECT id FROM profiles 
  WHERE role = 'super_admin' 
  ORDER BY created_at 
  LIMIT 1
)
WHERE created_by IS NULL;

-- 2.2 categories - 设置为第一个超级管理员
UPDATE categories 
SET created_by = (
  SELECT id FROM profiles 
  WHERE role = 'super_admin' 
  ORDER BY created_at 
  LIMIT 1
)
WHERE created_by IS NULL;

-- 2.3 attendance_records - 设置为司机本人
UPDATE attendance_records 
SET created_by = driver_id 
WHERE created_by IS NULL AND driver_id IS NOT NULL;

-- 2.4 piece_work_records - 设置为司机本人
UPDATE piece_work_records 
SET created_by = driver_id 
WHERE created_by IS NULL AND driver_id IS NOT NULL;

-- 2.5 leave_applications - 设置为司机本人
UPDATE leave_applications 
SET created_by = driver_id 
WHERE created_by IS NULL AND driver_id IS NOT NULL;

-- 2.6 vehicles - 设置为当前司机或第一个使用的司机
UPDATE vehicles 
SET created_by = COALESCE(
  current_driver_id,
  (
    SELECT driver_id FROM vehicle_leases 
    WHERE vehicle_id = vehicles.id 
    ORDER BY start_date 
    LIMIT 1
  ),
  (
    SELECT id FROM profiles 
    WHERE role = 'super_admin' 
    ORDER BY created_at 
    LIMIT 1
  )
)
WHERE created_by IS NULL;

-- 2.7 vehicle_leases - 设置为司机本人
UPDATE vehicle_leases 
SET created_by = driver_id 
WHERE created_by IS NULL AND driver_id IS NOT NULL;

-- 2.8 driver_licenses - 设置为司机本人
UPDATE driver_licenses 
SET created_by = driver_id 
WHERE created_by IS NULL AND driver_id IS NOT NULL;

-- ============================================
-- 3. 创建索引
-- ============================================

-- 3.1 为 created_by 字段创建单列索引
CREATE INDEX IF NOT EXISTS idx_warehouses_created_by ON warehouses(created_by);
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);
CREATE INDEX IF NOT EXISTS idx_attendance_records_created_by ON attendance_records(created_by);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_created_by ON piece_work_records(created_by);
CREATE INDEX IF NOT EXISTS idx_leave_applications_created_by ON leave_applications(created_by);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_by ON vehicles(created_by);
CREATE INDEX IF NOT EXISTS idx_vehicle_leases_created_by ON vehicle_leases(created_by);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_created_by ON driver_licenses(created_by);

-- 3.2 为常用查询创建复合索引

-- 考勤记录：仓库 + 创建者
CREATE INDEX IF NOT EXISTS idx_attendance_records_warehouse_created_by 
  ON attendance_records(warehouse_id, created_by);

-- 考勤记录：司机 + 创建者（用于权限检查）
CREATE INDEX IF NOT EXISTS idx_attendance_records_driver_created_by 
  ON attendance_records(driver_id, created_by);

-- 计件记录：仓库 + 创建者
CREATE INDEX IF NOT EXISTS idx_piece_work_records_warehouse_created_by 
  ON piece_work_records(warehouse_id, created_by);

-- 计件记录：司机 + 创建者
CREATE INDEX IF NOT EXISTS idx_piece_work_records_driver_created_by 
  ON piece_work_records(driver_id, created_by);

-- 请假申请：司机 + 创建者
CREATE INDEX IF NOT EXISTS idx_leave_applications_driver_created_by 
  ON leave_applications(driver_id, created_by);

-- 车辆：创建者 + 状态
CREATE INDEX IF NOT EXISTS idx_vehicles_created_by_is_active 
  ON vehicles(created_by, is_active);

-- 车辆租赁：司机 + 创建者
CREATE INDEX IF NOT EXISTS idx_vehicle_leases_driver_created_by 
  ON vehicle_leases(driver_id, created_by);

-- ============================================
-- 4. 创建辅助函数
-- ============================================

-- 4.1 获取当前用户ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION get_current_user_id() IS '获取当前登录用户的ID';

-- 4.2 获取用户角色
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$;

COMMENT ON FUNCTION get_user_role(uuid) IS '获取指定用户的角色';

-- 4.3 检查用户是否为超级管理员
CREATE OR REPLACE FUNCTION is_super_admin_user(user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'super_admin'
  );
$$;

COMMENT ON FUNCTION is_super_admin_user(uuid) IS '检查用户是否为超级管理员';

-- 4.4 检查用户是否为管理员
CREATE OR REPLACE FUNCTION is_manager_user(user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'manager'
  );
$$;

COMMENT ON FUNCTION is_manager_user(uuid) IS '检查用户是否为管理员';

-- 4.5 检查用户是否可以访问指定仓库
CREATE OR REPLACE FUNCTION can_access_warehouse(
  user_id uuid,
  warehouse_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role user_role;
BEGIN
  -- 获取用户角色
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  
  -- 超级管理员可以访问所有仓库
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- 管理员检查是否管理该仓库
  IF user_role = 'manager' THEN
    RETURN EXISTS (
      SELECT 1 FROM warehouse_assignments 
      WHERE manager_id = user_id 
      AND warehouse_assignments.warehouse_id = can_access_warehouse.warehouse_id
    );
  END IF;
  
  -- 司机检查是否分配到该仓库
  IF user_role = 'driver' THEN
    RETURN EXISTS (
      SELECT 1 FROM warehouse_assignments 
      WHERE driver_id = user_id 
      AND warehouse_assignments.warehouse_id = can_access_warehouse.warehouse_id
    );
  END IF;
  
  -- 默认拒绝
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION can_access_warehouse(uuid, uuid) IS '检查用户是否可以访问指定仓库';

-- 4.6 检查用户是否可以访问指定资源
CREATE OR REPLACE FUNCTION can_access_resource(
  user_id uuid,
  resource_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role user_role;
BEGIN
  -- 如果是自己的资源，直接允许
  IF user_id = resource_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- 获取用户角色
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  
  -- 超级管理员可以访问所有资源
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- 管理员检查是否在同一仓库
  IF user_role = 'manager' THEN
    RETURN EXISTS (
      SELECT 1 
      FROM warehouse_assignments wa1
      JOIN warehouse_assignments wa2 ON wa1.warehouse_id = wa2.warehouse_id
      WHERE wa1.manager_id = user_id 
      AND wa2.driver_id = resource_user_id
    );
  END IF;
  
  -- 司机不能访问其他人的资源
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION can_access_resource(uuid, uuid) IS '检查用户是否可以访问指定用户的资源';

-- ============================================
-- 5. 创建触发器：自动设置 created_by
-- ============================================

-- 5.1 创建触发器函数
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 如果 created_by 为空，自动设置为当前用户
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_created_by() IS '自动设置 created_by 字段为当前用户ID';

-- 5.2 为各表添加触发器

-- warehouses
DROP TRIGGER IF EXISTS set_warehouses_created_by ON warehouses;
CREATE TRIGGER set_warehouses_created_by
  BEFORE INSERT ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- categories
DROP TRIGGER IF EXISTS set_categories_created_by ON categories;
CREATE TRIGGER set_categories_created_by
  BEFORE INSERT ON categories
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- attendance_records
DROP TRIGGER IF EXISTS set_attendance_records_created_by ON attendance_records;
CREATE TRIGGER set_attendance_records_created_by
  BEFORE INSERT ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- piece_work_records
DROP TRIGGER IF EXISTS set_piece_work_records_created_by ON piece_work_records;
CREATE TRIGGER set_piece_work_records_created_by
  BEFORE INSERT ON piece_work_records
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- leave_applications
DROP TRIGGER IF EXISTS set_leave_applications_created_by ON leave_applications;
CREATE TRIGGER set_leave_applications_created_by
  BEFORE INSERT ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- vehicles
DROP TRIGGER IF EXISTS set_vehicles_created_by ON vehicles;
CREATE TRIGGER set_vehicles_created_by
  BEFORE INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- vehicle_leases
DROP TRIGGER IF EXISTS set_vehicle_leases_created_by ON vehicle_leases;
CREATE TRIGGER set_vehicle_leases_created_by
  BEFORE INSERT ON vehicle_leases
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- driver_licenses
DROP TRIGGER IF EXISTS set_driver_licenses_created_by ON driver_licenses;
CREATE TRIGGER set_driver_licenses_created_by
  BEFORE INSERT ON driver_licenses
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- ============================================
-- 6. 验证数据完整性
-- ============================================

-- 检查是否所有记录都有 created_by（仅用于验证，不影响迁移）
DO $$
DECLARE
  null_count integer;
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'warehouses', 'categories', 'attendance_records', 
      'piece_work_records', 'leave_applications', 'vehicles',
      'vehicle_leases', 'driver_licenses'
    ])
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE created_by IS NULL', table_name) INTO null_count;
    IF null_count > 0 THEN
      RAISE NOTICE '表 % 有 % 条记录的 created_by 为 NULL', table_name, null_count;
    END IF;
  END LOOP;
END $$;
