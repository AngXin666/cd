/*
# 修复 profiles 表的 RLS 策略

## 问题
当前的 "Manager can view tenant users" 策略逻辑有误：
- 策略：(boss_id = get_current_user_boss_id()) AND (is_admin(auth.uid()) OR (auth.uid() = id))
- 问题：管理员查看司机时，(auth.uid() = id) 为 false，导致无法查看

## 解决方案
修改策略，使管理员可以查看同租户下的所有用户：
- 新策略：(boss_id = get_current_user_boss_id()) AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
- 普通用户查看自己的策略保持不变

## 修改内容
1. 删除旧的 "Manager can view tenant users" 策略
2. 创建新的策略，允许管理员查看同租户下的所有用户
*/

-- 删除旧的策略
DROP POLICY IF EXISTS "Manager can view tenant users" ON profiles;

-- 创建新的策略：管理员可以查看同租户下的所有用户
CREATE POLICY "Manager can view all tenant users" ON profiles
  FOR SELECT TO authenticated
  USING (
    boss_id = get_current_user_boss_id() 
    AND (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  );

-- 确保普通用户可以查看自己的策略存在
-- 这个策略应该已经存在，但我们确认一下
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (
    boss_id = get_current_user_boss_id() 
    AND id = auth.uid()
  );