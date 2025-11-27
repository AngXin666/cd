/*
# 允许老板账号的 boss_id 为 NULL

## 问题
profiles 表的 boss_id 字段被设置为 NOT NULL，导致老板账号无法将 boss_id 设置为 NULL

## 解决方案
1. 移除 boss_id 的 NOT NULL 约束
2. 将老板账号的 boss_id 设置为 NULL
3. 添加检查约束：只有 super_admin 可以有 NULL 的 boss_id

## 变更内容
1. 修改 boss_id 字段允许 NULL
2. 更新老板账号的 boss_id 为 NULL
3. 添加检查约束
*/

-- ============================================
-- 第一部分：移除 NOT NULL 约束
-- ============================================

ALTER TABLE profiles 
ALTER COLUMN boss_id DROP NOT NULL;

-- ============================================
-- 第二部分：修复老板账号的 boss_id
-- ============================================

-- 将老板账号的 boss_id 设置为 NULL
UPDATE profiles 
SET boss_id = NULL
WHERE role = 'super_admin';

-- ============================================
-- 第三部分：添加检查约束
-- ============================================

-- 删除旧的检查约束（如果存在）
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_boss_id_for_role;

-- 添加新的检查约束：只有 super_admin 可以有 NULL 的 boss_id
ALTER TABLE profiles 
ADD CONSTRAINT check_boss_id_for_role 
CHECK (
  (role = 'super_admin' AND boss_id IS NULL) OR 
  (role != 'super_admin' AND boss_id IS NOT NULL)
);

COMMENT ON CONSTRAINT check_boss_id_for_role ON profiles IS '确保只有 super_admin 的 boss_id 可以为 NULL，其他角色必须有 boss_id';
