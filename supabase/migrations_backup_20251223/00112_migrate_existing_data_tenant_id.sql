/*
# 数据迁移 - 为现有数据设置tenant_id

为所有现有数据设置tenant_id，使用第一个super_admin作为默认租户
*/

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
    RAISE NOTICE '找到super_admin: %', first_super_admin_id;
    
    -- 为super_admin设置tenant_id为自己的id
    UPDATE profiles
    SET tenant_id = id
    WHERE role = 'super_admin'::user_role AND tenant_id IS NULL;
    
    RAISE NOTICE '已为super_admin设置tenant_id';

    -- 为其他角色设置tenant_id为第一个super_admin的id
    UPDATE profiles
    SET tenant_id = first_super_admin_id
    WHERE role IN ('manager'::user_role, 'driver'::user_role) AND tenant_id IS NULL;
    
    RAISE NOTICE '已为manager和driver设置tenant_id';

    -- 为其他表设置tenant_id
    UPDATE vehicles SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE warehouses SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE category_prices SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE piece_work_records SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE attendance SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE leave_applications SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE notifications SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE vehicle_records SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE driver_warehouses SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE manager_warehouses SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE attendance_rules SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE driver_licenses SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE feedback SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;
    UPDATE resignation_applications SET tenant_id = first_super_admin_id WHERE tenant_id IS NULL;

    RAISE NOTICE '已为所有业务表设置tenant_id: %', first_super_admin_id;
  ELSE
    RAISE NOTICE '未找到super_admin用户，跳过数据迁移';
  END IF;
END $$;