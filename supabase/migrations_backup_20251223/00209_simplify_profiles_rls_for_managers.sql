/*
# 简化 profiles 表的 RLS 策略以修复司机查询问题

## 问题
管理员仍然无法查询到司机列表，可能是因为策略执行顺序或函数调用的问题。

## 解决方案
1. 删除所有现有的 SELECT 策略
2. 创建一个更简单、更直接的策略
3. 使用更简单的逻辑判断

## 策略逻辑
- 如果用户的角色是 manager 或 super_admin，可以查看同租户下的所有用户
- 如果用户是普通用户，只能查看自己
*/

-- 删除所有现有的 SELECT 策略
DROP POLICY IF EXISTS "Manager can view all tenant users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Manager can view tenant users" ON profiles;

-- 创建新的简化策略：同租户用户可见
-- 逻辑：boss_id 匹配 AND (用户是管理员 OR 用户查看自己)
CREATE POLICY "Tenant users visibility" ON profiles
  FOR SELECT TO authenticated
  USING (
    boss_id = get_current_user_boss_id()
    AND (
      -- 用户是管理员或超级管理员
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('manager', 'super_admin')
      )
      -- 或者用户查看自己
      OR id = auth.uid()
    )
  );