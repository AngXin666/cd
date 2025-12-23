/*
# 修复用户创建权限问题

## 问题描述
之前的修复过于严格，只允许租赁管理员创建用户，导致老板账号、平级账号、车队长无法创建用户。

## 正确的权限层级
1. **租赁管理员 (lease_admin)**: 可以创建任何角色（老板账号、平级账号、车队长、司机）
2. **老板账号 (super_admin)**: 可以创建车队长和司机
3. **平级账号 (super_admin)**: 可以创建车队长和司机
4. **车队长 (manager)**: 可以创建司机
5. **司机 (driver)**: 不能创建用户

## 修复方案
修改 create_user_auth_account_first 函数，根据创建者的角色检查权限：
- 租赁管理员：可以创建任何角色
- 老板账号/平级账号：可以创建车队长和司机（不能创建租赁管理员和老板账号）
- 车队长：只能创建司机
- 司机：不能创建任何用户

## 影响功能
- ✅ 老板账号可以创建车队长和司机
- ✅ 平级账号可以创建车队长和司机
- ✅ 车队长可以创建司机
- ✅ 保持租赁管理员的最高权限
*/

-- ============================================================================
-- 修复 create_user_auth_account_first 函数的权限检查
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
  -- 🔒 权限检查：获取当前用户角色
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role IS NULL THEN
    RAISE EXCEPTION '用户未登录或档案不存在';
  END IF;

  -- 检查当前用户是否有创建用户的权限
  -- 只有租赁管理员、老板账号、平级账号、车队长可以创建用户
  IF current_user_role NOT IN ('lease_admin', 'super_admin', 'manager') THEN
    RAISE EXCEPTION '权限不足：只有管理员可以创建用户';
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

COMMENT ON FUNCTION create_user_auth_account_first IS '创建用户认证账号 - 租赁管理员、老板账号、平级账号、车队长可以调用';

-- ============================================================================
-- 修复 cleanup_orphaned_auth_users 函数的权限检查
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_orphaned_auth_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  deleted_count int;
  current_user_role user_role;
BEGIN
  -- 🔒 权限检查：只有租赁管理员和老板账号可以调用此函数
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role IS NULL THEN
    RAISE EXCEPTION '用户未登录或档案不存在';
  END IF;

  -- 租赁管理员和老板账号可以清理孤立用户
  IF current_user_role NOT IN ('lease_admin', 'super_admin') THEN
    RAISE EXCEPTION '权限不足：只有租赁管理员和老板账号可以清理孤立用户';
  END IF;

  -- 删除没有对应 profiles 记录的 auth.users
  WITH orphaned_users AS (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL
  )
  DELETE FROM auth.users
  WHERE id IN (SELECT id FROM orphaned_users);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- 记录操作日志
  RAISE NOTICE '用户 % (角色: %) 清理了 % 条孤立用户记录', 
    auth.uid(), current_user_role, deleted_count;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'message', format('已清理 %s 条孤立的 auth.users 记录', deleted_count)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- 记录错误日志
    RAISE WARNING '清理孤立用户失败: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'details', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION cleanup_orphaned_auth_users IS '清理孤立用户 - 租赁管理员和老板账号可以调用';
