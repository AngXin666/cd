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
4. category_prices - 品类价格表
5. piece_work_records - 计件记录表
6. attendance - 考勤记录表
7. leave_applications - 请假申请表
8. notifications - 通知表
9. vehicle_records - 车辆记录表
10. driver_warehouses - 司机仓库分配表
11. manager_warehouses - 管理员仓库分配表
12. attendance_rules - 考勤规则表
13. driver_licenses - 驾驶证表
14. feedback - 反馈表
15. resignation_applications - 离职申请表
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

-- 4. 为category_prices表添加tenant_id
ALTER TABLE category_prices ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_category_prices_tenant_id ON category_prices(tenant_id);
COMMENT ON COLUMN category_prices.tenant_id IS '租户ID，标识品类价格所属的租户';

-- 5. 为piece_work_records表添加tenant_id
ALTER TABLE piece_work_records ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_piece_work_records_tenant_id ON piece_work_records(tenant_id);
COMMENT ON COLUMN piece_work_records.tenant_id IS '租户ID，标识计件记录所属的租户';

-- 6. 为attendance表添加tenant_id
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id ON attendance(tenant_id);
COMMENT ON COLUMN attendance.tenant_id IS '租户ID，标识考勤记录所属的租户';

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

-- 10. 为driver_warehouses表添加tenant_id
ALTER TABLE driver_warehouses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_tenant_id ON driver_warehouses(tenant_id);
COMMENT ON COLUMN driver_warehouses.tenant_id IS '租户ID，标识司机仓库分配所属的租户';

-- 11. 为manager_warehouses表添加tenant_id
ALTER TABLE manager_warehouses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_tenant_id ON manager_warehouses(tenant_id);
COMMENT ON COLUMN manager_warehouses.tenant_id IS '租户ID，标识管理员仓库分配所属的租户';

-- 12. 为attendance_rules表添加tenant_id
ALTER TABLE attendance_rules ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_attendance_rules_tenant_id ON attendance_rules(tenant_id);
COMMENT ON COLUMN attendance_rules.tenant_id IS '租户ID，标识考勤规则所属的租户';

-- 13. 为driver_licenses表添加tenant_id
ALTER TABLE driver_licenses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_driver_licenses_tenant_id ON driver_licenses(tenant_id);
COMMENT ON COLUMN driver_licenses.tenant_id IS '租户ID，标识驾驶证所属的租户';

-- 14. 为feedback表添加tenant_id
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_id ON feedback(tenant_id);
COMMENT ON COLUMN feedback.tenant_id IS '租户ID，标识反馈所属的租户';

-- 15. 为resignation_applications表添加tenant_id
ALTER TABLE resignation_applications ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_resignation_applications_tenant_id ON resignation_applications(tenant_id);
COMMENT ON COLUMN resignation_applications.tenant_id IS '租户ID，标识离职申请所属的租户';