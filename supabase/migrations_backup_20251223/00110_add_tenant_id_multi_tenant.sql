/*
# 多租户架构实现 - 添加tenant_id字段

## 概述
为所有业务表添加tenant_id字段，实现多租户数据隔离

## 租户模型
- super_admin：租户所有者，tenant_id为自己的id
- manager：车队长，tenant_id为所属super_admin的id
- driver：司机，tenant_id为所属super_admin的id
- lease_admin：租赁管理员，可以访问所有租户数据

## 修改的表
1. profiles - 用户表
2. vehicles - 车辆表
3. warehouses - 仓库表
4. warehouse_categories - 仓库品类表
5. piece_work_records - 计件记录表
6. attendance_records - 考勤记录表
7. leave_applications - 请假申请表
8. notifications - 通知表
9. vehicle_records - 车辆记录表
10. driver_warehouse_assignments - 司机仓库分配表
11. manager_warehouse_assignments - 管理员仓库分配表

## 数据迁移策略
- 为现有数据设置tenant_id（如果存在super_admin用户，使用第一个；否则为NULL）
- 新数据必须指定tenant_id
*/

-- 1. 为profiles表添加tenant_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

COMMENT ON COLUMN profiles.tenant_id IS '租户ID，指向super_admin用户的id。super_admin的tenant_id为自己的id';

-- 2. 为vehicles表添加tenant_id
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON vehicles(tenant_id);

COMMENT ON COLUMN vehicles.tenant_id IS '租户ID，标识车辆所属的租户';

-- 3. 为warehouses表添加tenant_id
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_id ON warehouses(tenant_id);

COMMENT ON COLUMN warehouses.tenant_id IS '租户ID，标识仓库所属的租户';

-- 4. 为warehouse_categories表添加tenant_id
ALTER TABLE warehouse_categories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_warehouse_categories_tenant_id ON warehouse_categories(tenant_id);

COMMENT ON COLUMN warehouse_categories.tenant_id IS '租户ID，标识品类所属的租户';

-- 5. 为piece_work_records表添加tenant_id
ALTER TABLE piece_work_records ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_piece_work_records_tenant_id ON piece_work_records(tenant_id);

COMMENT ON COLUMN piece_work_records.tenant_id IS '租户ID，标识计件记录所属的租户';

-- 6. 为attendance_records表添加tenant_id
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant_id ON attendance_records(tenant_id);

COMMENT ON COLUMN attendance_records.tenant_id IS '租户ID，标识考勤记录所属的租户';

-- 7. 为leave_applications表添加tenant_id
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_leave_applications_tenant_id ON leave_applications(tenant_id);

COMMENT ON COLUMN leave_applications.tenant_id IS '租户ID，标识请假申请所属的租户';

-- 8. 为notifications表添加tenant_id
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);

COMMENT ON COLUMN notifications.tenant_id IS '租户ID，标识通知所属的租户';

-- 9. 为vehicle_records表添加tenant_id
ALTER TABLE vehicle_records ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_vehicle_records_tenant_id ON vehicle_records(tenant_id);

COMMENT ON COLUMN vehicle_records.tenant_id IS '租户ID，标识车辆记录所属的租户';

-- 10. 为driver_warehouse_assignments表添加tenant_id
ALTER TABLE driver_warehouse_assignments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_driver_warehouse_assignments_tenant_id ON driver_warehouse_assignments(tenant_id);

COMMENT ON COLUMN driver_warehouse_assignments.tenant_id IS '租户ID，标识司机仓库分配所属的租户';

-- 11. 为manager_warehouse_assignments表添加tenant_id
ALTER TABLE manager_warehouse_assignments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_manager_warehouse_assignments_tenant_id ON manager_warehouse_assignments(tenant_id);

COMMENT ON COLUMN manager_warehouse_assignments.tenant_id IS '租户ID，标识管理员仓库分配所属的租户';

-- 数据迁移：为现有数据设置tenant_id
DO $$
DECLARE
  first_super_admin_id uuid;
BEGIN
  -- 查找第一个super_admin用户
  SELECT id INTO first_super_admin_id
  FROM profiles
  WHERE role = 'super_admin'::user_role
  ORDER BY created_at
  LIMIT 1;

  IF first_super_admin_id IS NOT NULL THEN
    -- 为super_admin设置tenant_id为自己的id
    UPDATE profiles
    SET tenant_id = id
    WHERE role = 'super_admin'::user_role AND tenant_id IS NULL;

    -- 为其他角色设置tenant_id为第一个super_admin的id
    UPDATE profiles
    SET tenant_id = first_super_admin_id
    WHERE role IN ('manager'::user_role, 'driver'::user_role) AND tenant_id IS NULL;

    -- 为其他表设置tenant_id
    UPDATE vehicles SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE warehouses SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE warehouse_categories SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE piece_work_records SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE attendance_records SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE leave_applications SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE notifications SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE vehicle_records SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE driver_warehouse_assignments SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE manager_warehouse_assignments SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;

    RAISE NOTICE '已为现有数据设置tenant_id: %', first_super_admin_id;
  ELSE
    RAISE NOTICE '未找到super_admin用户，跳过数据迁移';
  END IF;
END $$;