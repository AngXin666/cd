/*
# 为租户1添加测试用户

## 租户信息
- 租户 ID: 26d10bc2-d13b-44b0-ac9f-dec469cfadc9
- Schema: tenant_test1
- 公司名称: 测试租户1

## 用户信息
1. 平级管理员：
   - 姓名: admin11
   - 手机号: 13900000011
   - 密码: 123456
   - 角色: manager

2. 车队长：
   - 姓名: admin111
   - 手机号: 13900000111
   - 密码: 123456
   - 角色: manager

3. 司机：
   - 姓名: admin1111
   - 手机号: 13900001111
   - 密码: 123456
   - 角色: driver

## 说明
- 在 auth.users 中创建用户（使用 Supabase Auth）
- 在 tenant_test1.profiles 中创建对应的档案
- 设置正确的 tenant_id 和 role
*/

-- 创建临时函数来添加租户用户
CREATE OR REPLACE FUNCTION create_tenant1_test_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tenant_id uuid := '26d10bc2-d13b-44b0-ac9f-dec469cfadc9';
  v_user_id uuid;
  v_created_users jsonb := '[]'::jsonb;
  v_user_info jsonb;
BEGIN
  -- 用户1: 平级管理员 admin11
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
      recovery_token
    ) VALUES (
      gen_random_uuid(),
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
        'tenant_id', v_tenant_id::text
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;
    
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
    
    v_user_info := jsonb_build_object(
      'id', v_user_id,
      'name', 'admin11',
      'phone', '13900000011',
      'role', 'manager'
    );
    v_created_users := v_created_users || v_user_info;
    
    RAISE NOTICE '✅ 创建用户: admin11 (平级管理员)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '❌ 创建用户 admin11 失败: %', SQLERRM;
  END;
  
  -- 用户2: 车队长 admin111
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
      recovery_token
    ) VALUES (
      gen_random_uuid(),
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
        'tenant_id', v_tenant_id::text
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;
    
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
    
    v_user_info := jsonb_build_object(
      'id', v_user_id,
      'name', 'admin111',
      'phone', '13900000111',
      'role', 'manager'
    );
    v_created_users := v_created_users || v_user_info;
    
    RAISE NOTICE '✅ 创建用户: admin111 (车队长)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '❌ 创建用户 admin111 失败: %', SQLERRM;
  END;
  
  -- 用户3: 司机 admin1111
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
      recovery_token
    ) VALUES (
      gen_random_uuid(),
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
        'tenant_id', v_tenant_id::text
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;
    
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
    
    v_user_info := jsonb_build_object(
      'id', v_user_id,
      'name', 'admin1111',
      'phone', '13900001111',
      'role', 'driver'
    );
    v_created_users := v_created_users || v_user_info;
    
    RAISE NOTICE '✅ 创建用户: admin1111 (司机)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '❌ 创建用户 admin1111 失败: %', SQLERRM;
  END;
  
  -- 返回创建结果
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'created_count', jsonb_array_length(v_created_users),
    'users', v_created_users
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- 执行函数创建用户
SELECT create_tenant1_test_users();

-- 删除临时函数
DROP FUNCTION IF EXISTS create_tenant1_test_users();
