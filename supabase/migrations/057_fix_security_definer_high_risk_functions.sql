/*
# 修复高风险 SECURITY DEFINER 函数的安全漏洞

## 发现的严重安全漏洞

### 1. cleanup_orphaned_auth_users 函数
**问题**: 没有任何权限检查，任何认证用户都可以调用它删除用户
**风险**: 🔴 极高 - 可能导致大量用户数据被删除
**修复**: 添加租赁管理员权限检查

### 2. create_user_auth_account_first 函数
**问题**: 没有任何权限检查，任何认证用户都可以创建新用户
**风险**: 🔴 极高 - 可能导致未授权创建用户
**修复**: 添加租赁管理员权限检查

## 修复方案
为所有高风险函数添加严格的权限检查：
1. 只有租赁管理员可以调用这些函数
2. 添加详细的错误日志
3. 返回明确的权限错误信息

## 影响功能
- ✅ 用户管理：只有租赁管理员可以创建/删除用户
- ✅ 数据清理：只有租赁管理员可以清理孤立用户
- ✅ 安全性：防止未授权操作
*/

-- ============================================================================
-- 1. 修复 cleanup_orphaned_auth_users 函数
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
  -- 🔒 权限检查：只有租赁管理员可以调用此函数
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role IS NULL THEN
    RAISE EXCEPTION '用户未登录或档案不存在';
  END IF;

  IF current_user_role != 'lease_admin' THEN
    RAISE EXCEPTION '权限不足：只有租赁管理员可以清理孤立用户';
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
  RAISE NOTICE '租赁管理员 % 清理了 % 条孤立用户记录', auth.uid(), deleted_count;

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

COMMENT ON FUNCTION cleanup_orphaned_auth_users IS '清理孤立用户 - 仅限租赁管理员调用';

-- ============================================================================
-- 2. 修复 create_user_auth_account_first 函数
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
  -- 🔒 权限检查：只有租赁管理员可以调用此函数
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role IS NULL THEN
    RAISE EXCEPTION '用户未登录或档案不存在';
  END IF;

  IF current_user_role != 'lease_admin' THEN
    RAISE EXCEPTION '权限不足：只有租赁管理员可以创建用户认证账号';
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
  RAISE NOTICE '租赁管理员 % 创建了新用户: % (邮箱: %, 手机: %)', 
    auth.uid(), new_user_id, user_email, user_phone;

  -- 返回成功结果（不返回默认密码，避免泄露）
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

COMMENT ON FUNCTION create_user_auth_account_first IS '创建用户认证账号 - 仅限租赁管理员调用';

-- ============================================================================
-- 3. 检查其他高风险函数是否存在
-- ============================================================================

-- 如果存在 create_user_auth_account 函数，也需要添加权限检查
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'create_user_auth_account'
  ) THEN
    RAISE NOTICE '发现 create_user_auth_account 函数，需要添加权限检查';
  END IF;
END $$;

-- 如果存在 reset_user_password_by_admin 函数，也需要添加权限检查
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'reset_user_password_by_admin'
  ) THEN
    RAISE NOTICE '发现 reset_user_password_by_admin 函数，需要添加权限检查';
  END IF;
END $$;

-- 添加审计日志表（如果不存在）
CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  function_name text NOT NULL,
  parameters jsonb,
  result jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 启用 RLS
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- 只有租赁管理员可以查看审计日志
CREATE POLICY "租赁管理员可以查看审计日志"
ON security_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'lease_admin'::user_role
  )
);

COMMENT ON TABLE security_audit_log IS '安全审计日志 - 记录敏感操作';
