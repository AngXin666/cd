/*
# BOSS权限分离测试脚本

## 测试目标
1. 验证is_boss()函数已创建
2. 验证is_admin()函数已修改
3. 验证BOSS独立RLS策略已创建
4. 验证boss_full_access策略模板已删除
5. 验证权限管理函数已更新

## 执行时间
2025-12-01
*/

-- ============================================
-- 第一部分：验证权限检查函数
-- ============================================

\echo '=========================================='
\echo '第一部分：权限检查函数'
\echo '=========================================='

\echo ''
\echo '1.1 is_boss()函数：'
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
WHERE proname = 'is_boss';

\echo ''
\echo '1.2 is_admin()函数（应该只检查PEER_ADMIN）：'
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
WHERE proname = 'is_admin';

-- ============================================
-- 第二部分：验证users表RLS策略
-- ============================================

\echo ''
\echo '=========================================='
\echo '第二部分：users表RLS策略'
\echo '=========================================='

\echo ''
\echo '2.1 BOSS独立策略：'
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE 
    WHEN qual IS NOT NULL THEN qual
    ELSE '无条件'
  END AS 使用条件
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname LIKE 'BOSS%'
ORDER BY cmd, policyname;

\echo ''
\echo '2.2 PEER_ADMIN策略：'
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE 
    WHEN qual IS NOT NULL THEN qual
    ELSE '无条件'
  END AS 使用条件
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname LIKE 'PEER_ADMIN%'
ORDER BY cmd, policyname;

\echo ''
\echo '2.3 旧的"管理员"策略（应该已删除）：'
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname LIKE '管理员%';

-- ============================================
-- 第三部分：验证策略模板
-- ============================================

\echo ''
\echo '=========================================='
\echo '第三部分：策略模板'
\echo '=========================================='

\echo ''
\echo '3.1 boss_full_access策略模板（应该已删除）：'
SELECT 
  strategy_name AS 策略名称,
  strategy_type AS 策略类型,
  description AS 描述
FROM permission_strategies
WHERE strategy_name = 'boss_full_access';

\echo ''
\echo '3.2 所有策略模板：'
SELECT 
  strategy_name AS 策略名称,
  strategy_type AS 策略类型,
  description AS 描述,
  is_active AS 是否激活
FROM permission_strategies
ORDER BY strategy_name;

-- ============================================
-- 第四部分：验证权限管理函数
-- ============================================

\echo ''
\echo '=========================================='
\echo '第四部分：权限管理函数'
\echo '=========================================='

\echo ''
\echo '4.1 PEER_ADMIN管理函数：'
SELECT 
  proname AS 函数名,
  pg_get_function_identity_arguments(oid) AS 参数
FROM pg_proc
WHERE proname IN (
  'create_peer_admin',
  'update_peer_admin_permission',
  'remove_peer_admin',
  'get_all_peer_admins'
)
ORDER BY proname;

\echo ''
\echo '4.2 MANAGER管理函数：'
SELECT 
  proname AS 函数名,
  pg_get_function_identity_arguments(oid) AS 参数
FROM pg_proc
WHERE proname IN (
  'create_manager',
  'update_manager_permission',
  'remove_manager',
  'get_all_managers'
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
  '权限检查函数数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_proc
WHERE proname IN ('is_boss', 'is_admin')

UNION ALL

SELECT 
  'BOSS RLS策略数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname LIKE 'BOSS%'

UNION ALL

SELECT 
  'PEER_ADMIN RLS策略数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname LIKE 'PEER_ADMIN%'

UNION ALL

SELECT 
  'MANAGER RLS策略数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname LIKE 'MANAGER%'

UNION ALL

SELECT 
  '策略模板数' AS 项目,
  COUNT(*)::text AS 数量
FROM permission_strategies

UNION ALL

SELECT 
  'PEER_ADMIN管理函数数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_proc
WHERE proname IN (
  'create_peer_admin',
  'update_peer_admin_permission',
  'remove_peer_admin',
  'get_all_peer_admins'
)

UNION ALL

SELECT 
  'MANAGER管理函数数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_proc
WHERE proname IN (
  'create_manager',
  'update_manager_permission',
  'remove_manager',
  'get_all_managers'
);

\echo ''
\echo '=========================================='
\echo '测试完成！'
\echo '=========================================='
