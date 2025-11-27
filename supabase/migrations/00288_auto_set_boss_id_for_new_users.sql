/*
# 自动设置新用户的 boss_id

## 问题
1. 现有的司机、车队长、平级账号的 boss_id 为 NULL
2. 创建新用户时没有自动设置 boss_id

## 解决方案
1. 修复现有数据：将所有非老板用户的 boss_id 设置为老板的 ID
2. 创建触发器：在插入新用户时自动设置 boss_id

## 变更内容
1. 更新现有数据
2. 创建自动设置 boss_id 的触发器函数
3. 创建触发器
*/

-- ============================================
-- 第一部分：修复现有数据
-- ============================================

-- 自动将所有非老板用户的 boss_id 设置为系统中唯一的老板 ID
UPDATE profiles 
SET boss_id = (
  SELECT id 
  FROM profiles 
  WHERE role = 'super_admin' 
  LIMIT 1
)
WHERE role != 'super_admin' AND boss_id IS NULL;

-- ============================================
-- 第二部分：创建触发器函数
-- ============================================

-- 创建自动设置 boss_id 的函数
CREATE OR REPLACE FUNCTION auto_set_boss_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  boss_user_id uuid;
BEGIN
  -- 如果是老板（super_admin），不需要设置 boss_id
  IF NEW.role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- 如果 boss_id 已经设置，不需要修改
  IF NEW.boss_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 查询系统中的老板 ID
  SELECT id INTO boss_user_id
  FROM profiles
  WHERE role = 'super_admin'
  LIMIT 1;

  -- 如果找到老板，设置 boss_id
  IF boss_user_id IS NOT NULL THEN
    NEW.boss_id := boss_user_id;
    RAISE NOTICE '✅ 自动设置 boss_id: % (用户: %, 角色: %)', boss_user_id, NEW.name, NEW.role;
  ELSE
    RAISE WARNING '⚠️ 未找到老板账号，无法自动设置 boss_id (用户: %, 角色: %)', NEW.name, NEW.role;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_set_boss_id() IS '自动为新创建的非老板用户设置 boss_id';

-- ============================================
-- 第三部分：创建触发器
-- ============================================

-- 删除旧的触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_auto_set_boss_id ON profiles;

-- 创建新的触发器
CREATE TRIGGER trigger_auto_set_boss_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_boss_id();

COMMENT ON TRIGGER trigger_auto_set_boss_id ON profiles IS '在插入新用户时自动设置 boss_id';
