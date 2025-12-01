/*
# 清理废弃函数

## 说明
删除系统中不再使用的废弃函数，主要包括：
1. 多租户相关函数（系统已改为单租户架构）
2. 测试和调试函数
3. 重复定义的函数
4. 其他废弃函数

## 执行时间
2025-12-01

## 注意事项
- 删除前已确认这些函数不再使用
- 已在测试环境验证
- 建议在执行前备份数据库
*/

-- ============================================
-- 1. 删除多租户相关函数
-- ============================================

-- 租户Schema管理
DROP FUNCTION IF EXISTS create_tenant_schema(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS delete_tenant_schema(text) CASCADE;
DROP FUNCTION IF EXISTS drop_tenant_schema(text) CASCADE;
DROP FUNCTION IF EXISTS clone_tenant_schema_from_template(text, text) CASCADE;
DROP FUNCTION IF EXISTS copy_template_to_new_tenant(text, text) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_schema(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_template_schema_name() CASCADE;
DROP FUNCTION IF EXISTS get_template_tenant_config() CASCADE;
DROP FUNCTION IF EXISTS auto_create_tenant_schema_on_boss_creation() CASCADE;
DROP FUNCTION IF EXISTS add_tenant_foreign_keys(text) CASCADE;
DROP FUNCTION IF EXISTS migrate_tenant_data(text, text) CASCADE;
DROP FUNCTION IF EXISTS cleanup_orphaned_tenant_data() CASCADE;
DROP FUNCTION IF EXISTS delete_tenant_completely(uuid) CASCADE;
DROP FUNCTION IF EXISTS disable_expired_tenants() CASCADE;

-- 租户用户管理
DROP FUNCTION IF EXISTS create_tenant_user(text, text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS update_tenant_user(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_users(text) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_profiles(text) CASCADE;
DROP FUNCTION IF EXISTS get_all_tenant_profiles() CASCADE;
DROP FUNCTION IF EXISTS get_tenant_profile_by_id(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS insert_tenant_profile() CASCADE;
DROP FUNCTION IF EXISTS sync_auth_users_to_tenant_profiles() CASCADE;
DROP FUNCTION IF EXISTS auto_set_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS auto_set_profile_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS get_user_tenant_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS set_current_tenant(uuid) CASCADE;

-- 租户通知
DROP FUNCTION IF EXISTS create_tenant_notification(text, uuid, uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_notifications(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_unread_notification_count(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_tenant_notification_read(text, uuid) CASCADE;

-- 租户仓库
DROP FUNCTION IF EXISTS insert_tenant_warehouse() CASCADE;

-- 租户司机
DROP FUNCTION IF EXISTS create_driver_in_tenant(text, text, text, text, text, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_drivers(text) CASCADE;

-- 租户Schema表
DROP FUNCTION IF EXISTS add_notifications_to_schema(text) CASCADE;
DROP FUNCTION IF EXISTS add_remaining_tables_to_schema(text) CASCADE;

-- 租户搜索路径（保留一个，删除重复的）
-- 注意：这里需要检查哪个是重复的，暂时注释
-- DROP FUNCTION IF EXISTS set_tenant_search_path(text) CASCADE;

-- 跨Schema访问
DROP FUNCTION IF EXISTS log_cross_schema_access(text, text, text, text) CASCADE;

-- ============================================
-- 2. 删除测试和调试函数
-- ============================================

DROP FUNCTION IF EXISTS test_cross_schema_security(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS test_data_isolation(text, text) CASCADE;
DROP FUNCTION IF EXISTS test_driver_query_as_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS generate_driver_query_test_report(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_all_test_accounts() CASCADE;

-- ============================================
-- 3. 删除其他废弃函数
-- ============================================

-- 安全风险函数
DROP FUNCTION IF EXISTS exec_sql(text) CASCADE;

-- 已废弃的角色检查函数
DROP FUNCTION IF EXISTS generate_boss_id() CASCADE;
DROP FUNCTION IF EXISTS is_main_boss(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_boss(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_dispatcher(uuid) CASCADE;

-- 维护函数（可选）
-- DROP FUNCTION IF EXISTS cleanup_orphaned_auth_users() CASCADE;

-- ============================================
-- 4. 验证清理结果
-- ============================================

-- 创建验证函数
CREATE OR REPLACE FUNCTION verify_cleanup_result()
RETURNS TABLE (
  category text,
  function_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    '剩余函数总数'::text AS category,
    COUNT(*)::integer AS function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  
  UNION ALL
  
  SELECT
    '核心业务函数'::text AS category,
    COUNT(*)::integer AS function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'get_current_user_profile',
      'get_current_user_info',
      'get_user_role',
      'get_user_all_roles',
      'user_has_role',
      'is_admin',
      'is_manager',
      'is_driver',
      'get_system_stats',
      'get_user_personal_stats',
      'get_warehouse_stats'
    )
  
  UNION ALL
  
  SELECT
    '已删除的废弃函数'::text AS category,
    COUNT(*)::integer AS function_count
  FROM (
    VALUES
      ('create_tenant_schema'),
      ('delete_tenant_schema'),
      ('test_cross_schema_security'),
      ('exec_sql'),
      ('is_boss')
  ) AS f(function_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = f.function_name
  );
END;
$$;

COMMENT ON FUNCTION verify_cleanup_result IS '验证废弃函数清理结果';

-- ============================================
-- 5. 创建函数清单
-- ============================================

-- 创建当前函数清单
CREATE OR REPLACE FUNCTION get_current_functions_list()
RETURNS TABLE (
  function_name text,
  function_type text,
  return_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    routine_name::text AS function_name,
    routine_type::text AS function_type,
    data_type::text AS return_type
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  ORDER BY routine_name;
END;
$$;

COMMENT ON FUNCTION get_current_functions_list IS '获取当前所有函数清单';