/*
# 自动为新老板创建租户 Schema

## 目标
当创建新的老板（super_admin）账号时，自动为其创建独立的租户 Schema。

## 实现方式
使用触发器监听 profiles 表的插入操作，当角色为 super_admin 时自动创建 Schema。
*/

-- 创建触发器函数：自动为新老板创建租户 Schema
CREATE OR REPLACE FUNCTION auto_create_tenant_schema_on_boss_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_name text;
BEGIN
  -- 只为老板（super_admin）创建 Schema
  IF NEW.role = 'super_admin'::user_role THEN
    -- 构造 Schema 名称
    schema_name := 'tenant_' || replace(NEW.id::text, '-', '_');
    
    -- 记录日志
    RAISE NOTICE '🔔 检测到新老板注册，开始创建租户 Schema';
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- 删除旧的触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_auto_create_tenant_schema ON profiles;

-- 创建触发器：在插入 profiles 记录后自动创建租户 Schema
CREATE TRIGGER trigger_auto_create_tenant_schema
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_tenant_schema_on_boss_creation();

-- 测试说明
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 自动创建租户 Schema 触发器已启用';
  RAISE NOTICE '========================================';
  RAISE NOTICE '当创建新的老板账号时，系统会自动：';
  RAISE NOTICE '1. 检测到 role = super_admin';
  RAISE NOTICE '2. 为该老板创建独立的租户 Schema';
  RAISE NOTICE '3. 在 Schema 中创建所有业务表';
  RAISE NOTICE '========================================';
  RAISE NOTICE '测试方法：';
  RAISE NOTICE '创建一个新的老板账号，系统会自动创建租户 Schema';
  RAISE NOTICE '========================================';
END $$;