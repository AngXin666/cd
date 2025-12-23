/*
# 修复普通管理员插入司机记录的策略

## 问题
策略中使用了 `uid()` 函数，但应该使用 `auth.uid()` 函数。

## 修复
删除旧策略，创建新策略，使用正确的函数调用。
*/

-- 删除旧策略
DROP POLICY IF EXISTS "Managers can insert driver profiles" ON profiles;

-- 创建新策略，使用正确的函数调用
CREATE POLICY "Managers can insert driver profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager(auth.uid()) AND role = 'driver'::user_role
  );
