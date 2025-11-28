/*
# 创建向租户 Schema 插入司机的函数

## 问题
- `createDriver` 函数直接向 `public.profiles` 插入数据
- 导致所有租户的司机数据都存储在 public Schema 中
- 多租户数据隔离失效

## 解决方案
创建 RPC 函数，自动获取当前用户的租户 Schema，并在该 Schema 中创建司机：
1. 获取当前用户的租户 Schema
2. 创建 auth.users 记录
3. 在租户 Schema 中创建 profile 记录

## 函数参数
- p_phone: 司机手机号
- p_name: 司机姓名
- p_email: 司机邮箱（可选）
- p_password: 司机密码（可选，默认为手机号后6位）

## 返回值
JSONB 对象：
- success: 是否成功
- user_id: 创建的用户ID
- email: 登录邮箱
- phone: 手机号
- default_password: 默认密码
- error: 错误信息（如果失败）
*/

CREATE OR REPLACE FUNCTION public.create_driver_in_tenant(
  p_phone TEXT,
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_user_id UUID;
  v_login_email TEXT;
  v_default_password TEXT;
  v_auth_result JSONB;
BEGIN
  -- 1. 获取当前用户的租户 Schema
  v_tenant_schema := public.get_tenant_schema();
  
  IF v_tenant_schema IS NULL OR v_tenant_schema = 'public' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '无法获取租户信息'
    );
  END IF;
  
  -- 2. 检查手机号是否已存在（在租户 Schema 中）
  EXECUTE format('
    SELECT COUNT(*) FROM %I.profiles WHERE phone = $1
  ', v_tenant_schema)
  INTO v_user_id
  USING p_phone;
  
  IF v_user_id > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '该手机号已存在'
    );
  END IF;
  
  -- 3. 生成登录邮箱和密码
  v_login_email := COALESCE(p_email, p_phone || '@fleet.local');
  v_default_password := COALESCE(p_password, RIGHT(p_phone, 6));
  
  -- 4. 创建 auth.users 记录
  v_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    phone,
    encrypted_password,
    email_confirmed_at,
    phone_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_login_email,
    p_phone,
    crypt(v_default_password, gen_salt('bf')),
    NOW(),
    NOW(),
    jsonb_build_object(
      'provider', 'phone',
      'providers', ARRAY['phone']
    ),
    jsonb_build_object(
      'name', p_name,
      'phone', p_phone,
      'role', 'driver',
      'schema_name', v_tenant_schema
    ),
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  );
  
  -- 5. 在租户 Schema 中创建 profile
  EXECUTE format('
    INSERT INTO %I.profiles (id, name, phone, email, role, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
  ', v_tenant_schema)
  USING v_user_id, p_name, p_phone, p_email, 'driver', 'active';
  
  -- 6. 返回成功结果
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_login_email,
    'phone', p_phone,
    'default_password', v_default_password
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.create_driver_in_tenant(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 添加注释
COMMENT ON FUNCTION public.create_driver_in_tenant IS '在当前用户的租户 Schema 中创建司机账号';
