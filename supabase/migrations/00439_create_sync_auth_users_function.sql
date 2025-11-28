/*
# 创建同步 auth.users 到 profiles 的函数

## 功能说明
为已存在于 auth.users 但没有 profiles 记录的用户创建 profiles 记录。

## 使用场景
1. 数据库中已经存在一些 auth.users 记录
2. 这些用户没有对应的 profiles 记录
3. 需要批量创建 profiles 记录

## 函数说明

### sync_auth_users_to_profiles
- 查询所有 auth.users 中的用户
- 检查哪些用户没有 profiles 记录
- 为这些用户创建 profiles 记录（默认角色为 driver）
- 返回同步结果

### sync_auth_users_to_tenant_profiles
- 为租户同步用户
- 在租户 Schema 中创建 profiles 记录

## 安全性
- 使用 SECURITY DEFINER，允许管理员调用
- 只有 authenticated 用户可以调用
- 验证 schema_name 防止 SQL 注入

## 返回值
- success: 是否成功
- synced_count: 同步的用户数量
- users: 同步的用户列表
- error: 错误信息（如果失败）
*/

-- 1. 为 public Schema 同步用户（中央管理员）
CREATE OR REPLACE FUNCTION sync_auth_users_to_profiles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  auth_user RECORD;
  synced_count INT := 0;
  synced_users jsonb := '[]'::jsonb;
  user_info jsonb;
BEGIN
  -- 遍历所有 auth.users 中的用户
  FOR auth_user IN 
    SELECT u.id, u.email, u.phone, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL  -- 只处理没有 profiles 记录的用户
      AND u.confirmed_at IS NOT NULL  -- 只处理已确认的用户
  LOOP
    -- 提取用户信息
    DECLARE
      user_name TEXT;
      user_role TEXT;
      user_tenant_id TEXT;
    BEGIN
      -- 从 raw_user_meta_data 或 email/phone 提取信息
      user_name := COALESCE(
        auth_user.raw_user_meta_data->>'name',
        auth_user.raw_user_meta_data->>'real_name',
        SPLIT_PART(auth_user.email, '@', 1),
        auth_user.phone,
        '未命名用户'
      );
      
      user_role := COALESCE(
        auth_user.raw_user_meta_data->>'role',
        'driver'  -- 默认角色为司机
      );
      
      user_tenant_id := auth_user.raw_user_meta_data->>'tenant_id';
      
      -- 如果用户有 tenant_id，跳过（应该在租户 Schema 中创建）
      IF user_tenant_id IS NOT NULL THEN
        CONTINUE;
      END IF;
      
      -- 在 public.profiles 中创建记录
      INSERT INTO public.profiles (
        id,
        name,
        phone,
        email,
        role,
        permission_type,
        status,
        created_at
      ) VALUES (
        auth_user.id,
        user_name,
        auth_user.phone,
        auth_user.email,
        user_role::user_role,
        'full',
        'active',
        NOW()
      );
      
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
        -- 记录错误但继续处理其他用户
        RAISE WARNING '同步用户 % 失败: %', auth_user.id, SQLERRM;
    END;
  END LOOP;
  
  -- 返回同步结果
  RETURN jsonb_build_object(
    'success', true,
    'synced_count', synced_count,
    'users', synced_users
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

-- 2. 为租户 Schema 同步用户
CREATE OR REPLACE FUNCTION sync_auth_users_to_tenant_profiles(
  p_tenant_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  schema_name TEXT;
  auth_user RECORD;
  synced_count INT := 0;
  synced_users jsonb := '[]'::jsonb;
  user_info jsonb;
  sql_query TEXT;
BEGIN
  -- 验证租户ID
  IF p_tenant_id IS NULL OR p_tenant_id = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '租户ID不能为空'
    );
  END IF;
  
  -- 构造 schema 名称
  schema_name := 'tenant_' || REPLACE(p_tenant_id, '-', '_');
  
  -- 验证 schema 是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = schema_name
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '租户 Schema 不存在: ' || schema_name
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
      'SELECT 1 FROM %I.profiles WHERE id = $1',
      schema_name
    );
    
    IF NOT EXISTS (EXECUTE sql_query USING auth_user.id) THEN
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
          schema_name
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
    'schema_name', schema_name
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

-- 授权
GRANT EXECUTE ON FUNCTION sync_auth_users_to_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_auth_users_to_tenant_profiles(TEXT) TO authenticated;
