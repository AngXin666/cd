/*
# 创建租户RLS策略

为所有业务表创建基于tenant_id的行级安全策略

## 策略规则
1. lease_admin可以访问所有租户数据
2. super_admin只能访问自己租户的数据（tenant_id = 自己的id）
3. manager和driver只能访问自己租户的数据（tenant_id = 所属super_admin的id）
*/

-- 创建辅助函数：获取当前用户的tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    CASE 
      WHEN p.role = 'super_admin'::user_role THEN p.id
      ELSE p.tenant_id
    END
  FROM profiles p
  WHERE p.id = auth.uid();
$$;

-- 创建辅助函数：检查是否为租赁管理员
CREATE OR REPLACE FUNCTION is_lease_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'lease_admin'::user_role
  );
$$;

-- 为profiles表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - profiles" ON profiles;
CREATE POLICY "租户数据隔离 - profiles" ON profiles
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id() OR
    id = auth.uid()
  );

-- 为vehicles表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - vehicles" ON vehicles;
CREATE POLICY "租户数据隔离 - vehicles" ON vehicles
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为warehouses表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - warehouses" ON warehouses;
CREATE POLICY "租户数据隔离 - warehouses" ON warehouses
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为category_prices表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - category_prices" ON category_prices;
CREATE POLICY "租户数据隔离 - category_prices" ON category_prices
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为piece_work_records表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - piece_work_records" ON piece_work_records;
CREATE POLICY "租户数据隔离 - piece_work_records" ON piece_work_records
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为attendance表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - attendance" ON attendance;
CREATE POLICY "租户数据隔离 - attendance" ON attendance
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为leave_applications表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - leave_applications" ON leave_applications;
CREATE POLICY "租户数据隔离 - leave_applications" ON leave_applications
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为notifications表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - notifications" ON notifications;
CREATE POLICY "租户数据隔离 - notifications" ON notifications
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为vehicle_records表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - vehicle_records" ON vehicle_records;
CREATE POLICY "租户数据隔离 - vehicle_records" ON vehicle_records
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为driver_warehouses表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - driver_warehouses" ON driver_warehouses;
CREATE POLICY "租户数据隔离 - driver_warehouses" ON driver_warehouses
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为manager_warehouses表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - manager_warehouses" ON manager_warehouses;
CREATE POLICY "租户数据隔离 - manager_warehouses" ON manager_warehouses
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为attendance_rules表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - attendance_rules" ON attendance_rules;
CREATE POLICY "租户数据隔离 - attendance_rules" ON attendance_rules
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为driver_licenses表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - driver_licenses" ON driver_licenses;
CREATE POLICY "租户数据隔离 - driver_licenses" ON driver_licenses
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为feedback表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - feedback" ON feedback;
CREATE POLICY "租户数据隔离 - feedback" ON feedback
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );

-- 为resignation_applications表创建RLS策略
DROP POLICY IF EXISTS "租户数据隔离 - resignation_applications" ON resignation_applications;
CREATE POLICY "租户数据隔离 - resignation_applications" ON resignation_applications
  FOR ALL
  USING (
    is_lease_admin() OR 
    tenant_id = get_user_tenant_id()
  );