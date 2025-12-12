/*
# 修改 update_user_email 函数 - 使用默认密码 123456

## 修改内容
将临时密码改为固定的默认密码 123456，方便用户首次登录。

## 安全说明
- 默认密码为 123456
- 建议用户首次登录后修改密码
- 管理员应提醒用户修改默认密码
*/

CREATE OR REPLACE FUNCTION update_user_email(
  target_user_id uuid,
  new_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  user_exists boolean;
  user_phone text;
BEGIN
  -- 检查调用者是否为超级管理员
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION '只有超级管理员可以修改用户邮箱';
  END IF;

  -- 检查新邮箱是否已被其他用户使用
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = new_email 
    AND id != target_user_id
  ) THEN
    RAISE EXCEPTION '该邮箱已被其他用户使用';
  END IF;

  -- 检查用户是否在 auth.users 表中存在
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = target_user_id
  ) INTO user_exists;

  IF user_exists THEN
    -- 用户存在，直接更新邮箱
    UPDATE auth.users
    SET 
      email = new_email,
      email_confirmed_at = now(),
      updated_at = now()
    WHERE id = target_user_id;
    
    RAISE NOTICE '✅ 用户邮箱已更新';
  ELSE
    -- 用户不存在，创建新的 auth.users 记录
    -- 从 profiles 表获取用户的手机号
    SELECT phone INTO user_phone
    FROM profiles
    WHERE id = target_user_id;

    -- 插入新的 auth.users 记录，使用默认密码 123456
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
      new_email,
      extensions.crypt('123456', extensions.gen_salt('bf')),  -- 使用默认密码 123456
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
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      updated_at = EXCLUDED.updated_at;
    
    RAISE NOTICE '✅ 用户账号已创建，邮箱: %, 默认密码: 123456', new_email;
  END IF;
END;
$$;
