/*
# MANAGER策略模板系统测试脚本

## 测试目标
1. 验证MANAGER策略模板已创建
2. 验证权限检查函数正常工作
3. 验证RLS策略正确应用
4. 验证管理函数正常工作

## 执行时间
2025-12-01
*/

-- ============================================
-- 第一部分：验证策略模板
-- ============================================

\echo '=========================================='
\echo '第一部分：MANAGER策略模板'
\echo '=========================================='

\echo ''
\echo '1.1 MANAGER策略模板：'
SELECT 
  strategy_name AS 策略名称,
  strategy_type AS 策略类型,
  description AS 描述,
  select_rule AS 查询权限,
  insert_rule AS 插入权限,
  update_rule AS 更新权限,
  delete_rule AS 删除权限,
  is_active AS 是否激活
FROM permission_strategies
WHERE strategy_name LIKE 'manager%'
ORDER BY strategy_name;

-- ============================================
-- 第二部分：验证权限检查函数
-- ============================================

\echo ''
\echo '=========================================='
\echo '第二部分：权限检查函数'
\echo '=========================================='

\echo ''
\echo '2.1 权限检查函数列表：'
SELECT 
  proname AS 函数名,
  pg_get_function_identity_arguments(oid) AS 参数,
  CASE 
    WHEN provolatile = 'i' THEN 'IMMUTABLE'
    WHEN provolatile = 's' THEN 'STABLE'
    WHEN provolatile = 'v' THEN 'VOLATILE'
  END AS 稳定性,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS 安全模式
FROM pg_proc
WHERE proname IN (
  'manager_has_full_control',
  'manager_is_view_only',
  'is_manager_with_permission',
  'manager_has_warehouse_access'
)
ORDER BY proname;

-- ============================================
-- 第三部分：验证RLS策略
-- ============================================

\echo ''
\echo '=========================================='
\echo '第三部分：users表MANAGER RLS策略'
\echo '=========================================='

\echo ''
\echo '3.1 MANAGER RLS策略：'
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE 
    WHEN qual IS NOT NULL THEN qual
    ELSE '无条件'
  END AS 使用条件,
  CASE 
    WHEN with_check IS NOT NULL THEN with_check
    ELSE '无检查'
  END AS 检查条件
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname LIKE '%MANAGER%'
ORDER BY cmd, policyname;

-- ============================================
-- 第四部分：验证管理函数
-- ============================================

\echo ''
\echo '=========================================='
\echo '第四部分：MANAGER管理函数'
\echo '=========================================='

\echo ''
\echo '4.1 管理函数列表：'
SELECT 
  proname AS 函数名,
  pg_get_function_identity_arguments(oid) AS 参数,
  CASE 
    WHEN provolatile = 'i' THEN 'IMMUTABLE'
    WHEN provolatile = 's' THEN 'STABLE'
    WHEN provolatile = 'v' THEN 'VOLATILE'
  END AS 稳定性
FROM pg_proc
WHERE proname IN (
  'create_manager',
  'update_manager_permission',
  'remove_manager',
  'get_all_managers',
  'get_manager_permission'
)
ORDER BY proname;

-- ============================================
-- 第五部分：统计信息
-- ============================================

\echo ''
\echo '=========================================='
\echo '第五部分：统计信息'
\echo '=========================================='

\echo ''
\echo '5.1 系统统计：'
SELECT 
  'MANAGER策略模板数' AS 项目,
  COUNT(*)::text AS 数量
FROM permission_strategies
WHERE strategy_name LIKE 'manager%'

UNION ALL

SELECT 
  'MANAGER权限检查函数数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_proc
WHERE proname IN (
  'manager_has_full_control',
  'manager_is_view_only',
  'is_manager_with_permission',
  'manager_has_warehouse_access'
)

UNION ALL

SELECT 
  'MANAGER RLS策略数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname LIKE '%MANAGER%'

UNION ALL

SELECT 
  'MANAGER管理函数数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_proc
WHERE proname IN (
  'create_manager',
  'update_manager_permission',
  'remove_manager',
  'get_all_managers',
  'get_manager_permission'
);

\echo ''
\echo '=========================================='
\echo '测试完成！'
\echo '=========================================='
