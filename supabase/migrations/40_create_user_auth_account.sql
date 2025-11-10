/*
# 创建用户认证账号函数

## 问题
update_user_email 函数要求调用者必须是超级管理员
但是普通管理员也需要创建司机，导致 auth.users 记录创建失败

## 解决方案
创建一个新的函数 create_user_auth_account，允许管理员和超级管理员都可以调用
专门用于创建新用户时创建 auth.users 记录

## 权限要求
- 超级管理员：可以调用
- 普通管理员：可以调用
- 司机：不可以调用

## 功能
- 为指定的用户ID创建 auth.users 记录
- 设置默认密码 123456
- 自动确认邮箱和手机号
*/

-- 创建新函数：create_user_auth_account
CREATE OR REPLACE FUNCTION create_user_auth_account(
  target_user_id uuid,
  user_email text,
  user_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  calling_user_id uuid;
  calling_user_role user_role;
  auth_user_exists boolean;
BEGIN
  -- 获取调用者的用户ID
  calling_user_id := auth.uid();
  
  -- 检查调用者是否已登录
  IF calling_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', '未授权',
      'details', '用户未登录'
    );
  END IF;
  
  -- 检查调用者的角色
  SELECT role INTO calling_user_role
  FROM public.profiles
  WHERE id = calling_user_id;
  
  -- 只有管理员和超级管理员可以创建用户认证账号
  IF calling_user_role NOT IN ('manager', 'super_admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', '权限不足',
      'details', '只有管理员和超级管理员可以创建用户认证账号'
    );
  END IF;
  
  -- 检查目标用户的 auth.users 记录是否已存在
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = target_user_id
  ) INTO auth_user_exists;
  
  IF auth_user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', '用户已存在',
      'details', 'auth.users 记录已存在'
    );
  END IF;
  
  -- 检查邮箱是否已被其他用户使用
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = user_email 
    AND id != target_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', '邮箱已被使用',
      'details', '该邮箱已被其他用户使用'
    );
  END IF;
  
  -- 创建 auth.users 记录
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    created_at,
    updated_at,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
  ) VALUES (
    target_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    extensions.crypt('123456', extensions.gen_salt('bf')),  -- 默认密码 123456
    now(),
    user_phone,
    CASE WHEN user_phone IS NOT NULL THEN now() ELSE NULL END,
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{}',
    false
  );
  
  -- 返回成功结果
  RETURN json_build_object(
    'success', true,
    'message', '用户认证账号创建成功',
    'user_id', target_user_id,
    'email', user_email,
    'default_password', '123456'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', '创建失败',
      'details', SQLERRM
    );
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION create_user_auth_account IS '管理员和超级管理员创建用户认证账号的函数，设置默认密码 123456';
