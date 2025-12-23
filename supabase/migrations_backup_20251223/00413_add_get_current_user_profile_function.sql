/*
# 添加获取当前用户 profile 的 RPC 函数

## 功能说明
创建一个 RPC 函数，根据用户类型自动从正确的位置获取 profile：
- 超级管理员：从 public.profiles 表查询
- 租户用户（老板、平级账号、车队长、司机）：从租户 Schema 的 profiles 表查询

## 实现逻辑
1. 从 auth.users 的 user_metadata 中获取 tenant_id 和 schema_name
2. 如果有 tenant_id，说明是租户用户，从租户 Schema 查询
3. 如果没有 tenant_id，说明是超级管理员，从 public.profiles 查询

## 返回值
返回 JSONB 格式的 profile 数据，如果查询失败返回 NULL
*/

CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id text;
  v_schema_name text;
  v_profile jsonb;
BEGIN
  -- 获取当前用户 ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 从 auth.users 的 user_metadata 中获取租户信息
  SELECT 
    raw_user_meta_data->>'tenant_id',
    raw_user_meta_data->>'schema_name'
  INTO v_tenant_id, v_schema_name
  FROM auth.users
  WHERE id = v_user_id;
  
  -- 如果是租户用户，从租户 Schema 查询
  IF v_tenant_id IS NOT NULL AND v_schema_name IS NOT NULL THEN
    -- 检查 Schema 是否存在
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.schemata
      WHERE schema_name = v_schema_name
    ) THEN
      RAISE NOTICE '租户 Schema 不存在: %', v_schema_name;
      RETURN NULL;
    END IF;
    
    -- 从租户 Schema 查询 profile
    EXECUTE format('
      SELECT row_to_json(p.*)::jsonb
      FROM %I.profiles p
      WHERE p.id = $1
    ', v_schema_name)
    INTO v_profile
    USING v_user_id;
    
    RETURN v_profile;
  ELSE
    -- 如果是超级管理员，从 public.profiles 查询
    SELECT row_to_json(p.*)::jsonb
    INTO v_profile
    FROM public.profiles p
    WHERE p.id = v_user_id;
    
    RETURN v_profile;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_profile() IS '获取当前用户的 profile，自动从正确的 Schema 查询';
