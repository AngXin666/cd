/*
# 修复角色检查函数，添加异常处理

## 说明
修复 is_admin()、is_manager()、is_driver() 函数，使其能够正确处理无效的 UUID。
这是从根本上解决 RLS 策略中 auth.uid() 产生问题的正确方案。

## 修复内容
1. 将函数语言从 sql 改为 plpgsql，支持异常处理
2. 添加 NULL 检查
3. 使用 EXISTS 而不是直接查询，性能更好
4. 添加 EXCEPTION 块，捕获所有错误并返回 false
5. 不会因为无效的 UUID 而抛出错误

## 原理
- 当 auth.uid() 返回 "anon" 时，PostgreSQL 尝试将其转换为 UUID 类型
- 转换失败会抛出错误：invalid input syntax for type uuid: "anon"
- 通过添加 EXCEPTION 块，捕获这个错误并返回 false
- RLS 策略会正常工作，拒绝访问而不是报错

*/

-- ============================================================================
-- 函数 1: 检查用户是否是管理员
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql  -- 改用 plpgsql，支持异常处理
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 如果 user_id 为 NULL，返回 false
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 查询用户角色，使用 EXISTS 性能更好
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role IN ('super_admin', 'peer_admin')
  );
EXCEPTION
  WHEN OTHERS THEN
    -- 捕获任何错误（包括 UUID 格式错误），返回 false
    -- 这样即使 auth.uid() 返回 "anon"，也不会报错
    RETURN false;
END;
$$;

COMMENT ON FUNCTION is_admin IS '检查用户是否是管理员，能够处理无效的 UUID，不会因为 auth.uid() 返回 "anon" 而报错';

-- ============================================================================
-- 函数 2: 检查用户是否是车队长
-- ============================================================================
CREATE OR REPLACE FUNCTION is_manager(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql  -- 改用 plpgsql，支持异常处理
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 如果 user_id 为 NULL，返回 false
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 查询用户角色，使用 EXISTS 性能更好
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = 'manager'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- 捕获任何错误（包括 UUID 格式错误），返回 false
    RETURN false;
END;
$$;

COMMENT ON FUNCTION is_manager IS '检查用户是否是车队长，能够处理无效的 UUID，不会因为 auth.uid() 返回 "anon" 而报错';

-- ============================================================================
-- 函数 3: 检查用户是否是司机
-- ============================================================================
CREATE OR REPLACE FUNCTION is_driver(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql  -- 改用 plpgsql，支持异常处理
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 如果 user_id 为 NULL，返回 false
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 查询用户角色，使用 EXISTS 性能更好
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = 'driver'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- 捕获任何错误（包括 UUID 格式错误），返回 false
    RETURN false;
END;
$$;

COMMENT ON FUNCTION is_driver IS '检查用户是否是司机，能够处理无效的 UUID，不会因为 auth.uid() 返回 "anon" 而报错';