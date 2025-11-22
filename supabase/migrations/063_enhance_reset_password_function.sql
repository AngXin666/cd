/*
# 增强重置密码功能 - 自动创建缺失的 auth.users 记录

## 问题
当用户在 profiles 表中存在，但在 auth.users 表中不存在时，
reset_user_password_by_admin 函数会返回"用户不存在"错误。

## 解决方案
修改 reset_user_password_by_admin 函数，如果发现 auth.users 记录不存在，
自动调用 create_user_auth_account 函数创建记录，然后再重置密码。

## 修改内容
- 检查 auth.users 记录是否存在
- 如果不存在，从 profiles 表获取用户信息
- 调用 create_user_auth_account 创建 auth.users 记录
- 然后执行密码重置操作
*/

CREATE OR REPLACE FUNCTION reset_user_password_by_admin(
  target_user_id uuid,
  new_password text DEFAULT '123456'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  calling_user_id uuid;
  calling_user_role user_role;
  target_user_exists_in_profiles boolean;
  target_user_exists_in_auth boolean;
  user_phone text;
  user_email text;
  user_login_account text;
  hashed_password text;
  create_result json;
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
  
  -- 只有超级管理员可以重置密码
  IF calling_user_role != 'super_admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', '权限不足',
      'details', '只有超级管理员可以重置密码'
    );
  END IF;
  
  -- 检查目标用户是否在 profiles 表中存在
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = target_user_id
  ) INTO target_user_exists_in_profiles;
  
  IF NOT target_user_exists_in_profiles THEN
    RETURN json_build_object(
      'success', false,
      'error', '用户不存在',
      'details', '在 profiles 表中未找到指定的用户ID'
    );
  END IF;
  
  -- 检查目标用户是否在 auth.users 表中存在
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = target_user_id
  ) INTO target_user_exists_in_auth;
  
  -- 如果 auth.users 记录不存在，自动创建
  IF NOT target_user_exists_in_auth THEN
    RAISE NOTICE '⚠️ auth.users 记录不存在，正在自动创建...';
    
    -- 从 profiles 表获取用户信息
    SELECT phone, email, login_account 
    INTO user_phone, user_email, user_login_account
    FROM public.profiles
    WHERE id = target_user_id;
    
    -- 确定要使用的邮箱
    user_email := COALESCE(
      user_login_account,
      user_email,
      user_phone || '@fleet.com'
    );
    
    -- 调用 create_user_auth_account 创建 auth.users 记录
    SELECT create_user_auth_account(
      target_user_id,
      user_email,
      user_phone
    ) INTO create_result;
    
    -- 检查创建结果
    IF create_result->>'success' = 'false' THEN
      RETURN json_build_object(
        'success', false,
        'error', '创建 auth.users 记录失败',
        'details', create_result->>'details'
      );
    END IF;
    
    RAISE NOTICE '✅ auth.users 记录创建成功';
  END IF;
  
  -- 使用 crypt 函数加密密码
  hashed_password := extensions.crypt(new_password, extensions.gen_salt('bf'));
  
  -- 更新用户密码
  UPDATE auth.users
  SET 
    encrypted_password = hashed_password,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- 返回成功结果
  RETURN json_build_object(
    'success', true,
    'message', '密码已重置为 ' || new_password,
    'auto_created_auth_record', NOT target_user_exists_in_auth
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', '重置密码失败',
      'details', SQLERRM
    );
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION reset_user_password_by_admin IS '超级管理员重置用户密码的函数，如果 auth.users 记录不存在会自动创建';
