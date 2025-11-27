/*
# 修复计件记录 RLS 策略 - 允许老板创建记录

## 说明
修复 piece_work_records 表的 RLS 策略，允许老板（lease_admin）创建和管理计件记录。

## 变更内容
1. 创建 is_boss 辅助函数来检查用户是否是老板
2. 更新 piece_work_records 表的 RLS 策略，允许老板进行所有操作

## 安全性
- 老板（lease_admin）可以创建、查看、更新、删除计件记录
- 车队长（manager）可以创建、查看、更新、删除计件记录
- 超级管理员（super_admin）可以创建、查看、更新、删除计件记录
- 司机（driver）只能查看自己的计件记录

*/

-- 创建 is_boss 辅助函数
CREATE OR REPLACE FUNCTION is_boss(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role IN ('lease_admin', 'peer_admin') 
  FROM profiles 
  WHERE id = p_user_id;
$$;

-- 添加注释
COMMENT ON FUNCTION is_boss IS '检查用户是否是老板（lease_admin 或 peer_admin）';

-- 删除旧的管理员策略
DROP POLICY IF EXISTS "Admins can manage piece work records" ON piece_work_records;

-- 创建新的管理员策略，包含老板
CREATE POLICY "Admins and bosses can manage piece work records" ON piece_work_records
  FOR ALL 
  TO public
  USING (is_admin(auth.uid()) OR is_manager(auth.uid()) OR is_boss(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()) OR is_boss(auth.uid()));

-- 删除旧的查看策略
DROP POLICY IF EXISTS "Admins can view all piece work records" ON piece_work_records;

-- 创建新的查看策略，包含老板
CREATE POLICY "Admins and bosses can view all piece work records" ON piece_work_records
  FOR SELECT 
  TO public
  USING (is_admin(auth.uid()) OR is_manager(auth.uid()) OR is_boss(auth.uid()));