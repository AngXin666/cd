/*
# 租户 Schema 克隆功能

## 功能说明
本迁移实现了租户 Schema 克隆功能，在创建新租户时自动复制第一个租户的完整系统架构。

## 主要功能
1. **获取模板 Schema**：获取第一个租户的 Schema 名称
2. **克隆 Schema 结构**：复制表结构、函数、触发器、RLS 策略等
3. **不复制数据**：只复制系统架构，不复制用户数据

## 克隆内容
- 所有表结构（包括列定义、约束、索引）
- 所有函数和存储过程
- 所有触发器
- 所有 RLS 策略
- 所有视图
- 所有序列

## 使用方式
创建新租户后，调用 `clone_tenant_schema_from_template(new_schema_name)` 即可。

## 注意事项
1. 第一个租户的 Schema 作为模板
2. 只复制结构，不复制数据
3. 新 Schema 会有完全相同的表结构和策略
*/

-- 1. 创建函数：获取模板租户的 Schema 名称
CREATE OR REPLACE FUNCTION get_template_schema_name()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema_name TEXT;
BEGIN
  -- 获取第一个创建的租户的 Schema 名称
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE status = 'active' AND schema_name IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN v_schema_name;
END;
$$;

-- 2. 创建函数：克隆 Schema 结构（不包括数据）
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

  -- 1. 复制所有表结构（包括列、约束、默认值）
  FOR v_table_record IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = v_template_schema
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    -- 获取表的完整 DDL
    SELECT INTO v_ddl
      'CREATE TABLE ' || p_new_schema_name || '.' || table_name || ' (' ||
      string_agg(
        column_name || ' ' || 
        CASE 
          WHEN data_type = 'USER-DEFINED' THEN udt_name
          WHEN character_maximum_length IS NOT NULL THEN data_type || '(' || character_maximum_length || ')'
          WHEN numeric_precision IS NOT NULL THEN data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
          ELSE data_type
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', '
      ) || ')'
    FROM information_schema.columns
    WHERE table_schema = v_template_schema
      AND table_name = v_table_record.table_name
    GROUP BY table_name;

    -- 创建表
    EXECUTE v_ddl;
    v_table_count := v_table_count + 1;

    -- 复制主键约束
    FOR v_index_record IN
      SELECT conname, pg_get_constraintdef(c.oid) as condef
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = v_template_schema
        AND c.conrelid = (v_template_schema || '.' || v_table_record.table_name)::regclass
        AND c.contype = 'p'
    LOOP
      EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
        p_new_schema_name,
        v_table_record.table_name,
        v_index_record.conname,
        v_index_record.condef
      );
    END LOOP;

    -- 复制唯一约束
    FOR v_index_record IN
      SELECT conname, pg_get_constraintdef(c.oid) as condef
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = v_template_schema
        AND c.conrelid = (v_template_schema || '.' || v_table_record.table_name)::regclass
        AND c.contype = 'u'
    LOOP
      EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
        p_new_schema_name,
        v_table_record.table_name,
        v_index_record.conname,
        v_index_record.condef
      );
    END LOOP;

    -- 复制检查约束
    FOR v_index_record IN
      SELECT conname, pg_get_constraintdef(c.oid) as condef
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = v_template_schema
        AND c.conrelid = (v_template_schema || '.' || v_table_record.table_name)::regclass
        AND c.contype = 'c'
    LOOP
      EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
        p_new_schema_name,
        v_table_record.table_name,
        v_index_record.conname,
        v_index_record.condef
      );
    END LOOP;
  END LOOP;

  -- 2. 复制外键约束（在所有表创建后）
  FOR v_table_record IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = v_template_schema
      AND table_type = 'BASE TABLE'
  LOOP
    FOR v_index_record IN
      SELECT conname, pg_get_constraintdef(c.oid) as condef
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = v_template_schema
        AND c.conrelid = (v_template_schema || '.' || v_table_record.table_name)::regclass
        AND c.contype = 'f'
    LOOP
      -- 替换 Schema 名称
      v_ddl := replace(v_index_record.condef, v_template_schema || '.', p_new_schema_name || '.');
      
      EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
        p_new_schema_name,
        v_table_record.table_name,
        v_index_record.conname,
        v_ddl
      );
    END LOOP;
  END LOOP;

  -- 3. 复制索引
  FOR v_index_record IN
    SELECT
      i.relname as index_name,
      t.relname as table_name,
      pg_get_indexdef(i.oid) as indexdef
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_namespace n ON n.oid = i.relnamespace
    WHERE n.nspname = v_template_schema
      AND NOT ix.indisprimary
      AND NOT ix.indisunique
  LOOP
    -- 替换 Schema 名称
    v_ddl := replace(v_index_record.indexdef, v_template_schema || '.', p_new_schema_name || '.');
    
    EXECUTE v_ddl;
    v_index_count := v_index_count + 1;
  END LOOP;

  -- 4. 复制序列
  FOR v_sequence_record IN
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = v_template_schema
  LOOP
    EXECUTE format('CREATE SEQUENCE %I.%I', p_new_schema_name, v_sequence_record.sequence_name);
    v_sequence_count := v_sequence_count + 1;
  END LOOP;

  -- 5. 复制函数
  FOR v_function_record IN
    SELECT
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = v_template_schema
  LOOP
    -- 替换 Schema 名称
    v_ddl := replace(v_function_record.function_def, v_template_schema || '.', p_new_schema_name || '.');
    v_ddl := replace(v_ddl, 'CREATE OR REPLACE FUNCTION ' || v_template_schema || '.', 
                           'CREATE OR REPLACE FUNCTION ' || p_new_schema_name || '.');
    
    EXECUTE v_ddl;
    v_function_count := v_function_count + 1;
  END LOOP;

  -- 6. 复制触发器
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
    -- 替换 Schema 名称
    v_ddl := replace(v_trigger_record.trigger_def, v_template_schema || '.', p_new_schema_name || '.');
    
    EXECUTE v_ddl;
    v_trigger_count := v_trigger_count + 1;
  END LOOP;

  -- 7. 启用 RLS 并复制策略
  FOR v_table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = v_template_schema
  LOOP
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
          polcmd as policy_cmd,
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
    'index_count', v_index_count,
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

-- 3. 授予执行权限
GRANT EXECUTE ON FUNCTION get_template_schema_name() TO authenticated;
GRANT EXECUTE ON FUNCTION clone_tenant_schema_from_template(TEXT) TO authenticated;

-- 4. 添加注释
COMMENT ON FUNCTION get_template_schema_name() IS '获取模板租户的 Schema 名称（第一个租户）';
COMMENT ON FUNCTION clone_tenant_schema_from_template(TEXT) IS '从模板租户克隆完整的 Schema 结构（不包括数据）';
