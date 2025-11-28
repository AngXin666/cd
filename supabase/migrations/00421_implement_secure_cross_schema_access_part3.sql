/*
# 实现安全的跨 Schema 访问机制 - 第3部分

## 创建审计日志和测试函数
*/

-- ============================================
-- 第一步：创建审计日志表
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
-- 第二步：创建记录审计日志的函数
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
-- 第三步：创建测试函数
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