/*
# 简化中央管理系统

## 1. 概述
简化多租户中央管理系统，只保留核心功能。

## 2. 删除的表
- `tenant_modules` - 模块配置表（不需要）
- `audit_logs` - 审计日志表（不需要）

## 3. 新增字段
为 `tenants` 表添加老板账号信息：
- `boss_user_id` - 老板的 auth.users.id
- `boss_name` - 老板姓名
- `boss_phone` - 老板手机号
- `boss_email` - 老板邮箱

## 4. 简化的函数
- `create_tenant_schema(schema_name)` - 创建租户 Schema 及所有表
- `delete_tenant_schema(schema_name)` - 删除租户 Schema 及所有数据

## 5. 核心功能
- ✅ 创建租户（自动化部署）
- ✅ 管理租期
- ✅ 停用账号
- ✅ 删除账号
*/

-- 1. 删除不需要的表
DROP TABLE IF EXISTS public.tenant_modules CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- 2. 删除旧函数
DROP FUNCTION IF EXISTS public.create_module_tables(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.setup_tenant_rls(TEXT);
DROP FUNCTION IF EXISTS public.create_tenant_schema(TEXT, TEXT[]);

-- 3. 为 tenants 表添加老板账号信息字段
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS boss_user_id UUID;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS boss_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS boss_phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS boss_email TEXT;

-- 4. 创建简化的租户 Schema 函数
CREATE OR REPLACE FUNCTION public.create_tenant_schema(
  p_schema_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.profiles (
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
    CREATE INDEX idx_profiles_role ON %I.profiles(role);
    CREATE INDEX idx_profiles_status ON %I.profiles(status);
  ', p_schema_name, p_schema_name, p_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.vehicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plate_number TEXT UNIQUE NOT NULL,
      driver_id UUID REFERENCES %I.profiles(id),
      status TEXT DEFAULT ''active'',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_vehicles_driver_id ON %I.vehicles(driver_id);
  ', p_schema_name, p_schema_name, p_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES %I.profiles(id),
      check_in_time TIMESTAMPTZ,
      check_out_time TIMESTAMPTZ,
      status TEXT DEFAULT ''normal'',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_attendance_user_id ON %I.attendance(user_id);
    CREATE INDEX idx_attendance_check_in_time ON %I.attendance(check_in_time);
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.warehouses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ', p_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.leave_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES %I.profiles(id),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      status TEXT DEFAULT ''pending'',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_leave_requests_user_id ON %I.leave_requests(user_id);
  ', p_schema_name, p_schema_name, p_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.piecework_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES %I.profiles(id),
      work_date DATE NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_piecework_records_user_id ON %I.piecework_records(user_id);
    CREATE INDEX idx_piecework_records_work_date ON %I.piecework_records(work_date);
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  EXECUTE format('ALTER TABLE %I.profiles ENABLE ROW LEVEL SECURITY', p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "用户可以查看所有用户" ON %I.profiles;
    CREATE POLICY "用户可以查看所有用户" ON %I.profiles
      FOR SELECT TO authenticated USING (true);
  ', p_schema_name, p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "用户可以更新自己的信息" ON %I.profiles;
    CREATE POLICY "用户可以更新自己的信息" ON %I.profiles
      FOR UPDATE TO authenticated USING (auth.uid() = id);
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
  
  RETURN jsonb_build_object('success', true, 'schema_name', p_schema_name);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_tenant_schema IS '创建租户 Schema 并初始化所有表结构';

-- 5. 创建删除租户 Schema 函数
CREATE OR REPLACE FUNCTION public.delete_tenant_schema(
  p_schema_name TEXT
) RETURNS JSONB AS $$
BEGIN
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_schema_name);
  RETURN jsonb_build_object('success', true, 'message', 'Schema 已删除');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.delete_tenant_schema IS '删除租户 Schema 及其所有数据';
