/*
# 修复 get_tenant_users 函数的 SQL 语法错误

## 问题
- 使用 jsonb_agg 时，ORDER BY 子句中的列必须出现在 GROUP BY 中
- 需要修改 SQL 语句，先排序再聚合

## 解决方案
- 使用子查询先排序，再使用 jsonb_agg 聚合
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS public.get_tenant_users(uuid);

-- 创建修复后的函数
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
  -- 使用子查询先排序，再聚合
  v_sql := format(
    'SELECT COALESCE(jsonb_agg(row_to_json(p.*)), ''[]''::jsonb) FROM (SELECT * FROM %I.profiles ORDER BY created_at DESC) p',
    v_schema_name
  );

  -- 执行查询
  EXECUTE v_sql INTO v_result;

  RETURN v_result;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.get_tenant_users TO authenticated;

COMMENT ON FUNCTION public.get_tenant_users IS '从租户 Schema 中获取用户列表（修复版）';
