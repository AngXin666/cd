/*
# 修正 create_user_auth_account_first 函数的角色检查

## 问题描述
上一个修复（00445）中使用了错误的角色列表：
- 使用了 'peer_admin'，但正确的角色是 'peer'
- 使用了 'manager'，但正确的角色是 'fleet_leader'
- 包含了租户 Schema 的角色，但这个函数检查的是 public.profiles

## 系统角色定义

### 中央管理系统（public.profiles）
- super_admin：超级管理员
- boss：老板

### 租户系统（tenant_xxx.profiles）
- boss：老板
- peer：平级账号
- fleet_leader：车队长
- driver：司机

## 正确的权限逻辑

`create_user_auth_account_first` 函数：
- 在 public Schema 中定义
- 检查 public.profiles 表中的当前用户角色
- 只有在 public.profiles 中有记录的用户才能调用
- 因此只需要检查：super_admin 和 boss

车队长和平级账号只存在于租户 Schema 中，他们不能直接调用这个函数。
他们创建用户时，会通过租户 Schema 的函数来处理。

## 修复方案
更新权限检查，只允许 super_admin 和 boss 调用此函数。
*/

-- ============================================================================
-- 修正 create_user_auth_account_first 函数的角色检查
-- ============================================================================
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
  hashed_password text;
  existing_user_id uuid;
  has_profile boolean;
  current_user_role user_role;
BEGIN
  -- 🔒 权限检查：获取当前用户角色（从 public.profiles）
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role IS NULL THEN
    RAISE EXCEPTION '用户未登录或档案不存在';
  END IF;

  -- 检查当前用户是否有创建用户的权限
  -- 只允许 super_admin（超级管理员）和 boss（老板）调用此函数
  IF current_user_role NOT IN ('super_admin', 'boss') THEN
    RAISE EXCEPTION '权限不足：只有超级管理员和老板可以创建用户';
  END IF;

  -- ✅ 输入验证
  IF user_email IS NULL OR user_email = '' THEN
    RAISE EXCEPTION '邮箱不能为空';
  END IF;

  IF user_phone IS NULL OR user_phone = '' THEN
    RAISE EXCEPTION '手机号不能为空';
  END IF;

  -- 验证邮箱格式
  IF user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION '邮箱格式不正确';
  END IF;

  -- 验证手机号格式（中国手机号）
  IF user_phone !~ '^1[3-9]\d{9}$' THEN
    RAISE EXCEPTION '手机号格式不正确';
  END IF;

  -- 检查邮箱是否已存在
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = user_email OR phone = user_phone;

  IF existing_user_id IS NOT NULL THEN
    -- 检查是否有对应的 profiles 记录
    SELECT EXISTS(
      SELECT 1 FROM profiles WHERE id = existing_user_id
    ) INTO has_profile;

    IF has_profile THEN
      -- 如果有 profiles 记录，说明用户已完整创建，返回错误
      RETURN jsonb_build_object(
        'success', false,
        'error', 'duplicate_user',
        'details', '用户已存在'
      );
    ELSE
      -- 如果没有 profiles 记录，说明是孤立记录，删除它
      DELETE FROM auth.users WHERE id = existing_user_id;
      RAISE NOTICE '已删除孤立用户记录: %', existing_user_id;
    END IF;
  END IF;

  -- 生成密码哈希（默认密码：123456）
  hashed_password := crypt('123456', gen_salt('bf'));

  -- 创建新用户
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
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
    user_email,
    hashed_password,
    now(),
    user_phone,
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

  -- 记录操作日志
  RAISE NOTICE '用户 % (角色: %) 创建了新用户: % (邮箱: %, 手机: %)', 
    auth.uid(), current_user_role, new_user_id, user_email, user_phone;

  -- 返回成功结果
  RETURN jsonb_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', user_email,
    'phone', user_phone
  );
EXCEPTION
  WHEN OTHERS THEN
    -- 记录错误日志
    RAISE WARNING '创建用户认证账号失败: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'details', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION create_user_auth_account_first IS '创建用户认证账号 - 只有超级管理员和老板可以调用';
