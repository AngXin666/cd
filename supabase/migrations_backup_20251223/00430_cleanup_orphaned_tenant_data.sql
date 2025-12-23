/*
# 清理孤立的租户数据

## 问题
- 租户已经在中央管理系统中删除（tenants 表中的记录已删除）
- 但是租户 Schema 和 auth.users 中的数据还存在
- 需要手动清理这些残留数据

## 解决方案
创建 RPC 函数 `cleanup_orphaned_tenant_data`，清理所有孤立的租户数据：
1. 查找所有以 tenant_ 开头的 Schema
2. 对每个 Schema，删除其中所有用户的 auth.users 记录
3. 删除 Schema 本身
4. 返回清理统计信息

## 使用方法
```sql
SELECT * FROM cleanup_orphaned_tenant_data();
```

## 返回值
JSONB 对象：
- success: 是否成功
- message: 操作消息
- deleted_schemas: 删除的 Schema 列表
- deleted_users_count: 删除的用户总数
- details: 详细信息数组
*/

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_tenant_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema_name TEXT;
  v_user_record RECORD;
  v_deleted_users INTEGER := 0;
  v_deleted_schemas TEXT[] := ARRAY[]::TEXT[];
  v_schema_users INTEGER;
  v_details JSONB[] := ARRAY[]::JSONB[];
BEGIN
  -- 遍历所有以 tenant_ 开头的 Schema
  FOR v_schema_name IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  LOOP
    v_schema_users := 0;
    
    -- 检查 Schema 中是否有 profiles 表
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = v_schema_name
        AND table_name = 'profiles'
    ) THEN
      -- 删除该 Schema 中所有用户的 auth.users 记录
      FOR v_user_record IN
        EXECUTE format('SELECT id FROM %I.profiles', v_schema_name)
      LOOP
        DELETE FROM auth.users WHERE id = v_user_record.id;
        v_schema_users := v_schema_users + 1;
        v_deleted_users := v_deleted_users + 1;
      END LOOP;
    END IF;
    
    -- 删除 Schema
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema_name);
    
    -- 记录删除信息
    v_deleted_schemas := array_append(v_deleted_schemas, v_schema_name);
    v_details := array_append(v_details, jsonb_build_object(
      'schema_name', v_schema_name,
      'deleted_users', v_schema_users
    ));
    
    RAISE NOTICE '✅ 已删除 Schema: %, 用户数: %', v_schema_name, v_schema_users;
  END LOOP;
  
  -- 返回清理结果
  RETURN jsonb_build_object(
    'success', true,
    'message', '清理完成',
    'deleted_schemas', v_deleted_schemas,
    'deleted_users_count', v_deleted_users,
    'details', v_details
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', '清理失败',
    'error', SQLERRM,
    'deleted_schemas', v_deleted_schemas,
    'deleted_users_count', v_deleted_users
  );
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_tenant_data() TO authenticated;

-- 添加注释
COMMENT ON FUNCTION public.cleanup_orphaned_tenant_data IS '清理所有孤立的租户数据（Schema 和 auth.users 记录）';

-- 执行清理
SELECT * FROM cleanup_orphaned_tenant_data();
