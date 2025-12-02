/*
# 权限策略全面测试脚本

## 测试目标
1. 测试所有角色的权限策略
2. 验证RLS策略是否正确执行
3. 检查权限检查函数是否正常工作
4. 验证策略模板系统是否正常

## 测试角色
- BOSS（老板）
- PEER_ADMIN（平级管理 - full_control）
- PEER_ADMIN（平级管理 - view_only）
- MANAGER（车队长）
- DRIVER（司机）

## 执行时间
2025-12-01
*/

-- ============================================
-- 第一部分：查看系统中的所有用户和角色
-- ============================================

\echo '=========================================='
\echo '第一部分：系统用户和角色概览'
\echo '=========================================='

-- 1.1 查看所有用户及其角色
\echo ''
\echo '1.1 所有用户及其角色：'
SELECT 
  u.id,
  u.name,
  u.phone,
  STRING_AGG(ur.role::text, ', ' ORDER BY ur.role) AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.name, u.phone
ORDER BY u.name;

-- 1.2 角色统计
\echo ''
\echo '1.2 角色统计：'
SELECT 
  ur.role,
  COUNT(*) AS user_count
FROM user_roles ur
GROUP BY ur.role
ORDER BY ur.role;

-- ============================================
-- 第二部分：权限检查函数测试
-- ============================================

\echo ''
\echo '=========================================='
\echo '第二部分：权限检查函数测试'
\echo '=========================================='

-- 2.1 测试is_admin()函数
\echo ''
\echo '2.1 is_admin()函数测试：'
SELECT 
  u.name,
  ur.role,
  is_admin(u.id) AS is_admin_result
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
ORDER BY ur.role, u.name;

-- 2.2 测试is_manager()函数
\echo ''
\echo '2.2 is_manager()函数测试：'
SELECT 
  u.name,
  ur.role,
  is_manager(u.id) AS is_manager_result
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
ORDER BY ur.role, u.name;

-- 2.3 测试peer_admin_has_full_control()函数
\echo ''
\echo '2.3 peer_admin_has_full_control()函数测试：'
SELECT 
  u.name,
  ur.role,
  peer_admin_has_full_control(u.id) AS has_full_control
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'PEER_ADMIN'
ORDER BY u.name;

-- 2.4 测试peer_admin_is_view_only()函数
\echo ''
\echo '2.4 peer_admin_is_view_only()函数测试：'
SELECT 
  u.name,
  ur.role,
  peer_admin_is_view_only(u.id) AS is_view_only
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'PEER_ADMIN'
ORDER BY u.name;

-- ============================================
-- 第三部分：users表RLS策略测试
-- ============================================

\echo ''
\echo '=========================================='
\echo '第三部分：users表RLS策略'
\echo '=========================================='

-- 3.1 查看users表的所有RLS策略
\echo ''
\echo '3.1 users表的所有RLS策略：'
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
ORDER BY 
  CASE 
    WHEN policyname LIKE 'BOSS%' THEN 1
    WHEN policyname LIKE 'MANAGER%' THEN 2
    WHEN policyname LIKE '管理员%' THEN 3
    WHEN policyname LIKE 'PEER_ADMIN%' THEN 4
    ELSE 5
  END,
  cmd,
  policyname;

-- 3.2 按操作类型分组统计
\echo ''
\echo '3.2 users表RLS策略统计（按操作类型）：'
SELECT 
  cmd AS 操作类型,
  COUNT(*) AS 策略数量,
  STRING_AGG(policyname, ', ' ORDER BY policyname) AS 策略列表
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
GROUP BY cmd
ORDER BY cmd;

-- ============================================
-- 第四部分：策略模板系统测试
-- ============================================

\echo ''
\echo '=========================================='
\echo '第四部分：策略模板系统'
\echo '=========================================='

-- 4.1 查看所有策略模板
\echo ''
\echo '4.1 所有策略模板：'
SELECT 
  id,
  strategy_name AS 策略名称,
  strategy_type AS 策略类型,
  description AS 描述,
  select_rule AS 查询权限,
  insert_rule AS 插入权限,
  update_rule AS 更新权限,
  delete_rule AS 删除权限,
  is_active AS 是否激活
FROM permission_strategies
ORDER BY strategy_name;

-- 4.2 查看PEER_ADMIN的权限分配
\echo ''
\echo '4.2 PEER_ADMIN的权限分配：'
SELECT 
  u.name AS 用户名,
  ps.strategy_name AS 策略名称,
  upa.permission_level AS 权限级别,
  ps.strategy_type AS 策略类型,
  upa.granted_at AS 授权时间,
  granter.name AS 授权人
FROM user_permission_assignments upa
JOIN users u ON u.id = upa.user_id
JOIN permission_strategies ps ON ps.id = upa.strategy_id
JOIN users granter ON granter.id = upa.granted_by
WHERE ps.strategy_name LIKE 'peer_admin%'
ORDER BY u.name;

-- ============================================
-- 第五部分：其他重要表的RLS策略
-- ============================================

\echo ''
\echo '=========================================='
\echo '第五部分：其他重要表的RLS策略'
\echo '=========================================='

-- 5.1 user_roles表的RLS策略
\echo ''
\echo '5.1 user_roles表的RLS策略：'
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  qual AS 使用条件
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_roles'
ORDER BY cmd, policyname;

-- 5.2 user_permission_assignments表的RLS策略
\echo ''
\echo '5.2 user_permission_assignments表的RLS策略：'
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  qual AS 使用条件
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_permission_assignments'
ORDER BY cmd, policyname;

-- 5.3 permission_strategies表的RLS策略
\echo ''
\echo '5.3 permission_strategies表的RLS策略：'
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  qual AS 使用条件
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'permission_strategies'
ORDER BY cmd, policyname;

-- ============================================
-- 第六部分：权限管理函数测试
-- ============================================

\echo ''
\echo '=========================================='
\echo '第六部分：权限管理函数'
\echo '=========================================='

-- 6.1 查看所有权限相关的函数
\echo ''
\echo '6.1 所有权限相关的函数：'
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
  'is_admin',
  'is_manager',
  'peer_admin_has_full_control',
  'peer_admin_is_view_only',
  'create_peer_admin',
  'update_peer_admin_permission',
  'remove_peer_admin',
  'get_all_peer_admins',
  'get_peer_admin_permission'
)
ORDER BY proname;

-- ============================================
-- 第七部分：权限矩阵总结
-- ============================================

\echo ''
\echo '=========================================='
\echo '第七部分：权限矩阵总结'
\echo '=========================================='

-- 7.1 各角色对users表的权限
\echo ''
\echo '7.1 各角色对users表的权限矩阵：'
\echo '角色 | 查看自己 | 查看所有 | 更新自己 | 更新所有 | 插入 | 删除'
\echo '------|---------|---------|---------|---------|------|------'

-- BOSS
SELECT 
  'BOSS' AS 角色,
  '✅' AS 查看自己,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE '%管理员%' AND cmd = 'SELECT') > 0 THEN '✅' ELSE '❌' END AS 查看所有,
  '✅' AS 更新自己,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE '%管理员%' AND cmd = 'UPDATE') > 0 THEN '✅' ELSE '❌' END AS 更新所有,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE '%管理员%' AND cmd = 'INSERT') > 0 THEN '✅' ELSE '❌' END AS 插入,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE '%管理员%' AND cmd = 'DELETE') > 0 THEN '✅' ELSE '❌' END AS 删除
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'

UNION ALL

-- MANAGER
SELECT 
  'MANAGER' AS 角色,
  '✅' AS 查看自己,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE 'MANAGER%' AND cmd = 'SELECT') > 0 THEN '✅' ELSE '❌' END AS 查看所有,
  '✅' AS 更新自己,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE 'MANAGER%' AND cmd = 'UPDATE') > 0 THEN '✅' ELSE '❌' END AS 更新所有,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE 'MANAGER%' AND cmd = 'INSERT') > 0 THEN '✅' ELSE '❌' END AS 插入,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE 'MANAGER%' AND cmd = 'DELETE') > 0 THEN '✅' ELSE '❌' END AS 删除
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'

UNION ALL

-- PEER_ADMIN
SELECT 
  'PEER_ADMIN' AS 角色,
  '✅' AS 查看自己,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE '%管理员%' AND cmd = 'SELECT') > 0 THEN '✅' ELSE '❌' END AS 查看所有,
  '✅' AS 更新自己,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE '%管理员%' AND cmd = 'UPDATE') > 0 THEN '✅' ELSE '❌' END AS 更新所有,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE '%管理员%' AND cmd = 'INSERT') > 0 THEN '✅' ELSE '❌' END AS 插入,
  CASE WHEN COUNT(*) FILTER (WHERE policyname LIKE '%管理员%' AND cmd = 'DELETE') > 0 THEN '✅' ELSE '❌' END AS 删除
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'

UNION ALL

-- DRIVER
SELECT 
  'DRIVER' AS 角色,
  '✅' AS 查看自己,
  '❌' AS 查看所有,
  '✅' AS 更新自己,
  '❌' AS 更新所有,
  '❌' AS 插入,
  '❌' AS 删除;

-- ============================================
-- 第八部分：测试总结
-- ============================================

\echo ''
\echo '=========================================='
\echo '第八部分：测试总结'
\echo '=========================================='

-- 8.1 统计信息
\echo ''
\echo '8.1 系统统计信息：'
SELECT 
  '用户总数' AS 项目,
  COUNT(DISTINCT u.id)::text AS 数量
FROM users u

UNION ALL

SELECT 
  '角色总数' AS 项目,
  COUNT(DISTINCT ur.role)::text AS 数量
FROM user_roles ur

UNION ALL

SELECT 
  'users表RLS策略数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'

UNION ALL

SELECT 
  '策略模板数' AS 项目,
  COUNT(*)::text AS 数量
FROM permission_strategies

UNION ALL

SELECT 
  'PEER_ADMIN权限分配数' AS 项目,
  COUNT(*)::text AS 数量
FROM user_permission_assignments upa
JOIN permission_strategies ps ON ps.id = upa.strategy_id
WHERE ps.strategy_name LIKE 'peer_admin%'

UNION ALL

SELECT 
  '权限检查函数数' AS 项目,
  COUNT(*)::text AS 数量
FROM pg_proc
WHERE proname IN (
  'is_admin',
  'is_manager',
  'peer_admin_has_full_control',
  'peer_admin_is_view_only'
);

\echo ''
\echo '=========================================='
\echo '测试完成！'
\echo '=========================================='
