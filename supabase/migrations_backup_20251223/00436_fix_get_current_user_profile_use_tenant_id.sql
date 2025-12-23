/*
# 修复 get_current_user_profile 函数 - 使用 tenant_id 而不是 schema_name

## 问题描述
- 当前函数从 user_metadata 获取 schema_name
- 但系统现在使用 tenant_id 作为主要标识
- 需要从 tenant_id 推导 schema_name

## 解决方案
- 从 user_metadata 获取 tenant_id
- 从 tenants 表查询对应的 schema_name
- 使用 schema_name 查询租户 Schema 的 profiles 表

## 修改内容
- 更新 get_current_user_profile 函数
- 支持从 tenant_id 推导 schema_name
- 添加详细的日志记录
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
  tenant_id_var text;
  schema_name_var text;
  query_text text;
BEGIN
  -- 获取当前用户ID
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE NOTICE '❌ 用户未登录';
    RETURN;
  END IF;

  RAISE NOTICE '✅ 当前用户ID: %', user_id_val;

  -- 从 user_metadata 获取 tenant_id
  SELECT u.raw_user_meta_data->>'tenant_id' INTO tenant_id_var
  FROM auth.users u
  WHERE u.id = user_id_val;

  -- 如果没有 tenant_id，说明是中央管理员，从 public.profiles 查询
  IF tenant_id_var IS NULL THEN
    RAISE NOTICE '✅ 用户是中央管理员，从 public.profiles 查询';
    RETURN QUERY
    SELECT p.id, p.phone, p.email, p.name, p.role, p.status, p.created_at
    FROM public.profiles p
    WHERE p.id = user_id_val;
    RETURN;
  END IF;

  RAISE NOTICE '✅ 用户的租户 ID: %', tenant_id_var;

  -- 从 tenants 表获取 schema_name
  SELECT t.schema_name INTO schema_name_var
  FROM public.tenants t
  WHERE t.id = tenant_id_var::uuid;

  -- 如果找不到 Schema 名称，返回空
  IF schema_name_var IS NULL THEN
    RAISE NOTICE '❌ 租户 % 不存在或没有 schema_name', tenant_id_var;
    RETURN;
  END IF;

  RAISE NOTICE '✅ 租户的 Schema: %', schema_name_var;

  -- 检查 Schema 是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata s
    WHERE s.schema_name = schema_name_var
  ) THEN
    RAISE NOTICE '❌ Schema % 不存在', schema_name_var;
    RETURN;
  END IF;

  RAISE NOTICE '✅ Schema 存在，准备查询 profiles 表';

  -- 从租户 Schema 查询
  query_text := format(
    'SELECT id, phone, email, name, role, status, created_at FROM %I.profiles WHERE id = $1',
    schema_name_var
  );

  RAISE NOTICE '✅ 执行查询: %', query_text;

  RETURN QUERY EXECUTE query_text USING user_id_val;
  
  RAISE NOTICE '✅ 查询完成';
END;
$$;

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.get_current_user_profile() FROM PUBLIC;

-- 仅授予 authenticated 角色执行权限
GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION public.get_current_user_profile() IS '从正确的 Schema 获取当前用户的 Profile（支持 tenant_id）';
