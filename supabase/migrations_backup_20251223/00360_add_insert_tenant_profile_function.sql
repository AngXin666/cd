-- 创建辅助函数：在租户 Schema 中插入 profile
CREATE OR REPLACE FUNCTION public.insert_tenant_profile(
  p_schema_name TEXT,
  p_user_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 在租户 Schema 中插入 profile
  EXECUTE format('
    INSERT INTO %I.profiles (id, name, phone, email, role, status)
    VALUES ($1, $2, $3, $4, $5, $6)
  ', p_schema_name)
  USING p_user_id, p_name, p_phone, p_email, p_role, 'active';
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.insert_tenant_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) IS '在租户 Schema 中插入用户 profile';