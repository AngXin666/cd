/*
# 创建中央管理系统

## 1. 概述
创建多租户中央管理系统的核心表结构和函数。

## 2. 新建表
- `tenants` - 租户表
- `tenant_modules` - 租户模块配置表
- `system_admins` - 系统管理员表
- `audit_logs` - 审计日志表

## 3. 核心函数
- `create_tenant_schema()` - 创建租户 Schema
- `create_module_tables()` - 创建模块表
- `setup_tenant_rls()` - 设置 RLS 策略
- `set_current_tenant()` - 设置当前租户
- `get_user_tenant()` - 获取用户所属租户

## 4. 安全策略
- 系统管理员可以访问所有租户数据
- 租户用户只能访问自己租户的数据
- 使用 RLS 策略确保数据隔离

## 5. 注意事项
- 此迁移会创建中央管理系统的基础结构
- 不会影响现有的租户数据
- 执行前请备份数据库
*/

-- ============================================================================
-- 1. 创建租户表
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  company_name TEXT NOT NULL,
  tenant_code TEXT UNIQUE NOT NULL,
  schema_name TEXT UNIQUE NOT NULL,
  
  -- 联系信息
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  
  -- 状态和配额
  status TEXT NOT NULL DEFAULT 'active',
  max_users INTEGER DEFAULT 50,
  max_vehicles INTEGER DEFAULT 100,
  
  -- 时间信息
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  
  -- 其他
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_schema_name ON public.tenants(schema_name);
CREATE INDEX IF NOT EXISTS idx_tenants_expired_at ON public.tenants(expired_at);

-- 注释
COMMENT ON TABLE public.tenants IS '租户表 - 存储所有租户的基本信息';
COMMENT ON COLUMN public.tenants.schema_name IS 'PostgreSQL Schema 名称';

-- ============================================================================
-- 2. 创建租户模块配置表
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- 模块信息
  module_name TEXT NOT NULL,
  module_display_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  
  -- 配置
  config JSONB DEFAULT '{}',
  required_tables TEXT[],
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  enabled_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, module_name)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant_id ON public.tenant_modules(tenant_id);

COMMENT ON TABLE public.tenant_modules IS '租户模块配置表';

-- ============================================================================
-- 3. 创建系统管理员表
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本信息
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- 角色
  role TEXT NOT NULL DEFAULT 'admin',
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'active',
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_system_admins_email ON public.system_admins(email);

COMMENT ON TABLE public.system_admins IS '系统管理员表';

-- ============================================================================
-- 4. 创建审计日志表
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联信息
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.system_admins(id) ON DELETE SET NULL,
  
  -- 操作信息
  action TEXT NOT NULL,
  action_category TEXT,
  resource_type TEXT,
  resource_id TEXT,
  
  -- 详情
  details JSONB,
  old_value JSONB,
  new_value JSONB,
  
  -- 请求信息
  ip_address TEXT,
  user_agent TEXT,
  
  -- 结果
  status TEXT DEFAULT 'success',
  error_message TEXT,
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS '审计日志表';

-- ============================================================================
-- 5. 创建模块表函数
-- ============================================================================

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

COMMENT ON FUNCTION public.create_module_tables IS '根据模块名称创建对应的数据库表';

-- ============================================================================
-- 6. 设置租户 RLS 策略函数
-- ============================================================================

CREATE OR REPLACE FUNCTION public.setup_tenant_rls(
  p_schema_name TEXT
) RETURNS VOID AS $$
BEGIN
  -- profiles 表的 RLS
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

COMMENT ON FUNCTION public.setup_tenant_rls IS '为租户 Schema 设置 RLS 策略';

-- ============================================================================
-- 7. 创建租户 Schema 函数
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_tenant_schema(
  p_schema_name TEXT,
  p_modules TEXT[]
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_module TEXT;
BEGIN
  -- 1. 创建 Schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);
  
  -- 2. 创建基础表（profiles）
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
  
  -- 3. 根据模块创建表
  FOREACH v_module IN ARRAY p_modules
  LOOP
    PERFORM public.create_module_tables(p_schema_name, v_module);
  END LOOP;
  
  -- 4. 设置 RLS 策略
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

COMMENT ON FUNCTION public.create_tenant_schema IS '创建租户 Schema 并初始化表结构';

-- ============================================================================
-- 8. 设置当前租户函数
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_current_tenant(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_schema_name TEXT;
BEGIN
  -- 获取租户的 Schema 名称
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE id = p_tenant_id AND status = 'active';
  
  IF v_schema_name IS NULL THEN
    RAISE EXCEPTION '租户不存在或已停用';
  END IF;
  
  -- 设置 search_path
  EXECUTE format('SET search_path TO %I, public', v_schema_name);
  
  RETURN v_schema_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_current_tenant IS '设置当前会话的租户 Schema';

-- ============================================================================
-- 9. 获取用户所属租户函数（辅助函数）
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_tenant RECORD;
BEGIN
  -- 获取当前用户 ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 检查是否是系统管理员
  IF EXISTS (SELECT 1 FROM public.system_admins WHERE id = v_user_id AND status = 'active') THEN
    RETURN NULL;  -- 系统管理员不属于任何租户
  END IF;
  
  -- 遍历所有租户 Schema 查找用户
  FOR v_tenant IN SELECT id, schema_name FROM public.tenants WHERE status = 'active'
  LOOP
    BEGIN
      EXECUTE format('SELECT 1 FROM %I.profiles WHERE id = $1', v_tenant.schema_name)
      USING v_user_id;
      
      IF FOUND THEN
        RETURN v_tenant.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Schema 或表不存在，继续下一个
      CONTINUE;
    END;
  END LOOP;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_tenant_id IS '获取当前用户所属的租户 ID';

-- ============================================================================
-- 10. 启用 RLS
-- ============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 11. 创建 RLS 策略
-- ============================================================================

-- 系统管理员可以查看所有租户
DROP POLICY IF EXISTS "系统管理员可以查看所有租户" ON public.tenants;
CREATE POLICY "系统管理员可以查看所有租户" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- 系统管理员可以管理所有租户
DROP POLICY IF EXISTS "系统管理员可以管理所有租户" ON public.tenants;
CREATE POLICY "系统管理员可以管理所有租户" ON public.tenants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- 租户模块配置策略
DROP POLICY IF EXISTS "系统管理员可以管理模块配置" ON public.tenant_modules;
CREATE POLICY "系统管理员可以管理模块配置" ON public.tenant_modules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- 系统管理员表策略
DROP POLICY IF EXISTS "系统管理员可以查看自己" ON public.system_admins;
CREATE POLICY "系统管理员可以查看自己" ON public.system_admins
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 审计日志策略
DROP POLICY IF EXISTS "系统管理员可以查看审计日志" ON public.audit_logs;
CREATE POLICY "系统管理员可以查看审计日志" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- 完成
-- ============================================================================

-- 输出成功信息
DO $$
BEGIN
  RAISE NOTICE '✅ 中央管理系统创建成功！';
  RAISE NOTICE '📊 已创建表：tenants, tenant_modules, system_admins, audit_logs';
  RAISE NOTICE '🔧 已创建函数：create_tenant_schema, create_module_tables, setup_tenant_rls, set_current_tenant, get_user_tenant_id';
  RAISE NOTICE '🔐 已设置 RLS 策略';
END $$;
