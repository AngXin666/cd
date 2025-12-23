-- 创建辅助函数：添加其他必需的表
CREATE OR REPLACE FUNCTION public.add_remaining_tables_to_schema(p_schema_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 创建 vehicles 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.vehicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plate_number TEXT UNIQUE NOT NULL,
      driver_id UUID REFERENCES %I.profiles(id),
      warehouse_id UUID,
      status TEXT DEFAULT ''active'',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      CONSTRAINT valid_vehicle_status CHECK (status IN (''active'', ''inactive'', ''maintenance''))
    );
    CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON %I.vehicles(driver_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_warehouse_id ON %I.vehicles(warehouse_id);
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 创建 attendance 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES %I.profiles(id),
      check_in_time TIMESTAMPTZ,
      check_out_time TIMESTAMPTZ,
      status TEXT DEFAULT ''normal'',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      
      CONSTRAINT valid_attendance_status CHECK (status IN (''normal'', ''late'', ''absent'', ''leave''))
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON %I.attendance(user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON %I.attendance(check_in_time);
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 创建 warehouses 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.warehouses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ', p_schema_name);
  
  -- 创建 leave_requests 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.leave_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES %I.profiles(id),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      status TEXT DEFAULT ''pending'',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      CONSTRAINT valid_leave_status CHECK (status IN (''pending'', ''approved'', ''rejected''))
    );
    CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON %I.leave_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON %I.leave_requests(status);
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 创建 piecework_records 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.piecework_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES %I.profiles(id),
      work_date DATE NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_piecework_records_user_id ON %I.piecework_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_piecework_records_work_date ON %I.piecework_records(work_date);
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
END;
$$;

COMMENT ON FUNCTION public.add_remaining_tables_to_schema(TEXT) IS '为指定的租户 Schema 添加其他必需的表';

-- 更新 create_tenant_schema 函数以包含所有表
CREATE OR REPLACE FUNCTION create_tenant_schema(p_schema_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. 创建 Schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);
  
  -- 2. 创建 profiles 表
  EXECUTE format('
    CREATE TABLE %I.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT ''driver'',
      permission_type TEXT DEFAULT ''full'',
      status TEXT DEFAULT ''active'',
      vehicle_plate TEXT,
      warehouse_ids UUID[],
      managed_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      CONSTRAINT valid_role CHECK (role IN (''boss'', ''peer'', ''fleet_leader'', ''driver'')),
      CONSTRAINT valid_permission CHECK (permission_type IN (''full'', ''readonly'')),
      CONSTRAINT valid_status CHECK (status IN (''active'', ''inactive''))
    );
    CREATE INDEX idx_profiles_role ON %I.profiles(role);
    CREATE INDEX idx_profiles_status ON %I.profiles(status);
    CREATE INDEX idx_profiles_permission_type ON %I.profiles(permission_type);
    CREATE INDEX idx_profiles_managed_by ON %I.profiles(managed_by);
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 3. 添加其他必需的表
  PERFORM public.add_remaining_tables_to_schema(p_schema_name);
  
  -- 4. 添加 notifications 表
  PERFORM public.add_notifications_to_schema(p_schema_name);
  
  RETURN jsonb_build_object('success', true, 'schema_name', p_schema_name);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION create_tenant_schema(TEXT) IS '创建租户 Schema 和所有必需的表';