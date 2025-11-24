/*
# 创建用户认证账号函数

## 说明
创建一个数据库函数，用于在 auth.users 表中创建新用户记录。
这个函数会先创建 auth.users 记录，然后返回用户ID，供后续创建 profiles 记录使用。

## 函数详情
1. create_user_auth_account_first: 创建 auth.users 记录并返回用户ID
   - 参数: user_email (text), user_phone (text)
   - 返回: JSON 对象包含 success, user_id, email, default_password

## 安全考虑
- 函数使用 SECURITY DEFINER 权限，可以访问 auth schema
- 默认密码为 "123456"
- 用户创建后会自动确认（confirmed_at 设置为当前时间）
*/

-- ============================================
-- 创建用户认证账号函数
-- ============================================

CREATE OR REPLACE FUNCTION create_user_auth_account_first(
  user_email text,
  user_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id uuid;
  encrypted_password text;
BEGIN
  -- 生成新的用户ID
  new_user_id := gen_random_uuid();
  
  -- 加密默认密码 "123456"
  encrypted_password := crypt('123456', gen_salt('bf'));
  
  -- 在 auth.users 表中插入新用户
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    phone,
    encrypted_password,
    email_confirmed_at,
    phone_confirmed_at,
    confirmed_at,
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
    'default_password', '123456'
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
