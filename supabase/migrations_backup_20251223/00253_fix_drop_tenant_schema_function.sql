/*
# 修复 drop_tenant_schema 函数的变量名冲突

## 问题
函数中的变量名 schema_name 与 information_schema.schemata 表的列名冲突。

## 解决方案
使用不同的变量名 target_schema_name 避免冲突。
*/

-- 修复删除租户 Schema 的函数
CREATE OR REPLACE FUNCTION drop_tenant_schema(tenant_boss_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_schema_name text;
  table_count int;
BEGIN
  -- 构造 Schema 名称
  target_schema_name := 'tenant_' || replace(tenant_boss_id, '-', '_');
  
  -- 记录日志
  RAISE NOTICE '🗑️ 开始删除租户 Schema';
  RAISE NOTICE '  - 租户ID: %', tenant_boss_id;
  RAISE NOTICE '  - Schema名称: %', target_schema_name;
  
  -- 检查 Schema 是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata
    WHERE schema_name = target_schema_name
  ) THEN
    RAISE NOTICE '⚠️ 租户 Schema 不存在: %', target_schema_name;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Schema 不存在',
      'schema_name', target_schema_name
    );
  END IF;
  
  -- 统计表数量
  SELECT COUNT(*)
  INTO table_count
  FROM information_schema.tables
  WHERE table_schema = target_schema_name
    AND table_type = 'BASE TABLE';
  
  RAISE NOTICE '  - 表数量: %', table_count;
  
  -- 删除 Schema（CASCADE 会删除所有表和数据）
  BEGIN
    EXECUTE format('DROP SCHEMA %I CASCADE', target_schema_name);
    RAISE NOTICE '✅ 租户 Schema 已删除: %', target_schema_name;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Schema 删除成功',
      'schema_name', target_schema_name,
      'tables_deleted', table_count
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ 删除 Schema 失败: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM,
      'schema_name', target_schema_name
    );
  END;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION drop_tenant_schema(text) IS '删除指定租户的 Schema 及其所有数据（不可逆操作）';
