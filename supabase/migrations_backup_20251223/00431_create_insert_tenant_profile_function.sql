/*
# 创建插入租户 Profile 的 RPC 函数

## 功能说明
创建一个 RPC 函数，用于在租户 Schema 中插入 profile 记录，并同时更新用户的 user_metadata。

## 函数参数
- p_schema_name: 租户 Schema 名称（如 tenant_test1）
- p_user_id: 用户 ID
- p_name: 用户姓名
- p_phone: 手机号
- p_email: 邮箱（可选）
- p_role: 角色（boss, peer_admin, manager, driver）

## 函数功能
1. 在指定的租户 Schema 中插入 profile 记录
2. 更新 auth.users 表中的 user_metadata，添加 tenant_id 和 role
3. 使用动态 SQL 执行跨 Schema 操作

## 安全性
- 使用 SECURITY DEFINER 以管理员权限执行
- 验证 Schema 名称格式，防止 SQL 注入
*/

-- 创建插入租户 Profile 的函数
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

  -- 构建动态 SQL，在租户 Schema 中插入 profile
  v_sql := format(
    'INSERT INTO %I.profiles (id, name, phone, email, role, status) VALUES ($1, $2, $3, $4, $5::text::%I.user_role, $6) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email, role = EXCLUDED.role, status = EXCLUDED.status',
    p_schema_name,
    p_schema_name
  );

  -- 执行插入
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

  RAISE NOTICE 'Successfully created profile for user % in schema %', p_user_id, p_schema_name;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.insert_tenant_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_tenant_profile TO anon;

COMMENT ON FUNCTION public.insert_tenant_profile IS '在租户 Schema 中创建用户 profile，并更新 user_metadata';
