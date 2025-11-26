/*
# 创建删除租户 Schema 的函数

## 目标
为租赁管理员提供删除租户 Schema 的功能，用于彻底删除租户及其所有业务数据。

## 功能
- 删除指定租户的 Schema
- 级联删除 Schema 中的所有表和数据
- 提供安全检查和日志记录

## 使用场景
- 租户合同到期且不再续约
- 租户要求删除所有数据
- 测试租户的清理

## 注意事项
- 此操作不可逆，请谨慎使用
- 建议先停用租户（status = 'inactive'），确认后再删除
- 删除前应该备份重要数据
*/

-- 创建删除租户 Schema 的函数
CREATE OR REPLACE FUNCTION drop_tenant_schema(tenant_boss_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_name text;
  table_count int;
BEGIN
  -- 构造 Schema 名称
  schema_name := 'tenant_' || replace(tenant_boss_id, '-', '_');
  
  -- 记录日志
  RAISE NOTICE '🗑️ 开始删除租户 Schema';
  RAISE NOTICE '  - 租户ID: %', tenant_boss_id;
  RAISE NOTICE '  - Schema名称: %', schema_name;
  
  -- 检查 Schema 是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata
    WHERE schema_name = schema_name
  ) THEN
    RAISE NOTICE '⚠️ 租户 Schema 不存在: %', schema_name;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Schema 不存在',
      'schema_name', schema_name
    );
  END IF;
  
  -- 统计表数量
  SELECT COUNT(*)
  INTO table_count
  FROM information_schema.tables
  WHERE table_schema = schema_name
    AND table_type = 'BASE TABLE';
  
  RAISE NOTICE '  - 表数量: %', table_count;
  
  -- 删除 Schema（CASCADE 会删除所有表和数据）
  BEGIN
    EXECUTE format('DROP SCHEMA %I CASCADE', schema_name);
    RAISE NOTICE '✅ 租户 Schema 已删除: %', schema_name;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Schema 删除成功',
      'schema_name', schema_name,
      'tables_deleted', table_count
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ 删除 Schema 失败: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM,
      'schema_name', schema_name
    );
  END;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION drop_tenant_schema(text) IS '删除指定租户的 Schema 及其所有数据（不可逆操作）';

-- 测试说明
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 删除租户 Schema 函数已创建';
  RAISE NOTICE '========================================';
  RAISE NOTICE '使用方法：';
  RAISE NOTICE '  SELECT drop_tenant_schema(''租户UUID'');';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 警告：';
  RAISE NOTICE '  - 此操作不可逆';
  RAISE NOTICE '  - 会删除租户的所有业务数据';
  RAISE NOTICE '  - 建议先停用租户，确认后再删除';
  RAISE NOTICE '========================================';
END $$;