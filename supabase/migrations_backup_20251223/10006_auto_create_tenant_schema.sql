/*
# 自动创建租户 Schema

## 概述
当创建新租户配置时，自动创建对应的数据库 Schema。

## 功能
1. 创建触发器函数，在插入租户配置时自动创建 Schema
2. 创建触发器，绑定到 tenant_configs 表的 INSERT 操作
3. 自动创建基础表结构（profiles、warehouses 等）

## 注意事项
- Schema 名称由系统自动生成，格式：tenant_<uuid>_<timestamp>
- 每个租户拥有独立的 Schema，数据物理隔离
- 自动创建基础表结构，包含必要的字段和索引
*/

-- 创建触发器函数：自动创建租户 Schema
CREATE OR REPLACE FUNCTION auto_create_tenant_schema()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 创建 Schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', NEW.schema_name);
  
  -- 在新 Schema 中创建 profiles 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      role text NOT NULL CHECK (role IN (''boss'', ''peer'', ''manager'', ''driver'')),
      permission_level text CHECK (permission_level IN (''full_permission'', ''read_only'')),
      manager_id uuid REFERENCES %I.profiles(id),
      managed_warehouses uuid[],
      real_name text,
      phone text,
      email text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', NEW.schema_name, NEW.schema_name);
  
  -- 创建 warehouses 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.warehouses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      address text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', NEW.schema_name);
  
  -- 创建 drivers 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.drivers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id uuid REFERENCES %I.profiles(id),
      license_number text,
      license_type text,
      hire_date date,
      status text DEFAULT ''active'' CHECK (status IN (''active'', ''inactive'', ''suspended'')),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', NEW.schema_name, NEW.schema_name);
  
  -- 创建 vehicles 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.vehicles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plate_number text NOT NULL UNIQUE,
      vehicle_type text,
      brand text,
      model text,
      year integer,
      status text DEFAULT ''active'' CHECK (status IN (''active'', ''maintenance'', ''retired'')),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', NEW.schema_name);
  
  -- 创建 attendance_records 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.attendance_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id uuid REFERENCES %I.profiles(id),
      check_in_time timestamptz,
      check_out_time timestamptz,
      work_date date NOT NULL,
      status text DEFAULT ''present'' CHECK (status IN (''present'', ''absent'', ''leave'')),
      notes text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', NEW.schema_name, NEW.schema_name);
  
  -- 创建 salary_records 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.salary_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id uuid REFERENCES %I.profiles(id),
      month text NOT NULL,
      base_salary numeric(10, 2),
      bonus numeric(10, 2),
      deduction numeric(10, 2),
      total_salary numeric(10, 2),
      status text DEFAULT ''pending'' CHECK (status IN (''pending'', ''paid'')),
      paid_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', NEW.schema_name, NEW.schema_name);
  
  -- 启用 RLS
  EXECUTE format('ALTER TABLE %I.profiles ENABLE ROW LEVEL SECURITY', NEW.schema_name);
  EXECUTE format('ALTER TABLE %I.warehouses ENABLE ROW LEVEL SECURITY', NEW.schema_name);
  EXECUTE format('ALTER TABLE %I.drivers ENABLE ROW LEVEL SECURITY', NEW.schema_name);
  EXECUTE format('ALTER TABLE %I.vehicles ENABLE ROW LEVEL SECURITY', NEW.schema_name);
  EXECUTE format('ALTER TABLE %I.attendance_records ENABLE ROW LEVEL SECURITY', NEW.schema_name);
  EXECUTE format('ALTER TABLE %I.salary_records ENABLE ROW LEVEL SECURITY', NEW.schema_name);
  
  -- 创建权限检查函数
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.is_boss(user_id uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM %I.profiles
        WHERE id = user_id AND role = ''boss''
      );
    $func$', NEW.schema_name, NEW.schema_name);
  
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.has_full_permission(user_id uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM %I.profiles
        WHERE id = user_id 
        AND (role = ''boss'' OR (role IN (''peer'', ''manager'') AND permission_level = ''full_permission''))
      );
    $func$', NEW.schema_name, NEW.schema_name);
  
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.can_manage_warehouse(user_id uuid, warehouse_id uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM %I.profiles
        WHERE id = user_id 
        AND (
          role = ''boss'' 
          OR (role = ''peer'' AND permission_level = ''full_permission'')
          OR (role = ''manager'' AND permission_level = ''full_permission'' AND warehouse_id = ANY(managed_warehouses))
        )
      );
    $func$', NEW.schema_name, NEW.schema_name);
  
  -- 创建 RLS 策略
  -- profiles 表策略
  EXECUTE format('
    CREATE POLICY "老板可以查看所有用户" ON %I.profiles
    FOR SELECT USING (%I.is_boss(auth.uid()))', NEW.schema_name, NEW.schema_name);
  
  EXECUTE format('
    CREATE POLICY "拥有完整权限的用户可以查看所有用户" ON %I.profiles
    FOR SELECT USING (%I.has_full_permission(auth.uid()))', NEW.schema_name, NEW.schema_name);
  
  EXECUTE format('
    CREATE POLICY "用户可以查看自己的信息" ON %I.profiles
    FOR SELECT USING (auth.uid() = id)', NEW.schema_name);
  
  EXECUTE format('
    CREATE POLICY "老板可以管理所有用户" ON %I.profiles
    FOR ALL USING (%I.is_boss(auth.uid()))', NEW.schema_name, NEW.schema_name);
  
  EXECUTE format('
    CREATE POLICY "拥有完整权限的用户可以管理用户" ON %I.profiles
    FOR ALL USING (%I.has_full_permission(auth.uid()))', NEW.schema_name, NEW.schema_name);
  
  RAISE NOTICE '租户 Schema % 创建成功', NEW.schema_name;
  
  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS on_tenant_config_insert ON tenant_configs;
CREATE TRIGGER on_tenant_config_insert
  AFTER INSERT ON tenant_configs
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_tenant_schema();

-- 添加说明
COMMENT ON FUNCTION auto_create_tenant_schema() IS '自动创建租户 Schema 和基础表结构';
COMMENT ON TRIGGER on_tenant_config_insert ON tenant_configs IS '在插入租户配置时自动创建 Schema';
