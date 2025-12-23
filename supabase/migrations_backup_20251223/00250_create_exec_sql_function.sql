/*
# 创建执行 SQL 的辅助函数

用于在应用层动态设置 search_path
*/

-- 执行 SQL 的函数（仅用于设置 search_path）
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只允许 SET search_path 命令
  IF sql LIKE 'SET search_path TO %' THEN
    EXECUTE sql;
  ELSE
    RAISE EXCEPTION '只允许执行 SET search_path 命令';
  END IF;
END;
$$;

-- 更安全的方式：直接提供设置 search_path 的函数
CREATE OR REPLACE FUNCTION set_tenant_search_path()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema text;
BEGIN
  tenant_schema := get_tenant_schema();
  
  IF tenant_schema IS NOT NULL AND tenant_schema != 'public' THEN
    EXECUTE format('SET search_path TO %I, public', tenant_schema);
  END IF;
END;
$$;