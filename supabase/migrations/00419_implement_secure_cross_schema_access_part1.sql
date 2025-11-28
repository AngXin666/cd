/*
# 实现安全的跨 Schema 访问机制 - 第1部分

## 创建安全代理函数和租户上下文管理
*/

-- ============================================
-- 第一步：创建安全代理函数
-- ============================================

-- 创建安全的用户ID获取函数
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