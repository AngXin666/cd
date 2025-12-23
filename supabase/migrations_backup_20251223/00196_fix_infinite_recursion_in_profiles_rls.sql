/*
# 修复 profiles 表 RLS 策略的无限递归问题

## 问题
上一个策略使用了 EXISTS (SELECT FROM profiles) 来检查用户角色，
导致无限递归：查询 profiles → 触发 RLS → 查询 profiles → 触发 RLS → ...

## 解决方案
使用现有的 is_admin() 和 is_super_admin() 函数，这些函数使用 SECURITY DEFINER
可以绕过 RLS 检查，避免递归。

## 策略逻辑
- boss_id 匹配
- AND (用户是管理员 OR 用户查看自己)
*/

-- 删除导致递归的策略
DROP POLICY IF EXISTS "Tenant users visibility" ON profiles;

-- 创建正确的策略：使用 SECURITY DEFINER 函数避免递归
CREATE POLICY "Tenant users can view based on role" ON profiles
  FOR SELECT TO authenticated
  USING (
    boss_id = get_current_user_boss_id()
    AND (
      is_admin(auth.uid()) 
      OR is_super_admin(auth.uid())
      OR id = auth.uid()
    )
  );
