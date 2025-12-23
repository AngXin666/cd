/*
# 创建租户数据查询函数

## 问题
- 前端查询 profiles 表时，直接查询 public.profiles，导致所有租户看到相同的数据
- 多租户系统需要根据用户的租户信息，查询对应租户 Schema 中的数据

## 解决方案
创建 RPC 函数，动态查询租户 Schema 中的数据：
1. `get_tenant_profiles(role_filter)` - 查询租户 Schema 中的用户档案
2. `get_tenant_drivers()` - 查询租户 Schema 中的司机列表
3. `get_tenant_profile_by_id(user_id)` - 查询租户 Schema 中的指定用户档案

## 安全性
- 使用 SECURITY DEFINER 权限，绕过 RLS 检查
- 使用 get_tenant_schema() 函数获取当前用户的租户 Schema
- 只查询当前用户所属租户的数据

## 注意事项
- 租户 Schema 中的 profiles 表结构与 public.profiles 不同
- 租户角色：boss, peer, fleet_leader, driver
- Public 角色：super_admin, boss, peer_admin, manager, driver
*/

-- 1. 查询租户 Schema 中的用户档案（按角色过滤）
CREATE OR REPLACE FUNCTION public.get_tenant_profiles(role_filter text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  role text,
  permission_type text,
  status text,
  vehicle_plate text,
  warehouse_ids uuid[],
  managed_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  tenant_schema text;
  query text;
BEGIN
  -- 获取当前用户的租户 Schema
  tenant_schema := public.get_tenant_schema();
  
  -- 如果没有租户 Schema，返回空结果
  IF tenant_schema IS NULL OR tenant_schema = 'public' THEN
    RETURN;
  END IF;
  
  -- 构造查询语句
  IF role_filter IS NOT NULL THEN
    query := format('SELECT * FROM %I.profiles WHERE role = %L ORDER BY created_at DESC', tenant_schema, role_filter);
  ELSE
    query := format('SELECT * FROM %I.profiles ORDER BY created_at DESC', tenant_schema);
  END IF;
  
  -- 执行查询
  RETURN QUERY EXECUTE query;
END;
$$;

-- 2. 查询租户 Schema 中的司机列表
CREATE OR REPLACE FUNCTION public.get_tenant_drivers()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  role text,
  permission_type text,
  status text,
  vehicle_plate text,
  warehouse_ids uuid[],
  managed_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.get_tenant_profiles('driver');
END;
$$;

-- 3. 查询租户 Schema 中的指定用户档案
CREATE OR REPLACE FUNCTION public.get_tenant_profile_by_id(user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  role text,
  permission_type text,
  status text,
  vehicle_plate text,
  warehouse_ids uuid[],
  managed_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  tenant_schema text;
  query text;
BEGIN
  -- 获取当前用户的租户 Schema
  tenant_schema := public.get_tenant_schema();
  
  -- 如果没有租户 Schema，返回空结果
  IF tenant_schema IS NULL OR tenant_schema = 'public' THEN
    RETURN;
  END IF;
  
  -- 构造查询语句
  query := format('SELECT * FROM %I.profiles WHERE id = %L', tenant_schema, user_id);
  
  -- 执行查询
  RETURN QUERY EXECUTE query;
END;
$$;

-- 4. 查询租户 Schema 中的所有用户（不过滤角色）
CREATE OR REPLACE FUNCTION public.get_all_tenant_profiles()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  role text,
  permission_type text,
  status text,
  vehicle_plate text,
  warehouse_ids uuid[],
  managed_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.get_tenant_profiles(NULL);
END;
$$;

COMMENT ON FUNCTION public.get_tenant_profiles IS '查询租户 Schema 中的用户档案（按角色过滤）';
COMMENT ON FUNCTION public.get_tenant_drivers IS '查询租户 Schema 中的司机列表';
COMMENT ON FUNCTION public.get_tenant_profile_by_id IS '查询租户 Schema 中的指定用户档案';
COMMENT ON FUNCTION public.get_all_tenant_profiles IS '查询租户 Schema 中的所有用户';
