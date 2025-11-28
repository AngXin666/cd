/*
# 实现安全的跨 Schema 访问机制

## 背景
在共享库+独立Schema模式下，需要解决多租户跨Schema访问的安全问题。

## 目标
1. 创建安全代理函数，避免直接使用 auth.uid()
2. 统一权限管理，确保租户数据隔离
3. 实现动态 search_path 配置
4. 启用租户表 RLS 策略

## 实施步骤
1. 创建安全代理函数 current_user_id()
2. 回收 PUBLIC 权限，仅授予 authenticated 角色
3. 更新现有 RLS 策略使用代理函数
4. 创建租户上下文管理函数
*/

-- ============================================
-- 第一步：创建安全代理函数
-- ============================================

-- 创建安全的用户ID获取函数
-- 使用 SECURITY DEFINER 确保函数以定义者权限执行
-- 使用 STABLE 标记函数在同一查询中返回相同结果
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC;

-- 仅授予 authenticated 角色执行权限
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION public.current_user_id() IS '安全代理函数：获取当前认证用户的ID，避免直接使用 auth.uid()';

-- ============================================
-- 第二步：创建租户上下文管理函数
-- ============================================

-- 获取当前用户的租户ID（boss_id）
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  tenant_id_val uuid;
BEGIN
  -- 从 public.profiles 表获取当前用户的租户信息
  SELECT CASE
    -- 如果是超级管理员，返回自己的ID
    WHEN p.role = 'super_admin'::user_role THEN p.id
    -- 如果是老板，返回自己的ID
    WHEN p.role = 'boss'::user_role THEN p.id
    -- 如果是租户内的其他角色，返回 main_account_id
    WHEN p.main_account_id IS NOT NULL THEN p.main_account_id
    -- 其他情况返回 NULL
    ELSE NULL
  END INTO tenant_id_val
  FROM public.profiles p
  WHERE p.id = public.current_user_id();

  RETURN tenant_id_val;
END;
$$;

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC;

-- 仅授予 authenticated 角色执行权限
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION public.current_tenant_id() IS '获取当前用户所属的租户ID（boss_id）';

-- ============================================
-- 第三步：创建动态 search_path 设置函数
-- ============================================

-- 设置当前会话的 search_path 到租户 Schema
CREATE OR REPLACE FUNCTION public.set_tenant_search_path()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_id_val uuid;
  schema_name text;
BEGIN
  -- 获取当前用户的租户ID
  tenant_id_val := public.current_tenant_id();

  -- 如果没有租户ID，使用 public schema
  IF tenant_id_val IS NULL THEN
    EXECUTE 'SET search_path TO public';
    RETURN;
  END IF;

  -- 构造租户 Schema 名称
  schema_name := 'tenant_' || replace(tenant_id_val::text, '-', '_');

  -- 检查 Schema 是否存在
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = schema_name
  ) THEN
    -- 设置 search_path：先查找租户 Schema，再查找 public
    EXECUTE format('SET search_path TO %I, public', schema_name);
  ELSE
    -- Schema 不存在，使用 public
    EXECUTE 'SET search_path TO public';
  END IF;
END;
$$;

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.set_tenant_search_path() FROM PUBLIC;

-- 仅授予 authenticated 角色执行权限
GRANT EXECUTE ON FUNCTION public.set_tenant_search_path() TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION public.set_tenant_search_path() IS '动态设置当前会话的 search_path 到租户 Schema';

-- ============================================
-- 第四步：创建获取当前用户 Profile 的函数
-- ============================================

-- 先删除旧函数
DROP FUNCTION IF EXISTS public.get_current_user_profile();

-- 从正确的 Schema 获取当前用户的 Profile
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
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
-- 第五步：更新 public.profiles 表的 RLS 策略
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
-- 第六步：创建租户 Schema 权限管理函数
-- ============================================

-- 为租户 Schema 中的表启用 RLS
CREATE OR REPLACE FUNCTION public.enable_rls_for_tenant_schema(tenant_boss_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_name text;
  table_record record;
BEGIN
  -- 构造租户 Schema 名称
  schema_name := 'tenant_' || replace(tenant_boss_id::text, '-', '_');

  -- 检查 Schema 是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = schema_name
  ) THEN
    RAISE EXCEPTION 'Schema % does not exist', schema_name;
  END IF;

  -- 为 Schema 中的所有表启用 RLS
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = schema_name
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', schema_name, table_record.tablename);
    
    -- 为每个表创建基本的 RLS 策略
    -- 策略1：租户内的用户可以查看所有数据
    EXECUTE format('
      DROP POLICY IF EXISTS "Tenant users can view all" ON %I.%I;
      CREATE POLICY "Tenant users can view all" ON %I.%I
        FOR SELECT
        USING (
          public.current_tenant_id() = %L::uuid
        );
    ', schema_name, table_record.tablename, schema_name, table_record.tablename, tenant_boss_id);

    -- 策略2：租户内的管理员可以插入数据
    EXECUTE format('
      DROP POLICY IF EXISTS "Tenant admins can insert" ON %I.%I;
      CREATE POLICY "Tenant admins can insert" ON %I.%I
        FOR INSERT
        WITH CHECK (
          public.current_tenant_id() = %L::uuid
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = public.current_user_id()
            AND p.role IN (''boss''::user_role, ''peer_admin''::user_role, ''manager''::user_role)
          )
        );
    ', schema_name, table_record.tablename, schema_name, table_record.tablename, tenant_boss_id);

    -- 策略3：租户内的管理员可以更新数据
    EXECUTE format('
      DROP POLICY IF EXISTS "Tenant admins can update" ON %I.%I;
      CREATE POLICY "Tenant admins can update" ON %I.%I
        FOR UPDATE
        USING (
          public.current_tenant_id() = %L::uuid
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = public.current_user_id()
            AND p.role IN (''boss''::user_role, ''peer_admin''::user_role, ''manager''::user_role)
          )
        );
    ', schema_name, table_record.tablename, schema_name, table_record.tablename, tenant_boss_id);

    -- 策略4：租户内的管理员可以删除数据
    EXECUTE format('
      DROP POLICY IF EXISTS "Tenant admins can delete" ON %I.%I;
      CREATE POLICY "Tenant admins can delete" ON %I.%I
        FOR DELETE
        USING (
          public.current_tenant_id() = %L::uuid
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = public.current_user_id()
            AND p.role IN (''boss''::user_role, ''peer_admin''::user_role)
          )
        );
    ', schema_name, table_record.tablename, schema_name, table_record.tablename, tenant_boss_id);
  END LOOP;
END;
$$;

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.enable_rls_for_tenant_schema(uuid) FROM PUBLIC;

-- 仅授予 postgres 角色执行权限（仅供系统内部使用）
GRANT EXECUTE ON FUNCTION public.enable_rls_for_tenant_schema(uuid) TO postgres;

-- 添加函数注释
COMMENT ON FUNCTION public.enable_rls_for_tenant_schema(uuid) IS '为租户 Schema 中的所有表启用 RLS 并创建基本策略';

-- ============================================
-- 第七步：创建审计日志表
-- ============================================

-- 创建审计日志表，记录跨 Schema 访问
CREATE TABLE IF NOT EXISTS public.cross_schema_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  source_schema text,
  target_schema text,
  operation text,
  table_name text,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- 启用 RLS
ALTER TABLE public.cross_schema_access_logs ENABLE ROW LEVEL SECURITY;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cross_schema_access_logs_user_id ON public.cross_schema_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_schema_access_logs_created_at ON public.cross_schema_access_logs(created_at);

-- 创建策略：只有超级管理员可以查看审计日志
CREATE POLICY "Super admins can view audit logs" ON public.cross_schema_access_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.current_user_id()
      AND p.role = 'super_admin'::user_role
    )
  );

-- 添加表注释
COMMENT ON TABLE public.cross_schema_access_logs IS '跨 Schema 访问审计日志';

-- ============================================
-- 第八步：创建记录审计日志的函数
-- ============================================

-- 记录跨 Schema 访问日志
CREATE OR REPLACE FUNCTION public.log_cross_schema_access(
  p_source_schema text,
  p_target_schema text,
  p_operation text,
  p_table_name text,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.cross_schema_access_logs (
    user_id,
    tenant_id,
    source_schema,
    target_schema,
    operation,
    table_name,
    success,
    error_message
  ) VALUES (
    public.current_user_id(),
    public.current_tenant_id(),
    p_source_schema,
    p_target_schema,
    p_operation,
    p_table_name,
    p_success,
    p_error_message
  );
END;
$$;

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.log_cross_schema_access(text, text, text, text, boolean, text) FROM PUBLIC;

-- 仅授予 authenticated 角色执行权限
GRANT EXECUTE ON FUNCTION public.log_cross_schema_access(text, text, text, text, boolean, text) TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION public.log_cross_schema_access(text, text, text, text, boolean, text) IS '记录跨 Schema 访问审计日志';

-- ============================================
-- 第九步：更新现有的 get_tenant_schema 函数
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

-- ============================================
-- 第十步：创建测试函数
-- ============================================

-- 测试跨 Schema 访问安全性
CREATE OR REPLACE FUNCTION public.test_cross_schema_security()
RETURNS TABLE (
  test_name text,
  result text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_val uuid;
  tenant_id_val uuid;
  schema_name text;
BEGIN
  -- 测试1：验证 current_user_id() 函数
  BEGIN
    user_id_val := public.current_user_id();
    RETURN QUERY SELECT 
      'current_user_id()'::text,
      'PASS'::text,
      format('User ID: %s', user_id_val)::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'current_user_id()'::text,
      'FAIL'::text,
      SQLERRM::text;
  END;

  -- 测试2：验证 current_tenant_id() 函数
  BEGIN
    tenant_id_val := public.current_tenant_id();
    RETURN QUERY SELECT 
      'current_tenant_id()'::text,
      'PASS'::text,
      format('Tenant ID: %s', tenant_id_val)::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'current_tenant_id()'::text,
      'FAIL'::text,
      SQLERRM::text;
  END;

  -- 测试3：验证 get_tenant_schema() 函数
  BEGIN
    schema_name := public.get_tenant_schema();
    RETURN QUERY SELECT 
      'get_tenant_schema()'::text,
      'PASS'::text,
      format('Schema: %s', schema_name)::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'get_tenant_schema()'::text,
      'FAIL'::text,
      SQLERRM::text;
  END;

  -- 测试4：验证 get_current_user_profile() 函数
  BEGIN
    PERFORM * FROM public.get_current_user_profile();
    RETURN QUERY SELECT 
      'get_current_user_profile()'::text,
      'PASS'::text,
      'Profile retrieved successfully'::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'get_current_user_profile()'::text,
      'FAIL'::text,
      SQLERRM::text;
  END;
END;
$$;

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.test_cross_schema_security() FROM PUBLIC;

-- 仅授予 authenticated 角色执行权限
GRANT EXECUTE ON FUNCTION public.test_cross_schema_security() TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION public.test_cross_schema_security() IS '测试跨 Schema 访问安全性';
