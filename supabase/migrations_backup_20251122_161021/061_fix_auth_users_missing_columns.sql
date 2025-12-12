/*
# 修复 auth.users 记录缺少必需列的问题

## 问题
创建 auth.users 记录时，缺少某些必需的列，导致登录时出现错误：
"error finding user: sql: Scan error on column index 3, name "confirmation_token": 
converting NULL to string is unsupported"

## 原因
auth.users 表有很多列，我们在 INSERT 时只指定了部分列
某些列（如 confirmation_token）虽然可以为 NULL，但 Supabase 的查询代码期望它们有默认值

## 解决方案
修改 create_user_auth_account 函数，添加所有必需的列，并设置合适的默认值

## 修改内容
- 添加 confirmation_token（空字符串）
- 添加 recovery_token（空字符串）
- 添加 email_change_token_new（空字符串）
- 添加 email_change（空字符串）
- 确保所有字符串类型的列都有非 NULL 的默认值
*/

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
  
  -- 创建 auth.users 记录，包含所有必需的列
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    created_at,
    updated_at,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmed_at
  ) VALUES (
    target_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    extensions.crypt('123456', extensions.gen_salt('bf')),  -- 默认密码 123456
    now(),
    user_phone,
    CASE WHEN user_phone IS NOT NULL THEN now() ELSE NULL END,
    '',  -- confirmation_token: 空字符串（用户已确认）
    '',  -- recovery_token: 空字符串
    '',  -- email_change_token_new: 空字符串
    '',  -- email_change: 空字符串
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    now()  -- confirmed_at: 用户已确认
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
COMMENT ON FUNCTION create_user_auth_account IS '管理员和超级管理员创建用户认证账号的函数，设置默认密码 123456，包含所有必需的列';
