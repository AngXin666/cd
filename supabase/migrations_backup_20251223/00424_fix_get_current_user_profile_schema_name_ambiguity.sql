/*
# 修复 get_current_user_profile 函数中的 schema_name 歧义问题

## 问题描述
- 函数在检查 Schema 是否存在时，WHERE 子句中的 schema_name 引用不明确
- information_schema.schemata 表有一个列叫 schema_name
- 函数中也有一个变量叫 schema_name
- WHERE schema_name = schema_name 导致歧义错误

## 解决方案
- 使用表别名 s 来明确指定列来源
- WHERE s.schema_name = schema_name_var（变量）

## 修改内容
- 更新 get_current_user_profile 函数
- 添加表别名消除歧义
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS public.get_current_user_profile();

-- 创建修复后的函数
CREATE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
  id uuid,
  phone text,
  email text,
  name text,
  role text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_id_val uuid;
  tenant_id_val uuid;
  schema_name_var text;
  query_text text;
BEGIN
  -- 获取当前用户ID
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RETURN;
  END IF;

  -- 从 user_metadata 获取租户ID
  SELECT (u.raw_user_meta_data->>'tenant_id')::uuid INTO tenant_id_val
  FROM auth.users u
  WHERE u.id = user_id_val;

  -- 如果没有租户ID，返回空
  IF tenant_id_val IS NULL THEN
    RAISE NOTICE '用户 % 没有租户ID', user_id_val;
    RETURN;
  END IF;

  -- 从 tenants 表获取 Schema 名称
  SELECT t.schema_name INTO schema_name_var
  FROM public.tenants t
  WHERE t.id = tenant_id_val AND t.status = 'active';

  -- 如果找不到 Schema 名称，返回空
  IF schema_name_var IS NULL THEN
    RAISE NOTICE '租户 % 没有 Schema 名称', tenant_id_val;
    RETURN;
  END IF;

  RAISE NOTICE '用户 % 的租户 Schema: %', user_id_val, schema_name_var;

  -- 检查 Schema 是否存在（使用表别名消除歧义）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata s
    WHERE s.schema_name = schema_name_var
  ) THEN
    RAISE NOTICE 'Schema % 不存在', schema_name_var;
    RETURN;
  END IF;

  -- 从租户 Schema 查询
  query_text := format(
    'SELECT id, phone, email, name, role, status, created_at FROM %I.profiles WHERE id = $1',
    schema_name_var
  );

  RAISE NOTICE '执行查询: %', query_text;

  RETURN QUERY EXECUTE query_text USING user_id_val;
END;
$$;

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.get_current_user_profile() FROM PUBLIC;

-- 仅授予 authenticated 角色执行权限
GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION public.get_current_user_profile() IS '从租户 Schema 获取当前用户的 Profile（修复 schema_name 歧义问题）';