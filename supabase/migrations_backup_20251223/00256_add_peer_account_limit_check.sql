/*
# 添加平级账号数量限制

## 需求
一个主账号最多可以创建 3 个平级账号。

## 实现
创建触发器函数，在插入平级账号前检查数量限制。
*/

-- 创建检查平级账号数量的触发器函数
CREATE OR REPLACE FUNCTION check_peer_account_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  peer_count int;
BEGIN
  -- 只检查平级账号（main_account_id IS NOT NULL）
  IF NEW.role = 'super_admin'::user_role AND NEW.main_account_id IS NOT NULL THEN
    -- 统计该主账号已有的平级账号数量
    SELECT COUNT(*)
    INTO peer_count
    FROM profiles
    WHERE main_account_id = NEW.main_account_id
      AND role = 'super_admin'::user_role;
    
    -- 检查是否超过限制（最多3个）
    IF peer_count >= 3 THEN
      RAISE EXCEPTION '一个主账号最多只能创建 3 个平级账号';
    END IF;
    
    RAISE NOTICE '✅ 平级账号数量检查通过（当前: %/3）', peer_count + 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 删除旧的触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_check_peer_account_limit ON profiles;

-- 创建触发器：在插入 profiles 记录前检查平级账号数量
CREATE TRIGGER trigger_check_peer_account_limit
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_peer_account_limit();

-- 添加函数注释
COMMENT ON FUNCTION check_peer_account_limit() IS '检查平级账号数量限制（最多3个）';

-- 测试说明
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 平级账号数量限制已启用';
  RAISE NOTICE '========================================';
  RAISE NOTICE '规则：';
  RAISE NOTICE '- 一个主账号最多可以创建 3 个平级账号';
  RAISE NOTICE '- 超过限制时会抛出异常';
  RAISE NOTICE '========================================';
END $$;