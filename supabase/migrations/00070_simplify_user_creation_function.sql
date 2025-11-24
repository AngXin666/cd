-- 简化用户创建函数，只设置必需字段
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
  
  -- 在 auth.users 表中插入新用户（只设置必需字段）
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