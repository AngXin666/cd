/*
# 租户 Schema 克隆功能 V2

## 功能说明
使用 PostgreSQL 的 pg_dump 和动态 SQL 来克隆 Schema 结构

## 主要改进
1. 使用更简单可靠的方法
2. 直接复制表结构（CREATE TABLE LIKE）
3. 手动复制函数、触发器、策略

## 注意事项
1. 第一个租户的 Schema 作为模板
2. 只复制结构，不复制数据
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS clone_tenant_schema_from_template(TEXT);

-- 创建新的克隆函数
CREATE OR REPLACE FUNCTION clone_tenant_schema_from_template(
  p_new_schema_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_schema TEXT;
  v_table_record RECORD;
  v_function_record RECORD;
  v_trigger_record RECORD;
  v_policy_record RECORD;
  v_index_record RECORD;
  v_sequence_record RECORD;
  v_table_count INTEGER := 0;
  v_function_count INTEGER := 0;
  v_trigger_count INTEGER := 0;
  v_policy_count INTEGER := 0;
  v_index_count INTEGER := 0;
  v_sequence_count INTEGER := 0;
  v_ddl TEXT;
  v_column_list TEXT;
BEGIN
  -- 获取模板 Schema
  v_template_schema := get_template_schema_name();
  
  IF v_template_schema IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '没有找到模板 Schema'
    );
  END IF;

  -- 检查新 Schema 是否已存在
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = p_new_schema_name) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '目标 Schema 已存在'
    );
  END IF;

  -- 创建新 Schema
  EXECUTE format('CREATE SCHEMA %I', p_new_schema_name);

  -- 1. 复制所有表结构（使用 CREATE TABLE LIKE）
  FOR v_table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = v_template_schema
    ORDER BY tablename
  LOOP
    BEGIN
      -- 使用 CREATE TABLE LIKE 复制表结构（包括默认值、约束等）
      EXECUTE format(
        'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)',
        p_new_schema_name,
        v_table_record.tablename,
        v_template_schema,
        v_table_record.tablename
      );
      
      v_table_count := v_table_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '复制表 % 失败: %', v_table_record.tablename, SQLERRM;
    END;
  END LOOP;

  -- 2. 复制序列
  FOR v_sequence_record IN
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = v_template_schema
  LOOP
    BEGIN
      EXECUTE format('CREATE SEQUENCE %I.%I', p_new_schema_name, v_sequence_record.sequence_name);
      v_sequence_count := v_sequence_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '复制序列 % 失败: %', v_sequence_record.sequence_name, SQLERRM;
    END;
  END LOOP;

  -- 3. 复制函数
  FOR v_function_record IN
    SELECT
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = v_template_schema
  LOOP
    BEGIN
      -- 替换 Schema 名称
      v_ddl := replace(v_function_record.function_def, v_template_schema || '.', p_new_schema_name || '.');
      v_ddl := replace(v_ddl, 'CREATE OR REPLACE FUNCTION ' || v_template_schema || '.', 
                             'CREATE OR REPLACE FUNCTION ' || p_new_schema_name || '.');
      
      EXECUTE v_ddl;
      v_function_count := v_function_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '复制函数 % 失败: %', v_function_record.function_name, SQLERRM;
    END;
  END LOOP;

  -- 4. 复制触发器
  FOR v_trigger_record IN
    SELECT
      t.tgname as trigger_name,
      c.relname as table_name,
      pg_get_triggerdef(t.oid) as trigger_def
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = v_template_schema
      AND NOT t.tgisinternal
  LOOP
    BEGIN
      -- 替换 Schema 名称
      v_ddl := replace(v_trigger_record.trigger_def, ' ON ' || v_template_schema || '.', 
                                                      ' ON ' || p_new_schema_name || '.');
      v_ddl := replace(v_ddl, 'EXECUTE FUNCTION ' || v_template_schema || '.', 
                             'EXECUTE FUNCTION ' || p_new_schema_name || '.');
      
      EXECUTE v_ddl;
      v_trigger_count := v_trigger_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '复制触发器 % 失败: %', v_trigger_record.trigger_name, SQLERRM;
    END;
  END LOOP;

  -- 5. 启用 RLS 并复制策略
  FOR v_table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = v_template_schema
  LOOP
    BEGIN
      -- 检查模板表是否启用了 RLS
      IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_template_schema
          AND c.relname = v_table_record.tablename
          AND c.relrowsecurity = true
      ) THEN
        -- 启用 RLS
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
          p_new_schema_name,
          v_table_record.tablename
        );

        -- 复制策略
        FOR v_policy_record IN
          SELECT
            polname as policy_name,
            CASE polcmd
              WHEN 'r' THEN 'SELECT'
              WHEN 'a' THEN 'INSERT'
              WHEN 'w' THEN 'UPDATE'
              WHEN 'd' THEN 'DELETE'
              WHEN '*' THEN 'ALL'
            END as cmd_name,
            CASE
              WHEN polroles = '{0}'::oid[] THEN 'public'
              ELSE (SELECT string_agg(rolname, ', ') FROM pg_roles WHERE oid = ANY(polroles))
            END as roles,
            pg_get_expr(polqual, polrelid) as using_expr,
            pg_get_expr(polwithcheck, polrelid) as check_expr
          FROM pg_policy pol
          JOIN pg_class c ON c.oid = pol.polrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = v_template_schema
            AND c.relname = v_table_record.tablename
        LOOP
          -- 构建策略 DDL
          v_ddl := format('CREATE POLICY %I ON %I.%I FOR %s TO %s',
            v_policy_record.policy_name,
            p_new_schema_name,
            v_table_record.tablename,
            v_policy_record.cmd_name,
            COALESCE(v_policy_record.roles, 'public')
          );

          IF v_policy_record.using_expr IS NOT NULL THEN
            -- 替换 Schema 名称
            v_ddl := v_ddl || ' USING (' || 
              replace(v_policy_record.using_expr, v_template_schema || '.', p_new_schema_name || '.') || ')';
          END IF;

          IF v_policy_record.check_expr IS NOT NULL THEN
            v_ddl := v_ddl || ' WITH CHECK (' || 
              replace(v_policy_record.check_expr, v_template_schema || '.', p_new_schema_name || '.') || ')';
          END IF;

          EXECUTE v_ddl;
          v_policy_count := v_policy_count + 1;
        END LOOP;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '处理表 % 的 RLS 策略失败: %', v_table_record.tablename, SQLERRM;
    END;
  END LOOP;

  -- 返回克隆结果
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Schema 克隆成功',
    'template_schema', v_template_schema,
    'new_schema', p_new_schema_name,
    'table_count', v_table_count,
    'function_count', v_function_count,
    'trigger_count', v_trigger_count,
    'policy_count', v_policy_count,
    'sequence_count', v_sequence_count
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 发生错误时，删除已创建的 Schema
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_new_schema_name);
    
    RETURN jsonb_build_object(
      'success', false,
      'message', '克隆 Schema 时发生错误: ' || SQLERRM
    );
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION clone_tenant_schema_from_template(TEXT) TO authenticated;

-- 添加注释
COMMENT ON FUNCTION clone_tenant_schema_from_template(TEXT) IS '从模板租户克隆完整的 Schema 结构（不包括数据）- V2 简化版';
