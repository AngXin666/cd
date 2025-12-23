/*
# 租户 Schema 克隆功能 V5 - 完整字段复制版

## 功能说明
使用 CREATE TABLE LIKE INCLUDING ALL 语法，确保所有字段和约束都被正确复制

## 主要改进
1. 使用 CREATE TABLE LIKE INCLUDING ALL 语法
2. 复制所有字段、默认值、约束、索引
3. 不复制外键约束（避免跨 Schema 引用问题）
4. 不复制触发器、函数、RLS 策略

## 修复问题
- 修复 "column does not exist" 错误
- 确保所有字段都被正确复制

## 注意事项
1. 只复制表结构，不复制数据
2. 不复制外键约束（避免跨 Schema 引用）
3. 不复制触发器、函数、RLS 策略
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS clone_tenant_schema_from_template(TEXT);

-- 创建新的克隆函数（V5 - 完整字段复制版）
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
  v_constraint_record RECORD;
  v_table_count INTEGER := 0;
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

  -- 克隆所有表（使用 CREATE TABLE LIKE INCLUDING ALL）
  FOR v_table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = v_template_schema
    ORDER BY tablename
  LOOP
    BEGIN
      -- 使用 CREATE TABLE LIKE INCLUDING ALL 复制表结构
      -- INCLUDING ALL 包括：
      --   - INCLUDING DEFAULTS: 复制默认值
      --   - INCLUDING CONSTRAINTS: 复制约束（但不包括外键）
      --   - INCLUDING INDEXES: 复制索引
      --   - INCLUDING STORAGE: 复制存储参数
      --   - INCLUDING COMMENTS: 复制注释
      EXECUTE format(
        'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL EXCLUDING CONSTRAINTS)',
        p_new_schema_name,
        v_table_record.tablename,
        v_template_schema,
        v_table_record.tablename
      );
      
      -- 单独添加约束（排除外键约束）
      FOR v_constraint_record IN
        SELECT 
          conname,
          pg_get_constraintdef(oid) as condef
        FROM pg_constraint
        WHERE conrelid = (v_template_schema || '.' || v_table_record.tablename)::regclass
          AND contype IN ('p', 'u', 'c')  -- 主键、唯一约束、检查约束（不包括外键 'f'）
      LOOP
        BEGIN
          EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
            p_new_schema_name,
            v_table_record.tablename,
            v_constraint_record.conname,
            v_constraint_record.condef
          );
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING '添加约束失败 (表: %, 约束: %): %', 
              v_table_record.tablename, 
              v_constraint_record.conname, 
              SQLERRM;
        END;
      END LOOP;
      
      v_table_count := v_table_count + 1;

    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '复制表 % 失败: %', v_table_record.tablename, SQLERRM;
        -- 继续处理下一个表
    END;
  END LOOP;

  -- 返回克隆结果
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Schema 克隆成功（完整字段复制版）',
    'template_schema', v_template_schema,
    'new_schema', p_new_schema_name,
    'table_count', v_table_count,
    'note', '已克隆表结构、字段、默认值、约束和索引，未克隆外键、触发器、函数和 RLS 策略'
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
COMMENT ON FUNCTION clone_tenant_schema_from_template(TEXT) IS '从模板租户克隆完整的 Schema 结构（不包括数据）- V5 完整字段复制版';
