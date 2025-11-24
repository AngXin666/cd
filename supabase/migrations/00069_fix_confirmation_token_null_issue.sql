-- 修复 confirmation_token NULL 问题
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
    aud,
    role,
    created_at,
    updated_at,
    is_sso_user,
    deleted_at
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    user_phone,
    encrypted_password,
    now(),
    now(),
    '',  -- 空字符串而不是 NULL
    '',  -- 空字符串而不是 NULL
    '',  -- 空字符串而不是 NULL
    '',  -- 空字符串而不是 NULL
    'authenticated',
    'authenticated',
    now(),
    now(),
    false,
    NULL
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