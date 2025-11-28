/*
# 创建获取租户用户列表的 RPC 函数

## 功能说明
创建一个 RPC 函数，用于从租户 Schema 中查询用户列表。

## 函数参数
- p_tenant_id: 租户 ID

## 函数功能
1. 根据租户 ID 获取租户的 Schema 名称
2. 从租户 Schema 的 profiles 表查询所有用户
3. 返回用户列表（JSON 格式）

## 安全性
- 使用 SECURITY DEFINER 以管理员权限执行
- 验证租户 ID 的有效性
*/

-- 创建获取租户用户列表的函数
CREATE OR REPLACE FUNCTION public.get_tenant_users(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_sql text;
  v_result jsonb;
BEGIN
  -- 获取租户的 Schema 名称
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE id = p_tenant_id
  LIMIT 1;

  IF v_schema_name IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
  END IF;

  -- 验证 Schema 名称格式（防止 SQL 注入）
  IF v_schema_name !~ '^tenant_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid schema name format: %', v_schema_name;
  END IF;

  -- 构建动态 SQL，从租户 Schema 查询用户列表
  v_sql := format(
    'SELECT jsonb_agg(row_to_json(p.*)) FROM %I.profiles p ORDER BY p.created_at DESC',
    v_schema_name
  );

  -- 执行查询
  EXECUTE v_sql INTO v_result;

  -- 如果没有数据，返回空数组
  IF v_result IS NULL THEN
    v_result := '[]'::jsonb;
  END IF;

  RETURN v_result;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.get_tenant_users TO authenticated;

COMMENT ON FUNCTION public.get_tenant_users IS '从租户 Schema 中获取用户列表';
