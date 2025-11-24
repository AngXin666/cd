-- 修复 auth.users 表中的 NULL 字符串字段问题
-- 为所有字符串字段设置默认值，避免 NULL 转换错误

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
  
  -- 加密默认密码 "123456"
  encrypted_password := crypt('123456', gen_salt('bf'));
  
  -- 在 auth.users 表中插入新用户
  -- 为所有字符串字段设置默认值 ''，避免 NULL 转换错误
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    phone,
    encrypted_password,
    email_confirmed_at,
    phone_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    aud,
    role,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    user_phone,
    encrypted_password,
    now(),
    now(),
    '',  -- confirmation_token
    '',  -- recovery_token
    '',  -- email_change_token_new
    '',  -- email_change
    '',  -- email_change_token_current
    '',  -- phone_change
    '',  -- phone_change_token
    '',  -- reauthentication_token
    'authenticated',
    'authenticated',
    now(),
    now(),
    false,
    false
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

-- 更新现有用户的 NULL 字符串字段为空字符串
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE 
  confirmation_token IS NULL 
  OR recovery_token IS NULL 
  OR email_change_token_new IS NULL 
  OR email_change IS NULL 
  OR email_change_token_current IS NULL 
  OR phone_change IS NULL 
  OR phone_change_token IS NULL 
  OR reauthentication_token IS NULL;