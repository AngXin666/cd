/*
# 修复 get_current_user_profile 函数 - 直接使用 user_metadata 中的 schema_name

## 问题描述
- 函数尝试从 tenants 表查询 schema_name，但可能查询失败
- 用户元数据中已经包含了 schema_name 信息
- 导致函数返回空数据

## 解决方案
- 直接从 user_metadata 获取 schema_name
- 简化查询逻辑
- 添加更详细的日志记录

## 修改内容
- 更新 get_current_user_profile 函数
- 使用 raw_user_meta_data->>'schema_name' 获取 Schema 名称
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

  -- 直接从 user_metadata 获取 schema_name
  SELECT u.raw_user_meta_data->>'schema_name' INTO schema_name_var
  FROM auth.users u
  WHERE u.id = user_id_val;

  -- 如果找不到 Schema 名称，返回空
  IF schema_name_var IS NULL THEN
    RAISE NOTICE '❌ 用户元数据中没有 schema_name';
    RETURN;
  END IF;

  RAISE NOTICE '✅ 用户的租户 Schema: %', schema_name_var;

  -- 检查 Schema 是否存在（使用表别名消除歧义）
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
COMMENT ON FUNCTION public.get_current_user_profile() IS '从租户 Schema 获取当前用户的 Profile（直接使用 user_metadata 中的 schema_name）';