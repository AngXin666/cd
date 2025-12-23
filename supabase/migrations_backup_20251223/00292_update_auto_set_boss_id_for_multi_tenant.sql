/*
# 更新 boss_id 自动设置触发器以支持多租户系统

## 问题
原触发器使用 `LIMIT 1` 随机选择一个老板，不适用于多租户系统

## 解决方案
1. 触发器作为兜底机制，仅在 boss_id 未设置时触发
2. 尝试从当前会话的用户获取 boss_id
3. 如果当前用户是老板，使用当前用户的 ID
4. 如果当前用户不是老板，使用当前用户的 boss_id

## 变更内容
1. 更新触发器函数逻辑
*/

-- 删除旧的触发器函数
DROP FUNCTION IF EXISTS auto_set_boss_id() CASCADE;

-- 创建新的触发器函数（支持多租户）
CREATE OR REPLACE FUNCTION auto_set_boss_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  current_user_role user_role;
  current_user_boss_id uuid;
BEGIN
  -- 如果是老板（super_admin），不需要设置 boss_id
  IF NEW.role = 'super_admin' THEN
    RAISE NOTICE '✅ 新用户是老板，不设置 boss_id (用户: %, 角色: %)', NEW.name, NEW.role;
    RETURN NEW;
  END IF;

  -- 如果 boss_id 已经设置，不需要修改
  IF NEW.boss_id IS NOT NULL THEN
    RAISE NOTICE '✅ boss_id 已设置，无需修改 (用户: %, boss_id: %)', NEW.name, NEW.boss_id;
    RETURN NEW;
  END IF;

  -- 获取当前会话的用户 ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE WARNING '⚠️ 无法获取当前会话用户，无法自动设置 boss_id (新用户: %, 角色: %)', NEW.name, NEW.role;
    RETURN NEW;
  END IF;

  RAISE NOTICE '🔍 当前会话用户 ID: %', current_user_id;

  -- 查询当前用户的角色和 boss_id
  SELECT role, boss_id INTO current_user_role, current_user_boss_id
  FROM profiles
  WHERE id = current_user_id;

  IF NOT FOUND THEN
    RAISE WARNING '⚠️ 无法找到当前用户的 profile (用户ID: %)', current_user_id;
    RETURN NEW;
  END IF;

  RAISE NOTICE '📋 当前用户信息: 角色=%, boss_id=%', current_user_role, current_user_boss_id;

  -- 根据当前用户的角色确定新用户的 boss_id
  IF current_user_role = 'super_admin' THEN
    -- 如果当前用户是老板，新用户的 boss_id 就是老板的 ID
    NEW.boss_id := current_user_id;
    RAISE NOTICE '✅ 当前用户是老板，设置新用户的 boss_id 为老板 ID: % (新用户: %, 角色: %)', current_user_id, NEW.name, NEW.role;
  ELSIF current_user_boss_id IS NOT NULL THEN
    -- 如果当前用户不是老板，新用户的 boss_id 与当前用户相同
    NEW.boss_id := current_user_boss_id;
    RAISE NOTICE '✅ 当前用户不是老板，设置新用户的 boss_id 与当前用户相同: % (新用户: %, 角色: %)', current_user_boss_id, NEW.name, NEW.role;
  ELSE
    RAISE WARNING '⚠️ 当前用户的 boss_id 为 NULL，无法自动设置新用户的 boss_id (当前用户ID: %, 角色: %, 新用户: %)', current_user_id, current_user_role, NEW.name;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_set_boss_id() IS '自动为新创建的非老板用户设置 boss_id（支持多租户系统）';

-- 重新创建触发器
DROP TRIGGER IF EXISTS trigger_auto_set_boss_id ON profiles;

CREATE TRIGGER trigger_auto_set_boss_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_boss_id();

COMMENT ON TRIGGER trigger_auto_set_boss_id ON profiles IS '在插入新用户时自动设置 boss_id（支持多租户系统）';
