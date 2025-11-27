-- ============================================================================
-- RLS 策略修复验证脚本
-- ============================================================================
-- 用途：验证 RLS 策略修复是否正确，检查潜在的问题和漏洞
-- 使用方法：在 Supabase SQL Editor 中运行此脚本
-- ============================================================================

-- ============================================================================
-- 1. 验证安全代理函数
-- ============================================================================
\echo '========================================';
\echo '1. 验证安全代理函数';
\echo '========================================';

-- 1.1 检查函数是否存在
\echo '1.1 检查 current_user_id() 函数是否存在';
SELECT 
  proname AS function_name,
  proowner::regrole AS owner,
  prosecdef AS security_definer,
  provolatile AS volatility,
  proacl AS access_privileges
FROM pg_proc
WHERE proname = 'current_user_id';

-- 期望结果：
-- function_name: current_user_id
-- security_definer: t (true)
-- volatility: s (stable)
-- access_privileges: 只有 authenticated 角色有 EXECUTE 权限

-- 1.2 测试函数是否正常工作
\echo '1.2 测试 current_user_id() 函数是否正常工作';
SELECT public.current_user_id() AS current_user_id;

-- 期望结果：
-- 认证用户：返回有效的 UUID
-- 未认证用户：返回 NULL

-- ============================================================================
-- 2. 验证角色检查函数
-- ============================================================================
\echo '========================================';
\echo '2. 验证角色检查函数';
\echo '========================================';

-- 2.1 检查 is_admin() 函数
\echo '2.1 检查 is_admin() 函数';
SELECT 
  proname AS function_name,
  prosecdef AS security_definer,
  provolatile AS volatility
FROM pg_proc
WHERE proname = 'is_admin';

-- 2.2 检查 is_manager() 函数
\echo '2.2 检查 is_manager() 函数';
SELECT 
  proname AS function_name,
  prosecdef AS security_definer,
  provolatile AS volatility
FROM pg_proc
WHERE proname = 'is_manager';

-- 2.3 检查 is_driver() 函数
\echo '2.3 检查 is_driver() 函数';
SELECT 
  proname AS function_name,
  prosecdef AS security_definer,
  provolatile AS volatility
FROM pg_proc
WHERE proname = 'is_driver';

-- 期望结果：所有函数都应该：
-- security_definer: t (true)
-- volatility: s (stable)

-- 2.4 测试角色检查函数
\echo '2.4 测试角色检查函数';
SELECT 
  is_admin(public.current_user_id()) AS is_admin,
  is_manager(public.current_user_id()) AS is_manager,
  is_driver(public.current_user_id()) AS is_driver;

-- 期望结果：根据当前用户的角色返回 true 或 false

-- ============================================================================
-- 3. 验证 RLS 启用状态
-- ============================================================================
\echo '========================================';
\echo '3. 验证 RLS 启用状态';
\echo '========================================';

-- 3.1 检查所有表的 RLS 状态
\echo '3.1 检查所有表的 RLS 状态';
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'warehouses',
    'driver_warehouses',
    'manager_warehouses',
    'driver_applications',
    'notifications',
    'attendance',
    'attendance_rules',
    'driver_licenses',
    'feedback',
    'leave_applications',
    'resignation_applications',
    'piece_work_records',
    'vehicle_records',
    'vehicles',
    'category_prices'
  )
ORDER BY tablename;

-- 期望结果：所有表的 rls_enabled 都应该是 true

-- ============================================================================
-- 4. 验证 RLS 策略
-- ============================================================================
\echo '========================================';
\echo '4. 验证 RLS 策略';
\echo '========================================';

-- 4.1 检查使用 current_user_id() 的策略
\echo '4.1 检查使用 current_user_id() 的策略';
SELECT 
  tablename,
  policyname,
  cmd,
  SUBSTRING(qual::text, 1, 100) AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND qual::text LIKE '%current_user_id%'
ORDER BY tablename, policyname;

-- 期望结果：所有策略都应该使用 current_user_id() 而不是 auth.uid()

-- 4.2 检查仍在使用 auth.uid() 的策略（应该为空）
\echo '4.2 检查仍在使用 auth.uid() 的策略（应该为空）';
SELECT 
  tablename,
  policyname,
  cmd,
  SUBSTRING(qual::text, 1, 100) AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND qual::text LIKE '%auth.uid()%'
  AND qual::text NOT LIKE '%current_user_id%'
ORDER BY tablename, policyname;

-- 期望结果：应该返回空结果集（没有策略仍在使用 auth.uid()）

-- 4.3 检查 profiles 表的策略
\echo '4.3 检查 profiles 表的策略';
SELECT 
  policyname,
  cmd,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- 期望结果：
-- "Users can view own profile": USING (public.current_user_id() = id)
-- "Users can update own profile": USING (public.current_user_id() = id)
-- "Admins have full access": USING (is_admin(public.current_user_id()))

-- 4.4 检查 driver_warehouses 表的策略
\echo '4.4 检查 driver_warehouses 表的策略';
SELECT 
  policyname,
  cmd,
  SUBSTRING(qual::text, 1, 100) AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'driver_warehouses'
ORDER BY policyname;

-- 期望结果：策略应该使用 current_user_id()

-- 4.5 检查 manager_warehouses 表的策略
\echo '4.5 检查 manager_warehouses 表的策略';
SELECT 
  policyname,
  cmd,
  SUBSTRING(qual::text, 1, 100) AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'manager_warehouses'
ORDER BY policyname;

-- 期望结果：策略应该使用 current_user_id()

-- ============================================================================
-- 5. 安全性检查
-- ============================================================================
\echo '========================================';
\echo '5. 安全性检查';
\echo '========================================';

-- 5.1 检查 current_user_id() 函数的权限
\echo '5.1 检查 current_user_id() 函数的权限';
SELECT 
  proname AS function_name,
  proacl AS access_privileges,
  CASE 
    WHEN proacl::text LIKE '%authenticated%' THEN '✅ 已授予 authenticated 角色'
    ELSE '❌ 未授予 authenticated 角色'
  END AS authenticated_access,
  CASE 
    WHEN proacl::text LIKE '%PUBLIC%' OR proacl IS NULL THEN '❌ 授予了 PUBLIC 权限（不安全）'
    ELSE '✅ 未授予 PUBLIC 权限'
  END AS public_access
FROM pg_proc
WHERE proname = 'current_user_id';

-- 期望结果：
-- authenticated_access: ✅ 已授予 authenticated 角色
-- public_access: ✅ 未授予 PUBLIC 权限

-- 5.2 检查是否存在没有 RLS 的表
\echo '5.2 检查是否存在没有 RLS 的表';
SELECT 
  schemaname,
  tablename,
  '❌ RLS 未启用' AS warning
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN (
    'schema_migrations',
    'spatial_ref_sys'
  )
ORDER BY tablename;

-- 期望结果：应该返回空结果集（所有表都已启用 RLS）

-- 5.3 检查是否存在允许所有操作的策略
\echo '5.3 检查是否存在允许所有操作的策略';
SELECT 
  tablename,
  policyname,
  cmd,
  qual AS using_clause,
  CASE 
    WHEN qual::text = 'true' THEN '⚠️ 警告：允许所有用户访问'
    ELSE '✅ 正常'
  END AS security_check
FROM pg_policies
WHERE schemaname = 'public'
  AND qual::text = 'true'
ORDER BY tablename, policyname;

-- 期望结果：
-- 如果有结果，需要检查这些策略是否合理
-- 某些系统表可能需要允许所有操作

-- ============================================================================
-- 6. 功能测试
-- ============================================================================
\echo '========================================';
\echo '6. 功能测试';
\echo '========================================';

-- 6.1 测试查询 profiles 表
\echo '6.1 测试查询 profiles 表';
SELECT 
  id,
  name,
  role,
  CASE 
    WHEN id = public.current_user_id() THEN '✅ 当前用户'
    ELSE '其他用户'
  END AS user_type
FROM profiles
LIMIT 5;

-- 期望结果：
-- 普通用户：只能看到自己的资料
-- 管理员：可以看到所有资料

-- 6.2 测试查询 driver_warehouses 表
\echo '6.2 测试查询 driver_warehouses 表';
SELECT 
  driver_id,
  warehouse_id,
  created_at
FROM driver_warehouses
LIMIT 5;

-- 期望结果：
-- 认证用户：可以看到相关的司机仓库关联
-- 未认证用户：无法访问

-- 6.3 测试查询 manager_warehouses 表
\echo '6.3 测试查询 manager_warehouses 表';
SELECT 
  manager_id,
  warehouse_id,
  created_at
FROM manager_warehouses
LIMIT 5;

-- 期望结果：
-- 认证用户：可以看到相关的车队长仓库关联
-- 未认证用户：无法访问

-- 6.4 测试查询 warehouses 表
\echo '6.4 测试查询 warehouses 表';
SELECT 
  id,
  name,
  address
FROM warehouses
LIMIT 5;

-- 期望结果：
-- 认证用户：可以看到所有仓库
-- 未认证用户：无法访问

-- ============================================================================
-- 7. 性能测试
-- ============================================================================
\echo '========================================';
\echo '7. 性能测试';
\echo '========================================';

-- 7.1 测试 current_user_id() 函数的性能
\echo '7.1 测试 current_user_id() 函数的性能';
EXPLAIN ANALYZE
SELECT public.current_user_id();

-- 期望结果：执行时间应该很短（< 1ms）

-- 7.2 测试带 RLS 策略的查询性能
\echo '7.2 测试带 RLS 策略的查询性能';
EXPLAIN ANALYZE
SELECT * FROM profiles
WHERE id = public.current_user_id();

-- 期望结果：
-- 应该使用索引查询
-- 执行时间应该很短

-- ============================================================================
-- 8. 总结
-- ============================================================================
\echo '========================================';
\echo '8. 验证总结';
\echo '========================================';

-- 8.1 统计使用 current_user_id() 的策略数量
\echo '8.1 统计使用 current_user_id() 的策略数量';
SELECT 
  COUNT(*) AS total_policies_using_current_user_id
FROM pg_policies
WHERE schemaname = 'public'
  AND qual::text LIKE '%current_user_id%';

-- 8.2 统计仍在使用 auth.uid() 的策略数量（应该为 0）
\echo '8.2 统计仍在使用 auth.uid() 的策略数量（应该为 0）';
SELECT 
  COUNT(*) AS total_policies_using_auth_uid
FROM pg_policies
WHERE schemaname = 'public'
  AND qual::text LIKE '%auth.uid()%'
  AND qual::text NOT LIKE '%current_user_id%';

-- 8.3 统计启用 RLS 的表数量
\echo '8.3 统计启用 RLS 的表数量';
SELECT 
  COUNT(*) AS total_tables_with_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- 8.4 最终验证结果
\echo '8.4 最终验证结果';
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'current_user_id' 
      AND prosecdef = true
    ) THEN '✅ current_user_id() 函数已正确创建'
    ELSE '❌ current_user_id() 函数不存在或配置错误'
  END AS function_check,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND qual::text LIKE '%auth.uid()%'
      AND qual::text NOT LIKE '%current_user_id%'
    ) = 0 THEN '✅ 所有策略都已更新为使用 current_user_id()'
    ELSE '❌ 仍有策略在使用 auth.uid()'
  END AS policy_check,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = false
      AND tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
    ) = 0 THEN '✅ 所有表都已启用 RLS'
    ELSE '❌ 有表未启用 RLS'
  END AS rls_check;

-- ============================================================================
-- 验证完成
-- ============================================================================
\echo '========================================';
\echo '验证完成！';
\echo '请检查上述结果，确保所有检查都通过。';
\echo '========================================';
