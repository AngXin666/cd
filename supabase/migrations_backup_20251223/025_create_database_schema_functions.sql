/*
# 创建数据库结构查询函数

## 说明
创建用于查询数据库结构的辅助函数，包括表信息、列信息、约束信息等。

## 函数列表

### 1. get_database_tables()
获取所有表的基本信息。

**返回字段**：
- table_name (text): 表名
- table_schema (text): 模式名
- table_type (text): 表类型

### 2. get_table_columns(table_name_param text)
获取指定表的所有列信息。

**参数**：
- table_name_param: 表名

**返回字段**：
- table_name (text): 表名
- column_name (text): 列名
- data_type (text): 数据类型
- is_nullable (text): 是否可空
- column_default (text): 默认值
- character_maximum_length (int): 字符最大长度
- numeric_precision (int): 数值精度
- numeric_scale (int): 数值小数位数

### 3. get_table_constraints(table_name_param text)
获取指定表的所有约束信息。

**参数**：
- table_name_param: 表名

**返回字段**：
- constraint_name (text): 约束名称
- table_name (text): 表名
- constraint_type (text): 约束类型
- column_name (text): 列名

## 安全策略
- 所有函数使用 SECURITY DEFINER 以管理员权限执行
- 只返回 public 模式的表信息
*/

-- ============================================
-- 函数：获取所有表信息
-- ============================================
CREATE OR REPLACE FUNCTION get_database_tables()
RETURNS TABLE (
  table_name text,
  table_schema text,
  table_type text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    t.table_name::text,
    t.table_schema::text,
    t.table_type::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
$$;

-- ============================================
-- 函数：获取指定表的列信息
-- ============================================
CREATE OR REPLACE FUNCTION get_table_columns(table_name_param text)
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  character_maximum_length int,
  numeric_precision int,
  numeric_scale int
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text,
    c.character_maximum_length::int,
    c.numeric_precision::int,
    c.numeric_scale::int
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = table_name_param
  ORDER BY c.ordinal_position;
$$;

-- ============================================
-- 函数：获取指定表的约束信息
-- ============================================
CREATE OR REPLACE FUNCTION get_table_constraints(table_name_param text)
RETURNS TABLE (
  constraint_name text,
  table_name text,
  constraint_type text,
  column_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    tc.constraint_name::text,
    tc.table_name::text,
    tc.constraint_type::text,
    kcu.column_name::text
  FROM information_schema.table_constraints tc
  LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = table_name_param
  ORDER BY tc.constraint_type, tc.constraint_name;
$$;
