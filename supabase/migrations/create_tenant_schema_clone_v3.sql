/*
# 租户 Schema 克隆功能 V3 - 简化版

## 功能说明
使用最简单可靠的方法克隆 Schema 结构

## 主要改进
1. 只克隆表结构和数据类型
2. 只克隆主键和唯一约束
3. 不克隆外键、触发器、函数（避免复杂的依赖问题）
4. 不克隆 RLS 策略（避免策略表达式中的 Schema 引用问题）

## 注意事项
1. 第一个租户的 Schema 作为模板
2. 只复制基本结构，不复制数据
3. 复杂功能（外键、触发器等）由应用层代码处理
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS clone_tenant_schema_from_template(TEXT);

-- 创建新的克隆函数（简化版）
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
  v_column_record RECORD;
  v_constraint_record RECORD;
  v_table_count INTEGER := 0;
  v_ddl TEXT;
  v_columns TEXT;
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

  -- 克隆所有表（只包括列定义和基本约束）
  FOR v_table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = v_template_schema
    ORDER BY tablename
  LOOP
    BEGIN
      -- 构建列定义
      SELECT string_agg(
        format('%I %s%s%s',
          column_name,
          CASE 
            WHEN data_type = 'USER-DEFINED' THEN udt_schema || '.' || udt_name
            WHEN data_type = 'character varying' AND character_maximum_length IS NOT NULL 
              THEN 'varchar(' || character_maximum_length || ')'
            WHEN data_type = 'character' AND character_maximum_length IS NOT NULL 
              THEN 'char(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL 
              THEN 'numeric(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
            ELSE data_type
          END,
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
          CASE 
            WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default 
            ELSE '' 
          END
        ),
        ', '
      ) INTO v_columns
      FROM information_schema.columns
      WHERE table_schema = v_template_schema
        AND table_name = v_table_record.tablename
      ORDER BY ordinal_position;

      -- 创建表
      v_ddl := format('CREATE TABLE %I.%I (%s)',
        p_new_schema_name,
        v_table_record.tablename,
        v_columns
      );
      
      EXECUTE v_ddl;
      v_table_count := v_table_count + 1;

      -- 复制主键约束
      FOR v_constraint_record IN
        SELECT
          conname,
          pg_get_constraintdef(oid) as condef
        FROM pg_constraint
        WHERE conrelid = (v_template_schema || '.' || v_table_record.tablename)::regclass
          AND contype = 'p'
      LOOP
        BEGIN
          EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
            p_new_schema_name,
            v_table_record.tablename,
            v_constraint_record.conname,
            v_constraint_record.condef
          );
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING '复制主键约束失败: %', SQLERRM;
        END;
      END LOOP;

      -- 复制唯一约束
      FOR v_constraint_record IN
        SELECT
          conname,
          pg_get_constraintdef(oid) as condef
        FROM pg_constraint
        WHERE conrelid = (v_template_schema || '.' || v_table_record.tablename)::regclass
          AND contype = 'u'
      LOOP
        BEGIN
          EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
            p_new_schema_name,
            v_table_record.tablename,
            v_constraint_record.conname,
            v_constraint_record.condef
          );
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING '复制唯一约束失败: %', SQLERRM;
        END;
      END LOOP;

    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '复制表 % 失败: %', v_table_record.tablename, SQLERRM;
        -- 继续处理下一个表
    END;
  END LOOP;

  -- 返回克隆结果
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Schema 克隆成功（简化版）',
    'template_schema', v_template_schema,
    'new_schema', p_new_schema_name,
    'table_count', v_table_count,
    'note', '只克隆了表结构和基本约束，未克隆外键、触发器、函数和 RLS 策略'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 发生错误时，删除已创建的 Schema
    BEGIN
      EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_new_schema_name);
    EXCEPTION
      WHEN OTHERS THEN
        NULL; -- 忽略删除错误
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', '克隆 Schema 时发生错误: ' || SQLERRM
    );
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION clone_tenant_schema_from_template(TEXT) TO authenticated;

-- 添加注释
COMMENT ON FUNCTION clone_tenant_schema_from_template(TEXT) IS '从模板租户克隆基本的 Schema 结构（不包括数据）- V3 简化版';
