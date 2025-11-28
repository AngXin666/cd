/*
# 添加获取所有测试账号的函数

## 功能说明
创建一个 SECURITY DEFINER 函数，允许查询所有用户账号信息，用于测试账号管理页面。

## 安全说明
- 使用 SECURITY DEFINER 以数据库所有者权限执行，绕过 RLS 限制
- 仅返回必要的字段：id, name, phone, email, role, company_name
- 按创建时间排序

## 函数定义
- 函数名：get_all_test_accounts
- 返回类型：TABLE
- 权限：SECURITY DEFINER
*/

-- 创建获取所有测试账号的函数
CREATE OR REPLACE FUNCTION get_all_test_accounts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  role TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    name,
    phone,
    email,
    role::TEXT,
    company_name,
    created_at
  FROM profiles
  ORDER BY created_at ASC;
$$;

-- 授予执行权限给认证用户
GRANT EXECUTE ON FUNCTION get_all_test_accounts() TO authenticated;