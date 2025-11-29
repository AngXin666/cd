/*
# 修复 insert_tenant_profile 函数 - 移除枚举类型转换

## 问题
insert_tenant_profile 函数尝试将 role 转换为租户 Schema 中的 user_role 枚举类型，
但租户 Schema 中的 profiles.role 字段实际上是 TEXT 类型，不是枚举类型。

## 解决方案
移除 role 字段的枚举类型转换，直接使用 TEXT 类型。

## 影响
- 修复创建租户用户时的角色类型错误
- 允许使用租户 Schema 中定义的所有角色：boss, peer, fleet_leader, driver
*/

-- 重新创建函数，移除枚举类型转换
CREATE OR REPLACE FUNCTION public.insert_tenant_profile(
  p_schema_name text,
  p_user_id uuid,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_role text DEFAULT 'driver'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_sql text;
BEGIN
  -- 验证 Schema 名称格式（防止 SQL 注入）
  IF p_schema_name !~ '^tenant_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid schema name format: %', p_schema_name;
  END IF;

  -- 获取租户 ID
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE schema_name = p_schema_name
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found for schema: %', p_schema_name;
  END IF;

  -- 验证角色值（租户 Schema 中的有效角色）
  IF p_role NOT IN ('boss', 'peer', 'fleet_leader', 'driver') THEN
    RAISE EXCEPTION 'Invalid role for tenant schema: %. Valid roles are: boss, peer, fleet_leader, driver', p_role;
  END IF;

  -- 构建动态 SQL，在租户 Schema 中插入 profile
  -- 注意：租户 Schema 中的 role 字段是 TEXT 类型，不是枚举类型
  v_sql := format(
    'INSERT INTO %I.profiles (id, name, phone, email, role, status) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     ON CONFLICT (id) DO UPDATE SET 
       name = EXCLUDED.name, 
       phone = EXCLUDED.phone, 
       email = EXCLUDED.email, 
       role = EXCLUDED.role, 
       status = EXCLUDED.status',
    p_schema_name
  );

  -- 执行插入（直接使用 TEXT 类型的 role，不进行枚举转换）
  EXECUTE v_sql USING p_user_id, p_name, p_phone, p_email, p_role, 'active';

  -- 更新 auth.users 的 user_metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{tenant_id}',
      to_jsonb(v_tenant_id::text)
    ),
    '{role}',
    to_jsonb(p_role)
  )
  WHERE id = p_user_id;

  RAISE NOTICE 'Successfully created profile for user % in schema % with role %', p_user_id, p_schema_name, p_role;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.insert_tenant_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_tenant_profile TO anon;

COMMENT ON FUNCTION public.insert_tenant_profile IS '在租户 Schema 中创建用户 profile（role 为 TEXT 类型），并更新 user_metadata';
