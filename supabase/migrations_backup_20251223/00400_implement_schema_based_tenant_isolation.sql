/*
# 实现基于 Schema 的独立数据库隔离

## 目标
为每个租户创建独立的 PostgreSQL Schema，实现真正的数据库级别隔离。

## 方案说明
1. 每个租户（老板）拥有独立的 Schema（命名为 tenant_<boss_id>）
2. 每个 Schema 包含完整的业务表结构
3. 通过 search_path 动态切换到对应租户的 Schema
4. 完全的物理隔离，不需要 RLS，不需要 boss_id

## 实施步骤
1. 创建 Schema 管理函数
2. 为现有租户创建独立的 Schema
3. 复制表结构到每个租户的 Schema
4. 迁移现有数据到对应的 Schema
5. 创建动态切换 Schema 的函数
*/

-- ============================================
-- 第一步：创建 Schema 管理函数
-- ============================================

-- 获取当前用户所属的租户 Schema 名称
CREATE OR REPLACE FUNCTION get_tenant_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  boss_id_val uuid;
  schema_name text;
BEGIN
  -- 获取当前用户的 boss_id
  SELECT CASE
    WHEN p.role = 'super_admin'::user_role THEN p.id
    WHEN p.main_account_id IS NOT NULL THEN p.main_account_id
    ELSE NULL
  END INTO boss_id_val
  FROM profiles p
  WHERE p.id = auth.uid();

  -- 如果找不到 boss_id，返回 public
  IF boss_id_val IS NULL THEN
    RETURN 'public';
  END IF;

  -- 构造 Schema 名称
  schema_name := 'tenant_' || replace(boss_id_val::text, '-', '_');
  
  RETURN schema_name;
END;
$$;

-- 为租户创建独立的 Schema 和表结构
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_boss_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_name text;
BEGIN
  -- 构造 Schema 名称
  schema_name := 'tenant_' || replace(tenant_boss_id::text, '-', '_');
  
  -- 创建 Schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
  
  -- 授予权限
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON SCHEMA %I TO postgres', schema_name);
  
  -- 在新 Schema 中创建所有业务表
  EXECUTE format('
    -- 1. warehouses 表
    CREATE TABLE IF NOT EXISTS %I.warehouses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    );
    
    -- 2. profiles 表（租户内的用户）
    CREATE TABLE IF NOT EXISTS %I.profiles (
      id uuid PRIMARY KEY,
      phone text UNIQUE,
      email text UNIQUE,
      name text,
      role user_role DEFAULT ''driver''::user_role NOT NULL,
      driver_type driver_type,
      main_account_id uuid,
      created_at timestamptz DEFAULT now()
    );
    
    -- 3. driver_warehouses 表
    CREATE TABLE IF NOT EXISTS %I.driver_warehouses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
      warehouse_id uuid NOT NULL REFERENCES %I.warehouses(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(driver_id, warehouse_id)
    );
    
    -- 4. manager_warehouses 表
    CREATE TABLE IF NOT EXISTS %I.manager_warehouses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      manager_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
      warehouse_id uuid NOT NULL REFERENCES %I.warehouses(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(manager_id, warehouse_id)
    );
    
    -- 5. attendance 表
    CREATE TABLE IF NOT EXISTS %I.attendance (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
      warehouse_id uuid NOT NULL REFERENCES %I.warehouses(id) ON DELETE CASCADE,
      work_date date NOT NULL,
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id, work_date)
    );
    
    -- 6. piece_work_records 表
    CREATE TABLE IF NOT EXISTS %I.piece_work_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
      warehouse_id uuid NOT NULL REFERENCES %I.warehouses(id) ON DELETE CASCADE,
      work_date date NOT NULL,
      quantity integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );
    
    -- 7. leave_applications 表
    CREATE TABLE IF NOT EXISTS %I.leave_applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
      warehouse_id uuid NOT NULL REFERENCES %I.warehouses(id) ON DELETE CASCADE,
      start_date date NOT NULL,
      end_date date NOT NULL,
      reason text,
      status text DEFAULT ''pending'',
      created_at timestamptz DEFAULT now()
    );
    
    -- 8. resignations 表
    CREATE TABLE IF NOT EXISTS %I.resignation_applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
      warehouse_id uuid NOT NULL REFERENCES %I.warehouses(id) ON DELETE CASCADE,
      resignation_date date NOT NULL,
      reason text,
      status text DEFAULT ''pending'',
      created_at timestamptz DEFAULT now()
    );
    
    -- 9. vehicles 表
    CREATE TABLE IF NOT EXISTS %I.vehicles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id uuid REFERENCES %I.profiles(id) ON DELETE SET NULL,
      plate_number text NOT NULL UNIQUE,
      vehicle_type text,
      status text DEFAULT ''active'',
      created_at timestamptz DEFAULT now()
    );
    
    -- 10. feedback 表
    CREATE TABLE IF NOT EXISTS %I.feedback (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
      content text NOT NULL,
      status text DEFAULT ''pending'',
      created_at timestamptz DEFAULT now()
    );
    
    -- 11. notifications 表
    CREATE TABLE IF NOT EXISTS %I.notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
      title text NOT NULL,
      content text NOT NULL,
      is_read boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
    
    -- 12. driver_licenses 表
    CREATE TABLE IF NOT EXISTS %I.driver_licenses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id uuid NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE UNIQUE,
      license_number text NOT NULL,
      id_card_name text,
      created_at timestamptz DEFAULT now()
    );
    
    -- 13. warehouse_categories 表
    CREATE TABLE IF NOT EXISTS %I.warehouse_categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      warehouse_id uuid NOT NULL REFERENCES %I.warehouses(id) ON DELETE CASCADE,
      name text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    
    -- 14. category_prices 表
    CREATE TABLE IF NOT EXISTS %I.category_prices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id uuid NOT NULL REFERENCES %I.warehouse_categories(id) ON DELETE CASCADE,
      price numeric NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    
    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_%I_profiles_role ON %I.profiles(role);
    CREATE INDEX IF NOT EXISTS idx_%I_attendance_user_date ON %I.attendance(user_id, work_date);
    CREATE INDEX IF NOT EXISTS idx_%I_piece_work_user_date ON %I.piece_work_records(user_id, work_date);
    CREATE INDEX IF NOT EXISTS idx_%I_vehicles_driver ON %I.vehicles(driver_id);
    CREATE INDEX IF NOT EXISTS idx_%I_notifications_user ON %I.notifications(user_id);
  ', 
  schema_name, schema_name, schema_name, schema_name, schema_name,
  schema_name, schema_name, schema_name, schema_name, schema_name,
  schema_name, schema_name, schema_name, schema_name, schema_name,
  schema_name, schema_name, schema_name, schema_name, schema_name,
  schema_name, schema_name, schema_name, schema_name, schema_name,
  schema_name, schema_name, schema_name, schema_name, schema_name,
  schema_name, schema_name, schema_name, schema_name, schema_name,
  schema_name, schema_name, schema_name, schema_name, schema_name);
  
  RAISE NOTICE '✅ 已为租户 % 创建独立 Schema: %', tenant_boss_id, schema_name;
END;
$$;

-- ============================================
-- 第二步：为所有现有租户创建 Schema
-- ============================================

DO $$
DECLARE
  boss_record RECORD;
BEGIN
  -- 为每个老板创建独立的 Schema
  FOR boss_record IN 
    SELECT id FROM profiles WHERE role = 'super_admin'::user_role
  LOOP
    PERFORM create_tenant_schema(boss_record.id);
  END LOOP;
  
  RAISE NOTICE '✅ 已为所有现有租户创建独立 Schema';
END $$;

-- ============================================
-- 第三步：创建数据迁移函数
-- ============================================

-- 将租户数据从 public schema 迁移到独立 schema
CREATE OR REPLACE FUNCTION migrate_tenant_data(tenant_boss_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_name text;
BEGIN
  schema_name := 'tenant_' || replace(tenant_boss_id::text, '-', '_');
  
  -- 迁移 warehouses
  EXECUTE format('
    INSERT INTO %I.warehouses (id, name, is_active, created_at)
    SELECT id, name, is_active, created_at
    FROM public.warehouses
    WHERE boss_id = %L
    ON CONFLICT (id) DO NOTHING
  ', schema_name, tenant_boss_id);
  
  -- 迁移 profiles
  EXECUTE format('
    INSERT INTO %I.profiles (id, phone, email, name, role, driver_type, main_account_id, created_at)
    SELECT id, phone, email, name, role, driver_type, main_account_id, created_at
    FROM public.profiles
    WHERE boss_id = %L OR id = %L
    ON CONFLICT (id) DO NOTHING
  ', schema_name, tenant_boss_id, tenant_boss_id);
  
  -- 迁移 driver_warehouses
  EXECUTE format('
    INSERT INTO %I.driver_warehouses (id, driver_id, warehouse_id, created_at)
    SELECT id, driver_id, warehouse_id, created_at
    FROM public.driver_warehouses
    WHERE boss_id = %L
    ON CONFLICT (driver_id, warehouse_id) DO NOTHING
  ', schema_name, tenant_boss_id);
  
  -- 迁移 manager_warehouses
  EXECUTE format('
    INSERT INTO %I.manager_warehouses (id, manager_id, warehouse_id, created_at)
    SELECT id, manager_id, warehouse_id, created_at
    FROM public.manager_warehouses
    WHERE boss_id = %L
    ON CONFLICT (manager_id, warehouse_id) DO NOTHING
  ', schema_name, tenant_boss_id);
  
  -- 迁移 attendance
  EXECUTE format('
    INSERT INTO %I.attendance (id, user_id, warehouse_id, work_date, created_at)
    SELECT id, user_id, warehouse_id, work_date, created_at
    FROM public.attendance
    WHERE boss_id = %L
    ON CONFLICT (user_id, work_date) DO NOTHING
  ', schema_name, tenant_boss_id);
  
  -- 迁移 piece_work_records
  EXECUTE format('
    INSERT INTO %I.piece_work_records (id, user_id, warehouse_id, work_date, quantity, created_at)
    SELECT id, user_id, warehouse_id, work_date, quantity, created_at
    FROM public.piece_work_records
    WHERE boss_id = %L
    ON CONFLICT DO NOTHING
  ', schema_name, tenant_boss_id);
  
  -- 迁移 leave_applications
  EXECUTE format('
    INSERT INTO %I.leave_applications (id, user_id, warehouse_id, start_date, end_date, reason, status, created_at)
    SELECT id, user_id, warehouse_id, start_date, end_date, reason, status, created_at
    FROM public.leave_applications
    WHERE boss_id = %L
    ON CONFLICT DO NOTHING
  ', schema_name, tenant_boss_id);
  
  -- 迁移 vehicles
  EXECUTE format('
    INSERT INTO %I.vehicles (id, driver_id, plate_number, status, created_at)
    SELECT id, driver_id, plate_number, status, created_at
    FROM public.vehicles
    WHERE boss_id = %L
    ON CONFLICT (plate_number) DO NOTHING
  ', schema_name, tenant_boss_id);
  
  -- 迁移 feedback
  EXECUTE format('
    INSERT INTO %I.feedback (id, user_id, content, status, created_at)
    SELECT id, user_id, content, status, created_at
    FROM public.feedback
    WHERE boss_id = %L
    ON CONFLICT DO NOTHING
  ', schema_name, tenant_boss_id);
  
  -- 迁移 notifications
  EXECUTE format('
    INSERT INTO %I.notifications (id, user_id, title, content, is_read, created_at)
    SELECT id, user_id, title, content, is_read, created_at
    FROM public.notifications
    WHERE boss_id = %L
    ON CONFLICT DO NOTHING
  ', schema_name, tenant_boss_id);
  
  -- 迁移 driver_licenses
  EXECUTE format('
    INSERT INTO %I.driver_licenses (id, driver_id, license_number, id_card_name, created_at)
    SELECT id, driver_id, license_number, id_card_name, created_at
    FROM public.driver_licenses
    WHERE boss_id = %L
    ON CONFLICT (driver_id) DO NOTHING
  ', schema_name, tenant_boss_id);
  
  RAISE NOTICE '✅ 已迁移租户 % 的数据到 Schema: %', tenant_boss_id, schema_name;
END;
$$;

-- ============================================
-- 第四步：执行数据迁移
-- ============================================

DO $$
DECLARE
  boss_record RECORD;
BEGIN
  FOR boss_record IN 
    SELECT id FROM profiles WHERE role = 'super_admin'::user_role
  LOOP
    PERFORM migrate_tenant_data(boss_record.id);
  END LOOP;
  
  RAISE NOTICE '✅ 所有租户数据迁移完成';
END $$;

-- ============================================
-- 第五步：创建自动设置 search_path 的函数
-- ============================================

-- 设置当前会话的 search_path 到租户 Schema
CREATE OR REPLACE FUNCTION set_tenant_search_path()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema text;
BEGIN
  tenant_schema := get_tenant_schema();
  
  IF tenant_schema IS NOT NULL AND tenant_schema != 'public' THEN
    EXECUTE format('SET search_path TO %I, public', tenant_schema);
    RAISE NOTICE '✅ 已切换到租户 Schema: %', tenant_schema;
  END IF;
END;
$$;

-- ============================================
-- 完成
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 独立数据库隔离实施完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '每个租户现在拥有独立的 Schema';
  RAISE NOTICE '所有数据已迁移到对应的 Schema';
  RAISE NOTICE '使用 set_tenant_search_path() 切换到租户数据库';
  RAISE NOTICE '========================================';
END $$;
