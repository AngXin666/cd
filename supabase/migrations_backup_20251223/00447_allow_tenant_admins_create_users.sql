/*
# 允许租户管理员创建用户

## 问题描述
当前 `create_user_auth_account_first` 函数只检查 `public.profiles` 中的角色，
只允许 `super_admin` 和 `boss` 创建用户。

但是，租户系统中的以下角色也应该有权限创建用户：
- boss：老板
- peer：平级账号
- fleet_leader：车队长

这些角色只存在于租户 Schema 中（tenant_xxx.profiles），不在 public.profiles 中。

## 解决方案

修改 `create_user_auth_account_first` 函数，使其能够：
1. 首先检查 public.profiles 中的角色（super_admin, boss）
2. 如果用户不在 public.profiles 中，检查所有租户 Schema 中的角色
3. 允许租户 Schema 中的 boss、peer、fleet_leader 角色创建用户

## 实现逻辑

1. 查询 public.profiles，检查用户角色
2. 如果用户在 public.profiles 中且角色是 super_admin 或 boss，允许创建
3. 如果用户不在 public.profiles 中，查询 public.tenants 获取所有租户
4. 遍历所有租户 Schema，检查用户是否在该租户的 profiles 表中
5. 如果找到用户且角色是 boss、peer 或 fleet_leader，允许创建
6. 否则，拒绝创建

## 注意事项

- 使用动态 SQL 查询租户 Schema
- 使用 SECURITY DEFINER 确保函数有足够的权限
- 添加详细的日志记录，便于调试
*/

-- ============================================================================
-- 修改 create_user_auth_account_first 函数，允许租户管理员创建用户
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
  current_user_id uuid;
  has_permission boolean := false;
  tenant_record record;
  tenant_role text;
  tenant_count int;
BEGIN
  -- 获取当前用户 ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION '用户未登录';
  END IF;

  -- 🔒 权限检查第一步：检查 public.profiles 中的角色
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = current_user_id;

  IF current_user_role IS NOT NULL THEN
    -- 用户在 public.profiles 中，检查角色
    IF current_user_role IN ('super_admin', 'boss') THEN
      has_permission := true;
      RAISE NOTICE '权限检查通过：用户 % 在 public.profiles 中的角色是 %', current_user_id, current_user_role;
    ELSE
      RAISE EXCEPTION '权限不足：public.profiles 中的角色 % 无权创建用户', current_user_role;
    END IF;
  ELSE
    -- 🔒 权限检查第二步：用户不在 public.profiles 中，检查租户 Schema
    RAISE NOTICE '用户 % 不在 public.profiles 中，开始检查租户 Schema', current_user_id;
    
    -- 遍历所有租户 Schema
    FOR tenant_record IN 
      SELECT id, schema_name 
      FROM tenants 
      WHERE schema_name IS NOT NULL
    LOOP
      -- 使用动态 SQL 查询租户 Schema 中的用户角色
      BEGIN
        EXECUTE format(
          'SELECT role FROM %I.profiles WHERE id = $1',
          tenant_record.schema_name
        ) INTO tenant_role USING current_user_id;
        
        IF tenant_role IS NOT NULL THEN
          -- 找到用户，检查角色
          RAISE NOTICE '在租户 Schema % 中找到用户 %，角色是 %', 
            tenant_record.schema_name, current_user_id, tenant_role;
          
          IF tenant_role IN ('boss', 'peer', 'fleet_leader') THEN
            has_permission := true;
            RAISE NOTICE '权限检查通过：租户 Schema % 中的角色 % 有权创建用户', 
              tenant_record.schema_name, tenant_role;
            EXIT; -- 找到有权限的角色，退出循环
          ELSE
            RAISE EXCEPTION '权限不足：租户 Schema % 中的角色 % 无权创建用户', 
              tenant_record.schema_name, tenant_role;
          END IF;
        END IF;
      EXCEPTION
        WHEN undefined_table THEN
          -- 租户 Schema 中没有 profiles 表，跳过
          RAISE NOTICE '租户 Schema % 中没有 profiles 表，跳过', tenant_record.schema_name;
        WHEN OTHERS THEN
          -- 其他错误，记录并跳过
          RAISE NOTICE '查询租户 Schema % 时出错: %', tenant_record.schema_name, SQLERRM;
      END;
    END LOOP;
    
    -- 如果遍历完所有租户 Schema 后仍然没有权限，拒绝创建
    IF NOT has_permission THEN
      RAISE EXCEPTION '权限不足：用户 % 在所有租户 Schema 中都没有创建用户的权限', current_user_id;
    END IF;
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

  -- 检查邮箱或手机号是否已存在
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = user_email OR phone = user_phone;

  IF existing_user_id IS NOT NULL THEN
    -- 检查是否有对应的 profiles 记录（在任何 Schema 中）
    SELECT EXISTS(
      SELECT 1 FROM profiles WHERE id = existing_user_id
    ) INTO has_profile;

    IF NOT has_profile THEN
      -- 检查租户 Schema 中是否有记录
      FOR tenant_record IN 
        SELECT schema_name 
        FROM tenants 
        WHERE schema_name IS NOT NULL
      LOOP
        BEGIN
          EXECUTE format(
            'SELECT EXISTS(SELECT 1 FROM %I.profiles WHERE id = $1)',
            tenant_record.schema_name
          ) INTO has_profile USING existing_user_id;
          
          IF has_profile THEN
            EXIT; -- 找到记录，退出循环
          END IF;
        EXCEPTION
          WHEN undefined_table THEN
            -- 租户 Schema 中没有 profiles 表，跳过
            NULL;
        END;
      END LOOP;
    END IF;

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
  RAISE NOTICE '用户 % 创建了新用户: % (邮箱: %, 手机: %)', 
    current_user_id, new_user_id, user_email, user_phone;

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

COMMENT ON FUNCTION create_user_auth_account_first IS '创建用户认证账号 - 允许超级管理员、老板、平级账号和车队长创建用户';
