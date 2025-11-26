/*
# 修复平级账号 Schema 创建问题

## 问题
平级账号（peer account）不应该创建独立的 Schema，应该使用主账号的 Schema。

## 解决方案
1. 修改触发器，只为主账号（main_account_id IS NULL）创建 Schema
2. 平级账号（main_account_id IS NOT NULL）不创建 Schema
3. 平级账号使用主账号的 Schema

## 变更
- 更新 auto_create_tenant_schema_on_boss_creation() 函数
- 添加 main_account_id 检查
*/

-- 更新触发器函数：只为主账号创建 Schema
CREATE OR REPLACE FUNCTION auto_create_tenant_schema_on_boss_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_name text;
BEGIN
  -- 只为主账号（main_account_id IS NULL）且角色为 super_admin 的用户创建 Schema
  -- 平级账号（main_account_id IS NOT NULL）不创建 Schema
  IF NEW.role = 'super_admin'::user_role AND NEW.main_account_id IS NULL THEN
    -- 构造 Schema 名称
    schema_name := 'tenant_' || replace(NEW.id::text, '-', '_');
    
    -- 记录日志
    RAISE NOTICE '🔔 检测到新的主账号注册，开始创建租户 Schema';
    RAISE NOTICE '  - 老板ID: %', NEW.id;
    RAISE NOTICE '  - 老板姓名: %', NEW.name;
    RAISE NOTICE '  - Schema名称: %', schema_name;
    
    -- 调用创建 Schema 的函数
    BEGIN
      PERFORM create_tenant_schema(NEW.id::text);
      RAISE NOTICE '✅ 租户 Schema 创建成功: %', schema_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ 租户 Schema 创建失败: %', SQLERRM;
      -- 不阻止用户创建，只记录错误
    END;
  ELSIF NEW.role = 'super_admin'::user_role AND NEW.main_account_id IS NOT NULL THEN
    -- 平级账号，不创建 Schema
    RAISE NOTICE '🔔 检测到平级账号注册，不创建独立 Schema';
    RAISE NOTICE '  - 平级账号ID: %', NEW.id;
    RAISE NOTICE '  - 平级账号姓名: %', NEW.name;
    RAISE NOTICE '  - 主账号ID: %', NEW.main_account_id;
    RAISE NOTICE '  - 将使用主账号的 Schema';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION auto_create_tenant_schema_on_boss_creation() IS '自动为新的主账号创建租户 Schema（排除平级账号）';
