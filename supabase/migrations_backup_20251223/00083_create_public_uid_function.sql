/*
# 在 public schema 中创建 uid() 函数别名

## 问题
RLS 策略在执行时可能找不到 auth.uid() 函数，因为 search_path 可能不包含 auth schema。

## 解决方案
在 public schema 中创建一个 uid() 函数，作为 auth.uid() 的别名。
这样策略就可以直接调用 uid() 而不需要指定 schema。
*/

-- 在 public schema 中创建 uid() 函数别名
CREATE OR REPLACE FUNCTION public.uid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT auth.uid();
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.uid() TO authenticated;
