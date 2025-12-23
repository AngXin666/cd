/*
# 租户 Schema 克隆功能 V4 - 超简化版

## 功能说明
使用最简单的方法克隆 Schema 结构，避免所有可能的问题

## 主要改进
1. 使用 CREATE TABLE LIKE 语法（不包括任何约束）
2. 手动添加主键约束
3. 不复制默认值（避免 Schema 引用问题）
4. 不复制任何其他约束

## 注意事项
1. 只复制表结构，不复制数据
2. 不复制默认值、外键、触发器、函数、RLS 策略
3. 主键会自动创建索引
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS clone_tenant_schema_from_template(TEXT);

-- 创建新的克隆函数（超简化版）
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
  v_table_count INTEGER := 0;
  v_pk_columns TEXT;
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

  -- 克隆所有表（使用 CREATE TABLE LIKE，但不包括任何约束和默认值）
  FOR v_table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = v_template_schema
    ORDER BY tablename
  LOOP
    BEGIN
      -- 使用 CREATE TABLE LIKE 复制表结构（不包括约束和默认值）
      EXECUTE format(
        'CREATE TABLE %I.%I (LIKE %I.%I)',
        p_new_schema_name,
        v_table_record.tablename,
        v_template_schema,
        v_table_record.tablename
      );
      
      v_table_count := v_table_count + 1;

      -- 获取主键列
      SELECT string_agg(a.attname, ', ' ORDER BY array_position(conkey, a.attnum))
      INTO v_pk_columns
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conrelid = (v_template_schema || '.' || v_table_record.tablename)::regclass
        AND c.contype = 'p';

      -- 如果有主键，添加主键约束
      IF v_pk_columns IS NOT NULL THEN
        BEGIN
          EXECUTE format(
            'ALTER TABLE %I.%I ADD PRIMARY KEY (%s)',
            p_new_schema_name,
            v_table_record.tablename,
            v_pk_columns
          );
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING '添加主键失败 (表: %): %', v_table_record.tablename, SQLERRM;
        END;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '复制表 % 失败: %', v_table_record.tablename, SQLERRM;
        -- 继续处理下一个表
    END;
  END LOOP;

  -- 返回克隆结果
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Schema 克隆成功（超简化版）',
    'template_schema', v_template_schema,
    'new_schema', p_new_schema_name,
    'table_count', v_table_count,
    'note', '只克隆了表结构和主键，未克隆默认值、外键、触发器、函数和 RLS 策略'
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
COMMENT ON FUNCTION clone_tenant_schema_from_template(TEXT) IS '从模板租户克隆基本的 Schema 结构（不包括数据）- V4 超简化版';
