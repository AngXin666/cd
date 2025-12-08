-- 统一所有测试账号密码为 admin123
-- 
-- 执行此脚本后，所有测试账号（admin, admin1, admin2, admin3, admin4）的密码都将变为：admin123
-- 
-- 使用方法：
-- 1. 在 Supabase Dashboard -> SQL Editor 执行此脚本
-- 2. 或使用命令：supabase db push
--
-- 注意：仅更新测试环境账号，生产环境请勿执行！

-- 启用 pgcrypto 扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 统一密码为 admin123
DO $$
DECLARE
  unified_password text := 'admin123';
  encrypted_pwd text;
  updated_count int := 0;
BEGIN
  -- 生成 bcrypt 加密的密码
  encrypted_pwd := crypt(unified_password, gen_salt('bf'));
  
  RAISE NOTICE '开始统一测试账号密码...';
  RAISE NOTICE '新密码: %', unified_password;
  RAISE NOTICE '----------------------------------------';
  
  -- 更新 auth.users 表中的测试账号密码
  -- admin (老板)
  UPDATE auth.users
  SET encrypted_password = encrypted_pwd,
      updated_at = now()
  WHERE email IN ('admin@fleet.com', 'admin@fleet.local', 'admin')
     OR phone = '13800000000';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✓ 已更新 admin (老板) 密码';
  END IF;
  
  -- admin1 (调度/PEER_ADMIN)
  UPDATE auth.users
  SET encrypted_password = encrypted_pwd,
      updated_at = now()
  WHERE email IN ('admin1@fleet.com', 'admin1@fleet.local', 'admin1')
     OR phone = '13800000001';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✓ 已更新 admin1 (调度) 密码';
  END IF;
  
  -- admin2 (车队长/MANAGER)
  UPDATE auth.users
  SET encrypted_password = encrypted_pwd,
      updated_at = now()
  WHERE email IN ('admin2@fleet.com', 'admin2@fleet.local', 'admin2')
     OR phone = '13800000002';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✓ 已更新 admin2 (车队长) 密码';
  END IF;
  
  -- admin3 (司机)
  UPDATE auth.users
  SET encrypted_password = encrypted_pwd,
      updated_at = now()
  WHERE email IN ('admin3@fleet.com', 'admin3@fleet.local', 'admin3')
     OR phone = '13800000003';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✓ 已更新 admin3 (司机) 密码';
  END IF;
  
  -- admin4 (司机)
  UPDATE auth.users
  SET encrypted_password = encrypted_pwd,
      updated_at = now()
  WHERE email IN ('admin4@fleet.com', 'admin4@fleet.local', 'admin4')
     OR phone = '13800000004';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✓ 已更新 admin4 (司机) 密码';
  END IF;
  
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '密码统一完成！';
  RAISE NOTICE '';
  RAISE NOTICE '测试账号登录信息：';
  RAISE NOTICE '1. admin (老板) - 密码: admin123';
  RAISE NOTICE '2. admin1 (调度) - 密码: admin123';
  RAISE NOTICE '3. admin2 (车队长) - 密码: admin123';
  RAISE NOTICE '4. admin3 (司机) - 密码: admin123';
  RAISE NOTICE '5. admin4 (司机) - 密码: admin123';
  RAISE NOTICE '';
  RAISE NOTICE '提示：可使用手机号或邮箱登录';
  
END $$;

-- 同时更新 create_user_auth_account_first 函数的默认密码为 admin123
CREATE OR REPLACE FUNCTION create_user_auth_account_first(
  user_email text,
  user_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id uuid;
  encrypted_password text;
BEGIN
  -- 生成新的用户ID
  new_user_id := gen_random_uuid();
  
  -- 加密默认密码改为 "admin123"（统一密码）
  encrypted_password := crypt('admin123', gen_salt('bf'));
  
  -- 在 auth.users 表中插入新用户
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    phone,
    encrypted_password,
    email_confirmed_at,
    phone_confirmed_at,
    aud,
    role,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    user_phone,
    encrypted_password,
    now(),
    now(),
    'authenticated',
    'authenticated',
    now(),
    now()
  );
  
  -- 返回成功信息
  RETURN jsonb_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', user_email,
    'phone', user_phone,
    'default_password', 'admin123'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- 返回错误信息
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'details', SQLSTATE
    );
END;
$$;

-- 记录密码统一完成
COMMENT ON FUNCTION create_user_auth_account_first IS '创建用户认证账号，默认密码：admin123';

-- 创建 RPC 函数供前端调用
CREATE OR REPLACE FUNCTION unify_test_passwords()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  unified_password text := 'admin123';
  encrypted_pwd text;
  updated_count int := 0;
  total_updated int := 0;
BEGIN
  -- 生成 bcrypt 加密的密码
  encrypted_pwd := crypt(unified_password, gen_salt('bf'));
  
  -- 更新 admin
  UPDATE auth.users
  SET encrypted_password = encrypted_pwd, updated_at = now()
  WHERE email IN ('admin@fleet.com', 'admin@fleet.local', 'admin')
     OR phone = '13800000000';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  
  -- 更新 admin1
  UPDATE auth.users
  SET encrypted_password = encrypted_pwd, updated_at = now()
  WHERE email IN ('admin1@fleet.com', 'admin1@fleet.local', 'admin1')
     OR phone = '13800000001';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  
  -- 更新 admin2
  UPDATE auth.users
  SET encrypted_password = encrypted_pwd, updated_at = now()
  WHERE email IN ('admin2@fleet.com', 'admin2@fleet.local', 'admin2')
     OR phone = '13800000002';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  
  -- 更新 admin3
  UPDATE auth.users
  SET encrypted_password = encrypted_pwd, updated_at = now()
  WHERE email IN ('admin3@fleet.com', 'admin3@fleet.local', 'admin3')
     OR phone = '13800000003';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  
  -- 更新 admin4
  UPDATE auth.users
  SET encrypted_password = encrypted_pwd, updated_at = now()
  WHERE email IN ('admin4@fleet.com', 'admin4@fleet.local', 'admin4')
     OR phone = '13800000004';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', total_updated,
    'message', '密码统一完成'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'details', SQLSTATE
    );
END;
$$;
