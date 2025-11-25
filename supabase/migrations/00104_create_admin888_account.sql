/*
# 创建租赁管理员账号 admin888

使用Supabase内部函数创建新的租赁管理员账号

## 账号信息
- 邮箱：admin888@fleet.com
- 密码：hye19911206
- 角色：lease_admin
*/

-- 使用Supabase的内部函数创建用户
-- 注意：这需要使用auth schema的函数
DO $$
DECLARE
  new_user_id uuid;
  encrypted_password text;
BEGIN
  -- 生成密码哈希（使用crypt函数）
  encrypted_password := crypt('hye19911206', gen_salt('bf'));
  
  -- 插入到auth.users表
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin888@fleet.com',
    encrypted_password,
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;
  
  -- 插入到auth.identities表
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    format('{"sub":"%s","email":"admin888@fleet.com"}', new_user_id)::jsonb,
    'email',
    now(),
    now(),
    now()
  );
  
  RAISE NOTICE '已创建租赁管理员账号，user_id: %', new_user_id;
END $$;