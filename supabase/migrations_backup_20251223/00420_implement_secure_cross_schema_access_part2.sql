/*
# 实现安全的跨 Schema 访问机制 - 第2部分

## 更新 get_current_user_profile 函数和 RLS 策略
*/

-- ============================================
-- 第一步：更新获取当前用户 Profile 的函数
-- ============================================

-- 先删除旧函数
DROP FUNCTION IF EXISTS public.get_current_user_profile();

-- 从正确的 Schema 获取当前用户的 Profile
CREATE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
  id uuid,
  phone text,
  email text,
  name text,
  role user_role,
  driver_type driver_type,
  main_account_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_id_val uuid;
  tenant_id_val uuid;
  schema_name text;
  query_text text;
BEGIN
  -- 获取当前用户ID
  user_id_val := public.current_user_id();
  
  IF user_id_val IS NULL THEN
    RETURN;
  END IF;

  -- 先尝试从 public.profiles 查询
  RETURN QUERY
  SELECT p.id, p.phone, p.email, p.name, p.role, p.driver_type, p.main_account_id, p.created_at
  FROM public.profiles p
  WHERE p.id = user_id_val;

  -- 如果在 public 中找到了，直接返回
  IF FOUND THEN
    RETURN;
  END IF;

  -- 如果在 public 中没找到，尝试从租户 Schema 查询
  -- 获取租户ID
  SELECT p.main_account_id INTO tenant_id_val
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = user_id_val;

  -- 如果没有租户ID，从 user_metadata 获取
  IF tenant_id_val IS NULL THEN
    SELECT (u.raw_user_meta_data->>'tenant_id')::uuid INTO tenant_id_val
    FROM auth.users u
    WHERE u.id = user_id_val;
  END IF;

  -- 如果还是没有租户ID，返回空
  IF tenant_id_val IS NULL THEN
    RETURN;
  END IF;

  -- 构造租户 Schema 名称
  schema_name := 'tenant_' || replace(tenant_id_val::text, '-', '_');

  -- 检查 Schema 是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = schema_name
  ) THEN
    RETURN;
  END IF;

  -- 从租户 Schema 查询
  query_text := format(
    'SELECT id, phone, email, name, role, driver_type, main_account_id, created_at FROM %I.profiles WHERE id = $1',
    schema_name
  );

  RETURN QUERY EXECUTE query_text USING user_id_val;
END;
$$;

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.get_current_user_profile() FROM PUBLIC;

-- 仅授予 authenticated 角色执行权限
GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION public.get_current_user_profile() IS '从正确的 Schema 获取当前用户的 Profile';

-- ============================================
-- 第二步：更新 public.profiles 表的 RLS 策略
-- ============================================

-- 删除旧的策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;

-- 确保 RLS 已启用
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 创建新的策略，使用安全代理函数

-- 1. 用户可以查看自己的 profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (id = public.current_user_id());

-- 2. 用户可以更新自己的 profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (id = public.current_user_id());

-- 3. 超级管理员可以查看所有 profiles（仅限 public schema 中的）
CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.current_user_id()
      AND p.role = 'super_admin'::user_role
    )
  );

-- 4. 超级管理员可以更新所有 profiles（仅限 public schema 中的）
CREATE POLICY "Super admins can update all profiles" ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.current_user_id()
      AND p.role = 'super_admin'::user_role
    )
  );

-- 5. 超级管理员可以插入 profiles（仅限 public schema 中的）
CREATE POLICY "Super admins can insert profiles" ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.current_user_id()
      AND p.role = 'super_admin'::user_role
    )
  );

-- 6. 超级管理员可以删除 profiles（仅限 public schema 中的）
CREATE POLICY "Super admins can delete profiles" ON public.profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.current_user_id()
      AND p.role = 'super_admin'::user_role
    )
  );

-- ============================================
-- 第三步：更新现有的 get_tenant_schema 函数
-- ============================================

-- 更新 get_tenant_schema 函数，使用安全代理函数
CREATE OR REPLACE FUNCTION public.get_tenant_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  tenant_id_val uuid;
  schema_name text;
BEGIN
  -- 使用安全代理函数获取租户ID
  tenant_id_val := public.current_tenant_id();

  -- 如果找不到租户ID，返回 public
  IF tenant_id_val IS NULL THEN
    RETURN 'public';
  END IF;

  -- 构造 Schema 名称
  schema_name := 'tenant_' || replace(tenant_id_val::text, '-', '_');
  
  RETURN schema_name;
END;
$$;