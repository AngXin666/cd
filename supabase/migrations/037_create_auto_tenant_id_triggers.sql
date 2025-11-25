/*
# 创建自动设置tenant_id的触发器

为所有业务表创建触发器，在插入新数据时自动设置tenant_id
*/

-- 创建触发器函数：自动设置tenant_id
CREATE OR REPLACE FUNCTION auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tenant_id uuid;
  user_role user_role;
BEGIN
  -- 如果已经设置了tenant_id，则不修改
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 获取当前用户的角色和tenant_id
  SELECT p.role, 
    CASE 
      WHEN p.role = 'super_admin'::user_role THEN p.id
      ELSE p.tenant_id
    END
  INTO user_role, user_tenant_id
  FROM profiles p
  WHERE p.id = auth.uid();

  -- 如果是租赁管理员，不自动设置tenant_id（需要手动指定）
  IF user_role = 'lease_admin'::user_role THEN
    RETURN NEW;
  END IF;

  -- 设置tenant_id
  NEW.tenant_id := user_tenant_id;
  
  RETURN NEW;
END;
$$;

-- 为profiles表创建特殊触发器函数
CREATE OR REPLACE FUNCTION auto_set_tenant_id_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  creator_tenant_id uuid;
  creator_role user_role;
BEGIN
  -- 如果已经设置了tenant_id，则不修改
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 获取创建者的角色和tenant_id
  SELECT p.role, 
    CASE 
      WHEN p.role = 'super_admin'::user_role THEN p.id
      ELSE p.tenant_id
    END
  INTO creator_role, creator_tenant_id
  FROM profiles p
  WHERE p.id = auth.uid();

  -- 如果新用户是super_admin，tenant_id设置为自己的id
  IF NEW.role = 'super_admin'::user_role THEN
    NEW.tenant_id := NEW.id;
  -- 如果创建者是租赁管理员，不自动设置tenant_id（需要手动指定）
  ELSIF creator_role = 'lease_admin'::user_role THEN
    -- 租赁管理员创建的super_admin，tenant_id为自己的id
    IF NEW.role = 'super_admin'::user_role THEN
      NEW.tenant_id := NEW.id;
    END IF;
  -- 否则，使用创建者的tenant_id
  ELSE
    NEW.tenant_id := creator_tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 为profiles表创建触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON profiles;
CREATE TRIGGER auto_set_tenant_id_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id_for_profile();

-- 为其他表创建触发器（使用循环简化代码）
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'vehicles', 'warehouses', 'category_prices', 'piece_work_records',
      'attendance', 'leave_applications', 'notifications', 'vehicle_records',
      'driver_warehouses', 'manager_warehouses', 'attendance_rules',
      'driver_licenses', 'feedback', 'resignation_applications'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON %I', table_name);
    EXECUTE format('
      CREATE TRIGGER auto_set_tenant_id_trigger
        BEFORE INSERT ON %I
        FOR EACH ROW
        EXECUTE FUNCTION auto_set_tenant_id()
    ', table_name);
  END LOOP;
END $$;
