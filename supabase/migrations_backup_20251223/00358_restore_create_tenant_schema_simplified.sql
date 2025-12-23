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
  
  -- 添加 notifications 表
  PERFORM public.add_notifications_to_schema(p_schema_name);
  
  RETURN jsonb_build_object('success', true, 'schema_name', p_schema_name);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;