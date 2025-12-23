/*
# 创建安全代理函数 current_user_id()

## 说明
创建安全代理函数 current_user_id()，用于替代直接调用 auth.uid()。
这是解决 RLS 策略中 auth.uid() 问题的正确方案。

## 核心原则
1. 使用 SECURITY DEFINER 确保权限正确
2. 显式指定 Schema 路径 auth.uid()
3. 最小权限原则，仅授予 authenticated 角色

## 优势
- 统一的认证函数，易于维护和审计
- 显式指定 Schema 路径，避免环境差异
- 使用 SECURITY DEFINER 确保权限正确
- 最小权限原则，更加安全

*/

-- ============================================================================
-- 创建安全代理函数
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER  -- 关键：以定义者权限执行，确保权限正确
STABLE  -- 在同一事务中返回相同结果
AS $$
  -- 显式指定 Schema 路径，避免环境差异
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_id IS '安全代理函数，返回当前用户ID，显式指定 Schema 路径，使用 SECURITY DEFINER 确保权限正确';

-- ============================================================================
-- 设置权限：最小权限原则
-- ============================================================================

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC;

-- 仅授予 authenticated 角色执行权限
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;