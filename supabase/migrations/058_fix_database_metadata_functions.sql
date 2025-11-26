/*
# 修复数据库元数据函数的权限问题

## 问题描述
以下函数返回数据库结构信息，可能泄露敏感信息：
1. get_database_tables - 获取数据库表列表
2. get_table_columns - 获取表字段列表
3. get_table_constraints - 获取表约束列表

## 风险等级
🟡 中等 - 可能泄露数据库结构信息

## 修复方案
为这些函数添加租赁管理员权限检查，只允许租赁管理员调用

## 影响功能
- ✅ 数据库管理：只有租赁管理员可以查看数据库结构
- ✅ 安全性：防止信息泄露
*/

-- ============================================================================
-- 1. 修复 get_database_tables 函数
-- ============================================================================
CREATE OR REPLACE FUNCTION get_database_tables()
RETURNS TABLE(table_name text, table_schema text, table_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- 🔒 权限检查：只有租赁管理员可以调用此函数
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role IS NULL THEN
    RAISE EXCEPTION '用户未登录或档案不存在';
  END IF;

  IF current_user_role != 'lease_admin' THEN
    RAISE EXCEPTION '权限不足：只有租赁管理员可以查看数据库表列表';
  END IF;

  -- 返回表列表
  RETURN QUERY
  SELECT 
    t.table_name::text,
    t.table_schema::text,
    t.table_type::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
END;
$$;

COMMENT ON FUNCTION get_database_tables IS '获取数据库表列表 - 仅限租赁管理员调用';

-- ============================================================================
-- 2. 修复 get_table_columns 函数
-- ============================================================================
DROP FUNCTION IF EXISTS get_table_columns(text);

CREATE OR REPLACE FUNCTION get_table_columns(p_table_name text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- 🔒 权限检查：只有租赁管理员可以调用此函数
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role IS NULL THEN
    RAISE EXCEPTION '用户未登录或档案不存在';
  END IF;

  IF current_user_role != 'lease_admin' THEN
    RAISE EXCEPTION '权限不足：只有租赁管理员可以查看表字段列表';
  END IF;

  -- ✅ 输入验证
  IF p_table_name IS NULL OR p_table_name = '' THEN
    RAISE EXCEPTION '表名不能为空';
  END IF;

  -- 验证表名格式（防止SQL注入）
  IF p_table_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION '表名格式不正确';
  END IF;

  -- 返回字段列表
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
END;
$$;

COMMENT ON FUNCTION get_table_columns IS '获取表字段列表 - 仅限租赁管理员调用';

-- ============================================================================
-- 3. 修复 get_table_constraints 函数
-- ============================================================================
DROP FUNCTION IF EXISTS get_table_constraints(text);

CREATE OR REPLACE FUNCTION get_table_constraints(p_table_name text)
RETURNS TABLE(
  constraint_name text,
  constraint_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- 🔒 权限检查：只有租赁管理员可以调用此函数
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role IS NULL THEN
    RAISE EXCEPTION '用户未登录或档案不存在';
  END IF;

  IF current_user_role != 'lease_admin' THEN
    RAISE EXCEPTION '权限不足：只有租赁管理员可以查看表约束列表';
  END IF;

  -- ✅ 输入验证
  IF p_table_name IS NULL OR p_table_name = '' THEN
    RAISE EXCEPTION '表名不能为空';
  END IF;

  -- 验证表名格式（防止SQL注入）
  IF p_table_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION '表名格式不正确';
  END IF;

  -- 返回约束列表
  RETURN QUERY
  SELECT 
    tc.constraint_name::text,
    tc.constraint_type::text
  FROM information_schema.table_constraints tc
  WHERE tc.table_schema = 'public'
    AND tc.table_name = p_table_name
  ORDER BY tc.constraint_name;
END;
$$;

COMMENT ON FUNCTION get_table_constraints IS '获取表约束列表 - 仅限租赁管理员调用';
