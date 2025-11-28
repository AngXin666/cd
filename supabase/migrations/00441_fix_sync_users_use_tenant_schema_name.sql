/*
# 修复同步用户函数 - 使用租户表的 schema_name

## 问题
- 函数直接用 tenant_id（UUID）构造 Schema 名称
- 实际的 Schema 名称存储在 tenants 表的 schema_name 列中
- 例如：tenant_id = '26d10bc2-d13b-44b0-ac9f-dec469cfadc9'
  但 schema_name = 'tenant_test1'

## 解决方案
- 从 tenants 表查询 schema_name
- 使用查询到的 schema_name 而不是构造的名称
*/

-- 重新创建函数，从 tenants 表获取 schema_name
CREATE OR REPLACE FUNCTION sync_auth_users_to_tenant_profiles(
  p_tenant_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_schema_name TEXT;
  auth_user RECORD;
  synced_count INT := 0;
  synced_users jsonb := '[]'::jsonb;
  user_info jsonb;
  sql_query TEXT;
  profile_exists BOOLEAN;
BEGIN
  -- 验证租户ID
  IF p_tenant_id IS NULL OR p_tenant_id = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '租户ID不能为空'
    );
  END IF;
  
  -- 从 tenants 表获取 schema_name
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE id = p_tenant_id::uuid;
  
  -- 检查租户是否存在
  IF v_schema_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '租户不存在: ' || p_tenant_id
    );
  END IF;
  
  -- 验证 schema 是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata s
    WHERE s.schema_name = v_schema_name
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '租户 Schema 不存在: ' || v_schema_name
    );
  END IF;
  
  -- 遍历所有属于该租户的 auth.users
  FOR auth_user IN 
    SELECT u.id, u.email, u.phone, u.raw_user_meta_data
    FROM auth.users u
    WHERE u.confirmed_at IS NOT NULL
      AND u.raw_user_meta_data->>'tenant_id' = p_tenant_id
  LOOP
    -- 检查是否已存在 profiles 记录
    sql_query := format(
      'SELECT EXISTS(SELECT 1 FROM %I.profiles WHERE id = $1)',
      v_schema_name
    );
    
    EXECUTE sql_query INTO profile_exists USING auth_user.id;
    
    IF NOT profile_exists THEN
      -- 提取用户信息
      DECLARE
        user_name TEXT;
        user_role TEXT;
      BEGIN
        user_name := COALESCE(
          auth_user.raw_user_meta_data->>'name',
          auth_user.raw_user_meta_data->>'real_name',
          SPLIT_PART(auth_user.email, '@', 1),
          auth_user.phone,
          '未命名用户'
        );
        
        user_role := COALESCE(
          auth_user.raw_user_meta_data->>'role',
          'driver'
        );
        
        -- 在租户 Schema 中创建 profiles 记录
        sql_query := format(
          'INSERT INTO %I.profiles (id, name, phone, email, role, permission_type, status, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
          v_schema_name
        );
        
        EXECUTE sql_query USING 
          auth_user.id,
          user_name,
          auth_user.phone,
          auth_user.email,
          user_role,
          'full',
          'active';
        
        synced_count := synced_count + 1;
        
        -- 记录同步的用户信息
        user_info := jsonb_build_object(
          'id', auth_user.id,
          'name', user_name,
          'phone', auth_user.phone,
          'email', auth_user.email,
          'role', user_role
        );
        
        synced_users := synced_users || user_info;
        
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING '同步租户用户 % 失败: %', auth_user.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  -- 返回同步结果
  RETURN jsonb_build_object(
    'success', true,
    'synced_count', synced_count,
    'users', synced_users,
    'tenant_id', p_tenant_id,
    'schema_name', v_schema_name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'synced_count', synced_count
    );
END;
$$;

-- 重新授权
GRANT EXECUTE ON FUNCTION sync_auth_users_to_tenant_profiles(TEXT) TO authenticated;
