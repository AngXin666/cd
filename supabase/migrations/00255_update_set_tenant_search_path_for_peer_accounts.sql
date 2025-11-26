/*
# 更新 set_tenant_search_path 函数支持平级账号

## 问题
平级账号应该使用主账号的 Schema，而不是自己的 Schema。

## 解决方案
在 set_tenant_search_path 函数中：
1. 检查当前用户是否是平级账号（main_account_id IS NOT NULL）
2. 如果是平级账号，使用主账号的 ID 构造 Schema 名称
3. 如果是主账号，使用自己的 ID 构造 Schema 名称
*/

-- 更新 set_tenant_search_path 函数，支持平级账号
CREATE OR REPLACE FUNCTION set_tenant_search_path(schema_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_schema text;
  user_role user_role;
  main_acc_id uuid;
  tenant_boss_id uuid;
BEGIN
  -- 如果没有提供 schema_name，自动获取当前用户的租户 Schema
  IF schema_name IS NULL THEN
    -- 获取当前用户的角色和主账号ID
    SELECT role, main_account_id
    INTO user_role, main_acc_id
    FROM profiles
    WHERE id = auth.uid();
    
    -- 只有租户老板（主账号或平级账号）才能使用租户 Schema
    IF user_role != 'super_admin' THEN
      RAISE EXCEPTION '只有租户老板才能访问租户数据';
    END IF;
    
    -- 确定租户 ID
    -- 如果是平级账号（main_account_id IS NOT NULL），使用主账号的 ID
    -- 如果是主账号（main_account_id IS NULL），使用自己的 ID
    IF main_acc_id IS NOT NULL THEN
      tenant_boss_id := main_acc_id;
      RAISE NOTICE '🔔 平级账号登录，使用主账号的 Schema';
      RAISE NOTICE '  - 平级账号ID: %', auth.uid();
      RAISE NOTICE '  - 主账号ID: %', tenant_boss_id;
    ELSE
      tenant_boss_id := auth.uid();
      RAISE NOTICE '🔔 主账号登录，使用自己的 Schema';
      RAISE NOTICE '  - 主账号ID: %', tenant_boss_id;
    END IF;
    
    -- 构造 Schema 名称
    target_schema := 'tenant_' || replace(tenant_boss_id::text, '-', '_');
  ELSE
    target_schema := schema_name;
  END IF;
  
  -- 检查 Schema 是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata
    WHERE schema_name = target_schema
  ) THEN
    RAISE EXCEPTION 'Schema 不存在: %', target_schema;
  END IF;
  
  -- 设置 search_path
  EXECUTE format('SET search_path TO %I, public', target_schema);
  
  RAISE NOTICE '✅ 已切换到租户 Schema: %', target_schema;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION set_tenant_search_path(text) IS '设置当前会话的 search_path 到租户 Schema（支持平级账号）';

-- 测试说明
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ set_tenant_search_path 函数已更新';
  RAISE NOTICE '========================================';
  RAISE NOTICE '功能：';
  RAISE NOTICE '1. 主账号 → 使用自己的 Schema';
  RAISE NOTICE '2. 平级账号 → 使用主账号的 Schema';
  RAISE NOTICE '========================================';
END $$;