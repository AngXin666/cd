-- ============================================================
-- 权限矩阵测试 - 详细测试每个角色对每个表的权限
-- ============================================================

SET client_encoding = 'UTF8';

\echo '╔═══════════════════════════════════════════════════════════════╗'
\echo '║                      权限矩阵测试                              ║'
\echo '╚═══════════════════════════════════════════════════════════════╝'
\echo ''

-- ============================================================
-- 权限矩阵说明
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📋 权限矩阵说明'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '角色说明:'
\echo '  - BOSS: 老板，拥有最高权限'
\echo '  - PEER_ADMIN: 平级管理员，与老板同级'
\echo '  - MANAGER: 车队长，管理司机和车辆'
\echo '  - DRIVER: 司机，基础用户'
\echo ''
\echo '权限说明:'
\echo '  - ✓ = 有权限'
\echo '  - ✗ = 无权限'
\echo '  - ⊙ = 部分权限（只能访问自己的数据）'
\echo ''

-- ============================================================
-- 第一部分：users 表权限矩阵
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 users 表权限矩阵'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '预期权限:'
\echo '  角色        | SELECT | INSERT | UPDATE | DELETE'
\echo '  ------------|--------|--------|--------|--------'
\echo '  BOSS        |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  PEER_ADMIN  |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  MANAGER     |   ✓    |   ✗    |   ⊙    |   ✗'
\echo '  DRIVER      |   ⊙    |   ✗    |   ⊙    |   ✗'
\echo ''

SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    roles AS "角色"
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

\echo ''

-- ============================================================
-- 第二部分：user_roles 表权限矩阵
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 user_roles 表权限矩阵'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '预期权限:'
\echo '  角色        | SELECT | INSERT | UPDATE | DELETE'
\echo '  ------------|--------|--------|--------|--------'
\echo '  BOSS        |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  PEER_ADMIN  |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  MANAGER     |   ✓    |   ✗    |   ✗    |   ✗'
\echo '  DRIVER      |   ⊙    |   ✗    |   ✗    |   ✗'
\echo ''

SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    roles AS "角色"
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY cmd, policyname;

\echo ''

-- ============================================================
-- 第三部分：warehouses 表权限矩阵
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 warehouses 表权限矩阵'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '预期权限:'
\echo '  角色        | SELECT | INSERT | UPDATE | DELETE'
\echo '  ------------|--------|--------|--------|--------'
\echo '  BOSS        |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  PEER_ADMIN  |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  MANAGER     |   ⊙    |   ✗    |   ⊙    |   ✗'
\echo '  DRIVER      |   ⊙    |   ✗    |   ✗    |   ✗'
\echo ''

SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    roles AS "角色"
FROM pg_policies
WHERE tablename = 'warehouses'
ORDER BY cmd, policyname;

\echo ''

-- ============================================================
-- 第四部分：warehouse_assignments 表权限矩阵
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 warehouse_assignments 表权限矩阵'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '预期权限:'
\echo '  角色        | SELECT | INSERT | UPDATE | DELETE'
\echo '  ------------|--------|--------|--------|--------'
\echo '  BOSS        |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  PEER_ADMIN  |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  MANAGER     |   ⊙    |   ✗    |   ✗    |   ✗'
\echo '  DRIVER      |   ⊙    |   ✗    |   ✗    |   ✗'
\echo ''

SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    roles AS "角色"
FROM pg_policies
WHERE tablename = 'warehouse_assignments'
ORDER BY cmd, policyname;

\echo ''

-- ============================================================
-- 第五部分：vehicles 表权限矩阵
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 vehicles 表权限矩阵'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '预期权限:'
\echo '  角色        | SELECT | INSERT | UPDATE | DELETE'
\echo '  ------------|--------|--------|--------|--------'
\echo '  BOSS        |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  PEER_ADMIN  |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  MANAGER     |   ✓    |   ✗    |   ⊙    |   ✗'
\echo '  DRIVER      |   ⊙    |   ✗    |   ⊙    |   ✗'
\echo ''

SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    roles AS "角色"
FROM pg_policies
WHERE tablename = 'vehicles'
ORDER BY cmd, policyname;

\echo ''

-- ============================================================
-- 第六部分：attendance 表权限矩阵
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 attendance 表权限矩阵'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '预期权限:'
\echo '  角色        | SELECT | INSERT | UPDATE | DELETE'
\echo '  ------------|--------|--------|--------|--------'
\echo '  BOSS        |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  PEER_ADMIN  |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  MANAGER     |   ⊙    |   ⊙    |   ⊙    |   ⊙'
\echo '  DRIVER      |   ⊙    |   ⊙    |   ⊙    |   ⊙'
\echo ''

SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    roles AS "角色"
FROM pg_policies
WHERE tablename = 'attendance'
ORDER BY cmd, policyname;

\echo ''

-- ============================================================
-- 第七部分：leave_requests 表权限矩阵
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 leave_requests 表权限矩阵'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '预期权限:'
\echo '  角色        | SELECT | INSERT | UPDATE | DELETE'
\echo '  ------------|--------|--------|--------|--------'
\echo '  BOSS        |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  PEER_ADMIN  |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  MANAGER     |   ⊙    |   ✗    |   ⊙    |   ✗'
\echo '  DRIVER      |   ⊙    |   ⊙    |   ⊙    |   ⊙'
\echo ''

SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    roles AS "角色"
FROM pg_policies
WHERE tablename = 'leave_requests'
ORDER BY cmd, policyname;

\echo ''

-- ============================================================
-- 第八部分：piecework_records 表权限矩阵
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 piecework_records 表权限矩阵'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '预期权限:'
\echo '  角色        | SELECT | INSERT | UPDATE | DELETE'
\echo '  ------------|--------|--------|--------|--------'
\echo '  BOSS        |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  PEER_ADMIN  |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  MANAGER     |   ⊙    |   ⊙    |   ⊙    |   ⊙'
\echo '  DRIVER      |   ⊙    |   ⊙    |   ⊙    |   ⊙'
\echo ''

SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    roles AS "角色"
FROM pg_policies
WHERE tablename = 'piecework_records'
ORDER BY cmd, policyname;

\echo ''

-- ============================================================
-- 第九部分：notifications 表权限矩阵
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 notifications 表权限矩阵'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '预期权限:'
\echo '  角色        | SELECT | INSERT | UPDATE | DELETE'
\echo '  ------------|--------|--------|--------|--------'
\echo '  BOSS        |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  PEER_ADMIN  |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  MANAGER     |   ✓    |   ✓    |   ✓    |   ✓'
\echo '  DRIVER      |   ⊙    |   ✗    |   ⊙    |   ⊙'
\echo ''

SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    roles AS "角色"
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

\echo ''

-- ============================================================
-- 第十部分：权限问题检测
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 权限问题检测'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

DO $$
DECLARE
    v_table_name text;
    v_policy_count integer;
    v_missing_tables text[] := ARRAY[]::text[];
    v_tables_without_rls text[] := ARRAY[]::text[];
    v_update_without_check text[] := ARRAY[]::text[];
BEGIN
    RAISE NOTICE '检查 1: 核心表是否都有 RLS 策略';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    FOR v_table_name IN 
        SELECT unnest(ARRAY[
            'users', 'user_roles', 'warehouses', 'warehouse_assignments',
            'vehicles', 'attendance', 'leave_requests', 'piecework_records', 'notifications'
        ])
    LOOP
        SELECT COUNT(*) INTO v_policy_count
        FROM pg_policies
        WHERE tablename = v_table_name;
        
        IF v_policy_count = 0 THEN
            v_missing_tables := array_append(v_missing_tables, v_table_name);
        END IF;
    END LOOP;
    
    IF array_length(v_missing_tables, 1) > 0 THEN
        RAISE NOTICE '  ❌ 以下表缺少 RLS 策略:';
        FOR i IN 1..array_length(v_missing_tables, 1) LOOP
            RAISE NOTICE '    - %', v_missing_tables[i];
        END LOOP;
    ELSE
        RAISE NOTICE '  ✅ 所有核心表都有 RLS 策略';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '检查 2: 表是否启用了 RLS';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    FOR v_table_name IN 
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'users', 'user_roles', 'warehouses', 'warehouse_assignments',
            'vehicles', 'attendance', 'leave_requests', 'piecework_records', 'notifications'
        )
        AND rowsecurity = false
    LOOP
        v_tables_without_rls := array_append(v_tables_without_rls, v_table_name);
    END LOOP;
    
    IF array_length(v_tables_without_rls, 1) > 0 THEN
        RAISE NOTICE '  ❌ 以下表未启用 RLS:';
        FOR i IN 1..array_length(v_tables_without_rls, 1) LOOP
            RAISE NOTICE '    - %', v_tables_without_rls[i];
        END LOOP;
    ELSE
        RAISE NOTICE '  ✅ 所有核心表都启用了 RLS';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '检查 3: UPDATE 策略是否有 WITH CHECK 子句';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    FOR v_table_name IN 
        SELECT DISTINCT tablename
        FROM pg_policies
        WHERE tablename IN (
            'users', 'user_roles', 'warehouses', 'warehouse_assignments',
            'vehicles', 'attendance', 'leave_requests', 'piecework_records', 'notifications'
        )
        AND cmd = 'UPDATE'
        AND with_check IS NULL
    LOOP
        v_update_without_check := array_append(v_update_without_check, v_table_name);
    END LOOP;
    
    IF array_length(v_update_without_check, 1) > 0 THEN
        RAISE NOTICE '  ⚠️ 以下表的 UPDATE 策略缺少 WITH CHECK 子句:';
        FOR i IN 1..array_length(v_update_without_check, 1) LOOP
            RAISE NOTICE '    - %', v_update_without_check[i];
        END LOOP;
    ELSE
        RAISE NOTICE '  ✅ 所有 UPDATE 策略都有 WITH CHECK 子句';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================
-- 第十一部分：总结
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 权限矩阵测试总结'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

DO $$
DECLARE
    v_total_policies integer;
    v_total_tables integer;
BEGIN
    SELECT COUNT(*) INTO v_total_policies
    FROM pg_policies
    WHERE tablename IN (
        'users', 'user_roles', 'warehouses', 'warehouse_assignments',
        'vehicles', 'attendance', 'leave_requests', 'piecework_records', 'notifications'
    );
    
    SELECT COUNT(*) INTO v_total_tables
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
        'users', 'user_roles', 'warehouses', 'warehouse_assignments',
        'vehicles', 'attendance', 'leave_requests', 'piecework_records', 'notifications'
    )
    AND rowsecurity = true;
    
    RAISE NOTICE '统计信息:';
    RAISE NOTICE '  - 核心表数量: 9';
    RAISE NOTICE '  - 启用 RLS 的表: %', v_total_tables;
    RAISE NOTICE '  - RLS 策略总数: %', v_total_policies;
    RAISE NOTICE '';
    RAISE NOTICE '建议:';
    RAISE NOTICE '  1. 确保所有核心表都启用了 RLS';
    RAISE NOTICE '  2. 确保所有 UPDATE 策略都有 WITH CHECK 子句';
    RAISE NOTICE '  3. 定期审查权限策略，确保符合业务需求';
    RAISE NOTICE '  4. 测试不同角色的实际访问权限';
    RAISE NOTICE '';
END $$;

\echo '╔═══════════════════════════════════════════════════════════════╗'
\echo '║                  权限矩阵测试完成                              ║'
\echo '╚═══════════════════════════════════════════════════════════════╝'
