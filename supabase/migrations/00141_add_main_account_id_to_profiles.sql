/*
# 添加平级账号支持

## 需求
每个老板（super_admin）可以拥有多个平级账号，这些账号共享同一个租户的数据。

## 设计
1. 添加 main_account_id 字段到 profiles 表
2. 主账号的 main_account_id 为 NULL
3. 平级账号的 main_account_id 指向主账号的 ID
4. 平级账号和主账号拥有相同的 tenant_id

## 字段说明
- main_account_id (uuid, nullable): 主账号ID
  - NULL: 表示这是主账号
  - 非NULL: 表示这是平级账号，值为主账号的ID

## 约束
- main_account_id 必须指向一个存在的 profiles 记录
- main_account_id 指向的账号必须是主账号（其 main_account_id 为 NULL）
*/

-- 1. 添加 main_account_id 字段
ALTER TABLE profiles
ADD COLUMN main_account_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. 添加注释
COMMENT ON COLUMN profiles.main_account_id IS '主账号ID，NULL表示这是主账号，非NULL表示这是平级账号';

-- 3. 创建索引以提高查询性能
CREATE INDEX idx_profiles_main_account_id ON profiles(main_account_id);

-- 4. 添加约束：main_account_id 指向的账号必须是主账号
CREATE OR REPLACE FUNCTION check_main_account_is_primary()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  main_account_main_id uuid;
BEGIN
  -- 如果 main_account_id 不为 NULL，检查它指向的账号是否为主账号
  IF NEW.main_account_id IS NOT NULL THEN
    SELECT main_account_id INTO main_account_main_id
    FROM profiles
    WHERE id = NEW.main_account_id;
    
    -- 如果主账号本身也有 main_account_id，说明它不是主账号
    IF main_account_main_id IS NOT NULL THEN
      RAISE EXCEPTION '主账号ID必须指向一个主账号（main_account_id为NULL的账号）';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. 创建触发器
CREATE TRIGGER check_main_account_is_primary_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_main_account_is_primary();

-- 6. 添加辅助函数：获取账号的主账号ID（如果是平级账号）或自己的ID（如果是主账号）
CREATE OR REPLACE FUNCTION get_primary_account_id(account_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  main_id uuid;
BEGIN
  SELECT main_account_id INTO main_id
  FROM profiles
  WHERE id = account_id;
  
  -- 如果是平级账号，返回主账号ID；否则返回自己的ID
  RETURN COALESCE(main_id, account_id);
END;
$$;

-- 7. 添加辅助函数：获取账号的所有平级账号（包括主账号和所有平级账号）
CREATE OR REPLACE FUNCTION get_all_peer_accounts(account_id uuid)
RETURNS TABLE(peer_account_id uuid)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  primary_id uuid;
BEGIN
  -- 获取主账号ID
  primary_id := get_primary_account_id(account_id);
  
  -- 返回主账号和所有平级账号
  RETURN QUERY
  SELECT id FROM profiles
  WHERE id = primary_id OR main_account_id = primary_id;
END;
$$;

-- 8. 验证
DO $$
BEGIN
  RAISE NOTICE '✅ 平级账号功能已添加到 profiles 表';
  RAISE NOTICE '   - main_account_id 字段已创建';
  RAISE NOTICE '   - 约束和触发器已创建';
  RAISE NOTICE '   - 辅助函数已创建';
END $$;
