-- 添加 Schema 隔离支持

-- 1. 为 tenants 表添加 schema_name 字段
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS schema_name TEXT UNIQUE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tenants_schema_name ON public.tenants(schema_name);

-- 2. 创建租户模块配置表
CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  module_display_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  required_tables TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  enabled_at TIMESTAMPTZ,
  UNIQUE(tenant_id, module_name)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant_id ON public.tenant_modules(tenant_id);

-- 3. 创建系统管理员表
CREATE TABLE IF NOT EXISTS public.system_admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_system_admins_email ON public.system_admins(email);

-- 4. 创建审计日志表
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.system_admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  action_category TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 5. 创建模块表函数
CREATE OR REPLACE FUNCTION public.create_module_tables(
  p_schema_name TEXT,
  p_module_name TEXT
) RETURNS VOID AS $$
BEGIN
  CASE p_module_name
    WHEN 'vehicles' THEN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.vehicles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          plate_number TEXT UNIQUE NOT NULL,
          driver_id UUID REFERENCES %I.profiles(id),
          status TEXT DEFAULT ''active'',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON %I.vehicles(driver_id);
      ', p_schema_name, p_schema_name, p_schema_name);
      
    WHEN 'attendance' THEN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.attendance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES %I.profiles(id),
          check_in_time TIMESTAMPTZ,
          check_out_time TIMESTAMPTZ,
          status TEXT DEFAULT ''normal'',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON %I.attendance(user_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON %I.attendance(check_in_time);
      ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
      
    WHEN 'warehouses' THEN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.warehouses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      ', p_schema_name);
      
    WHEN 'leave' THEN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.leave_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES %I.profiles(id),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          reason TEXT,
          status TEXT DEFAULT ''pending'',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON %I.leave_requests(user_id);
      ', p_schema_name, p_schema_name, p_schema_name);
      
    WHEN 'piecework' THEN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.piecework_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES %I.profiles(id),
          work_date DATE NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_piecework_records_user_id ON %I.piecework_records(user_id);
      ', p_schema_name, p_schema_name, p_schema_name);
      
    ELSE
      RAISE NOTICE '未知模块: %', p_module_name;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 设置租户 RLS 策略函数
CREATE OR REPLACE FUNCTION public.setup_tenant_rls(
  p_schema_name TEXT
) RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I.profiles ENABLE ROW LEVEL SECURITY', p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "用户可以查看所有用户" ON %I.profiles;
    CREATE POLICY "用户可以查看所有用户" ON %I.profiles
      FOR SELECT TO authenticated
      USING (true);
  ', p_schema_name, p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "用户可以更新自己的信息" ON %I.profiles;
    CREATE POLICY "用户可以更新自己的信息" ON %I.profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = id);
  ', p_schema_name, p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "老板可以管理所有用户" ON %I.profiles;
    CREATE POLICY "老板可以管理所有用户" ON %I.profiles
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM %I.profiles
          WHERE id = auth.uid() AND role = ''boss''
        )
      );
  ', p_schema_name, p_schema_name, p_schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建租户 Schema 函数
CREATE OR REPLACE FUNCTION public.create_tenant_schema(
  p_schema_name TEXT,
  p_modules TEXT[]
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_module TEXT;
BEGIN
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);
  
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT ''driver'',
      status TEXT DEFAULT ''active'',
      vehicle_plate TEXT,
      warehouse_ids UUID[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON %I.profiles(role);
    CREATE INDEX IF NOT EXISTS idx_profiles_status ON %I.profiles(status);
  ', p_schema_name, p_schema_name, p_schema_name);
  
  FOREACH v_module IN ARRAY p_modules
  LOOP
    PERFORM public.create_module_tables(p_schema_name, v_module);
  END LOOP;
  
  PERFORM public.setup_tenant_rls(p_schema_name);
  
  v_result := jsonb_build_object(
    'success', true,
    'schema_name', p_schema_name,
    'message', 'Schema 创建成功'
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 设置当前租户函数
CREATE OR REPLACE FUNCTION public.set_current_tenant(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_schema_name TEXT;
BEGIN
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE id = p_tenant_id AND status = 'active';
  
  IF v_schema_name IS NULL THEN
    RAISE EXCEPTION '租户不存在或已停用';
  END IF;
  
  EXECUTE format('SET search_path TO %I, public', v_schema_name);
  
  RETURN v_schema_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 获取用户所属租户函数
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_tenant RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.system_admins WHERE id = v_user_id AND status = 'active') THEN
    RETURN NULL;
  END IF;
  
  FOR v_tenant IN SELECT id, schema_name FROM public.tenants WHERE status = 'active'
  LOOP
    BEGIN
      EXECUTE format('SELECT 1 FROM %I.profiles WHERE id = $1', v_tenant.schema_name)
      USING v_user_id;
      
      IF FOUND THEN
        RETURN v_tenant.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 启用 RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. 创建 RLS 策略
DROP POLICY IF EXISTS "系统管理员可以查看所有租户" ON public.tenants;
CREATE POLICY "系统管理员可以查看所有租户" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "系统管理员可以管理所有租户" ON public.tenants;
CREATE POLICY "系统管理员可以管理所有租户" ON public.tenants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "系统管理员可以管理模块配置" ON public.tenant_modules;
CREATE POLICY "系统管理员可以管理模块配置" ON public.tenant_modules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "系统管理员可以查看自己" ON public.system_admins;
CREATE POLICY "系统管理员可以查看自己" ON public.system_admins
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "系统管理员可以查看审计日志" ON public.audit_logs;
CREATE POLICY "系统管理员可以查看审计日志" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE id = auth.uid() AND status = 'active'
    )
  );