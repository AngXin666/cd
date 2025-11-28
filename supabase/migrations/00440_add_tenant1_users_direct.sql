/*
# 为租户1直接添加用户

## 用户信息
1. 平级管理员: admin11 / 13900000011 / 123456 / manager
2. 车队长: admin111 / 13900000111 / 123456 / manager
3. 司机: admin1111 / 13900001111 / 123456 / driver

## 租户信息
- tenant_id: 26d10bc2-d13b-44b0-ac9f-dec469cfadc9
- schema: tenant_test1
*/

-- 用户1: 平级管理员 admin11
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_tenant_id text := '26d10bc2-d13b-44b0-ac9f-dec469cfadc9';
BEGIN
  -- 创建 auth.users 记录
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
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    aud,
    role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    '13900000011@fleet.com',
    '13900000011',
    crypt('123456', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider":"phone","providers":["phone"]}'::jsonb,
    jsonb_build_object(
      'name', 'admin11',
      'role', 'manager',
      'tenant_id', v_tenant_id
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  );
  
  -- 在 tenant_test1.profiles 中创建档案
  INSERT INTO tenant_test1.profiles (
    id,
    name,
    phone,
    email,
    role,
    permission_type,
    status,
    created_at
  ) VALUES (
    v_user_id,
    'admin11',
    '13900000011',
    '13900000011@fleet.com',
    'manager',
    'full',
    'active',
    NOW()
  );
  
  RAISE NOTICE '✅ 创建用户: admin11 (平级管理员) - ID: %', v_user_id;
END $$;

-- 用户2: 车队长 admin111
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_tenant_id text := '26d10bc2-d13b-44b0-ac9f-dec469cfadc9';
BEGIN
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
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    aud,
    role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    '13900000111@fleet.com',
    '13900000111',
    crypt('123456', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider":"phone","providers":["phone"]}'::jsonb,
    jsonb_build_object(
      'name', 'admin111',
      'role', 'manager',
      'tenant_id', v_tenant_id
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  );
  
  INSERT INTO tenant_test1.profiles (
    id,
    name,
    phone,
    email,
    role,
    permission_type,
    status,
    created_at
  ) VALUES (
    v_user_id,
    'admin111',
    '13900000111',
    '13900000111@fleet.com',
    'manager',
    'full',
    'active',
    NOW()
  );
  
  RAISE NOTICE '✅ 创建用户: admin111 (车队长) - ID: %', v_user_id;
END $$;

-- 用户3: 司机 admin1111
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_tenant_id text := '26d10bc2-d13b-44b0-ac9f-dec469cfadc9';
BEGIN
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
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    aud,
    role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    '13900001111@fleet.com',
    '13900001111',
    crypt('123456', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider":"phone","providers":["phone"]}'::jsonb,
    jsonb_build_object(
      'name', 'admin1111',
      'role', 'driver',
      'tenant_id', v_tenant_id
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  );
  
  INSERT INTO tenant_test1.profiles (
    id,
    name,
    phone,
    email,
    role,
    permission_type,
    status,
    created_at
  ) VALUES (
    v_user_id,
    'admin1111',
    '13900001111',
    '13900001111@fleet.com',
    'driver',
    'full',
    'active',
    NOW()
  );
  
  RAISE NOTICE '✅ 创建用户: admin1111 (司机) - ID: %', v_user_id;
END $$;
