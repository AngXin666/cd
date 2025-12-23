/*
# 恢复简单的角色检查函数

## 说明
删除之前添加的异常处理，恢复为简单的角色检查函数。
异常处理只是"掩盖"问题，并没有从根本上解决。
真正的解决方案是使用 current_user_id() 安全代理函数。

## 修改内容
1. 恢复 is_admin() 为简单的查询函数
2. 恢复 is_manager() 为简单的查询函数
3. 恢复 is_driver() 为简单的查询函数

## 核心原则
- 不使用异常处理来掩盖问题
- 依赖 current_user_id() 来解决 auth.uid() 的问题
- 保持函数简单明了

*/

-- ============================================================================
-- 函数 1: 检查用户是否是管理员
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role IN ('super_admin', 'peer_admin')
  );
$$;

COMMENT ON FUNCTION is_admin IS '检查用户是否是管理员';

-- ============================================================================
-- 函数 2: 检查用户是否是车队长
-- ============================================================================
CREATE OR REPLACE FUNCTION is_manager(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = 'manager'
  );
$$;

COMMENT ON FUNCTION is_manager IS '检查用户是否是车队长';

-- ============================================================================
-- 函数 3: 检查用户是否是司机
-- ============================================================================
CREATE OR REPLACE FUNCTION is_driver(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = 'driver'
  );
$$;

COMMENT ON FUNCTION is_driver IS '检查用户是否是司机';
